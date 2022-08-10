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

const getUserByUserId = async (userId) => {
  userId = Number(userId);
  const users = await User.find({
    participants: {
      $elemMatch: { participant_id: userId }
    }
  }, { _id: 0, participants: 0, createdAt: 0, updatedAt: 0, __v: 0 })
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
  getAllUsers, getUserByUserId, createUser, updateUserBychatId, deleteUserBychatId
}