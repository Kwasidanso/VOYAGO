import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, Calendar, Users, ArrowRight, Star, 
  Plane, Hotel, Ship, Sparkles, Filter, SlidersHorizontal,
  ChevronRight, ArrowLeft, Info, Heart, Wallet, Clock,
  Wifi, Coffee, ShieldCheck, Waves, CheckCircle2, Loader2,
  Map as MapIcon, Grid, Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from './FirebaseProvider';
import { useToast } from './ToastContext';
import { db } from '../lib/firebase';
import { 
  collection, query, where, getDocs, deleteDoc, 
  addDoc, serverTimestamp, doc, getDoc, orderBy, limit 
} from 'firebase/firestore';
import { AutocompleteInput } from './AutocompleteInput';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef, useMap } from '@vis.gl/react-google-maps';
import { COUNTRIES, CountryInfo } from '../constants/countries';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Polyline component for geodesic lines in react-google-maps
function MapPolyline({ path, options }: { path: google.maps.LatLngLiteral[], options?: google.maps.PolylineOptions }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const polyline = new google.maps.Polyline({
      path,
      map,
      ...options
    });
    return () => {
      polyline.setMap(null);
    };
  }, [map, path, options]);
  return null;
}

// MapController component to handle dynamic panning and zooming
function MapController({ center, zoom }: { center: google.maps.LatLngLiteral; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);
  return null;
}

// Replicated structures for search results with precise coordinates
const FEATURED_FLIGHTS = [
  { id: 1, from: 'New York (NYC), North America', to: 'London (LDN), Europe', airline: 'British Airways', price: 1250, class: 'Club World', duration: '7h 20m', rating: 4.8, originCoords: { lat: 40.7128, lng: -74.0060 }, destCoords: { lat: 51.5074, lng: -0.1278 } },
  { id: 2, from: 'Paris (PAR), Europe', to: 'Dubai (DXB), Middle East', airline: 'Emirates', price: 2100, class: 'First Class', duration: '6h 45m', rating: 4.9, originCoords: { lat: 48.8566, lng: 2.3522 }, destCoords: { lat: 25.2048, lng: 55.2708 } },
  { id: 3, from: 'Tokyo (TYO), Asia', to: 'Los Angeles (LAX), North America', airline: 'ANA', price: 1850, class: 'Business', duration: '10h 15m', rating: 4.9, originCoords: { lat: 35.6762, lng: 139.6503 }, destCoords: { lat: 34.0522, lng: -118.2437 } },
  { id: 4, from: 'London (LDN), Europe', to: 'Venice, Europe', airline: 'ITA Airways', price: 450, class: 'Economy', duration: '2h 10m', rating: 4.5, originCoords: { lat: 51.5074, lng: -0.1278 }, destCoords: { lat: 45.4408, lng: 12.3155 } },
  { id: 5, from: 'New York (NYC), North America', to: 'Paris, Europe', airline: 'Air France', price: 1100, class: 'Premium', duration: '7h 45m', rating: 4.7, originCoords: { lat: 40.7128, lng: -74.0060 }, destCoords: { lat: 48.8566, lng: 2.3522 } }
];

