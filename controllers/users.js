const User = require('../models/User')

const getAllUsers = async (userId, options) => {
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

module.exports = {
  getAllUsers
}