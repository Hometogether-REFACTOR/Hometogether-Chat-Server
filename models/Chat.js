const mongoose = require('mongoose');
const Schema=mongoose.Schema

const chatSchema = new mongoose.Schema({
	chatRoomId: {
		type: Schema.Types.ObjectId,
		ref:'chatRoom',
		required:[true, 'You must provide chatRoomId.'],
	},
	sender: {
		sender_id: {
			type: Number,
			required: [true, 'You must provide sender_id']
		},
		sender_nickname:{
			type:String,
			required: [true, 'You must provide nickname.']
		}
	},
	msg: {
		type: String,
		required: [true, "Don't provide empty msg."]
	},
	userReads:[new mongoose.Schema({
		userId:Number,
		isRead:{
			type:Boolean,
			default:false
		}
	},{_id:false})]},
	{
		timestamps: true
	});

module.exports = mongoose.model('Chat', chatSchema)