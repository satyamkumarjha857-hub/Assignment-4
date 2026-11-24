const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}

const appEvents = new AppEventEmitter();

// Event listeners for audit logging & decoupled actions
appEvents.on('user:registered', (user) => {
  console.log(`[Event: user:registered] User created: ${user.username} (${user.email}) [ID: ${user._id || user.id}]`);
});

appEvents.on('user:login', (user) => {
  console.log(`[Event: user:login] User logged in: ${user.email} at ${new Date().toISOString()}`);
});

appEvents.on('note:created', (note) => {
  console.log(`[Event: note:created] Note created: "${note.title}" by User [ID: ${note.owner}]`);
});

appEvents.on('note:updated', (note) => {
  console.log(`[Event: note:updated] Note updated: "${note.title}" [ID: ${note._id}]`);
});

appEvents.on('note:deleted', ({ noteId, userId }) => {
  console.log(`[Event: note:deleted] Note [ID: ${noteId}] deleted by User [ID: ${userId}]`);
});

appEvents.on('chat:broadcast', ({ room, user, message }) => {
  // Can be used for auditing or real-time persistence
});

module.exports = appEvents;
