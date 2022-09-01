const User = require('../models/User')

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
    throw new Error('유저 아이디가 올바르지 않습니다. 다시 시도해주세요.')
  }
  return false
}

module.exports = {
  getUser
}