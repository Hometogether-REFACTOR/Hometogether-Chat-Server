const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User=require('./User');

const chatRoomSchema = new mongoose.Schema({
	name: { // 채팅방 이름
		type: String,
		required: [true, 'You must provide name.'],
		unique: true
	},
	participants: [new mongoose.Schema({
		participant_id: {
			type: Schema.Types.ObjectId,
			ref: 'Chat',
			required: true
		},
		last_access: {
			type: Date
		},
	}, { _id: false })],// 2명의 사용자 -> 여러 사용자로 확장
},
	{
		timestamps: true
	});

//chatRoom 생성 시 모든 참여자 객체에 할당된 방 push
chatRoomSchema.post('save', async (doc) => { 
	console.log('New chatRoom has created!')
	participantIds=[]

	doc.participants.forEach(participant=>{
		participantIds.push(participant.participant_id)
	})
	await User.updateMany({_id:{$in:participantIds}},{$push:{chatRoomBelogned:doc._id}})
	
})

module.exports = mongoose.model('ChatRoom', chatRoomSchema)