const Chat = require('../models/Chat');

const createChat = async (payload) => {
	const chat = await Chat.create(payload);
	return chat;
};

const getAllChats = async (options) => {
  const { chatRoomIdList } = options;

  const queryObject={}

  if(chatRoomIdList){
    queryObject.chatRoomId={$in:chatRoomIdList}
  }

  const chats = await Chat.find(queryObject);
  return chats;
};
const getChat = async (chatId) => {
	const chat = await Chat.findOne({ chatId })
	return chat;
}

const getChatsByChatRoomId = async (_chatRoomId) => {
	const chats = await Chat.find({ chatRoomId: _chatRoomId }, { _id: 0, __v: 0 })
	return chats;
}

const getYetReadChats = (senderId, chatRoomIds) => {
	const chats = Chat.find(
		// { chatRoomId: { $in: chatRoomIds } ,  "status.isRead": false ,
		//  "sender.sender_id":{$ne: senderId} }
		{
			chatRoomId: { $in: chatRoomIds }, userReads: {
				$elemMatch: { "userId": senderId, "isRead": false }
			}
		}
	)

	return chats.length;
}

const updateUserReeadsToRead = async (senderId, chatRoomId, payload) => {
	//upsert:값이 존재하지 않을 시 새로 추가
	//multi:여러 개의 찾은 도큐먼트를 업데이트
	senderId = Number(senderId);
	chatRoomId = Number(chatRoomId);

	const chats = await Chat.updateMany({
		$and: [
			{ chatRoomId: chatRoomId }, { "sender.sender_id": { $ne: senderId } }
		]
	}, payload, { upsert: false, multi: true })
	return chats;
}

const deleteChat = (chatId) => {
	return Chat.remove({ chatId });
}

module.exports = {
	createChat, getAllChats, getChat, getChatsByChatRoomId, getYetReadChats, updateUserReeadsToRead, deleteChat
}