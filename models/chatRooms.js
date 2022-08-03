const mongoose=require('mongoose');
const autoIdSetter=require('../auto-id-setter'); // id autoIncrement를 위한 모듈

const chatRooms=new mongoose.Schema({
    chatRoomId:{ // 채팅방 ID
        type:Number
    },
    participants:[],// 2명의 사용자
},
{
    timestamps:true
});

// autoIncrement setter
autoIdSetter(chatRooms, mongoose, 'chatRooms', 'chatRoomId') 
// 서버에게 undefined 또는 null값을 줄 때 판별
mongoose.Schema.Types.String.checkRequired(v => v != null); 

chatRooms.statics.create=function(payload){
    const chatRoom=new this(payload);
    return chatRoom.save();
};

chatRooms.statics.findAll=function(){
    return this.find({});
};

chatRooms.statics.findByUserId=function(userId){
    return this.find({participants:userId}, {_id: 0, participants:0,createdAt:0, updatedAt:0, __v:0});
};

chatRooms.statics.updateBychatId=function(chatRoomId, payload){
    return this.findOneAndUpdate({chatId}, payload, {new:true})
}

chatRooms.statics.deleteBychatId=function(chatId){
    return this.remove({chatId});
}

// 3번째 인자로 스키마 이름을 입력, 그렇지 않으면 모두 소문자로 바꾼 후 's'를 붙여 강제 개명
module.exports=mongoose.model('chatRooms', chatRooms, 'chatRooms')