import React, { useState, useMemo } from 'react';
import { MapPin, Star, ArrowRight, Ship, Hotel, Search, Filter, Navigation, Heart, Info, Clock, Waves, Sparkles, Map as MapIcon, Grid, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { FEATURED_HOTELS } from './Hotels';
import { FEATURED_CRUISES } from './Cruises';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from './FirebaseProvider';
import { collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { useToast } from './ToastContext';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export const DestinationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'hotel' | 'cruise'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [selectedDest, setSelectedDest] = useState<any>(null);
  const [markerRef, marker] = useAdvancedMarkerRef();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState<string | number | null>(null);
  const [likedHotels, setLikedHotels] = useState<number[]>([]);
  const [likedCruises, setLikedCruises] = useState<number[]>([]);

  const fetchLikes = async () => {
    if (!user) return;
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      const snapshot = await getDocs(savedRef);
      const likes = snapshot.docs.map(d => d.data());
      
      setLikedHotels(likes.filter(l => l.type === 'hotel').map(l => l.hotelId));
      setLikedCruises(likes.filter(l => l.type === 'cruise').map(l => l.cruiseId));
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const handleSaveDestination = async (item: any) => {
    if (!user) return;
    const itemType = item.type;
    setIsSaving(item.id);
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      const idKey = itemType === 'hotel' ? 'hotelId' : 'cruiseId';
      
      const q = query(savedRef, where(idKey, '==', item.id), where('type', '==', itemType));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'users', user.uid, 'savedDestinations', d.id)));
        await Promise.all(deletePromises);
        if (itemType === 'hotel') setLikedHotels(prev => prev.filter(id => id !== item.id));
        else if (itemType === 'cruise') setLikedCruises(prev => prev.filter(id => id !== item.id));
        showToast(`Removed "${item.name}" from saved destinations.`, "info");
      } else {
        await addDoc(savedRef, {
          type: itemType,
          [idKey]: item.id,
          title: item.name,
          location: item.location || item.destination,
          imageUrl: item.image,
          rating: item.rating,
          price: item.price,
          recommendation: item.description || `${item.type} in ${item.location || item.destination}`,
          createdAt: serverTimestamp()
        });
        if (itemType === 'hotel') setLikedHotels(prev => [...prev, item.id]);
        else if (itemType === 'cruise') setLikedCruises(prev => [...prev, item.id]);
        showToast(`"${item.name}" saved to your destinations!`, "success");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsSaving(null);
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchLikes();
    }
  }, [user]);

  const allDestinations = useMemo(() => {
    const hotels = FEATURED_HOTELS.map(h => ({ ...h, type: 'hotel' as const }));
    const cruises = FEATURED_CRUISES.map(c => ({ ...c, type: 'cruise' as const }));
    
    return [...hotels, ...cruises].filter((d: any) => {
      const matchesFilter = filter === 'all' || d.type === filter;
      const destLocation = d.location || d.destination;
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           destLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (d.country && d.country.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [filter, searchQuery]);

  if (viewMode === 'map' && !hasValidKey) {
    return (
      <main className="pt-24 min-h-screen bg-surface-container-lowest flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center">
          <div className="w-20 h-20 bg-secondary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-secondary">
            <Lock size={40} />
          </div>
          <h2 className="text-3xl font-headline font-black text-on-surface uppercase tracking-tight mb-4">API Key Required</h2>
          <p className="text-on-surface-variant text-sm mb-10 leading-relaxed">
            Google Maps services require a valid API key. Please follow the instructions to set it up in your environment.
          </p>
          <div className="text-left space-y-4 mb-10">
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-secondary text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
              <p className="text-xs font-medium text-on-surface-variant">Get a key from Google Cloud Console</p>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-secondary text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
              <p className="text-xs font-medium text-on-surface-variant">Add <code>GOOGLE_MAPS_PLATFORM_KEY</code> to Settings → Secrets</p>
            </div>
          </div>
          <button 
            onClick={() => setViewMode('grid')}
            className="w-full py-4 bg-on-surface text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-secondary transition-all"
          >
            Go Back to Grid
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 min-h-screen bg-surface-container-lowest pb-20 overflow-hidden flex flex-col">
      {/* Header */}
      <section className="px-8 lg:px-24 mb-8 shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
            <div className="max-w-xl">
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-secondary font-bold text-[10px] uppercase tracking-[0.4em] mb-2 block"
              >
                Explorer's Catalog
              </motion.span>
              <h1 className="text-5xl lg:text-6xl font-headline font-black tracking-tighter text-on-surface uppercase leading-[0.85]">
                {viewMode === 'grid' ? "World of" : "Global"} <br /> {viewMode === 'grid' ? "Discovery." : "Atlas."}
              </h1>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                <input 
                  type="text" 
                  placeholder="Find places..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 ring-secondary/20 w-64 shadow-sm"
                />
              </div>

              <div className="hidden lg:flex items-center gap-2 overflow-x-auto no-scrollbar max-w-sm">
                {['Japan', 'France', 'Italy', 'USA', 'Egypt'].map((country) => (
                  <button
                    key={country}
                    onClick={() => setSearchQuery(country)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-[8px] font-black uppercase tracking-widest text-on-surface-variant hover:border-secondary hover:text-secondary transition-all whitespace-nowrap shadow-sm"
                  >
                    {country}
                  </button>
                ))}
              </div>
              <div className="flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-secondary text-white shadow-md" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  <Grid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    viewMode === 'map' ? "bg-secondary text-white shadow-md" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  <MapIcon size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setFilter('all')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                filter === 'all' ? "bg-secondary text-white shadow-lg shadow-secondary/10" : "bg-white border border-slate-100 text-on-surface-variant hover:border-slate-300"
              )}
            >
              All Destinations
            </button>
            <button 
              onClick={() => setFilter('hotel')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border",
                filter === 'hotel' ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/10" : "bg-white border-slate-100 text-on-surface-variant hover:border-slate-300"
              )}
            >
              <Hotel size={14} /> Hotels
            </button>
            <button 
              onClick={() => setFilter('cruise')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border",
                filter === 'cruise' ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/10" : "bg-white border-slate-100 text-on-surface-variant hover:border-slate-300"
              )}
            >
              <Ship size={14} /> Cruises
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 lg:px-24">
        <div className="max-w-7xl mx-auto h-full min-h-[500px]">
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {allDestinations.map((dest: any, idx) => (
                  <motion.div
                    key={`${dest.type}-${dest.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={dest.image} 
                        alt={dest.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveDestination(dest);
                        }}
                        disabled={isSaving === dest.id}
                        className="absolute top-4 left-4 h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all shadow-sm z-10 group"
                      >
                        <Heart 
                          size={16} 
                          className={cn(
                            "transition-all duration-300",
                            (dest.type === 'hotel' ? likedHotels.includes(dest.id) : likedCruises.includes(dest.id)) ? "fill-red-500 text-red-500" : "text-on-surface-variant/30 group-hover:text-red-400",
                            isSaving === dest.id && "animate-pulse scale-125"
                          )} 
                        />
                      </button>
                      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm border border-white/20">
                        <Star size={10} fill="#FACC15" className="text-yellow-400" />
                        <span className="text-[10px] font-black">{dest.rating}</span>
                      </div>
                      <div className="absolute top-4 left-4">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md",
                          dest.type === 'hotel' ? "bg-white/90 text-secondary" : "bg-secondary text-white"
                        )}>
                          {dest.type === 'hotel' ? <Hotel size={10} /> : <Ship size={10} />}
                          {dest.type}
                        </span>
                      </div>
                    </div>

                    <div className="p-8">
                      <div className="flex items-center gap-1 text-on-surface-variant/60 mb-2">
                        <MapPin size={10} />
                        <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis">
                          {dest.type === 'hotel' ? dest.location : dest.destination}
                        </span>
                      </div>
                      <h3 className="text-xl font-headline font-black text-on-surface mb-3 uppercase tracking-tighter line-clamp-1 group-hover:text-secondary transition-colors">
                        {dest.name}
                      </h3>
                      
                      <p className="text-[11px] text-on-surface-variant font-medium line-clamp-2 leading-relaxed mb-6 h-8">
                        {dest.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-8 h-10 overflow-hidden">
                        {dest.amenities.slice(0, 3).map((a: string) => (
                          <span key={a} className="text-[8px] font-black bg-surface-container-low px-3 py-1 rounded-lg text-on-surface-variant uppercase border border-white">
                            {a}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <div>
                          <p className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-tighter">Starting at</p>
                          <p className="text-2xl font-headline font-black text-on-surface">${dest.price.toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => navigate(dest.type === 'hotel' ? '/hotels' : '/cruises')}
                          className="px-8 h-12 bg-on-surface text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-secondary transition-all shadow-xl shadow-on-surface/10 active:scale-95"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="map"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full h-full min-h-[600px] bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-2xl p-2 relative"
              >
                <div className="absolute top-8 left-8 z-10 flex flex-col gap-2 pointer-events-none">
                  {allDestinations.slice(0, 3).map((d: any) => (
                    <motion.div 
                      key={d.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="bg-white/90 backdrop-blur p-4 rounded-2xl border border-white shadow-xl flex items-center gap-4 w-64 pointer-events-auto cursor-pointer hover:border-secondary transition-all"
                      onClick={() => setSelectedDest(d)}
                    >
                      <img src={d.image} className="w-12 h-12 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-on-surface uppercase truncate">{d.name}</p>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-on-surface-variant uppercase mt-1">
                          <MapPin size={8} /> {d.location || d.destination}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div className="bg-secondary/10 backdrop-blur text-secondary px-6 py-2 rounded-full border border-secondary/20 font-black text-[8px] uppercase tracking-widest w-fit mt-4">
                    {allDestinations.length} Explorations Nearby
                  </div>
                </div>

                <APIProvider apiKey={API_KEY} version="weekly">
                  <Map
                    defaultCenter={{ lat: 20, lng: 0 }}
                    defaultZoom={2.5}
                    mapId="VOYAGO_MAP"
                    gestureHandling="greedy"
                    disableDefaultUI={true}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%', borderRadius: '2.5rem' }}
                  >
                    {allDestinations.filter((d: any) => d.coordinates).map((dest: any) => (
                      <AdvancedMarker
                        key={dest.id}
                        position={dest.coordinates}
                        onClick={() => setSelectedDest(dest)}
                        ref={selectedDest?.id === dest.id ? markerRef : null}
                      >
                        <div className={cn(
                          "p-2 rounded-full border-2 shadow-2xl transition-all hover:scale-125",
                          dest.type === 'hotel' ? "bg-white border-secondary text-secondary" : "bg-secondary border-white text-white"
                        )}>
                          {dest.type === 'hotel' ? <Hotel size={16} /> : <Ship size={16} />}
                        </div>
                      </AdvancedMarker>
                    ))}

                    {selectedDest && (
                      <InfoWindow
                        anchor={marker}
                        onCloseClick={() => setSelectedDest(null)}
                      >
                        <div className="p-2 max-w-[200px]">
                          <img src={selectedDest.image} className="w-full h-24 object-cover rounded-lg mb-3" />
                          <h4 className="text-[10px] font-black uppercase text-on-surface mb-1">{selectedDest.name}</h4>
                          <p className="text-[8px] text-on-surface-variant font-bold uppercase mb-3 flex items-center gap-1">
                            <MapPin size={8} /> {selectedDest.location || selectedDest.destination}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-secondary">${selectedDest.price}</span>
                            <button 
                              onClick={() => navigate(selectedDest.type === 'hotel' ? '/hotels' : '/cruises')}
                              className="text-[8px] font-black uppercase text-on-surface hover:text-secondary"
                            >
                              Details →
                            </button>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </Map>
                </APIProvider>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {allDestinations.length > 0 && viewMode === 'grid' && (
        <section className="px-8 lg:px-24 mt-20 shrink-0">
          <div className="max-w-7xl mx-auto">
            <div className="bg-on-surface rounded-[3rem] p-12 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="relative z-10 text-center md:text-left">
                <h2 className="text-3xl font-headline font-black tracking-tighter uppercase mb-2">Can't decide?</h2>
                <p className="text-white/60 text-sm max-w-sm">
                  Let our AI Design a journey tailored to your specific taste.
                </p>
              </div>
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-10 py-4 bg-secondary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-on-surface transition-all flex items-center gap-3 relative z-10"
              >
                Launch AI Concierge <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

