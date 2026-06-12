import React, { useState, useEffect } from 'react';
import { PlaneTakeoff, PlaneLanding, Calendar, Users, ArrowRight, Search, Filter, SlidersHorizontal, ChevronDown, CheckCircle2, Star, Clock, ShieldCheck, History, X, Info, Coffee, Wifi, Luggage, Wallet, Hotel, MapPin, Ship, Plane, Heart, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from './FirebaseProvider';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp, deleteDoc, doc, where } from 'firebase/firestore';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useToast } from './ToastContext';
import { useCurrency, CURRENCIES } from './CurrencyContext';
import { SeatMap, Seat } from './SeatMap';

interface RecentSearch {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  passengers: string;
  createdAt: any;
}

const FEATURED_ROUTES = [
  { 
    id: 1, 
    from: 'NYC', 
    to: 'LDN', 
    airline: 'British Airways', 
    price: 1250, 
    class: 'Club World', 
    duration: '7h 20m', 
    rating: 4.8,
    depTime: '10:30 PM',
    arrTime: '10:50 AM',
    flightNo: 'BA172',
    terminal: '7',
    gate: 'A12',
    baggage: {
      checked: '2 x 32kg',
      carryOn: '1 x 23kg + personal item',
      fees: 'Included'
    },
    amenities: ['Flatbed Seat', '4-Course Meal', 'Luxury Amenity Kit'],
    seatsLeft: 3,
    totalSeats: 20,
    reviews: [
      { id: 1, user: 'Alexander R.', rating: 5, comment: 'The Club World experience was impeccable. The flatbed was extremely comfortable for a red-eye.', date: '2 weeks ago' },
      { id: 2, user: 'Sarah L.', rating: 4, comment: 'Great service, though the food service was slightly delayed. Overall highly recommended.', date: '1 month ago' }
    ]
  },
  { 
    id: 2, 
    from: 'PAR', 
    to: 'DXB', 
    airline: 'Emirates', 
    price: 2100, 
    class: 'First Class', 
    duration: '6h 45m', 
    rating: 4.9,
    depTime: '11:20 AM',
    arrTime: '8:05 PM',
    flightNo: 'EK74',
    terminal: '2',
    gate: 'B08',
    baggage: {
      checked: '50kg total',
      carryOn: '2 x 7kg',
      fees: 'Included'
    },
    amenities: ['Shower Spa', 'Bvlgari Kit', 'Private Suite'],
    seatsLeft: 8,
    totalSeats: 12,
    reviews: [
      { id: 3, user: 'James W.', rating: 5, comment: 'Best flight of my life. The shower spa at 40,000ft is something everyone should try once.', date: '3 days ago' },
      { id: 4, user: 'Elena D.', rating: 5, comment: 'Emirates continues to set the bar for luxury. Private suite was worth every penny.', date: '3 weeks ago' }
    ]
  },
  { 
    id: 3, 
    from: 'TYO', 
    to: 'LAX', 
    airline: 'ANA', 
    price: 1850, 
    class: 'Business', 
    duration: '10h 15m', 
    rating: 4.9,
    depTime: '00:05 AM',
    arrTime: '6:20 PM',
    flightNo: 'NH106',
    terminal: 'I',
    gate: '148',
    baggage: {
      checked: '2 x 32kg',
      carryOn: '1 x 10kg',
      fees: 'Included'
    },
    amenities: ['Gourmet Dining', 'Wi-Fi Included', 'Priority Checked Bags'],
    seatsLeft: 15,
    totalSeats: 30,
    reviews: [
      { id: 5, user: 'Kenji T.', rating: 5, comment: 'Outstanding hospitality (Omotenashi). The food was better than most restaurants in Tokyo.', date: '1 week ago' },
      { id: 6, user: 'Michelle S.', rating: 4, comment: 'Very clean and efficient. The entertainment system had a great selection of international films.', date: '2 months ago' }
    ]
  },
  { 
    id: 4, 
    from: 'ROM', 
    to: 'MYS', 
    airline: 'Qatar Airways', 
    price: 1950, 
    class: 'QSuite', 
    duration: '9h 30m', 
    rating: 5.0,
    depTime: '4:15 PM',
    arrTime: '9:45 AM',
    flightNo: 'QR132',
    terminal: '3',
    gate: 'C22',
    baggage: {
      checked: '40kg total',
      carryOn: '2 x 7kg',
      fees: 'Included'
    },
    amenities: ['Double Bed', 'Alumni Menu', 'Oryx One Entertainment'],
    seatsLeft: 2,
    totalSeats: 16,
    reviews: [
      { id: 7, user: 'Marco B.', rating: 5, comment: 'QSuite is the closest thing to private jet travel. Truly revolutionary product.', date: 'Just now' },
      { id: 8, user: 'Chris P.', rating: 5, comment: 'Unmatched privacy and service. The double bed option made travel with my spouse so easy.', date: '1 month ago' }
    ]
  },
];

