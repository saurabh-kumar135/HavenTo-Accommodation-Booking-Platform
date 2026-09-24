const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');
const Home = require("../models/home");
const Booking = require("../models/booking");
const User = require("../models/user");
const fs = require("fs");
const kycService = require("../services/kycService");

async function resolveUser(req) {
  let userId = req.session?.user?._id;
  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'havento_mobile_secret_key_2024');
        userId = decoded.userId;
      } catch (e) { return null; }
    }
  }
  if (userId) {
    try {
      return await User.findById(userId).select('-password');
    } catch (err) {
      return null;
    }
  }
  return null;
}

exports.getAddHome = (req, res, next) => {
  res.json({
    success: true,
    pageTitle: "Add Home to airbnb",
    currentPage: "addHome",
    editing: false,
    isLoggedIn: req.isLoggedIn,
    user: req.session.user,
  });
};

exports.getEditHome = (req, res, next) => {
  const homeId = req.params.homeId;
  const editing = req.query.editing === "true";

  Home.findById(homeId).then((home) => {
    if (!home) {
      console.log("Home not found for editing.");
      return res.status(404).json({
        success: false,
        message: "Home not found",
      });
    }

    console.log(homeId, editing, home);
    res.json({
      success: true,
      home: home,
      pageTitle: "Edit your Home",
      currentPage: "host-homes",
      editing: editing,
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  });
};

exports.getHostHomes = async (req, res, next) => {
  const user = await resolveUser(req);
  const filter = user ? { hostId: user._id } : {};
  Home.find(filter).then((registeredHomes) => {
    res.json({
      success: true,
      registeredHomes: registeredHomes,
      pageTitle: "Host Homes List",
      currentPage: "host-homes",
      isLoggedIn: !!user,
      user: user,
    });
  });
};

exports.postAddHome = async (req, res, next) => {
  const user = await resolveUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Please log in to add a home.",
    });
  }

  if (!user.hostKyc?.isVerified) {
    return res.status(403).json({
      success: false,
      requireKyc: true,
      message: "Host identity verification required. Please verify your Aadhaar or PAN card before listing a property.",
    });
  }

  const { houseName, price, location, description, latitude, longitude } = req.body;
  const rating = req.body.rating || 0;
  console.log('postAddHome req.body:', req.body);
  console.log('postAddHome req.files:', req.files); 

  if (!req.files || req.files.length === 0) {
    return res.status(422).json({
      success: false,
      message: "No images provided",
      debug: {
        contentType: req.headers['content-type'],
        bodyKeys: Object.keys(req.body || {}),
        filesReceived: req.files,
      },
    });
  }

  try {
    const gfsBucket = req.app.locals.gfsBucket;
    if (!gfsBucket) {
      return res.status(500).json({ success: false, message: "Storage not ready, try again shortly." });
    }

    const uploadOne = (file) => new Promise((resolve, reject) => {
      const uploadStream = gfsBucket.openUploadStream(file.originalname, {
        contentType: file.mimetype,
      });
      uploadStream.end(file.buffer);
      uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
      uploadStream.on('error', reject);
    });

    const photos = await Promise.all(req.files.map(uploadOne));

    const home = new Home({
      houseName,
      price,
      location,
      rating,
      photos,
      description,
      latitude,
      longitude,
      hostId: user?._id,
    });
    await home.save();
    console.log("Home Saved successfully with GridFS photo IDs:", photos);
    res.status(201).json({
      success: true,
      message: "Home added successfully",
      home: home,
    });
  } catch (err) {
    console.error("GridFS upload error:", err);
    res.status(500).json({ success: false, message: "Failed to upload images.", error: err.message });
  }
};

