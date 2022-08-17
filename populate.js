require('dotenv').config()

const connectDB = require('./db/connect')
const User = require('./models/User')
const ChatRoom = require('./models/ChatRoom')
const Chat = require('./models/Chat')

const {
	createChatRoom
} = require('./controllers/chatRooms');
const {
	createUser,  getUser, getUserByNickname
} = require('./controllers/users');

const {
  createChat
}=require('./controllers/chats')

const jsonUsers = require('./data/users.json')


const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI_TEST)
    await User.deleteMany();
    await ChatRoom.deleteMany();
    await Chat.deleteMany();

    await User.create(jsonUsers);

    const users = await User.find({});
    const userIds = []

    users.forEach(user => {
      userIds.push({
        participant_id: user._id
      })
    });

    const chatRoomIds=[]
    for(let i=1;i<4;i++){
      const chatRoom=await createChatRoom({
        name: `Room ${i}`,
        participants: userIds
      })
      .catch(err => console.log(err)) || {}

      chatRoomIds.push(chatRoom._id)
      await createChat({
        chatRoom_id:chatRoom._id,
        sender:userIds[0].participant_id,
        msg:'hello'
      })
    }

    process.exit(0)
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

start()