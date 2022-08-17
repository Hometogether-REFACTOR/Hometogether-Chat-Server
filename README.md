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


# heroku cli commands
- heroku info : heroku Web URL 등의 정보 가져오기
- heroku restart
- heroku logs -t : 헤로쿠 로그 계속 보기