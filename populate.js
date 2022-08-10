require('dotenv').config()

const connectDB=require('./db/connect')
const User=require('./models/User')

const jsonUsers=require('./data/users.json')

const start=async()=>{
  try {
    await connectDB(process.env.MONGO_URI_TEST)
    await User.deleteMany();
    await User.create(jsonUsers);

    console.log('Success!!!!');

    process.exit(0)
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

start()