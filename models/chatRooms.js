const mongoose=require('mongoose');
const autoIdSetter=require('../auto-id-setter'); // id autoIncrement를 위한 모듈

const chatRooms=new mongoose.Schema({
    chatRoomId:{ // 채팅방 ID
        type:Number,
        required:true
    },
    participants:[],// 2명의 사용자
},
{
    timestamps:true
});

// autoIncrement setter
autoIdSetter(chatRooms, mongoose, 'chat', 'chatRoomId') 
// 서버에게 undefined 또는 null값을 줄 때 판별
mongoose.Schema.Types.String.checkRequired(v => v != null); 

chatRooms.statics.create=function(payload){
    const chat=new this(payload);
    return chat.save();
};

chatRooms.statics.findAll=function(){
    return this.find({});
}

chatRooms.statics.findBychatId=function(chatId){
    return this.findOne({chatId})
}

chatRooms.statics.updateBychatId=function(chatId, payload){
    return this.findOneAndUpdate({chatId}, payload, {new:true})
}

chatRooms.statics.deleteBychatId=function(chatId){
    return this.remove({chatId});
}

module.exports=mongoose.model('chat', chatRooms)