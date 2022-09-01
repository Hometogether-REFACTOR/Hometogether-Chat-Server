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
  },
  {runValidators:true})
  return chatRoom;
};

// 채팅방에 유저 추가
const addUserToChatRoom = async (chatRoom_name, user_ids) => {
  
  let participant_list=[]

  let participants=await ChatRoom.findOne({ name:chatRoom_name }
	).select('participants.participant_id')

  participants.participants.forEach(user=>{
    participant_list.push(user.participant_id.toString())
  })

  let user_id_list=[]
  
  user_ids=user_ids.filter(user_id=>!(participant_list.includes(user_id.participant_id)))
  
  user_ids.forEach(user_id=>{
    user_id_list.push(user_id.participant_id)
  })

  console.log(user_id_list)
  if(user_id_list.length==0){
    throw new Error('초대할 유저가 없습니다.')
  }

  // 연관된 ChatRoom update
  const chatRoom=await ChatRoom.findOneAndUpdate({ name:chatRoom_name },
    { $push: { 'participants': {$each:user_ids } } },
    {new:true, runValidators:true}
  )
  
  // 유저 update
  await User.updateMany({ _id: {$in:user_id_list} }, {
    $push: { chatRoomBelogned: chatRoom._id }
  },
  {runValidators:true}
  )
  
  return {user_id_list,chatRoom_id:chatRoom._id}
}



// 채팅방에 유저 삭제
const deleteUserFromChatRoom = async (chatRoom_id, user_id) => {
  // 연관된 Chat 삭제 및 update
  await Chat.deleteMany({ chatRoom_id, sender: user_id })
  await Chat.updateMany({ chatRoom_id },
    { userReads: { $pull: { user_id } } },
    {runValidators:true}
  )
  //연관된 ChatRoom update
  const chatRoom = await ChatRoom.findOneAndUpdate({ _id: chatRoom_id },
    { $pull: { participants: { participant_id: user_id } } },
    { new: true ,runValidators:true}
  )
  
  if(chatRoom.participants.length==0){
    console.log('채팅방 유저가 존재하지 않으므로 채팅방을 삭제합니다.')
    await ChatRoom.deleteOne({ _id: chatRoom_id });
  }

  
  await User.findOneAndUpdate({ _id: user_id }, {
    $pull: { chatRoomBelonged:chatRoom_id }
  },{new:true,runValidators:true} )
  
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