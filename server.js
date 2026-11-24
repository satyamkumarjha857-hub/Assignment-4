require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const initChatSocket = require('./src/sockets/chatSocket');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach Socket.IO chat handlers
initChatSocket(io);

// Start server after connecting to database
const startServer = async () => {
  await connectDB();

  return new Promise((resolve) => {
    server.listen(PORT, () => {
      // Exact log format matching Lab 4 Fig 3
      console.log(`[server] listening on http://localhost:${PORT}`);
      resolve(server);
    });
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io, startServer };
