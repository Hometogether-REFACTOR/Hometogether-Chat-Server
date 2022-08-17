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
  createUser,getUser, getUserByNickname
} =require('./controllers/users');

const Chat = require('./models/Chat');
const ChatRoom = require('./models/ChatRoom');
const User = require('./models/User');

module.exports = (server, options) => {
	const io = SocketIO(server, options); // path는 client와 연결하는 경로	
	let USERS = []; // socket에 연결된 유저 정보

	// 소켓 연결 시
	io.on('connection', async (socket) => {

		socket.nickname = socket.handshake.query.nickname;
		
		if(!socket.nickname){
			return socket.disconnect(0);
		}
		// 새로운 유저라면 User document 생성, 그렇지 않으면 가져오기만함
		const user = await getUserByNickname(socket.nickname,{populate:true})
			.then(async (user) => {
				if (!user) { // 같은 닉네임을 가진 유저가 없을 때 신규 생성
					user = await createUser({
						nickname:socket.nickname
					})
					console.log(`New user ${user.nickname} is created.`);
				}else{
					socket.nickname=user.nickname
				}
				return user;
			})
			.catch(err=>console.log(err))
		// USERS에서 넘겨받은 socket userId와 중복되는 값이 있으면 즉시 클라이언트 소켓 연결 해제
		
		if (USERS.find(USER => USER.nickname == user.nickname)) {
			console.log(`duplicated:true`)
			return socket.disconnect(0);
		}else{
			socket.userId=user._id
			console.log('New client connected!', socket.nickname);
		}

		// 새 소켓 추가
		USERS.push({
			socketId: socket.id,
			userId: socket.userId,
			nickname: user.nickname
		})

		// 유저가 소속된 모든 chatRoom을 population하여 가져오기
		user.chatRoomBelonged.forEach(chatRoom=>{
			socket.join(chatRoom.name)
		})
		// 해당 유저가 소속된 모든 채팅방의 챗로그 가져오기
		let chatList = await getAllChats({chatRoomIdList:user.chatRoomBelogned, populate:true})

		socket.emit('sendInitChatLog', {chatList, user} )
		///////////////////////////////////////////////////////////

		//* 소켓 연결 해제*//
		socket.on('disconnect', () => {
			console.log(`A client has disconnected.`, socket.id);
			USERS = USERS.filter(USER => USER.socketId != socket.id);
		});

		// room id가 담긴 message를 보내면 소속된 방에 emit, mongoDB에 chat기록 저장
		socket.on('sendMessage', async (data) => {
			const chatRoom=await ChatRoom.findById(data.chatRoom_id)
			console.log(data.msg)
			const newChat=await createChat({
				chatRoom_id:data.chatRoom_id,
				msg:data.msg,
				sender:socket.userId
			})

			socket.emit('serverResponse',{
				sender:'SERVER',
				type:'success',
				msg:'successfully send message!'
			})

			const targetChat=await getChat(newChat._id, {populate:true})
			
			console.log(targetChat)
			io.to(chatRoom.name).emit('newChat',targetChat)

			//Chat 새로 만들어준 후에 송신자의 isReads를 true로 업데이트(checkMessage)
		});

		// 메세지 확인 시 클라이언트 측에서 방번호(data.room_id)와 같이 전달
		socket.on('checkMessage', async (data) => {
			
			let {name}=data;

			const resultChatRoomId=await updateLastAccess(name, socket.userId)
				.catch(err => {
					console.log(err);
				})
			
			await Chat.updateMany({
				chatRoom_id: resultChatRoomId,
				userReads: { $elemMatch: { "user_id": socket.userId, "isRead": false } }
			},
				{ '$set': { 'userReads.$.isRead': true } })
		})

		socket.on('newRoomRequest', async (data) => {
			let { userIdToJoin, name } = data
			
			if (!userIdToJoin) {
				return socket.emit('serverResponse', {
					sender: 'SERVER',
					type: 'error',
					msg: 'User Id to join room is required.'
				});
			}

			let participants = [{ participant_id: socket.userId }]

			userIdToJoin.trim().split(/,| /).forEach(userId => {
				if ((userId) != socket.userId) {
					participants.push({
						participant_id: userId
					})
				}
			})

			await createChatRoom({
				name, participants
			})
				.then(result => {
					socket.emit('serverResponse', {
						sender: 'SERVER',
						type: 'success',
						msg: 'Successfully create new room.'
					})
					result.participants.forEach((user)=>{
						const targetSocket=USERS.find(USER=>USER.userId==user.participant_id)
						
						if(targetSocket){
							io.to(targetSocket.socketId).emit('joinRoomRequest',result._id)
						}
					})	
				})
		})

		socket.on('joinRoomResponse', async(chatRoomId) => {
			const chatRoom=await ChatRoom.findById(chatRoomId)
			socket.join(chatRoom.name);

			console.log(`User with id:${socket.userId} has joined the ${chatRoom.name}`)
			socket.emit('serverResponse',{
				sender:'SERVER',
				type:'success',
				msg:'Successfully join the room.'
			})
		})

		socket.on('error', (error) => {
			console.log(error);
		});

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
			
			let user = await getUser(socket.userId,{populate:true})
			
			console.log(user)
			// 해당 유저가 소속된 모든 채팅방의 챗로그 가져오기

			let chatList = await getAllChats({chatRoomIdList:user.chatRoomBelogned, populate:true})
	
			socket.emit('sendInitChatLog', {chatList, user} )
		})
	})
}