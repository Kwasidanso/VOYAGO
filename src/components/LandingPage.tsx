import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Heart, Star, Navigation, PlaneTakeoff, Hotel, Receipt, Search, MapPin, Calendar, Users, PlaneLanding, ArrowRight, Ship, Map as MapIcon, Grid, X, CloudSun, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Thermometer, Loader2, Sparkles, Share2, Copy, Check, Mail, MessageSquare, Eye, EyeOff, Camera, ChevronDown, Flame, Palmtree, Maximize2, Minimize2, Compass, SlidersHorizontal, Target, RefreshCw, CheckCircle2, Trash2, RotateCcw, Plus } from 'lucide-react';
import { motion, AnimatePresence, animate } from 'motion/react';
import { useAuth } from './FirebaseProvider';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useToast } from './ToastContext';
import { AutocompleteInput } from './AutocompleteInput';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { COUNTRIES, CountryInfo } from '../constants/countries';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  userId?: string | null,
  email?: string | null,
  emailVerified?: boolean | null
) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId,
      email,
      emailVerified,
    },
    operationType,
    path,
  };
  
  const isOffline = 
    errMessage.toLowerCase().includes('offline') || 
    errMessage.toLowerCase().includes('failed to get document') ||
    errMessage.toLowerCase().includes('unavailable') ||
    errMessage.toLowerCase().includes('network');

  if (isOffline) {
    console.warn('Firestore is running in offline mode. Falling back smoothly to defaults or cache: ', JSON.stringify(errInfo));
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const TRENDING_DESTINATIONS = [
  {
    title: "Ubud, Bali",
    subtitle: "Spiritual & Nature Retreat",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDuwPvAE-OMuZuavwt_iV2R1-byuLu3wKw0ieLbH4cCovuxz71URU6fhJ3l4w_B0CofFza78AQ8XNKgg3aAnKLRRfowbksixczcjHaFiTj0MyCOMA5trd4t2T7RTAFwJQ5F3-qOKMJNAKGV0LEIp9pNQRasi_1Xsop_G8tK3bMTetYcrFdIlcy0F-dq34mRvsUCv1OD_96IuaaxYPyDE_9in9748ndvYOuE6xp1GSW1AhfJsF16AqRHuKIjV82Pld8_Wbl7kLF-Cu0",
    tag: "POPULAR",
    coordinates: { lat: -8.5069, lng: 115.2625 }
  },
  {
    title: "Venice, Italy",
    subtitle: "Cultural & Historical Gem",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHdPgmZfznWYQsky2QG5hpUYyz35gQUMvKWpabAvJCwVmATh_DQYVSfmUcDLhz3gldh_l6zDCBZywwMRphzvBeaNdUjNxQSSYGKO56_gAZSkoMLY5bKsXCMdKGIqjN2Yme8xNIUYYQ2buG3TkwIaFFryAm4WZw7evxLVyCprEBX_cNGs0MkbnnSUHS9tPZFW-_g3Q6w9YhHzMWAueZ-scM9tbVj9s3ur0SfjlRXJSdhFJflsUN1xQ0DLAvJOmccvGZGNSjDmMH9yE",
    tag: "TRENDING",
    coordinates: { lat: 45.4408, lng: 12.3155 }
  },
  {
    title: "Kyoto, Japan",
    subtitle: "Serene Temple Gardens",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFwFe6KwO7_gjbUhWZVRBQbPJ2bfoXBqf7TdFV7_2MMiWc3fuZK609d4X0bmnLT-sZcCLmYQgOU-lr8rzwzP_kLsdT_24wIM0XRTw_w6bd0L9n7e-TKhAe2POpr7H8Easjjgwx51tCDkr0zco2vHeL7XK_yFAgI3Szkf1iEdfQxuwK9bKuvXnrfTg6GkxIqpxGYYT4OuGfxTx8XT40qMSBEyPZxA2eEg_44vW3Z_socu2WcDKpkT3CbUAUqahMku2iCIpNtSZakQE",
    tag: "SEASONAL",
    coordinates: { lat: 35.0116, lng: 135.7681 }
  }
];

const getHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: 'km' | 'mi' = 'km'
): number => {
  const R = unit === 'km' ? 6371 : 3958.8; // Radius of the earth
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in R units
};

const getCategoryStyling = (tag: string) => {
  const normalized = (tag || '').toUpperCase();
  switch (normalized) {
    case 'POPULAR':
      return {
        bg: '#f43f5e', // Rose 500
        border: '#e11d48' // Rose 600
      };
    case 'TRENDING':
      return {
        bg: '#6366f1', // Indigo 500
        border: '#4f46e5' // Indigo 600
      };
    case 'SEASONAL':
      return {
        bg: '#10b981', // Emerald 500
        border: '#047857' // Emerald 600
      };
    default:
      return {
        bg: '#0284c7', // Sky 600
        border: '#0369a1'
      };
  }
};

