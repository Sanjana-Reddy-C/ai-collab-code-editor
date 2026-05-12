const express = require("express");
const cors = require("cors");

const app = express();

//  Middleware
app.use(cors());
app.use(express.json());

//  Routes
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);

//  Health check route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "API running ",
  });
});

//  Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(" Error:", err.message);

  res.status(err.status || 500).json({
    message: err.message || "Server Error",
  });
});

module.exports = app;
