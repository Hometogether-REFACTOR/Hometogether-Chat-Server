const SocketIO = require('socket.io');

const {
	createChatRoom,
	addUserToChatRoom, // 나중에쓸거
	deleteUserFromChatRoom,
	updateLastAccess
} = require('./controllers/chatRooms');
const {
	createChat,
	getAllChats,
	getYetReadChats,
} = require('./controllers/chats');
const {
	getUser
} = require('./controllers/users');

const Chat = require('./models/Chat');
const ChatRoom = require('./models/ChatRoom');
const User = require('./models/User');

module.exports = (server, options) => {
	const io = SocketIO(server, options); // path는 client와 연결하는 경로	
	let USERS = []; // socket에 연결된 유저 정보

	/* 소켓 연결 시 최초 이벤트 */
	io.on('connection', async (socket) => {

		const getInitChatLog = async (next) => { // 유저의 chatList, user 객체를 갱신시킬 때 사용하는 함수
			const user = await getUser(socket.userId, { populate: true })
			const chatList = await getAllChats({ chatRoomIdList: user.chatRoomBelonged, populate: true })
			next({ chatList, user })
		}

		// socket nickname이 없다면 바로 disconnect
		if (!socket.nickname) {
			const message = 'socket.nickname이 존재하지 않습니다.'
			console.trace(message)
			socket.emit('error', message)
			return socket.disconnect(0);
		}

		// 새로운 유저라면 User 생성, 그렇지 않으면 가져오기만함
		const userCheck = await User.findOne({ nickname: socket.nickname })
			.catch(err => {
				console.log(err.stack)
				socket.emit('error', '서버 내부 오류 발생 : ' + err.message)
				return socket.disconnect(0);
			})

		// 같은 닉네임을 가진 유저가 없을 때 차단
		if (!userCheck) {
			const message = '닉네임이 일치하는 유저를 찾을 수 없습니다.'
			console.trace(message)
			socket.emit('error', '서버 내부 오류 발생 : ' + message)
			return socket.disconnect(0)
		}

		socket.userId = userCheck._id //소켓 객체에 userId 등록

		// USERS에서 넘겨받은 socket userId와 중복되는 값이 있으면 즉시 클라이언트 소켓 연결 해제
		// 추후 동시 접속도 가능하게 할 예정
		if (USERS.find(USER => USER.userId.toString() == socket.userId.toString())) {
			let disconnectMsg = `동일한 사용자가 이미 접속 중입니다.`
			console.trace(disconnectMsg)
			socket.emit('error', disconnectMsg)
			return socket.disconnect(0);
		} else {
			console.log(`${socket.nickname} 님이 연결되었습니다!`);
		}

		// USERS에 새 소켓 정보 추가
		USERS.push({
			socketId: socket.id,
			userId: socket.userId,
			nickname: socket.nickname
		})

		// 유저에게 최초 정보 조회 후 보내기
		getInitChatLog(result => {
			result.user.chatRoomBelonged.forEach(chatRoom => {
				socket.join(chatRoom.name)
			})
			socket.emit('sendInitChatLog', result)
		})

		/* 소켓 연결 시 최초 이벤트 끝 */

		// 소켓 연결 해제 
		socket.on('disconnect', () => {
			console.log(`${socket.nickname || '알 수 없는 유저'}의 연결이 종료되었습니다.`,);
			USERS = USERS.filter(USER => USER.socketId != socket.id);
		});

		// chatRoomId가 담긴 message를 보내면 소속된 방에 emit, mongoDB에 chat기록 저장
		socket.on('sendMessage', async (data) => {
			const chatRoom = await ChatRoom.findById(data.chatRoom_id)

			if (!chatRoom) {
				let message=`채팅방 ID가 ${chatRoom_id}인 채팅방이 존재하지 않습니다.`
				console.trace(message)
				return socket.emit('error', message)
			}

			const newChat = await createChat({
				chatRoom_id: data.chatRoom_id,
				msg: data.msg,
				sender: socket.userId
			})
				.catch(err => {
					console.log(err.stack)
					return socket.emit('error', '서버 내부 오류 발생 : ' + err.message)
				})

			await newChat.populate([
				{path:"userReads.user_id",select:'_id nickname'},
				{path:'chatRoom_id',select:'_id name'},
				{path:"sender", select:"_id nickname"}
			])
			
			io.to(chatRoom.name).emit('newChat', newChat)
		});

		// 메세지 확인 시 클라이언트 측에서 방번호(data.room_id)와 같이 전달
		socket.on('checkMessage', async (data) => {

			let { chatRoom_name } = data;

			// 유저가 채팅방에 접속한 마지막 시간을 업데이트
			const resultChatRoomId = await updateLastAccess(chatRoom_name, socket.userId)
				.catch(err => {
					console.log(err.stack)
					return socket.emit('error', '서버 내부 오류 발생:\n' + err.message)
				})

			await Chat.updateMany({
				chatRoom_id: resultChatRoomId,
				userReads: { $elemMatch: { "user_id": socket.userId, "isRead": false } }
			},
				{ '$set': { 'userReads.$.isRead': true } })
				.catch(err => {
					console.log(err.stack)
					return socket.emit('error', '서버 내부 오류 발생:\n' + err.message)
				})
		})

		// 새 방 만들기, 참여자 정보를 받아서 chatRoom을 생성 후 각 유저에게 sendInitChatLog를 보냄
		socket.on('newRoomRequest', async (data) => {
			let { userIdToJoin, chatRoomName } = data

			if (!userIdToJoin || !chatRoomName) {
				return socket.emit('error', '채팅에 참여할 유저 아이디와 채팅방 이름을 바르게 입력하세요.');
			}

			let participants = [{ participant_id: socket.userId }]

			userIdToJoin.trim().split(/,| /).forEach(userId => {
				if ((userId) != socket.userId.toString()) {
					participants.push({
						participant_id: userId
					})
				}
			})

			await createChatRoom({
				name: chatRoomName, participants
			})
				.then(async (result) => {
					getInitChatLog((result) => {
						socket.join(chatRoomName)
						socket.emit('sendInitChatLog', result)
					}).catch(err => {
						return socket.emit('error', '서버 내부 오류 발생:\n' + err.message)
					})

					result.participants.forEach((user) => {
						const targetSocket = USERS.find(USER => USER.userId.toString() == user.participant_id.toString())
						if (targetSocket && targetSocket.userId.toString() != socket.userId.toString()) {
							io.to(targetSocket.socketId).emit('joinRoomRequest', result._id)
						}
						else {
							socket.emit('serverResponse', {
								sender: 'SERVER',
								type: 'success',
								msg: '채팅방을 성공적으로 생성했습니다!'
							});
						}
					})
				})
				.catch(err => {
					console.log(err)
					return socket.emit('error', '서버 내부 오류 발생:\n' + err.message)
				})
		})

		socket.on('joinRoomResponse', async (chatRoomId) => {
			const chatRoom = await ChatRoom.findById(chatRoomId)
			if (!chatRoom) {
				return socket.emit('error', '채팅방 정보가 없습니다.')
			}
			socket.join(chatRoom.name);

			console.log(`User with id:${socket.userId} has joined the ${chatRoom.name}`)
			socket.emit('serverResponse', {
				sender: 'SERVER',
				type: 'successJoinRoom',
				msg: `새 채팅방 ${chatRoom.name}에 초대되었습니다.`,
				data: { _id: chatRoom._id, name: chatRoom.name }
			})
		})

		socket.on('inviteRoomRequest', async (data) => {
			let { userIdToInvite, chatRoomName } = data

			if (!userIdToInvite || !chatRoomName) {
				return socket.emit('error', '채팅에 참여할 유저 아이디와 채팅방 이름을 바르게 입력하세요.');
			}

			let participants = []
			// let participants = [{ participant_id: socket.userId }]

			userIdToInvite.trim().split(/,| /).forEach(userId => {
				if ((userId) != socket.userId.toString()) {
					participants.push({
						participant_id: userId
					})
				}
			})

			await addUserToChatRoom(chatRoomName, participants)
				.then(result => {
					console.log('addUserToChatRoom success')
					result.user_id_list.forEach((user) => {
						const targetSocket = USERS.find(USER => USER.userId.toString() == user)
						if (targetSocket && targetSocket.userId.toString() != socket.userId.toString()) {
							io.to(targetSocket.socketId).emit('joinRoomRequest', result.chatRoom_id)
						}
						else {
							socket.emit('serverResponse', {
								sender: 'SERVER',
								type: 'success',
								msg: '유저를 성공적으로 초대했습니다.'
							});
						}
					})
				})
				.catch(err => {
					console.log(err)
					return socket.emit('error', '서버 내부 오류 발생:\n' + err.message)
				})


		})

		// 유저가 읽지 않은 모든 채팅 수 방별로 가져오기
		socket.on('checkMyRoom', async (data) => {
			let { chatRooms } = data
			let yetReads = await getYetReadChats(socket.userId, chatRooms)

			socket.emit('serverResponse', {
				sender: 'SERVER',
				type: 'yetReadChatCheck',
				msg: '나의 읽지 않은 채팅:',
				data: yetReads
			})
		})

		socket.on('exitChatRoomRequest', async (chatRoom) => {
			let chatRoom_id = chatRoom._id
			await deleteUserFromChatRoom(chatRoom_id, socket.userId)

			getInitChatLog((result) => {
				socket.emit('sendInitChatLog', result)
			})
				.catch(err => {
					console.log(err)
					return socket.emit('error', '서버 내부 오류 발생:\n' + err.message)
				})
		})

	})

	return io;
}