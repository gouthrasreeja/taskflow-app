const Task = require("../models/Task");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { buildTaskFilter } = require("../utils/taskQuery");

// GET /api/tasks
// Supports optional query params: ?status=pending&search=keyword
const getTasks = asyncHandler(async (req, res) => {
  const filter = buildTaskFilter(req.query, req.user._id);

  // lean(): return plain objects instead of full Mongoose documents (less memory/CPU on reads)
  const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();

  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

// GET /api/tasks/:id
const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id }).lean();

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  res.status(200).json({ success: true, data: task });
});

// POST /api/tasks
const createTask = asyncHandler(async (req, res) => {
  const { title, description, status, dueDate } = req.body;

  const task = await Task.create({
    title,
    description,
    status,
    dueDate: dueDate || null,
    userId: req.user._id,
  });

  res.status(201).json({ success: true, data: task });
});

// PUT /api/tasks/:id
const updateTask = asyncHandler(async (req, res) => {
  const { title, description, status, dueDate } = req.body;

  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;
  if (dueDate !== undefined) task.dueDate = dueDate;

  await task.save();

  res.status(200).json({ success: true, data: task });
});

// DELETE /api/tasks/:id
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  res.status(200).json({ success: true, data: {} });
});

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask };
