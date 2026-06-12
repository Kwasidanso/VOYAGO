import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './FirebaseProvider';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { LogOut, User as UserIcon, Bell, Search, X, LayoutDashboard, Calendar, Heart, Settings, Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AutocompleteInput } from './AutocompleteInput';

export const Navbar: React.FC = () => {
  const { user, profile, isOffline } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const [notifications, setNotifications] = useState<any[]>([
    { id: 'static1', type: 'price', title: 'Price Drop: Athens, Greece', message: 'Flights to Athens are down 15% for June.', date: '2h ago', read: false },
    { id: 'static2', type: 'advisory', title: 'Advisory: Southeast Asia', message: 'New travel guidelines issued for Thailand.', date: '5h ago', read: false },
    { id: 'static3', type: 'map', title: 'Interactive Map View Ready', message: 'Explore trending destinations using our new interactive map view!', date: '1d ago', read: false },
  ]);

  useEffect(() => {
    if (!user) return;

    const notifRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbNotifs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setNotifications(prev => {
        // De-duplicate static notifications if dynamic ones are present
        const dynamicIds = new Set(dbNotifs.map(n => n.id));
        const filteredStatic = [
          { id: 'static1', type: 'price', title: 'Price Drop: Athens, Greece', message: 'Flights to Athens are down 15% for June.', date: '2h ago', read: false },
          { id: 'static2', type: 'advisory', title: 'Advisory: Southeast Asia', message: 'New travel guidelines issued for Thailand.', date: '5h ago', read: false },
          { id: 'static3', type: 'map', title: 'Interactive Map View Ready', message: 'Explore trending destinations using our new interactive map view!', date: '1d ago', read: false },
        ].filter(n => !dynamicIds.has(n.id));

        return [...dbNotifs, ...filteredStatic];
      });
    }, (error) => {
      console.warn("Unable to stream live notifications from database:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const markAllRead = async () => {
    if (user) {
      try {
        const unread = notifications.filter(n => !n.read && n.id && !n.id.startsWith('static'));
        if (unread.length > 0) {
          const batch = writeBatch(db);
          unread.forEach(n => {
            const docRef = doc(db, 'users', user.uid, 'notifications', n.id);
            batch.update(docRef, { read: true });
          });
          await batch.commit();
        }
      } catch (e) {
        console.error("Failed to mark all notifications read:", e);
      }
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notif: any) => {
    if (user && !notif.read && !notif.id.startsWith('static')) {
      try {
        const docRef = doc(db, 'users', user.uid, 'notifications', notif.id);
        await updateDoc(docRef, { read: true });
      } catch (e) {
        console.error("Failed to set notification read status:", e);
      }
    }
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    if (notif.type === 'map') {
      navigate('/');
    } else {
      navigate('/dashboard');
    }
    setIsNotificationsOpen(false);
  };

  const getReadableDate = (notif: any) => {
    if (notif.date) return notif.date;
    if (!notif.createdAt) return 'Just now';
    try {
      const dateObj = notif.createdAt.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt);
      const diffMs = Date.now() - dateObj.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffSec < 45) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return 'Just now';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?dest=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl border border-amber-400/40 text-[11px] font-black tracking-widest uppercase"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-950"></span>
            </span>
            <span>Offline — Operations queued for reconnect</span>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-2xl shadow-sm h-20 flex items-center justify-between px-8">
      <div className="flex items-center gap-12 flex-1">
        <Link to="/" className="text-2xl font-bold tracking-tighter text-secondary font-headline">Voyago</Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/flights" className="text-slate-600 font-medium font-headline tracking-tight hover:text-secondary transition-colors">Flights</Link>
          <Link to="/hotels" className="text-slate-600 font-medium font-headline tracking-tight hover:text-secondary transition-colors">Hotels</Link>
          <Link to="/cruises" className="text-slate-600 font-medium font-headline tracking-tight hover:text-secondary transition-colors">Cruises</Link>
          <Link to="/concierge" className="text-slate-600 font-medium font-headline tracking-tight hover:text-secondary transition-colors">Concierge</Link>
          <Link to="/budget" className="text-slate-600 font-medium font-headline tracking-tight hover:text-secondary transition-colors">Budget</Link>
          <Link to="/map" className="text-slate-600 font-medium font-headline tracking-tight hover:text-secondary transition-colors">Explore Map</Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <AnimatePresence>
          {isSearchOpen ? (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '400px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="relative flex items-center"
            >
              <form onSubmit={handleSearchSubmit} className="w-full">
                <AutocompleteInput 
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search destinations, flights..."
                  inputClassName="bg-slate-100 px-4 py-2 rounded-full border-none focus-within:ring-2 focus-within:ring-secondary/20 h-10"
                  showIcon={false}
                />
              </form>
              <button 
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-3 text-slate-400 hover:text-secondary transition-colors z-[110]"
              >
                <X size={16} />
              </button>
            </motion.div>
          ) : (
            <motion.button 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-slate-600 hover:text-secondary transition-transform active:scale-90"
            >
              <Search size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-slate-600 hover:text-secondary rounded-full hover:bg-slate-50 transition-all relative active:scale-90"
            title="Notifications"
          >
            <Bell size={24} />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </button>
          
          <AnimatePresence>
            {isNotificationsOpen && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 28,
                      mass: 1,
                      staggerChildren: 0.04,
                      delayChildren: 0.02
                    }
                  },
                  exit: {
                    opacity: 0,
                    y: 12,
                    scale: 0.95,
                    transition: {
                      duration: 0.18,
                      ease: "easeInOut"
                    }
                  }
                }}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-3xl border border-slate-100 overflow-hidden z-50 origin-top-right p-4"
              >
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                  <h4 className="font-headline font-black text-on-surface uppercase tracking-wider text-[10px]">Notifications</h4>
                  {notifications.some(n => !n.read) && (
                    <button 
                      onClick={markAllRead}
                      className="text-[10px] text-secondary font-bold hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <motion.div 
                        variants={{
                          hidden: { opacity: 0, y: 10, filter: 'blur(2px)' },
                          visible: { 
                            opacity: 1, 
                            y: 0, 
                            filter: 'blur(0px)',
                            transition: {
                              type: "spring",
                              stiffness: 300,
                              damping: 24
                            }
                          }
                        }}
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={cn(
                          "p-2.5 rounded-2xl text-left cursor-pointer transition-all border text-xs relative overflow-hidden group",
                          notif.read 
                            ? "bg-slate-50/50 hover:bg-slate-50 border-transparent" 
                            : "bg-secondary/[0.03] hover:bg-secondary/[0.06] border-secondary/10"
                        )}
                        whileHover={{ scale: 1.015, y: -1 }}
                        whileTap={{ scale: 0.985 }}
                      >
                        {!notif.read && (
                          <div className="absolute right-2 top-2 h-1.5 w-1.5 bg-secondary rounded-full" />
                        )}
                        <div className="font-headline font-bold text-slate-800 tracking-tight text-[11px] mb-0.5 group-hover:text-secondary transition-colors">
                          {notif.title}
                        </div>
                        <div className="text-[10px] text-slate-500 leading-relaxed mb-1">
                          {notif.message}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {getReadableDate(notif)}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No notifications found.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {user ? (
          <div className="flex items-center gap-4 ml-2 relative" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-surface-container-low transition-transform hover:scale-105 active:scale-95"
            >
              <img src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full object-cover" />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white rounded-[2rem] shadow-3xl border border-slate-100 overflow-hidden z-50 origin-top-right p-2"
                >
                  {/* Aesthetic Profile Section */}
                  <div className="p-4 bg-slate-50/50 rounded-[1.5rem] mb-2 flex flex-col items-center text-center relative group">
                    <div className="relative mb-3">
                      <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-lg transition-transform group-hover:scale-105">
                        <img 
                          src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                          alt="Profile" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <Link 
                        to="/profile" 
                        className="absolute bottom-0 right-0 w-8 h-8 bg-on-surface text-white rounded-full flex items-center justify-center border-4 border-white hover:bg-secondary transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings size={12} />
                      </Link>
                    </div>
                    <h4 className="font-headline font-black text-on-surface text-sm uppercase tracking-tight truncate w-full px-2">
                      {user.displayName || 'Voyager'}
                    </h4>
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-0.5 truncate w-full px-2">
                      {user.email}
                    </p>
                  </div>

                  <div className="p-1 space-y-1">
                    <Link 
                      to="/dashboard" 
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-xs font-black text-on-surface uppercase tracking-widest hover:bg-surface-container-low rounded-xl transition-all group"
                    >
                      <LayoutDashboard size={18} className="text-slate-400 group-hover:text-secondary transition-colors" />
                      Dashboard
                    </Link>
                    <Link 
                      to="/dashboard" 
                      onClick={() => {
                        setIsProfileOpen(false);
                        setTimeout(() => {
                          const element = document.getElementById('past-bookings');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }, 300);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-xs font-black text-on-surface uppercase tracking-widest hover:bg-surface-container-low rounded-xl transition-all group"
                    >
                      <Calendar size={18} className="text-slate-400 group-hover:text-secondary transition-colors" />
                      My Bookings
                    </Link>
                    <Link 
                      to="/dashboard" 
                      onClick={() => {
                        setIsProfileOpen(false);
                        setTimeout(() => {
                          const element = document.getElementById('saved-destinations');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }, 300);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-xs font-black text-on-surface uppercase tracking-widest hover:bg-surface-container-low rounded-xl transition-all group"
                    >
                      <Heart size={18} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                      My Favorites
                    </Link>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-50 mb-1">
                    <button 
                      onClick={() => {
                        handleLogout();
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <LogOut size={18} />
                      Log Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Link 
            to="/auth?mode=login"
            className="hidden md:inline-flex ml-4 px-6 py-2 bg-secondary text-white rounded-full font-bold transition-all hover:shadow-lg hover:scale-105 active:scale-95 text-xs uppercase tracking-widest items-center"
          >
            Sign In / Sign Up
          </Link>
        )}

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-secondary rounded-full hover:bg-slate-50 transition-all active:scale-90"
          title="Toggle Menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown menu with spring entry animations */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="absolute top-20 left-0 w-full bg-white border-b border-slate-100 shadow-xl overflow-hidden md:hidden flex flex-col px-6 py-4 space-y-3.5 z-40"
          >
            <Link to="/flights" className="px-4 py-2 font-black uppercase tracking-widest text-[11px] text-slate-700 hover:text-secondary rounded-xl hover:bg-slate-50 transition-colors">Flights</Link>
            <Link to="/hotels" className="px-4 py-2 font-black uppercase tracking-widest text-[11px] text-slate-700 hover:text-secondary rounded-xl hover:bg-slate-50 transition-colors">Hotels</Link>
            <Link to="/cruises" className="px-4 py-2 font-black uppercase tracking-widest text-[11px] text-slate-700 hover:text-secondary rounded-xl hover:bg-slate-50 transition-colors">Cruises</Link>
            <Link to="/concierge" className="px-4 py-2 font-black uppercase tracking-widest text-[11px] text-slate-700 hover:text-secondary rounded-xl hover:bg-slate-50 transition-colors">Concierge</Link>
            <Link to="/budget" className="px-4 py-2 font-black uppercase tracking-widest text-[11px] text-slate-700 hover:text-secondary rounded-xl hover:bg-slate-50 transition-colors">Budget</Link>
            <Link to="/map" className="px-4 py-2 font-black uppercase tracking-widest text-[11px] text-slate-700 hover:text-secondary rounded-xl hover:bg-slate-50 transition-colors">Explore Map</Link>
            
            <div className="border-t border-slate-100 pt-4 flex flex-col space-y-2">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl mb-2">
                    <img 
                      src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-xs" 
                    />
                    <div className="truncate">
                      <div className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">{user.displayName || 'Voyager'}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{user.email}</div>
                    </div>
                  </div>
                  <Link to="/dashboard" className="px-4 py-2.5 font-black uppercase tracking-widest text-[11px] text-slate-700 hover:text-secondary rounded-xl hover:bg-slate-50 transition-colors">Dashboard</Link>
                  <Link to="/profile" className="px-4 py-2.5 font-black uppercase tracking-widest text-[11px] text-slate-700 hover:text-secondary rounded-xl hover:bg-slate-50 transition-colors">Profile Settings</Link>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 font-black uppercase tracking-widest text-[11px] text-rose-500 rounded-xl hover:bg-rose-50 transition-colors"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Link 
                    to="/auth?mode=login" 
                    className="flex-1 text-center py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    Log In
                  </Link>
                  <Link 
                    to="/auth?mode=signup" 
                    className="flex-1 text-center py-2.5 bg-secondary text-white rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:shadow-md"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
    </>
  );
};
