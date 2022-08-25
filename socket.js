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
	getChat,
	getYetReadChats,
} = require('./controllers/chats');
const {
  getAllUsers
} =require('./controllers/users');

const Chat = require('./models/Chat');
const ChatRoom = require('./models/ChatRoom');
const User = require('./models/User');

module.exports = (server, options) => {
	const io = SocketIO(server, options); // path는 client와 연결하는 경로	
	let USERS = []; // socket에 연결된 유저 정보

	/* 소켓 연결 시 최초 이벤트 */
	io.on('connection', async (socket) => {

		const getInitChatLog= async(next)=>{
			const user = await getAllUsers(socket.userId,{populate:true})
			const chatList = await getAllChats({chatRoomIdList:user.chatRoomBelonged, populate:true})
			next({chatList, user})
		}
		
		//socket nickname이 없다면 바로 disconnect
		if(!socket.nickname){
			return socket.disconnect(0);
		}

		// 새로운 유저라면 User 생성, 그렇지 않으면 가져오기만함
		const userCheck = await User.findOne({nickname:socket.nickname})
			.catch(err=>{
				console.log(err)
				return socket.disconnect(0)
			})

		// 같은 닉네임을 가진 유저가 없을 때 신규 생성
		if (!userCheck) { 
			userCheck = await User.create({
				nickname:socket.nickname
			})
			.catch(err=>{
				console.log(err)
				return socket.disconnect(0)
			})
			console.log(`새로운 사용자 ${userCheck.nickname}가 생성되었습니다.`);
		}

		socket.userId=userCheck._id //소켓 객체에 userId 등록

		// USERS에서 넘겨받은 socket userId와 중복되는 값이 있으면 즉시 클라이언트 소켓 연결 해제
		// 추후 동시 접속도 가능하게 할 예정
		
		if (USERS.find(USER => USER.userId.toString() == socket.userId.toString())) {
			let disconnectMsg	= `동일한 사용자가 이미 접속 중입니다.`
			console.log(disconnectMsg)
			socket.emit('custom_disconnect',disconnectMsg)
			return socket.disconnect();
		}else{
			socket.userId=userCheck._id
			console.log(`${socket.nickname} 님이 연결되었습니다!`);
		}

		// USERS에 새 소켓 정보 추가
		USERS.push({
			socketId: socket.id,
			userId: socket.userId,
			nickname: socket.nickname
		})

		const user = await getAllUsers(socket.userId,{populate:true})
		const chatList = await getAllChats({chatRoomIdList:user.chatRoomBelonged, populate:true})

		user.chatRoomBelonged.forEach(chatRoom=>{
			socket.join(chatRoom.name)
		})

		socket.emit('sendInitChatLog', {user,chatList} )
		
		/* 소켓 연결 시 최초 이벤트 끝 */

		// 소켓 연결 해제 
		socket.on('disconnect', () => {
			console.log(`${socket.nickname || '알 수 없는 유저'}의 연결이 종료되었습니다.`, );
			USERS = USERS.filter(USER => USER.socketId != socket.id);
		});

		// chatRoomId가 담긴 message를 보내면 소속된 방에 emit, mongoDB에 chat기록 저장
		socket.on('sendMessage', async (data) => {
			const chatRoom=await ChatRoom.findById(data.chatRoom_id)

			if(!chatRoom){
				socket.emit('error', `채팅방 ID가 ${chatRoom_id}인 채팅방이 존재하지 않습니다.`)
			}

			const newChat=await createChat({
				chatRoom_id:data.chatRoom_id,
				msg:data.msg,
				sender:socket.userId
			})
			.catch(err => {
				console.log(err)
				return socket.emit('error','서버 내부 오류 발생:\n'+err.message)
			})

			const targetChat=await getChat(newChat._id, {populate:true})
			.catch(err => {
				console.log(err)
				return socket.emit('error','서버 내부 오류 발생:\n'+err.message)
			})
			
			io.to(chatRoom.name).emit('newChat',targetChat)
		});

		// 메세지 확인 시 클라이언트 측에서 방번호(data.room_id)와 같이 전달
		socket.on('checkMessage', async (data) => {
			
			let {name}=data;

			const resultChatRoomId=await updateLastAccess(name, socket.userId)
			.catch(err => {
				console.log(err)
				return socket.emit('error','서버 내부 오류 발생:\n'+err.message)
			})
			
			await Chat.updateMany({
				chatRoom_id: resultChatRoomId,
				userReads: { $elemMatch: { "user_id": socket.userId, "isRead": false } }
			},
				{ '$set': { 'userReads.$.isRead': true } })
				.catch(err => {
					console.log(err)
					return socket.emit('error','서버 내부 오류 발생:\n'+err.message)
				})
		})

		socket.on('newRoomRequest', async (data) => {
			let { userIdToJoin, chatRoomName } = data
			
			console.log(data)
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
				.then(async(result) => {

					getInitChatLog((result)=>{
						socket.join(chatRoomName)
						socket.emit('sendInitChatLog', result )
					})

					result.participants.forEach((user)=>{
						const targetSocket=USERS.find(USER=>USER.userId.toString()==user.participant_id.toString())
						if(targetSocket && targetSocket.userId.toString() !=socket.userId.toString()){
							io.to(targetSocket.socketId).emit('joinRoomRequest',result._id)
						}
						else{
							return socket.emit('serverResponse', {
								sender: 'SERVER',
								type: 'success',
								msg: '채팅방을 성공적으로 생성했습니다!'
							});
						}
					})	
				})
				.catch(err => {
					console.log(err)
					return socket.emit('error','서버 내부 오류 발생:\n'+err.message)
				})
		})

		socket.on('joinRoomResponse', async(chatRoomId) => {
			const chatRoom=await ChatRoom.findById(chatRoomId)
			if(!chatRoom){
				return socket.emit('error','채팅방 정보가 없습니다.')
			}
			socket.join(chatRoom.name);

			console.log(`User with id:${socket.userId} has joined the ${chatRoom.name}`)
			socket.emit('serverResponse',{
				sender:'SERVER',
				type:'success',
				msg:`새 채팅방 ${chatRoom.name}에 초대되었습니다.`
			})
		})

		
		// 유저가 읽지 않은 모든 채팅 수 방별로 가져오기
		socket.on('checkMyRoom', async(data) => {
			let {chatRooms}=data
			let yetReads=await getYetReadChats(socket.userId, chatRooms)

			socket.emit('serverResponse',{
				sender:'SERVER',
				type:'success',
				msg:'Your notRead chatList by chatRoom.',
				data:yetReads
			})
		})
		
		socket.on('exitChatRoomRequest',async(chatRoom)=>{
			let chatRoom_id=chatRoom._id
			await deleteUserFromChatRoom(chatRoom_id, socket.userId)
				
			getInitChatLog((result)=>{
				socket.emit('sendInitChatLog', result )
			})
				.catch(err => {
					console.log(err)
					return socket.emit('error','서버 내부 오류 발생:\n'+err.message)
				})
		})

	})

	return io;
}