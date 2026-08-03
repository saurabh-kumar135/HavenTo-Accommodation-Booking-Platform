const mongoose = require("mongoose");

const homeSchema = mongoose.Schema({
  houseName: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
  photos: [String],
  latitude: Number,
  longitude: Number,
  latitude: Number,
  longitude: Number, 
  description: String,
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

module.exports = mongoose.model("Home", homeSchema);
