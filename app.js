// const WebSocket=require('ws');
// const ws = new WebSocket.Server({port:8008});

// ws.on("connection", function connect(websocket, req){
//     websocket.on("message", function incoming(message){
//         console.log(JSON.parse(message));
//         message=JSON.parse(message);

//         switch(message.code){
//             case "member_login":
//                 login(message.memberCode, message.memberAlias);
//             break;

//         }
//     })

//     function login(memberCode, memberAlias){
//         let member_data={"memberCode":memberCode, "memberAlias":memberAlias, "ws":websocket}
//         ALL_USER.push(member_data);
//         console.log("LOGIN OK");
//     }
// })

require('dotenv').config();

const express=require('express');
const mongoose=require('mongoose');
const bodyParser=require('body-parser');
const app=express();
const http=require('http');
const server=http.createServer(app);
const io=require('socket.io')(server);

const {PORT, MONGO_URI}=process.env;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
app.use('/todo', require('./routes/todo'))

// mongoose 5 이후로 deprecated
// mongoose.Promise = global.Promise;

app.set('io', io);

mongoose.connect(MONGO_URI, { }) //empty options
  .then(() => console.log('Successfully connected to mongodb'))
  .catch(e => console.error(e));

server.listen(PORT, ()=>console.log(`Server listening on port ${PORT}`));