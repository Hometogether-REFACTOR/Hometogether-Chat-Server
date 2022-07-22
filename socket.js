const SocketIO=require('socket.io');
const { models } = require('mongoose');
const ChatRooms=require('./models/chatRooms');
const Chats=require('./models/chats');
module.exports=(server)=>{

    const io=SocketIO(server, {path:'/socket.io'}); // path는 client와 연결하는 경로
    let USERS=[];

    //* 소켓 연결 시
    io.on('connection', (socket)=>{
        // (추가해야함) USERS에서 넘겨받은 socket 데이터와 중복된 값 있는지 필터링

        console.log('New client connected!', socket.id);

        // mongodb에서 connect한 유저가 속한 chatRoomId, participants 가져오기
        // 모든 room에 할당
        
        socket.userId=parseInt(socket.handshake.query.userId);
        
        // user가 소속된 
        let chatRoomBelonged=[];
        ChatRooms.findByUserId(socket.userId)
            .then((chatRoomList)=>{
                if(!chatRoomList.length){
                    throw('No data founded.');
                }
                console.log('ChatRooms');
                console.log(`find successfully: ${chatRoomList}`);

                // 소켓이 소속된 chatRoom 모두 가져오기
                chatRoomList.forEach((chatRoom)=>{
                    socket.join(`Room${chatRoom.chatRoomId}`);
                    chatRoomBelonged.push(chatRoom.chatRoomId);
                })
                USERS.push({
                    sockId:socket.id,
                    userId:parseInt(socket.handshake.query.userId),
                    nickname:socket.handshake.query.nickname,
                    chatRooms:chatRoomBelonged,
                })
            })
            .catch(err=>console.log(err));

        // 테스트용
    
        //* 소켓 연결 해제
        socket.on('disconnect', ()=>{
            console.log(`A client is disconnected.`, socket.id);
            USERS = USERS.filter(USER => USER.sockId!=socket.id);
            
        });

        // room id가 담긴 message를 보내면 소속된 방에 emit, mongoDB에 chat기록 저장
        socket.on('sendMessage', async (data)=>{ 
            data=JSON.parse(JSON.stringify(data));
            // A의 소켓 정보에서 data.receiver가 chatRoomParticipants 안에 있으면 해당 chatRoomId사용
            // 없으면 새로 생성해서 쓰고 mongo에 저장
            sampleChat={
                sender:{
                    sender_id:data.sender,
                },
                msg:data.msg
            }

            if(data.receiver.hasOwnProperty("room_id")){
                console.log('방이 존재합니다.');
                sampleChat.chatRoomId=data.receiver.room_id;
                Chats.create(sampleChat);
            }else{
                console.log('방이 존재하지 않습니다.');
                // (추가해야함) 새로운 chatRoom 만드는 작업 모듈화할것
                ChatRooms.findAll()
                    .then(result=>{
                        console.log('수신자 id : ', data.receiver.receiver_id);
                        data.receiver.room_id=result.length+1;
                        console.log(data.receiver.room_id);
                        return data.receiver.room_id;
                    })
                    .then((room_id)=>{
                        console.log(`Room${room_id}`);
                        ChatRooms.create({
                            chatRoomId:room_id,
                            participants:[data.sender, data.receiver.receiver_id]
                        })
                        sampleChat.chatRoomId=room_id;
                        socket.join(`Room${room_id}`);
                        Chats.create(sampleChat);
                    })
                    .catch(err=>{console.log(err)});
            }
            // socket.to([room id]) : 해당 방에 자신을 제외한 소켓들에게 전송
            // socket.to(`Room${data.receiver.room_id}`).emit('receiveMessage', data.msg);
        }).then(()=>{

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

        socket.on('test', ()=>{
            var rooms = io.sockets.adapter.sids[socket.id]; 
            for(var room in rooms) { 
                console.log(room);      
                socket.leave(room);     
            }
        })
    })

}