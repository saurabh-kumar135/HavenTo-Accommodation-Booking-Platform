const { check, validationResult } = require("express-validator");
const jwt = require('jsonwebtoken');
const User = require("../models/user");
const bcrypt = require("bcryptjs");

exports.getLogin = (req, res, next) => {
  res.json({
    success: true,
    pageTitle: "Login",
    currentPage: "login",
    isLoggedIn: false,
  });
};

exports.getSignup = (req, res, next) => {
  res.json({
    success: true,
    pageTitle: "Signup",
    currentPage: "signup",
    isLoggedIn: false,
  });
};

async function resolveUser(req) {
  if (req.session?.user?._id) return req.session.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'havento_mobile_secret_key_2024');
      const user = await User.findById(decoded.userId);
      if (user) return user;
    } catch (e) { return null; }
  }
  return null;
}

exports.checkSession = async (req, res, next) => {
  const user = await resolveUser(req);
  if (user) {
    res.json({
      success: true,
      isLoggedIn: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
      },
    });
  } else {
    res.json({
      success: true,
      isLoggedIn: false,
      user: null,
    });
  }
};

exports.postSignup = [
  check("firstName")
  .trim()
  .isLength({min: 2})
  .withMessage("First Name should be atleast 2 characters long")
  .matches(/^[A-Za-z\s]+$/)
  .withMessage("First Name should contain only alphabets"),

  check("lastName")
  .matches(/^[A-Za-z\s]*$/)
  .withMessage("Last Name should contain only alphabets"),

  check("email")
  .isEmail()
  .withMessage("Please enter a valid email")
  .normalizeEmail(),

  check("password")
  .isLength({min: 8})
  .withMessage("Password should be atleast 8 characters long")
  .matches(/[A-Z]/)
  .withMessage("Password should contain atleast one uppercase letter")
  .matches(/[a-z]/)
  .withMessage("Password should contain atleast one lowercase letter")
  .matches(/[0-9]/)
  .withMessage("Password should contain atleast one number")
  .matches(/[!@&]/)
  .withMessage("Password should contain atleast one special character")
  .trim(),

  check("confirmPassword")
  .trim()
  .custom((value, {req}) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),

  check("userType")
  .notEmpty()
  .withMessage("Please select a user type")
  .isIn(['guest', 'host'])
  .withMessage("Invalid user type"),

  check("terms")
  .notEmpty()
  .withMessage("Please accept the terms and conditions")
  .custom((value, {req}) => {
    if (value !== "on") {
      throw new Error("Please accept the terms and conditions");
    }
    return true;
  }),
  
  (req, res, next) => {
    const {firstName, lastName, email, password, userType} = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        errors: errors.array().map(err => err.msg),
        oldInput: {firstName, lastName, email, userType},
      });
    }

    bcrypt.hash(password, 12)
    .then(hashedPassword => {
      const user = new User({firstName, lastName, email, password: hashedPassword, userType});
      return user.save();
    })
    .then(() => {
      res.status(201).json({
        success: true,
        message: "User created successfully",
      });
    }).catch(err => {
      return res.status(422).json({
        success: false,
        errors: [err.message],
        oldInput: {firstName, lastName, email, userType},
      });
    });
  }
]

exports.postLogin = async (req, res, next) => {
  const {email, password} = req.body;
  const user = await User.findOne({email});
  if (!user) {
    return res.status(422).json({
      success: false,
      errors: ["User does not exist"],
      oldInput: {email},
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(422).json({
      success: false,
      errors: ["Invalid Password"],
      oldInput: {email},
    });
  }

  req.session.isLoggedIn = true;
  req.session.user = user;
  await req.session.save();

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET || 'havento_mobile_secret_key_2024',
    { expiresIn: '30d' }
  );

  res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userType: user.userType,
    },
  });
}

exports.postLogout = (req, res, next) => {
  req.session.destroy(() => {
    res.json({
      success: true,
      message: "Logout successful",
    });
  })
}
