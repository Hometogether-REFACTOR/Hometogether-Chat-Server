const mongoose = require('mongoose');
const Schema = mongoose.Schema

const chatSchema = new mongoose.Schema({
	chatRoom: {
		type: Schema.Types.ObjectId,
		ref: 'ChatRoom',
		required: [true, 'You must provide chatRoomId.'],
	},
	sender: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: [true, 'You must provide sender ID.']
	},
	msg: {
		type: String,
		required: [true, "Don't provide empty msg."]
	},
	userReads: [new mongoose.Schema({
		user_id: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'You must provide user ID.']
		},
		isRead: {
			type: Boolean,
			default: false
		}
	}, { _id: false })]
},
	{
		timestamps: true
	});

module.exports = mongoose.model('Chat', chatSchema)