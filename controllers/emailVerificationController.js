const User = require('../models/user');
const bcrypt = require('bcryptjs');
const { generateOTP, sendOTPEmail } = require('../utils/otpService');
const { 
  storePendingVerification, 
  getPendingVerification, 
  removePendingVerification 
} = require('../utils/otpStorage');

exports.sendOTP = async (req, res) => {
  try {
    const { email, firstName, lastName, password, userType } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({
        success: false,
        errors: ['Email already registered']
      });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 5 * 60 * 1000; 

    const hashedPassword = await bcrypt.hash(password, 10);

    storePendingVerification(email, {
      firstName,
      lastName,
      password: hashedPassword,
      userType
    }, otp, otpExpires);

    const emailResult = await sendOTPEmail(email, otp, firstName);

    if (!emailResult.success) {
      
      removePendingVerification(email);
      return res.status(500).json({
        success: false,
        errors: ['Failed to send verification email. Please try again.']
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email!'
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      errors: ['An error occurred. Please try again.']
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const pendingData = getPendingVerification(email);

    if (!pendingData) {
      return res.status(400).json({
        success: false,
        errors: ['Verification session expired. Please sign up again.']
      });
    }

    if (Date.now() > pendingData.expiresAt) {
      removePendingVerification(email);
      return res.status(400).json({
        success: false,
        errors: ['Verification code expired. Please request a new one.']
      });
    }

    if (pendingData.otp !== otp) {
      return res.status(400).json({
        success: false,
        errors: ['Invalid verification code']
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.emailVerified) {
      removePendingVerification(email);
      return res.status(400).json({
        success: false,
        errors: ['Email already verified. Please login.']
      });
    }

    const newUser = new User({
      firstName: pendingData.firstName,
      lastName: pendingData.lastName,
      email: email,
      password: pendingData.password, 
      userType: pendingData.userType,
      emailVerified: true 
    });
    await newUser.save();

    removePendingVerification(email);

    req.session.isLoggedIn = true;
    const sessionUser = newUser.toObject ? newUser.toObject() : { ...newUser };
    delete sessionUser.password;
    req.session.user = sessionUser;

    res.json({
      success: true,
      message: 'Email verified successfully!',
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userType: newUser.userType
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      errors: ['An error occurred. Please try again.']
    });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const pendingData = getPendingVerification(email);

    if (!pendingData) {
      return res.status(400).json({
        success: false,
        errors: ['Verification session expired. Please sign up again.']
      });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 5 * 60 * 1000; 

    storePendingVerification(email, {
      firstName: pendingData.firstName,
      lastName: pendingData.lastName,
      password: pendingData.password,
      userType: pendingData.userType
    }, otp, otpExpires);

    const emailResult = await sendOTPEmail(email, otp, pendingData.firstName);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        errors: ['Failed to send verification email. Please try again.']
      });
    }

    res.json({
      success: true,
      message: 'New verification code sent to your email!'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      errors: ['An error occurred. Please try again.']
    });
  }
};
