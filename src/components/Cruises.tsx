import React, { useState, useEffect } from 'react';
import { Anchor, Calendar, Users, ArrowRight, Search, Filter, Ship, MapPin, Star, History, X, Info, Coffee, Wifi, Waves, Wind, Heart, Loader2, Sparkles, CheckCircle2, ExternalLink, Utensils, BedDouble, ShieldCheck, Clock, Home, User, Lock, Gift, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from './FirebaseProvider';
import { ItineraryCard } from './ItineraryCard';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp, deleteDoc, doc, where } from 'firebase/firestore';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useToast } from './ToastContext';

interface RecentCruiseSearch {
  id: string;
  destination: string;
  departurePort: string;
  duration: string;
  createdAt: any;
}

export interface CabinType {
  name: string;
  price: number;
  description: string;
  perks: string[];
}

export interface DiningOption {
  name: string;
  type: string;
  description: string;
}

export interface PortOfCall {
  day: number;
  port: string;
  arrival?: string;
  departure?: string;
}

export interface Cruise {
  id: string | number;
  name: string;
  line: string;
  destination: string;
  port: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
  duration: string;
  price: number;
  rating: number;
  image: string;
  amenities: string[];
  cabinsLeft: number;
  totalCabins: number;
  description: string;
  reviews: { id: string | number, user: string, rating: number, comment: string, date: string }[];
  cabinTypes: CabinType[];
  diningOptions: DiningOption[];
  websiteUrl: string;
  itinerarySummary: PortOfCall[];
}

