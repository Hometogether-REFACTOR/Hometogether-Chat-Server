const ChatRoom = require('../models/ChatRoom')

const createChatRoom = async (payload) => {
  const chatRoom = await ChatRoom.create(payload);
  return chatRoom;
};

const getAllChatRooms = async () => {
  const chatRooms = await ChatRoom.find({});
  return chatRooms;
};

const getChatRoomByUserId = async (userId) => {
  userId = Number(userId);
  const chatRooms = await ChatRoom.find({
    participants: {
      $elemMatch: { participant_id: userId }
    }
  }, { _id: 0, participants: 0, createdAt: 0, updatedAt: 0, __v: 0 })
  return chatRooms
};

const updateBychatId = async (chatRoomId, payload) => {
  const chatRoom = await ChatRoom.findOneAndUpdate({ chatId }, payload, { new: true })
  return chatRoom;
}

const updateLastAccess = async function (chatRoomId, userId) {
  chatRoomId = Number(chatRoomId);
  userId = Number(userId);
  const chatRoom = await ChatRoom.updateOne({ chatRoomId: chatRoomId, "participants.participant_id": userId },
    { '$set': { 'participants.$.last_access': new Date() } }
  )
  return chatRoom;
}

const deleteBychatId = async (chatId) => {
  await ChatRoom.remove({ chatId });
  return true;
}

module.exports = {
  getAllChatRooms, getChatRoomByUserId, createChatRoom, updateBychatId, updateLastAccess, deleteBychatId
}