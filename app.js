require('dotenv').config();

const connectDB = require('./db/connect')
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http');
const server = http.createServer(app);
require('express-async-errors');

const socket_options = {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
  },
  path: '/socket.io'
};

const io = require('./socket')(server, socket_options);

// socket nickname register middleware
io.use((socket, next)=>{
  socket.nickname = socket.handshake.query.nickname

  let myString='weafwealfjkddawehfawe'

  if(socket.handshake.query.token && socket.handshake.query.token == myString){
    next()
  }
  else {
    console.log('일치하지 않음')
    next(new Error('연결 실패'))
  }
    
  // 이곳에서 nickname(또는 id값)과 일치하는 redis 문자열을 socket.handshake.query.token 값과 비교
  // 일치하지 않는다면 바로 disconnect
})

const PORT = process.env.PORT || 4500;

app.set('views', __dirname + '/public');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use('/socket', require('./routes/main'))


const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI_TEST)
      .then(() => console.log('Successfully connected to mongodb'))
      .catch(e => console.error(e));

    server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (error) {
    console.log(error);
  }
}

start()

module.exports = server;