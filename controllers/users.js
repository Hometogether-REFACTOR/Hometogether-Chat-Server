const User = require('../models/User')

const createUser = async (payload,options) => {
  const user = await User.create(payload);
  return user;
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

const getUserByNickname = async (nickname, options) => {
  try {
    if(!options){
      const users = await User.findOne({nickname})
      return users
    }else if(options.populate){
      const users = await User.findOne({nickname})
        .populate({path:"chatRoomBelonged", select:"_id name"})
      return users
    }
  } catch (error) {
    console.log('userId is invalidate')
  }
  return false
};


module.exports = {
  getUser, 
  createUser, 
  getUserByNickname
}