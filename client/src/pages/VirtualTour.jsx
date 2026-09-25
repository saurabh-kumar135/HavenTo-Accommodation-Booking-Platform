import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, 
  PhoneOff, MessageSquare, Copy, Check, Users, Home, 
  Send, X, Sparkles, MapPin, Star, ShieldCheck, Share2,
  PhoneCall, Bell, Radio, ArrowRight, Play
} from 'lucide-react';
import { getHomeDetails, getTourConfig, getActiveTourRooms } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getImageUrl, API_URL, TOUR_API_URL } from '../config/api';

export default function VirtualTour() {
  const { roomId: routeRoomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn } = useAuth();

  // Search parameters for homeId if provided as query param
  const queryParams = new URLSearchParams(location.search);
  const homeIdFromQuery = queryParams.get('homeId');

  // Deterministic room & home extraction
  const effectiveHomeId = homeIdFromQuery || location.state?.homeId || (routeRoomId?.startsWith('property_') ? routeRoomId.replace('property_', '') : '');
  const effectiveRoomId = routeRoomId || (effectiveHomeId ? `property_${effectiveHomeId}` : 'haven_demo_tour');

  // Tour & Home Metadata
  const [roomId, setRoomId] = useState(effectiveRoomId);
  const [homeId, setHomeId] = useState(effectiveHomeId);
  const [homeData, setHomeData] = useState(location.state?.home || null);
  const [inCall, setInCall] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('guest'); // 'guest' | 'host'
  const [copied, setCopied] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [interestAlert, setInterestAlert] = useState(null);
  const [reRingSent, setReRingSent] = useState(false);
  const [hostJoinedNotification, setHostJoinedNotification] = useState(null);

  // Active rooms discovery from server
  const [activeRooms, setActiveRooms] = useState([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Media Controls
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteUserName, setRemoteUserName] = useState('Property Host');

  // In-Tour Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Refs for WebRTC & Audio/Video
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const chatBottomRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  const iceServersRef = useRef([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' }
  ]);

  // Load User Details & Active Room Discovery
  useEffect(() => {
    if (user) {
      setUserName(user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0] || 'Guest');
      if (user.userType === 'host') {
        setUserRole('host');
        setRemoteUserName('Prospective Tenant');
      }
    } else {
      setUserName('Visitor_' + Math.floor(1000 + Math.random() * 9000));
    }

    if (homeId && !homeData) {
      getHomeDetails(homeId)
        .then(res => {
          if (res.data.success) {
            setHomeData(res.data.home);
            const currentUserId = user?._id || user?.id;
            const propertyHostId = res.data.home.hostId?._id || res.data.home.hostId;
            if (currentUserId && String(currentUserId) === String(propertyHostId)) {
              setUserRole('host');
              setRemoteUserName('Prospective Tenant');
            }
          }
        })
        .catch(err => console.warn('Could not load property details:', err));
    }

    // Fetch STUN server configuration
    getTourConfig()
      .then(res => {
        if (res.data.success && res.data.iceServers) {
          iceServersRef.current = res.data.iceServers;
        }
      })
      .catch(() => {});

    // Polling active tour rooms every 3 seconds for 1-click room joining
    const fetchRooms = async () => {
      try {
        const res = await getActiveTourRooms();
        if (res.data && res.data.success) {
          setActiveRooms(res.data.rooms || []);
        }
      } catch (err) {
        // silent fail on network retry
      }
    };
    fetchRooms();
    const roomsInterval = setInterval(fetchRooms, 3500);

    return () => clearInterval(roomsInterval);
  }, [user, homeId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  // Ensure local & remote streams attach and play properly
  useEffect(() => {
    if (inCall && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(e => console.log('Local video play warning:', e));
    }
    if (inCall && remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(e => console.log('Remote video play warning:', e));
    }
  }, [inCall, remoteConnected]);

  // Process queued ICE candidates
  const processQueuedCandidates = async (pc) => {
    if (!pc || !pc.remoteDescription) return;
    while (iceCandidatesQueueRef.current.length > 0) {
      const cand = iceCandidatesQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('Error adding queued ICE candidate:', err);
      }
    }
  };

  // Resilient Media Stream acquisition with camera/mic timeouts and animated canvas fallback
  const getMediaStream = async () => {
    const audioConfig = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia not supported in this browser environment');
      return generateSyntheticStream();
    }

    try {
      // 1. Primary: Try ideal HD video with audio
      return await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: audioConfig
      });
    } catch (err1) {
      console.warn('Ideal constraints failed, trying basic video and audio:', err1.name);
      try {
        // 2. Secondary: Basic video and audio (standard for mobile browsers)
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true
        });
      } catch (err2) {
        console.warn('Basic constraints failed, trying standard video:', err2.name);
        try {
          // 3. Simple video and audio
          return await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
        } catch (err3) {
          try {
            // 4. Video only
            return await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          } catch (err4) {
            console.warn('Physical camera unavailable or permission denied. Generating synthetic stream:', err4.name);
            return generateSyntheticStream();
          }
        }
      }
    }
  };

  // Helper for synthetic animated fallback stream when device camera is denied or hardware-locked
  const generateSyntheticStream = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    const draw = () => {
      frame++;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HavenTo Live Tour', 320, 200);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px sans-serif';
      ctx.fillText(userName || (userRole === 'host' ? 'Property Host' : 'Prospective Tenant'), 320, 240);
      ctx.beginPath();
      ctx.arc(320, 310, 36 + Math.sin(frame * 0.05) * 6, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      requestAnimationFrame(draw);
    };
    draw();
    const canvasStream = canvas.captureStream(30);

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const dst = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = 0;
      gain.connect(dst);
      const silentAudioTrack = dst.stream.getAudioTracks()[0];
      if (silentAudioTrack) {
        silentAudioTrack.enabled = false;
        canvasStream.addTrack(silentAudioTrack);
      }
    } catch (audioErr) {
      console.warn('Silent audio creation skipped:', audioErr);
    }
    return canvasStream;
  };

  // Join the Tour Room
  const handleJoinTour = async (customRoomId) => {
    const finalRoomId = (customRoomId || roomId || '').trim() || 'haven_demo_tour';
    setRoomId(finalRoomId);

    // Keep URL in sync so address bar matches the live room
    try {
      window.history.replaceState(null, '', `/tour/${finalRoomId}` + (homeId ? `?homeId=${homeId}` : ''));
    } catch (e) {}

    const stream = await getMediaStream();
    localStreamRef.current = stream;
    setInCall(true);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(e => console.log('Local stream play error:', e));
    }

    // Initialize Socket.io connection to the active production backend
    const socket = io(TOUR_API_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to HavenTo Virtual Tour signaling server:', socket.id);
      socket.emit('join-tour-room', {
        roomId: finalRoomId,
        homeId,
        user: {
          name: userName,
          role: userRole
        }
      });
    });

    // When joining an existing room with participants
    socket.on('tour-room-joined', async ({ participants }) => {
      console.log('Room joined, existing peers:', participants);
      if (participants && participants.length > 0) {
        const peer = participants[0]; // 1-on-1 virtual walkthrough
        setRemoteUserName(peer.user?.name || (userRole === 'host' ? 'Prospective Tenant' : 'Property Host'));
        // As the newly joined participant, initiate the WebRTC offer
        initiatePeerConnection(peer.socketId, true);
      }
    });

    // When another peer joins while we are already in the room
    socket.on('tour-user-joined', async ({ socketId, user: joiningUser }) => {
      console.log('Peer joined room:', joiningUser);
      setRemoteUserName(joiningUser?.name || (userRole === 'host' ? 'Prospective Tenant' : 'Property Host'));
      // Prepare peer connection to receive incoming offer with local tracks attached
      initiatePeerConnection(socketId, false);
    });

    // When the host enters the room
    socket.on('host-joined-tour', ({ hostName }) => {
      setHostJoinedNotification(`${hostName || 'Property Host'} has entered the tour!`);
      setRemoteUserName(hostName || 'Property Host');
      setTimeout(() => setHostJoinedNotification(null), 6000);
    });

    // Handle incoming WebRTC Offer
    socket.on('signal-offer', async ({ from, offer, user: caller }) => {
      console.log('Received WebRTC Offer from:', from);
      if (caller?.name) setRemoteUserName(caller.name);
      const pc = peerConnectionRef.current || initiatePeerConnection(from, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await processQueuedCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('signal-answer', {
          to: from,
          answer
        });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    });

    // Handle incoming WebRTC Answer
    socket.on('signal-answer', async ({ answer }) => {
      console.log('Received WebRTC Answer');
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await processQueuedCandidates(peerConnectionRef.current);
        } catch (err) {
          console.error('Error handling WebRTC answer:', err);
        }
      }
    });

    // Handle incoming ICE Candidate
    socket.on('signal-ice-candidate', async ({ candidate }) => {
      if (!candidate) return;
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Error adding ICE candidate directly:', e);
        }
      } else {
        iceCandidatesQueueRef.current.push(candidate);
      }
    });

    // Chat messages
    socket.on('tour-chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
      if (!chatOpen) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // In-call Reservation Interest Alert
    socket.on('tour-reserve-interest-alert', (alertData) => {
      setInterestAlert(alertData);
      setTimeout(() => setInterestAlert(null), 8000);
    });

    // Peer media toggle notifications
    socket.on('peer-media-toggled', ({ type, enabled }) => {
      console.log(`Peer changed ${type} to ${enabled}`);
    });

    socket.on('peer-screen-sharing', ({ isSharing }) => {
      setPeerScreenSharing(isSharing);
    });

    // Peer disconnected
    socket.on('tour-user-left', ({ userName: leftUser }) => {
      setRemoteConnected(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      remoteStreamRef.current = null;
      setChatMessages(prev => [...prev, {
        id: 'sys_' + Date.now(),
        sender: 'System',
        message: `${leftUser || 'Participant'} left the virtual tour.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });
  };

  // Create & Manage WebRTC Peer Connection
  const initiatePeerConnection = (targetSocketId, isInitiator) => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
    }

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current
    });
    peerConnectionRef.current = pc;

    // Add local media tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote track received
    pc.ontrack = (event) => {
      console.log('🎥 Received remote media track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch(e => console.log('Remote play error:', e));
        }
        setRemoteConnected(true);
      }
    };

    // Relay local ICE candidates to remote peer via signaling socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal-ice-candidate', {
          to: targetSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setRemoteConnected(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteConnected(false);
      }
    };

    // If caller/initiator, create and send SDP offer with audio/video media descriptions
    if (isInitiator) {
      pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      .then(async (offer) => {
        await pc.setLocalDescription(offer);
        socketRef.current?.emit('signal-offer', {
          to: targetSocketId,
          offer,
          user: { name: userName, role: userRole }
        });
      })
      .catch((err) => console.error('Error creating SDP offer:', err));
    }

    return pc;
  };

  // Toggle Microphone (Audio)
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        if (socketRef.current) {
          socketRef.current.emit('toggle-media-status', {
            roomId,
            type: 'audio',
            enabled: audioTrack.enabled
          });
        }
      }
    }
  };

  // Toggle Camera (Video)
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        if (socketRef.current) {
          socketRef.current.emit('toggle-media-status', {
            roomId,
            type: 'video',
            enabled: videoTrack.enabled
          });
        }
      }
    }
  };

  // Screen Sharing (Floorplans / Lease documents)
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
        if (socketRef.current) {
          socketRef.current.emit('screen-sharing-status', { roomId, isSharing: true });
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.warn('Screen share canceled or failed:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (peerConnectionRef.current && videoTrack) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setIsScreenSharing(false);
    if (socketRef.current) {
      socketRef.current.emit('screen-sharing-status', { roomId, isSharing: false });
    }
  };

  // Send In-Tour Chat Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;

    socketRef.current.emit('send-tour-chat-message', {
      roomId,
      message: chatInput
    });
    setChatInput('');
  };

  // Express interest / reserve prompt during tour
  const handleExpressInterest = () => {
    if (socketRef.current) {
      socketRef.current.emit('tour-reserve-interest', { roomId, homeId });
      setInterestSent(true);
      setTimeout(() => setInterestSent(false), 5000);
    }
  };

  // Copy Tour Link
  const handleCopyLink = () => {
    const url = window.location.origin + `/tour/${roomId}` + (homeId ? `?homeId=${homeId}` : '');
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Re-ring the host
  const handleRingHostAgain = () => {
    if (socketRef.current) {
      socketRef.current.emit('request-host-join', {
        roomId,
        homeId,
        guestName: userName
      });
      setReRingSent(true);
      setTimeout(() => setReRingSent(false), 5000);
    }
  };

  // Share tour link on WhatsApp
  const handleShareWhatsApp = () => {
    const tourUrl = window.location.origin + `/tour/${roomId}` + (homeId ? `?homeId=${homeId}` : '');
    const message = `Hi! I am on HavenTo and would love a live virtual tour of ${homeData?.houseName || 'your property'}. Join my tour room now: ${tourUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Leave / Hang Up Call
  const handleHangUp = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.emit('leave-tour-room');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setInCall(false);
    setRemoteConnected(false);

    if (homeId) {
      navigate(`/homes/${homeId}`);
    } else {
      navigate('/homes');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch (e) {}
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      <Navbar currentPage="Homes" />

      {/* Host Joined Notification Banner */}
      {hostJoinedNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <PhoneCall className="w-5 h-5 text-white" />
          <span className="font-semibold text-sm md:text-base">{hostJoinedNotification}</span>
        </div>
      )}

      {/* Interest Alert Banner */}
      {interestAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="font-semibold text-sm md:text-base">{interestAlert.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* LOBBY / PRE-CALL VIEW */}
      {/* ========================================================= */}
      {!inCall ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 py-10 max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-3 tracking-wider uppercase">
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Live Property Walkthrough
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Virtual Property Tour
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto">
              Real-time WebRTC 1-on-1 audio/video call between host and prospective tenant. Connect instantly and inspect every room live.
            </p>
          </div>

          {/* If routeRoomId is present in URL (Direct Link Join Card) */}
          {routeRoomId ? (
            <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-3 bg-red-500/10 rounded-2xl">
                  <Video className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Join Tour Room</h2>
                  <p className="text-xs text-slate-400 font-mono">Room: {routeRoomId}</p>
                </div>
              </div>

              {homeData && (
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex gap-4 items-center">
                  <img 
                    src={homeData.photos?.[0] ? getImageUrl(homeData.photos[0]) : (homeData.photo ? getImageUrl(homeData.photo) : 'https://via.placeholder.com/150')} 
                    alt={homeData.houseName}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate text-sm">{homeData.houseName}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      {homeData.location}
                    </p>
                    <p className="text-xs font-bold text-emerald-400 mt-1">₹{homeData.price} <span className="text-[10px] text-slate-400 font-normal">/ night</span></p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Your Name</label>
                  <input 
                    type="text" 
                    value={userName} 
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Your Role</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setUserRole('guest')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                        userRole === 'guest' 
                          ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> Tenant
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserRole('host')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                        userRole === 'host' 
                          ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" /> Host
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinTour(routeRoomId)}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-2xl shadow-xl shadow-red-600/30 transition flex items-center justify-center gap-2 text-sm"
                >
                  <Video className="w-5 h-5" /> Join Tour Room Now
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => navigate('/tour')}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Browse all active tour rooms &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* Multi-Card Lobby View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">
              {/* CARD 1: ACTIVE LIVE WAITING ROOMS & QUICK DEMO */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Live Active Tours</h2>
                      <p className="text-xs text-slate-400">Open rooms waiting for connection</p>
                    </div>
                  </div>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-700">
                    {activeRooms.length} Active
                  </span>
                </div>

                {/* Active Rooms List */}
                <div className="space-y-3 min-h-[140px]">
                  {activeRooms.length === 0 ? (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 text-center text-xs text-slate-400 space-y-2">
                      <p className="font-medium text-slate-300">No rooms currently waiting</p>
                      <p className="text-[11px] text-slate-500">
                        Start a new tour room using the card on the right, or click the Quick Demo below to test instantly!
                      </p>
                    </div>
                  ) : (
                    activeRooms.map((room) => (
                      <div 
                        key={room.roomId}
                        className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-red-500/50 transition group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                            <span className="font-semibold text-xs text-white truncate">
                              {room.houseName || room.roomId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 truncate">
                            Waiting: {room.participants?.map(p => `${p.name || 'User'} (${p.role})`).join(', ') || '1 participant'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleJoinTour(room.roomId)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 group-hover:scale-105 active:scale-95"
                        >
                          <Video className="w-3.5 h-3.5" /> Join Call
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick 1-Click Demo Tour Button */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-400 mb-2 font-medium">Instant 2-Party Test Room:</div>
                  <button
                    type="button"
                    onClick={() => handleJoinTour('haven_demo_tour')}
                    className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 text-xs sm:text-sm transition flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Play className="w-4 h-4 fill-white" /> Quick Connect Demo Tour (haven_demo_tour)
                  </button>
                  <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                    Both host and guest can click this to instantly join the same room without codes.
                  </p>
                </div>
              </div>

              {/* CARD 2: START NEW TOUR OR ENTER CODE */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Start / Custom Tour</h2>
                    <p className="text-xs text-slate-400">Launch a private room or enter a code</p>
                  </div>
                </div>

                {/* Display Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Your Name</label>
                  <input 
                    type="text" 
                    value={userName} 
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs sm:text-sm focus:outline-none focus:border-red-500 transition"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Role Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Your Role</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setUserRole('guest')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                        userRole === 'guest' 
                          ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> Tenant
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserRole('host')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                        userRole === 'host' 
                          ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" /> Property Host
                    </button>
                  </div>
                </div>

                {/* Join by Specific Room Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Enter Room Code or Property ID</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={joinCodeInput} 
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      placeholder="e.g. haven_demo_tour or property_123"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                    />
                    <button
                      disabled={!joinCodeInput.trim()}
                      onClick={() => handleJoinTour(joinCodeInput.trim())}
                      className="px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-white rounded-xl border border-slate-700 transition"
                    >
                      Join
                    </button>
                  </div>
                </div>

                {/* Launch New Room Button */}
                <button
                  onClick={() => {
                    const newId = 'tour_' + Math.random().toString(36).substr(2, 6);
                    handleJoinTour(newId);
                  }}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-98"
                >
                  <Video className="w-4 h-4 text-red-400" /> Launch New Room & Get Invite Link
                </button>
              </div>
            </div>
          )}

          {/* Security & Direct Peer-to-Peer Footer Badge */}
          <div className="mt-10 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 text-xs text-slate-400 max-w-xl">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-200 font-semibold">End-to-End Encrypted WebRTC</span>: Video and audio stream directly between participants with low-latency and no middleman recording.
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* ACTIVE IN-CALL VIEW */
        /* ========================================================= */
        <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
          {/* Main Video Arena */}
          <div className="flex-1 flex flex-col bg-black relative p-3 md:p-6 overflow-hidden">
            {/* Top Tour Info Bar */}
            <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2 pointer-events-auto flex items-center gap-3 shadow-lg">
                <span className={`w-2.5 h-2.5 rounded-full ${remoteConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`}></span>
                <span className="text-xs md:text-sm font-semibold truncate max-w-[180px] md:max-w-xs">
                  {homeData?.houseName || (roomId === 'haven_demo_tour' ? 'HavenTo Demo Tour' : `Tour: ${roomId}`)}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                  {roomId}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="p-1 hover:text-red-400 text-slate-400 transition"
                  title="Copy link to invite others"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Quick Reserve Action (for Guests) */}
              {userRole === 'guest' && (
                <button
                  onClick={handleExpressInterest}
                  disabled={interestSent}
                  className="pointer-events-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold text-xs md:text-sm px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  {interestSent ? 'Interest Sent to Host!' : 'I Want to Reserve!'}
                </button>
              )}
            </div>

            {/* Video Streams Container */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center relative mt-14 mb-20">
              {/* Remote Participant Video */}
              <div className="w-full h-full min-h-[280px] bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden flex items-center justify-center shadow-2xl">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                {!remoteConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-center p-6 space-y-4">
                    <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
                      <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-800 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 relative shadow-lg">
                        <PhoneCall className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce" />
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm sm:text-base">{remoteUserName}</p>
                      <p className="text-xs text-emerald-400 font-medium mt-1 flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        {userRole === 'guest'
                          ? 'Waiting for host to enter room...'
                          : 'Waiting for prospective tenant to enter room...'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                        Share room code <span className="text-red-400 font-mono font-bold">{roomId}</span> with the other person.
                      </p>
                    </div>

                    <div className="pt-2 space-y-2 w-full max-w-xs mx-auto">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 active:scale-95"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Link Copied to Clipboard!' : 'Copy Tour Room Link'}
                      </button>

                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-xl transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share Tour on WhatsApp
                      </button>

                      {userRole === 'guest' && (
                        <button
                          type="button"
                          onClick={handleRingHostAgain}
                          disabled={reRingSent}
                          className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 rounded-xl border border-slate-800 transition flex items-center justify-center gap-1.5"
                        >
                          <Bell className="w-3 h-3 text-amber-400" />
                          {reRingSent ? 'Notification Sent to Host!' : 'Alert Host in Real-Time'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-2">
                  {remoteConnected && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                  <span>{remoteUserName}</span>
                  {peerScreenSharing && <span className="text-[10px] text-amber-300 font-semibold">(Screen Sharing)</span>}
                </div>
              </div>

              {/* Local Participant Video */}
              <div className="w-full h-full min-h-[280px] bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden flex items-center justify-center shadow-2xl">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover transform -scale-x-100 ${isVideoOff ? 'hidden' : ''}`}
                />
                {isVideoOff && (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      <VideoOff className="w-8 h-8" />
                    </div>
                    <p className="text-slate-300 font-semibold">{userName} (You)</p>
                    <p className="text-xs text-slate-500">Camera is turned off</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{userName} (You - {userRole === 'host' ? 'Host' : 'Guest'})</span>
                  {isAudioMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                </div>
              </div>
            </div>

            {/* Bottom Call Controls Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-900/90 backdrop-blur-lg border border-slate-800 px-6 py-3 rounded-2xl shadow-2xl">
              {/* Mic Toggle */}
              <button 
                onClick={toggleAudio}
                className={`p-3 rounded-xl transition ${isAudioMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Camera Toggle */}
              <button 
                onClick={toggleVideo}
                className={`p-3 rounded-xl transition ${isVideoOff ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* Screen Sharing Toggle */}
              <button 
                onClick={toggleScreenShare}
                className={`p-3 rounded-xl transition ${isScreenSharing ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen / Floorplan'}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </button>

              {/* In-Call Chat Drawer Toggle */}
              <button 
                onClick={() => {
                  setChatOpen(!chatOpen);
                  if (!chatOpen) setUnreadCount(0);
                }}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl relative transition"
                title="Toggle In-Tour Chat"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Leave / Hang Up */}
              <button 
                onClick={handleHangUp}
                className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/30 transition active:scale-95"
                title="Leave Virtual Tour"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Sidebar: In-Tour Chat & Property Details */}
          {chatOpen && (
            <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-30">
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-red-400" />
                  <h3 className="font-bold text-sm">Tour Discussion</h3>
                </div>
                <button 
                  onClick={() => setChatOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No messages yet. Ask the host about parking, utilities, or lease conditions!
                  </div>
                ) : (
                  chatMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${msg.sender === userName ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                        <span className="font-semibold text-slate-300">{msg.sender}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className={`p-2.5 rounded-2xl text-xs max-w-[85%] ${
                        msg.sender === userName 
                          ? 'bg-red-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..." 
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <button 
                  type="submit" 
                  className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
