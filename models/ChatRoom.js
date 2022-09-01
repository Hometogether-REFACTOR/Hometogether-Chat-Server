const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./User');
const Chat = require('./Chat');
const FKHelper=require('../modules/FKhelper')

const chatRoomSchema = new mongoose.Schema({
	name: { // 채팅방 이름
		type: String,
		required: [true, 'You must provide name.'],
		unique: true
	},
	participants: [new mongoose.Schema({
		participant_id: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			validate: {
				isAsync: true,
				validator: function(v) {
						return FKHelper(mongoose.model("User"), v)
				},
				message: `User doesn't exist.`
			}
		},
		last_access: {
			type: Date,
			default: new Date()
		}
	}, { _id: false })],// 2명의 사용자 -> 여러 사용자로 확장
},
	{
		timestamps: true
	});

// chatRoomId onDelete cascade기능 구현
const preDelete = async function (next) {
	console.log('chatRoom 삭제 직전');

	const doc = await this.model.findOne(this.getFilter())
	participantIds = []

	doc.participants.forEach(participant => {
		participantIds.push(participant.participant_id)
	})
	// User.chatRoomBelonged 안에 chatRoom의 Id가 있다면 삭제
	await User.updateMany({ _id: { $in: participantIds } }, { $pull: { chatRoomBelogned: doc._id } })
	// Chat의 chatRoom_id 안에 chatRoom의 Id가 있다면 삭제
	await Chat.deleteMany({ chatRoom_id: doc._id })

	next();
};

// const postSave = async (next) => {
// 	console.log('New chatRoom has created!')
// 	const doc = await this.model.findOne(this.getFilter())

// 	participantIds = []

// 	doc.participants.forEach(participant => {
// 		participantIds.push(participant.participant_id)
// 	})
// 	await User.updateMany({ _id: { $in: participantIds } }, { $push: { chatRoomBelogned: doc._id } })
// 	next();
// }
chatRoomSchema.pre('deleteOne', { document: false, query: true }, preDelete)

module.exports = mongoose.model('ChatRoom', chatRoomSchema)