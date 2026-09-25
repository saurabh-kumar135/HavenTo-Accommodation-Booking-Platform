import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Video, PhoneCall, PhoneOff, MapPin, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, getImageUrl } from '../config/api';

export default function IncomingTourCallListener() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState(null);
  const audioContextRef = useRef(null);
  const chimeIntervalRef = useRef(null);
  const autoDismissTimerRef = useRef(null);

  // Play a smooth dual-tone ring chime using Web Audio API
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Tone 1: 523.25 Hz (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: 659.25 Hz (E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.12);
      gain2.gain.setValueAtTime(0.12, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.5);
    } catch (e) {
      // Audio autoplay policy may block before user interaction
    }
  };

  const startRingingChime = () => {
    playChime();
    if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
    chimeIntervalRef.current = setInterval(playChime, 2500);
  };

  const stopRingingChime = () => {
    if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }
  };

  useEffect(() => {
    // Only connect if user is logged in
    if (!isLoggedIn || !user) return;

    const socket = io(getApiUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socket.on('connect', () => {
      socket.emit('register-user', {
        userId: user._id || user.id,
        role: user.userType,
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email
      });
    });

    socket.on('incoming-tour-call', (callData) => {
      // Only alert if the user is a host
      const isHost = user.userType === 'host';
      if (!isHost) return;

      const currentUserId = String(user._id || user.id || '');
      const targetHostId = callData.hostId ? String(callData.hostId) : null;

      // If call is targeted specifically to this host or broadcasted to hosts
      if (!targetHostId || targetHostId === currentUserId) {
        setIncomingCall(callData);
        startRingingChime();

        // Auto dismiss after 45 seconds if unanswered
        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = setTimeout(() => {
          stopRingingChime();
          setIncomingCall(null);
        }, 45000);
      }
    });

    return () => {
      stopRingingChime();
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      socket.disconnect();
    };
  }, [isLoggedIn, user]);

  const handleAnswerCall = () => {
    stopRingingChime();
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
    if (!incomingCall) return;

    const targetUrl = `/tour/${incomingCall.roomId}?homeId=${incomingCall.homeId}`;
    setIncomingCall(null);
    navigate(targetUrl, {
      state: {
        homeId: incomingCall.homeId,
        homeName: incomingCall.houseName
      }
    });
  };

  const handleDeclineCall = () => {
    stopRingingChime();
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md animate-in fade-in slide-in-from-top-6 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-emerald-500/80 rounded-3xl p-5 shadow-2xl shadow-emerald-500/20 text-white">
        {/* Header Tag */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
              Incoming Virtual Tour Request
            </span>
          </div>

          <button
            onClick={handleDeclineCall}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Property & Guest Info */}
        <div className="flex gap-3.5 items-center bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 mb-4">
          {incomingCall.houseImage ? (
            <img
              src={getImageUrl(incomingCall.houseImage)}
              alt={incomingCall.houseName}
              className="w-16 h-16 rounded-xl object-cover border border-slate-700"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-700 flex items-center justify-center text-slate-400">
              <Video className="w-7 h-7" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-sm truncate">{incomingCall.houseName}</h4>
            <p className="text-xs text-emerald-300 font-medium mt-0.5 truncate">
              Guest: <span className="text-white font-bold">{incomingCall.guestName}</span> is waiting!
            </p>
            {incomingCall.location && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                {incomingCall.location}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDeclineCall}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 border border-slate-700"
          >
            <PhoneOff className="w-4 h-4 text-red-400" />
            Decline
          </button>

          <button
            onClick={handleAnswerCall}
            className="py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition transform active:scale-95 flex items-center justify-center gap-2 animate-pulse"
          >
            <Video className="w-4 h-4" />
            Answer Call
          </button>
        </div>
      </div>
    </div>
  );
}
