const mongoose = require('mongoose');
const Schema = mongoose.Schema
const FKHelper=require('../modules/FKhelper')

const chatSchema = new mongoose.Schema({
	chatRoom_id: {
		type: Schema.Types.ObjectId,
		ref: 'ChatRoom',
		required: [true, 'You must provide chatRoomId.'],
		validate: {
			isAsync: true,
			validator: function(v) {
					return FKHelper(mongoose.model("ChatRoom"), v)
			},
			message: `ChatRoom doesn't exist.`
		}
	},
	sender: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required:false,
		validate: {
			isAsync: true,
			validator: function(v) {
					return FKHelper(mongoose.model("User"), v)
			},
			message: `User doesn't exist.`
		}
	},
	msg: {
		type: String,
		required: [true, "Don't provide empty msg."]
	},
	userReads: [new mongoose.Schema({
		user_id: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'You must provide user ID.'],
			validate: {
				isAsync: true,
				validator: function(v) {
						return FKHelper(mongoose.model("User"), v)
				},
				message: `User doesn't exist.`
			}
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