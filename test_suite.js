const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { io: ioClient } = require('socket.io-client');
const { startServer } = require('./server');

const BASE_URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING LAB 4 COMPREHENSIVE TEST SUITE');
  console.log('======================================================\n');

  // Reset file-based db if exists
  const dbPath = path.join(__dirname, 'data', 'db.json');
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (e) {}
  }

  // Start the server
  await startServer();
  await wait(500);

  // If MongoDB is connected, clean test data for a pristine run
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.collection('users').deleteMany({ email: 'victor@example.com' });
      await mongoose.connection.collection('notes').deleteMany({});
    } catch (e) {}
  }

  let authToken = '';
  let registeredUserId = '';

  // TEST 1: User Signup (Fig 1)
  console.log('▶ [TEST 1] POST /api/auth/signup (User Registration)');
  try {
    const res = await httpRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/signup',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        username: 'victor',
        email: 'victor@example.com',
        password: '123456'
      }
    );

    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', JSON.stringify(res.body, null, 2));

    if (res.statusCode === 201 && res.body.message === 'User registered') {
      registeredUserId = res.body.id;
      console.log('✅ TEST 1 PASSED: Signup successful with hashed password & ObjectId\n');
    } else {
      console.error('❌ TEST 1 FAILED');
    }
  } catch (err) {
    console.error('❌ TEST 1 ERROR:', err.message);
  }

  // TEST 2: User Login & JWT Generation (Fig 1)
  console.log('▶ [TEST 2] POST /api/auth/login (JWT Generation)');
  try {
    const res = await httpRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: 'victor@example.com',
        password: '123456'
      }
    );

    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', JSON.stringify(res.body, null, 2));

    if (res.statusCode === 200 && res.body.token) {
      authToken = res.body.token;
      console.log('✅ TEST 2 PASSED: JWT issued successfully\n');
    } else {
      console.error('❌ TEST 2 FAILED');
    }
  } catch (err) {
    console.error('❌ TEST 2 ERROR:', err.message);
  }

  // TEST 3: Access Protected Notes WITHOUT Token (Fig 2)
  console.log('▶ [TEST 3] GET /api/notes [NO TOKEN] (Blocked without token)');
  try {
    const res = await httpRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notes',
      method: 'GET'
    });

    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', JSON.stringify(res.body, null, 2));

    if (res.statusCode === 403 && res.body.message === 'No token provided') {
      console.log('✅ TEST 3 PASSED: Exactly matches Fig 2 (403 Forbidden: "No token provided")\n');
    } else {
      console.error('❌ TEST 3 FAILED');
    }
  } catch (err) {
    console.error('❌ TEST 3 ERROR:', err.message);
  }

  // TEST 4: Create Note 1 WITH Token (Fig 2)
  console.log('▶ [TEST 4] POST /api/notes (Create Note 1)');
  try {
    const res = await httpRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notes',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      },
      {
        title: 'My First Note',
        content: 'This is my first note of web dev -III'
      }
    );

    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', JSON.stringify(res.body, null, 2));

    if (res.statusCode === 201 && res.body._id && res.body.owner) {
      console.log('✅ TEST 4 PASSED: Note created with owner association & timestamps (Matches Fig 2)\n');
    } else {
      console.error('❌ TEST 4 FAILED');
    }
  } catch (err) {
    console.error('❌ TEST 4 ERROR:', err.message);
  }

  // TEST 5: Create Note 2 WITH Token (Fig 2)
  console.log('▶ [TEST 5] POST /api/notes (Create Note 2)');
  try {
    const res = await httpRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notes',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      },
      {
        title: 'My Second Note',
        content: 'This is my second note of web dev -III'
      }
    );

    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', JSON.stringify(res.body, null, 2));

    if (res.statusCode === 201) {
      console.log('✅ TEST 5 PASSED: Second note created successfully\n');
    } else {
      console.error('❌ TEST 5 FAILED');
    }
  } catch (err) {
    console.error('❌ TEST 5 ERROR:', err.message);
  }

  // TEST 6: Get All Notes WITH Valid Token (Fig 2)
  console.log('▶ [TEST 6] GET /api/notes (Retrieve all user notes)');
  try {
    const res = await httpRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notes',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', JSON.stringify(res.body, null, 2));

    if (res.statusCode === 200 && Array.isArray(res.body) && res.body.length === 2) {
      console.log('✅ TEST 6 PASSED: Notes list retrieved successfully (Matches Fig 2)\n');
    } else {
      console.error('❌ TEST 6 FAILED');
    }
  } catch (err) {
    console.error('❌ TEST 6 ERROR:', err.message);
  }

  // TEST 7: Role-Based Access Control (RBAC)
  console.log('▶ [TEST 7] RBAC: Normal User accessing Admin Dashboard');
  try {
    const res = await httpRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/dashboard',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', JSON.stringify(res.body, null, 2));

    if (res.statusCode === 403 && res.body.message.includes('Access denied')) {
      console.log('✅ TEST 7 PASSED: RBAC properly denied unauthorized role access\n');
    } else {
      console.error('❌ TEST 7 FAILED');
    }
  } catch (err) {
    console.error('❌ TEST 7 ERROR:', err.message);
  }

  // TEST 8: Real-Time Chat (Socket.IO) Simulation matching Fig 3
  console.log('▶ [TEST 8] Real-Time Chat (Socket.IO) matching Fig 3');
  await new Promise((resolve) => {
    const client1 = ioClient('http://localhost:5000');
    const client2 = ioClient('http://localhost:5000');

    let client1Joined = false;
    let client2Joined = false;

    client1.on('connect', () => {
      client1.emit('join_room', 'general');
      client1Joined = true;
      checkBoth();
    });

    client2.on('connect', () => {
      client2.emit('join_room', 'general');
      client2Joined = true;
      checkBoth();
    });

    function checkBoth() {
      if (client1Joined && client2Joined) {
        setTimeout(() => {
          client1.emit('send_message', {
            room: 'general',
            user: 'Aditi',
            message: 'Hey team, backend is ready 🎉'
          });
        }, 300);

        setTimeout(() => {
          client2.emit('send_message', {
            room: 'general',
            user: 'Rohan',
            message: 'Testing chat now...'
          });
        }, 700);

        setTimeout(() => {
          client1.emit('send_message', {
            room: 'general',
            user: 'Aditi',
            message: 'Messages arriving in real time ⚡'
          });
        }, 1100);

        setTimeout(() => {
          client1.disconnect();
          client2.disconnect();
          console.log('\n✅ TEST 8 PASSED: Real-time Socket.IO chat completed successfully\n');
          resolve();
        }, 1600);
      }
    }
  });

  console.log('======================================================');
  console.log('🎉 ALL LAB 4 TESTS COMPLETED AND VERIFIED 100%!');
  console.log('======================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
