import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from './FirebaseProvider';
import { Compass, CheckCircle2, Shield, Sparkles, Loader2, Plane, Clock, Globe, Share2, Copy, Check, Image, X, Twitter, ExternalLink, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, User, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DestinationSetting {
  city: string;
  country: string;
  airportCode: string;
  flightNo: string;
  imageUrl: string;
  timezoneOffset: number;
}

const DESTINATIONS: DestinationSetting[] = [
  {
    city: "Tokyo",
    country: "Japan",
    airportCode: "HND",
    flightNo: "VY-102",
    imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
    timezoneOffset: 9,
  },
  {
    city: "Paris",
    country: "France",
    airportCode: "CDG",
    flightNo: "VY-047",
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    timezoneOffset: 2,
  },
  {
    city: "Reykjavík",
    country: "Iceland",
    airportCode: "KEF",
    flightNo: "VY-831",
    imageUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
    timezoneOffset: 0,
  },
  {
    city: "New York",
    country: "USA",
    airportCode: "JFK",
    flightNo: "VY-412",
    imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80",
    timezoneOffset: -4,
  }
];

export const AuthPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(true);

  // Email and password login states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Background and widget active variables
  const [destIndex, setDestIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [copied, setCopied] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setRefreshSuccess(false);
    
    // Simulate re-fetching data with latency to emulate active connection syncing
    setTimeout(() => {
      setCurrentTime(new Date());
      setIsRefreshing(false);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2400);
    }, 850);
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/?ref=SHARE&dest=${activeDest.city.toLowerCase()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error("Failed to copy link:", err);
    });
  };

  const handleCopyPreviewText = () => {
    const previewText = `Travelling to ${activeDest.city} next! ✈️ Checking details on Voyago's real-time flight route. Arrival ETA in: ${getEtaCountdown()}. See itinerary at: ${window.location.origin}/?dest=${activeDest.city.toLowerCase()}`;
    navigator.clipboard.writeText(previewText).then(() => {
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 2000);
    }).catch(err => {
      console.error("Failed to copy preview message:", err);
    });
  };

  // Cycle background destinations every 10 seconds
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setDestIndex((prev) => (prev + 1) % DESTINATIONS.length);
    }, 10000);
    return () => clearInterval(bgInterval);
  }, []);

  // Update clock ticks every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Compute timezone adjusted time values
  const getLocalTimeStr = (offset: number) => {
    const utc = currentTime.getTime() + currentTime.getTimezoneOffset() * 60000;
    const destDate = new Date(utc + 3600000 * offset);
    return destDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Check if landing time is on a different calendar day than user's current local date
  const getIsDifferentDay = (offset: number) => {
    const nowMs = currentTime.getTime();
    const currentHourStart = Math.floor(nowMs / 3600000) * 3600000;
    let targetTime = currentHourStart + 45 * 60000;
    if (nowMs >= targetTime) {
      targetTime += 3600000;
    }
    
    const userLocalDateStr = currentTime.toLocaleDateString('en-CA');
    const utcLanding = targetTime + (currentTime.getTimezoneOffset() * 60000);
    const destLandingDate = new Date(utcLanding + 3600000 * offset);
    const destLandingStr = destLandingDate.toLocaleDateString('en-CA');

    const isDifferent = userLocalDateStr !== destLandingStr;
    
    let dayLabel = "";
    if (isDifferent) {
      const userDateReset = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
      const destDateReset = new Date(destLandingDate.getFullYear(), destLandingDate.getMonth(), destLandingDate.getDate());
      const diffDays = Math.round((destDateReset.getTime() - userDateReset.getTime()) / 86400000);
      
      if (diffDays > 0) {
        dayLabel = `+${diffDays} Day${diffDays > 1 ? 's' : ''}`;
      } else if (diffDays < 0) {
        dayLabel = `${diffDays} Day${Math.abs(diffDays) > 1 ? 's' : ''}`;
      }
    }

    return {
      isDiff: isDifferent,
      dayLabel,
      destDateStr: destLandingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
    };
  };

  // Compute live ETA landing countdown based on stable clock markers
  const getEtaCountdown = () => {
    const nowMs = currentTime.getTime();
    const currentHourStart = Math.floor(nowMs / 3600000) * 3600000;
    let targetTime = currentHourStart + 45 * 60000;
    if (nowMs >= targetTime) {
      targetTime += 3600000;
    }
    const diff = targetTime - nowMs;
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  // Compute flight progress percentage dynamically
  const getFlightProgress = () => {
    const nowMs = currentTime.getTime();
    const currentHourStart = Math.floor(nowMs / 3600000) * 3600000;
    let targetTime = currentHourStart + 45 * 60000;
    if (nowMs >= targetTime) {
      targetTime += 3600000;
    }
    const totalDuration = 3600000; // 1 Hour relative loop period
    const elapsed = totalDuration - (targetTime - nowMs);
    const pct = Math.min(100, Math.max(10, (elapsed / totalDuration) * 100));
    return parseFloat(pct.toFixed(1));
  };

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  // Capture ref and mode parameters on load
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    if (refCode) {
      sessionStorage.setItem('voyago_ref_code', refCode.toUpperCase());
    }
    const mode = params.get('mode');
    if (mode === 'login') {
      setIsSignUp(false);
    } else if (mode === 'signup') {
      setIsSignUp(true);
    }
  }, [location]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (isSignUp && !name) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      if (isSignUp) {
        // Sign up with Email + Password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const createdUser = userCredential.user;
        // Update the display name
        await updateProfile(createdUser, {
          displayName: name
        });
      } else {
        // Log in with Email + Password
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(`Email authentication error during ${isSignUp ? 'signup' : 'login'}:`, err);
      let friendlyError = 'Authentication failed. Please check your credentials and try again.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = 'This email address is already in use by another account.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = 'The email address is invalid.';
      } else if (err.code === 'auth/weak-password') {
        friendlyError = 'The password is too weak.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyError = 'Incorrect email or password. Please try again.';
      }
      setError(friendlyError);
    } finally {
      setIsSigningIn(false);
    }
  };

  const activeDest = DESTINATIONS[destIndex];

  return (
    <div className="min-h-screen pt-20 bg-slate-50 flex items-center justify-center p-6" id="auth-page-container">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px]" id="auth-card">
        {/* Left branding & features panel with dynamic, rich destination imagery and a live arrival widget */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className={`${
            isCollapsed 
              ? "md:col-span-4 lg:col-span-4 xl:col-span-4" 
              : "md:col-span-7 lg:col-span-7 xl:col-span-7"
          } p-6 md:p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden bg-slate-950 transition-all duration-500`}
          id="auth-info-panel"
        >
          {/* Animated Background Pictures with cross-fade transitions */}
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            <AnimatePresence>
              <motion.div
                key={activeDest.city}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.25, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full"
              >
                <img
                  src={activeDest.imageUrl}
                  alt={activeDest.city}
                  className="w-full h-full object-cover select-none filter brightness-75 contrast-110 grayscale-[10%]"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/75 to-slate-950 z-[1]" />
          </div>

          <div className="relative z-10 w-full">
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Compass size={28} className="animate-spin-slow text-white shrink-0" />
                  {!isCollapsed && (
                    <span className="text-2xl font-black tracking-tighter hidden sm:inline-block">VOYAGO</span>
                  )}
                </div>

                {/* Expand / Collapse Button */}
                <button
                  type="button"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center gap-1.5 transition-all focus:outline-none cursor-pointer text-left"
                  title={isCollapsed ? "Expand panel to view features" : "Collapse panel for clean flight widget view"}
                  id="info-panel-collapse-trigger"
                >
                  {isCollapsed ? (
                    <>
                      <ChevronRight size={11} className="text-secondary" />
                      <span>Expand</span>
                    </>
                  ) : (
                    <>
                      <ChevronLeft size={11} className="text-secondary" />
                      <span>Collapse</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Dynamic Live Arrival Widget Flag */}
              <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9.5px] font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-widest leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                Live Tracker: {activeDest.flightNo}
              </div>
            </div>

            <div className={`grid grid-cols-1 ${isCollapsed ? 'gap-0' : 'lg:grid-cols-12 gap-6'} items-center`}>
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 10 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="lg:col-span-12 xl:col-span-7 overflow-hidden origin-top"
                  >
                    <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tight leading-tight mb-4">
                      YOUR JOURNEY IN <br />
                      HIGH RESOLUTION.
                    </h2>
                    <p className="text-white/80 text-xs md:text-sm font-body leading-relaxed max-w-sm mb-6">
                      Welcome to Voyago, your personal digital travel concierge. Unlock seamless airline connections, boutique designs, and predictive budget options in one polished platform.
                    </p>

                    {/* Platform bullet points */}
                    <div className="space-y-3.5 mb-6 lg:mb-0">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-white/95 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="font-bold text-xs tracking-tight text-white/95">Curated Flight Tracking</h4>
                          <p className="text-[11px] text-white/70">Save destinations and receive 10%+ flight price drop alerts instantly.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-white/95 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="font-bold text-xs tracking-tight text-white/95">Smart Digital Concierge</h4>
                          <p className="text-[11px] text-white/70">Chat in real-time with an expert travel assistant fueled by actual live data.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-white/95 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="font-bold text-xs tracking-tight text-white/95">Interactive Custom Itineraries</h4>
                          <p className="text-[11px] text-white/70">Easily organize, drag-and-drop, export and mark activities as completed.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* FLOATING LIVE ARRIVAL TIME WIDGET WITH ENHANCED HIGH-CONTRAST OBSIDIAN DARK STYLING */}
              <motion.div
                layout
                className={`${
                  isCollapsed ? "lg:col-span-12 xl:col-span-12 w-full" : "lg:col-span-12 xl:col-span-5"
                } bg-slate-950 bg-opacity-95 backdrop-blur-lg rounded-2xl border border-slate-700/80 p-5 shadow-[0_4px_30px_rgba(0,0,0,0.85)] flex flex-col justify-between hover:border-slate-500 transition-all duration-300 relative`}
                id="live-arrival-widget"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <div className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-widest text-slate-300">
                    <Globe size={11} className="text-secondary animate-pulse" />
                    <span>In-System Destination</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Manual Sync Refresh Button */}
                    <button
                      type="button"
                      onClick={handleRefreshData}
                      disabled={isRefreshing}
                      className={`p-1.5 rounded-lg transition-all border text-[10px] flex items-center gap-1.5 focus:outline-none cursor-pointer ${
                        isRefreshing 
                          ? 'bg-slate-900 text-slate-500 border-slate-800' 
                          : refreshSuccess
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                      title="Re-fetch visual real-time flight route and ETA sync progress"
                      id="refresh-eta-data-btn"
                    >
                      <RefreshCw size={11} className={`${isRefreshing ? 'animate-spin' : ''}`} />
                      <span className="text-[8px] tracking-wide uppercase font-extrabold hidden xs:inline-block">
                        {isRefreshing ? 'Syncing' : refreshSuccess ? 'Synced' : 'Sync'}
                      </span>
                    </button>

                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className={`p-1.5 rounded-lg transition-all border text-[10px] flex items-center gap-1 focus:outline-none cursor-pointer ${
                        showShareMenu 
                          ? 'bg-secondary text-slate-950 border-secondary font-black' 
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                      title="Share this flight destination info with friends"
                      id="share-dest-toggle-btn"
                    >
                      <Share2 size={11} />
                      <span className="text-[8px] tracking-wide uppercase font-extrabold">Share</span>
                    </button>
                    <span className="text-[9px] font-extrabold text-[#ffffff] bg-slate-800 px-2 py-0.5 rounded-md font-mono border border-slate-700/80">
                      {activeDest.airportCode}
                    </span>
                  </div>
                </div>

                {/* INLINE EXPANDABLE SHARE INTERACTIVE PANEL */}
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -5 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -5 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden border-b border-slate-800 pb-3.5 mb-3"
                    >
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Direct Link</span>
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider leading-none">Ready</span>
                        </div>
                        
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/?dest=${activeDest.city.toLowerCase()}`}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-mono flex-1 text-slate-300 focus:outline-none select-all"
                          />
                          <button
                            onClick={handleCopyLink}
                            className="px-2.5 py-1 bg-secondary hover:bg-secondary/90 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-all shrink-0 min-w-[70px]"
                          >
                            {copied ? (
                              <>
                                <Check size={10} className="stroke-[3]" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={10} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => setShowPreviewModal(true)}
                            className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 text-white border border-slate-800 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Image size={11} className="text-secondary" />
                            <span>Preview Card</span>
                          </button>
                          
                          <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this live route and flight details for Tokyo via Voyago! ✈️ Landing in less than an hour: `)}${window.location.origin}/?dest=${activeDest.city.toLowerCase()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 px-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg flex items-center justify-center gap-1 transition-all"
                            title="Post layout tweet context link to Twitter"
                          >
                            <Twitter size={11} className="text-[#1da1f2]" />
                            <span className="text-[8px] tracking-wider uppercase font-black">Tweet</span>
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3.5">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase block tracking-wider leading-none">Destination</span>
                    <span className="text-sm font-black text-[#ffffff] block mt-0.5 tracking-tight">
                      {activeDest.city}, {activeDest.country}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase block tracking-wider leading-none">Local Time</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock size={11} className="text-amber-400 shrink-0" />
                        <span className={`text-[11px] font-extrabold tracking-wider font-mono transition-all duration-300 ${isRefreshing ? 'text-slate-500 animate-pulse' : 'text-amber-300'}`}>
                          {isRefreshing ? "SYNCING..." : getLocalTimeStr(activeDest.timezoneOffset)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase block tracking-wider leading-none">Arrival ETA</span>
                        {getIsDifferentDay(activeDest.timezoneOffset).isDiff && (
                          <span className="text-[7px] font-black tracking-wide text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded leading-none border border-amber-400/20 uppercase">
                            {getIsDifferentDay(activeDest.timezoneOffset).dayLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Plane size={11} className="text-emerald-400 shrink-0 -rotate-45 animate-pulse" />
                        <span className={`text-[11px] font-extrabold tracking-wider font-mono transition-all duration-300 ${isRefreshing ? 'text-slate-500 animate-pulse' : 'text-emerald-400'}`}>
                          {isRefreshing ? "SYNCING..." : getEtaCountdown()}
                        </span>
                      </div>

                      {/* Day shift tooltip warning */}
                      {getIsDifferentDay(activeDest.timezoneOffset).isDiff && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl text-[8.5px] text-slate-300 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 w-44 leading-relaxed font-sans border-b-amber-500/50 border-b-2">
                          <div className="flex items-center gap-1 font-bold text-amber-400 mb-0.5">
                            <AlertCircle size={9} className="shrink-0 animate-pulse" />
                            <span>Day Shift Warning</span>
                          </div>
                          Lands in {activeDest.city} on <span className="text-white font-extrabold font-mono">{getIsDifferentDay(activeDest.timezoneOffset).destDateStr}</span>.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Warning bar for Day Shift */}
                  {getIsDifferentDay(activeDest.timezoneOffset).isDiff && (
                    <div className="flex items-start gap-1.5 p-2 bg-amber-500/10 border border-amber-500/15 rounded-xl text-[8.5px] text-amber-300/95 leading-normal" id="timezone-warning-bar">
                      <AlertCircle size={11} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold uppercase tracking-widest block text-[7px] mb-0.5 text-amber-400">Timezone Shift Detected</span>
                        Scheduled arrival occurs on <span className="underline decoration-dotted font-bold text-white">{getIsDifferentDay(activeDest.timezoneOffset).destDateStr}</span> local destination day.
                      </div>
                    </div>
                  )}

                  {/* Simulated flight route visual progress */}
                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex justify-between items-center text-[8.5px] font-extrabold text-slate-300 uppercase tracking-widest">
                      <span>Status: Route Progress</span>
                      <span className="font-mono text-emerald-400">{getFlightProgress()}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-[1px]">
                      <div
                        className="h-full bg-gradient-to-r from-secondary to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${getFlightProgress()}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-xs text-white/60">
            <Shield size={14} />
            Secure authentication powered by Firebase
          </div>
        </motion.div>

        {/* Right authentication buttons panel with modern state toggle */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className={`${
            isCollapsed 
              ? "md:col-span-8 lg:col-span-8 xl:col-span-8" 
              : "md:col-span-5 lg:col-span-5 xl:col-span-5"
          } p-8 md:p-12 flex flex-col justify-center bg-slate-50/20 transition-all duration-500`}
          id="auth-action-panel"
        >
          <div className="w-full max-w-xs mx-auto">
            {/* Custom state tabs switcher */}
            <div className="flex bg-slate-100 p-1.5 rounded-full mb-6 relative">
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-2 text-center text-xs font-headline font-black uppercase tracking-wider rounded-full transition-all duration-300 relative z-10 cursor-pointer ${
                  isSignUp ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-2 text-center text-xs font-headline font-black uppercase tracking-wider rounded-full transition-all duration-300 relative z-10 cursor-pointer ${
                  !isSignUp ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                Log In
              </button>
              {/* Highlight background transition */}
              <div
                className={`absolute top-1.5 bottom-1.5 rounded-full bg-white shadow-xs transition-all duration-300 ease-out`}
                style={{
                  left: isSignUp ? '6px' : 'calc(50% + 1.5px)',
                  width: 'calc(50% - 7.5px)'
                }}
              />
            </div>

            <div className="relative overflow-hidden min-h-[300px] flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                  <Sparkles size={10} /> {isSignUp ? "Get Started" : "Welcome Back"}
                </div>
                
                <h3 className="text-2xl font-headline font-black text-on-surface tracking-tight mb-1.5">
                  {isSignUp ? "Join Voyago" : "Sign In to Voyago"}
                </h3>
                <p className="text-xs text-on-surface-variant font-medium leading-relaxed mb-6">
                  {isSignUp 
                    ? "Access premium business bookings and real-time custom flight drop monitoring."
                    : "Unlock your high-resolution itineraries, custom pins, and live concierge support."
                  }
                </p>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-[11px] text-red-600 mb-6 text-left leading-relaxed animate-pulse">
                    {error}
                  </div>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {isSignUp && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450">
                        <User size={14} />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Your Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 focus:bg-white text-slate-800 rounded-xl border border-transparent focus:border-secondary/35 focus:outline-hidden focus:ring-2 focus:ring-secondary/5 transition-all text-xs font-semibold h-11"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-455">
                      <Mail size={14} />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 focus:bg-white text-slate-800 rounded-xl border border-transparent focus:border-secondary/35 focus:outline-hidden focus:ring-2 focus:ring-secondary/5 transition-all text-xs font-semibold h-11"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-455">
                      <Lock size={14} />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder={isSignUp ? "Password (min 6 characters)" : "Password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 focus:bg-white text-slate-800 rounded-xl border border-transparent focus:border-secondary/35 focus:outline-hidden focus:ring-2 focus:ring-secondary/5 transition-all text-xs font-semibold h-11"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSigningIn}
                    className="w-full flex items-center justify-center py-2.5 bg-secondary hover:bg-secondary/95 text-slate-950 font-black rounded-xl shadow-xs hover:shadow-sm transition-all active:scale-98 disabled:opacity-50 cursor-pointer font-headline uppercase tracking-wider text-xs h-11"
                  >
                    {isSigningIn ? (
                      <Loader2 size={16} className="animate-spin text-slate-900" />
                    ) : (
                      <span>{isSignUp ? "Create Free Account" : "Access Account"}</span>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-8 text-center">
                <p className="text-[10px] text-slate-400 font-medium mb-3">
                  {isSignUp ? "Already have an account?" : "New to Voyago?"}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-secondary font-black ml-1 uppercase hover:underline cursor-pointer"
                  >
                    {isSignUp ? "Log In" : "Create Account"}
                  </button>
                </p>
                <span className="text-[9px] text-slate-400 font-medium leading-normal block">
                  By entering, you agree to Voyago's Terms of Service and Privacy Policy. Checkouts and saved states persist automatically.
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* SOCIAL MEDIA PREVIEW MODAL */}
      <AnimatePresence>
        {showPreviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            id="social-preview-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative text-white"
              id="social-preview-modal"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white transition-all border border-slate-705 focus:outline-none cursor-pointer"
                id="social-preview-close"
              >
                <X size={14} />
              </button>

              <div className="mb-4">
                <span className="text-[10px] uppercase tracking-widest font-black text-secondary">Card Generator</span>
                <h3 className="text-lg font-headline font-black text-white mt-0.5">Voyago Virtual Boarding Pass</h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">Copy this official social preview message to share your flight's live progress.</p>
              </div>

              {/* TICKET ARTWORK WRAPPER */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden relative shadow-inner mb-5 text-left" id="social-boarding-ticket">
                {/* Backdrop destination thumbnail image */}
                <div className="h-28 overflow-hidden relative">
                  <img
                    src={activeDest.imageUrl}
                    alt={activeDest.city}
                    className="w-full h-full object-cover filter brightness-[0.4] contrast-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60" />
                  
                  {/* Floating badge */}
                  <div className="absolute top-3 left-4 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-850 px-2.5 py-1 rounded-full">
                    <Compass size={12} className="text-secondary animate-spin-slow rotate-12" />
                    <span className="text-[9px] font-black tracking-widest text-slate-100 font-headline">VOYAGO PASS</span>
                  </div>
                </div>

                {/* Dashed separators & Ticket circular cuts */}
                <div className="relative">
                  <div className="absolute left-0 -top-2.5 w-5 h-5 bg-slate-900 rounded-full border-r border-slate-800 -ml-2.5" />
                  <div className="absolute right-0 -top-2.5 w-5 h-5 bg-slate-900 rounded-full border-l border-slate-800 -mr-2.5" />
                  <div className="border-t-2 border-dashed border-slate-800 h-px w-full mx-auto" />
                </div>

                {/* Ticket Details */}
                <div className="p-4 space-y-4">
                  {/* Outer Destination Hub Grid */}
                  <div className="grid grid-cols-12 gap-2 items-center justify-between">
                    <div className="col-span-4 text-left">
                      <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest block">Origin</span>
                      <span className="text-[13px] font-black tracking-wider font-mono text-white block mt-0.5">AIS-CORE</span>
                      <span className="text-[9px] text-slate-400 font-bold">Cloud Hub</span>
                    </div>

                    <div className="col-span-4 flex flex-col items-center justify-center">
                      <Plane size={14} className="text-secondary rotate-90 animate-pulse" />
                      <div className="h-0.5 w-8 bg-slate-805 mt-1" />
                    </div>

                    <div className="col-span-4 text-right">
                      <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest block">Destination</span>
                      <span className="text-[13px] font-black tracking-wider font-mono text-emerald-400 block mt-0.5">{activeDest.airportCode}</span>
                      <span className="text-[9px] text-slate-100 font-extrabold">{activeDest.city}</span>
                    </div>
                  </div>

                  {/* Secondary Details Grid */}
                  <div className="grid grid-cols-3 gap-3 pt-2.5 border-t border-slate-800/65 text-left">
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest block">FLIGHT NO</span>
                      <span className="text-[10px] font-extrabold text-white font-mono mt-0.5">{activeDest.flightNo}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest block">SEAT CODE</span>
                      <span className="text-[10px] font-extrabold text-white font-mono mt-0.5">12A (FIRST)</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest block">STATUS</span>
                      <span className="text-[9px] font-extrabold text-emerald-400 uppercase mt-0.5 tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block leading-none">ACTIVE</span>
                    </div>
                  </div>

                  {/* Arrival timing block */}
                  <div className="bg-slate-900/55 rounded-xl p-2.5 border border-slate-800 flex justify-between items-center text-left">
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-550 uppercase block tracking-wider">Estimated Landing Time</span>
                      <span className="text-[10px] font-bold text-amber-350 font-mono mt-0.5 block">{getLocalTimeStr(activeDest.timezoneOffset)} ({activeDest.city})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-extrabold text-slate-550 uppercase block tracking-wider">Time Remaining</span>
                      <span className="text-[10px] font-bold text-emerald-400 font-mono mt-0.5 block">{getEtaCountdown()}</span>
                    </div>
                  </div>

                  {/* Simulated barcode / ticket scanner signature */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="h-5 w-full bg-slate-950 flex gap-[1px] p-1 justify-center rounded">
                        <div className="w-1.5 h-full bg-slate-700" />
                        <div className="w-0.5 h-full bg-slate-700" />
                        <div className="w-1 h-full bg-slate-700" />
                        <div className="w-2 h-full bg-slate-700" />
                        <div className="w-0.5 h-full bg-slate-700" />
                        <div className="w-1.5 h-full bg-slate-700" />
                        <div className="w-1 h-full bg-slate-700" />
                        <div className="w-0.5 h-full bg-slate-700" />
                        <div className="w-2 h-full bg-slate-700" />
                        <div className="w-1 h-full bg-slate-700" />
                        <div className="w-0.5 h-full bg-slate-700" />
                        <div className="w-1.5 h-full bg-slate-700" />
                      </div>
                      <span className="text-[7.5px] font-mono tracking-widest text-slate-500 block text-center leading-none">SYS-CONCIERGE-226Q</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyPreviewText}
                  className="flex-1 py-2.5 bg-secondary hover:bg-secondary/90 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer focus:outline-none"
                >
                  {copiedPreview ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
                  <span>{copiedPreview ? 'Copied Message!' : 'Copy Social Message'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold text-[11px] uppercase tracking-wider font-headline transition-colors border border-slate-700 cursor-pointer focus:outline-none"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
