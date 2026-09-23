const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');
const Home = require("../models/home");
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