const InteractiveMarker = ({ 
  dest, 
  isLiked, 
  isSaving, 
  onLike, 
  isOpen, 
  onOpen, 
  onClose, 
  setMarkerRef,
  userGeoLocation,
  searchRadiusCenter,
  searchRadiusUnit = 'km'
}: any) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [isHovered, setIsHovered] = useState(false);
  const pinStyle = getCategoryStyling(dest.tag);

  useEffect(() => {
    if (marker && setMarkerRef) {
      setMarkerRef(marker, dest.title);
    }
    return () => {
      if (setMarkerRef) {
        setMarkerRef(null, dest.title);
      }
    };
  }, [marker, dest.title, setMarkerRef]);

  // Determine reference point: prefer real userGeoLocation, fallback to searchRadiusCenter
  const refPoint = userGeoLocation || searchRadiusCenter;
  const isRealLocation = !!userGeoLocation;
  
  let distanceStr = '';
  if (refPoint) {
    const dist = getHaversineDistance(
      refPoint.lat,
      refPoint.lng,
      dest.coordinates.lat,
      dest.coordinates.lng,
      searchRadiusUnit
    );
    distanceStr = `${dist.toFixed(1)} ${searchRadiusUnit}`;
  }

  return (
    <>
      <AdvancedMarker 
        ref={markerRef} 
        position={dest.coordinates} 
        onClick={onOpen}
        title={dest.title}
        zIndex={isHovered ? 99999 : (isOpen ? 1000 : undefined)}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={isOpen ? {
            scale: [1.2, 1.35, 1.2],
            y: [0, -16, 0]
          } : {
            scale: isHovered ? 1.3 : 1,
            opacity: 1,
            y: 0
          }}
          transition={isOpen ? {
            y: {
              repeat: Infinity,
              repeatType: "reverse",
              duration: 1.1,
              ease: "easeInOut"
            },
            scale: {
              repeat: Infinity,
              repeatType: "reverse",
              duration: 1.1,
              ease: "easeInOut"
            }
          } : {
            type: "spring",
            stiffness: 350,
            damping: 15,
            mass: 0.6
          }}
          style={{ transformOrigin: 'bottom center' }}
          className="cursor-pointer relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isOpen && (
            <>
              {/* Expanding visual pulse ring 1 */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 w-12 h-12 -bottom-2 rounded-full border-2 -z-10"
                style={{ borderColor: pinStyle.bg, transformOrigin: 'center center' }}
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 2.0, opacity: 0 }}
                transition={{
                  repeat: Infinity,
                  duration: 1.8,
                  ease: "easeOut"
                }}
              />
              {/* Expanding visual pulse ring 2 (staggered delay) */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 w-12 h-12 -bottom-2 rounded-full border -z-10"
                style={{ borderColor: pinStyle.bg, transformOrigin: 'center center' }}
                initial={{ scale: 0.2, opacity: 0.6 }}
                animate={{ scale: 2.0, opacity: 0 }}
                transition={{
                  repeat: Infinity,
                  duration: 1.8,
                  delay: 0.9,
                  ease: "easeOut"
                }}
              />
              {/* Pulse ambient shadow */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 w-8 h-2 -bottom-1 bg-black/20 rounded-full filter blur-[1px] -z-20"
                animate={{ scale: [0.7, 1.3, 0.7], opacity: [0.15, 0.4, 0.15] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.1,
                  ease: "easeInOut"
                }}
              />
            </>
          )}
          <Pin background={pinStyle.bg} glyphColor="#fff" borderColor={pinStyle.border} />
        </motion.div>
      </AdvancedMarker>
      {isOpen && (
        <InfoWindow anchor={marker} onCloseClick={onClose}>
          <div className="w-56 p-1 font-sans">
            <div className="relative h-28 rounded-lg overflow-hidden mb-2 bg-slate-100">
              <img 
                src={dest.image} 
                className="w-full h-full object-cover" 
                alt={dest.title}
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-1.5 right-1.5 bg-secondary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-widest uppercase">
                {dest.tag}
              </div>
            </div>
            <h4 className="font-bold text-xs text-slate-900 mb-0.5">{dest.title}</h4>
            <p className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1">
              <MapPin size={10} className="text-slate-400 animate-bounce" />
              {dest.subtitle}
            </p>
            {distanceStr && (
              <div className="mb-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 border border-indigo-100/50 text-[9.5px] font-semibold text-indigo-700">
                <Navigation size={10} className="text-indigo-500 rotate-45" />
                <span>
                  <strong>{distanceStr}</strong> {isRealLocation ? 'from you' : 'from radius center'}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike();
                }}
                disabled={isSaving}
                className={cn(
                  "flex-1 py-1 px-2.5 rounded-md text-[10px] font-bold transition-all border flex items-center justify-center gap-1",
                  isLiked 
                    ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <Heart size={10} className={cn(isLiked && "fill-red-500 text-red-500", isSaving && "animate-pulse")} />
                {isLiked ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface ClusteredTrendingMarkersProps {
  destinations: typeof TRENDING_DESTINATIONS;
  likedDestinations: string[];
  isSaving: string | null;
  handleSaveDestination: (dest: any) => void;
  activeMarker: string | null;
  setActiveMarker: (title: string | null) => void;
  userGeoLocation: google.maps.LatLngLiteral | null;
  searchRadiusCenter: google.maps.LatLngLiteral | null;
  searchRadiusUnit: 'km' | 'mi';
}

const ClusteredTrendingMarkers: React.FC<ClusteredTrendingMarkersProps> = ({
  destinations,
  likedDestinations,
  isSaving,
  handleSaveDestination,
  activeMarker,
  setActiveMarker,
  userGeoLocation,
  searchRadiusCenter,
  searchRadiusUnit
}) => {
  const [markers, setMarkers] = useState<{[key: string]: any}>({});
  const map = useMap();

  const clusterer = useMemo(() => {
    if (!map) return null;
    return new MarkerClusterer({ 
      map,
      onClusterClick: (event, cluster, map) => {
        const clusterMarkers = cluster.markers;
        if (!clusterMarkers || clusterMarkers.length === 0) return;

        const google = (window as any).google;
        if (!google || !google.maps) return;

        const bounds = new google.maps.LatLngBounds();
        clusterMarkers.forEach((marker: any) => {
          if (marker.getPosition()) {
            bounds.extend(marker.getPosition());
          }
        });

        const startCenter = map.getCenter();
        const startZoom = map.getZoom() || 3;
        if (!startCenter) return;

        const startLat = startCenter.lat();
        const startLng = startCenter.lng();

        // Fit bounds temporarily to find Google's recommended target center and zoom level
        map.fitBounds(bounds);
        const targetCenter = map.getCenter();
        const targetZoom = map.getZoom() || 10;

        if (!targetCenter) return;
        const targetLat = targetCenter.lat();
        const targetLng = targetCenter.lng();

        // Revert instantly before the browser renders the change to prevent jumping
        map.setCenter(startCenter);
        map.setZoom(startZoom);

        // Animate center coordinates and zoom smoothly with premium spring timing
        const animationState = { lat: startLat, lng: startLng, zoom: startZoom };
        animate(animationState, {
          lat: targetLat,
          lng: targetLng,
          zoom: targetZoom,
        }, {
          type: "spring",
          stiffness: 85,
          damping: 20,
          onUpdate: (latest) => {
            map.setCenter({ lat: latest.lat, lng: latest.lng });
            map.setZoom(latest.zoom);
          }
        });
      }
    });
  }, [map]);

  useEffect(() => {
    if (!clusterer) return;
    clusterer.clearMarkers();
    clusterer.addMarkers(Object.values(markers));
    return () => {
      clusterer.clearMarkers();
    };
  }, [clusterer, markers]);

  const setMarkerRef = useCallback((marker: any, key: string) => {
    setMarkers(prev => {
      if ((marker && prev[key]) || (!marker && !prev[key])) {
        return prev;
      }
      if (marker) {
        return { ...prev, [key]: marker };
      } else {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
    });
  }, []);

  return (
    <>
      {destinations.map((dest) => (
        <InteractiveMarker
          key={dest.title}
          dest={dest}
          isLiked={likedDestinations.includes(dest.title)}
          isSaving={isSaving === dest.title}
          onLike={() => handleSaveDestination(dest)}
          isOpen={activeMarker === dest.title}
          onOpen={() => setActiveMarker(dest.title)}
          onClose={() => {
            if (activeMarker === dest.title) {
              setActiveMarker(null);
            }
          }}
          setMarkerRef={setMarkerRef}
          userGeoLocation={userGeoLocation}
          searchRadiusCenter={searchRadiusCenter}
          searchRadiusUnit={searchRadiusUnit}
        />
      ))}
    </>
  );
};

interface MapLegendProps {
  visibleCategories: Record<string, boolean>;
  onToggleCategory: (category: string) => void;
  mapTypeId: string;
  onMapTypeIdChange: (type: string) => void;
  dragConstraints?: React.RefObject<Element | null>;
}

const MapLegend: React.FC<MapLegendProps> = ({ 
  visibleCategories, 
  onToggleCategory,
  mapTypeId,
  onMapTypeIdChange,
  dragConstraints
}) => {
  const map = useMap();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleTakeSnapshot = async () => {
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    if (!center) return;

    setIsCapturing(true);
    const lat = center.lat();
    const lng = center.lng();

    // Map active type to static supported types
    let staticMapType = 'roadmap';
    if (mapTypeId === 'satellite' || mapTypeId === 'hybrid') {
      staticMapType = mapTypeId;
    }

    // Capture currently visible categories and format marker pins
    let markerParams = '';
    TRENDING_DESTINATIONS.forEach(dest => {
      const catLower = (dest.tag || '').toLowerCase();
      const isVisible = visibleCategories[catLower] !== false;
      if (isVisible) {
        const style = getCategoryStyling(dest.tag);
        const colorHex = style.bg.replace('#', '0x');
        const label = dest.tag.charAt(0).toUpperCase();
        markerParams += `&markers=color:${colorHex}%7Clabel:${label}%7C${dest.coordinates.lat},${dest.coordinates.lng}`;
      }
    });

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=800x600&maptype=${staticMapType}&key=${API_KEY}${markerParams}`;

    try {
      const response = await fetch(staticMapUrl);
      if (!response.ok) throw new Error('CORS or fetch blocked');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `wanderlust-map-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.warn('Direct blob stream download failed, resorting to static image page fallback:', error);
      const link = document.createElement('a');
      link.href = staticMapUrl;
      link.target = '_blank';
      link.download = `wanderlust-map-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCategoryClick = (category: string) => {
    if (!map) return;
    const targets = TRENDING_DESTINATIONS.filter(
      (dest) => dest.tag.toUpperCase() === category.toUpperCase()
    );
    if (targets.length === 0) return;

    if (targets.length === 1) {
      const coords = targets[0].coordinates;
      map.setCenter(coords);
      map.setZoom(8);
    } else {
      const google = (window as any).google;
      if (google && google.maps) {
        const bounds = new google.maps.LatLngBounds();
        targets.forEach((t) => bounds.extend(t.coordinates));
        map.fitBounds(bounds);
      }
    }
  };

  const isFilterApplied = Object.values(visibleCategories).some(v => v === false);

  return (
    <motion.div 
      drag
      dragConstraints={dragConstraints}
      dragElastic={0.15}
      dragMomentum={false}
      animate={isFilterApplied ? {
        scale: [1, 1.025, 1],
      } : {
        scale: 1
      }}
      whileHover={{ scale: 1.04, backgroundColor: "rgba(255, 255, 255, 0.98)" }}
      whileDrag={{ 
        scale: 1.03, 
        rotate: -2,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" 
      }}
      transition={isFilterApplied ? {
        scale: {
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut"
        },
        default: { type: "spring", stiffness: 400, damping: 25 }
      } : {
        type: "spring",
        stiffness: 400,
        damping: 25
      }}
      className="absolute bottom-4 left-4 bg-white/85 backdrop-blur-md rounded-2xl p-3 border border-slate-200/50 shadow-xl flex flex-col gap-1.5 z-10 pointer-events-auto select-none min-w-[155px] shadow-slate-200/20 font-sans cursor-grab active:cursor-grabbing touch-none"
    >
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between gap-2 cursor-pointer pb-0.5"
        title={isCollapsed ? "Expand legend" : "Collapse legend"}
      >
        <span className="text-[8px] uppercase tracking-[0.2em] font-black text-slate-400">Destinations</span>
        <motion.div
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="text-slate-400 hover:text-slate-600 flex items-center justify-center p-0.5 rounded"
        >
          <ChevronDown size={12} />
        </motion.div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="legend-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transition: {
                height: { type: "spring", stiffness: 300, damping: 22 },
                opacity: { duration: 0.15 }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.2, ease: "easeInOut" },
                opacity: { duration: 0.1 }
              }
            }}
            style={{ overflow: "hidden" }}
            className="flex flex-col gap-1.5"
          >
            <div className="flex flex-col gap-1.5 mt-0.5">
              {[
                { key: 'popular', label: 'Popular', icon: Star, colorBg: 'bg-rose-500', ringClass: 'ring-rose-500/10', focusRing: 'focus:ring-rose-500/35', textHoverColor: 'group-hover/item:text-rose-600', rotateDir: -2 },
                { key: 'trending', label: 'Trending', icon: Flame, colorBg: 'bg-indigo-500', ringClass: 'ring-indigo-500/15', focusRing: 'focus:ring-indigo-500/35', textHoverColor: 'group-hover/item:text-indigo-600', rotateDir: 2 },
                { key: 'seasonal', label: 'Seasonal', icon: Palmtree, colorBg: 'bg-emerald-500', ringClass: 'ring-emerald-500/15', focusRing: 'focus:ring-emerald-500/35', textHoverColor: 'group-hover/item:text-emerald-600', rotateDir: -2 }
              ].map((cat) => {
                const isVisible = visibleCategories[cat.key];
                return (
                  <div 
                    key={cat.key} 
                    className="flex items-center justify-between gap-2 hover:bg-slate-50/80 p-1 rounded-xl transition-all"
                  >
                    <button 
                      type="button"
                      onClick={() => onToggleCategory(cat.key)}
                      className="flex items-center gap-2 text-left flex-1 group/item cursor-pointer outline-none select-none"
                    >
                      {/* Interactive Smooth Switch */}
                      <div className={cn(
                        "w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 relative flex items-center shrink-0",
                        isVisible ? cat.colorBg : "bg-slate-200"
                      )}>
                        <motion.div 
                          layout
                          transition={{ type: "spring", stiffness: 600, damping: 28 }}
                          className="bg-white w-2.5 h-2.5 rounded-full shadow-sm"
                          style={{
                            marginLeft: isVisible ? "auto" : "0px",
                            marginRight: isVisible ? "0px" : "auto"
                          }}
                        />
                      </div>

                      <cat.icon size={11} className={cn(
                        "shrink-0 transition-all duration-300",
                        isVisible ? "text-slate-600" : "text-slate-300"
                      )} />

                      <span className={cn(
                        "text-[10px] font-bold transition-all duration-300", 
                        isVisible 
                          ? "text-slate-700" 
                          : "text-slate-400 line-through decoration-slate-300/60"
                      )}>
                        {cat.label}
                      </span>
                    </button>

                    {/* Secondary Locate Button - Centers map on categories */}
                    {isVisible && (
                      <motion.button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryClick(cat.key);
                        }}
                        whileHover={{ scale: 1.15, backgroundColor: "rgba(238, 242, 255, 0.82)" }}
                        whileTap={{ scale: 0.9 }}
                        className="p-1 rounded-lg text-indigo-500 hover:text-indigo-700 hover:bg-slate-100 transition-all shrink-0 cursor-pointer outline-none border border-transparent hover:border-slate-200"
                        title={`Zoom map to focus on ${cat.label} pins`}
                      >
                        <MapPin size={10} className="stroke-[2.5]" />
                      </motion.button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-200/50 mt-1 pt-2">
              <span className="text-[8px] uppercase tracking-[0.2em] font-black text-slate-400 mb-1.5 block">Map View</span>
              <div className="grid grid-cols-2 gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/40">
                <button 
                  type="button"
                  onClick={() => onMapTypeIdChange('roadmap')}
                  className={cn(
                    "text-[9px] font-bold py-1 px-1 rounded-md transition-all text-center cursor-pointer outline-none",
                    mapTypeId === 'roadmap' 
                      ? "bg-white text-indigo-600 shadow-sm font-extrabold" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Road
                </button>
                <button 
                  type="button"
                  onClick={() => onMapTypeIdChange('satellite')}
                  className={cn(
                    "text-[9px] font-bold py-1 px-1 rounded-md transition-all text-center cursor-pointer outline-none",
                    mapTypeId === 'satellite' 
                      ? "bg-white text-indigo-600 shadow-sm font-extrabold" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Satel
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200/50 mt-1.5 pt-2">
              <motion.button
                type="button"
                disabled={isCapturing}
                onClick={handleTakeSnapshot}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold rounded-lg text-[10px] shadow-sm shadow-indigo-100/10 transition-all cursor-pointer outline-none font-sans"
              >
                {isCapturing ? (
                  <>
                    <Loader2 size={11} className="animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Camera size={11} className="shrink-0" />
                    <span>Snapshot</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface MapRadiusCircleProps {
  center: google.maps.LatLngLiteral;
  radius: number;
  unit: 'km' | 'mi';
}

const MapRadiusCircle: React.FC<MapRadiusCircleProps> = ({ center, radius, unit }) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    // Radius in meters
    const radiusInMeters = radius * (unit === 'km' ? 1000 : 1609.34);

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center,
        radius: radiusInMeters,
        fillColor: '#6366f1', // indigo-500
        fillOpacity: 0.12,
        strokeColor: '#4f46e5', // indigo-600
        strokeOpacity: 0.5,
        strokeWeight: 1.5,
        clickable: false,
      });
    } else {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radiusInMeters);
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, center, radius, unit]);

  return null;
};

interface SearchRadiusToolProps {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  center: google.maps.LatLngLiteral;
  setCenter: (center: google.maps.LatLngLiteral) => void;
  radius: number;
  setRadius: (radius: number) => void;
  unit: 'km' | 'mi';
  setUnit: (unit: 'km' | 'mi') => void;
  dragConstraints?: React.RefObject<Element | null>;
}

const SearchRadiusTool: React.FC<SearchRadiusToolProps> = ({
  enabled,
  setEnabled,
  center,
  setCenter,
  radius,
  setRadius,
  unit,
  setUnit,
  dragConstraints,
}) => {
  const map = useMap();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSetToCurrentCenter = () => {
    if (!map) return;
    const mapCenter = map.getCenter();
    if (mapCenter) {
      setCenter({
        lat: mapCenter.lat(),
        lng: mapCenter.lng(),
      });
    }
  };

  const maxRadius = unit === 'km' ? 15000 : 10000;
  const minRadius = unit === 'km' ? 500 : 300;
  const radiusStep = 100;

  return (
    <motion.div
      drag
      dragConstraints={dragConstraints}
      dragElastic={0.15}
      dragMomentum={false}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.98)" }}
      whileDrag={{ 
        scale: 1.03, 
        rotate: 1,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" 
      }}
      className="absolute top-4 left-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/60 shadow-xl flex flex-col gap-2.5 z-10 pointer-events-auto select-none w-[260px] shadow-slate-200/20 font-sans cursor-grab active:cursor-grabbing touch-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-800">
          <Target size={14} className={cn("text-indigo-600 transition-transform duration-300", enabled && "animate-pulse")} />
          <span className="text-xs font-extrabold tracking-tight">Search Radius</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Switch */}
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={cn(
              "w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500/30",
              enabled ? "bg-indigo-600" : "bg-slate-200"
            )}
            title={enabled ? "Disable radius filter" : "Enable radius filter"}
          >
            <div
              className={cn(
                "w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out",
                enabled ? "translate-x-3.5" : "translate-x-0"
              )}
            />
          </button>
          
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
          >
            <ChevronDown size={14} className={cn("transition-transform duration-200", isCollapsed && "rotate-180")} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex flex-col gap-3 overflow-hidden"
          >
            {!enabled ? (
              <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
                Enable this filter to visualize destinations within a specified travel range from your custom point.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5 pt-1">
                {/* Distance Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                    <span className="flex items-center gap-1"><SlidersHorizontal size={10} className="text-slate-400" /> Max Range</span>
                    <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md font-extrabold">
                      {radius.toLocaleString()} {unit.toUpperCase()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={minRadius}
                    max={maxRadius}
                    step={radiusStep}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 font-medium font-mono">
                    <span>{minRadius} {unit}</span>
                    <span>{maxRadius} {unit}</span>
                  </div>
                </div>

                {/* Unit selector and Reset center */}
                <div className="flex items-center justify-between gap-2 mt-1">
                  {/* Unit Tabs */}
                  <div className="flex p-0.5 bg-slate-150/70 border border-slate-250/30 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        if (unit === 'mi') {
                          setUnit('km');
                          setRadius(Math.round(radius * 1.60934 / 100) * 100);
                        }
                      }}
                      className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-md transition-all text-center cursor-pointer",
                        unit === 'km' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      KM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (unit === 'km') {
                          setUnit('mi');
                          setRadius(Math.max(minRadius, Math.min(maxRadius, Math.round(radius * 0.621371 / 100) * 100)));
                        }
                      }}
                      className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-md transition-all text-center cursor-pointer",
                        unit === 'mi' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      MI
                    </button>
                  </div>

                  {/* Set to Current Map Center */}
                  <button
                    type="button"
                    onClick={handleSetToCurrentCenter}
                    className="flex items-center gap-1 text-[9px] font-extrabold text-indigo-600 hover:text-indigo-700 bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100/30 py-1 px-2 rounded-lg cursor-pointer transition-colors"
                    title="Use center of active viewport"
                  >
                    <RefreshCw size={9} />
                    <span>Use view center</span>
                  </button>
                </div>

                {/* Center Coordinates & Help Info */}
                <div className="border-t border-slate-100/80 pt-2 flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 font-mono">
                    <Compass size={10} className="text-indigo-500 shrink-0" />
                    <span className="truncate">Center: {center.lat.toFixed(3)}°, {center.lng.toFixed(3)}°</span>
                  </div>
                  <p className="text-[8px] text-slate-400 italic">
                    💡 Click any point on the map screen to relocate coordinates.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface CountrySearchOverlayProps {
  onSelectCountry: (country: CountryInfo) => void;
  dragConstraints?: React.RefObject<Element | null>;
}

const CountrySearchOverlay: React.FC<CountrySearchOverlayProps> = ({ onSelectCountry, dragConstraints }) => {
  const map = useMap();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return [];
    const lower = search.toLowerCase();
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      c.region.toLowerCase().includes(lower)
    ).slice(0, 6);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountryClick = (country: CountryInfo) => {
    if (map) {
      map.panTo({ lat: country.lat, lng: country.lng });
      map.setZoom(country.zoom);
    }
    onSelectCountry(country);
    setSearch('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredCountries.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filteredCountries[activeIndex]) {
        handleCountryClick(filteredCountries[activeIndex]);
      } else if (filteredCountries.length > 0) {
        handleCountryClick(filteredCountries[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      drag
      dragConstraints={dragConstraints}
      dragElastic={0.15}
      dragMomentum={false}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.98)" }}
      whileDrag={{ 
        scale: 1.03, 
        rotate: -1,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" 
      }}
      className="absolute top-4 left-[284px] bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/60 shadow-xl flex flex-col gap-2 z-10 pointer-events-auto select-none w-[260px] shadow-slate-200/20 font-sans cursor-grab active:cursor-grabbing touch-none md:block hidden"
    >
      <div className="flex items-center gap-1.5 text-slate-800 mb-2">
        <Sparkles size={14} className="text-amber-500 animate-pulse" />
        <span className="text-xs font-extrabold tracking-tight">Global Country Search</span>
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl focus-within:border-indigo-500/50 focus-within:bg-white transition-all">
          <Search size={13} className="text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Type any country (e.g., Japan)..."
            className="bg-transparent border-none focus:outline-none w-full text-[11px] font-semibold text-slate-800 placeholder:text-slate-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {isOpen && filteredCountries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-100/80 overflow-hidden z-[110]"
            >
              <div className="p-1 max-h-[180px] overflow-y-auto scrollbar-thin">
                {filteredCountries.map((country, idx) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountryClick(country)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg transition-all flex items-center justify-between cursor-pointer",
                      idx === activeIndex ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold leading-none shrink-0" style={{ fontSize: '14px' }}>
                        {country.code ? String.fromCodePoint(...country.code.toUpperCase().split('').map(char =>  127397 + char.charCodeAt(0))) : "📍"}
                      </span>
                      <span className="text-[10px] font-extrabold truncate">{country.name}</span>
                    </div>
                    <span className="text-[8px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0 font-bold">
                      {country.region}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {search.trim() && filteredCountries.length === 0 && (
        <p className="text-[9px] text-slate-400 italic mt-1 pl-1">
          No matching countries found. Try another query.
        </p>
      )}

      {!search.trim() && (
        <p className="text-[8px] text-slate-400 italic mt-1 leading-normal pl-1">
          💡 Access any of the 190+ sovereign countries instantly. Map pans and positions with custom parameters.
        </p>
      )}
    </motion.div>
  );
};

const getDestinationCountry = (title: string): string => {
  const lower = title.toLowerCase();
  if (lower.includes('italy')) return 'Italy';
  if (lower.includes('japan')) return 'Japan';
  if (lower.includes('bali') || lower.includes('ubud') || lower.includes('indonesia')) return 'Indonesia';
  for (const c of COUNTRIES) {
    if (lower.includes(c.name.toLowerCase())) {
      return c.name;
    }
  }
  return '';
};

interface MapCountryFilterDropdownProps {
  selectedCountries: string[];
  onChange: (countries: string[]) => void;
  dragConstraints?: React.RefObject<Element | null>;
}

const MapCountryFilterDropdown: React.FC<MapCountryFilterDropdownProps> = ({
  selectedCountries,
  onChange,
  dragConstraints
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCountries = useMemo(() => {
    const lower = search.toLowerCase();
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      c.region.toLowerCase().includes(lower) ||
      c.code.toLowerCase().includes(lower)
    );
  }, [search]);

  const handleToggleCountry = (countryName: string) => {
    if (selectedCountries.includes(countryName)) {
      onChange(selectedCountries.filter(c => c !== countryName));
    } else {
      onChange([...selectedCountries, countryName]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <motion.div
      ref={containerRef}
      drag
      dragConstraints={dragConstraints}
      dragElastic={0.15}
      dragMomentum={false}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.98)" }}
      whileDrag={{ 
        scale: 1.03, 
        rotate: -1,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" 
      }}
      className="absolute top-4 left-[552px] bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/60 shadow-xl flex flex-col gap-2 z-10 pointer-events-auto select-none w-[260px] shadow-slate-200/20 font-sans cursor-grab active:cursor-grabbing touch-none md:block hidden"
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-1.5 text-slate-800">
          <SlidersHorizontal size={13} className="text-indigo-600" />
          <span className="text-xs font-extrabold tracking-tight">
            Filter Countries
          </span>
          {selectedCountries.length > 0 && (
            <motion.span 
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="inline-flex items-center justify-center bg-indigo-600 text-[8px] font-black text-white h-4 min-w-[16px] px-1 rounded-full shadow-sm shadow-indigo-200 leading-none shrink-0"
            >
              {selectedCountries.length}
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedCountries.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="text-[9px] hover:text-indigo-600 hover:underline text-slate-400 font-extrabold uppercase tracking-wider pr-1 cursor-pointer outline-none border-none bg-transparent"
            >
              Clear
            </button>
          )}
          <ChevronDown 
            size={12} 
            className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} 
          />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex flex-col gap-2 mt-1"
          >
            <div className="relative">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-xl focus-within:border-indigo-500/50 focus-within:bg-white transition-all">
                <Search size={12} className="text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search countries..."
                  className="bg-transparent border-none focus:outline-none w-full text-[10px] font-semibold text-slate-800 placeholder:text-slate-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer outline-none bg-transparent border-none"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[160px] overflow-y-auto pr-1 scrollbar-thin flex flex-col gap-1">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => {
                  const isChecked = selectedCountries.includes(country.name);
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleToggleCountry(country.name)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg transition-all flex items-center justify-between cursor-pointer text-slate-700 hover:bg-slate-50",
                        isChecked && "bg-indigo-50 text-indigo-700 font-bold"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs shrink-0" style={{ fontSize: '12px' }}>
                          {country.code ? String.fromCodePoint(...country.code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))) : "📍"}
                        </span>
                        <span className="text-[9.5px] font-extrabold truncate">{country.name}</span>
                      </div>
                      
                      <div className="flex items-center shrink-0">
                        {isChecked ? (
                          <div className="h-3.5 w-3.5 rounded-md bg-indigo-600 flex items-center justify-center text-white scale-[0.85]">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-md border border-slate-300 hover:border-indigo-500 bg-white scale-[0.85]" />
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-[9px] text-slate-400 italic text-center py-2">
                  No match found
                </p>
              )}
            </div>

            {selectedCountries.length > 0 && (
              <div className="flex justify-end pt-2 border-t border-slate-100 mt-1">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 transition-all font-black tracking-tight px-2.5 py-1.5 rounded-xl border border-rose-150 hover:border-rose-200/60 cursor-pointer outline-none bg-white shadow-sm flex items-center gap-1 active:scale-[0.98]"
                >
                  <X size={10} strokeWidth={3} />
                  Clear All
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <div className="flex flex-wrap gap-1 max-h-[36px] overflow-hidden mt-0.5">
          {selectedCountries.length > 0 ? (
            selectedCountries.map(name => {
              const info = COUNTRIES.find(c => c.name === name);
              return (
                <span 
                  key={name}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleCountry(name);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/50 text-[8.5px] font-black tracking-tight text-indigo-700 cursor-pointer"
                >
                  <span style={{ fontSize: '10px' }}>
                    {info?.code ? String.fromCodePoint(...info.code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))) : "📍"}
                  </span>
                  <span>{name}</span>
                  <X size={7} className="text-indigo-400" />
                </span>
              );
            })
          ) : (
            <p className="text-[8px] text-slate-400 italic leading-none pl-1 py-0.5 select-none">
              📍 Showing all destinations worldwide
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Pre-trip checklist overlay for planning destinations
interface ChecklistItem {
  id: string;
  task: string;
  checked: boolean;
}

const DEFAULT_MAP_CHECKLIST: ChecklistItem[] = [
  { id: '1', task: 'Passport (valid > 6 months)', checked: true },
  { id: '2', task: 'Check Visa / e-Visa requirements', checked: false },
  { id: '3', task: 'Book flights & hotel deals', checked: false },
  { id: '4', task: 'Purchase travel insurance cover', checked: false },
  { id: '5', task: 'Notify bank & card of travel', checked: false },
  { id: '6', task: 'Get international eSIM / SIM', checked: false },
];

interface MapPreTripChecklistProps {
  dragConstraints?: React.RefObject<Element | null>;
}

const MapPreTripChecklist: React.FC<MapPreTripChecklistProps> = ({ dragConstraints }) => {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem('wanderlust_map_checklist_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse map checklist from localStorage:', e);
    }
    return DEFAULT_MAP_CHECKLIST;
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    localStorage.setItem('wanderlust_map_checklist_v1', JSON.stringify(items));
  }, [items]);

  const handleToggle = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItem.trim()) return;
    const newItemObj: ChecklistItem = {
      id: Date.now().toString(),
      task: newItem.trim(),
      checked: false,
    };
    setItems(prev => [...prev, newItemObj]);
    setNewItem('');
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    setItems(DEFAULT_MAP_CHECKLIST);
  };

  const completedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <motion.div
      drag
      dragConstraints={dragConstraints}
      dragElastic={0.15}
      dragMomentum={false}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.98)" }}
      whileDrag={{ 
        scale: 1.03, 
        rotate: 1,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" 
      }}
      className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/60 shadow-xl flex flex-col gap-2.5 z-10 pointer-events-auto select-none w-[280px] shadow-slate-200/20 font-sans cursor-grab active:cursor-grabbing touch-none"
    >
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-1.5 text-slate-800">
          <CheckCircle2 size={14} className={cn("text-emerald-500 transition-transform duration-300", completionPercentage === 100 && "scale-110 text-indigo-600")} />
          <span className="text-xs font-extrabold tracking-tight">Pre-trip Checklist</span>
          <span className="text-[9px] font-black font-mono text-slate-400 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded-full leading-none">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            title="Reset to defaults"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer outline-none border-none bg-transparent"
          >
            <RotateCcw size={11} />
          </button>
          <ChevronDown 
            size={12} 
            className={cn("text-slate-400 transition-transform duration-200", isCollapsed && "rotate-180")} 
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex flex-col gap-2.5 mt-1 pointer-events-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Completed Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-slate-500">
                <span>PLANNED IN MAP</span>
                <span>{completionPercentage}% DONE</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/20">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 15 }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full"
                />
              </div>
            </div>

            {/* Checklist Scrollable Container */}
            <div className="max-h-[160px] overflow-y-auto pr-1 scrollbar-thin flex flex-col gap-1.5">
              {items.length > 0 ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-xl border border-slate-100 transition-all cursor-pointer hover:bg-slate-50",
                      item.checked ? "bg-slate-50/50 border-slate-150" : "bg-white"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <div className="flex items-center shrink-0">
                        {item.checked ? (
                          <div className="h-3.5 w-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-slate-300 hover:border-emerald-500 bg-white transition-colors" />
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold text-slate-700 leading-tight truncate",
                        item.checked && "line-through text-slate-400 font-medium"
                      )}>
                        {item.task}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-50/50 transition-colors shrink-0 outline-none border-none bg-transparent"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-[10px] text-slate-400 italic">No checklist items. Add one below!</p>
                </div>
              )}
            </div>

            {/* Add Custom Item Form */}
            <form onSubmit={handleAddItem} className="flex gap-1.5 pt-1.5 border-t border-slate-100">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add essential item (e.g., Visas)..."
                className="flex-1 bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer outline-none shrink-0"
              >
                <Plus size={11} strokeWidth={3} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const [searchType, setSearchType] = useState<'flights' | 'hotels' | 'cruises'>('flights');
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('');
  const [date, setDate] = useState('');
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
    popular: true,
    trending: true,
    seasonal: true
  });
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [searchRadiusEnabled, setSearchRadiusEnabled] = useState(true);
  const [searchRadiusCenter, setSearchRadiusCenter] = useState<google.maps.LatLngLiteral>({ lat: 20, lng: 0 });
  const [searchRadiusValue, setSearchRadiusValue] = useState(5000); // 5000 units by default
  const [searchRadiusUnit, setSearchRadiusUnit] = useState<'km' | 'mi'>('km');
  const [selectedCountryOnMap, setSelectedCountryOnMap] = useState<CountryInfo | null>(null);
  const [selectedFilterCountries, setSelectedFilterCountries] = useState<string[]>([]);
  const [userGeoLocation, setUserGeoLocation] = useState<google.maps.LatLngLiteral | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserGeoLocation(userLoc);
          setSearchRadiusCenter(prev => {
            // Only update default search center if not modified by user clicking
            if (prev.lat === 20 && prev.lng === 0) {
              return userLoc;
            }
            return prev;
          });
        },
        (error) => {
          console.log("Geolocation lookup failed/denied:", error);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    }
  }, []);

  useEffect(() => {
    if (isMapFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMapFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMapFullscreen(false);
      }
    };
    if (isMapFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMapFullscreen]);

  const saveMapPreferences = async (newCategories: Record<string, boolean>, newMapTypeId: string) => {
    if (!user) return;
    const prefPath = `users/${user.uid}/settings/mapPreferences`;
    try {
      const prefRef = doc(db, 'users', user.uid, 'settings', 'mapPreferences');
      await setDoc(prefRef, {
        visibleCategories: newCategories,
        mapTypeId: newMapTypeId,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving map preferences:", error);
      handleFirestoreError(error, OperationType.WRITE, prefPath, user.uid, user.email, user.emailVerified);
    }
  };

  const handleGlobalSearch = () => {
    if (!destination) return;
    const type = searchType === 'flights' ? 'flight' : searchType === 'hotels' ? 'hotel' : 'cruise';
    navigate(`/search?type=${type}&dest=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}&origin=${encodeURIComponent(origin)}`);
  };

  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [likedDestinations, setLikedDestinations] = useState<string[]>([]);

  const fetchLikes = async () => {
    if (!user) return;
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      const snapshot = await getDocs(savedRef);
      setLikedDestinations(snapshot.docs.map(d => d.data().title));
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const handleSaveDestination = async (dest: any) => {
    if (!user) return;
    setIsSaving(dest.title);
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      const q = query(savedRef, where('title', '==', dest.title));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'users', user.uid, 'savedDestinations', d.id)));
        await Promise.all(deletePromises);
        setLikedDestinations(prev => prev.filter(t => t !== dest.title));
        showToast(`Removed "${dest.title}" from saved destinations.`, "info");
      } else {
        await addDoc(savedRef, {
          type: 'destination',
          title: dest.title,
          location: dest.subtitle,
          imageUrl: dest.image,
          rating: 4.9,
          price: 0,
          recommendation: dest.subtitle,
          createdAt: serverTimestamp()
        });
        setLikedDestinations(prev => [...prev, dest.title]);
        showToast(`"${dest.title}" saved to your destinations!`, "success");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsSaving(null);
    }
  };

  const fetchMapPreferences = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoadingPreferences(true);
    const prefPath = `users/${user.uid}/settings/mapPreferences`;
    try {
      const prefRef = doc(db, 'users', user.uid, 'settings', 'mapPreferences');
      const snap = await getDoc(prefRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.visibleCategories) {
          setVisibleCategories(data.visibleCategories);
        }
        if (data.mapTypeId) {
          setMapTypeId(data.mapTypeId);
        }
      }
    } catch (error) {
      console.error("Error fetching map preferences:", error);
      handleFirestoreError(error, OperationType.GET, prefPath, user.uid, user.email, user.emailVerified);
    } finally {
      if (!silent) setIsLoadingPreferences(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLikes();
      fetchMapPreferences();
    }
  }, [user, fetchMapPreferences]);

  // Silent interval background sync of map visible categories & map style preferences every 5 minutes
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      fetchMapPreferences(true);
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    return () => clearInterval(intervalId);
  }, [user, fetchMapPreferences]);

  // Pre-calculate custom active map destinations & matching radius counts
  const filteredMapDestinations = useMemo(() => {
    return TRENDING_DESTINATIONS.filter((dest) => {
      const catLower = (dest.tag || '').toLowerCase();
      if (visibleCategories[catLower] === false) return false;
      if (selectedFilterCountries.length > 0) {
        const destCountry = getDestinationCountry(dest.title);
        if (!selectedFilterCountries.some(cName => cName.toLowerCase() === destCountry.toLowerCase())) {
          return false;
        }
      }
      if (searchRadiusEnabled && searchRadiusCenter) {
        const dist = getHaversineDistance(
          searchRadiusCenter.lat,
          searchRadiusCenter.lng,
          dest.coordinates.lat,
          dest.coordinates.lng,
          searchRadiusUnit
        );
        return dist <= searchRadiusValue;
      }
      return true;
    });
  }, [visibleCategories, selectedFilterCountries, searchRadiusEnabled, searchRadiusCenter, searchRadiusValue, searchRadiusUnit]);

  const destinationsInRadiusCount = useMemo(() => {
    return TRENDING_DESTINATIONS.filter((dest) => {
      const catLower = (dest.tag || '').toLowerCase();
      if (visibleCategories[catLower] === false) return false;
      if (selectedFilterCountries.length > 0) {
        const destCountry = getDestinationCountry(dest.title);
        if (!selectedFilterCountries.some(cName => cName.toLowerCase() === destCountry.toLowerCase())) {
          return false;
        }
      }
      if (searchRadiusCenter) {
        const dist = getHaversineDistance(
          searchRadiusCenter.lat,
          searchRadiusCenter.lng,
          dest.coordinates.lat,
          dest.coordinates.lng,
          searchRadiusUnit
        );
        return dist <= searchRadiusValue;
      }
      return false;
    }).length;
  }, [visibleCategories, selectedFilterCountries, searchRadiusCenter, searchRadiusValue, searchRadiusUnit]);

  return (
    <main className="pt-20">
      {/* Hero Section */}
      <section className="relative h-[80vh] w-full overflow-hidden flex items-center px-12 lg:px-24">
        <div className="absolute inset-0 z-0">
          <img 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjreJ4nAvno6qhAaL69aLOaNhzsecKZ1_K6VtxmMErsi_gQmFhyVyP0e2THJxBeXEX7N7m9eImCDwoegsXSVXhD3PDRk64QEnWm1dP4QcJYTf_mHllmPovljkmQVSpMQ12OL9UgG5i0ARNOkGzfXSidnEpYiH1ogN5HDSk-cZBYhP1kl0TU6NNGL-Y1Ex4DcHPFvzFoG8-o857xtIcQWYcE5Zlz3BHfPXlxuIf111S88eLC__B_0hvIh8TVRJMAHZ36s2WecwK9DA" 
            alt="Pristine beach"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-on-surface/40 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-3xl">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-tertiary-fixed font-headline font-bold tracking-[0.2em] mb-4 block"
          >
            PREMIUM TRAVEL EXPERIENCES
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white text-6xl lg:text-8xl font-headline font-extrabold tracking-tighter leading-[0.9] mb-8"
          >
            Your Personal<br />Digital Concierge
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/90 text-xl max-w-xl font-body leading-relaxed mb-12"
          >
            Experience travel curated for your soul. From hidden coastal gems to bustling metropolitan escapes, we bridge the gap between luxury and discovery.
          </motion.p>
        </div>
      </section>

      {/* Search Interface */}
      <section className="relative z-20 -mt-24 px-12 lg:px-24">
        <div className="bg-white rounded-xl shadow-2xl p-8 lg:p-12 max-w-7xl mx-auto">
          <div className="flex gap-2 sm:gap-4 md:gap-8 mb-10 overflow-x-auto pb-2 scrollbar-hide">
            <Link 
              to="/flights"
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full font-semibold text-xs sm:text-base transition-all transition-colors",
                searchType === 'flights' ? "bg-secondary-fixed text-on-secondary-fixed" : "hover:bg-surface-container-low text-on-surface-variant"
              )}
            >
              <PlaneTakeoff size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Flights</span>
            </Link>
            <Link 
              to="/hotels"
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full font-semibold text-xs sm:text-base transition-all transition-colors",
                searchType === 'hotels' ? "bg-secondary-fixed text-on-secondary-fixed" : "hover:bg-surface-container-low text-on-surface-variant"
              )}
            >
              <Hotel size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Hotels</span>
            </Link>
            <Link 
              to="/cruises"
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full font-semibold text-xs sm:text-base transition-all transition-colors",
                searchType === 'cruises' ? "bg-secondary-fixed text-on-secondary-fixed" : "hover:bg-surface-container-low text-on-surface-variant"
              )}
            >
              <Ship size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Cruises</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-on-surface-variant tracking-widest mb-3 uppercase">Destination</label>
              <AutocompleteInput 
                value={destination}
                onChange={setDestination}
                placeholder="Where to next?"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-on-surface-variant tracking-widest mb-3 uppercase">Dates</label>
              <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-lg">
                <Navigation size={20} className="text-secondary" />
                <input 
                  className="bg-transparent border-none focus:outline-none w-full text-on-surface font-medium placeholder:text-outline-variant" 
                  placeholder="Select dates" 
                  type="text" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-on-surface-variant tracking-widest mb-3 uppercase">Origin (Flights)</label>
              <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-lg">
                <Navigation size={20} className="text-secondary" />
                <input 
                  className="bg-transparent border-none focus:outline-none w-full text-on-surface font-medium placeholder:text-outline-variant" 
                  placeholder="From which city?" 
                  type="text" 
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                />
              </div>
            </div>
            <button 
              onClick={handleGlobalSearch}
              className="h-[60px] bg-secondary text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-secondary/20"
            >
              <Search size={20} />
              Search Deals
            </button>
          </div>
        </div>
      </section>

      {/* Detailed Flight Search Section */}
      <section className="py-24 px-12 lg:px-24 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl lg:text-5xl font-headline font-bold tracking-tighter text-on-surface mb-4">Book Exclusive Routes</h2>
            <p className="text-on-surface-variant max-w-lg font-body">Direct connections to the world's most sought-after luxury destinations.</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Origin & Destination */}
              <div className="lg:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase">Origin</label>
                  <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl border border-transparent focus-within:border-secondary/20 transition-all">
                    <PlaneTakeoff size={18} className="text-secondary" />
                    <input 
                      className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm placeholder:text-outline-variant/60" 
                      placeholder="City or Airport" 
                      type="text" 
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase">Destination</label>
                  <AutocompleteInput 
                    value={destination}
                    onChange={setDestination}
                    placeholder="Where to?"
                    icon={<PlaneLanding size={18} className="text-secondary" />}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase">Departure</label>
                  <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                    <Calendar size={18} className="text-secondary" />
                    <input 
                      className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase">Return</label>
                  <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                    <Calendar size={18} className="text-secondary" />
                    <input className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" type="date" />
                  </div>
                </div>
              </div>

              {/* Passengers & Search */}
              <div className="lg:col-span-3 flex flex-col md:flex-row lg:flex-col gap-4">
                <div className="flex-1 space-y-3">
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase">Passengers</label>
                  <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                    <Users size={18} className="text-secondary" />
                    <select 
                      className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm appearance-none"
                      defaultValue="2 Passengers"
                    >
                      <option>1 Passenger</option>
                      <option>2 Passengers</option>
                      <option>3 Passengers</option>
                      <option>4+ Passengers</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/search?type=flight&dest=${encodeURIComponent(destination)}&origin=${encodeURIComponent(origin)}&date=${encodeURIComponent(date)}`)}
                  className="h-[60px] lg:h-auto lg:py-4 bg-on-surface text-white rounded-xl font-bold text-sm flex-1 flex items-center justify-center gap-2 hover:bg-secondary transition-all shadow-lg"
                >
                  Search Flights <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Destinations */}
      <section className="py-24 px-12 lg:px-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
          <div>
            <h2 className="text-4xl lg:text-5xl font-headline font-bold tracking-tighter text-on-surface mb-4">Trending Destinations</h2>
            <p className="text-on-surface-variant max-w-lg font-body">Hand-picked locations that our community is falling in love with this season.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex p-1 bg-slate-100 rounded-full border border-slate-200">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full transition-all text-xs font-bold whitespace-nowrap",
                  viewMode === 'grid' ? "bg-white text-secondary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                )}
                title="Grid View"
              >
                <Grid size={14} />
                <span>Grid</span>
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full transition-all text-xs font-bold whitespace-nowrap",
                  viewMode === 'map' ? "bg-white text-secondary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                )}
                title="View on Map"
              >
                <MapIcon size={14} />
                <span>View on Map</span>
              </button>
            </div>
            <button 
              onClick={() => navigate('/destinations')}
              className="text-secondary font-bold flex items-center gap-2 hover:gap-3 transition-all text-sm"
            >
              View All Destinations <Navigation size={18} />
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TRENDING_DESTINATIONS.map((dest) => (
              <DestinationCard 
                key={dest.title}
                title={dest.title}
                subtitle={dest.subtitle}
                image={dest.image}
                tag={dest.tag}
                isLiked={likedDestinations.includes(dest.title)}
                isSaving={isSaving === dest.title}
                onLike={() => handleSaveDestination(dest)}
                coordinates={dest.coordinates}
              />
            ))}
          </div>
        ) : (
          <motion.div 
            ref={mapContainerRef}
            layout="position"
            animate={isMapFullscreen ? {
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            } : (activeMarker ? {
              boxShadow: [
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                "0 20px 25px -5px rgba(2, 132, 199, 0.35), 0 10px 10px -5px rgba(2, 132, 199, 0.15)",
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              ]
            } : {
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            })}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 26,
              boxShadow: activeMarker ? {
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut"
              } : {
                duration: 0.3
              }
            }}
            className={cn(
              "overflow-hidden bg-slate-50 border transition-all duration-300",
              isMapFullscreen 
                ? "fixed inset-0 z-[100] h-screen w-screen rounded-none border-none shadow-none" 
                : "relative rounded-3xl h-[500px] border-slate-200 shadow-xl"
            )}
          >
            {isMapFullscreen && (
              <motion.div 
                initial={{ opacity: 0, y: -20, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-[101] flex items-center gap-3 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md text-white/95 px-4 py-2.5 rounded-full shadow-2.5xl border border-white/10 text-xs font-semibold font-sans pointer-events-auto select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-bold tracking-wider text-emerald-400 uppercase text-[9px]">Live Globe</span>
                </div>
                <span className="text-white/60 font-medium">Immersive Wanderlust View</span>
                <span className="text-white/20 select-none">|</span>
                <div className="flex items-center gap-1 text-[10px] text-white/50">
                  <kbd className="bg-white/15 px-2 py-0.5 rounded border border-white/15 text-white/80 font-mono text-[9px]">ESC</kbd>
                  <span>to exit</span>
                </div>
              </motion.div>
            )}
            {!hasValidKey ? (
              <div className="absolute inset-0 flex items-center justify-center p-8 bg-slate-50">
                <div className="text-center max-w-sm sm:max-w-md bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-100">
                  <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-secondary">
                    <MapPin size={24} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-headline font-bold text-on-surface mb-2">Google Maps API Key Required</h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant mb-6 leading-relaxed">
                    To see trending destinations on an interactive map, please configure a Google Maps platform credential.
                  </p>
                  <div className="text-left space-y-2 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-150 text-[11px] text-on-surface-variant font-medium">
                    <p><strong>Step 1:</strong> Get an API key from the <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Google Cloud Console</a>.</p>
                    <p><strong>Step 2:</strong> Open **Settings** (⚙️ gear icon, top-right corner) → **Secrets**.</p>
                    <p><strong>Step 3:</strong> Type <code>GOOGLE_MAPS_PLATFORM_KEY</code>, press **Enter**, and paste your key.</p>
                  </div>
                  <p className="text-[10px] text-on-surface-variant">The application will build automatically once updated.</p>
                </div>
              </div>
            ) : (
              <APIProvider apiKey={API_KEY} version="weekly">
                <div className="relative w-full h-full">
                  {/* Floating Immersive Full-Screen Toggle Button & Map Style Toggle */}
                  <div className="absolute top-4 right-4 z-10 pointer-events-auto flex items-center gap-2">
                    {/* Dynamic Map Dest Stats Chip */}
                    <motion.div 
                      id="map-visible-stats-chip"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md rounded-xl border border-white/10 text-[10px] font-bold text-white shadow-md shadow-slate-900/10 font-sans select-none"
                    >
                      {searchRadiusEnabled && searchRadiusCenter ? (
                        <>
                          <Target size={11} className="text-indigo-400 shrink-0 animate-pulse" />
                          <span className="text-white/60 font-medium font-sans">In Radius:</span>
                          <span className="text-white bg-indigo-500/25 border border-indigo-400/25 px-1.5 py-0.5 rounded text-[10px] font-black font-mono leading-none">
                            {destinationsInRadiusCount}
                          </span>
                        </>
                      ) : (
                        <>
                          <Compass size={11} className="text-emerald-400 shrink-0" />
                          <span className="text-white/60 font-medium font-sans">Visible:</span>
                          <span className="text-white bg-emerald-500/25 border border-emerald-400/25 px-1.5 py-0.5 rounded text-[10px] font-black font-mono leading-none">
                            {filteredMapDestinations.length}
                          </span>
                        </>
                      )}
                    </motion.div>

                    {/* Map Style Toggle */}
                    <div className="flex bg-white/95 backdrop-blur-md p-0.5 rounded-xl border border-slate-200/60 shadow-md shadow-slate-200/20">
                      <button
                        type="button"
                        onClick={() => {
                          setMapTypeId('roadmap');
                          saveMapPreferences(visibleCategories, 'roadmap');
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer outline-none font-sans",
                          mapTypeId === 'roadmap'
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                        id="map-style-roadmap-btn"
                        title="Roadmap View"
                      >
                        Roadmap
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMapTypeId('satellite');
                          saveMapPreferences(visibleCategories, 'satellite');
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer outline-none font-sans",
                          mapTypeId === 'satellite'
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                        id="map-style-satellite-btn"
                        title="Satellite View"
                      >
                        Satellite
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                      className="group/full flex items-center justify-center gap-1.5 py-2 px-3.5 bg-white/95 backdrop-blur-md text-slate-700 hover:text-indigo-600 border border-slate-200/60 hover:bg-white font-bold rounded-xl text-xs shadow-md shadow-slate-200/20 transition-all duration-200 cursor-pointer outline-none font-sans"
                      title={isMapFullscreen ? "Exit Immersive Mode" : "Expand to Immersive Full-Screen"}
                      id="map-immersive-toggle-btn"
                    >
                      {isMapFullscreen ? (
                        <>
                          <Minimize2 size={13} className="text-secondary shrink-0 group-hover/full:scale-110 transition-transform" />
                          <span>Exit Fullsize</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 size={13} className="text-secondary shrink-0 group-hover/full:scale-110 transition-transform" />
                          <span>Immersive Map</span>
                        </>
                      )}
                    </button>
                  </div>

                  <Map
                    defaultCenter={{ lat: 20, lng: 0 }}
                    defaultZoom={1.8}
                    mapId="DEMO_MAP_ID"
                    mapTypeId={mapTypeId}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                    onClick={(e) => {
                      if (searchRadiusEnabled && e.detail?.latLng) {
                        const latVal = typeof e.detail.latLng.lat === 'function' ? e.detail.latLng.lat() : (e.detail.latLng as any).lat;
                        const lngVal = typeof e.detail.latLng.lng === 'function' ? e.detail.latLng.lng() : (e.detail.latLng as any).lng;
                        if (typeof latVal === 'number' && typeof lngVal === 'number') {
                          setSearchRadiusCenter({ lat: latVal, lng: lngVal });
                        }
                      }
                    }}
                  >
                    {searchRadiusEnabled && searchRadiusCenter && (
                      <MapRadiusCircle
                        center={searchRadiusCenter}
                        radius={searchRadiusValue}
                        unit={searchRadiusUnit}
                      />
                    )}

                    {searchRadiusEnabled && searchRadiusCenter && (
                      <AdvancedMarker position={searchRadiusCenter}>
                        <div className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow-md border border-indigo-600/30">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400/65"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                        </div>
                      </AdvancedMarker>
                    )}

                    {selectedCountryOnMap && (
                      <AdvancedMarker position={{ lat: selectedCountryOnMap.lat, lng: selectedCountryOnMap.lng }}>
                        <div className="flex flex-col items-center select-none cursor-pointer">
                          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl border border-indigo-200 flex items-center gap-2 max-w-[200px]">
                            <span style={{ fontSize: '16px' }}>
                              {selectedCountryOnMap.code ? String.fromCodePoint(...selectedCountryOnMap.code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))) : "📍"}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black tracking-tight text-slate-800 leading-none">{selectedCountryOnMap.name}</span>
                              <span className="text-[7px] text-slate-500 font-medium truncate leading-normal mt-0.5">{selectedCountryOnMap.tagline}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCountryOnMap(null);
                              }}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </div>
                          <div className="w-2 h-2 bg-white/95 border-b border-r border-indigo-200 rotate-45 -mt-1 shadow-md"></div>
                        </div>
                      </AdvancedMarker>
                    )}

                    <ClusteredTrendingMarkers
                      destinations={filteredMapDestinations}
                      likedDestinations={likedDestinations}
                      isSaving={isSaving}
                      handleSaveDestination={handleSaveDestination}
                      activeMarker={activeMarker}
                      setActiveMarker={setActiveMarker}
                      userGeoLocation={userGeoLocation}
                      searchRadiusCenter={searchRadiusCenter}
                      searchRadiusUnit={searchRadiusUnit}
                    />
                  </Map>

                  {/* Search Radius Interactive Panel Overlay */}
                  <SearchRadiusTool 
                    enabled={searchRadiusEnabled}
                    setEnabled={setSearchRadiusEnabled}
                    center={searchRadiusCenter}
                    setCenter={setSearchRadiusCenter}
                    radius={searchRadiusValue}
                    setRadius={setSearchRadiusValue}
                    unit={searchRadiusUnit}
                    setUnit={setSearchRadiusUnit}
                    dragConstraints={mapContainerRef}
                  />

                  {/* Interactive Dynamic Category Legend Overlay */}
                  <MapLegend 
                    visibleCategories={visibleCategories}
                    onToggleCategory={(category) => {
                      const updated = {
                        ...visibleCategories,
                        [category]: !visibleCategories[category]
                      };
                      setVisibleCategories(updated);
                      saveMapPreferences(updated, mapTypeId);
                    }}
                    mapTypeId={mapTypeId}
                    onMapTypeIdChange={(newMapTypeId) => {
                      setMapTypeId(newMapTypeId);
                      saveMapPreferences(visibleCategories, newMapTypeId);
                    }}
                    dragConstraints={mapContainerRef}
                  />

                  {/* Global Country Search Tool Overlay */}
                  <CountrySearchOverlay
                    onSelectCountry={(country) => {
                      setSelectedCountryOnMap(country);
                      setSearchRadiusCenter({ lat: country.lat, lng: country.lng });
                    }}
                    dragConstraints={mapContainerRef}
                  />

                  {/* Filter Dropdown Menu Overlay */}
                  <MapCountryFilterDropdown
                    selectedCountries={selectedFilterCountries}
                    onChange={setSelectedFilterCountries}
                    dragConstraints={mapContainerRef}
                  />

                  {/* Pre-trip Checklist Quick-Access Overlay */}
                  <MapPreTripChecklist dragConstraints={mapContainerRef} />

                  {/* Selected Country Travel Card Overlay */}
                  <AnimatePresence>
                    {selectedCountryOnMap && (
                      <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-2xl px-5 py-4 border border-indigo-200/80 shadow-2xl flex items-center gap-4 z-10 pointer-events-auto max-w-[90%] w-[380px] shadow-indigo-100/30 font-sans"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50/50 text-2xl border border-indigo-100/30 shadow-inner select-none shrink-0 font-sans">
                          {selectedCountryOnMap.code ? String.fromCodePoint(...selectedCountryOnMap.code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))) : "📍"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black tracking-tight text-slate-900 leading-none">{selectedCountryOnMap.name}</h4>
                            <span className="text-[7.5px] uppercase tracking-widest font-extrabold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100/20 font-mono">
                              {selectedCountryOnMap.region}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-slate-600 mt-1.5 font-bold font-body leading-relaxed italic line-clamp-2">
                            "{selectedCountryOnMap.tagline}"
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/search?type=all&dest=${encodeURIComponent(selectedCountryOnMap.name)}`);
                            }}
                            className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-lg cursor-pointer transition-colors shadow-sm shadow-indigo-200 outline-none"
                          >
                            <span>Explore Deals</span>
                            <ArrowRight size={8} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCountryOnMap(null)}
                            className="text-center font-bold text-[8.5px] text-slate-400 hover:text-slate-600 py-1 transition-colors cursor-pointer outline-none"
                          >
                            Clear Map
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </APIProvider>
            )}
          </motion.div>
        )}
      </section>
    </main>
  );
};

const getWeatherDetails = (code: number) => {
  if (code === 0) return { label: 'Clear Sky', icon: Sun, color: 'text-amber-400', tip: 'Brilliant sunshine. Excellent for sightseeing, temple strolls, and clear photos.' };
  if ([1, 2, 3].includes(code)) return { label: 'Partly Cloudy', icon: Cloud, color: 'text-sky-300', tip: 'Mild sky cover. Highly comfortable for general excursions and local exploration.' };
  if ([45, 48].includes(code)) return { label: 'Mist & Fog', icon: Cloud, color: 'text-slate-300', tip: 'Intriguing atmospheric mist. Offers ideal lighting for moody photography.' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { label: 'Rain Showers', icon: CloudRain, color: 'text-sky-400', tip: 'Passing rainfall. Perfect opportunity to explore boutique markets or warm tea lounges.' };
  if ([71, 73, 75].includes(code)) return { label: 'Snowy Breeze', icon: CloudSnow, color: 'text-blue-200', tip: 'Crisp winter snowflakes. Bundle up warmly and enjoy a hot drink at a scenic cafe.' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorms', icon: CloudLightning, color: 'text-amber-500', tip: 'Active electrical storms. Best suited for indoor galleries, museum curation, or hot springs.' };
  return { label: 'Calm Weather', icon: Cloud, color: 'text-slate-300', tip: 'Pleasant travel parameters. Prepare for a magnificent exploring itinerary.' };
};

const DestinationCard = ({ title, subtitle, image, tag, isLiked, isSaving, onLike, coordinates }: any) => {
  const [showWeather, setShowWeather] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/search?dest=${encodeURIComponent(title)}&type=flight`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (showWeather && !weather && coordinates) {
      setLoading(true);
      setError(null);
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lng}&current_weather=true`)
        .then(res => {
          if (!res.ok) throw new Error("Could not fetch current weather");
          return res.json();
        })
        .then(data => {
          if (data && data.current_weather) {
            setWeather({
              temp: Math.round(data.current_weather.temperature),
              wind: Math.round(data.current_weather.windspeed),
              isDay: data.current_weather.is_day === 1,
              conditionCode: data.current_weather.weathercode
            });
          } else {
            throw new Error("Invalid format");
          }
        })
        .catch(err => {
          console.error("Weather load failed:", err);
          setError("Weather service temporarily offline");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [showWeather, coordinates, weather]);

  const weatherDetails = weather ? getWeatherDetails(weather.conditionCode) : null;
  const WeatherIconComponent = weatherDetails?.icon || Cloud;

  return (
    <div className="group relative rounded-xl overflow-hidden h-[500px] cursor-pointer shadow-xl border border-slate-100 bg-slate-100 flex flex-col justify-end">
      <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={image} alt={title} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent"></div>
      
      {/* Upper-right Tag & Social Share */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-30" onMouseLeave={() => setShowShare(false)}>
        <div className="bg-tertiary-fixed text-on-tertiary-fixed px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">{tag}</div>
        
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowShare(!showShare);
            }}
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center transition-all shadow-md hover:scale-[1.08] active:scale-95",
              showShare 
                ? "bg-secondary text-white" 
                : "bg-white/95 backdrop-blur-md text-on-surface-variant/60 hover:text-secondary"
            )}
            title="Share Destination"
          >
            <Share2 size={15} />
          </button>

          <AnimatePresence>
            {showShare && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-4 z-40 text-left font-sans flex flex-col gap-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Share Voyage</span>
                  <button 
                    onClick={() => setShowShare(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-50 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>

                {/* Copy Link Row */}
                <div className="space-y-1">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Shared Link</p>
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-1.5 pl-2">
                    <span className="text-[10px] text-slate-500 truncate flex-1 font-mono">{shareUrl}</span>
                    <button
                      onClick={handleCopy}
                      className={cn(
                        "p-1.5 rounded-lg transition-all flex items-center justify-center shrink-0",
                        copied 
                          ? "bg-emerald-500 text-white" 
                          : "bg-secondary/10 text-secondary hover:bg-secondary/15"
                      )}
                      title={copied ? "Copied!" : "Copy URL"}
                    >
                      {copied ? <Check size={11} className="shrink-0" /> : <Copy size={11} className="shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Quick Share Networks */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out this incredible trending trip on Roam: " + title + "! " + shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-[9px] font-black tracking-wide text-slate-700 uppercase"
                  >
                    <MessageSquare size={11} className="text-emerald-500 shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent("Stunning travel recommendation: " + title)}&body=${encodeURIComponent("Have a look at this destination!\n\n" + subtitle + "\n\nDirect link: " + shareUrl)}`}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-[9px] font-black tracking-wide text-slate-700 uppercase"
                  >
                    <Mail size={11} className="text-amber-500 shrink-0" />
                    <span>Email</span>
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Upper-left Action Buttons Bundle */}
      <div className="absolute top-6 left-6 flex gap-3 z-10">
        {/* Heart/Like Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          disabled={isSaving}
          className="h-10 w-10 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center text-primary hover:scale-[1.08] active:scale-95 transition-all shadow-md"
          title="Save Destination"
        >
          <Heart 
            size={18} 
            className={cn(
              "transition-all duration-300",
              isLiked ? "fill-red-500 text-red-500" : "text-on-surface-variant/40",
              isSaving && "animate-pulse scale-110"
            )} 
          />
        </button>

        {/* Real-time Weather Indicator Button */}
        {coordinates && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowWeather(!showWeather);
            }}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-md hover:scale-[1.08] active:scale-95",
              showWeather 
                ? "bg-secondary text-white" 
                : "bg-white/95 backdrop-blur-md text-on-surface-variant/60 hover:text-secondary"
            )}
            title="View Weather & Conditions"
          >
            <CloudSun size={19} />
          </button>
        )}
      </div>

      {/* Main Bottom Section: Destination Details */}
      <div className="absolute bottom-8 left-8 right-8 z-10 transition-opacity duration-300 pointer-events-none">
        <h3 className="text-white text-3xl font-headline font-black mb-2.5 tracking-tight drop-shadow-sm">{title}</h3>
        <div className="flex items-center gap-2 text-white/90">
          <Navigation size={15} className="text-secondary-fixed" />
          <span className="text-sm font-semibold tracking-wide drop-shadow-sm">{subtitle}</span>
        </div>
      </div>

      {/* Slide-Up Custom Interactive Weather Panel */}
      <AnimatePresence>
        {showWeather && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute inset-x-4 bottom-4 top-20 bg-slate-950/85 backdrop-blur-lg rounded-2xl p-6 text-white flex flex-col justify-between border border-white/10 shadow-2xl z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header of overlay panel */}
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Concierge Forecast</span>
              </div>
              <button 
                onClick={() => setShowWeather(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                title="Close Weather Panel"
              >
                <X size={16} />
              </button>
            </div>

            {/* Custom weather body */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-secondary" size={28} />
                <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Consulting Sky Charts...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-red-300 font-bold mb-3">{error}</p>
                <button 
                  onClick={() => {
                    setWeather(null);
                  }} 
                  className="bg-white/10 px-4 py-2 rounded-xl text-xs hover:bg-white/20 transition-all font-bold uppercase tracking-wider border border-white/10"
                >
                  Retry Search
                </button>
              </div>
            ) : weather ? (
              <div className="flex-1 flex flex-col justify-center gap-1 my-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-headline font-black tracking-tighter text-white">{weather.temp}</span>
                      <span className="text-2xl font-light text-slate-400">°C</span>
                      <span className="text-slate-600 mx-1">|</span>
                      <span className="text-2xl font-black text-slate-200">{Math.round(weather.temp * 1.8 + 32)}</span>
                      <span className="text-lg font-light text-slate-400">°F</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <WeatherIconComponent size={16} className={cn("inline-block", weatherDetails?.color)} />
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">{weatherDetails?.label}</span>
                    </div>
                  </div>
                  
                  <div className="bg-white/[0.04] border border-white/5 rounded-xl p-3 flex flex-col gap-2 min-w-[110px]">
                    <div>
                      <p className="text-[8px] uppercase tracking-wider text-slate-400 font-black">Wind Velocity</p>
                      <p className="text-[11px] font-bold text-slate-200">{weather.wind} km/h</p>
                    </div>
                    <div>
                      <p className="text-[8px] uppercase tracking-wider text-slate-400 font-black">Time Cycle</p>
                      <p className="text-[11px] font-bold text-slate-200">{weather.isDay ? 'Daylight ☀️' : 'Nightfall 🌙'}</p>
                    </div>
                  </div>
                </div>

                {/* Highly custom Concierge travel advice matching condition */}
                <div className="mt-4 bg-secondary/[0.04] border border-secondary/10 rounded-xl p-3 flex gap-3 items-start">
                  <div className="p-1.5 rounded-lg bg-secondary/15 text-secondary flex-shrink-0">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <h5 className="text-[9px] font-black uppercase text-secondary tracking-widest mb-0.5">Weather Advisory</h5>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-medium font-body">{weatherDetails?.tip}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Back action text trigger */}
            <div className="text-center pt-2">
              <button 
                onClick={() => setShowWeather(false)}
                className="text-[9px] text-slate-400 hover:text-white uppercase tracking-widest font-black transition-colors"
              >
                ← Back to Destination Information
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
