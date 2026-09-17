const express = require("express");
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");
const { validateTaskInput } = require("../middleware/validate");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// Every task route requires a valid logged-in user
router.use(requireAuth);

router.route("/").get(getTasks).post(validateTaskInput, createTask);

router
  .route("/:id")
  .get(getTaskById)
  .put(validateTaskInput, updateTask)
  .delete(deleteTask);

module.exports = router;
