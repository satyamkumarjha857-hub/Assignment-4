let currentToken = localStorage.getItem('jwt_token') || '';
let currentUser = JSON.parse(localStorage.getItem('user_info') || 'null');
let socket = null;
let currentRoom = 'general';

const apiConsole = document.getElementById('apiConsole');
const tokenDisplay = document.getElementById('tokenDisplay');
const statusText = document.getElementById('statusText');
const userStatusPill = document.getElementById('userStatusPill');

function logToConsole(title, data, isError = false) {
  const timestamp = new Date().toLocaleTimeString();
  const output = `[${timestamp}] ${title}\n` + (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) + '\n\n';
  apiConsole.textContent = output + apiConsole.textContent;
}

function clearConsole() {
  apiConsole.textContent = 'Ready...';
}

function updateAuthState() {
  if (currentToken && currentUser) {
    tokenDisplay.textContent = currentToken;
    statusText.textContent = `${currentUser.username} (${currentUser.role || 'user'})`;
    userStatusPill.classList.add('logged-in');
    document.getElementById('chatUsername').value = currentUser.username;
  } else {
    tokenDisplay.textContent = 'No token stored';
    statusText.textContent = 'Not Logged In';
    userStatusPill.classList.remove('logged-in');
  }
}

function switchAuthTab(tab) {
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');
  const buttons = document.querySelectorAll('.tabs .tab-btn');

  if (tab === 'signup') {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    buttons[0].classList.add('active');
    buttons[1].classList.remove('active');
  } else {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    buttons[0].classList.remove('active');
    buttons[1].classList.add('active');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const role = document.getElementById('signupRole').value;

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role })
    });
    const data = await res.json();
    logToConsole(`POST /api/auth/signup (Status: ${res.status})`, data, !res.ok);

    if (res.ok) {
      alert('Registration successful! Now log in with your credentials.');
      switchAuthTab('login');
      document.getElementById('loginEmail').value = email;
      document.getElementById('loginPassword').value = password;
    }
  } catch (err) {
    logToConsole('Signup Network Error', err.message, true);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    logToConsole(`POST /api/auth/login (Status: ${res.status})`, data, !res.ok);

    if (res.ok && data.token) {
      currentToken = data.token;
      localStorage.setItem('jwt_token', currentToken);

      // Decode token payload
      try {
        const payload = JSON.parse(atob(currentToken.split('.')[1]));
        currentUser = payload;
        localStorage.setItem('user_info', JSON.stringify(currentUser));
      } catch (e) {
        currentUser = { email, username: email.split('@')[0] };
      }

      updateAuthState();
      fetchNotes();
    }
  } catch (err) {
    logToConsole('Login Network Error', err.message, true);
  }
}

function copyToken() {
  if (!currentToken) return alert('No token to copy!');
  navigator.clipboard.writeText(currentToken);
  alert('JWT token copied to clipboard!');
}

function logout() {
  currentToken = '';
  currentUser = null;
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_info');
  updateAuthState();
  document.getElementById('notesContainer').innerHTML = '<p class="placeholder-text">Logged out. Log in again to view your notes.</p>';
  logToConsole('Logged Out', 'Token cleared from client');
}

async function handleCreateNote(e) {
  e.preventDefault();
  const title = document.getElementById('noteTitle').value;
  const content = document.getElementById('noteContent').value;

  if (!currentToken) {
    alert('Please log in first to create notes!');
    return;
  }

  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ title, content })
    });
    const data = await res.json();
    logToConsole(`POST /api/notes (Status: ${res.status})`, data, !res.ok);

    if (res.ok) {
      fetchNotes();
    }
  } catch (err) {
    logToConsole('Create Note Error', err.message, true);
  }
}

async function testWithoutToken() {
  try {
    const res = await fetch('/api/notes');
    const data = await res.json();
    logToConsole(`GET /api/notes [WITHOUT TOKEN] (Status: ${res.status})`, data, true);
  } catch (err) {
    logToConsole('Test Without Token Error', err.message, true);
  }
}

async function fetchNotes() {
  if (!currentToken) {
    logToConsole('GET /api/notes', { error: 'No token in client storage to fetch notes' }, true);
    return;
  }

  try {
    const res = await fetch('/api/notes', {
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    });
    const data = await res.json();
    logToConsole(`GET /api/notes (Status: ${res.status})`, data, !res.ok);

    if (res.ok && Array.isArray(data)) {
      renderNotes(data);
    }
  } catch (err) {
    logToConsole('Fetch Notes Error', err.message, true);
  }
}

function renderNotes(notes) {
  const container = document.getElementById('notesContainer');
  if (notes.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No notes yet. Create your first note above!</p>';
    return;
  }

  container.innerHTML = notes.map(n => `
    <div class="note-item">
      <div class="note-item-info">
        <h4>${n.title}</h4>
        <p>${n.content}</p>
        <div class="note-meta">ID: ${n._id} &bull; Created: ${new Date(n.createdAt).toLocaleTimeString()}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="deleteNote('${n._id}')">Delete</button>
    </div>
  `).join('');
}

async function deleteNote(id) {
  if (!confirm('Are you sure you want to delete this note?')) return;
  try {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    });
    const data = await res.json();
    logToConsole(`DELETE /api/notes/${id} (Status: ${res.status})`, data, !res.ok);
    if (res.ok) fetchNotes();
  } catch (err) {
    logToConsole('Delete Note Error', err.message, true);
  }
}

// Socket.IO Chat Implementation
function initSocket() {
  socket = io();

  socket.on('connect', () => {
    appendChatMsg('System', `Connected to server (Socket ID: ${socket.id})`, 'system');
    joinRoom();
  });

  socket.on('user_joined', (data) => {
    appendChatMsg('System', data.message, 'system');
  });

  socket.on('receive_message', (data) => {
    appendChatMsg(data.user, data.message);
  });
}

function joinRoom() {
  const room = document.getElementById('chatRoom').value.trim() || 'general';
  const username = document.getElementById('chatUsername').value.trim() || 'Anonymous';
  currentRoom = room;
  document.getElementById('currentRoomText').textContent = room;

  socket.emit('join_room', { room, username });
  appendChatMsg('System', `You joined room "${room}" as "${username}"`, 'system');
}

function sendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chatMessageInput');
  const message = input.value.trim();
  const username = document.getElementById('chatUsername').value.trim() || 'Anonymous';
  const room = currentRoom;

  if (!message) return;

  socket.emit('send_message', { room, user: username, message });
  input.value = '';
}

function appendChatMsg(sender, text, type = 'user') {
  const box = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = type === 'system' ? 'system-msg' : 'chat-msg';

  if (type === 'system') {
    div.textContent = text;
  } else {
    const time = new Date().toLocaleTimeString();
    div.innerHTML = `<span class="sender">${sender}:</span> ${text} <span class="time">${time}</span>`;
  }

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// Simulation of Lab 4 Fig 3
function simulateLabChat() {
  const room = 'general';
  document.getElementById('chatRoom').value = room;
  joinRoom();

  const messages = [
    { sender: 'Aditi', msg: 'Hey team, backend is ready 🎉', delay: 400 },
    { sender: 'Rohan', msg: 'Testing chat now...', delay: 1200 },
    { sender: 'Aditi', msg: 'Messages arriving in real time ⚡', delay: 2000 }
  ];

  messages.forEach(({ sender, msg, delay }) => {
    setTimeout(() => {
      socket.emit('send_message', { room, user: sender, message: msg });
    }, delay);
  });
}

// Initial Boot
window.addEventListener('DOMContentLoaded', () => {
  updateAuthState();
  initSocket();
});
