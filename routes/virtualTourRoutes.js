const express = require('express');
const router = express.Router();
const { getActiveTourRooms } = require('../services/virtualTourSignaling');
const Home = require('../models/home');

// GET /api/virtual-tour/active - Returns all ongoing virtual tours
router.get('/active', (req, res) => {
  const rooms = getActiveTourRooms();
  res.json({
    success: true,
    count: rooms.length,
    rooms
  });
});

// GET /api/virtual-tour/config - Returns STUN servers for WebRTC peer connection
router.get('/config', (req, res) => {
  res.json({
    success: true,
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.relay.metered.ca:80' }
    ]
  });
});

// POST /api/virtual-tour/create - Generate a new virtual tour room for a listing
router.post('/create', async (req, res) => {
  try {
    const { homeId, title, hostName } = req.body;
    let homeData = null;

    if (homeId) {
      homeData = await Home.findById(homeId).catch(() => null);
    }

    const uniqueRoomId = 'tour_' + (homeId ? homeId.slice(-6) : Math.random().toString(36).substr(2, 6)) + '_' + Math.random().toString(36).substr(2, 4);

    res.json({
      success: true,
      roomId: uniqueRoomId,
      homeId: homeId || null,
      houseName: homeData ? homeData.houseName : (title || 'Property Walkthrough'),
      hostName: hostName || (homeData ? homeData.hostName : 'Host')
    });
  } catch (err) {
    console.error('Error creating virtual tour room:', err);
    res.status(500).json({ success: false, message: 'Could not create tour room' });
  }
});

module.exports = router;
