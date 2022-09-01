const Chat = require('../models/Chat');
const ChatRoom = require('../models/ChatRoom');
const mongoose=require('mongoose')

const createChat = async (payload) => {
	const userReads=[]
	const chatRoom=await ChatRoom.findOne({_id:payload.chatRoom_id})

	chatRoom.participants.forEach(participant=>{
		let isRead=false
		if(participant.participant_id.toString()==payload.sender.toString()){
			isRead=true
		}
		userReads.push({
			user_id:participant.participant_id,
			isRead
		})
	})
	payload.userReads=userReads;

	const chat = await Chat.create(payload);
	return chat;
};

const getAllChats = async (options) => {
  const { chatRoomIdList, populate } = options;
	let chats;
  const queryObject={}

  if(chatRoomIdList){
    queryObject.chatRoom_id={$in:chatRoomIdList}
  }
	if(populate){
		chats= await Chat.find(queryObject)
		.populate({path:"userReads.user_id",select:'_id nickname'})
		.populate({path:'chatRoom_id',select:'_id name'})
		.populate({path:"sender", select:"_id nickname"})
	}else{
		chats = await Chat.find(queryObject);
	}

	return chats;
};

const getYetReadChats = async (user_id, chatRooms) => {
	
	let chatRoomIds=[]
	chatRooms.forEach(chatRoom=>{
		chatRoomIds.push(chatRoom._id)
	})
	
	const yetReadChats=await Chat.aggregate([
		{
			$match: {
				chatRoom_id:{$in:chatRoomIds.map(function(id){return new mongoose.Types.ObjectId(id);})},
				userReads: {
					$elemMatch: {
						user_id: new mongoose.Types.ObjectId(user_id), isRead: false
					}
				}
			}
		},
		{
			$group: {
					_id: '$chatRoom_id',
					yetReads: { $count: {} }
			}
		},
		{$lookup: {
			from: 'chatrooms',
			let:{
				chatRoomId:'$_id'
			},
			pipeline:[
				{
					$match:{
						$expr:{
							$eq:[
								"$_id",
								"$$chatRoomId"
							]
						}
					}
				},
				{
					$project:{
						_id:0,
						name:1
					}
				}
			],
			as:"chatRoom"
			// localField: '_id', foreignField:'_id', as: 'chatRoom'
		}},
	])
	.then((results)=>{
		results.map(function(result){
			result.name=result.chatRoom[0].name
			delete result.chatRoom;
		})
		return results;
	})
	return yetReadChats
}


module.exports = {
	createChat, 
	getAllChats, 
	getYetReadChats, 
}