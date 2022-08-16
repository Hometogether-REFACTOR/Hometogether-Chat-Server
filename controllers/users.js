const User = require('../models/User')

const createUser = async (payload,options) => {
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

const getUser = async (userId, options) => {
  try {
    if(!options){
      const users = await User.findOne({_id:userId})
      return users
    }else if(options.populate){
      const users = await User.findOne({_id:userId})
        .populate({path:"chatRoomBelonged", select:"_id name"})
      return users
    }
  } catch (error) {
    console.log('userId is invalidate')
  }
  return false
}

const getBelognedChatRoomFromUser=async(userId)=>{
  const user=await User.findOne({_id:userId})
  .populate({path:"chatRoomBelonged", select:"_id, name"})
  .select("chatRoomBelonged")
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
  getAllUsers, getUser, createUser, updateUserBychatId, deleteUserBychatId , getUserByNickname, getBelognedChatRoomFromUser
}