exports.postEditHome = async (req, res, next) => {
  const { id, houseName, price, location, description } = req.body;

  try {
    const home = await Home.findById(id);
    if (!home) {
      return res.status(404).json({ success: false, message: "Home not found" });
    }

    home.houseName = houseName;
    home.price = price;
    home.location = location;
    home.rating = req.body.rating || home.rating || 0;
    home.description = description;
    if (req.body.latitude != null && req.body.latitude !== "") home.latitude = req.body.latitude;
    if (req.body.longitude != null && req.body.longitude !== "") home.longitude = req.body.longitude;

    if (req.files && req.files.length > 0) {
      const gfsBucket = req.app.locals.gfsBucket;
      if (!gfsBucket) {
        return res.status(500).json({ success: false, message: "Storage not ready, try again shortly." });
      }

      // Remove old photos. New-style homes store GridFS ObjectId strings (24 hex
      // chars); a couple of legacy homes still have old disk paths — handle both.
      if (home.photos && home.photos.length > 0) {
        for (const photoRef of home.photos) {
          if (/^[0-9a-fA-F]{24}$/.test(photoRef)) {
            try {
              await gfsBucket.delete(new mongoose.Types.ObjectId(photoRef));
            } catch (err) {
              console.log("GridFS delete error (non-fatal):", err.message);
            }
          } else {
            fs.unlink(photoRef, (err) => {
              if (err) console.log("Legacy disk unlink error (non-fatal):", err.message);
            });
          }
        }
      }

      // Same GridFS upload pattern as postAddHome.
      const uploadOne = (file) => new Promise((resolve, reject) => {
        const uploadStream = gfsBucket.openUploadStream(file.originalname, {
          contentType: file.mimetype,
        });
        uploadStream.end(file.buffer);
        uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
        uploadStream.on('error', reject);
      });

      home.photos = await Promise.all(req.files.map(uploadOne));
    }

    await home.save();
    res.json({
      success: true,
      message: "Home updated successfully",
    });
  } catch (err) {
    console.log("Error while updating home:", err);
    res.status(500).json({
      success: false,
      message: "Error updating home",
    });
  }
};

exports.postDeleteHome = async (req, res, next) => {
  const homeId = req.params.homeId;
  console.log("Came to delete ", homeId);

  try {
    const home = await Home.findById(homeId);
    if (!home) {
      return res.status(404).json({ success: false, message: "Home not found" });
    }

    // Clean up GridFS photo files so deleting a property doesn't leak storage.
    const gfsBucket = req.app.locals.gfsBucket;
    if (gfsBucket && home.photos && home.photos.length > 0) {
      for (const photoRef of home.photos) {
        if (/^[0-9a-fA-F]{24}$/.test(photoRef)) {
          try {
            await gfsBucket.delete(new mongoose.Types.ObjectId(photoRef));
          } catch (err) {
            console.log("GridFS delete error during home delete (non-fatal):", err.message);
          }
        }
        // Legacy disk-path photos on old homes are left alone, same as before --
        // nothing to clean up there that matters.
      }
    }

    await Home.findByIdAndDelete(homeId);
    res.json({
      success: true,
      message: "Home deleted successfully",
    });
  } catch (error) {
    console.log("Error while deleting ", error);
    res.status(500).json({
      success: false,
      message: "Error deleting home",
    });
  }
};

/**
 * KYC Verification Endpoints
 */
exports.postVerifyKyc = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to verify host identity.",
      });
    }

    const { documentType, documentNumber, fullName } = req.body;
    if (!documentType || !documentNumber || !fullName) {
      return res.status(422).json({
        success: false,
        message: "Document type, document number, and full legal name are required.",
      });
    }

    const verification = await kycService.verifyHostIdentity({
      documentType,
      documentNumber,
      fullName,
    });

    if (!verification.success) {
      return res.status(422).json({
        success: false,
        message: verification.error || "Verification failed.",
      });
    }

    if (verification.documentType === 'aadhaar') {
      user.aadharNumber = verification.documentNumber;
      user.aadhaarNumber = verification.documentNumber;
    }
    user.hostKyc = {
      isVerified: true,
      documentType: verification.documentType,
      documentNumber: verification.documentNumber,
      aadharNumber: verification.documentNumber,
      aadhaarNumber: verification.documentNumber,
      maskedNumber: verification.maskedNumber,
      documentHash: verification.documentHash,
      fullNameAsOnDoc: verification.fullNameAsOnDoc,
      status: 'verified',
      verificationRef: verification.verificationRef,
      verifiedAt: verification.verifiedAt,
    };
    user.userType = 'host';
    await user.save();

    if (req.session?.user) {
      req.session.user.hostKyc = user.hostKyc;
      req.session.user.userType = user.userType;
      await req.session.save();
    }

    return res.status(200).json({
      success: true,
      message: `${verification.documentType.toUpperCase()} verified successfully! You are now a Verified Host on HavenTo.`,
      hostKyc: user.hostKyc,
      userType: user.userType,
    });
  } catch (err) {
    console.error("KYC verification error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during KYC verification.",
      error: err.message,
    });
  }
};

exports.getKycStatus = async (req, res, next) => {
  const user = await resolveUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }
  return res.status(200).json({
    success: true,
    hostKyc: user.hostKyc || { isVerified: false, status: 'unverified' },
    userType: user.userType,
  });
};

