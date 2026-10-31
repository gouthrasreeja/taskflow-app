const ApiError = require("../utils/ApiError");
const { VALID_STATUSES } = require("../utils/constants");

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const isString = (v) => typeof v === "string";

// Every field is type-checked first: JSON bodies can carry arrays/objects, and
// operator objects such as { "$gt": "" } must never reach a database query.
function validateSignup(req, _res, next) {
  const { name, email, password } = req.body || {};

  if (!isString(name) || name.trim().length < 2) {
    return next(new ApiError(400, "Name must be at least 2 characters"));
  }
  if (!isString(email) || !EMAIL_REGEX.test(email)) {
    return next(new ApiError(400, "A valid email is required"));
  }
  if (!isString(password) || password.length < 6) {
    return next(new ApiError(400, "Password must be at least 6 characters"));
  }
  next();
}

function validateLogin(req, _res, next) {
  const { email, password } = req.body || {};
  if (!isString(email) || !isString(password) || !email || !password) {
    return next(new ApiError(400, "Email and password are required"));
  }
  next();
}

function validateTaskInput(req, _res, next) {
  const { title, description, status, dueDate } = req.body || {};

  // Title is required on create (the model enforces that) but optional on update.
  if (title !== undefined && (!isString(title) || !title.trim())) {
    return next(new ApiError(400, "Title cannot be empty"));
  }
  if (description !== undefined && !isString(description)) {
    return next(new ApiError(400, "Description must be text"));
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return next(new ApiError(400, `Status must be one of: ${VALID_STATUSES.join(", ")}`));
  }
  if (dueDate !== undefined && dueDate !== null) {
    if (!isString(dueDate) || isNaN(Date.parse(dueDate))) {
      return next(new ApiError(400, "dueDate must be a valid date"));
    }
  }
  next();
}

module.exports = { validateSignup, validateLogin, validateTaskInput };
