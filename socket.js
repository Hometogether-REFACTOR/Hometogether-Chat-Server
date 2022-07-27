const SocketIO=require('socket.io');
const { models } = require('mongoose');
const ChatRooms=require('./models/chatRooms');
const Chats=require('./models/chats');

module.exports=(server)=>{

    const io=SocketIO(server, {path:'/socket.io'}); // path는 client와 연결하는 경로
    let USERS=[]; // socket에 연결된 유저 정보

    //* 소켓 연결 시 *//
    io.on('connection', async (socket)=>{
        // (추가해야함) USERS에서 넘겨받은 socket 데이터와 중복된 값 있는지 필터링

        /////////////////// connection 직후 최초로 이루어지는 부분/////////////////////
        
        USERS.find(USER=>USER.userId==socket.handshake.query.userId);

        console.log('New client connected!', socket.id);

        socket.userId=parseInt(socket.handshake.query.userId);

        USERS.push({
            sockId:socket.id,
            userId:parseInt(socket.handshake.query.userId),
            nickname:socket.handshake.query.nickname
        })
        
        let chatRoomList= await ChatRooms.findByUserId(socket.userId);
        
        let chatList=[]

        const promises=chatRoomList.map(async(value, index)=>{
            const chat= await Chats.findByChatRoomId(value.chatRoomId);
            chatList.push({
                chatRoomId:value.chatRoomId,
                chats:chat
            });
        }) 
        await Promise.all(promises);

        socket.emit("sendInitChatLog",chatList);

        ///////////////////////////////////////////////////////////

        //* 소켓 연결 해제*//
        socket.on('disconnect', ()=>{
            console.log(`A client has disconnected.`, socket.id);
            USERS = USERS.filter(USER => USER.sockId!=socket.id);
        });
        
        // room id가 담긴 message를 보내면 소속된 방에 emit, mongoDB에 chat기록 저장
        socket.on('sendMessage', (data)=>{ 
            data=JSON.parse(JSON.stringify(data));
            // A가 보낸 소켓 정보에서 data.receiver가 chatRoomParticipants 안에 있으면 해당 chatRoomId사용
            // 없으면 새로 생성해서 쓰고 mongo에 저장

            data.receiver.receiver_id=parseInt(data.receiver.receiver_id);
            sampleChat={
                sender:{
                    sender_id:data.sender,
                },
                msg:data.msg
            }

            console.log(data);

            if(data.receiver.receiver_type=='room'){
                sampleChat.chatRoomId=data.receiver.receiver_id;
                Chats.create(sampleChat);
                console.log(data.receiver.receiver_id);
                socket.to(`Room${data.receiver.receiver_id}`)
                    .emit('sendMessage',{
                        msg:'We are in same room!'
                });
            }else{
                console.log('방이 존재하지 않습니다.');
                // (추가해야함) 새로운 chatRoom 만드는 작업 모듈화할것
                ChatRooms.findAll()
                    .then(result=>{
                        console.log('수신자 id : ', data.receiver.receiver_id);
                        return result.length+1;
                    })
                    .then((room_id)=>{

                        ChatRooms.create({
                            chatRoomId:room_id,
                            participants:[data.sender, data.receiver.receiver_id]
                        })
                        sampleChat.chatRoomId=room_id;
                        socket.join(`Room${room_id}`);
                        socket.to(USERS.find((USER)=>{
                            return USER.userId==data.receiver.receiver_id
                        })).emit('joinRoomRequest',{
                            room_id:room_id
                        })
                        Chats.create(sampleChat);
                    })
                    .catch(err=>{console.log(err)});
            }
            // socket.to([room id]) : 해당 방에 자신을 제외한 소켓들에게 전송
            // socket.to(`Room${data.receiver.room_id}`).emit('receiveMessage', data.msg);
        });

        // 메세지 확인 시 클라이언트 측에서 방번호(data.room_id)와 같이 전달
        socket.on('checkMessage', (data)=>{
            console.log(`Check Message ${data.chatRoomId}`);
            console.log(Chats.updateBychatRoomId(data.chatRoomId, {
                status:{
                    isRead:"true"
                }
            }));
        })

        socket.on('error', (error)=>{
            console.log(error);
        });

        socket.on('acceptJoinRoom',(data)=>{
            socket.join(`Room${data.room_id}`);
            console.log(`${USERS.find(USER=>{return USER.sockId==socket.id}).userId} join the Room${data.room_id}!`);
        })

        socket.on('test', ()=>{
            var rooms = io.sockets.adapter.sids[socket.id]; 
            for(var room in rooms) { 
                console.log(room);      
                socket.leave(room);     
            }
        })
    })

}