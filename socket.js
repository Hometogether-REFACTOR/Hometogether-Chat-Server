const SocketIO = require('socket.io');
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
		socket.on('sendMessageToRoom', async (data) => {
			data = JSON.parse(JSON.stringify(data));
			
			participants = await ChatRooms.find({ chatRoomId: parseInt(data.receiver_room_id) })
			.select('participants');

			let userIds=[]
			participants[0].participants.forEach((result)=>{
				if (result.participant_id==socket.userId){
					userIds.push({userId:result.participant_id, isRead:true});
				}else{
					userIds.push({userId:result.participant_id});
				}
			})

			Chats.create({
				chatRoomId: data.receiver_room_id,
				sender: {
					sender_id: data.sender_id,
					sender_nickName:data.sender_nickName,
				},
				userReads:userIds,
				msg: data.msg
			}).then((chat) => {
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
		socket.on('checkMessage', async (data) => {
			// console.log(`Check Message ${data.chatRoomId}`);
			await ChatRooms.updateLastAccess(data.chatRoomId, socket.userId)
				.catch(err=>{
					console.log(err);
				})

			await Chats.updateMany({
        chatRoomId:data.chatRoomId,
        userReads:{$elemMatch:{"userId":socket.userId,"isRead":false}}
    		},
    		{'$set':{'userReads.$.isRead':true}})
			}
		)

		socket.on('newRoomRequest', async (data)=>{
			let {userIdToJoin}=data;
			if(!userIdToJoin){
				return socket.emit('serverResponse', {
					sender:'SERVER',
					type:'error',
					msg:'User Id to join room is required.'
				});
			}

			let participants=[{participant_id:socket.userId}]

			userIdToJoin.trim().split(/,| /).forEach(userId=>{
				if(parseInt(userId)!=socket.userId){
					participants.push({
						participant_id:parseInt(userId)
					})
				}
			})

			await ChatRooms.create({
				participants:participants
			})
			.then(result=>{
				socket.emit('serverResponse', {
					sender:'SERVER',
					type:'success',
					msg:'Successfully create new Room with '+userIdToJoin,
					then:{
						name:'joinRoom',
						roomId:result.chatRoomId
					}
				});
			});
		})

		socket.on('joinRoomRequest',data=>{
			socket.join(`Room${data.roomId}`);
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