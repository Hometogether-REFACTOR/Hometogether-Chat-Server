const User = require('../models/User')

const createUser = async (payload) => {
  const user = await User.create(payload);
  return user;
};

const getAllUsers = async (options) => {
  const { nickname } = options;

  const queryObject={}

  if(nickname){
    queryObject.nickname=nickname
  }

  const users = await User.find(queryObject);
  return users;
};

const getUser = async (userId) => {
  const users = await User.findOne({
    _id:userId
  }) 
  return users
};

const getBelognedRoomFromUser=async(userId)=>{
  const user=await User.findOne({_id:userId})
  .populate("chatRoomBelogned")
  .select("chatRoomBelogned")
  return user.chatRoomBelogned;
}

const getUserByNickname = async (nickname) => {
  const users = await User.findOne({
    nickname:nickname
  }) 
  return users
};

const updateUserBychatId = async (UserId, payload) => {
  const user = await user.findOneAndUpdate({ chatId }, payload, { new: true })
  return user;
}


const deleteUserBychatId = async (chatId) =>{
  await User.remove({ chatId });
  return true;
}

module.exports = {
  getAllUsers, getUser, createUser, updateUserBychatId, deleteUserBychatId , getUserByNickname, getBelognedRoomFromUser
}