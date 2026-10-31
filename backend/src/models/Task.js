const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "in-progress", "done"],
        message: "Status must be one of: pending, in-progress, done",
      },
      default: "pending",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // fast lookups of "all tasks for this user"
    },
  },
  { timestamps: true }
);

// Matches GET /api/tasks: filter by owner, sorted newest-first, so no in-memory sort is needed
taskSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Task", taskSchema);
