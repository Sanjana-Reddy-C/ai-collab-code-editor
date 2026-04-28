const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ❌ No header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token, authorization denied",
      });
    }

    // 🔑 Extract token
    const token = authHeader.split(" ")[1];

    // ❌ No token after split
    if (!token) {
      return res.status(401).json({
        message: "Token missing",
      });
    }

    // 🔐 Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 👤 Attach user ID to request
    req.user = decoded.id;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = protect;