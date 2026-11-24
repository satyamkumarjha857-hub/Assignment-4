const mongoose = require('mongoose');
const { getIsMongoConnected } = require('../config/db');
const { generateId, readData, writeData } = require('../config/fileStore');

// Mongoose Schema Definition
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

const MongoUserModel = mongoose.models.User || mongoose.model('User', userSchema);

// Hybrid Data Access Layer
const User = {
  create: async ({ username, email, password, role = 'user' }) => {
    if (getIsMongoConnected()) {
      const user = await MongoUserModel.create({ username, email, password, role });
      return {
        _id: user._id.toString(),
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        password: user.password,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    } else {
      const db = readData();
      const now = new Date().toISOString();
      const id = generateId();
      const newUser = {
        _id: id,
        id: id,
        username,
        email: email.toLowerCase(),
        password,
        role,
        createdAt: now,
        updatedAt: now
      };
      db.users.push(newUser);
      writeData(db);
      return newUser;
    }
  },

  findOne: async (query) => {
    if (getIsMongoConnected()) {
      const user = await MongoUserModel.findOne(query);
      if (!user) return null;
      return {
        _id: user._id.toString(),
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        password: user.password,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    } else {
      const db = readData();
      const key = Object.keys(query)[0];
      const val = query[key];
      const user = db.users.find(u => {
        if (key === 'email') return u.email.toLowerCase() === val.toLowerCase();
        return u[key] === val;
      });
      return user || null;
    }
  },

  findById: async (id) => {
    if (getIsMongoConnected()) {
      const user = await MongoUserModel.findById(id);
      if (!user) return null;
      return {
        _id: user._id.toString(),
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        password: user.password,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    } else {
      const db = readData();
      const user = db.users.find(u => u._id === id || u.id === id);
      return user || null;
    }
  },

  find: async () => {
    if (getIsMongoConnected()) {
      const users = await MongoUserModel.find().select('-password');
      return users.map(u => ({
        _id: u._id.toString(),
        id: u._id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString()
      }));
    } else {
      const db = readData();
      return db.users.map(({ password, ...u }) => u);
    }
  }
};

module.exports = User;
