const jwt = require('jsonwebtoken');
const Home = require("../models/home");
const User = require("../models/user");
const Booking = require("../models/booking");

async function resolveUser(req) {
  if (req.session?.user?._id) return req.session.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'havento_mobile_secret_key_2024');
      const user = await User.findById(decoded.userId).select('-password');
      if (user) return user;
    } catch (e) { return null; }
  }
  return null;
}

exports.getIndex = (req, res, next) => {
  console.log("Session Value: ", req.session);
  Home.find().then((registeredHomes) => {
    res.json({
      success: true,
      registeredHomes: registeredHomes,
      pageTitle: "airbnb Home",
      currentPage: "index",
      isLoggedIn: req.isLoggedIn, 
      user: req.session.user,
    });
  });
};

exports.getHomes = (req, res, next) => {
  Home.find().then((registeredHomes) => {
    res.json({
      success: true,
      registeredHomes: registeredHomes,
      pageTitle: "Homes List",
      currentPage: "Home",
      isLoggedIn: req.isLoggedIn, 
      user: req.session.user,
    });
  });
};

exports.getBookings = async (req, res, next) => {
  const user = await resolveUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Please login to view bookings" });
  }
  try {
    const bookings = await Booking.find({ user: user._id }).populate('home').sort({ createdAt: -1 });
    res.json({
      success: true,
      bookings: bookings,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not fetch bookings", error: err.message });
  }
};

exports.postBooking = async (req, res, next) => {
  const user = await resolveUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Please login to book a property" });
  }
  const { homeId } = req.body;
  if (!homeId) {
    return res.status(422).json({ success: false, message: "homeId is required" });
  }
  try {
    const home = await Home.findById(homeId);
    if (!home) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    const booking = await Booking.create({
      user: user._id,
      home: homeId,
      status: 'confirmed',
    });
    res.status(201).json({
      success: true,
      message: "Booking confirmed",
      booking: booking,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not create booking", error: err.message });
  }
};

exports.getFavouriteList = async (req, res, next) => {
  try {
    const authedUser = await resolveUser(req);
    if (!authedUser) {
      return res.status(401).json({
        success: false,
        message: "Please login to view favorites"
      });
    }

    const userId = authedUser._id;
    const user = await User.findById(userId).populate('favourites');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    res.json({
      success: true,
      favouriteHomes: user.favourites || [],
      pageTitle: "My Favourites",
      currentPage: "favourites",
      isLoggedIn: req.isLoggedIn, 
      user: req.session.user,
    });
  } catch (error) {
    console.error('Get favourites error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to load favourites"
    });
  }
};

exports.postAddToFavourite = async (req, res, next) => {
  try {
    const authedUser = await resolveUser(req);
    if (!authedUser) {
      return res.status(401).json({
        success: false,
        message: "Please login to add favorites"
      });
    }

    const homeId = req.body.id;
    const userId = authedUser._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    if (!user.favourites.includes(homeId)) {
      user.favourites.push(homeId);
      await user.save();
    }
    
    res.json({
      success: true,
      message: "Added to favourites",
    });
  } catch (error) {
    console.error('Add to favourites error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to add to favourites"
    });
  }
};

exports.postRemoveFromFavourite = async (req, res, next) => {
  try {
    const authedUser = await resolveUser(req);
    if (!authedUser) {
      return res.status(401).json({
        success: false,
        message: "Please login to remove favorites"
      });
    }

    const homeId = req.params.homeId;
    const userId = authedUser._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    if (user.favourites.includes(homeId)) {
      user.favourites = user.favourites.filter(fav => fav != homeId);
      await user.save();
    }
    
    res.json({
      success: true,
      message: "Removed from favourites",
    });
  } catch (error) {
    console.error('Remove from favourites error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to remove from favourites"
    });
  }
};

exports.getHomeDetails = (req, res, next) => {
  const homeId = req.params.homeId;
  Home.findById(homeId).then((home) => {
    if (!home) {
      console.log("Home not found");
      res.status(404).json({
        success: false,
        message: "Home not found",
      });
    } else {
      res.json({
        success: true,
        home: home,
        pageTitle: "Home Detail",
        currentPage: "Home",
        isLoggedIn: req.isLoggedIn, 
        user: req.session.user,
      });
    }
  });
};
