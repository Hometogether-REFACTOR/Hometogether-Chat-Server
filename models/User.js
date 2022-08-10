const mongoose = require('mongoose');
const Schema = mongoose.Schema
const userSchema = new mongoose.Schema({
  nickname:{
    type:String,
    required:[true, 'must provide nickname'],
    unique:true
  },
  chatRoomBelogned: [{
    type: Schema.Types.ObjectId,
    ref: 'ChatRoom'
  }],
},
  {
    timestamps: true
  });

module.exports = mongoose.model('User', userSchema)