const express = require('express');
const Task = require('../models/Task');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Every route below requires a valid login (see middleware/auth.js).
router.use(requireAuth);

// GET /api/tasks - list all tasks belonging to the logged-in user
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch tasks.', error: err.message });
  }
});

// POST /api/tasks - create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      owner: req.userId,
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Could not create task.', error: err.message });
  }
});

// PUT /api/tasks/:id - update an existing task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId }, // makes sure users can only edit their own tasks
      req.body,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Could not update task.', error: err.message });
  }
});

// DELETE /api/tasks/:id - delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.userId });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete task.', error: err.message });
  }
});

module.exports = router;
