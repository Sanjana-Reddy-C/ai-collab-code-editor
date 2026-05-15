const express = require("express");
const cors = require("cors");

const app = express();


// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());


// =========================
// ROUTES
// =========================
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const aiRoutes = require("./routes/aiRoutes");


// =========================
// API ROUTES
// =========================
app.use("/api/auth", authRoutes);

app.use("/api/room", roomRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/ai", aiRoutes);


// =========================
// HEALTH CHECK
// =========================
app.get("/", (req, res) => {

  res.status(200).json({
    message: "API running 🚀"
  });

});


// =========================
// 404 ROUTE
// =========================
app.use((req, res) => {

  res.status(404).json({
    message: "Route not found"
  });

});


// =========================
// GLOBAL ERROR HANDLER
// =========================
app.use((err, req, res, next) => {

  console.error("🔥 Error:", err.message);

  res.status(err.status || 500).json({
    message: err.message || "Server Error"
  });

});

module.exports = app;
