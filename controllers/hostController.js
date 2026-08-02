const jwt = require('jsonwebtoken');
const Home = require("../models/home");
const User = require("../models/user");
const fs = require("fs");

async function resolveUser(req) {
  if (req.session?.user?._id) return req.session.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'havento_mobile_secret_key_2024');
      const user = await User.findById(decoded.userId);
      if (user) return user;
    } catch (e) { return null; }
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
  const { houseName, price, location, description } = req.body;
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

  const photos = req.files.map(file => file.path);

  const home = new Home({
    houseName,
    price,
    location,
    rating,
    photos, 
    description,
    hostId: user?._id,
  });
  home.save().then(() => {
    console.log("Home Saved successfully");
    res.status(201).json({
      success: true,
      message: "Home added successfully",
      home: home,
    });
  });
};

exports.postEditHome = (req, res, next) => {
  const { id, houseName, price, location, rating, description } =
    req.body;;
  Home.findById(id)
    .then((home) => {
      home.houseName = houseName;
      home.price = price;
      home.location = location;
      home.rating = rating;
      home.description = description;

      if (req.files && req.files.length > 0) {
        
        if (home.photos && home.photos.length > 0) {
          home.photos.forEach(photoPath => {
            fs.unlink(photoPath, (err) => {
              if (err) console.log(err);
            });
          });
        }
        
        home.photos = req.files.map(file => file.path);
      }

      return home.save();
    })
    .then(() => {
      res.json({
        success: true,
        message: "Home updated successfully",
      });
    })
    .catch((err) => {
      console.log("Error while updating home:", err);
      res.status(500).json({
        success: false,
        message: "Error updating home",
      });
    });
};

exports.postDeleteHome = (req, res, next) => {
  const homeId = req.params.homeId;
  console.log("Came to delete ", homeId);
  Home.findByIdAndDelete(homeId)
    .then(() => {
      res.json({
        success: true,
        message: "Home deleted successfully",
      });
    })
    .catch((error) => {
      console.log("Error while deleting ", error);
      res.status(500).json({
        success: false,
        message: "Error deleting home",
      });
    });
};
