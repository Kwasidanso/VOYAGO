import React, { useState, useEffect } from 'react';
import { Hotel, Calendar, Users, ArrowRight, Search, Filter, SlidersHorizontal, Star, MapPin, ShieldCheck, History, X, Info, Coffee, Wifi, Luggage, Wallet, Bed, Bath, Wind, Heart, Sparkles, Plane, Building2, Image as ImageIcon, Tag, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from './FirebaseProvider';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp, deleteDoc, doc, getDoc, setDoc, where } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from './ToastContext';
import { useCurrency, CURRENCIES } from './CurrencyContext';

const AMENITY_OPTIONS = ['Spa', 'Infinity Pool', 'Fine Dining', 'City View', 'Butler Service', 'Luxury Spa', 'Garden View', 'Gym', 'Wifi', 'Free Breakfast', 'Parking'];
const HOTEL_TYPE_OPTIONS = ['Boutique', 'Resort', 'Business', 'Luxury', 'All-Inclusive', 'Eco-Friendly'];

interface RecentHotelSearch {
  id: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  createdAt: any;
}

export const FEATURED_HOTELS = [
  { 
    id: 1, 
    name: 'Aman Tokyo', 
    location: 'Tokyo, Japan', 
    country: 'Japan',
    coordinates: { lat: 35.6811, lng: 139.7671 },
    price: 1850, 
    rating: 4.9,
    type: 'Luxury',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2070',
    amenities: ['Spa', 'Infinity Pool', 'Fine Dining', 'City View'],
    roomsLeft: 2,
    totalRooms: 15,
    description: 'A sanctuary atop the Otemachi Tower, Aman Tokyo balances urban dynamism with a profound sense of Zen.',
    reviews: [
      { id: 1, user: 'Satoshi N.', rating: 5, comment: 'Breathtaking views and impeccable service. The most peaceful place in Tokyo.', date: '3 days ago' },
      { id: 2, user: 'Emily R.', rating: 5, comment: 'Absolutely stunning architecture. The pool is a dream.', date: '2 weeks ago' }
    ]
  },
  { 
    id: 2, 
    name: 'The Ritz-Carlton', 
    location: 'Paris, France', 
    country: 'France',
    coordinates: { lat: 48.8680, lng: 2.3292 },
    price: 2400, 
    rating: 5.0,
    type: 'Luxury',
    image: 'https://images.unsplash.com/photo-1551882547-ff43c63ebb7a?auto=format&fit=crop&q=80&w=2070',
    amenities: ['Butler Service', 'Michelin Star Dining', 'Luxury Spa', 'Garden View'],
    roomsLeft: 4,
    totalRooms: 20,
    description: 'Place Vendôme’s most legendary address, offering a refined blend of French history and contemporary luxury.',
    reviews: [
      { id: 3, user: 'Jean L.', rating: 5, comment: 'The quintessence of French luxury. Every detail is perfect.', date: '1 month ago' },
      { id: 4, user: 'Sophie M.', rating: 4, comment: 'Exquisite decor and service. A truly magical stay.', date: '2 months ago' }
    ]
  },
  { 
    id: 3, 
    name: 'Belmond Hotel Cipriani', 
    location: 'Venice, Italy', 
    country: 'Italy',
    coordinates: { lat: 45.4244, lng: 12.3392 },
    price: 1950, 
    rating: 4.8,
    type: 'Boutique',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=2070',
    amenities: ['Private Boat', 'Tennis Courts', 'Olympic Pool', 'Lagoon View'],
    roomsLeft: 8,
    totalRooms: 30,
    description: 'An island sanctuary in the heart of Venice, where legendary service meets timeless Venetian elegance.',
    reviews: [
      { id: 5, user: 'Marco G.', rating: 5, comment: 'A paradise on its own island. The Cip’s Club is iconic.', date: '1 week ago' },
      { id: 6, user: 'Anna K.', rating: 4, comment: 'Wonderful location and gardens. The pool area is very relaxing.', date: '3 weeks ago' }
    ]
  },
  { 
    id: 4, 
    name: 'Four Seasons Resort', 
    location: 'Bora Bora, French Polynesia', 
    country: 'French Polynesia',
    coordinates: { lat: -16.4816, lng: -151.7107 },
    price: 3200, 
    rating: 5.0,
    type: 'Resort',
    image: 'https://images.unsplash.com/photo-1506929199330-fe06757d61b3?auto=format&fit=crop&q=80&w=2070',
    amenities: ['Overwater Bungalow', 'Snorkeling', 'Private Deck', 'Ocean Front'],
    roomsLeft: 1,
    totalRooms: 10,
    description: 'Experience overwater luxury in the heart of the South Pacific, with views of Mount Otemanu.',
    reviews: [
      { id: 7, user: 'David P.', rating: 5, comment: 'Heaven on earth. Waking up to the turquoise lagoon is priceless.', date: 'Just now' },
      { id: 8, user: 'Laura S.', rating: 5, comment: 'The best service we have ever experienced. A true honeymoon dream.', date: '2 months ago' }
    ]
  },
  { 
    id: 5, 
    name: 'Sandals Royal Barbados', 
    location: 'St. Lawrence Gap, Barbados', 
    country: 'Barbados',
    coordinates: { lat: 13.0645, lng: -59.5714 },
    price: 1200, 
    rating: 4.7,
    type: 'All-Inclusive',
    image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=2070',
    amenities: ['Infinity Pool', 'Diving', 'Unlimited Dining', 'Ocean View'],
    roomsLeft: 5,
    totalRooms: 20,
    description: 'An all-suite Caribbean resort where luxury meets island charm, featuring the first rooftop pool in the chain.',
    reviews: [
      { id: 9, user: 'Mark T.', rating: 5, comment: 'Incredible value for money. The food options are endless.', date: '5 days ago' }
    ]
  },
];

