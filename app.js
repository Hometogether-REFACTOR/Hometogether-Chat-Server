require('dotenv').config();

const express=require('express');
const mongoose=require('mongoose');
const bodyParser=require('body-parser');
const app=express();
const http=require('http');
const server=http.createServer(app);

const socket_options = {
  cors: {
  origin: ['http://localhost:4500'],
  methods: ['GET', 'POST'],
  },
};

const socketIO=require('./socket')(server, socket_options);

const {PORT, MONGO_URI}=process.env;

app.set('view engine', 'ejs');
app.set('views', __dirname+'/public');
app.use(express.static('/public'));
app.use(express.static('/modules'))
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());

app.use('/index', require('./routes')) // routing 설정

mongoose.connect(MONGO_URI, { }) //empty options
  .then(() => console.log('Successfully connected to mongodb'))
  .catch(e => console.error(e));

server.listen(PORT, ()=>console.log(`Server listening on port ${PORT}`));

module.exports=server;