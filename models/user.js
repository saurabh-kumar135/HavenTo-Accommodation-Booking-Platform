const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required']
  },
  lastName: String,
  email: {
    type: String,
    required: function() {
      
      return !this.phoneNumber;
    },
    unique: true,
    sparse: true 
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true 
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: function() {
      
      return this.authProvider === 'local';
    }
  },
  
  googleId: {
    type: String,
    unique: true,
    sparse: true 
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'phone'],
    default: 'local'
  },
  authMethod: {
    type: String,
    enum: ['email', 'phone', 'google'],
    default: 'email'
  },
  profilePicture: {
    type: String 
  },
  userType: {
    type: String,
    enum: ['guest', 'host'],
    default: 'guest'
  },
  favourites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Home'
  }],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationOTP: String,
  emailVerificationExpires: Date,
  pushToken: String,
  aadharNumber: String,
  aadhaarNumber: String,
  hostKyc: {
    isVerified: {
      type: Boolean,
      default: false
    },
    documentType: {
      type: String,
      enum: ['aadhaar', 'pan', null],
      default: null
    },
    documentNumber: String,
    aadharNumber: String,
    aadhaarNumber: String,
    maskedNumber: String,
    documentHash: String,
    fullNameAsOnDoc: String,
    status: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified'
    },
    verificationRef: String,
    verifiedAt: Date
  }
});

module.exports = mongoose.model('User', userSchema);