const FEATURED_HOTELS = [
  { 
    id: 1, 
    name: 'Aman Tokyo', 
    location: 'Tokyo, Japan, Asia', 
    price: 1850, 
    rating: 4.9, 
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2070', 
    amenities: ['Spa', 'Pool', 'Zen Garden', 'City View'],
    description: 'A sanctuary of peace high above the city, blending traditional Japanese minimalism with contemporary luxury.',
    coordinates: { lat: 35.6811, lng: 139.7671 }
  },
  { 
    id: 2, 
    name: 'The Ritz-Carlton', 
    location: 'Paris, France, Europe', 
    price: 2400, 
    rating: 5.0, 
    image: 'https://images.unsplash.com/photo-1551882547-ff43c63ebb7a?auto=format&fit=crop&q=80&w=2070', 
    amenities: ['Butler', 'Dining', 'Garden', 'Limousine'],
    description: 'An emblem of French elegance and history, offering unparalleled service in the heart of the Place Vendôme.',
    coordinates: { lat: 48.8680, lng: 2.3292 }
  },
  { 
    id: 3, 
    name: 'Belmond Hotel Cipriani', 
    location: 'Venice, Italy, Europe', 
    price: 1950, 
    rating: 4.8, 
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=2070', 
    amenities: ['Boat', 'Pool', 'Tennis', 'Waterfront'],
    description: 'A legendary Venetian retreat on Giudecca Island, famous for its grand swimming pool and private launches.',
    coordinates: { lat: 45.4244, lng: 12.3392 }
  },
  { 
    id: 4, 
    name: 'The Edition', 
    location: 'London, UK, Europe', 
    price: 950, 
    rating: 4.7, 
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=2070', 
    amenities: ['Bar', 'Gym', 'Restaurant', 'Central'],
    description: 'A historic building with a modern soul, located in the heart of Fitzrovia.',
    coordinates: { lat: 51.5173, lng: -0.1384 }
  },
  { 
    id: 5, 
    name: 'Baccarat Hotel', 
    location: 'New York, USA, North America', 
    price: 1450, 
    rating: 4.8, 
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=2070', 
    amenities: ['Spa', 'Pool', 'Lounge', 'Crystal'],
    description: 'A celebration of the legendary French crystal brand, offering Parisian elegance in Midtown Manhattan.',
    coordinates: { lat: 40.7610, lng: -73.9772 }
  }
];

const FEATURED_CRUISES = [
  { id: 1, name: 'Mediterranean Splendor', line: 'Celebrity Cruises', destination: 'Western Mediterranean, Europe', price: 2450, rating: 4.8, duration: 10, image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&q=80&w=2070', coordinates: { lat: 41.3851, lng: 2.1734 } },
  { id: 2, name: 'Glacial Wonders', line: 'Princess Cruises', destination: 'Alaska, North America', price: 3100, rating: 4.9, duration: 7, image: 'https://images.unsplash.com/photo-1544257740-9a2af4a9a08e?auto=format&fit=crop&q=80&w=2070', coordinates: { lat: 47.6062, lng: -122.3321 } }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 15 
    } 
  }
};

