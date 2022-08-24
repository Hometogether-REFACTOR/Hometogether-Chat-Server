const ChatRoom = require('../models/ChatRoom')
const Chat = require('../models/Chat')
const User = require('../models/User');

const createChatRoom = async (payload) => {
  const chatRoom = await ChatRoom.create(payload);

  const userIds=[]
  payload.participants.forEach(participant=>{
    userIds.push(participant.participant_id)
  })

  await User.updateMany({ _id: {$in:userIds} }, {
    $push: { chatRoomBelonged: chatRoom._id }
  })
  return chatRoom;
};



// 채팅방에 유저 추가
const addUserToChatRoom = async (chatRoom_id, user_id) => {

  // 연관된 ChatRoom update
  await ChatRoom.updateOne({ _id: chatRoom_id },
    { participants: { $push: { participant_id: user_id, last_access: new Date() } } }
  )
  // 유저 update
  await User.updateOne({ _id: user_id }, {
    $push: { chatRoomBelogned: chatRoom_id }
  })
}

// 채팅방에 유저 삭제
const deleteUserFromChatRoom = async (chatRoom_id, user_id) => {
  // 연관된 Chat 삭제 및 update
  await Chat.deleteMany({ chatRoom_id, sender: user_id })
  await Chat.updateMany({ chatRoom_id },
    { userReads: { $pull: { user_id } } }
  )
  //연관된 ChatRoom update
  const chatRoom = await ChatRoom.findOneAndUpdate({ _id: chatRoom_id },
    { $pull: { participants: { participant_id: user_id } } },
    { new: true }
  )
  
  if(chatRoom.participants.length==0){
    console.log('채팅방 유저가 존재하지 않으므로 채팅방을 삭제합니다.')
    await ChatRoom.deleteOne({ _id: chatRoom_id });
  }

  
  await User.findOneAndUpdate({ _id: user_id }, {
    $pull: { chatRoomBelonged:chatRoom_id }
  },{new:true})
  
}

const updateLastAccess = async function (name, userId) {
  
  const chatRoom = await ChatRoom.findOneAndUpdate({ name, participants:{$elemMatch:{"participant_id": userId }}},
    { '$set': { 'participants.$.last_access': new Date() } }
  )
  
  return chatRoom?._id
}

module.exports = {
  createChatRoom, updateLastAccess, deleteUserFromChatRoom, addUserToChatRoom
}