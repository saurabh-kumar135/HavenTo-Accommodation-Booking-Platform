const jwt = require('jsonwebtoken');
const Home = require("../models/home");
const User = require("../models/user");
const Booking = require("../models/booking");
const { sendPushNotification } = require("../utils/pushNotifications");

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
  const { homeId, checkIn, checkOut, guests } = req.body;
  if (!homeId) {
    return res.status(422).json({ success: false, message: "homeId is required" });
  }
  try {
    const home = await Home.findById(homeId);
    if (!home) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    let calculatedTotalPrice = home.price;
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (checkOutDate <= checkInDate) {
        return res.status(422).json({ success: false, message: "Check-out date must be after check-in date" });
      }

      // Check if property is already booked for these dates (only active confirmed bookings)
      const conflictingBooking = await Booking.findOne({
        home: homeId,
        status: 'confirmed',
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
      });

      if (conflictingBooking) {
        return res.status(409).json({
          success: false,
          message: "This property is already booked for the selected dates. Please choose different dates.",
        });
      }

      const diffTime = Math.abs(checkOutDate - checkInDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      calculatedTotalPrice = diffDays * home.price;
    }

    const booking = await Booking.create({
      user: user._id,
      home: homeId,
      status: 'confirmed',
      checkIn: checkIn ? new Date(checkIn) : undefined,
      checkOut: checkOut ? new Date(checkOut) : undefined,
      guests: Number(guests) || 1,
      totalPrice: calculatedTotalPrice,
    });

    // Push notifications — best-effort, never blocks the booking response
    (async () => {
      try {
        const [freshGuest, host] = await Promise.all([
          User.findById(user._id),
          home.hostId ? User.findById(home.hostId) : null,
        ]);
        if (freshGuest?.pushToken) {
          await sendPushNotification(
            freshGuest.pushToken,
            "Booking Confirmed",
            `Your booking for ${home.houseName} is confirmed.`,
            { bookingId: booking._id.toString() }
          );
        }
        if (host?.pushToken) {
          await sendPushNotification(
            host.pushToken,
            "New Booking",
            `${freshGuest?.firstName || 'A guest'} booked ${home.houseName}.`,
            { bookingId: booking._id.toString() }
          );
        }
      } catch (pushErr) {
        console.error('Push notification error (non-fatal):', pushErr);
      }
    })();

    res.status(201).json({
      success: true,
      message: "Booking confirmed",
      booking: booking,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not create booking", error: err.message });
  }
};

exports.cancelBooking = async (req, res, next) => {
  const user = await resolveUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Please login to cancel a booking" });
  }

  const { bookingId } = req.params;
  const { reason, reasonDetails } = req.body;

  try {
    const booking = await Booking.findOne({ _id: bookingId, user: user._id }).populate('home');
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found or you do not have permission to cancel it." });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: "This booking has already been cancelled." });
    }

    // 1. Mandatory Solid Reason validation
    const validReasons = [
      "Change of travel plans",
      "Found alternative accommodation",
      "Medical or personal emergency",
      "Accidental / duplicate booking",
      "Host requested cancellation",
      "Other solid reason",
    ];

    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: "A valid reason category is required to cancel your reservation.",
      });
    }

    const trimmedDetails = (reasonDetails || "").trim();
    if (!trimmedDetails || trimmedDetails.length < 15) {
      return res.status(400).json({
        success: false,
        message: "Please provide a solid reason and detailed explanation (minimum 15 characters). Otherwise, booking cannot be cancelled.",
      });
    }

    // 2. Strict Time Limit Policy:
    // Cancellations permitted only up to 24 hours prior to check-in date (or within 24 hours of booking if no check-in date)
    const now = new Date();
    const CANCELLATION_WINDOW_HOURS = 24;

    if (booking.checkIn) {
      const checkInTime = new Date(booking.checkIn).getTime();
      const cutoffTime = checkInTime - (CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000);
      
      if (now.getTime() > cutoffTime) {
        return res.status(400).json({
          success: false,
          message: "Cancellation deadline has passed. In accordance with HavenTo policy, reservations cannot be cancelled within 24 hours of the check-in date or once the stay has commenced.",
        });
      }
    } else if (booking.createdAt) {
      const createdTime = new Date(booking.createdAt).getTime();
      const cutoffTime = createdTime + (CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000);
      if (now.getTime() > cutoffTime) {
        return res.status(400).json({
          success: false,
          message: "Cancellation window closed. Bookings without explicit dates can only be cancelled within 24 hours of creation.",
        });
      }
    }

    // Perform cancellation
    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancellationDetails = trimmedDetails;
    booking.cancelledAt = now;
    await booking.save();

    // Push notifications (best effort)
    (async () => {
      try {
        const [freshGuest, host] = await Promise.all([
          User.findById(user._id),
          booking.home?.hostId ? User.findById(booking.home.hostId) : null,
        ]);

        if (freshGuest?.pushToken) {
          await sendPushNotification(
            freshGuest.pushToken,
            "Booking Cancelled",
            `Your booking for ${booking.home?.houseName || 'the property'} has been cancelled.`,
            { bookingId: booking._id.toString() }
          );
        }

        if (host?.pushToken) {
          await sendPushNotification(
            host.pushToken,
            "Booking Cancelled by Guest",
            `${freshGuest?.firstName || 'A guest'} cancelled their booking for ${booking.home?.houseName || 'your property'}. Reason: ${reason}.`,
            { bookingId: booking._id.toString() }
          );
        }
      } catch (pushErr) {
        console.error("Push notification error during cancellation (non-fatal):", pushErr);
      }
    })();

    res.json({
      success: true,
      message: "Booking cancelled successfully. The dates have been released for other guests.",
      booking,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not cancel booking", error: err.message });
  }
};

exports.deleteBooking = async (req, res, next) => {
  const user = await resolveUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Please login to manage bookings" });
  }

  const { bookingId } = req.params;

  try {
    const booking = await Booking.findOne({ _id: bookingId, user: user._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    await Booking.findByIdAndDelete(bookingId);

    res.json({
      success: true,
      message: "Booking removed completely from your list.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not remove booking", error: err.message });
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
