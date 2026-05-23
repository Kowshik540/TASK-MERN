const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// @route   GET /api/stats/dashboard
// @desc    Get dashboard statistics
router.get('/dashboard', auth, async (req, res) => {
  try {
    let taskFilter = {};
    if (req.user.role === 'employee') {
      taskFilter.assignedTo = req.user._id;
    }

    const totalTasks = await Task.countDocuments(taskFilter);
    const todoTasks = await Task.countDocuments({ ...taskFilter, status: 'todo' });
    const inProgressTasks = await Task.countDocuments({ ...taskFilter, status: 'in-progress' });
    const doneTasks = await Task.countDocuments({ ...taskFilter, status: 'done' });
    const totalProjects = await Project.countDocuments();
    const totalUsers = await User.countDocuments();

    // Overdue tasks
    const overdueTasks = await Task.countDocuments({
      ...taskFilter,
      status: { $ne: 'done' },
      dueDate: { $lt: new Date() },
    });

    // Recent tasks
    const recentTasks = await Task.find(taskFilter)
      .populate('assignedTo', 'name')
      .populate('project', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      totalProjects,
      totalUsers,
      overdueTasks,
      recentTasks,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stats/productivity
// @desc    Get productivity score (Unique Feature)
router.get('/productivity', auth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id;

    // Get tasks completed in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completedTasks = await Task.find({
      assignedTo: userId,
      status: 'done',
      completedAt: { $gte: thirtyDaysAgo },
    });

    const totalAssigned = await Task.countDocuments({ assignedTo: userId });
    const totalCompleted = await Task.countDocuments({ assignedTo: userId, status: 'done' });
    const totalOverdue = await Task.countDocuments({
      assignedTo: userId,
      status: { $ne: 'done' },
      dueDate: { $lt: new Date() },
    });

    // Calculate productivity score (0-100)
    let score = 0;
    if (totalAssigned > 0) {
      const completionRate = (totalCompleted / totalAssigned) * 100;
      const overdueRate = (totalOverdue / totalAssigned) * 100;
      score = Math.max(0, Math.min(100, Math.round(completionRate - overdueRate * 0.5)));
    }

    // On-time completion rate
    const onTimeCompleted = completedTasks.filter((task) => {
      if (!task.dueDate) return true;
      return task.completedAt <= task.dueDate;
    }).length;

    const onTimeRate = completedTasks.length > 0
      ? Math.round((onTimeCompleted / completedTasks.length) * 100)
      : 100;

    // Deadline reminders (upcoming deadlines in next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingDeadlines = await Task.find({
      assignedTo: userId,
      status: { $ne: 'done' },
      dueDate: { $gte: new Date(), $lte: threeDaysFromNow },
    })
      .populate('project', 'title')
      .sort({ dueDate: 1 });

    res.json({
      productivityScore: score,
      totalAssigned,
      totalCompleted,
      totalOverdue,
      onTimeRate,
      completedLast30Days: completedTasks.length,
      upcomingDeadlines,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
