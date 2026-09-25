/**
 * WebRTC Signaling and Real-Time Virtual Tour Service for HavenTo
 * Manages peer discovery, WebRTC SDP offer/answer relay, ICE candidates,
 * in-tour live chat, media status toggling, and tour reservation intents.
 */

const Home = require('../models/home');

const tourRooms = new Map(); // roomId -> { homeId, participants: Map(socketId -> userInfo), createdAt }

function initVirtualTourSignaling(io) {
  io.on('connection', (socket) => {
    console.log('🔌 Client connected for Virtual Tour:', socket.id);

    // Register user details for direct notifications
    socket.on('register-user', ({ userId, role, name }) => {
      socket.registeredUserId = userId ? String(userId) : null;
      socket.registeredRole = role;
      socket.registeredName = name;
      console.log(`👤 User registered on socket ${socket.id}: ${name} (${role}, id: ${userId})`);
    });

    // Join a Virtual Tour room
    socket.on('join-tour-room', async ({ roomId, homeId, user }) => {
      if (!roomId) return;

      socket.join(roomId);
      socket.roomId = roomId;
      socket.homeId = homeId || null;
      socket.user = user || { 
        name: 'Guest ' + socket.id.slice(0, 4), 
        role: 'guest',
        id: socket.id 
      };

      if (!tourRooms.has(roomId)) {
        tourRooms.set(roomId, {
          homeId: socket.homeId,
          participants: new Map(),
          createdAt: Date.now()
        });
      }

      const roomData = tourRooms.get(roomId);
      roomData.participants.set(socket.id, {
        socketId: socket.id,
        user: socket.user,
        joinedAt: Date.now(),
        audioEnabled: true,
        videoEnabled: true
      });

      console.log(`🏠 User ${socket.user.name} (${socket.user.role}) joined Virtual Tour Room: ${roomId} (Total: ${roomData.participants.size})`);

      // Send existing participants to the joining peer
      const existingParticipants = Array.from(roomData.participants.values())
        .filter(p => p.socketId !== socket.id);

      socket.emit('tour-room-joined', {
        roomId,
        homeId: roomData.homeId,
        participants: existingParticipants
      });

      // Notify others in the room
      socket.to(roomId).emit('tour-user-joined', {
        socketId: socket.id,
        user: socket.user
      });

      // AUTOMATED CONNECTION MECHANISM:
      // When a guest joins the room, immediately alert the property's host in real-time
      if (socket.user.role !== 'host' && (homeId || roomData.homeId)) {
        const targetHomeId = homeId || roomData.homeId;
        try {
          const home = await Home.findById(targetHomeId).populate('hostId', 'firstName lastName _id');
          if (home) {
            const hostId = home.hostId?._id ? home.hostId._id.toString() : (home.hostId ? home.hostId.toString() : null);
            const callAlert = {
              roomId,
              homeId: targetHomeId,
              houseName: home.houseName,
              houseImage: home.photos?.[0] || null,
              price: home.price,
              location: home.location,
              hostId,
              guestName: socket.user.name || 'A prospective tenant',
              guestSocketId: socket.id,
              timestamp: Date.now()
            };
            console.log(`📢 Broadcasting incoming-tour-call to host (${hostId || 'all'}) for property: ${home.houseName} [Room: ${roomId}]`);
            io.emit('incoming-tour-call', callAlert);
          }
        } catch (err) {
          console.warn('Could not query home for host notification:', err.message);
        }
      }

      // If a host joins, notify the room that the host has arrived
      if (socket.user.role === 'host') {
        io.in(roomId).emit('host-joined-tour', {
          hostName: socket.user.name,
          socketId: socket.id
        });
      }
    });

    // Manual Re-ringing handler when guest clicks "Ring Host Again"
    socket.on('request-host-join', async ({ roomId, homeId, guestName }) => {
      const targetHomeId = homeId || socket.homeId;
      const targetRoomId = roomId || socket.roomId;
      try {
        let houseName = 'HavenTo Property';
        let hostId = null;
        let houseImage = null;
        let price = null;
        let location = null;
        if (targetHomeId) {
          const home = await Home.findById(targetHomeId).populate('hostId', 'firstName lastName _id');
          if (home) {
            houseName = home.houseName;
            hostId = home.hostId?._id ? home.hostId._id.toString() : (home.hostId ? home.hostId.toString() : null);
            houseImage = home.photos?.[0] || null;
            price = home.price;
            location = home.location;
          }
        }
        console.log(`🔔 Re-ringing host for tour room ${targetRoomId}`);
        io.emit('incoming-tour-call', {
          roomId: targetRoomId,
          homeId: targetHomeId,
          houseName,
          houseImage,
          price,
          location,
          hostId,
          guestName: guestName || socket.user?.name || 'A prospective tenant',
          guestSocketId: socket.id,
          timestamp: Date.now()
        });
      } catch (err) {
        console.warn('Error in request-host-join:', err.message);
      }
    });

    // Relay WebRTC Offer
    socket.on('signal-offer', ({ to, offer }) => {
      io.to(to).emit('signal-offer', {
        from: socket.id,
        offer,
        user: socket.user
      });
    });

    // Relay WebRTC Answer
    socket.on('signal-answer', ({ to, answer }) => {
      io.to(to).emit('signal-answer', {
        from: socket.id,
        answer
      });
    });

    // Relay ICE Candidate
    socket.on('signal-ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('signal-ice-candidate', {
        from: socket.id,
        candidate
      });
    });

    // In-tour live chat
    socket.on('send-tour-chat-message', ({ roomId, message }) => {
      if (!roomId || !message) return;
      const chatItem = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        sender: socket.user?.name || 'Guest',
        senderId: socket.id,
        role: socket.user?.role || 'guest',
        message: message.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      io.in(roomId).emit('tour-chat-message', chatItem);
    });

    // In-call booking or reservation intent alert
    socket.on('tour-reserve-interest', ({ roomId, homeId }) => {
      if (!roomId) return;
      io.in(roomId).emit('tour-reserve-interest-alert', {
        sender: socket.user?.name || 'Guest',
        senderId: socket.id,
        homeId: homeId || socket.homeId,
        message: `${socket.user?.name || 'A prospective tenant'} is interested in reserving this property!`
      });
    });

    // Media toggle (Mute/Unmute audio or camera)
    socket.on('toggle-media-status', ({ roomId, type, enabled }) => {
      const roomData = tourRooms.get(roomId);
      if (roomData && roomData.participants.has(socket.id)) {
        const participant = roomData.participants.get(socket.id);
        if (type === 'audio') participant.audioEnabled = enabled;
        if (type === 'video') participant.videoEnabled = enabled;
      }
      socket.to(roomId).emit('peer-media-toggled', {
        socketId: socket.id,
        type,
        enabled
      });
    });

    // Screen sharing indicator
    socket.on('screen-sharing-status', ({ roomId, isSharing }) => {
      socket.to(roomId).emit('peer-screen-sharing', {
        socketId: socket.id,
        isSharing
      });
    });

    // Leave & Disconnect cleanup
    const handleLeave = () => {
      const roomId = socket.roomId;
      if (roomId && tourRooms.has(roomId)) {
        const roomData = tourRooms.get(roomId);
        roomData.participants.delete(socket.id);
        socket.to(roomId).emit('tour-user-left', {
          socketId: socket.id,
          userName: socket.user?.name || 'A participant'
        });

        if (roomData.participants.size === 0) {
          tourRooms.delete(roomId);
          console.log('🧹 Cleaned up empty Virtual Tour Room:', roomId);
        }
      }
    };

    socket.on('leave-tour-room', handleLeave);
    socket.on('disconnect', handleLeave);
  });
}

function getActiveTourRooms() {
  const active = [];
  for (const [roomId, data] of tourRooms.entries()) {
    active.push({
      roomId,
      homeId: data.homeId,
      participantCount: data.participants.size,
      participants: Array.from(data.participants.values()).map(p => ({
        name: p.user?.name,
        role: p.user?.role
      }))
    });
  }
  return active;
}

module.exports = {
  initVirtualTourSignaling,
  getActiveTourRooms
};
