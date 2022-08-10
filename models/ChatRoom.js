const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const chatRoomSchema=new mongoose.Schema({
    name:{ // 채팅방 이름
        type:String,
        required:[true, 'You must provide name.'],
        unique:true
    },
    participants:[new mongoose.Schema({
        participant_id:{
            type:Schema.Types.ObjectId,
            ref:'Chat',
        },
        last_access:{
            type:Date,
            default:Date.now
        },
    }, {_id:false})],// 2명의 사용자 -> 여러 사용자로 확장
},
{
    timestamps:true
});


module.exports=mongoose.model('ChatRoom', chatRoomSchema)