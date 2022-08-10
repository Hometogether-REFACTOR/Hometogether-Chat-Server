const SocketIO = require('socket.io');

const {
	createChatRoom,
	deleteBychatId,
	getAllChatRooms,
	getChatRoomByUserId,
	updateBychatId,
	updateLastAccess
} = require('./controllers/chatRooms');
const {
	createChat,
	deleteChat,
	getAllChats,
	getChat,
	getChatsByChatRoomId,
	getYetReadChats,
	updateUserReeadsToRead
} = require('./controllers/chats');
const {
  createUser, deleteUserBychatId, getAllUsers,getUser,updateUserBychatId, getUserByNickname, getBelognedRoomFromUser
} =require('./controllers/users');
const Chat = require('./models/Chat');

module.exports = (server) => {
	const io = SocketIO(server, { path: '/socket.io' }); // path는 client와 연결하는 경로	
	let USERS = []; // socket에 연결된 유저 정보

	// 소켓 연결 시
	io.on('connection', async (socket) => {

		socket.userId = Number(socket.handshake.query.userId);
		socket.nickname = socket.handshake.query.nickname;

		// USERS에서 넘겨받은 socket userId와 중복되는 값이 있으면 즉시 클라이언트 소켓 연결 해제
		if (USERS.find(user => user.userId == socket.userId)) {
			return socket.disconnect(0);
		}else{
			console.log('New client connected!', socket.id);
		}

		// 새 소켓 추가
		USERS.push({
			socketId: socket.id,
			userId: socket.userId,
			nickname: socket.nickname
		})
		
		// 새로운 유저라면 User document 생성, 그렇지 않으면 가져오기만함
		const user = await getUserByNickname(nickname)
			.then(async (user) => {
				if (!user) { // 같은 닉네임을 가진 유저가 없을 때 신규 생성
					user = await createUser({
						nickname
					})
					console.log(`New user ${user.nickname} is created.`);
				}
				return user;
			})
			.catch(err=>console.log(err))
		
		
		let chatRoomIdList = []
		// 유저가 소속된 모든 chatRoom을 population하여 가져오기
		const chatRoomList=await getBelognedRoomFromUser(user._id)
		chatRoomList.forEach(chatRoom => {
			chatRoomIdList.push(chatRoom._id)
			socket.join(`${chatRoom.name}`);
			// const chat = await Chat.getAllChats(value.chatRoomId);
			// chatList.push({
			// 	chatRoomId: value.chatRoomId,
			// 	chats: chat
			// });
		});
		// 해당 유저가 소속된 모든 채팅방의 챗로그 가져오기
		let chatList = await Chat.find({chatRoomId:{$in:chatRoomIdList}})
			.populate("sender.sender_id")
			.populate("chatRoomId")

		socket.emit("sendInitChatLog", chatList);

		///////////////////////////////////////////////////////////

		//* 소켓 연결 해제*//
		socket.on('disconnect', () => {
			console.log(`A client has disconnected.`, socket.id);
			USERS = USERS.filter(USER => USER.sockId != socket.id);
		});

		// room id가 담긴 message를 보내면 소속된 방에 emit, mongoDB에 chat기록 저장
		socket.on('sendMessageToRoom', async (data) => {
			data = JSON.parse(JSON.stringify(data));

			participants = await ChatRoom.find({ chatRoomId: parseInt(data.receiver_room_id) })
				.select('participants');

			let userIds = []
			participants[0].participants.forEach((result) => {
				if (result.participant_id == socket.userId) {
					userIds.push({ userId: result.participant_id, isRead: true });
				} else {
					userIds.push({ userId: result.participant_id });
				}
			})

			Chat.create({
				chatRoomId: data.receiver_room_id,
				sender: {
					sender_id: data.sender_id,
					sender_nickName: data.sender_nickName,
				},
				userReads: userIds,
				msg: data.msg
			}).then((chat) => {
				socket.to(`Room${data.receiver_room_id}`)
					.emit('receiveMessage', chat);
				socket.emit('serverResponse', {
					sender: 'SERVER',
					type: 'success',
					msg: 'Successfully send message to chatRoomId =' + data.receiver_room_id
				});
			})
		});

		// 메세지 확인 시 클라이언트 측에서 방번호(data.room_id)와 같이 전달
		socket.on('checkMessage', async (data) => {
			// console.log(`Check Message ${data.chatRoomId}`);
			await ChatRoom.updateLastAccess(data.chatRoomId, socket.userId)
				.catch(err => {
					console.log(err);
				})

			await Chat.updateMany({
				chatRoomId: data.chatRoomId,
				userReads: { $elemMatch: { "userId": socket.userId, "isRead": false } }
			},
				{ '$set': { 'userReads.$.isRead': true } })
		}
		)

		socket.on('newRoomRequest', async (data) => {
			let { userIdToJoin } = data;
			if (!userIdToJoin) {
				return socket.emit('serverResponse', {
					sender: 'SERVER',
					type: 'error',
					msg: 'User Id to join room is required.'
				});
			}

			let participants = [{ participant_id: socket.userId }]

			userIdToJoin.trim().split(/,| /).forEach(userId => {
				if (parseInt(userId) != socket.userId) {
					participants.push({
						participant_id: parseInt(userId)
					})
				}
			})

			await ChatRoom.create({
				participants: participants
			})
				.then(result => {
					socket.emit('serverResponse', {
						sender: 'SERVER',
						type: 'success',
						msg: 'Successfully create new Room with ' + userIdToJoin,
						then: {
							name: 'joinRoom',
							roomId: result.chatRoomId
						}
					});
				});
		})

		socket.on('joinRoomRequest', data => {
			socket.join(`Room${data.roomId}`);
		})

		socket.on('error', (error) => {
			console.log(error);
		});

		socket.on('checkMyRoom', () => {
			//소켓이 소속된 모든 방 정보 가져오기
			let socketRoomName = [...socket.rooms].slice(1,);
			let socketRoomList = [];
			for (room of socketRoomName) {
				socketRoomList.push(parseInt(room.substring(4)));
			}
			Chat.findYetReadChats(socket.userId, socketRoomList)
				.then(count => {
					socket.emit('serverResponse', {
						sender: 'SERVER',
						type: 'notice',
						msg: `New ${count} message yet read!!`
					});
				})

		})
	})

}