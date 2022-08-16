require('dotenv').config();

const connectDB = require('./db/connect')
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http');
const server = http.createServer(app);

// const socket_options = {
//   cors: {
//     origin: ['http://localhost:4500'],
//     methods: ['GET', 'POST'],
//   },
// };

require('./socket')(server);

const PORT = process.env.PORT || 4500;

app.set('views', __dirname + '/public');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use('/socket', require('./routes/main'))

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI_TEST)
      .then(() => console.log('Successfully connected to mongodb'))
      .catch(e => console.error(e));

    server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (error) {
    console.log(error);
  }
}

start()

module.exports = server;