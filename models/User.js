const mongoose = require('mongoose');
const Schema = mongoose.Schema
const ChatRoom=require('./ChatRoom')
const FKHelper=require('../modules/FKhelper')

const userSchema = new mongoose.Schema({
  nickname:{
    type:String,
    required:[true, 'must provide nickname'],
    unique:true
  },
  chatRoomBelonged: [{
    type: Schema.Types.ObjectId,
    ref: 'ChatRoom',
    validate: {
      isAsync: true,
      validator: function(v) {
          return FKHelper(mongoose.model("ChatRoom"), v)
      },
      message: `ChatRoom doesn't exist.`
    }
  }],
},
  {
    timestamps: true
  });



const preDelete=async function(next){
  console.log('user 삭제 직전');

	const doc = await this.model.findOne(this.getFilter())

	// User 삭제 시 user가 소속된 모든 ChatRoom의 participants에서 pull, 
	await ChatRoom.updateMany({ _id: { $in: doc.chatRoomBelogned } }, 
    { $pull: {participants:{$elemMatch:{participant_id:doc._id}}}})

	// 해당 ChatRoomId를 가진 Chat에서 sender가 userid와 일치하는 도큐먼트 제거
	await Chat.deleteMany({chatRoom_id:{$in:doc.chatRoomBelogned},sender:doc._id})

  // 해당 ChatRoomId를 가진 Chat에서 userReads에서 자신의 user_id와 일치하는 데이터 pull
  await Chat.updateMany({chatRoom_id:{$in:doc.chatRoomBelogned}},
    {$pull:{userReads:{$elemMatch:{user_id:doc._id}}}})
	next();
}


module.exports = mongoose.model('User', userSchema)