const nodemailer = require("nodemailer");

let transporter;
const getTransporter = () => {
  if (!transporter) {
    const { SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error("SMTP_USER and SMTP_PASS must be set in .env");
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
};

const sendResetEmail = async (email, resetToken) => {
  const { FRONTEND_URL, SMTP_USER } = process.env;

  if (!FRONTEND_URL) {
    throw new Error("FRONTEND_URL must be set in .env");
  }

  const resetUrl = `${FRONTEND_URL}/reset-password.html?token=${resetToken}`;

  const info = await getTransporter().sendMail({
    from: `"Collab Code Editor" <${SMTP_USER}>`,
    to: email,
    subject: "Reset Your Collab Code Editor Password",
    text: `We received a request to reset your Collab Code Editor password.\n\nOpen this link to choose a new password (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your Collab Code Editor password.</p>
        <p>Click the button below to create a new password:</p>
        <a href="${resetUrl}"
           style="display: inline-block; padding: 12px 20px; background: #2563eb;
                  color: white; text-decoration: none; border-radius: 6px;">
          Reset Password
        </a>
        <p style="margin-top: 20px;">
          This link will expire in <strong>15 minutes</strong>.
        </p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });

  console.log("Reset email sent:", info.messageId);
};

module.exports = { sendResetEmail };