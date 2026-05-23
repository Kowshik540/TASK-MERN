const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const { auth, adminOnly } = require('../middleware/auth');

// @route   GET /api/projects
// @desc    Get all projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('createdBy', 'name')
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    // Add task count for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await Task.countDocuments({ project: project._id });
        const completedCount = await Task.countDocuments({
          project: project._id,
          status: 'done',
        });
        return {
          ...project.toObject(),
          taskCount,
          completedCount,
        };
      })
    );

    res.json(projectsWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/projects
// @desc    Create a project (Admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { title, description, members } = req.body;

    const project = new Project({
      title,
      description,
      createdBy: req.user._id,
      members: members || [],
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name')
      .populate('members', 'name email');

    res.status(201).json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project (Admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate('createdBy', 'name')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project (Admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Delete all tasks in the project
    await Task.deleteMany({ project: req.params.id });

    res.json({ message: 'Project and associated tasks deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
