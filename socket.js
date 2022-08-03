const SocketIO = require('socket.io');
const { models } = require('mongoose');
const ChatRooms = require('./models/chatRooms');
const Chats = require('./models/chats');

module.exports = (server) => {

	const io = SocketIO(server, { path: '/socket.io' }); // path는 client와 연결하는 경로
	let USERS = []; // socket에 연결된 유저 정보

	//* 소켓 연결 시 *//
	io.on('connection', async (socket) => {
		// (추가해야함) USERS에서 넘겨받은 socket 데이터와 중복된 값 있는지 필터링

		/////////////////// connection 직후 최초로 이루어지는 부분/////////////////////

		USERS.find(USER => USER.userId == socket.handshake.query.userId);

		console.log('New client connected!', socket.id);

		socket.userId = parseInt(socket.handshake.query.userId);
		socket.nickname=socket.handshake.query.nickanme;
		USERS.push({
			sockId: socket.id,
			userId: socket.userId,
			nickname: socket.nickname
		})

		let chatRoomList = await ChatRooms.findByUserId(socket.userId);

		let chatList = []

		const promises = chatRoomList.map(async (value, index) => {
			socket.join(`Room${value.chatRoomId}`);
			const chat = await Chats.findByChatRoomId(value.chatRoomId);
			chatList.push({
				chatRoomId: value.chatRoomId,
				chats: chat
			});
		})
		await Promise.all(promises);

		socket.emit("sendInitChatLog", chatList);

		///////////////////////////////////////////////////////////

		//* 소켓 연결 해제*//
		socket.on('disconnect', () => {
			console.log(`A client has disconnected.`, socket.id);
			USERS = USERS.filter(USER => USER.sockId != socket.id);
		});

		// room id가 담긴 message를 보내면 소속된 방에 emit, mongoDB에 chat기록 저장
		socket.on('sendMessageToRoom', (data) => {
			data = JSON.parse(JSON.stringify(data));

			Chats.create({
				chatRoomId: data.receiver_room_id,
				sender: {
					sender_id: data.sender_id,
					sender_nickName:data.sender_nickName,
				},
				msg: data.msg
			}).then((chat) => {
				console.log(chat);
				socket.to(`Room${data.receiver_room_id}`)
					.emit('receiveMessage', chat);

				socket.emit('serverResponse', {
					sender:'SERVER',
					type:'success',
					msg:'Successfully send message to chatRoomId ='+data.receiver_room_id
				});
			})
		});

		// 메세지 확인 시 클라이언트 측에서 방번호(data.room_id)와 같이 전달
		socket.on('checkMessage', (data) => {
			console.log(`Check Message ${data.chatRoomId}`);
			
			//이 부분에서 해당 채팅방 document에 존재하는 모든 chat의 status를
			//isRead:"true"로 바꿔 줘야 함
			Chats.updateStatusToRead(socket.userId,data.chatRoomId, {
				$set:{"status.isRead":true}
			})
			.then((result)=>{
				console.log(result);
			});
		})

		socket.on('newRoomRequest', (data)=>{
			let {userIdToJoin}=data;
			userIdToJoin=parseInt(userIdToJoin);

			if(!userIdToJoin){
				socket.emit('serverResponse', {
					sender:'SERVER',
					type:'error',
					msg:'User Id to join room is required.'
				});
				return;
			}else if(userIdToJoin==socket.userId){
				socket.emit('serverResponse', {
					sender:'SERVER',
					type:'error',
					msg:'User Id to join room equals to your userId.'
				});
				return;
			}

			ChatRooms.create({
				participants:[socket.userId, userIdToJoin]
			})
			.then(result=>{
				console.log(result);
				socket.emit('serverResponse', {
					sender:'SERVER',
					type:'success',
					msg:'Successfully create new Room with '+userIdToJoin
				});
			});
		})

		socket.on('error', (error) => {
			console.log(error);
		});

		socket.on('checkMyRoom', () => {
			//소켓이 소속된 모든 방 정보 가져오기
			let socketRoomName=[...socket.rooms].slice(1,);
			let socketRoomList=[];
			for(room of socketRoomName){
				socketRoomList.push(parseInt(room.substring(4)));
			}
			Chats.findYetReadChats(socket.userId,socketRoomList)
			.then(count=>{
				socket.emit('serverResponse', {
					sender:'SERVER',
					type:'notice',
					msg:`New ${count} message yet read!!`
				});
			})
			
		})
	})

}