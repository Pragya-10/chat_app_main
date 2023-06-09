const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require('bad-words')
const PORT = process.env.PORT || 5000;
const {generateMessage} = require('./utils/messages')
const {addUser,removeUser,getUser,getUsersInRoom} = require('./utils/users')

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
  console.log("new websocket connection");

  socket.on('join', ({username, room}, callback)=>{
    const {error, user} = addUser({id:socket.id,username,room})

    if(error) {
     return callback(error)
    }

    socket.join(user.room)

    socket.emit("message", generateMessage(`Welcome ${user.username}`));
    socket.broadcast.to(user.room).emit("message", generateMessage(`${user.username} has joined the room!`));
    io.to(user.room).emit('roomData', {
      room: user.room,
      users:getUsersInRoom(user.room)
    })
    callback()
    // socket.emit, io.emit, socket.broadcasr.emit
    // io.to.emit, socket.broadcast.to.emit 
  })

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id)
    const filter = new Filter()

    if(filter.isProfane(message)){
      return callback('Profanity is not allowed!')
    }

    io.to(user.room).emit("message", generateMessage(user.username,message));
    callback()
  });

  socket.on("sendLocation", (location, callback) => {
    const user = getUser(socket.id)

    io.to(user.room).emit("locationMessage",generateMessage(user.username ,`https://google.com/maps?q=${location.latitude},${location.longitude}`));
    callback()
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id)

    if(user){
      io.to(user.room).emit("message", generateMessage(`${user.username} has left!`));
      io.to(user.room).emit('roomData', {
        room: user.room,
        users:getUsersInRoom(user.room)
      })
    }
    
  });
});

server.listen(PORT, () => {
  console.log(`The server is running on ${PORT}`);
});


