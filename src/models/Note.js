const mongoose = require('mongoose');
const { getIsMongoConnected } = require('../config/db');
const { generateId, readData, writeData } = require('../config/fileStore');

// Mongoose Schema Definition
const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const MongoNoteModel = mongoose.models.Note || mongoose.model('Note', noteSchema);

// Hybrid Data Access Layer
const Note = {
  create: async ({ title, content, owner }) => {
    if (getIsMongoConnected()) {
      const note = await MongoNoteModel.create({ title, content, owner });
      return {
        _id: note._id.toString(),
        title: note.title,
        content: note.content,
        owner: note.owner.toString(),
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString()
      };
    } else {
      const db = readData();
      const now = new Date().toISOString();
      const id = generateId();
      const newNote = {
        _id: id,
        title,
        content,
        owner: owner.toString(),
        createdAt: now,
        updatedAt: now
      };
      db.notes.push(newNote);
      writeData(db);
      return newNote;
    }
  },

  find: async (query = {}) => {
    if (getIsMongoConnected()) {
      const notes = await MongoNoteModel.find(query).sort({ createdAt: 1 });
      return notes.map(n => ({
        _id: n._id.toString(),
        title: n.title,
        content: n.content,
        owner: n.owner.toString(),
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString()
      }));
    } else {
      const db = readData();
      let filtered = db.notes;
      if (query.owner) {
        filtered = filtered.filter(n => n.owner === query.owner.toString());
      }
      return filtered;
    }
  },

  findById: async (id) => {
    if (getIsMongoConnected()) {
      const note = await MongoNoteModel.findById(id);
      if (!note) return null;
      return {
        _id: note._id.toString(),
        title: note.title,
        content: note.content,
        owner: note.owner.toString(),
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString()
      };
    } else {
      const db = readData();
      const note = db.notes.find(n => n._id === id);
      return note || null;
    }
  },

  findByIdAndUpdate: async (id, updateData) => {
    if (getIsMongoConnected()) {
      const note = await MongoNoteModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
      if (!note) return null;
      return {
        _id: note._id.toString(),
        title: note.title,
        content: note.content,
        owner: note.owner.toString(),
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString()
      };
    } else {
      const db = readData();
      const index = db.notes.findIndex(n => n._id === id);
      if (index === -1) return null;
      const updated = {
        ...db.notes[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      db.notes[index] = updated;
      writeData(db);
      return updated;
    }
  },

  findByIdAndDelete: async (id) => {
    if (getIsMongoConnected()) {
      const note = await MongoNoteModel.findByIdAndDelete(id);
      return !!note;
    } else {
      const db = readData();
      const initialLen = db.notes.length;
      db.notes = db.notes.filter(n => n._id !== id);
      writeData(db);
      return db.notes.length < initialLen;
    }
  }
};

module.exports = Note;
