const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { auth, adminOnly } = require('../middleware/auth');

// @route   GET /api/tasks
// @desc    Get all tasks (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, assignedTo, project, search } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (project) filter.project = project;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Employees see only their assigned tasks
    if (req.user.role === 'employee') {
      filter.assignedTo = req.user._id;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('project', 'title')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('project', 'title')
      .populate('comments.user', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/tasks
// @desc    Create a task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, project, assignedTo, status, priority, dueDate } = req.body;

    const task = new Task({
      title,
      description,
      project,
      assignedTo,
      createdBy: req.user._id,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate,
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('project', 'title');

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Update fields
    const updates = req.body;
    Object.keys(updates).forEach((key) => {
      if (key !== '_id' && key !== 'createdBy') {
        task[key] = updates[key];
      }
    });

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('project', 'title');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/tasks/:id/status
// @desc    Update task status (for drag and drop)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = status;
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('project', 'title');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add comment to task
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.comments.push({
      user: req.user._id,
      text: req.body.text,
    });

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('comments.user', 'name');

    res.json(updatedTask.comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only admin or task creator can delete
    if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
