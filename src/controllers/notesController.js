const Note = require('../models/Note');
const appEvents = require('../events/appEvents');

// @desc    Create a new note
// @route   POST /api/notes
// @access  Private
const createNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const note = await Note.create({
      title: title.trim(),
      content: content.trim(),
      owner: req.user.id
    });

    // Trigger Node.js EventEmitter event
    appEvents.emit('note:created', note);

    // Exact response format matching Fig 2
    return res.status(201).json({
      _id: note._id,
      title: note.title,
      content: note.content,
      owner: note.owner,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all notes for authenticated user
// @route   GET /api/notes
// @access  Private
const getNotes = async (req, res, next) => {
  try {
    // If admin, can optionally view all notes or their own. For normal users, only own notes.
    const query = req.user.role === 'admin' && req.query.all === 'true'
      ? {}
      : { owner: req.user.id };

    const notes = await Note.find(query);

    // Exact response matching Fig 2 (Array of notes)
    return res.status(200).json(notes);
  } catch (error) {
    next(error);
  }
};

// @desc    Get note by ID
// @route   GET /api/notes/:id
// @access  Private
const getNoteById = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check ownership or admin role
    if (note.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: not authorized to view this note' });
    }

    return res.status(200).json(note);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a note
// @route   PUT /api/notes/:id
// @access  Private
const updateNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check ownership or admin role
    if (note.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: not authorized to update this note' });
    }

    const updatedNote = await Note.findByIdAndUpdate(req.params.id, {
      ...(title && { title: title.trim() }),
      ...(content && { content: content.trim() })
    });

    appEvents.emit('note:updated', updatedNote);

    return res.status(200).json(updatedNote);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Private
const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check ownership or admin role
    if (note.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: not authorized to delete this note' });
    }

    await Note.findByIdAndDelete(req.params.id);

    appEvents.emit('note:deleted', { noteId: req.params.id, userId: req.user.id });

    return res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote
};
