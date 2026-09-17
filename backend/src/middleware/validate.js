const ApiError = require("../utils/ApiError");

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const VALID_STATUSES = ["pending", "in-progress", "done"];

function validateSignup(req, _res, next) {
  const { name, email, password } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return next(new ApiError(400, "Name must be at least 2 characters"));
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return next(new ApiError(400, "A valid email is required"));
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return next(new ApiError(400, "Password must be at least 6 characters"));
  }
  next();
}

function validateLogin(req, _res, next) {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ApiError(400, "Email and password are required"));
  }
  next();
}

function validateTaskInput(req, _res, next) {
  const { title, status, dueDate } = req.body;

  // Title is required on create, optional on update - only enforce
  // "must not be blank if provided" so PATCH-style partial updates work.
  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return next(new ApiError(400, "Title cannot be empty"));
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return next(
      new ApiError(400, `Status must be one of: ${VALID_STATUSES.join(", ")}`)
    );
  }
  if (dueDate !== undefined && dueDate !== null && isNaN(Date.parse(dueDate))) {
    return next(new ApiError(400, "dueDate must be a valid date"));
  }
  next();
}

module.exports = { validateSignup, validateLogin, validateTaskInput };
