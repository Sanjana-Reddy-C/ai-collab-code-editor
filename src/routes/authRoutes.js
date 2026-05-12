const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

// 🔐 Auth APIs
router.post("/register", registerUser);
router.post("/login", loginUser);

// 👤 Protected route (test + future use)
router.get("/profile", protect, (req, res) => {
  res.status(200).json({
    message: "Access granted",
    userId: req.user,
  });
});

module.exports = router;