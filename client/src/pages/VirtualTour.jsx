import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, 
  PhoneOff, MessageSquare, Copy, Check, Users, Home, 
  Send, X, Sparkles, MapPin, Star, ShieldCheck, Share2
} from 'lucide-react';
import { getHomeDetails, getTourConfig } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getImageUrl, API_URL } from '../config/api';

export default function VirtualTour() {
  const { roomId: routeRoomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn } = useAuth();

  // Search parameters for homeId if provided as query param
  const queryParams = new URLSearchParams(location.search);
  const homeIdFromQuery = queryParams.get('homeId');

  // Tour & Home Metadata
  const [roomId, setRoomId] = useState(routeRoomId || 'tour_haven_' + Math.random().toString(36).substr(2, 6));
  const [homeId, setHomeId] = useState(homeIdFromQuery || location.state?.homeId || '');
  const [homeData, setHomeData] = useState(location.state?.home || null);
  const [inCall, setInCall] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('guest'); // 'guest' | 'host'
  const [copied, setCopied] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [interestAlert, setInterestAlert] = useState(null);

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
    { urls: 'stun:stun.relay.metered.ca:80' }
  ]);

  // Load User Details & Property Information
  useEffect(() => {
    if (user) {
      setUserName(user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0] || 'Guest');
      if (user.userType === 'host') {
        setUserRole('host');
      }
    } else {
      setUserName('Visitor_' + Math.floor(1000 + Math.random() * 9000));
    }

    if (homeId && !homeData) {
      getHomeDetails(homeId)
        .then(res => {
          if (res.data.success) {
            setHomeData(res.data.home);
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
  }, [user, homeId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  // Ensure local & remote streams attach correctly to video elements
  useEffect(() => {
    if (inCall && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (inCall && remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
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

  // Get user camera & microphone stream
  const getMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      return stream;
    } catch (err) {
      console.warn('Full media stream failed, falling back to audio only:', err);
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (audioErr) {
        console.error('Microphone/Camera access denied:', audioErr);
        return null;
      }
    }
  };

  // Join the Tour Room
  const handleJoinTour = async () => {
    if (!roomId.trim()) return;

    const stream = await getMediaStream();
    if (!stream) {
      alert('Could not access camera or microphone. Please enable camera/microphone permissions in your browser.');
      return;
    }

    localStreamRef.current = stream;
    setInCall(true);

    // Initialize Socket.io connection
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Virtual Tour signaling server:', socket.id);
      socket.emit('join-tour-room', {
        roomId,
        homeId,
        user: {
          name: userName,
          role: userRole
        }
      });
    });

    // Handle room joined & establish connection with existing peers
    socket.on('tour-room-joined', async ({ participants }) => {
      console.log('Room joined, existing participants:', participants);
      if (participants && participants.length > 0) {
        const peer = participants[0]; // 1-on-1 virtual tour connection
        setRemoteUserName(peer.user?.name || 'Property Host');
        await createPeerConnection(peer.socketId, true);
      }
    });

    // When another peer joins
    socket.on('tour-user-joined', ({ socketId, user: joiningUser }) => {
      console.log('New peer joined virtual tour:', joiningUser);
      setRemoteUserName(joiningUser?.name || 'Client');
    });

    // Handle incoming WebRTC Offer
    socket.on('signal-offer', async ({ from, offer, user: caller }) => {
      console.log('Received WebRTC Offer from:', from);
      setRemoteUserName(caller?.name || 'Property Host');
      const pc = await createPeerConnection(from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await processQueuedCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('signal-answer', {
        to: from,
        answer
      });
    });

    // Handle incoming WebRTC Answer
    socket.on('signal-answer', async ({ answer }) => {
      console.log('Received WebRTC Answer');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await processQueuedCandidates(peerConnectionRef.current);
      }
    });

    // Handle incoming ICE Candidate
    socket.on('signal-ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Error adding ICE candidate:', e);
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
      setChatMessages(prev => [...prev, {
        id: 'sys_' + Date.now(),
        sender: 'System',
        message: `${leftUser} left the virtual tour.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });
  };

  // Create WebRTC Peer Connection
  const createPeerConnection = async (targetSocketId, isInitiator) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current
    });
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote track received
    pc.ontrack = (event) => {
      console.log('Received remote media track:', event.track.kind);
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setRemoteConnected(true);
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
      console.log('Peer connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setRemoteConnected(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteConnected(false);
      }
    };

    // If initiator, create and send SDP offer
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('signal-offer', {
          to: targetSocketId,
          offer
        });
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
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
      peerConnectionRef.current.close();
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
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      <Navbar currentPage="Homes" />

      {/* Interest Alert Banner */}
      {interestAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="font-semibold text-sm md:text-base">{interestAlert.message}</span>
        </div>
      )}

      {/* LOBBY / PRE-CALL VIEW */}
      {!inCall ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <Video className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Live Virtual Property Tour</h1>
                <p className="text-sm text-slate-400">High-Definition 1-on-1 Walkthrough via WebRTC</p>
              </div>
            </div>

            {/* Property Highlight Card */}
            {homeData && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex gap-4 items-center">
                <img 
                  src={homeData.photos?.[0] ? getImageUrl(homeData.photos[0]) : (homeData.photo ? getImageUrl(homeData.photo) : 'https://via.placeholder.com/150')} 
                  alt={homeData.houseName}
                  className="w-20 h-20 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{homeData.houseName}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    {homeData.location}
                  </p>
                  <p className="text-sm font-bold text-emerald-400 mt-1">₹{homeData.price} <span className="text-xs text-slate-400 font-normal">/ night</span></p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Display Name</label>
                <input 
                  type="text" 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserRole('guest')}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 ${
                      userRole === 'guest' 
                        ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30' 
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Users className="w-4 h-4" /> Prospective Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRole('host')}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 ${
                      userRole === 'host' 
                        ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30' 
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Home className="w-4 h-4" /> Property Host
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tour Room ID</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={roomId} 
                    onChange={(e) => setRoomId(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl text-slate-300 flex items-center gap-1.5 text-sm transition"
                    title="Copy Tour Link"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleJoinTour}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-2xl shadow-xl shadow-red-600/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg"
            >
              <Video className="w-6 h-6" /> Start / Join Tour
            </button>
          </div>
        </div>
      ) : (
        /* ACTIVE IN-CALL VIEW */
        <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
          {/* Main Video Arena */}
          <div className="flex-1 flex flex-col bg-black relative p-3 md:p-6 overflow-hidden">
            {/* Top Tour Info Bar */}
            <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2 pointer-events-auto flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs md:text-sm font-semibold truncate max-w-[200px] md:max-w-xs">
                  {homeData?.houseName || 'Virtual Tour Room'}
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
              <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden flex items-center justify-center">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className={`w-full h-full object-cover ${!remoteConnected ? 'hidden' : ''}`}
                />
                {!remoteConnected && (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      <Users className="w-8 h-8" />
                    </div>
                    <p className="text-slate-300 font-semibold">{remoteUserName}</p>
                    <p className="text-xs text-slate-500 animate-pulse">Waiting for host or guest to connect...</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200">
                  {remoteUserName} {peerScreenSharing && ' (Sharing Screen)'}
                </div>
              </div>

              {/* Local Participant Video */}
              <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden flex items-center justify-center">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
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
                className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/30 transition"
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
