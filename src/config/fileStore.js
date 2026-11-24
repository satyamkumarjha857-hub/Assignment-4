const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbFile = path.join(dataDir, 'db.json');

const generateId = () => crypto.randomBytes(12).toString('hex');

const initStore = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ users: [], notes: [] }, null, 2), 'utf-8');
  }
};

const readData = () => {
  initStore();
  try {
    const raw = fs.readFileSync(dbFile, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { users: [], notes: [] };
  }
};

const writeData = (data) => {
  initStore();
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
};

module.exports = {
  generateId,
  readData,
  writeData
};
