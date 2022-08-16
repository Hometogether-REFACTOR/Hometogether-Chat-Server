# Hometogether-Chat-Server

.env 추가
PORT=4500
MONGO_URI=mongodb://localhost:27017/chatLog

# Server측 emit - Client측 on
- sendInitChatLog
- receiveMessage

# Client측 emit
- checkMessage
- error



Item 을 쿼리할 때 reference를 가지고 있는 모델의 데이터를 가지고 오고 싶으면 다음과 같이 populate를 하면 된다.

const item = await Item.findById(req.params.id)
  .populate({ path: 'itemType', select: 'name' })
  .populate({ path: 'model', select: 'name' })
  .populate({ path: 'owner', select: 'nickName' })
  .populate({ path: 'provisionHistory' });


mongoose pull과 pop의 차이점 : pop은 값을 하나만 제거, pull은 지정된 조건에 해당하는 객체를 삭제