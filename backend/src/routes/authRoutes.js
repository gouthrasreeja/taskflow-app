const express = require("express");
const { signup, login, getMe } = require("../controllers/authController");
const { validateSignup, validateLogin } = require("../middleware/validate");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.post("/signup", validateSignup, signup);
router.post("/login", validateLogin, login);
router.get("/me", requireAuth, getMe);

module.exports = router;
