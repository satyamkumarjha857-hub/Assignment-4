const mongoose = require('mongoose');

let isMongoConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_connect_db';
  try {
    // Attempt MongoDB connection with 2.5s timeout so it doesn't hang if Mongo isn't running
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    isMongoConnected = true;
    console.log(`[database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    isMongoConnected = false;
    console.log(`[database] MongoDB connection bypassed (${error.message}). Using local JSON persistence.`);
    return false;
  }
};

const getIsMongoConnected = () => isMongoConnected;

module.exports = {
  connectDB,
  getIsMongoConnected
};