export const Flights: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { formatPrice, convertPrice, currency, setCurrencyCode } = useCurrency();
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'flights' | 'hotels'>('flights');
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [viewingFlight, setViewingFlight] = useState<typeof FEATURED_ROUTES[0] | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [hasTravelInsurance, setHasTravelInsurance] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState('2 Adults');

  // New states for filtering and alerts
  const [filters, setFilters] = useState({
    airline: 'All',
    class: 'All',
    maxPrice: 3000,
    depTime: 'All'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState<typeof FEATURED_ROUTES[0] | null>(null);
  const [alertPrice, setAlertPrice] = useState(0);
  const [alertType, setAlertType] = useState<'Price Drop' | 'Availability'>('Price Drop');

  useEffect(() => {
    if (user) {
      fetchRecentSearches();
      fetchLikedFlights();
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const originParam = params.get('origin');
    const destParam = params.get('dest');
    if (originParam) setOrigin(originParam);
    if (destParam) setDestination(destParam);
  }, [location]);

  useEffect(() => {
    setSelectedSeat(null);
  }, [viewingFlight]);

  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [likedFlights, setLikedFlights] = useState<number[]>([]);
  const [isSettingAlert, setIsSettingAlert] = useState<number | null>(null);

  const fetchLikedFlights = async () => {
    if (!user) return;
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      const q = query(savedRef, where('type', '==', 'flight'));
      const snapshot = await getDocs(q);
      const likedIds = snapshot.docs
        .map(doc => doc.data().flightId)
        .filter(id => id !== undefined);
      setLikedFlights(likedIds);
    } catch (error) {
      console.error("Error fetching liked flights:", error);
    }
  };

  const handleSetAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !showPriceAlertModal) return;
    setIsSettingAlert(showPriceAlertModal.id);
    try {
      const alertsRef = collection(db, 'users', user.uid, 'priceAlerts');
      await addDoc(alertsRef, {
        from: showPriceAlertModal.from,
        to: showPriceAlertModal.to,
        airline: showPriceAlertModal.airline,
        priceThreshold: Number(alertPrice),
        type: alertType,
        createdAt: serverTimestamp()
      });
      setShowPriceAlertModal(null);
    } catch (error) {
      console.error("Error setting alert:", error);
    } finally {
      setIsSettingAlert(null);
    }
  };

  const filteredFlights = FEATURED_ROUTES.filter(route => {
    const matchesAirline = filters.airline === 'All' || route.airline === filters.airline;
    const matchesClass = filters.class === 'All' || route.class === filters.class;
    const matchesPrice = route.price <= filters.maxPrice;
    
    // Simple time filtering
    let matchesTime = true;
    if (filters.depTime === 'Morning') matchesTime = route.depTime.includes('AM');
    if (filters.depTime === 'Evening') matchesTime = route.depTime.includes('PM');

    return matchesAirline && matchesClass && matchesPrice && matchesTime;
  });

  const handleSaveDestination = async (route: typeof FEATURED_ROUTES[0]) => {
    if (!user) return;
    setIsSaving(route.id);
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      
      const q = query(savedRef, where('flightId', '==', route.id), where('type', '==', 'flight'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'users', user.uid, 'savedDestinations', d.id)));
        await Promise.all(deletePromises);
        setLikedFlights(prev => prev.filter(id => id !== route.id));
        showToast(`Removed flight to "${route.to}" from saved flights.`, "info");
      } else {
        await addDoc(savedRef, {
          flightId: route.id,
          title: route.to,
          location: route.to,
          imageUrl: `https://images.unsplash.com/photo-1436491865332-7a61a109c0f?auto=format&fit=crop&q=80&w=800`,
          type: 'flight',
          rating: route.rating,
          price: route.price,
          recommendation: `Exclusive ${route.airline} flight from ${route.from} to ${route.to}`,
          createdAt: serverTimestamp()
        });
        setLikedFlights(prev => [...prev, route.id]);
        showToast(`Flight to "${route.to}" saved to your destinations!`, "success");
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
        .filter((s: any) => s.type === 'flight')
        .slice(0, 4) as any[];
      setRecentSearches(searches);
    } catch (error) {
      console.error("Error fetching searches:", error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    
    setIsSearching(true);
    
    if (user) {
      try {
        const searchesRef = collection(db, 'users', user.uid, 'recentSearches');
        await addDoc(searchesRef, {
          type: 'flight',
          origin,
          destination,
          date: departureDate || 'Flexible',
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error("Error saving search:", error);
      }
    }

    setTimeout(() => {
      setIsSearching(false);
      navigate(`/search?type=flight&dest=${encodeURIComponent(destination)}&origin=${encodeURIComponent(origin)}&date=${encodeURIComponent(departureDate || '')}`);
    }, 1500);
  };

  const reInitiateSearch = (search: any) => {
    setOrigin(search.origin || '');
    setDestination(search.destination || '');
    setDepartureDate(search.date !== 'Flexible' ? search.date : '');
  };

  const deleteSearch = async (searchId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'recentSearches', searchId));
      setRecentSearches(prev => prev.filter(s => s.id !== searchId));
    } catch (error) {
      console.error("Error deleting search:", error);
    }
  };

  const handleBook = async (flight: typeof FEATURED_ROUTES[0]) => {
    if (!user) return;
    setIsBooking(true);
    const insuranceCost = hasTravelInsurance ? Math.round(flight.price * 0.08) : 0;
    const seatCost = selectedSeat ? selectedSeat.price : 0;
    const totalAmount = flight.price + insuranceCost + seatCost;
    
    try {
      const bookingsRef = collection(db, 'users', user.uid, 'bookings');
      await addDoc(bookingsRef, {
        destinationTitle: `${flight.from} to ${flight.to}`,
        startDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        nights: Math.floor(Math.random() * 7) + 3,
        status: 'pending',
        imageUrl: `https://images.unsplash.com/photo-1436491865332-7a61a109c0f?auto=format&fit=crop&q=80&w=800`,
        flightInfo: `${flight.airline} • ${flight.class}`,
        airline: flight.airline,
        flightNumber: flight.flightNo,
        departureTime: flight.depTime,
        arrivalTime: flight.arrTime,
        terminal: flight.terminal,
        gate: flight.gate,
        amount: totalAmount,
        insuranceIncluded: hasTravelInsurance,
        insuranceAmount: insuranceCost,
        basePrice: flight.price,
        selectedSeat: selectedSeat ? selectedSeat.id : null,
        seatType: selectedSeat ? selectedSeat.type : null,
        seatClass: selectedSeat ? selectedSeat.class : null,
        seatCost: seatCost,
        hotelInfo: 'Pending Selection',
        budget: totalAmount,
        expenses: [],
        createdAt: serverTimestamp()
      });
      setBookingSuccess(true);
      setTimeout(() => {
        setViewingFlight(null);
        setBookingSuccess(false);
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error("Error booking flight:", error);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <main className="pt-24 min-h-screen bg-surface-container-lowest">
      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden bg-on-surface flex items-center px-8 lg:px-24">
        <img 
          src="https://images.unsplash.com/photo-1436491865332-7a61a109c0f?auto=format&fit=crop&q=80&w=2070" 
          className="absolute inset-0 w-full h-full object-cover opacity-60" 
          alt="Flight View" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-on-surface via-on-surface/40 to-transparent" />
        
        <div className="relative z-10 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-7xl font-headline font-black text-white tracking-tighter mb-6 leading-[0.9]">
              ELEVATED <br /> CONNECTIONS.
            </h1>
            <p className="text-white/80 text-xl font-body max-w-lg mb-8">
              Access curated business and first-class routes across the globe with Voyago's exclusive airline partnerships.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search Interface */}
      <div className="max-w-7xl mx-auto -mt-16 px-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-10 border border-slate-100">
          <div className="flex gap-1.5 sm:gap-4 mb-8">
            <button 
              onClick={() => setSearchType('flights')}
              className={cn(
                "flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all cursor-pointer",
                searchType === 'flights' 
                  ? "bg-secondary text-white shadow-sm" 
                  : "text-on-surface-variant hover:bg-surface-container-low"
              )}
            >
              <PlaneTakeoff size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Flights
            </button>
            <button 
              onClick={() => setSearchType('hotels')}
              className={cn(
                "flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all cursor-pointer",
                searchType === 'hotels' 
                  ? "bg-secondary text-white shadow-sm" 
                  : "text-on-surface-variant hover:bg-surface-container-low"
              )}
            >
              <Hotel size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Hotels
            </button>
            <Link 
              to="/cruises"
              className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low transition-all"
            >
              <Ship size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Cruises
            </Link>
          </div>

          {searchType === 'flights' ? (
            <form onSubmit={handleSearch} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Departure</label>
                <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl border border-transparent focus-within:border-secondary transition-all">
                  <PlaneTakeoff size={18} className="text-secondary" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" 
                    placeholder="City or Airport" 
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Destination</label>
                <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl border border-transparent focus-within:border-secondary transition-all">
                  <PlaneLanding size={18} className="text-secondary" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" 
                    placeholder="Where to?" 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Dates</label>
                <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                  <Calendar size={18} className="text-secondary" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" 
                    type="date" 
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Travelers</label>
                <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                  <Users size={18} className="text-secondary" />
                  <select 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm appearance-none"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                  >
                    <option>1 Adult</option>
                    <option>2 Adults</option>
                    <option>3 Adults</option>
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
                {isSearching ? <span className="animate-pulse">Searching...</span> : <>Search Flights <Search size={18} /></>}
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
                      Recent Searches
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {recentSearches.map((search) => (
                        <div 
                          key={search.id}
                          className="group flex items-center gap-3 pl-4 pr-2 py-2 bg-surface-container-low rounded-full border border-transparent hover:border-secondary/20 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => reInitiateSearch(search)}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-on-surface uppercase">{search.origin}</span>
                              <ArrowRight size={10} className="text-on-surface-variant" />
                              <span className="font-bold text-xs text-on-surface uppercase">{search.destination}</span>
                            </div>
                            {search.date && (
                              <span className="text-[9px] text-on-surface-variant/80 font-medium">{search.date}</span>
                            )}
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
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); navigate('/hotels'); }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Destination</label>
                <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl border border-transparent focus-within:border-secondary transition-all">
                  <MapPin size={18} className="text-secondary" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" 
                    placeholder="Where are you going?" 
                  />
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Check-in</label>
                  <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                    <Calendar size={18} className="text-secondary" />
                    <input className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Check-out</label>
                  <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                    <Calendar size={18} className="text-secondary" />
                    <input className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Guests</label>
                  <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                    <Users size={18} className="text-secondary" />
                    <select 
                      className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm appearance-none"
                      defaultValue="2 Guests"
                    >
                      <option>1 Guest</option>
                      <option>2 Guests</option>
                      <option>3+ Guests</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 flex flex-col justify-end">
                <button 
                  type="submit"
                  className="h-[60px] bg-secondary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/20"
                >
                  Search Hotels <Search size={18} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Featured Flights */}
      <section className="py-24 px-8 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.3em] mb-3 block">Premium Selection</span>
              <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tighter text-on-surface uppercase">Exclusive Routes</h2>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full border transition-colors font-bold text-xs",
                  showFilters ? "bg-on-surface text-white border-on-surface" : "border-slate-200 text-on-surface-variant hover:bg-surface-container-low"
                )}
              >
                <Filter size={16} /> Filters
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-12 overflow-hidden"
              >
                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Airline</label>
                    <select 
                      value={filters.airline}
                      onChange={(e) => setFilters({...filters, airline: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-on-surface focus:ring-2 ring-secondary/20"
                    >
                      <option>All</option>
                      <option>British Airways</option>
                      <option>Emirates</option>
                      <option>ANA</option>
                      <option>Qatar Airways</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Cabin Class</label>
                    <select 
                      value={filters.class}
                      onChange={(e) => setFilters({...filters, class: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-on-surface focus:ring-2 ring-secondary/20"
                    >
                      <option>All</option>
                      <option>Club World</option>
                      <option>First Class</option>
                      <option>Business</option>
                      <option>QSuite</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Departure Time</label>
                    <select 
                      value={filters.depTime}
                      onChange={(e) => setFilters({...filters, depTime: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-on-surface focus:ring-2 ring-secondary/20"
                    >
                      <option>All</option>
                      <option>Morning</option>
                      <option>Evening</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Max Price: ${filters.maxPrice}</label>
                    <input 
                      type="range"
                      min="1000"
                      max="3000"
                      step="100"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({...filters, maxPrice: Number(e.target.value)})}
                      className="w-full accent-secondary"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-6">
            {filteredFlights.map((route, idx) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "group relative bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer",
                  selectedRoute === route.id && "ring-2 ring-secondary border-transparent"
                )}
                onClick={() => setSelectedRoute(route.id)}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
                  <div className="lg:col-span-3 flex items-center gap-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveDestination(route);
                      }}
                      disabled={isSaving === route.id}
                      className="p-2 rounded-full hover:bg-slate-50 transition-all group"
                    >
                      <Heart 
                        size={16} 
                        className={cn(
                          "transition-all duration-300",
                          likedFlights.includes(route.id) ? "fill-red-500 text-red-500" : "text-on-surface-variant/40 group-hover:text-red-400",
                          isSaving === route.id && "animate-pulse scale-125"
                        )} 
                      />
                    </button>
                    <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center">
                      <PlaneTakeoff size={24} className="text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface">{route.airline}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded uppercase tracking-widest">{route.class}</span>
                        <div className="flex items-center gap-1 text-tertiary">
                          <Star size={10} fill="currentColor" />
                          <span className="text-[10px] font-bold">{route.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex items-center justify-between px-8 relative">
                    <div className="text-center">
                      <p className="text-2xl font-black text-on-surface">{route.from}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase">New York</p>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center gap-2 relative">
                      <div className="w-full h-px border-t border-dashed border-slate-200 relative">
                        <PlaneTakeoff size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-secondary bg-white px-1" />
                      </div>
                      <div className="flex items-center gap-1 text-on-surface-variant">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold uppercase">{route.duration}</span>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-2xl font-black text-on-surface">{route.to}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase">London</p>
                    </div>
                  </div>

                  <div className="lg:col-span-2 text-center lg:border-x border-slate-100">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Price from</p>
                    <p className="text-2xl font-black text-on-surface font-headline mb-2">{formatPrice(route.price)}</p>
                    
                    {/* Availability Indicator */}
                    <div className="px-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-tighter",
                          route.seatsLeft <= 3 ? "text-red-500" : route.seatsLeft <= 8 ? "text-orange-500" : "text-green-600"
                        )}>
                          {route.seatsLeft <= 3 ? "High Demand" : route.seatsLeft <= 8 ? "Filling Fast" : "Available"}
                        </span>
                        <span className="text-[9px] font-bold text-on-surface-variant">{route.seatsLeft}/{route.totalSeats} seats</span>
                      </div>
                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(route.seatsLeft / route.totalSeats) * 100}%` }}
                          className={cn(
                            "h-full rounded-full transition-colors",
                            route.seatsLeft <= 3 ? "bg-red-500" : route.seatsLeft <= 8 ? "bg-orange-500" : "bg-green-500"
                          )}
                        />
                      </div>
                      {route.seatsLeft <= 5 && (
                        <p className="text-[8px] font-bold text-red-500 mt-1.5 animate-pulse uppercase">Only {route.seatsLeft} seats at this price!</p>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-2 flex flex-col gap-2 justify-end">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPriceAlertModal(route);
                        setAlertPrice(route.price - 100);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white text-on-surface border border-slate-100 hover:border-secondary hover:text-secondary transition-all"
                    >
                      <Wind size={12} />
                      Set Alert
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingFlight(route);
                      }}
                      className="flex items-center gap-2 px-8 py-4 bg-secondary text-white rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/20"
                    >
                      Book Flight <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                {selectedRoute === route.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6"
                  >
                    {[
                      { icon: <ShieldCheck size={16} />, title: 'Full Flexibility', desc: 'Free changes up to 24h before' },
                      { icon: <CheckCircle2 size={16} />, title: 'Lounge Access', desc: 'Premium luxury lounge entry' },
                      { icon: <Star size={16} />, title: 'Priority Boarding', desc: 'Skip the queues' },
                    ].map((perk, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="text-secondary">{perk.icon}</div>
                        <div>
                          <p className="text-xs font-bold text-on-surface uppercase tracking-widest">{perk.title}</p>
                          <p className="text-[10px] text-on-surface-variant">{perk.desc}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* Dedicated Hotel Search Section */}
      <section className="py-24 px-8 lg:px-24 bg-surface-container-low/30">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.3em] mb-3 block">Complete Your Journey</span>
            <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tighter text-on-surface uppercase leading-none">DEDICATED HOTEL SEARCH</h2>
            <p className="text-on-surface-variant text-sm font-medium mt-4 max-w-md">Find the perfect sanctuary to match your flight itinerary. Premium accommodations at exclusive Voyago rates.</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-12 border border-slate-100">
            <form 
              onSubmit={(e) => { 
                e.preventDefault(); 
                // In a real app, logic would go here to search and store params
                navigate('/hotels'); 
              }} 
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <div className="lg:col-span-4 space-y-3">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Destination</label>
                <div className="flex items-center gap-4 bg-surface-container-low px-6 py-5 rounded-2xl border border-transparent focus-within:border-secondary transition-all">
                  <MapPin size={22} className="text-secondary" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-base" 
                    placeholder="Where are you staying?" 
                    required
                  />
                </div>
              </div>

              <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Check-in</label>
                  <div className="flex items-center gap-4 bg-surface-container-low px-6 py-5 rounded-2xl">
                    <Calendar size={22} className="text-secondary" />
                    <input className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-base" type="date" required />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Check-out</label>
                  <div className="flex items-center gap-4 bg-surface-container-low px-6 py-5 rounded-2xl">
                    <Calendar size={22} className="text-secondary" />
                    <input className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-base" type="date" required />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Number of Guests</label>
                  <div className="flex items-center gap-4 bg-surface-container-low px-6 py-5 rounded-2xl">
                    <Users size={22} className="text-secondary" />
                    <select className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-base appearance-none">
                      <option>1 Guest</option>
                      <option defaultValue="2 Guests">2 Guests</option>
                      <option>3 Guests</option>
                      <option>4+ Guests</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-12 flex justify-center mt-4">
                <button 
                  type="submit"
                  className="min-w-[280px] h-[72px] bg-secondary text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-secondary/20"
                >
                  Explore Stays <Search size={22} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Flight Details Modal */}
      <AnimatePresence>
        {viewingFlight && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm"
              onClick={() => !isBooking && setViewingFlight(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              {/* Modal Header */}
              <div className="relative h-48 bg-on-surface flex items-center justify-center p-8">
                <img 
                  src="https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&q=80&w=1000" 
                  className="absolute inset-0 w-full h-full object-cover opacity-40" 
                  alt="Cabin" 
                />
                <button 
                  onClick={() => setViewingFlight(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="relative z-10 text-center">
                  <span className="text-[10px] font-bold text-secondary-fixed uppercase tracking-[0.4em] mb-4 block">Confirm Route</span>
                  <div className="flex items-center gap-12 text-white">
                    <div>
                      <p className="text-4xl font-headline font-black">{viewingFlight.from}</p>
                      <p className="text-[10px] font-bold text-white/60 uppercase">New York</p>
                    </div>
                    <PlaneTakeoff size={32} className="text-secondary animate-pulse" />
                    <div>
                      <p className="text-4xl font-headline font-black">{viewingFlight.to}</p>
                      <p className="text-[10px] font-bold text-white/60 uppercase">London</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8 lg:p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-surface-container-low rounded-2xl text-secondary">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Schedule</p>
                        <p className="text-sm font-bold text-on-surface">{viewingFlight.depTime} — {viewingFlight.arrTime}</p>
                        <p className="text-xs text-on-surface-variant">{viewingFlight.duration} • {viewingFlight.flightNo}</p>
                        <p className="text-[10px] font-bold text-secondary mt-1 uppercase tracking-tighter">Terminal {viewingFlight.terminal} • Gate {viewingFlight.gate}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-surface-container-low rounded-2xl text-secondary">
                        <Coffee size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Amenities</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {viewingFlight.amenities.map(a => (
                            <span key={a} className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-md text-on-surface-variant text-nowrap">{a}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-surface-container-low rounded-2xl text-secondary">
                        <Luggage size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Baggage Allowance</p>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-on-surface">Checked: <span className="font-medium text-on-surface-variant">{viewingFlight.baggage.checked}</span></p>
                          <p className="text-xs font-bold text-on-surface">Carry-on: <span className="font-medium text-on-surface-variant">{viewingFlight.baggage.carryOn}</span></p>
                          <p className="text-[9px] font-bold text-secondary-fixed bg-secondary-fixed-variant/20 px-2 py-0.5 rounded-full inline-block uppercase tracking-widest mt-1">
                            Additional Fees: {viewingFlight.baggage.fees}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-surface-container-low rounded-2xl text-secondary">
                        <Star size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Rating</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-on-surface">{viewingFlight.rating}</span>
                          <div className="flex text-tertiary">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star key={i} size={10} fill={i <= Math.floor(viewingFlight.rating) ? "currentColor" : "none"} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Traveler Reviews Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Traveler Reviews</h4>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-on-surface">{viewingFlight.rating}</span>
                       <div className="flex text-tertiary">
                         {[1, 2, 3, 4, 5].map(i => (
                           <Star key={i} size={10} fill={i <= Math.floor(viewingFlight.rating) ? "currentColor" : "none"} />
                         ))}
                       </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingFlight.reviews?.map((review: any) => (
                      <div key={review.id} className="p-4 bg-surface-container-lowest border border-slate-100 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-on-surface">{review.user}</span>
                          <span className="text-[9px] text-on-surface-variant font-medium uppercase tracking-tighter">{review.date}</span>
                        </div>
                        <div className="flex text-tertiary mb-2">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} size={8} fill={i <= review.rating ? "currentColor" : "none"} />
                          ))}
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-3 italic">"{review.comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive Cabin Seat Selection */}
                {!bookingSuccess && (
                  <div className="mb-8">
                    <SeatMap 
                      flightClass={viewingFlight.class} 
                      selectedSeat={selectedSeat} 
                      onSeatSelect={setSelectedSeat} 
                    />
                  </div>
                )}

                {/* Travel Insurance Section */}
                {!bookingSuccess && (
                  <div className="mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="p-3 bg-white rounded-2xl text-secondary shadow-sm">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-on-surface uppercase">Travel Protection Plan</p>
                          <p className="text-[10px] text-on-surface-variant leading-relaxed max-w-sm">
                            Covers cancellations, medical emergencies, and travel delays. Recommended for international travel.
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
                        {hasTravelInsurance ? 'Insurance Added' : `Add Insurance (+${formatPrice(Math.round(viewingFlight.price * 0.08))})`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Booking & Fare Summary Panel */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 pt-8 border-t border-slate-100">
                  <div className="text-center md:text-left flex-1">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 flex items-center justify-center md:justify-start gap-2">
                      <span>Total Fare Breakdown</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-secondary font-black">Local Currency Toggle:</span>
                    </p>

                    {/* Integrated Currency Selector Buttons */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mb-4">
                      {Object.values(CURRENCIES).map((c) => (
                        <button
                          key={c.code}
                          onClick={() => setCurrencyCode(c.code)}
                          className={cn(
                            "px-3 py-1 text-[10px] font-black rounded-lg border transition-all cursor-pointer",
                            currency.code === c.code 
                              ? "bg-secondary text-white border-secondary shadow-md font-sans" 
                              : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                          )}
                        >
                          {c.code} ({c.symbol})
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col gap-1 mb-3">
                      <div className="flex justify-between md:justify-start gap-6 text-[11px] font-medium text-on-surface-variant">
                        <span>Base Flight:</span>
                        <span className="font-semibold font-mono text-on-surface">{formatPrice(viewingFlight.price)}</span>
                      </div>
                      {hasTravelInsurance && (
                        <div className="flex justify-between md:justify-start gap-6 text-[11px] font-medium text-on-surface-variant">
                          <span>Insurance Protection:</span>
                          <span className="font-semibold font-mono text-emerald-600">+{formatPrice(Math.round(viewingFlight.price * 0.08))}</span>
                        </div>
                      )}
                      {selectedSeat && (
                        <div className="flex justify-between md:justify-start gap-6 text-[11px] font-medium text-on-surface-variant">
                          <span>Seat Selection ({selectedSeat.id}):</span>
                          <span className="font-semibold font-mono text-emerald-600">
                            {selectedSeat.price > 0 ? `+${formatPrice(selectedSeat.price)}` : 'FREE'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-baseline justify-center md:justify-start gap-2 mb-2">
                      <span className="text-4xl font-headline font-black text-on-surface">
                        {formatPrice(
                          viewingFlight.price + 
                          (hasTravelInsurance ? Math.round(viewingFlight.price * 0.08) : 0) + 
                          (selectedSeat ? selectedSeat.price : 0)
                        )}
                      </span>
                      <span className="text-xs font-semibold text-on-surface-variant">/ traveler</span>
                    </div>

                    {/* Live Availability in Modal */}
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        viewingFlight.seatsLeft <= 3 ? "bg-red-500" : "bg-green-500"
                      )} />
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        {viewingFlight.seatsLeft} {viewingFlight.seatsLeft === 1 ? 'Seat' : 'Seats'} Remaining
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleBook(viewingFlight)}
                    disabled={isBooking || bookingSuccess}
                    className={cn(
                      "w-full md:w-auto min-w-[220px] h-[64px] rounded-2xl font-bold flex items-center justify-center gap-3 transition-all relative overflow-hidden group self-end",
                      bookingSuccess 
                        ? "bg-green-500 text-white shadow-lg shadow-green-200" 
                        : "bg-secondary text-white hover:bg-secondary/90 shadow-xl shadow-secondary/30 hover:shadow-secondary/50 active:scale-95"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {isBooking ? (
                        <motion.div 
                          key="loading"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" 
                        />
                      ) : bookingSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle2 size={24} />
                          <span>Booking Confirmed</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="default"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2"
                        >
                          <PlaneTakeoff size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          <span>Book Flight Now</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
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
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{showPriceAlertModal.from} → {showPriceAlertModal.to}</p>
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
                    placeholder="E.g. 1100"
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
