const mongoose=require('mongoose');
const autoIdSetter=require('../auto-id-setter'); // id autoIncrement를 위한 모듈

const chats=new mongoose.Schema({
    chatId:{ // autoIdSetter에 의해 자동으로 생성되어 required X
        type:Number,
        unique:true
    },
    chatRoomId:{ // 채팅방 ID
        type:Number,
        required:true
    },
    sender:{ // 수신자 정보
        sender_id:{
            type:Number,
            required:true
        },
        // sender_nickname:{
        //     type:String,
        //     required:true
        // }
    },
    // receiver:{ // 수신자 정보
    //     receiver_id:{
    //         type:Number,
    //         required:true
    //     }
    //     // receiver_name:{
    //     //     type:String,
    //     //     required:true
    //     // }
    // },
    msg:{
        type:String,
        required:true
    },
    status:{
        isRead:{
            type:Boolean,
            default:'false'
        },
        error:{
            type:String,
            default:'No error'
        },
    }
},
{
    timestamps:true
});

// autoIncrement setter
autoIdSetter(chats, mongoose, 'chat', 'chatId') 
// 서버에게 undefined 또는 null값을 줄 때 판별
mongoose.Schema.Types.String.checkRequired(v => v != null); 

chats.statics.create=function(payload){
    const chat=new this(payload);
    return chat.save();
};

chats.statics.findAll=function(){
    return this.find({});
}

chats.statics.findByChatId=function(chatId){
    return this.findOne({chatId})
}
chats.statics.findByChatRoomId=function(_chatRoomId){
    return this.find({chatRoomId:_chatRoomId}, {_id: 0, __v:0})
}

chats.statics.updateBychatRoomId=function(chatRoomId, payload){
    console.log(chatRoomId, payload);
    return this.update({chatRoomId: chatRoomId}, payload)
}

chats.statics.deleteBychatId=function(chatId){
    return this.remove({chatId});
}

module.exports=mongoose.model('chat', chats)