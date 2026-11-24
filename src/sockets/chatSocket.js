const appEvents = require('../events/appEvents');

const initChatSocket = (io) => {
  io.on('connection', (socket) => {
    // Exact log format matching Lab 4 Fig 3: User connected: <socket.id>
    console.log(`User connected: ${socket.id}`);

    // Join Room Event
    socket.on('join_room', (data) => {
      const room = typeof data === 'object' ? data.room : data;
      const username = typeof data === 'object' ? data.username : null;

      socket.join(room);

      // Exact log format matching Lab 4 Fig 3: <socket.id> joined room <room>
      console.log(`${socket.id} joined room ${room}`);

      // Notify others in the room
      socket.to(room).emit('user_joined', {
        socketId: socket.id,
        username: username || socket.id,
        room,
        message: `${username || socket.id} joined room ${room}`
      });
    });

    // Alias for joinRoom
    socket.on('joinRoom', (data) => {
      socket.emit('join_room', data);
    });

    // Chat Message Event
    socket.on('send_message', (data) => {
      const { room = 'general', message, user = 'Anonymous', username } = data;
      const senderName = user !== 'Anonymous' ? user : (username || 'Anonymous');

      // Exact log format matching Lab 4 Fig 3: [<room>] <user>: <message>
      console.log(`[${room}] ${senderName}: ${message}`);

      // Emit event through Node.js EventEmitter for decoupled handling
      appEvents.emit('chat:broadcast', { room, user: senderName, message });

      // Broadcast message to everyone in the room (including sender or to others)
      io.to(room).emit('receive_message', {
        user: senderName,
        message,
        room,
        timestamp: new Date().toISOString()
      });
    });

    // Alias for chat_message
    socket.on('chat_message', (data) => {
      const { room = 'general', message, user = 'Anonymous', username } = data;
      const senderName = user !== 'Anonymous' ? user : (username || 'Anonymous');
      console.log(`[${room}] ${senderName}: ${message}`);
      io.to(room).emit('receive_message', {
        user: senderName,
        message,
        room,
        timestamp: new Date().toISOString()
      });
    });

    // Disconnect Event
    socket.on('disconnect', () => {
      // Optional logging or cleanup
    });
  });
};

module.exports = initChatSocket;