exports.getHostWealthAnalytics = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    
    let hostHomes = [];
    if (user && user._id) {
      hostHomes = await Home.find({ hostId: user._id }).lean();
    }
    
    const isDemoPortfolio = hostHomes.length === 0;
    const targetHomes = isDemoPortfolio ? await Home.find().limit(6).lean() : hostHomes;
    const targetHomeIds = targetHomes.map(h => h._id.toString());
    
    const allBookings = await Booking.find()
      .populate('user', 'firstName lastName email name')
      .populate('home', 'houseName location price photoUrl')
      .sort({ createdAt: -1 })
      .lean();
    
    const relevantBookings = allBookings.filter(b => {
      if (!b.home) return false;
      const homeId = (b.home._id || b.home).toString();
      return targetHomeIds.includes(homeId);
    });
    
    const confirmedBookings = relevantBookings.filter(b => b.status === 'confirmed');
    
    let totalGrossRevenue = 0;
    let totalNightsBooked = 0;
    
    const enrichedBookings = confirmedBookings.map(b => {
      let nights = 2;
      if (b.checkIn && b.checkOut) {
        const diffTime = Math.abs(new Date(b.checkOut) - new Date(b.checkIn));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) nights = diffDays;
      }
      
      const nightlyPrice = (b.home && b.home.price) ? Number(b.home.price) : 5000;
      const bookingTotal = Number(b.totalPrice) > 0 ? Number(b.totalPrice) : (nightlyPrice * nights);
      
      totalGrossRevenue += bookingTotal;
      totalNightsBooked += nights;
      
      return {
        ...b,
        nightsCalculated: nights,
        computedPrice: bookingTotal,
        guestDisplayName: (b.user && (b.user.name || (b.user.firstName ? (b.user.firstName + ' ' + (b.user.lastName || '')) : b.user.email))) || 'Verified Guest',
      };
    });
    
    const platformFeePercent = 3;
    const netPayout = Math.round(totalGrossRevenue * (1 - platformFeePercent / 100));
    const avgStayDuration = enrichedBookings.length > 0 ? Math.round((totalNightsBooked / enrichedBookings.length) * 10) / 10 : 2.0;
    const avgBookingValue = enrichedBookings.length > 0 ? Math.round(totalGrossRevenue / enrichedBookings.length) : 0;
    
    const homesBreakdown = targetHomes.map(h => {
      const hBookings = enrichedBookings.filter(b => {
        const hId = (b.home && (b.home._id || b.home)) ? (b.home._id || b.home).toString() : '';
        return hId === h._id.toString();
      });
      
      const hRevenue = hBookings.reduce((sum, b) => sum + (b.computedPrice || 0), 0);
      const hNights = hBookings.reduce((sum, b) => sum + (b.nightsCalculated || 2), 0);
      
      return {
        homeId: h._id,
        houseName: h.houseName || 'Cozy Haven',
        location: h.location || 'India',
        nightlyPrice: Number(h.price) || 0,
        photoUrl: h.photoUrl || '',
        bookingsCount: hBookings.length,
        nightsBooked: hNights,
        grossRevenue: hRevenue,
        netEarnings: Math.round(hRevenue * (1 - platformFeePercent / 100)),
      };
    });
    
    const mohanBenchmark = {
      scenarioName: "Mohan's 10-Guest 2-Night Model",
      description: "10 guests booking for 2 nights each at the host's flagship property rate.",
      sampleGuests: 10,
      sampleNights: 2,
      sampleNightlyRate: targetHomes[0] ? Number(targetHomes[0].price) || 8000 : 8000,
      projectedGross: 10 * 2 * (targetHomes[0] ? Number(targetHomes[0].price) || 8000 : 8000),
      projectedNet: Math.round(10 * 2 * (targetHomes[0] ? Number(targetHomes[0].price) || 8000 : 8000) * 0.97)
    };
    
    return res.status(200).json({
      success: true,
      isDemoPortfolio: isDemoPortfolio,
      hostName: (user && (user.name || user.firstName || user.email)) || 'Mohan (Host)',
      currency: 'INR',
      currencySymbol: '₹',
      summary: {
        totalListings: targetHomes.length,
        totalBookings: enrichedBookings.length,
        totalNightsBooked: totalNightsBooked,
        avgStayDuration: avgStayDuration,
        totalGrossRevenue: totalGrossRevenue,
        netPayout: netPayout,
        platformFeePercent: platformFeePercent,
        avgBookingValue: avgBookingValue,
      },
      homesBreakdown: homesBreakdown,
      recentBookings: enrichedBookings.slice(0, 10),
      mohanBenchmark: mohanBenchmark,
    });
  } catch (error) {
    console.error('Error in getHostWealthAnalytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate host wealth metrics',
      error: error.message,
    });
  }
};