export const Hotels: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { formatPrice, convertPrice, currency, setCurrencyCode } = useCurrency();
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<number | null>(null);
  const [viewingHotel, setViewingHotel] = useState<typeof FEATURED_HOTELS[0] | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentHotelSearch[]>([]);
  const [destination, setDestination] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2 Guests');

  // Filtering states
  const [maxPrice, setMaxPrice] = useState(4000);
  const [minRating, setMinRating] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'match' | 'price-low' | 'price-high' | 'rating'>('match');
  const [showFilters, setShowFilters] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Preferences state
  const [preferredAmenities, setPreferredAmenities] = useState<string[]>([]);
  const [preferredHotelTypes, setPreferredHotelTypes] = useState<string[]>([]);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Hotel Registration States
  const [showRegistration, setShowRegistration] = useState(false);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regForm, setRegForm] = useState({
    companyName: '',
    contactEmail: '',
    hotelName: '',
    location: '',
    description: '',
    basePrice: '',
    hotelType: 'Luxury',
    amenities: [] as string[],
    imageUrl: '', // Primary image
    promotions: [{ title: '', discount: '', terms: '' }]
  });

  const handleAddPromotion = () => {
    setRegForm(prev => ({
      ...prev,
      promotions: [...prev.promotions, { title: '', discount: '', terms: '' }]
    }));
  };

  const handleUpdatePromotion = (idx: number, field: string, value: string) => {
    const newPromotions = [...regForm.promotions];
    newPromotions[idx] = { ...newPromotions[idx], [field]: value };
    setRegForm(prev => ({ ...prev, promotions: newPromotions }));
  };

  const handleRemovePromotion = (idx: number) => {
    setRegForm(prev => ({
      ...prev,
      promotions: prev.promotions.filter((_, i) => i !== idx)
    }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingReg(true);
    try {
      const regRef = collection(db, 'hotelRegistrations');
      await addDoc(regRef, {
        ...regForm,
        basePrice: Number(regForm.basePrice),
        ownerId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        imageUrls: regForm.imageUrl ? [regForm.imageUrl] : []
      });
      setRegSuccess(true);
      setTimeout(() => {
        setShowRegistration(false);
        setRegSuccess(false);
        setRegForm({
          companyName: '',
          contactEmail: '',
          hotelName: '',
          location: '',
          description: '',
          basePrice: '',
          hotelType: 'Luxury',
          amenities: [],
          imageUrl: '',
          promotions: [{ title: '', discount: '', terms: '' }]
        });
      }, 2500);
    } catch (error) {
      console.error("Error registering company:", error);
    } finally {
      setIsSubmittingReg(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecentSearches();
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    try {
      const prefRef = doc(db, 'users', user.uid, 'settings', 'hotelPreferences');
      const prefSnap = await getDoc(prefRef);
      if (prefSnap.exists()) {
        const data = prefSnap.data();
        setPreferredAmenities(data.amenities || []);
        setPreferredHotelTypes(data.hotelTypes || []);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    setIsSavingPreferences(true);
    try {
      const prefRef = doc(db, 'users', user.uid, 'settings', 'hotelPreferences');
      await setDoc(prefRef, {
        amenities: preferredAmenities,
        hotelTypes: preferredHotelTypes,
        updatedAt: serverTimestamp()
      });
      setShowPreferences(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setPreferredAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const toggleHotelType = (type: string) => {
    setPreferredHotelTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [likedHotels, setLikedHotels] = useState<number[]>([]);
  const [isSettingAlert, setIsSettingAlert] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchLikedHotels();
    }
  }, [user]);

  const fetchLikedHotels = async () => {
    if (!user) return;
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      const q = query(savedRef, where('type', '==', 'hotel'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const likedIds = snapshot.docs
        .map(doc => doc.data().hotelId)
        .filter(id => id !== undefined);
      setLikedHotels(likedIds);
    } catch (error) {
      console.error("Error fetching liked hotels:", error);
    }
  };

  const handleSetAlert = async (hotel: typeof FEATURED_HOTELS[0]) => {
    if (!user) return;
    setIsSettingAlert(hotel.id);
    try {
      const alertsRef = collection(db, 'users', user.uid, 'alerts');
      await addDoc(alertsRef, {
        destination: hotel.name,
        location: hotel.location,
        type: ['price', 'advisory'],
        threshold: hotel.price,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error setting alert:", error);
    } finally {
      setIsSettingAlert(null);
    }
  };

  const handleSaveDestination = async (hotel: typeof FEATURED_HOTELS[0]) => {
    if (!user) return;
    setIsSaving(hotel.id);
    try {
      const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
      
      // Check if already liked
      const q = query(savedRef, where('hotelId', '==', hotel.id), where('type', '==', 'hotel'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Remove from favorites
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'users', user.uid, 'savedDestinations', d.id)));
        await Promise.all(deletePromises);
        setLikedHotels(prev => prev.filter(id => id !== hotel.id));
        showToast(`Removed "${hotel.name}" from saved hotel.`, "info");
      } else {
        // Add to favorites
        await addDoc(savedRef, {
          hotelId: hotel.id,
          title: hotel.name,
          location: hotel.location,
          imageUrl: hotel.image,
          type: 'hotel',
          rating: hotel.rating,
          price: hotel.price,
          recommendation: `Luxury stay in ${hotel.location}`,
          createdAt: serverTimestamp()
        });
        setLikedHotels(prev => [...prev, hotel.id]);
        showToast(`"${hotel.name}" saved to your destinations!`, "success");
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
      const searchesRef = collection(db, 'users', user.uid, 'recentHotelSearches');
      const q = query(searchesRef, orderBy('createdAt', 'desc'), limit(4));
      const querySnapshot = await getDocs(q);
      const searches = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RecentHotelSearch[];
      setRecentSearches(searches);
    } catch (error) {
      console.error("Error fetching hotel searches:", error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) return;
    
    setIsSearching(true);
    
    if (user) {
      try {
        const searchesRef = collection(db, 'users', user.uid, 'recentHotelSearches');
        await addDoc(searchesRef, {
          destination,
          checkIn,
          checkOut,
          guests,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error saving hotel search:", error);
      }
    }

    setTimeout(() => {
      setIsSearching(false);
      navigate(`/search?type=hotel&dest=${encodeURIComponent(destination)}&origin=${encodeURIComponent(departureCity)}&date=${encodeURIComponent(checkIn ? `${checkIn} - ${checkOut}` : '')}`);
    }, 1500);
  };

  const reInitiateSearch = (search: RecentHotelSearch) => {
    setDestination(search.destination);
    setCheckIn(search.checkIn || '');
    setCheckOut(search.checkOut || '');
    setGuests(search.guests || '2 Guests');
  };

  const sortedHotels = [...FEATURED_HOTELS]
    .filter(hotel => {
      const matchesPrice = hotel.price <= maxPrice;
      const matchesRating = hotel.rating >= minRating;
      const matchesType = typeFilter === 'All' || hotel.type === typeFilter;
      return matchesPrice && matchesRating && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'match') {
        let scoreA = 0;
        let scoreB = 0;

        // Match amenities
        preferredAmenities.forEach(pref => {
          if (a.amenities.includes(pref)) scoreA += 1;
          if (b.amenities.includes(pref)) scoreB += 1;
        });

        // Ties are broken by rating
        if (scoreB === scoreA) return b.rating - a.rating;
        return scoreB - scoreA;
      }
      
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      
      return 0;
    });

  const deleteSearch = async (searchId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'recentHotelSearches', searchId));
      setRecentSearches(prev => prev.filter(s => s.id !== searchId));
    } catch (error) {
      console.error("Error deleting hotel search:", error);
    }
  };

  const handleBook = async (hotel: typeof FEATURED_HOTELS[0]) => {
    if (!user) return;
    setIsBooking(true);
    try {
      const bookingData = {
        destinationTitle: hotel.name,
        startDate: checkIn || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        endDate: checkOut || '',
        nights: checkIn && checkOut ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) : 4,
        status: 'confirmed',
        imageUrl: hotel.image,
        hotelName: hotel.name,
        roomType: 'Deluxe Suite',
        checkIn: checkIn || 'TBD',
        checkOut: checkOut || 'TBD',
        amount: hotel.price,
        budget: hotel.price,
        departureCity: departureCity || 'Self-arranged',
        expenses: [],
        createdAt: serverTimestamp()
      };

      const bookingsRef = collection(db, 'users', user.uid, 'bookings');
      const docRef = await addDoc(bookingsRef, bookingData);
      
      setBookingDetails({ ...bookingData, id: docRef.id });
      setBookingSuccess(true);
      
      setTimeout(() => {
        setViewingHotel(null);
        setBookingSuccess(false);
        setShowConfirmation(true);
      }, 1500);
    } catch (error) {
      console.error("Error booking hotel:", error);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <main className="pt-24 min-h-screen bg-surface-container-lowest">
      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden bg-on-surface flex items-center px-8 lg:px-24">
        <img 
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=2070" 
          className="absolute inset-0 w-full h-full object-cover opacity-60" 
          alt="Hotel View" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-on-surface via-on-surface/40 to-transparent" />
        
        <div className="relative z-10 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-7xl font-headline font-black text-white tracking-tighter mb-6 leading-[0.9]">
              LUXURY <br /> SANCTUARIES.
            </h1>
            <p className="text-white/80 text-xl font-body max-w-lg mb-8">
              Immerse yourself in world-class hospitality with Voyago's hand-picked collection of five-star retreats.
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
            <span className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest bg-secondary text-white shadow-sm transition-colors">
              Hotels
            </span>
            <Link to="/cruises" className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Cruises
            </Link>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Departure City</label>
              <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl border border-transparent focus-within:border-secondary transition-all">
                <Plane size={18} className="text-secondary" />
                <input 
                  className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" 
                  placeholder="Leaving from?" 
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                />
              </div>
            </div>

            <div className="lg:col-span-3 space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Destination</label>
              <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl border border-transparent focus-within:border-secondary transition-all">
                <MapPin size={18} className="text-secondary" />
                <input 
                  className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm" 
                  placeholder="Where are you going?" 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
            </div>

            <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Check-in</label>
                <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                  <Calendar size={18} className="text-secondary" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-xs" 
                    type="date" 
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Check-out</label>
                <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                  <Calendar size={18} className="text-secondary" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-xs" 
                    type="date" 
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Guests</label>
                <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                  <Users size={18} className="text-secondary" />
                  <select 
                    className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-xs appearance-none"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                  >
                    <option>1 Guest</option>
                    <option>2 Guests</option>
                    <option>3+ Guests</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col justify-end">
              <button 
                type="submit"
                disabled={isSearching}
                className="h-[60px] bg-secondary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/20"
              >
                {isSearching ? <span className="animate-pulse">Searching...</span> : <>Search Hotels <Search size={18} /></>}
              </button>
            </div>

            {(preferredAmenities.length > 0 || preferredHotelTypes.length > 0) && (
              <div className="lg:col-span-12 flex items-center gap-3 pt-4 border-t border-slate-50">
                <span className="text-[9px] font-bold text-secondary uppercase tracking-widest">Active Preferences:</span>
                <div className="flex flex-wrap gap-2">
                  {[...preferredAmenities, ...preferredHotelTypes].slice(0, 5).map(pref => (
                    <span key={pref} className="px-2 py-0.5 bg-secondary/10 text-secondary text-[8px] font-black rounded uppercase">{pref}</span>
                  ))}
                  {(preferredAmenities.length + preferredHotelTypes.length) > 5 && (
                    <span className="text-[8px] font-bold text-on-surface-variant">+{ (preferredAmenities.length + preferredHotelTypes.length) - 5 } more</span>
                  )}
                </div>
              </div>
            )}

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
                      Recent Hotel Searches
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
                            {search.checkIn && (
                              <span className="text-[9px] text-on-surface-variant/80 font-medium">{search.checkIn} — {search.checkOut || 'TBD'}</span>
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
        </div>
      </div>

      {/* Featured Hotels */}
      <section className="py-24 px-8 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.3em] mb-3 block">Bespoke Living</span>
              <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tighter text-on-surface uppercase">CURATED REFUGE</h2>
            </div>
            <div className="flex flex-wrap gap-4 justify-end">
              <button 
                onClick={() => setShowRegistration(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-on-surface text-white font-bold text-xs hover:bg-secondary transition-all shadow-lg shadow-on-surface/10"
              >
                <Building2 size={16} /> Register Company
              </button>
              <button 
                onClick={() => setShowPreferences(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-full border border-secondary/20 text-secondary font-bold text-xs hover:bg-secondary/5 transition-colors shadow-sm"
              >
                <SlidersHorizontal size={16} /> Personalize
              </button>
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
                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-8">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Hotel Type</label>
                    <select 
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 ring-secondary/20"
                    >
                      <option value="All">All Types</option>
                      {['Boutique', 'Resort', 'Luxury', 'All-Inclusive'].map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Sort By</label>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 ring-secondary/20"
                    >
                      <option value="match">Matching Perks</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Top Rated</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Price Range (Max)</label>
                    <input 
                      type="range" 
                      min="500" 
                      max="5000" 
                      step="100"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="w-full accent-secondary"
                    />
                    <div className="flex justify-between mt-2 text-xs font-bold text-on-surface">
                      <span>$500</span>
                      <span>${maxPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Minimum Rating</label>
                    <div className="flex gap-2">
                      {[3, 3.5, 4, 4.5, 5].map(rating => (
                        <button
                          key={rating}
                          onClick={() => setMinRating(rating)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                            minRating === rating ? "bg-secondary text-white" : "bg-slate-50 text-on-surface-variant hover:bg-slate-100"
                          )}
                        >
                          {rating}+
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Quick Filters</label>
                    <div className="flex flex-wrap gap-2">
                       <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 hover:border-secondary transition-colors">Free Wifi</button>
                       <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 hover:border-secondary transition-colors">Breakfast</button>
                       <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 hover:border-secondary transition-colors">Parking</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedHotels.map((hotel, idx) => (
              <motion.div
                key={hotel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer",
                  selectedHotel === hotel.id && "ring-2 ring-secondary"
                )}
                onClick={() => setSelectedHotel(hotel.id)}
              >
                <div className="relative h-64">
                  <img src={hotel.image} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt={hotel.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {hotel.amenities.some(a => preferredAmenities.includes(a)) && (
                    <div className="absolute top-4 left-16 bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full flex items-center gap-1 shadow-sm z-10 animate-in fade-in slide-in-from-left-4 duration-500">
                      <Sparkles size={10} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Tailored for you</span>
                    </div>
                  )}

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveDestination(hotel);
                    }}
                    disabled={isSaving === hotel.id}
                    className="absolute top-4 left-4 h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all shadow-sm z-10"
                  >
                    <Heart 
                      size={20} 
                      className={cn(
                        isSaving === hotel.id && "animate-pulse",
                        likedHotels.includes(hotel.id) ? "fill-red-500 text-red-500" : "text-on-surface-variant/40"
                      )} 
                    />
                  </button>
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={12} fill="#FACC15" className="text-yellow-400" />
                    <span className="text-xs font-black">{hotel.rating}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-headline font-black text-xl text-on-surface mb-1">{hotel.name}</h3>
                  <div className="flex items-center gap-1 text-on-surface-variant mb-4">
                    <MapPin size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{hotel.location}</span>
                  </div>

                  <AnimatePresence>
                    {selectedHotel === hotel.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 space-y-4 overflow-hidden"
                      >
                        <p className="text-[10px] text-on-surface-variant leading-relaxed line-clamp-3">
                          {hotel.description}
                        </p>
                        
                        {hotel.reviews?.[0] && (
                          <div className="p-3 bg-surface-container-lowest border border-slate-100 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[8px] font-black text-secondary uppercase tracking-widest">Top Review</span>
                              <div className="flex text-yellow-400">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <Star key={i} size={6} fill={i <= hotel.reviews[0].rating ? "currentColor" : "none"} />
                                ))}
                              </div>
                            </div>
                            <p className="text-[9px] text-on-surface-variant italic line-clamp-2">"{hotel.reviews[0].comment}"</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {hotel.amenities.slice(0, selectedHotel === hotel.id ? 8 : 3).map(a => (
                      <span key={a} className="text-[9px] font-bold bg-surface-container-low px-2 py-0.5 rounded text-on-surface-variant uppercase">{a}</span>
                    ))}
                  </div>

                  {/* Availability Indicator */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-tighter",
                        hotel.roomsLeft <= 2 ? "text-red-500" : hotel.roomsLeft <= 5 ? "text-orange-500" : "text-green-600"
                      )}>
                        {hotel.roomsLeft <= 2 ? "Critical Demand" : hotel.roomsLeft <= 5 ? "Filling Fast" : "Available"}
                      </span>
                      <span className="text-[9px] font-bold text-on-surface-variant">{hotel.roomsLeft}/{hotel.totalRooms} left</span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(hotel.roomsLeft / hotel.totalRooms) * 100}%` }}
                        className={cn(
                          "h-full rounded-full transition-colors",
                          hotel.roomsLeft <= 2 ? "bg-red-500" : hotel.roomsLeft <= 5 ? "bg-orange-500" : "bg-green-500"
                        )}
                      />
                    </div>
                    {hotel.roomsLeft <= 3 && (
                      <p className="text-[8px] font-bold text-red-500 mt-1.5 animate-pulse uppercase tracking-tight">Only {hotel.roomsLeft} rooms left at this price!</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase">Starting avg</p>
                      <p className="text-xl font-black text-on-surface">{formatPrice(hotel.price)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetAlert(hotel);
                        }}
                        disabled={isSettingAlert === hotel.id}
                        className="p-3 bg-surface-container-low text-on-surface-variant rounded-xl hover:text-secondary transition-all"
                        title="Set Alert"
                      >
                        <Wind size={18} className={cn(isSettingAlert === hotel.id && "animate-spin")} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingHotel(hotel);
                        }}
                        className="p-3 bg-secondary text-white rounded-xl shadow-lg shadow-secondary/20 hover:scale-110 active:scale-95 transition-all"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Preferences Modal */}
      <AnimatePresence>
        {showPreferences && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm"
              onClick={() => setShowPreferences(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tight">Stay Preferences</h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">Personalize your future hotel recommendations</p>
                </div>
                <button 
                  onClick={() => setShowPreferences(false)}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} className="text-on-surface-variant" />
                </button>
              </div>

              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-4 block">Essential Amenities</label>
                  <div className="flex flex-wrap gap-2">
                    {AMENITY_OPTIONS.map(amenity => (
                      <button
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                          preferredAmenities.includes(amenity)
                            ? "bg-secondary text-white border-secondary shadow-md shadow-secondary/20"
                            : "bg-surface-container-lowest border-slate-200 text-on-surface-variant hover:border-secondary/40"
                        )}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-4 block">Preferred Hotel Types</label>
                  <div className="flex flex-wrap gap-2">
                    {HOTEL_TYPE_OPTIONS.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleHotelType(type)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                          preferredHotelTypes.includes(type)
                            ? "bg-secondary text-white border-secondary shadow-md shadow-secondary/20"
                            : "bg-surface-container-lowest border-slate-200 text-on-surface-variant hover:border-secondary/40"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setShowPreferences(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-sm text-on-surface-variant hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={savePreferences}
                  disabled={isSavingPreferences}
                  className="flex-[2] bg-on-surface text-white rounded-2xl font-bold text-sm hover:bg-secondary transition-all shadow-lg shadow-secondary/10 flex items-center justify-center gap-2"
                >
                  {isSavingPreferences ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Preferences'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hotel Details Modal */}
      <AnimatePresence>
        {viewingHotel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm"
              onClick={() => !isBooking && setViewingHotel(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="relative h-64">
                <img src={viewingHotel.image} className="w-full h-full object-cover" alt={viewingHotel.name} />
                <button 
                  onClick={() => setViewingHotel(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-on-surface/20 text-white hover:bg-on-surface/40 transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                <div className="absolute bottom-6 left-8">
                  <span className="text-[10px] font-bold bg-secondary text-white px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">Preferred Partner</span>
                  <h2 className="text-4xl font-headline font-black text-on-surface">{viewingHotel.name}</h2>
                </div>
              </div>

                <div className="p-8 lg:p-10 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Description</p>
                        <p className="text-sm font-medium text-on-surface-variant leading-relaxed">
                          {viewingHotel.description}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-surface-container-low rounded-lg text-secondary">
                            <Bed size={16} />
                          </div>
                          <span className="text-xs font-bold">King Suite</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-surface-container-low rounded-lg text-secondary">
                            <Bath size={16} />
                          </div>
                          <span className="text-xs font-bold">Spa Bath</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Amenities</p>
                        <div className="flex flex-wrap gap-2">
                          {viewingHotel.amenities.map(a => {
                            const isPreferred = preferredAmenities.includes(a);
                            return (
                              <span key={a} className={cn(
                                "text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                                isPreferred 
                                  ? "bg-secondary text-white shadow-sm shadow-secondary/20"
                                  : "bg-slate-100 text-on-surface-variant"
                              )}>
                                {isPreferred && <Sparkles size={10} />}
                                {a}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="p-4 bg-surface-container-low rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-on-surface">Live Availability</span>
                          <span className="text-[10px] font-black text-secondary">{viewingHotel.roomsLeft} rooms left</span>
                        </div>
                        <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(viewingHotel.roomsLeft / viewingHotel.totalRooms) * 100}%` }}
                            className={cn(
                              "h-full rounded-full transition-colors",
                              viewingHotel.roomsLeft <= 2 ? "bg-red-500" : viewingHotel.roomsLeft <= 5 ? "bg-orange-500" : "bg-green-500"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Traveler Reviews Section */}
                  <div className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Traveler Reviews</h4>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-on-surface">{viewingHotel.rating}</span>
                         <div className="flex text-yellow-500">
                           {[1, 2, 3, 4, 5].map(i => (
                             <Star key={i} size={10} fill={i <= Math.floor(viewingHotel.rating) ? "currentColor" : "none"} />
                           ))}
                         </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {viewingHotel.reviews?.map((review: any) => (
                        <div key={review.id} className="p-4 bg-surface-container-lowest border border-slate-100 rounded-2xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-on-surface">{review.user}</span>
                            <span className="text-[9px] text-on-surface-variant font-medium uppercase tracking-tighter">{review.date}</span>
                          </div>
                          <div className="flex text-yellow-500 mb-2">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star key={i} size={8} fill={i <= review.rating ? "currentColor" : "none"} />
                            ))}
                          </div>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-3 italic">"{review.comment}"</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 pt-8 border-t border-slate-100 sticky bottom-0 bg-white pb-2 mt-auto">
                    <div className="text-center md:text-left flex-1 animate-fadeIn">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Nightly Rate</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] font-black font-sans text-secondary uppercase">Local Currency Toggle:</span>
                      </div>

                      {/* Currency togglers inside Hotels drawer */}
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-1 mb-3">
                        {Object.values(CURRENCIES).map((c) => (
                          <button
                            key={c.code}
                            onClick={() => setCurrencyCode(c.code)}
                            className={cn(
                              "px-2.5 py-0.5 text-[9px] font-black rounded-md border transition-all cursor-pointer",
                              currency.code === c.code 
                                ? "bg-secondary text-white border-secondary shadow-sm font-sans" 
                                : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                            )}
                          >
                            {c.code}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-baseline justify-center md:justify-start gap-2 mb-2">
                        <span className="text-4xl font-headline font-black text-on-surface">{formatPrice(viewingHotel.price)}</span>
                        <span className="text-xs font-medium text-on-surface-variant">/ night</span>
                      </div>
                      {/* Live Availability dot */}
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full animate-pulse",
                          viewingHotel.roomsLeft <= 3 ? "bg-red-500" : "bg-green-500"
                        )} />
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                          {viewingHotel.roomsLeft} {viewingHotel.roomsLeft === 1 ? 'Room' : 'Rooms'} Remaining
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleBook(viewingHotel)}
                      disabled={isBooking || bookingSuccess}
                      className={cn(
                        "w-full md:w-auto min-w-[220px] h-[64px] rounded-2xl font-bold flex items-center justify-center gap-3 transition-all self-end",
                        bookingSuccess ? "bg-green-500 text-white" : "bg-on-surface text-white hover:bg-secondary shadow-xl active:scale-95"
                      )}
                    >
                      {isBooking ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : bookingSuccess ? 'Booking Confirmed' : 'Reserve Now'}
                    </button>
                  </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Booking Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && bookingDetails && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 text-center"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={40} />
              </div>
              <h2 className="text-3xl font-headline font-black text-on-surface uppercase tracking-tight mb-2">Booking Confirmed!</h2>
              <p className="text-on-surface-variant text-sm mb-8 font-medium">Your stay at {bookingDetails.hotelName} is successfully secured.</p>
              
              <div className="bg-surface-container-low rounded-2xl p-6 mb-10 text-left space-y-4">
                <div className="flex justify-between border-b border-slate-200 pb-3">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Confirmation #</span>
                  <span className="text-xs font-black text-on-surface">{bookingDetails.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-3">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Dates</span>
                  <span className="text-xs font-black text-on-surface">{bookingDetails.checkIn} — {bookingDetails.checkOut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Amount</span>
                  <span className="text-xs font-black text-secondary">${(bookingDetails.amount * bookingDetails.nights).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowConfirmation(false);
                    navigate('/dashboard');
                  }}
                  className="w-full py-4 bg-on-surface text-white rounded-xl font-bold text-sm hover:bg-secondary transition-all flex items-center justify-center gap-2"
                >
                  Go to My Dashboard
                </button>
                <button 
                  onClick={() => setShowConfirmation(false)}
                  className="w-full py-4 bg-white text-on-surface-variant rounded-xl font-bold text-sm hover:bg-slate-50 transition-all border border-slate-200"
                >
                  Plan More Trips
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Hotel Company Registration Modal */}
      <AnimatePresence>
        {showRegistration && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/80 backdrop-blur-md"
              onClick={() => !isSubmittingReg && setShowRegistration(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-surface-container-lowest">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-on-surface text-white flex items-center justify-center">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-headline font-black text-on-surface uppercase tracking-tight">Partner Registration</h3>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Growth begins here</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRegistration(false)}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRegisterSubmit} className="p-8 lg:p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {regSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 size={48} />
                    </div>
                    <h4 className="text-2xl font-headline font-black text-on-surface mb-2 tracking-tight uppercase">Registration Received</h4>
                    <p className="text-on-surface-variant text-sm font-medium">Your request for {regForm.hotelName} is now being reviewed by our curators.</p>
                  </motion.div>
                ) : (
                  <div className="space-y-10">
                    {/* Section: Company Info */}
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-4 bg-secondary rounded-full" />
                        <h4 className="text-[10px] font-black text-on-surface uppercase tracking-[0.2em]">Company Identity</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Entity Name</label>
                          <input 
                            required
                            value={regForm.companyName}
                            onChange={e => setRegForm({...regForm, companyName: e.target.value})}
                            className="w-full bg-surface-container-low px-5 py-4 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 ring-secondary/20"
                            placeholder="e.g. Aman Group"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Contact Email</label>
                          <input 
                            required
                            type="email"
                            value={regForm.contactEmail}
                            onChange={e => setRegForm({...regForm, contactEmail: e.target.value})}
                            className="w-full bg-surface-container-low px-5 py-4 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 ring-secondary/20"
                            placeholder="partners@company.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Hotel Details */}
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-4 bg-secondary rounded-full" />
                        <h4 className="text-[10px] font-black text-on-surface uppercase tracking-[0.2em]">Hotel Portfolio</h4>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Hotel Title</label>
                            <input 
                              required
                              value={regForm.hotelName}
                              onChange={e => setRegForm({...regForm, hotelName: e.target.value})}
                              className="w-full bg-surface-container-low px-5 py-4 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 ring-secondary/20"
                              placeholder="e.g. Aman New York"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Location</label>
                            <input 
                              required
                              value={regForm.location}
                              onChange={e => setRegForm({...regForm, location: e.target.value})}
                              className="w-full bg-surface-container-low px-5 py-4 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 ring-secondary/20"
                              placeholder="City, Country"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Hotel Type</label>
                            <select 
                              value={regForm.hotelType}
                              onChange={e => setRegForm({...regForm, hotelType: e.target.value})}
                              className="w-full bg-surface-container-low px-5 py-4 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 ring-secondary/20 appearance-none"
                            >
                              {HOTEL_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Base Nightly Rate (USD)</label>
                            <input 
                              required
                              type="number"
                              value={regForm.basePrice}
                              onChange={e => setRegForm({...regForm, basePrice: e.target.value})}
                              className="w-full bg-surface-container-low px-5 py-4 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 ring-secondary/20"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Description & Ambience</label>
                          <textarea 
                            value={regForm.description}
                            onChange={e => setRegForm({...regForm, description: e.target.value})}
                            className="w-full bg-surface-container-low px-5 py-4 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 ring-secondary/20 min-h-[100px] resize-none"
                            placeholder="Tell us what makes this stay unique..."
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Cover Image Source</label>
                          <div className="flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl">
                            <ImageIcon size={18} className="text-secondary" />
                            <input 
                              value={regForm.imageUrl}
                              onChange={e => setRegForm({...regForm, imageUrl: e.target.value})}
                              className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm"
                              placeholder="https://unsplash.com/..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section: Amenities */}
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-4 bg-secondary rounded-full" />
                        <h4 className="text-[10px] font-black text-on-surface uppercase tracking-[0.2em]">Amenities</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {AMENITY_OPTIONS.map(a => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => {
                              const newAmenities = regForm.amenities.includes(a)
                                ? regForm.amenities.filter(i => i !== a)
                                : [...regForm.amenities, a];
                              setRegForm({...regForm, amenities: newAmenities});
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border uppercase tracking-wider",
                              regForm.amenities.includes(a) ? "bg-secondary text-white border-secondary" : "bg-white text-on-surface-variant border-slate-200"
                            )}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section: Promotions */}
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-secondary rounded-full" />
                          <h4 className="text-[10px] font-black text-on-surface uppercase tracking-[0.2em]">Active Promotions</h4>
                        </div>
                        <button 
                          type="button"
                          onClick={handleAddPromotion}
                          className="text-secondary hover:text-secondary-dark flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                        >
                          <Plus size={14} /> Add Promotion
                        </button>
                      </div>
                      <div className="space-y-4">
                        {regForm.promotions.map((promo, idx) => (
                          <div key={idx} className="p-6 bg-surface-container-lowest border border-slate-100 rounded-2xl relative group">
                            {regForm.promotions.length > 1 && (
                              <button 
                                type="button"
                                onClick={() => handleRemovePromotion(idx)}
                                className="absolute top-4 right-4 text-on-surface-variant/40 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Promo Title</label>
                                <input 
                                  value={promo.title}
                                  onChange={e => handleUpdatePromotion(idx, 'title', e.target.value)}
                                  className="w-full bg-white px-4 py-3 rounded-xl text-sm font-bold text-on-surface border border-slate-200 focus:outline-none focus:border-secondary"
                                  placeholder="e.g. Summer Escape"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Discount/Offer</label>
                                <input 
                                  value={promo.discount}
                                  onChange={e => handleUpdatePromotion(idx, 'discount', e.target.value)}
                                  className="w-full bg-white px-4 py-3 rounded-xl text-sm font-bold text-on-surface border border-slate-200 focus:outline-none focus:border-secondary"
                                  placeholder="e.g. 25% Off"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Terms & Conditions</label>
                              <input 
                                value={promo.terms}
                                onChange={e => handleUpdatePromotion(idx, 'terms', e.target.value)}
                                className="w-full bg-white px-4 py-3 rounded-xl text-sm font-bold text-on-surface border border-slate-200 focus:outline-none focus:border-secondary"
                                placeholder="e.g. Valid for stays over 3 nights"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6">
                      <button 
                        type="submit"
                        disabled={isSubmittingReg}
                        className="w-full py-5 bg-on-surface text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-secondary transition-all shadow-xl shadow-on-surface/10 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isSubmittingReg ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Request Partnership <CheckCircle2 size={18} /></>}
                      </button>
                      <p className="text-center text-[9px] text-on-surface-variant/60 font-medium mt-4 uppercase tracking-widest">By submitting, you agree to Voyago's Curator Guidelines & Terms of Service.</p>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};
