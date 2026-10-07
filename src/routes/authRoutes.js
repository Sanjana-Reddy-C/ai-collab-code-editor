const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

// 🔐 Auth APIs
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
// 👤 Protected route (test + future use)
router.get("/profile", protect, (req, res) => {
  res.status(200).json({
    message: "Access granted",
    userId: req.user,
  });
});

module.exports = router;