export const FEATURED_CRUISES: Cruise[] = [
  { 
    id: 1, 
    name: 'Mediterranean Splendor', 
    line: 'Celebrity Cruises', 
    destination: 'Western Mediterranean',
    port: 'Barcelona, Spain',
    country: 'Spain',
    coordinates: { lat: 41.3851, lng: 2.1734 },
    duration: '10 Nights',
    price: 2450, 
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&q=80&w=2070',
    amenities: ['Fine Dining', 'Pool Deck', 'Theater', 'Spa'],
    cabinsLeft: 5,
    totalCabins: 50,
    description: 'Sail through history from Barcelona to Rome, visiting the French Riviera and the coast of Italy in unparalleled style.',
    reviews: [
      { id: 1, user: 'Michael K.', rating: 5, comment: 'The service was exemplary. Every port excursion was well-organized.', date: '1 week ago' },
      { id: 2, user: 'Sophia L.', rating: 4, comment: 'Great food, though the pool deck was a bit crowded on sea days.', date: '3 weeks ago' }
    ],
    websiteUrl: 'https://www.celebritycruises.com',
    cabinTypes: [
      { name: 'Interior', price: 1800, description: 'Efficient and comfortable living space.', perks: ['24-hour room service', 'Daily housekeeping', 'Comfortable queen-bed'] },
      { name: 'Ocean View', price: 2450, description: 'Floor-to-ceiling windows with stunning views.', perks: ['Premium location', 'Large picture window', 'Priority check-in'] },
      { name: 'Veranda', price: 3200, description: 'Private balcony to enjoy the sea breeze.', perks: ['Private balcony', 'Floor-to-ceiling windows', 'Evening turn-down service'] },
      { name: 'The Retreat', price: 5500, description: 'Exclusive suite luxury with butler service.', perks: ['Personal butler', 'Dedicated restaurant', 'Private lounge access'] }
    ],
    diningOptions: [
      { name: 'Cosmopolitan', type: 'Main Dining', description: 'New American cuisine with global influences.' },
      { name: 'Murano', type: 'Specialty', description: 'Classic French dining with a modern twist.' },
      { name: 'Oceanview Cafe', type: 'Buffet', description: 'Global flavors in a relaxed setting.' }
    ],
    itinerarySummary: [
      { day: 1, port: 'Barcelona, Spain', departure: '5:00 PM' },
      { day: 2, port: 'Cannes, France', arrival: '8:00 AM', departure: '6:00 PM' },
      { day: 3, port: 'Genoa (Portofino), Italy', arrival: '7:00 AM', departure: '5:00 PM' },
      { day: 4, port: 'La Spezia (Cinque Terre), Italy', arrival: '7:00 AM', departure: '7:00 PM' },
      { day: 5, port: 'Civitavecchia (Rome), Italy', arrival: '6:00 AM' }
    ]
  },
  { 
    id: 2, 
    name: 'Glacial Wonders', 
    line: 'Royal Caribbean', 
    destination: 'Alaska',
    port: 'Seattle, USA',
    country: 'USA',
    coordinates: { lat: 47.6062, lng: -122.3321 },
    duration: '7 Nights',
    price: 1850, 
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1550586678-f7225f03c44b?auto=format&fit=crop&q=80&w=2070',
    amenities: ['Ice Skating', 'Rock Climbing', 'Observation Deck', 'Kid Zone'],
    cabinsLeft: 12,
    totalCabins: 80,
    description: 'Witness the majestic beauty of the Hubbard Glacier and the inside passage of Alaska.',
    reviews: [
      { id: 3, user: 'Robert D.', rating: 5, comment: 'Breathtaking views. The onboard naturalist was very informative.', date: '2 days ago' },
      { id: 4, user: 'Elena V.', rating: 5, comment: 'Perfect for the whole family. The kids loved the rock climbing!', date: '1 month ago' }
    ],
    websiteUrl: 'https://www.royalcaribbean.com',
    cabinTypes: [
      { name: 'Interior', price: 1400, description: 'Comfortable stay with all essentials.', perks: ['Standard amenities', 'Cozy atmosphere'] },
      { name: 'Ocean View', price: 1850, description: 'Window view of the Alaskan coastline.', perks: ['Coastal views', 'Upgraded bedding'] },
      { name: 'Balcony', price: 2600, description: 'Perfect for spotting whales from your room.', perks: ['Private balcony', 'Binoculars for use', 'Welcome gift'] }
    ],
    diningOptions: [
      { name: 'The Main Room', type: 'Main Dining', description: 'Elegant multi-course dining.' },
      { name: 'Chops Grille', type: 'Steakhouse', description: 'Royal Caribbean’s hallmark steakhouse.' },
      { name: 'Windjammer', type: 'Casual', description: 'Market-style buffet with global dishes.' }
    ],
    itinerarySummary: [
      { day: 1, port: 'Seattle, WA', departure: '4:00 PM' },
      { day: 2, port: 'Cruising at Sea', arrival: '-', departure: '-' },
      { day: 3, port: 'Juneau, Alaska', arrival: '11:00 AM', departure: '9:00 PM' },
      { day: 4, port: 'Skagway, Alaska', arrival: '7:00 AM', departure: '8:00 PM' }
    ]
  },
  { 
    id: 3, 
    name: 'Caribbean Paradise', 
    line: 'Norwegian Cruise Line', 
    destination: 'Eastern Caribbean',
    port: 'Miami, USA',
    country: 'USA',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    duration: '7 Nights',
    price: 1200, 
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1599640842225-85d111c60e6b?auto=format&fit=crop&q=80&w=2070',
    amenities: ['Water Slides', 'Casino', 'Garden Cafe', 'Live Music'],
    cabinsLeft: 2,
    totalCabins: 100,
    description: 'Island hop through the turquoise waters of the Caribbean, visiting private islands and hidden coves.',
    reviews: [
      { id: 5, user: 'Chris M.', rating: 4, comment: 'Great value for money. The private island was the highlight.', date: '2 weeks ago' },
      { id: 6, user: 'Anna S.', rating: 5, comment: 'Best vacation ever. The food was surprisingly good for a large ship.', date: '1 month ago' }
    ],
    websiteUrl: 'https://www.ncl.com',
    cabinTypes: [
      { name: 'Studio', price: 900, description: 'Designed for the solo traveler.', perks: ['Solo traveler friendly', 'Access to Studio Lounge'] },
      { name: 'Inside', price: 1200, description: 'Affordable and stylish.', perks: ['Compact luxury', 'Modern decor'] },
      { name: 'Club Balcony Suite', price: 1900, description: 'Extra space with a private balcony.', perks: ['Concierge service', 'Private balcony', 'Priority dining'] }
    ],
    diningOptions: [
      { name: 'Manhattan Room', type: 'Main Dining', description: 'Fine dining in a grand setting.' },
      { name: 'Cagney’s', type: 'Steakhouse', description: 'Premium American steakhouse.' },
      { name: 'O’Sheehan’s', type: 'Pub', description: '24/7 Irish pub food.' }
    ],
    itinerarySummary: [
      { day: 1, port: 'Miami, FL', departure: '5:30 PM' },
      { day: 2, port: 'Great Stirrup Cay, Bahamas', arrival: '8:00 AM', departure: '6:00 PM' },
      { day: 3, port: 'St. Thomas, USVI', arrival: '10:00 AM', departure: '7:00 PM' }
    ]
  },
  { 
    id: 4, 
    name: 'Nile Legends', 
    line: 'Viking River Cruises', 
    destination: 'Egypt',
    port: 'Luxor, Egypt',
    country: 'Egypt',
    coordinates: { lat: 25.6872, lng: 32.6396 },
    duration: '12 Nights',
    price: 3800, 
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&q=80&w=2070',
    amenities: ['Guided Tours', 'Lecture Hall', 'Library', 'Sun Deck'],
    cabinsLeft: 3,
    totalCabins: 24,
    description: 'A luxurious journey back in time, exploring the ancient wonders of Egypt along the banks of the Nile.',
    reviews: [
      { id: 7, user: 'George B.', rating: 5, comment: 'A deeply educational and luxurious experience. Truly elite.', date: 'Just now' },
      { id: 8, user: 'Catherine P.', rating: 5, comment: 'The service is unmatched. Every detail was meticulously planned.', date: '2 months ago' }
    ],
    websiteUrl: 'https://www.vikingcruises.com',
    cabinTypes: [
      { name: 'Standard Stateroom', price: 3800, description: 'Spacious room with river views.', perks: ['Outside river view', 'Complimentary shore excursions'] },
      { name: 'Veranda Stateroom', price: 4800, description: 'Private balcony overlooking the Nile.', perks: ['Private veranda', 'Floor-to-ceiling sliding glass door'] },
      { name: 'Explorer Suite', price: 7500, description: 'Ultimate river luxury with separate living area.', perks: ['Privileged location', 'Wrap-around veranda', 'Nespresso machine'] }
    ],
    diningOptions: [
      { name: 'The Restaurant', type: 'Fine Dining', description: 'Regional and international menus.' },
      { name: 'Aquavit Terrace', type: 'Al Fresco', description: 'Outdoor dining with river breezes.' }
    ],
    itinerarySummary: [
      { day: 1, port: 'Luxor, Egypt', arrival: '11:00 AM' },
      { day: 2, port: 'Esna (Temple of Khnum)', arrival: '7:00 AM', departure: '2:00 PM' },
      { day: 3, port: 'Aswan, Egypt', arrival: '8:00 AM' }
    ]
  },
];

