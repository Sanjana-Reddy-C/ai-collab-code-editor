const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendResetEmail } = require("../../services/emailService");

// =========================================
// GENERATE JWT TOKEN
// =========================================

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};


// =========================================
// REGISTER USER
// =========================================

const registerUser = async (req, res) => {
  try {

    const {
      username,
      email,
      password
    } = req.body;


    // -----------------------------
    // Check required fields
    // -----------------------------

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "User ID, email and password are required"
      });
    }


    // -----------------------------
    // Validate User ID
    // -----------------------------

    if (username.length < 3) {
      return res.status(400).json({
        message: "User ID must be at least 3 characters"
      });
    }


    // -----------------------------
    // Validate password
    // -----------------------------

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain an uppercase letter"
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain a lowercase letter"
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain a number"
      });
    }


    // -----------------------------
    // Check existing User ID
    // -----------------------------

    const usernameExists = await User.findOne({
      username: username.trim()
    });

    if (usernameExists) {
      return res.status(400).json({
        message: "User ID already exists"
      });
    }


    // -----------------------------
    // Check existing email
    // -----------------------------

    const emailExists = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (emailExists) {
      return res.status(400).json({
        message: "Email is already registered"
      });
    }


    // -----------------------------
    // Hash password
    // -----------------------------

    const hashedPassword = await bcrypt.hash(password, 10);


    // -----------------------------
    // Create user
    // -----------------------------

    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword
    });


    // -----------------------------
    // Generate login token
    // -----------------------------

    const token = generateToken(user._id);


    // -----------------------------
    // Send response
    // -----------------------------

    res.status(201).json({
      message: "Account created successfully",
      user,
      token
    });

  } catch (error) {

    console.error("Registration error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }
};


// =========================================
// LOGIN USER
// =========================================

const loginUser = async (req, res) => {
  try {

    const {
      username,
      password
    } = req.body;


    // -----------------------------
    // Check required fields
    // -----------------------------

    if (!username || !password) {
      return res.status(400).json({
        message: "User ID and password are required"
      });
    }


    // -----------------------------
    // Find user by User ID
    // -----------------------------

    const user = await User.findOne({
      username: username.trim()
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid User ID or password"
      });
    }


    // -----------------------------
    // Check password
    // -----------------------------

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid User ID or password"
      });
    }


    // -----------------------------
    // Generate token
    // -----------------------------

    const token = generateToken(user._id);


    // -----------------------------
    // Send response
    // -----------------------------

    res.status(200).json({
      message: "Login successful",
      user,
      token
    });

  } catch (error) {

    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }
};

const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        message: "User ID or email is required"
      });
    }

    const user = await User.findOne({
      $or: [
        { username: identifier.trim() },
        { email: identifier.trim().toLowerCase() }
      ]
    });

    // Don't reveal whether the account exists
    if (!user) {
      return res.status(200).json({
        message: "If an account exists with that User ID or email, a password reset link has been sent."
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store HASH of token in database
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save();

    // Send raw token only through email.
    // If sending fails, log it server-side but still return the generic
    // response, so the API never reveals whether an account exists.
    try {
  await sendResetEmail(user.email, resetToken);
} catch (emailError) {
  console.error("Failed to send reset email:", emailError.message);
}

    res.status(200).json({
      message: "If an account exists with that User ID or email, a password reset link has been sent."
    });

  } catch (error) {
    console.error("Forgot password error:", error);

    res.status(500).json({
      message: "Unable to process password reset request"
    });
  }
};
   
// =========================================
// RESET PASSWORD
// =========================================

const resetPassword = async (req, res) => {
  try {

    const {
      resetToken,
      newPassword
    } = req.body;

    // -----------------------------
    // Check required fields
    // -----------------------------

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        message: "Reset token and new password are required"
      });
    }

    // -----------------------------
    // Validate new password
    // -----------------------------

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        message: "Password must contain an uppercase letter"
      });
    }

    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({
        message: "Password must contain a lowercase letter"
      });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        message: "Password must contain a number"
      });
    }

    // -----------------------------
    // Find valid reset token
    // -----------------------------

    const hashedResetToken = crypto
  .createHash("sha256")
  .update(resetToken)
  .digest("hex");

const user = await User.findOne({
  resetPasswordToken: hashedResetToken,
  resetPasswordExpire: {
    $gt: Date.now()
  }
});

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token"
      });
    }

    // -----------------------------
    // Hash new password
    // -----------------------------

    user.password = await bcrypt.hash(
      newPassword,
      10
    );

    // -----------------------------
    // Clear reset token
    // -----------------------------

    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    // -----------------------------
    // Success
    // -----------------------------

    res.status(200).json({
      message: "Password reset successfully"
    });

  } catch (error) {

    console.error("Reset password error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword
};