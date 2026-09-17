const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");

// Protects routes: requires a valid "Authorization: Bearer <token>" header.
// On success, attaches the authenticated user to req.user.
const requireAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Missing or malformed Authorization header");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, "User for this token no longer exists");
  }

  req.user = user;
  next();
});

module.exports = requireAuth;