export const Cruises: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Cruise[]>([]);
  const [viewingCruise, setViewingCruise] = useState<Cruise | null>(null);
  const [selectedCabin, setSelectedCabin] = useState<CabinType | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [newBookingId, setNewBookingId] = useState<string | null>(null);
  const [hasTravelInsurance, setHasTravelInsurance] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentCruiseSearch[]>([]);
  const [destination, setDestination] = useState('');
  const [departurePort, setDeparturePort] = useState('');
  const [duration, setDuration] = useState('7 Nights');
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [aiItinerary, setAiItinerary] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchRecentSearches();
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const destParam = params.get('dest');
    const portParam = params.get('port');
    if (destParam) setDestination(destParam);
    if (portParam) setDeparturePort(portParam);
  }, [location]);

  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [likedCruises, setLikedCruises] = useState<number[]>([]);
  const [isSettingAlert, setIsSettingAlert] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchLikedCruises();
    }
  }, [user]);

  const fetchLikedCruises = async () => {
    if (!user) return;
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      const q = query(savedRef, where('type', '==', 'cruise'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const likedIds = snapshot.docs
        .map(doc => doc.data().cruiseId)
        .filter(id => id !== undefined);
      setLikedCruises(likedIds);
    } catch (error) {
      console.error("Error fetching liked cruises:", error);
    }
  };
  const [showPriceAlertModal, setShowPriceAlertModal] = useState<Cruise | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alertPrice, setAlertPrice] = useState(0);
  const [alertType, setAlertType] = useState<'Price Drop' | 'Availability'>('Price Drop');

  const handleSetAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !showPriceAlertModal) return;
    setIsSettingAlert(typeof showPriceAlertModal.id === 'string' ? parseInt(showPriceAlertModal.id) : showPriceAlertModal.id);
    try {
      const alertsRef = collection(db, 'users', user.uid, 'priceAlerts');
      await addDoc(alertsRef, {
        from: showPriceAlertModal.port,
        to: showPriceAlertModal.destination,
        cruiseName: showPriceAlertModal.name,
        line: showPriceAlertModal.line,
        priceThreshold: Number(alertPrice),
        type: alertType,
        service: 'cruise',
        createdAt: serverTimestamp()
      });
      setShowPriceAlertModal(null);
    } catch (error) {
      console.error("Error setting alert:", error);
    } finally {
      setIsSettingAlert(null);
    }
  };

  const handleSaveDestination = async (cruise: typeof FEATURED_CRUISES[0]) => {
    if (!user) return;
    setIsSaving(cruise.id as number);
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      
      // Check if already liked
      const q = query(savedRef, where('cruiseId', '==', cruise.id), where('type', '==', 'cruise'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Remove from favorites
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'users', user.uid, 'savedDestinations', d.id)));
        await Promise.all(deletePromises);
        setLikedCruises(prev => prev.filter(id => id !== cruise.id));
        showToast(`Removed "${cruise.name}" from saved cruises.`, "info");
      } else {
        // Add to favorites
        await addDoc(savedRef, {
          cruiseId: cruise.id,
          title: cruise.name,
          location: cruise.destination,
          imageUrl: cruise.image,
          type: 'cruise',
          rating: cruise.rating,
          price: cruise.price,
          recommendation: `${cruise.duration} ${cruise.line} voyage to ${cruise.destination}`,
          createdAt: serverTimestamp()
        });
        setLikedCruises(prev => [...prev, cruise.id as number]);
        showToast(`"${cruise.name}" saved to your destinations!`, "success");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsSaving(null);
    }
  };

  const fetchRecentSearches = async () => {
    if (!user) return;
    try {
      const searchesRef = collection(db, 'users', user.uid, 'recentSearches');
      const q = query(searchesRef, orderBy('timestamp', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      const searches = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((s: any) => s.type === 'cruise')
        .slice(0, 4);
      setRecentSearches(searches as any[]);
    } catch (error) {
      console.error("Error fetching cruise searches:", error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    if (user) {
      try {
        const searchesRef = collection(db, 'users', user.uid, 'recentSearches');
        await addDoc(searchesRef, {
          type: 'cruise',
          destination,
          departurePort,
          duration,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error("Error saving cruise search:", error);
      }
    }

    setTimeout(() => {
      setIsSearching(false);
      navigate(`/search?type=cruise&dest=${encodeURIComponent(destination)}&origin=${encodeURIComponent(departurePort || '')}&date=${encodeURIComponent(duration || '')}`);
    }, 1500);
  };

  const reInitiateSearch = (search: any) => {
    setDestination(search.destination || '');
    setDeparturePort(search.departurePort || '');
    setDuration(search.duration || '7 Nights');
  };

  const deleteSearch = async (searchId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'recentSearches', searchId));
      setRecentSearches(prev => prev.filter(s => s.id !== searchId));
    } catch (error) {
      console.error("Error deleting cruise search:", error);
    }
  };

  const handleBook = async (cruise: Cruise) => {
    if (!user || !selectedCabin) return;
    setIsBooking(true);
    const insuranceCost = hasTravelInsurance ? Math.round(selectedCabin.price * 0.12) : 0;
    const totalAmount = selectedCabin.price + insuranceCost;

    try {
      const bookingsRef = collection(db, 'users', user.uid, 'bookings');
      const docRef = await addDoc(bookingsRef, {
        destinationTitle: cruise.name,
        startDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        endDate: '',
        nights: parseInt(cruise.duration.split(' ')[0]),
        status: 'pending',
        imageUrl: cruise.image,
        airline: cruise.line,
        flightNumber: 'Voyage #' + Math.floor(Math.random() * 1000),
        departureTime: '12:00 PM',
        arrivalTime: 'TBD',
        terminal: 'Pier ' + Math.floor(Math.random() * 20),
        gate: 'Berth ' + Math.floor(Math.random() * 5),
        amount: totalAmount,
        insuranceIncluded: hasTravelInsurance,
        insuranceAmount: insuranceCost,
        basePrice: selectedCabin.price,
        cabinType: selectedCabin.name,
        budget: totalAmount,
        expenses: [],
        createdAt: serverTimestamp()
      });
      setNewBookingId(docRef.id);
      setBookingSuccess(true);
    } catch (error) {
      console.error("Error booking cruise:", error);
    } finally {
      setIsBooking(false);
    }
  };

  const generateAIItinerary = async () => {
    if (!viewingCruise) return;
    setIsGeneratingItinerary(true);
    try {
      const response = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          destination: viewingCruise.destination,
          startDate: '2026-06-01',
          endDate: '2026-06-08',
          preferences: `Cruise on ${viewingCruise.line}, focus on ${viewingCruise.amenities.join(', ')}`
        })
      });
      const data = await response.json();
      setAiItinerary(data);
    } catch (error) {
      console.error("Itinerary gen failed", error);
    } finally {
      setIsGeneratingItinerary(false);
    }
  };

  const cruisesToDisplay = searchResults.length > 0 ? searchResults : FEATURED_CRUISES;

  return (
    <main className="pt-24 min-h-screen bg-surface-container-lowest">
      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden bg-on-surface flex items-center px-8 lg:px-24">
        <img 
          src="https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&q=80&w=2070" 
          className="absolute inset-0 w-full h-full object-cover opacity-60" 
          alt="Cruise Ship" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-on-surface via-on-surface/40 to-transparent" />
        
        <div className="relative z-10 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-7xl font-headline font-black text-white tracking-tighter mb-6 leading-[0.9]">
              OCEAN <br /> HORIZONS.
            </h1>
            <p className="text-white/80 text-xl font-body max-w-lg mb-8">
              Discover the world from the water. Luxury cruises curated for the modern explorer.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search Interface */}
      <div className="max-w-7xl mx-auto -mt-16 px-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-10 border border-slate-100">
          <div className="flex gap-1.5 sm:gap-4 mb-8">
            <Link to="/flights" className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Flights
            </Link>
            <Link to="/hotels" className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Hotels
            </Link>
            <span className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest bg-secondary text-white shadow-sm transition-colors">
              Cruises
            </span>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Destination</label>
              <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl border border-transparent focus-within:border-secondary transition-all">
                <MapPin size={18} className="text-secondary" />
                <select 
                  className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm appearance-none"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="">Where to?</option>
                  <option>Caribbean</option>
                  <option>Mediterranean</option>
                  <option>Alaska</option>
                  <option>Hawaii</option>
                  <option>South Pacific</option>
                </select>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Departure Port</label>
                <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                  <Anchor size={18} className="text-secondary" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" 
                    placeholder="Miami, Barcelona, etc."
                    value={departurePort}
                    onChange={(e) => setDeparturePort(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Duration</label>
                <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                  <Calendar size={18} className="text-secondary" />
                  <select 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm appearance-none"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option>2-5 Nights</option>
                    <option>7 Nights</option>
                    <option>10-14 Nights</option>
                    <option>15+ Nights</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 flex flex-col justify-end">
              <button 
                type="submit"
                disabled={isSearching}
                className="h-[60px] bg-secondary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/20"
              >
                {isSearching ? <span className="animate-pulse">Chartering...</span> : <>Search Cruises <Search size={18} /></>}
              </button>
            </div>

            <div className="lg:col-span-12">
              <AnimatePresence>
                {recentSearches.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-6 border-t border-slate-100"
                  >
                    <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                      <History size={12} className="text-secondary" />
                      Recent Cruise Searches
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {recentSearches.map((search) => (
                        <div 
                          key={search.id}
                          className="group flex items-center gap-3 pl-4 pr-2 py-2 bg-surface-container-low rounded-full border border-transparent hover:border-secondary/20 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => reInitiateSearch(search)}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-on-surface uppercase">{search.destination}</span>
                            <span className="text-[9px] text-on-surface-variant/80 font-medium">{search.departurePort || 'Any Port'} • {search.duration}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSearch(search.id);
                            }}
                            className="p-1.5 rounded-full hover:bg-red-50 text-on-surface-variant/40 hover:text-red-500 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </div>

      {/* Featured Cruises */}
      <section className="py-24 px-8 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.3em] mb-3 block">Maritime Excellence</span>
              <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tighter text-on-surface uppercase">{searchResults.length > 0 ? 'Search Results' : 'REGAL VOYAGES'}</h2>
            </div>
            <div className="flex gap-4">
              {searchResults.length > 0 && (
                <button onClick={() => setSearchResults([])} className="px-6 py-3 rounded-full bg-surface-container-low text-on-surface font-bold text-xs hover:bg-slate-200 transition-colors">
                  Reset Search
                </button>
              )}
              <button className="flex items-center gap-2 px-6 py-3 rounded-full border border-slate-200 text-on-surface-variant font-bold text-xs hover:bg-surface-container-low transition-colors">
                <Filter size={16} /> Filters
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cruisesToDisplay.map((cruise, idx) => (
              <motion.div
                key={cruise.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer"
                onClick={() => {
                  setViewingCruise(cruise);
                  setSelectedCabin(cruise.cabinTypes[0]);
                  setIsReviewing(false);
                }}
              >
                <div className="relative h-64">
                  <img src={cruise.image} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt={cruise.name} />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveDestination(cruise);
                    }}
                    disabled={isSaving === cruise.id}
                    className="absolute top-4 left-4 h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all shadow-sm z-10"
                  >
                    <Heart 
                      size={20} 
                      className={cn(
                        isSaving === cruise.id && "animate-pulse",
                        likedCruises.includes(cruise.id as number) ? "fill-red-500 text-red-500" : "text-on-surface-variant/40"
                      )} 
                    />
                  </button>
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={12} fill="#FACC15" className="text-yellow-400" />
                    <span className="text-xs font-black">{cruise.rating}</span>
                  </div>
                  <div className="absolute bottom-4 left-4">
                     <span className="bg-secondary text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                       {cruise.line}
                     </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-headline font-black text-xl text-on-surface mb-1">{cruise.name}</h3>
                  <div className="flex items-center gap-1 text-on-surface-variant mb-4">
                    <MapPin size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{cruise.destination}</span>
                  </div>

                  {/* Availability Indicator */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-tighter",
                        cruise.cabinsLeft <= 3 ? "text-red-500" : cruise.cabinsLeft <= 10 ? "text-orange-500" : "text-green-600"
                      )}>
                        {cruise.cabinsLeft <= 3 ? "Waitlist Only" : cruise.cabinsLeft <= 10 ? "Limited Cabins" : "Instant Booking"}
                      </span>
                      <span className="text-[9px] font-bold text-on-surface-variant">{cruise.cabinsLeft} cabins left</span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          cruise.cabinsLeft <= 3 ? "bg-red-500" : cruise.cabinsLeft <= 10 ? "bg-orange-500" : "bg-green-500"
                        )}
                        style={{ width: `${(cruise.cabinsLeft / cruise.totalCabins) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Amenities Section */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {cruise.amenities.map((amenity) => (
                      <span 
                        key={amenity} 
                        className="px-2.5 py-1 bg-secondary/5 text-[9px] font-black text-secondary rounded-lg uppercase tracking-wider border border-secondary/10 flex items-center gap-1.5"
                      >
                        <div className="w-1 h-1 rounded-full bg-secondary" />
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{cruise.duration}</p>
                        <p className="text-2xl font-black text-on-surface">${cruise.price.toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPriceAlertModal(cruise);
                          setAlertPrice(cruise.price - 100);
                        }}
                        className="p-3 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-secondary transition-all"
                        title="Set Alert"
                      >
                        <Wind size={20} />
                      </button>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingCruise(cruise);
                        setSelectedCabin(cruise.cabinTypes[0]);
                      }}
                      className="w-full py-4 bg-secondary text-white rounded-xl font-bold text-sm shadow-xl shadow-secondary/20 hover:bg-secondary-fixed hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Book This Voyage
                    </button>

                    <a 
                      href={cruise.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full py-3 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-on-surface-variant hover:bg-slate-50 transition-all tracking-widest shadow-sm"
                    >
                      <ExternalLink size={12} />
                      Visit Official Website
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cruise Details Modal */}
      <AnimatePresence>
        {viewingCruise && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm"
              onClick={() => {
                if (!isBooking) {
                  setViewingCruise(null);
                  setIsReviewing(false);
                }
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="relative h-64">
                <img src={viewingCruise.image} className="w-full h-full object-cover" alt={viewingCruise.name} />
                <button 
                  onClick={() => {
                    setViewingCruise(null);
                    setIsReviewing(false);
                  }}
                  className="absolute top-6 right-6 p-2 rounded-full bg-on-surface/20 text-white hover:bg-on-surface/40 transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-bold bg-secondary text-white px-3 py-1 rounded-full uppercase tracking-widest inline-block">{viewingCruise.line}</span>
                      <a 
                        href={viewingCruise.websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-on-surface-variant hover:text-secondary transition-colors"
                        title="Visit Cruise Line Website"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <h2 className="text-4xl font-headline font-black text-on-surface">{viewingCruise.name}</h2>
                  </div>
                </div>
              </div>

                <div className="p-8 lg:p-10 max-h-[70vh] overflow-y-auto">
                  {bookingSuccess ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center py-6"
                    >
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={32} />
                      </div>
                      <h3 className="text-3xl font-headline font-black text-on-surface mb-2 uppercase tracking-tighter">Booking Confirmed</h3>
                      
                      <div className="w-full bg-surface-container-low rounded-3xl p-6 mb-8 text-left border border-slate-100">
                        <div className="flex justify-between items-center mb-4 border-b border-white pb-3">
                          <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Reservation Summary</p>
                          {newBookingId && (
                            <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-on-surface-variant font-mono">ID: {newBookingId}</span>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-on-surface-variant uppercase font-bold">Voyage</span>
                            <span className="text-xs text-on-surface font-black uppercase text-right max-w-[200px]">{viewingCruise.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-on-surface-variant uppercase font-bold">Cruise Line</span>
                            <span className="text-xs text-on-surface font-black">{viewingCruise.line}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-on-surface-variant uppercase font-bold">Destination</span>
                            <span className="text-xs text-on-surface font-black">{viewingCruise.destination}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-on-surface-variant uppercase font-bold">Duration</span>
                            <span className="text-xs text-on-surface font-black">{viewingCruise.duration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-on-surface-variant uppercase font-bold">Cabin Selected</span>
                            <span className="text-xs text-on-surface font-black whitespace-nowrap">{selectedCabin?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-on-surface-variant uppercase font-bold">Departs From</span>
                            <span className="text-xs text-on-surface font-black">{viewingCruise.port}</span>
                          </div>
                          <div className="flex justify-between pt-4 border-t border-white">
                            <span className="text-[10px] text-on-surface-variant uppercase font-bold">Total Price</span>
                            <span className="text-xl text-secondary font-headline font-black">
                              ${(selectedCabin?.price || viewingCruise.price + (hasTravelInsurance ? Math.round(viewingCruise.price * 0.12) : 0)).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-on-surface-variant text-sm max-w-sm mb-8 leading-relaxed">
                        Your luxury cabin is secure. Digital tickets and your day-by-day itinerary have been sent to your registered email.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <button 
                          onClick={() => navigate('/dashboard')}
                          className="flex-1 py-4 bg-secondary text-white rounded-2xl font-headline font-bold text-sm shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          View My Bookings
                        </button>
                        <button 
                          onClick={() => {
                            setViewingCruise(null);
                            setBookingSuccess(false);
                            setNewBookingId(null);
                            setIsReviewing(false);
                            setAiItinerary(null);
                          }}
                          className="flex-1 py-4 bg-white text-on-surface border border-slate-200 rounded-2xl font-headline font-bold text-sm hover:bg-slate-50 active:scale-95 transition-all"
                        >
                          Continue Browsing
                        </button>
                      </div>
                    </motion.div>
                  ) : isReviewing ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center gap-4 mb-2">
                        <button 
                          onClick={() => setIsReviewing(false)}
                          className="p-2 rounded-full hover:bg-slate-100 text-on-surface-variant transition-colors"
                        >
                          <History size={20} className="scale-x-[-1]" />
                        </button>
                        <h3 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tight">Review Reservation</h3>
                      </div>

                      <div className="bg-surface-container-low rounded-3xl p-8 border border-white space-y-6">
                         <div className="flex justify-between items-end border-b border-white pb-6">
                            <div>
                              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Voyage Selection</p>
                              <h4 className="text-xl font-headline font-black text-on-surface">{viewingCruise.name}</h4>
                              <p className="text-xs font-bold text-secondary uppercase tracking-wider">{viewingCruise.line} • {viewingCruise.duration}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Cabin</p>
                              <p className="text-sm font-black text-on-surface uppercase">{selectedCabin?.name}</p>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Price Breakdown</p>
                            <div className="flex justify-between text-xs font-bold text-on-surface">
                              <span>Cruise Fare ({selectedCabin?.name})</span>
                              <span>${selectedCabin?.price.toLocaleString()}</span>
                            </div>
                            {hasTravelInsurance && (
                              <div className="flex justify-between text-xs font-bold text-secondary">
                                <span>Cruise Protection Plan</span>
                                <span>+${Math.round(selectedCabin!.price * 0.12).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs font-bold text-on-surface-variant/60">
                              <span>Port Fees & Taxes</span>
                              <span>Included</span>
                            </div>
                            <div className="flex justify-between pt-4 border-t border-white">
                              <span className="text-sm font-black text-on-surface uppercase font-headline">Total Amount Due</span>
                              <span className="text-2xl font-headline font-black text-secondary">
                                ${((selectedCabin?.price || 0) + (hasTravelInsurance ? Math.round((selectedCabin?.price || 0) * 0.12) : 0)).toLocaleString()}
                              </span>
                            </div>
                         </div>
                      </div>

                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex items-center gap-2 text-secondary">
                          <ShieldCheck size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Guest Agreement</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          By clicking "Confirm Reservation", you agree to the cruise line's carriage terms and Voyago's cancellation policy. Your selected cabin is held for the next 15 minutes.
                        </p>
                      </div>

                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
                        <div className="hidden md:block">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Guest</p>
                          <p className="text-sm font-black text-on-surface">{user?.displayName || 'Traveler'}</p>
                        </div>
                        <button 
                          onClick={() => setShowConfirmModal(true)}
                          disabled={isBooking}
                          className="w-full md:w-auto min-w-[320px] h-[64px] rounded-2xl bg-secondary text-white hover:bg-on-surface shadow-xl shadow-secondary/20 active:scale-[0.98] font-bold flex items-center justify-between px-8 gap-3 transition-all uppercase tracking-[0.15em] relative overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                          <span className="flex items-center gap-3">
                            {isBooking ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                            {isBooking ? 'Processing...' : 'Confirm Voyage'}
                          </span>
                          {!isBooking && (
                            <span className="text-[10px] opacity-80 flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg">
                              ${((selectedCabin?.price || 0) + (hasTravelInsurance ? Math.round((selectedCabin?.price || 0) * 0.12) : 0)).toLocaleString()}
                            </span>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Itinerary Overview</p>
                        <p className="text-sm font-medium text-on-surface-variant leading-relaxed mb-6">
                          {viewingCruise.description}
                        </p>

                        <a 
                          href={viewingCruise.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-on-surface hover:bg-slate-100 hover:border-slate-300 transition-all font-bold text-[10px] uppercase tracking-[0.2em] mb-8"
                        >
                          <Ship size={14} className="text-secondary" /> Visit Official {viewingCruise.line} Website
                        </a>

                        <div className="space-y-3 mb-6">
                          <p className="text-[10px] font-bold text-on-surface uppercase tracking-widest mb-2">Ports of Call</p>
                          {viewingCruise.itinerarySummary.map((stop, si) => (
                            <div key={si} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-none">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px]">{stop.day}</span>
                                <span className="font-bold text-on-surface">{stop.port}</span>
                              </div>
                              <div className="text-right">
                                {stop.arrival && <span className="text-[9px] text-on-surface-variant block uppercase font-bold">Arr: {stop.arrival}</span>}
                                {stop.departure && <span className="text-[9px] text-on-surface-variant block uppercase font-bold">Dep: {stop.departure}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* AI Itinerary Button */}
                      {!aiItinerary ? (
                        <button 
                          onClick={generateAIItinerary}
                          disabled={isGeneratingItinerary}
                          className="flex items-center gap-2 text-[10px] font-black uppercase text-secondary hover:underline disabled:opacity-50"
                        >
                          {isGeneratingItinerary ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          Generate AI-Powered Day-by-Day Plan
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <ItineraryCard itinerary={aiItinerary} />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-surface-container-low rounded-lg text-secondary">
                          <Ship size={16} />
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-on-surface-variant uppercase">Ship Class</p>
                          <p className="text-xs font-bold">Ultra-Luxury</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-surface-container-low rounded-lg text-secondary">
                          <Anchor size={16} />
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-on-surface-variant uppercase">Departs</p>
                          <p className="text-xs font-bold truncate">{viewingCruise.port}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Cabin Comparison & Selection</p>
                        <p className="text-[9px] text-on-surface-variant/80 mb-2 font-medium">Select a category to see detailed perks and included amenities.</p>
                        <div className="space-y-3">
                          {viewingCruise.cabinTypes.map((cabin, ci) => (
                            <div 
                              key={ci} 
                              onClick={() => setSelectedCabin(cabin)}
                              className={cn(
                                "p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
                                selectedCabin?.name === cabin.name 
                                  ? "border-secondary bg-secondary/[0.02] ring-1 ring-secondary/30 shadow-lg" 
                                  : "border-slate-100 hover:border-slate-300 bg-white"
                              )}
                            >
                               {selectedCabin?.name === cabin.name && (
                                 <div className="absolute top-0 right-0 p-3">
                                   <div className="bg-secondary text-white p-1 rounded-full">
                                     <CheckCircle2 size={12} />
                                   </div>
                                 </div>
                               )}
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-start gap-4">
                                  <div className={cn(
                                    "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                                    selectedCabin?.name === cabin.name ? "bg-secondary/10 border-secondary/20 text-secondary" : "bg-slate-50 border-slate-100 text-on-surface-variant"
                                  )}>
                                    {cabin.name.includes('Interior') ? <div className="w-full h-full flex items-center justify-center"><Info size={24} /></div> : 
                                     cabin.name.includes('Ocean') ? <div className="w-full h-full flex items-center justify-center"><Waves size={24} /></div> :
                                     cabin.name.includes('Veranda') || cabin.name.includes('Balcony') ? <div className="w-full h-full flex items-center justify-center"><Wind size={24} /></div> :
                                     <div className="w-full h-full flex items-center justify-center"><Sparkles size={24} /></div>}
                                  </div>
                                  <div>
                                    <span className="text-base font-black text-on-surface uppercase block tracking-tight">{cabin.name}</span>
                                    <p className="text-[11px] text-on-surface-variant font-medium leading-tight max-w-[280px]">{cabin.description}</p>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                  <span className={cn(
                                    "text-lg font-headline font-black shrink-0",
                                    selectedCabin?.name === cabin.name ? "text-secondary" : "text-on-surface"
                                  )}>
                                    ${cabin.price.toLocaleString()}
                                  </span>
                                  <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">per person</span>
                                </div>
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-dashed border-slate-100">
                                <div className="flex flex-wrap gap-2">
                                  {cabin.perks.map((perk, pi) => {
                                    const p = perk.toLowerCase();
                                    let PerkIcon = CheckCircle2;
                                    if (p.includes('room service')) PerkIcon = Clock;
                                    else if (p.includes('housekeeping')) PerkIcon = Home;
                                    else if (p.includes('bed')) PerkIcon = BedDouble;
                                    else if (p.includes('location')) PerkIcon = MapPin;
                                    else if (p.includes('window') || p.includes('views')) PerkIcon = Waves;
                                    else if (p.includes('check-in')) PerkIcon = Zap;
                                    else if (p.includes('balcony')) PerkIcon = Wind;
                                    else if (p.includes('turn-down')) PerkIcon = Sparkles;
                                    else if (p.includes('butler')) PerkIcon = User;
                                    else if (p.includes('restaurant') || p.includes('dining')) PerkIcon = Utensils;
                                    else if (p.includes('lounge')) PerkIcon = Lock;
                                    else if (p.includes('atmosphere')) PerkIcon = Heart;
                                    else if (p.includes('binoculars')) PerkIcon = Search;
                                    else if (p.includes('gift')) PerkIcon = Gift;

                                    return (
                                      <span key={pi} className={cn(
                                        "text-[9px] font-bold uppercase px-3 py-1 rounded-lg border flex items-center gap-2 transition-all",
                                        selectedCabin?.name === cabin.name 
                                          ? "bg-secondary/5 text-secondary border-secondary/10" 
                                          : "bg-surface-container-lowest text-on-surface-variant border-slate-100"
                                      )}>
                                        <PerkIcon size={12} className={cn(selectedCabin?.name === cabin.name ? "text-secondary" : "text-on-surface-variant/60")} />
                                        {perk}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Dining Experience</p>
                        <div className="space-y-3">
                          {viewingCruise.diningOptions.map((opt, oi) => (
                            <div key={oi} className="flex gap-3">
                              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary shrink-0">
                                <Utensils size={14} />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-on-surface uppercase">{opt.name} <span className="text-[9px] text-on-surface-variant/60 ml-2">({opt.type})</span></p>
                                <p className="text-[10px] text-on-surface-variant leading-relaxed">{opt.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                </div>

                {/* Traveler Reviews */}
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sailor Feedback</h4>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-on-surface">{viewingCruise.rating}</span>
                       <div className="flex text-yellow-500">
                         {[1, 2, 3, 4, 5].map(i => (
                           <Star key={i} size={10} fill={i <= Math.floor(viewingCruise.rating) ? "currentColor" : "none"} />
                         ))}
                       </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingCruise.reviews?.map((review: any) => (
                      <div key={review.id} className="p-4 bg-surface-container-lowest border border-slate-100 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-on-surface">{review.user}</span>
                          <span className="text-[9px] text-on-surface-variant font-medium uppercase tracking-tighter">{review.date}</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-3 italic">"{review.comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Travel Insurance Section */}
                {!bookingSuccess && (
                  <div className="mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="p-3 bg-white rounded-2xl text-secondary shadow-sm">
                          <Wind size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-on-surface uppercase">Cruise Protection Plan</p>
                          <p className="text-[10px] text-on-surface-variant leading-relaxed max-w-sm">
                            Covers medical evacuation at sea, trip interruption, and missed port connections.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setHasTravelInsurance(!hasTravelInsurance)}
                        className={cn(
                          "flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-xs transition-all",
                          hasTravelInsurance 
                            ? "bg-secondary text-white shadow-lg shadow-secondary/20" 
                            : "bg-white text-secondary border border-secondary/20 hover:bg-secondary/5"
                        )}
                      >
                        {hasTravelInsurance ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-secondary/30" />}
                        {hasTravelInsurance ? 'Protection Added' : `Add Protection (+$${Math.round((selectedCabin?.price || viewingCruise.price) * 0.12)})`}
                      </button>
                    </div>
                  </div>
                )}

                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-100 mt-auto bg-white sticky bottom-0 pb-2">
                    <div className="text-center md:text-left">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        {selectedCabin ? `${selectedCabin.name} Total` : 'Starting From'}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-headline font-black text-on-surface">
                          ${((selectedCabin?.price || viewingCruise.price) + (hasTravelInsurance ? Math.round((selectedCabin?.price || viewingCruise.price) * 0.12) : 0)).toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-on-surface-variant">/ person</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsReviewing(true)}
                      className="w-full md:w-auto min-w-[280px] h-[64px] rounded-2xl bg-on-surface text-white hover:bg-secondary shadow-xl shadow-on-surface/20 active:scale-[0.98] font-bold flex items-center justify-between px-8 gap-3 transition-all uppercase tracking-[0.15em] relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                      <span className="flex items-center gap-3">
                        <Zap size={20} className="text-secondary group-hover:text-white transition-colors" />
                        Reserve Cabin
                      </span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

      {/* Booking Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && viewingCruise && selectedCabin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-on-surface/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-secondary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-secondary">
                  <Anchor size={40} />
                </div>
                <h2 className="text-3xl font-headline font-black text-on-surface uppercase tracking-tight mb-2">Ready to Set Sail?</h2>
                <p className="text-on-surface-variant text-sm font-medium">Please confirm your selection before we secure your cabin.</p>
              </div>

              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 mb-8 space-y-4">
                <div className="flex justify-between items-center text-xs uppercase tracking-widest font-black text-on-surface-variant/60">
                  <span>Voyage Details</span>
                  <span className="text-secondary">{viewingCruise.duration}</span>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-black text-on-surface uppercase tracking-tighter">{viewingCruise.name}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1 uppercase">
                    <MapPin size={10} /> {viewingCruise.destination}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Cabin Category</p>
                    <p className="text-xs font-black text-on-surface uppercase">{selectedCabin.name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Total Fare</p>
                    <p className="text-sm font-black text-secondary">${((selectedCabin?.price || 0) + (hasTravelInsurance ? Math.round((selectedCabin?.price || 0) * 0.12) : 0)).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleBook(viewingCruise!);
                  }}
                  disabled={isBooking}
                  className="w-full py-5 bg-secondary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-on-surface transition-all shadow-xl shadow-secondary/20 active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isBooking ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>Confirm Reservation <ArrowRight size={18} /></>
                  )}
                </button>
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-5 text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:text-on-surface transition-colors"
                >
                  Back to Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Price Alert Modal */}
      <AnimatePresence>
        {showPriceAlertModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/80 backdrop-blur-md"
              onClick={() => setShowPriceAlertModal(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-10"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <Wind size={24} />
                </div>
                <div>
                  <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight">Price Monitoring</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{showPriceAlertModal.port} → {showPriceAlertModal.destination}</p>
                </div>
              </div>

              <form onSubmit={handleSetAlert} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Alert Type</label>
                  <div className="flex gap-3">
                    {['Price Drop', 'Availability'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAlertType(t as any)}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                          alertType === t ? "bg-on-surface text-white border-on-surface" : "bg-white text-on-surface-variant border-slate-200 hover:border-secondary"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Price Threshold (USD)</label>
                  <input 
                    type="number"
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(Number(e.target.value))}
                    className="w-full bg-surface-container-low px-5 py-4 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 ring-secondary/20"
                    placeholder="E.g. 2100"
                  />
                  <p className="text-[9px] text-on-surface-variant italic">Current price is ${showPriceAlertModal.price.toLocaleString()}</p>
                </div>

                <div className="pt-4 flex gap-4">
                   <button 
                    type="button"
                    onClick={() => setShowPriceAlertModal(null)}
                    className="flex-1 py-4 bg-slate-50 text-on-surface-variant rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!!isSettingAlert}
                    className="flex-[2] py-4 bg-secondary text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-secondary/20 flex items-center justify-center gap-2"
                  >
                    {isSettingAlert ? <span className="animate-pulse">Saving...</span> : 'Enable Alert'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};