type SortOption = 'price-asc' | 'price-desc' | 'rating-desc' | 'duration-asc';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const searchParams = new URLSearchParams(location.search);
  const initialType = searchParams.get('type') || 'all';
  const initialDest = searchParams.get('dest') || '';
  const initialOrigin = searchParams.get('origin') || '';
  const initialDate = searchParams.get('date') || '';

  const [loading, setLoading] = useState(true);
  const [similarGems, setSimilarGems] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');
  const [bookingItem, setBookingItem] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<string | number | null>(null);
  const [likedFlights, setLikedFlights] = useState<number[]>([]);
  const [likedHotels, setLikedHotels] = useState<number[]>([]);
  const [likedCruises, setLikedCruises] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedMapItem, setSelectedMapItem] = useState<any>(null);
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: 20, lng: 0 });
  const [mapZoom, setMapZoom] = useState<number>(2.5);

  const handleCenterOn = (coords: google.maps.LatLngLiteral, zoomLevel = 10) => {
    setMapCenter(coords);
    setMapZoom(zoomLevel);
  };

  const [type, setType] = useState(initialType);
  const [queryDest, setQueryDest] = useState(initialDest);
  const [queryOrigin, setQueryOrigin] = useState(initialOrigin);
  const [date, setDate] = useState(initialDate);

  const handleSearchRefine = () => {
    navigate(`/search?type=${type}&dest=${encodeURIComponent(queryDest)}&date=${encodeURIComponent(date)}&origin=${encodeURIComponent(queryOrigin)}`);
  };

  const fetchLikes = async () => {
    if (!user) return;
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      const snapshot = await getDocs(savedRef);
      const likes = snapshot.docs.map(d => d.data());
      
      setLikedFlights(likes.filter(l => l.type === 'flight').map(l => l.flightId));
      setLikedHotels(likes.filter(l => l.type === 'hotel').map(l => l.hotelId));
      setLikedCruises(likes.filter(l => l.type === 'cruise').map(l => l.cruiseId));
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const handleSaveDestination = async (item: any, itemType: 'flight' | 'hotel' | 'cruise') => {
    if (!user) return;
    setIsSaving(item.id);
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      const idKey = itemType === 'flight' ? 'flightId' : itemType === 'hotel' ? 'hotelId' : 'cruiseId';
      
      const q = query(savedRef, where(idKey, '==', item.id), where('type', '==', itemType));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'users', user.uid, 'savedDestinations', d.id)));
        await Promise.all(deletePromises);
        if (itemType === 'flight') setLikedFlights(prev => prev.filter(id => id !== item.id));
        else if (itemType === 'hotel') setLikedHotels(prev => prev.filter(id => id !== item.id));
        else if (itemType === 'cruise') setLikedCruises(prev => prev.filter(id => id !== item.id));
        const displayName = item.name || (itemType === 'flight' ? `flight to ${item.to}` : item.name || '');
        showToast(`Removed "${displayName}" from saved list.`, "info");
      } else {
        const saveData: any = {
          type: itemType,
          [idKey]: item.id,
          title: item.name || (itemType === 'flight' ? `${item.airline} to ${item.to}` : item.name),
          imageUrl: item.image || (itemType === 'flight' ? 'https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?auto=format&fit=crop&q=80&w=800' : ''),
          rating: item.rating,
          price: item.price,
          createdAt: serverTimestamp()
        };

        if (itemType === 'flight') {
          saveData.location = item.to;
          saveData.recommendation = `Flight from ${item.from} to ${item.to} with ${item.airline}`;
        } else if (itemType === 'hotel') {
          saveData.location = item.location;
          saveData.recommendation = item.description;
        } else if (itemType === 'cruise') {
          saveData.location = item.destination;
          saveData.recommendation = `${item.line} voyage to ${item.destination}`;
        }

        await addDoc(savedRef, saveData);
        if (itemType === 'flight') setLikedFlights(prev => [...prev, item.id]);
        else if (itemType === 'hotel') setLikedHotels(prev => [...prev, item.id]);
        else if (itemType === 'cruise') setLikedCruises(prev => [...prev, item.id]);
        const displayName = item.name || (itemType === 'flight' ? `flight to ${item.to}` : item.name || '');
        showToast(`"${displayName}" saved to your destinations!`, "success");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsSaving(null);
    }
  };

  const handleBook = (itemName: string) => {
    setIsBooking(true);
    setBookingItem(itemName);
    
    // Simulate booking process
    setTimeout(() => {
      setIsBooking(false);
      setTimeout(() => setBookingItem(null), 3000);
    }, 2000);
  };

  useEffect(() => {
    if (user) {
      fetchLikes();
    }
  }, [user]);

  useEffect(() => {
    if (queryDest) {
      const match = COUNTRIES.find(c => 
        queryDest.toLowerCase().includes(c.name.toLowerCase()) || 
        c.name.toLowerCase().includes(queryDest.toLowerCase())
      );
      if (match) {
        setMapCenter({ lat: match.lat, lng: match.lng });
        setMapZoom(match.zoom);
      }
    }
  }, [queryDest]);

  const parseDuration = (durationStr: string) => {
    const hoursMatch = durationStr.match(/(\d+)h/);
    const minutesMatch = durationStr.match(/(\d+)m/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
    return hours * 60 + minutes;
  };

  const getSortedResults = () => {
    const dests = queryDest.split(',').map(d => d.trim().toLowerCase()).filter(d => d.length > 0);
    
    const matchesDest = (target: string) => {
      if (dests.length === 0) return true;
      return dests.some(d => target.toLowerCase().includes(d) || d.includes(target.toLowerCase()));
    };

    const matchedCountries = COUNTRIES.filter(c => 
      dests.some(d => c.name.toLowerCase().includes(d) || d.includes(c.name.toLowerCase()))
    );

    let dynFlights: any[] = [];
    let dynHotels: any[] = [];
    let dynCruises: any[] = [];

    matchedCountries.forEach(country => {
      const countryLat = country.lat;
      const countryLng = country.lng;
      
      dynFlights.push(
        {
          id: `dyn-f-1-${country.code}`,
          from: queryOrigin || 'New York (JFK), North America',
          to: `${country.name} Capital Direct`,
          airline: `${country.name} National Air`,
          price: 1250,
          class: 'Business Class',
          duration: '8h 45m',
          rating: 4.8,
          originCoords: { lat: 40.7128, lng: -74.0060 },
          destCoords: { lat: countryLat, lng: countryLng }
        },
        {
          id: `dyn-f-2-${country.code}`,
          from: 'London Heathrow (LHR), Europe',
          to: `${country.name}`,
          airline: 'Global Wing Liners',
          price: 2100,
          class: 'First Class',
          duration: '11h 20m',
          rating: 4.9,
          originCoords: { lat: 51.5074, lng: -0.1278 },
          destCoords: { lat: countryLat + 0.1, lng: countryLng - 0.1 }
        }
      );

      dynHotels.push(
        {
          id: `dyn-h-1-${country.code}`,
          name: `The Regent Palace ${country.name}`,
          location: `${country.name}`,
          price: 450,
          rating: 4.9,
          image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=2070',
          amenities: ['Private Spa', 'Infinity Pool', 'Butler Service', 'Panoramas'],
          description: `An spectacular premium escape nestled in ${country.name}. Experience "${country.tagline}" in absolute luxury.`,
          coordinates: { lat: countryLat + 0.05, lng: countryLng - 0.05 }
        },
        {
          id: `dyn-h-2-${country.code}`,
          name: `Grande Belle Époque ${country.name}`,
          location: `${country.name}`,
          price: 850,
          rating: 5.0,
          image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2070',
          amenities: ['Private Heliport', 'Michelin Dining', 'Personal Concierge', 'Waterfront'],
          description: `The pinnacle of refined elegance in ${country.name}, reflecting the majestic cultural essence of ${country.region}.`,
          coordinates: { lat: countryLat - 0.04, lng: countryLng + 0.06 }
        },
        {
          id: `dyn-h-3-${country.code}`,
          name: `${country.name} Heritage Eco Sanctuary`,
          location: `${country.name}`,
          price: 320,
          rating: 4.8,
          image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=2070',
          amenities: ['Yoga Deck', 'Thermal Springs', 'Forest Trails', 'Safe Haven'],
          description: `Reconnect with nature in the pristine wilderness of ${country.name}, featuring immersive local design.`,
          coordinates: { lat: countryLat + 0.02, lng: countryLng + 0.03 }
        }
      );

      dynCruises.push(
        {
          id: `dyn-c-1-${country.code}`,
          name: `${country.name} Coastal Odyssey`,
          line: 'Voyago Signature Liners',
          destination: `${country.name} Archipelago`,
          price: 2450,
          rating: 4.9,
          duration: 9,
          image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&q=80&w=2070',
          coordinates: { lat: countryLat - 0.1, lng: countryLng - 0.1 }
        }
      );
    });

    const results = {
      flights: [...FEATURED_FLIGHTS.filter(f => matchesDest(f.to)), ...dynFlights],
      hotels: [...FEATURED_HOTELS.filter(h => matchesDest(h.location) || matchesDest(h.name)), ...dynHotels],
      cruises: [...FEATURED_CRUISES.filter(c => matchesDest(c.destination) || matchesDest(c.name)), ...dynCruises]
    };

    const sortFn = (a: any, b: any) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'rating-desc': return b.rating - a.rating;
        case 'duration-asc': {
          const durA = typeof a.duration === 'string' ? parseDuration(a.duration) : (a.duration || 0);
          const durB = typeof b.duration === 'string' ? parseDuration(b.duration) : (b.duration || 0);
          return durA - durB;
        }
        default: return 0;
      }
    };

    results.flights.sort(sortFn);
    results.hotels.sort(sortFn);
    results.cruises.sort(sortFn);

    return results;
  };

  const sortedResults = getSortedResults();
  const hasResults = sortedResults.flights.length > 0 || sortedResults.hotels.length > 0 || sortedResults.cruises.length > 0;

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!user) return;
      try {
        const prefRef = doc(db, 'users', user.uid, 'settings', 'hotelPreferences');
        const prefSnap = await getDoc(prefRef);
        if (prefSnap.exists()) {
          setPreferences(prefSnap.data());
        }
      } catch (err) {
        console.error("Error fetching preferences:", err);
      }
    };
    fetchPrefs();
  }, [user]);

  useEffect(() => {
    const fetchSimilar = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/search-similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type, 
            destination: queryDest, 
            origin: queryOrigin,
            preferences // Pass user preferences for AI context
          })
        });
        const data = await response.json();
        setSimilarGems(data.recommendations || []);
      } catch (error) {
        console.error('Failed to fetch similar gems', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [type, queryDest, queryOrigin, preferences]);

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Search Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <Link to={user ? "/dashboard" : "/"} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-on-surface-variant" />
            </Link>
            <div>
              <h1 className="font-headline font-bold text-3xl text-on-surface">Search Results</h1>
              <div className="mt-4 max-w-4xl flex flex-col md:flex-row gap-3">
                <AutocompleteInput 
                  value={queryDest}
                  onChange={setQueryDest}
                  className="flex-1"
                />
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex-1 md:w-48">
                    <Plane size={14} className="text-secondary" />
                    <input 
                      type="text"
                      value={queryOrigin}
                      onChange={(e) => setQueryOrigin(e.target.value)}
                      placeholder="From..."
                      className="bg-transparent border-none focus:outline-none w-full text-xs font-bold text-on-surface placeholder:text-slate-400"
                    />
                  </div>
                  <button 
                    onClick={handleSearchRefine}
                    className="px-6 py-2 bg-secondary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/20"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
              <MapPin size={14} className="text-secondary" />
              <span className="text-xs font-bold text-on-surface uppercase tracking-tight">{queryDest || 'Global'}</span>
            </div>
            {queryOrigin && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                <Plane size={14} className="text-secondary" />
                <span className="text-xs font-bold text-on-surface uppercase tracking-tight">From {queryOrigin}</span>
              </div>
            )}
            {date && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                <Calendar size={14} className="text-secondary" />
                <span className="text-xs font-bold text-on-surface uppercase tracking-tight">{date}</span>
              </div>
            )}
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 focus-within:border-secondary/30 transition-all">
              <SlidersHorizontal size={14} className="text-on-surface-variant" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent border-none focus:outline-none text-[10px] font-black uppercase tracking-widest text-on-surface-variant appearance-none cursor-pointer"
              >
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Highest Rated</option>
                <option value="duration-asc">Shortest Duration</option>
              </select>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 hover:border-secondary/30 transition-all">
              <Filter size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Filters</span>
            </button>
            <div className="flex p-1 bg-slate-100 rounded-full border border-slate-200 shadow-sm">
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-full transition-all text-xs font-bold",
                  viewMode === 'list' ? "bg-white text-secondary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                )}
                title="List View"
              >
                <Grid size={14} />
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={cn(
                  "p-2 rounded-full transition-all text-xs font-bold",
                  viewMode === 'map' ? "bg-white text-secondary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                )}
                title="Map View"
              >
                <MapIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Results Column */}
          <div className="lg:col-span-2 space-y-12">
            {!hasResults && !loading && (
              <div className="bg-slate-50 rounded-3xl p-12 text-center border border-dashed border-slate-200">
                <Search size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="font-headline font-bold text-xl text-on-surface">No direct matches found</h3>
                <p className="text-on-surface-variant text-sm mt-2 max-w-sm mx-auto">
                  We couldn't find exact matches for your query in our curated collection, but check out our tailored suggestions below.
                </p>
              </div>
            )}

            {/* Flights Section */}
            {(type === 'all' || type === 'flight') && sortedResults.flights.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <Plane size={18} />
                  </div>
                  <h2 className="font-headline font-bold text-xl">Flight Options</h2>
                </div>
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  key={`flights-${queryDest}-${queryOrigin}-${sortBy}`}
                  className="space-y-4"
                >
                  {sortedResults.flights.map(flight => (
                    <motion.div 
                      key={flight.id}
                      variants={itemVariants}
                      className="group bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-xl hover:border-secondary/20 transition-all flex flex-col md:flex-row items-center gap-8"
                    >
                      <div className="flex-1 flex items-center justify-between w-full relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveDestination(flight, 'flight');
                          }}
                          disabled={isSaving === flight.id}
                          className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-50 transition-all group"
                        >
                          <Heart 
                            size={18} 
                            className={cn(
                              "transition-all duration-300",
                              likedFlights.includes(flight.id) ? "fill-red-500 text-red-500" : "text-on-surface-variant/20 group-hover:text-red-400",
                              isSaving === flight.id && "animate-pulse scale-125"
                            )} 
                          />
                        </button>
                        <div className="text-center md:text-left">
                          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">{flight.airline}</p>
                          <p className="font-headline font-bold text-2xl text-on-surface">{flight.from}</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center px-8 relative">
                          <div className="w-full h-px bg-slate-200 relative">
                            <Plane size={16} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-secondary" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 mt-3 uppercase tracking-tighter">{flight.duration}</span>
                        </div>
                        <div className="text-center md:text-right">
                          <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">{flight.class}</p>
                          <p className="font-headline font-bold text-2xl text-on-surface">{flight.to}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center md:items-end gap-3 min-w-[140px]">
                        <p className="font-headline font-bold text-2xl text-on-surface">
                          <span className="text-xs align-top mt-1 mr-1">$</span>
                          {flight.price.toLocaleString()}
                        </p>
                        <button 
                          onClick={() => handleBook(`${flight.airline} to ${flight.to}`)}
                          className="w-full py-2 bg-on-surface text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary transition-colors"
                        >
                          Book Now
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}

            {/* Hotels Section */}
            {(type === 'all' || type === 'hotel') && sortedResults.hotels.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <Hotel size={18} />
                  </div>
                  <h2 className="font-headline font-bold text-xl">Premium Stays</h2>
                </div>
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  key={`hotels-${queryDest}-${sortBy}`}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {sortedResults.hotels.map(hotel => (
                    <motion.div 
                      key={hotel.id}
                      variants={itemVariants}
                      className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-xl hover:border-secondary/20 transition-all"
                    >
                      <div className="relative h-48">
                        <img src={hotel.image} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt={hotel.name} />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveDestination(hotel, 'hotel');
                          }}
                          disabled={isSaving === hotel.id}
                          className="absolute top-4 left-4 h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all shadow-sm z-10 group"
                        >
                          <Heart 
                            size={16} 
                            className={cn(
                              "transition-all duration-300",
                              likedHotels.includes(hotel.id) ? "fill-red-500 text-red-500" : "text-on-surface-variant/30 group-hover:text-red-400",
                              isSaving === hotel.id && "animate-pulse scale-125"
                            )} 
                          />
                        </button>
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-bold text-on-surface">{hotel.rating}</span>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-1 text-[9px] font-black text-secondary uppercase tracking-widest mb-1">
                          <MapPin size={10} />
                          {hotel.location}
                        </div>
                        <h3 className="font-headline font-bold text-lg text-on-surface mb-2">{hotel.name}</h3>
                        <p className="text-[10px] text-on-surface-variant line-clamp-2 leading-relaxed mb-4">
                          {hotel.description}
                        </p>
                        
                        {preferences?.amenities && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {hotel.amenities.map(a => {
                              const isPreferred = preferences.amenities.includes(a);
                              return (
                                <span 
                                  key={a} 
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-bold transition-all",
                                    isPreferred 
                                      ? "bg-secondary text-white flex items-center gap-1 shadow-sm shadow-secondary/20" 
                                      : "bg-slate-50 text-on-surface-variant/70 border border-slate-100"
                                  )}
                                >
                                  {isPreferred && <Sparkles size={8} />}
                                  {a}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                          <div>
                            <span className="text-xs text-on-surface-variant">From</span>
                            <p className="font-headline font-bold text-xl text-on-surface">${hotel.price.toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => handleBook(hotel.name)}
                            className="px-6 py-2 bg-on-surface text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary transition-colors"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}

            {/* Cruises Section */}
            {(type === 'all' || type === 'cruise') && sortedResults.cruises.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <Ship size={18} />
                  </div>
                  <h2 className="font-headline font-bold text-xl">Ocean Voyages</h2>
                </div>
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  key={`cruises-${queryDest}-${sortBy}`}
                  className="grid grid-cols-1 gap-6"
                >
                  {sortedResults.cruises.map(cruise => (
                    <motion.div 
                      key={cruise.id}
                      variants={itemVariants}
                      className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-xl hover:border-secondary/20 transition-all flex flex-col md:flex-row"
                    >
                      <div className="md:w-64 h-48 md:h-auto relative">
                        <img src={cruise.image} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt={cruise.name} />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveDestination(cruise, 'cruise');
                          }}
                          disabled={isSaving === cruise.id}
                          className="absolute top-4 left-4 h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all shadow-sm z-10 group"
                        >
                          <Heart 
                            size={16} 
                            className={cn(
                              "transition-all duration-300",
                              likedCruises.includes(cruise.id) ? "fill-red-500 text-red-500" : "text-on-surface-variant/30 group-hover:text-red-400",
                              isSaving === cruise.id && "animate-pulse scale-125"
                            )} 
                          />
                        </button>
                      </div>
                      <div className="flex-1 p-8 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">{cruise.line}</p>
                            <h3 className="font-headline font-bold text-xl text-on-surface">{cruise.name}</h3>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-amber-700 font-bold text-[10px]">
                            <Star size={10} className="fill-amber-700" />
                            {cruise.rating}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-medium">
                            <Clock size={12} />
                            {cruise.duration} Nights
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-medium">
                            <Waves size={12} />
                            {cruise.destination}
                          </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                          <p className="font-headline font-bold text-2xl text-on-surface">
                            <span className="text-xs font-medium text-on-surface-variant mr-1">From</span>
                            ${cruise.price.toLocaleString()}
                          </p>
                          <button 
                            onClick={() => handleBook(cruise.name)}
                            className="px-8 py-3 bg-on-surface text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary transition-colors"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}
          </div>

          {/* Similar Items Sidebar */}
          <div className="space-y-8">
            <div className="bg-surface-container-high rounded-3xl p-8 border border-slate-100 relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-secondary/10 blur-3xl" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-on-surface flex items-center justify-center text-secondary shadow-lg">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-lg text-on-surface">
                      {type === 'cruise' ? 'Similar Voyages' : 'Similar Gems'}
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">
                      {type === 'cruise' ? 'Tailored for Your Tastes' : 'AI Recommendations'}
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="w-full h-40 bg-slate-200 rounded-2xl mb-3" />
                        <div className="h-4 w-2/3 bg-slate-200 rounded mb-2" />
                        <div className="h-3 w-1/2 bg-slate-100 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    key={`similarGems-${similarGems.length}-${type}`}
                    className="space-y-6"
                  >
                    {similarGems.map((gem, idx) => (
                      <motion.div 
                        key={idx}
                        variants={itemVariants}
                        whileHover={{ y: -4 }}
                        className="group relative bg-white/50 backdrop-blur rounded-2xl p-4 border border-white hover:bg-white hover:shadow-xl transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm flex-shrink-0 relative">
                            {/* Fallback pattern if no image */}
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                              <MapPin size={24} className="text-slate-300" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-widest mb-1">
                              {gem.type}
                            </span>
                            <h4 className="font-bold text-sm text-on-surface truncate pr-4">{gem.title}</h4>
                            <p className="text-[10px] text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                              {gem.reason}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-[10px] font-black text-on-surface uppercase tracking-tighter">Approx. {gem.priceRange || '$$$'}</span>
                          <button className="text-secondary font-black text-[9px] uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                            Details <ChevronRight size={10} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Smart Banner */}
            <div className="bg-on-surface rounded-3xl p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <h3 className="font-headline font-bold text-xl mb-4 relative z-10">Plan your custom itinerary</h3>
              <p className="text-white/60 text-xs mb-8 relative z-10 leading-relaxed">Let our Digital Concierge craft a personalized minute-by-minute journey for your next trip.</p>
              <button className="w-full py-4 bg-secondary text-white font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-white hover:text-on-surface transition-all group-hover:scale-[1.02]">
                <Sparkles size={14} />
                Get AI Itinerary
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Status Overlay */}
      <AnimatePresence>
        {bookingItem && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6"
          >
            <div className="bg-on-surface text-white p-6 rounded-3xl shadow-2xl flex items-center gap-6 border border-white/10">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
                {isBooking ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              </div>
              <div className="flex-1">
                <h4 className="font-headline font-bold text-lg">
                  {isBooking ? 'Processing Request' : 'Booking Successful!'}
                </h4>
                <p className="text-white/60 text-xs mt-1">
                  {isBooking ? `Syncing details for ${bookingItem}...` : `Your journey to ${bookingItem} is confirmed.`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
