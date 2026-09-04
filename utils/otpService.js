const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter using Gmail SMTP
const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'saurabhrajput.25072005@gmail.com',
      pass: (process.env.EMAIL_PASS || 'sheleprpeihikkwl').replace(/\s+/g, '')
    }
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp, firstName) => {
  const senderEmail = process.env.EMAIL_USER || 'saurabhrajput.25072005@gmail.com';
  const transporter = getTransporter();

  const mailOptions = {
    from: `"HavenTo" <${senderEmail}>`,
    to: email,
    subject: 'Complete your HavenTo registration - Verification Code',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a202c; margin: 0; padding: 20px; background-color: #f7fafc;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 28px; text-align: center; border-radius: 12px; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Welcome to HavenTo! 🏡</h1>
          </div>
          
          <p style="font-size: 16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
          <p style="font-size: 15px; color: #4a5568;">Thank you for joining HavenTo! Please use the 6-digit verification code below to complete your registration:</p>
          
          <div style="text-align: center; margin: 28px 0; padding: 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: 'Courier New', Courier, monospace;">${otp}</div>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">Valid for 10 minutes</p>
          </div>
          
          <p style="font-size: 14px; color: #718096;">If you didn't create an account with HavenTo, you can safely ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          
          <div style="text-align: center; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} HavenTo Inc. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (email, resetToken, firstName) => {
  const senderEmail = process.env.EMAIL_USER || 'saurabhrajput.25072005@gmail.com';
  const frontendUrl = process.env.FRONTEND_URL || 'https://havento.vercel.app';
  const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
  const transporter = getTransporter();
  
  const mailOptions = {
    from: `"HavenTo" <${senderEmail}>`,
    to: email,
    subject: 'Reset your HavenTo password',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a202c; margin: 0; padding: 20px; background-color: #f7fafc;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 28px; text-align: center; border-radius: 12px; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Password Reset 🔑</h1>
          </div>
          
          <p style="font-size: 16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
          <p style="font-size: 15px; color: #4a5568;">We received a request to reset your password for your HavenTo account.</p>
          
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">Reset My Password</a>
          </div>
          
          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">Or copy and paste this link into your browser:</p>
          <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; word-break: break-all; font-size: 12px; color: #475569;">
            <a href="${resetLink}" style="color: #4f46e5; text-decoration: none;">${resetLink}</a>
          </div>
          
          <p style="font-size: 13px; color: #e11d48; margin-top: 20px;"><strong>⏰ This link expires in 1 hour.</strong></p>
          <p style="font-size: 13px; color: #94a3b8;">If you didn't request this reset, you can safely ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          
          <div style="text-align: center; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} HavenTo Inc. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent successfully to ${email} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendPasswordResetEmail
};
