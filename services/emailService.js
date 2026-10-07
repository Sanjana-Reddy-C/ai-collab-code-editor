const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset Your Collab Code Editor Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Password Reset Request</h2>

        <p>We received a request to reset your Collab Code Editor password.</p>

        <p>Click the button below to create a new password:</p>

        <a href="${resetUrl}"
           style="
             display: inline-block;
             padding: 12px 20px;
             background: #2563eb;
             color: white;
             text-decoration: none;
             border-radius: 6px;
           ">
          Reset Password
        </a>

        <p style="margin-top: 20px;">
          This link will expire in <strong>15 minutes</strong>.
        </p>

        <p>If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `
  });
};

module.exports = { sendResetEmail };