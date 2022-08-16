const ChatRoom = require('../models/ChatRoom')
const Chat = require('../models/Chat')
const User = require('../models/User')

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

const getAllChatRooms = async () => {
  const chatRooms = await ChatRoom.find({});
  return chatRooms;
};

const getChatRoomByUserId = async (user_id) => {
  user_id = Number(user_id);
  const chatRooms = await ChatRoom.find({
    participants: {
      $elemMatch: { participant_id: user_id }
    }
  }, { _id: 0, participants: 0, createdAt: 0, updatedAt: 0, __v: 0 })
  return chatRooms
};

const updateBychatId = async (chatRoom_id, payload) => {
  const chatRoom = await ChatRoom.findOneAndUpdate({ chatRoom_id }, payload, { new: true })
  return chatRoom;
}

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
const deleteUserToChatRoom = async (chatRoom_id, user_id) => {
  // 연관된 Chat 삭제 및 update
  await Chat.deleteMany({ chatRoom_id, sender: user_id })
  await Chat.updateMany({ chatRoom_id },
    { userReads: { $pull: { user_id } } }
  )
  //연관된 ChatRoom update
  await ChatRoom.updateOne({ _id: chatRoom_id },
    { participants: { $pull: { participant_id: user_id} } }
  )

  await User.updateOne({ _id: user_id }, {
    $pull: { chatRoomBelogned: chatRoom_id }
  })
}

const updateLastAccess = async function (name, userId) {
  
  const chatRoom = await ChatRoom.updateOne({ name, participants:{$elemMatch:{"participant_id": userId }}},
    { '$set': { 'participants.$.last_access': new Date() } }
  )
  return chatRoom._id
}

const deleteChatRoom = async (chatRoomId) => {
  await ChatRoom.deleteOne({ _id: chatRoomId });
  return true;
}

module.exports = {
  getAllChatRooms, getChatRoomByUserId, createChatRoom, updateBychatId, updateLastAccess, deleteChatRoom
}