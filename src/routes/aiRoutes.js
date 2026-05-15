const express = require("express");

const router = express.Router();

const {
  analyzeCodeController
} = require("../controllers/aiController");


// =========================
// AI ROUTES
// =========================
router.post("/analyze", analyzeCodeController);


module.exports = router;