import React, { useEffect, useState } from 'react';
import { useAuth } from './FirebaseProvider';
import { db } from '../lib/firebase';
import { collection, query, getDocs, getDoc, orderBy, limit, updateDoc, doc, arrayUnion, deleteDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { Star, Plane, Hotel, Navigation, Calendar, Heart, Receipt, X, MapPin, Sparkles, Loader2, Plus, Wallet, TrendingUp, Trophy, Cloud, CheckCircle2, Circle, History, BarChart3, Sun, CloudRain, Thermometer, ChevronRight, Trash2, CloudSun, Compass, Umbrella, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { useConcierge } from './ConciergeContext';
import { useToast } from './ToastContext';
import { ItineraryCard } from './ItineraryCard';
import { Itinerary } from './ItineraryMap';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const POINTS_DATA = [
  { month: 'Jan', points: 12000 },
  { month: 'Feb', points: 15400 },
  { month: 'Mar', points: 18200 },
  { month: 'Apr', points: 22100 },
  { month: 'May', points: 28500 },
  { month: 'Jun', points: 34200 },
];

const TRAVEL_CHECKLIST = [
  { id: 1, task: 'Check passport validity', checked: true },
  { id: 2, task: 'Purchase travel insurance', checked: true },
  { id: 3, task: 'Book airport transfer', checked: false },
  { id: 4, task: 'Pack summer essentials', checked: false },
  { id: 5, task: 'Notify bank of travel', checked: false },
];

const LoadingStepPhrase: React.FC = () => {
  const [index, setIndex] = useState(0);
  const phrases = [
    "Consulting local Mediterranean experts...",
    "Selecting premium accommodations with coastal vistas...",
    "Curating authentic local gastronomy and secret lunch tables...",
    "Plotting walking paths along ancient sights...",
    "Compiling daily coordinates for real-time map preview...",
    "Balancing estimated activity fees to selected budget tier..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % phrases.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.p 
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="text-xs text-slate-600 font-semibold"
    >
      {phrases[index]}
    </motion.p>
  );
};

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { openWithPrompt } = useConcierge();
  const { showToast } = useToast();
  const [saved, setSaved] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [expenseTitle, setExpenseTitle] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'saved' | 'booking' | 'alert' } | null>(null);
  const [checklist, setChecklist] = useState(TRAVEL_CHECKLIST);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([
    { id: 'static1', type: 'price', title: 'Price Drop: Athens', message: 'Flights to Athens are down 15% for June.', date: '2h ago', read: false },
    { id: 'static2', type: 'advisory', title: 'Advisory: Southeast Asia', message: 'New travel guidelines issued for Thailand.', date: '5h ago', read: true },
  ]);
  const [isSimulatingDrop, setIsSimulatingDrop] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  // States for AI Trip Planner
  const [isPlanningTrip, setIsPlanningTrip] = useState(false);
  const [planDest, setPlanDest] = useState('');
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  const [planBudget, setPlanBudget] = useState('Balanced');
  const [planPersons, setPlanPersons] = useState('Couple');
  const [planPrefs, setPlanPrefs] = useState<string[]>(['Culture & History', 'Gastronomy']);
  const [isGeneratingItin, setIsGeneratingItin] = useState(false);
  const [generatedItinerary, setGeneratedItinerary] = useState<Itinerary | null>(null);
  const [itinError, setItinError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || !profile.uid) return;

    const notifRef = collection(db, 'users', profile.uid, 'notifications');
    const q = query(notifRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbNotifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(prev => {
        // Filter out static ones if dynamic exists
        const dynamicIds = new Set(dbNotifs.map(n => n.id));
        const filteredStatic = [
          { id: 'static1', type: 'price', title: 'Price Drop: Athens', message: 'Flights to Athens are down 15% for June.', date: '2h ago', read: false },
          { id: 'static2', type: 'advisory', title: 'Advisory: Southeast Asia', message: 'New travel guidelines issued for Thailand.', date: '5h ago', read: true },
        ].filter(n => !dynamicIds.has(n.id));

        return [...dbNotifs, ...filteredStatic];
      });
    }, (error) => {
      console.warn("Unable to sync notifications live onto dashboard:", error);
    });

    return () => unsubscribe();
  }, [profile]);

  const triggerPriceDropSimulation = async () => {
    setIsSimulatingDrop(true);
    setSimulationStatus("Simulating checking...");
    try {
      const resp = await fetch('/api/admin/simulate-price-drops', { method: 'POST' });
      const data = await resp.json();
      
      if (data.success) {
        // If the server SDK returned permission issues due to sandbox constraints,
        // we can perform a secure client-side check which is 100% compliant with our ABAC security rules.
        const result = data.result;
        if (result && (result.status === "error" || result.status === "skipped") && profile?.uid && data.livePrices) {
          console.log("[Simulation] Server admin SDK lacks permissions in sandbox. Running direct client-side sweep instead.");
          const savedRef = collection(db, 'users', profile.uid, 'savedDestinations');
          const flightDocsSnapshot = await getDocs(savedRef);
          
          let alertCount = 0;
          for (const d of flightDocsSnapshot.docs) {
            const destData = d.data();
            if (destData.type !== 'flight') continue;
            
            const flightId = Number(destData.flightId);
            if (!flightId || isNaN(flightId)) continue;
            
            const liveItem = data.livePrices[flightId];
            if (!liveItem) continue;
            
            const savedPrice = Number(destData.price);
            const livePrice = liveItem.price;
            if (!savedPrice || isNaN(savedPrice)) continue;
            
            const dropAmt = savedPrice - livePrice;
            const dropPercent = dropAmt / savedPrice;
            
            if (dropPercent >= 0.10) {
              const dropPercentVal = Math.round(dropPercent * 100);
              const notificationId = `price_drop_${flightId}_${livePrice}`;
              const notifRef = doc(db, 'users', profile.uid, 'notifications', notificationId);
              const notifDoc = await getDoc(notifRef);
              
              if (!notifDoc.exists()) {
                await setDoc(notifRef, {
                  type: "price",
                  title: `🎉 10%+ Flight Price Drop Alert!`,
                  message: `Exciting travel news! Your saved flight to ${destData.title || destData.location || liveItem.to} via ${liveItem.airline} has plummeted from $${savedPrice} to only $${livePrice} (${dropPercentVal}% discount)! Book today to capitalize on these savings.`,
                  read: false,
                  createdAt: serverTimestamp()
                });
                alertCount++;
              }
            }
          }
          console.log(`[Simulation] Client-side sweep triggered successfully. New notifications added: ${alertCount}`);
        }
        
        setSimulationStatus("Prices checked & alerts triggered!");
        setTimeout(() => setSimulationStatus(null), 3000);
      } else {
        setSimulationStatus("No saved flights");
        setTimeout(() => setSimulationStatus(null), 3000);
      }
    } catch (err) {
      console.error("Simulation failed:", err);
      setSimulationStatus("Simulation error");
      setTimeout(() => setSimulationStatus(null), 3000);
    } finally {
      setIsSimulatingDrop(false);
    }
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

  // Pre-Trip Checklist & Custom Packing Recommendation states
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskValue, setNewTaskValue] = useState('');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [genDestination, setGenDestination] = useState('Santorini, Greece');
  const [genActivities, setGenActivities] = useState<string[]>(['sightseeing', 'dining']);
  const [genWeatherData, setGenWeatherData] = useState<{ temp: number; code: number; label: string; isRain: boolean } | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);

  const DESTINATION_MAP: Record<string, { lat: number; lng: number }> = {
    "Santorini, Greece": { lat: 36.4166, lng: 25.4324 },
    "Athens, Greece": { lat: 37.9838, lng: 23.7275 },
    "Ubud, Bali": { lat: -8.5069, lng: 115.2625 },
    "Venice, Italy": { lat: 45.4408, lng: 12.3155 },
    "Kyoto, Japan": { lat: 35.0116, lng: 135.7681 },
  };

  const activityChoices = [
    { key: 'sightseeing', label: 'Sightseeing 🏛️' },
    { key: 'beach', label: 'Beach & Swim 🏖️' },
    { key: 'dining', label: 'Fine Dining 🍽️' },
    { key: 'hiking', label: 'Hiking & Hiking 🥾' },
    { key: 'adventure', label: 'Adventure Sports 🧗' }
  ];

  const fetchWeatherForGenerator = (dest: string) => {
    const coords = DESTINATION_MAP[dest];
    if (!coords) return;
    setIsLoadingWeather(true);
    setWeatherError(null);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true`)
      .then(res => {
        if (!res.ok) throw new Error("Faulty connection");
        return res.json();
      })
      .then(data => {
        if (data && data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;
          const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
          
          let label = "Pleasant";
          if (code === 0) label = "Sunny";
          else if ([1, 2, 3].includes(code)) label = "Partly Cloudy";
          else if (isRain) label = "Rainy Showers";
          else if ([71, 73, 75].includes(code)) label = "Snowy";
          
          setGenWeatherData({ temp, code, label, isRain });
        } else {
          throw new Error("Invalid structure");
        }
      })
      .catch(err => {
        console.error("Generator weather fetch failed", err);
        const fallbacks: Record<string, { temp: number; code: number; label: string; isRain: boolean }> = {
          "Santorini, Greece": { temp: 28, code: 0, label: "Sunny", isRain: false },
          "Athens, Greece": { temp: 26, code: 1, label: "Partly Cloudy", isRain: false },
          "Ubud, Bali": { temp: 31, code: 80, label: "Tropical Showers", isRain: true },
          "Venice, Italy": { temp: 21, code: 3, label: "Overcast", isRain: false },
          "Kyoto, Japan": { temp: 18, code: 51, label: "Light Drizzle", isRain: true }
        };
        setGenWeatherData(fallbacks[dest] || { temp: 22, code: 1, label: "Mild", isRain: false });
      })
      .finally(() => {
        setIsLoadingWeather(false);
      });
  };

  useEffect(() => {
    if (isGeneratorOpen) {
      fetchWeatherForGenerator(genDestination);
    }
  }, [genDestination, isGeneratorOpen]);

  const getPackingRecommendations = () => {
    if (!genWeatherData) return [];
    const temp = genWeatherData.temp;
    const isRain = genWeatherData.isRain;
    const items: string[] = [];

    // Weather temp base
    if (temp < 15) {
      items.push("Thermal base layer garments 🧥", "Insulated warm winter fleece", "Beanie & thick thermal gloves 🧤", "Heavier knit packing socks");
    } else if (temp <= 22) {
      items.push("Light pullover sweaters or knits 🧥", "Comfortable smart denims 👖", "Transition day-to-night deck jacket");
    } else {
      items.push("Lightweight cotton & linen apparel 👕", "Breathable daywear summer shorts 🩳", "UV solar polarized sunglasses 🕶️");
    }

    // Rain factor
    if (isRain) {
      items.push("Packable travel rain gear ☔", "Sturdy pocket pop-up umbrella", "Water-tight dry bag gear stash");
    }

    // Activities
    if (genActivities.includes('beach')) {
      items.push("UV-shielding swimwear sets 👙", "Reef-safe sunscreen protector SPF 50+", "Absorbent microfiber beach blanket", "Casual water sandals / flips");
    }
    if (genActivities.includes('hiking')) {
      items.push("Supportive treaded hiking shoes 🥾", "Performance quick-dry socks", "High-potency bugs & ticks spray", "Portable energy recovery packets");
    }
    if (genActivities.includes('sightseeing')) {
      items.push("Padded cushion walking sneakers 👟", "Light everyday backpack bag", "Insulated refillable canteen", "Mini cooling neck fan");
    }
    if (genActivities.includes('dining')) {
      items.push("Smart evening collar shirt 👔", "Compact iron-free blazer or slip", "Travel pocket mints packet");
    }
    if (genActivities.includes('adventure')) {
      items.push("Four-way stretch athletic wear", "Personal sports action camera & grip", "Fast-dissolve mineral electrolyte tablets");
    }

    return Array.from(new Set(items)); // unique
  };

  const generatedItemsList = getPackingRecommendations();

  useEffect(() => {
    const defaultSelected: Record<string, boolean> = {};
    generatedItemsList.forEach(item => {
      defaultSelected[item] = true;
    });
    setSelectedItems(defaultSelected);
  }, [genDestination, genWeatherData, genActivities.join(',')]);

  const handleApplyRecommendations = () => {
    const itemsToAdd = generatedItemsList.filter(item => selectedItems[item]);
    if (itemsToAdd.length === 0) return;
    
    const currentMaxId = Math.max(...checklist.map(c => c.id), 0);
    const newItems = itemsToAdd.map((taskMsg, index) => ({
      id: currentMaxId + index + 1,
      task: `Pack: ${taskMsg}`,
      checked: false
    }));
    
    setChecklist(prev => [...prev, ...newItems]);
    setIsGeneratorOpen(false);
  };

  const handleAddManualTask = () => {
    if (!newTaskValue.trim()) return;
    const currentMaxId = Math.max(...checklist.map(c => c.id), 0);
    const newItem = {
      id: currentMaxId + 1,
      task: newTaskValue.trim(),
      checked: false
    };
    setChecklist(prev => [...prev, newItem]);
    setNewTaskValue('');
    setIsAddingTask(false);
  };

  const toggleGeneratedItem = (item: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const toggleChecklist = (id: number) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  useEffect(() => {
    if (selectedBooking) {
      setBudgetInput(selectedBooking.budget?.toString() || '');
    }
  }, [selectedBooking]);

  const handleUpdateBudget = async () => {
    if (!profile || !selectedBooking) return;
    setIsUpdatingBudget(true);
    try {
      const bookingRef = doc(db, 'users', profile.uid, 'bookings', selectedBooking.id);
      const budget = parseFloat(budgetInput) || 0;
      await updateDoc(bookingRef, { budget });
      
      const updatedBooking = { ...selectedBooking, budget };
      setSelectedBooking(updatedBooking);
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updatedBooking : b));
    } catch (err) {
      console.error("Budget update failed", err);
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  const handleAddExpense = async () => {
    if (!profile || !selectedBooking || !expenseTitle || !expenseAmount) return;
    try {
      const bookingRef = doc(db, 'users', profile.uid, 'bookings', selectedBooking.id);
      const newExpense = {
        title: expenseTitle,
        amount: parseFloat(expenseAmount) || 0,
        date: new Date().toISOString()
      };
      await updateDoc(bookingRef, {
        expenses: arrayUnion(newExpense)
      });

      const updatedExpenses = [...(selectedBooking.expenses || []), newExpense];
      const updatedBooking = { ...selectedBooking, expenses: updatedExpenses };
      setSelectedBooking(updatedBooking);
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updatedBooking : b));
      
      setExpenseTitle('');
      setExpenseAmount('');
    } catch (err) {
      console.error("Expense add failed", err);
    }
  };

  const calculateTotalExpenses = (expenses: any[]) => {
    return (expenses || []).reduce((acc, curr) => acc + curr.amount, 0);
  };

  const fetchAlerts = async () => {
    if (!profile) return;
    try {
      const alertsRef = collection(db, 'users', profile.uid, 'priceAlerts');
      const snap = await getDocs(query(alertsRef, orderBy('createdAt', 'desc')));
      setAlerts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Alerts fetch failed", err);
    }
  };

  const removeAlert = async (id: string) => {
    if (!profile) return;
    setIsRemoving(id);
    try {
      await deleteDoc(doc(db, 'users', profile.uid, 'priceAlerts', id));
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Alert delete failed", err);
    } finally {
      setIsRemoving(null);
      setDeleteConfirm(null);
    }
  };

  const fetchData = async () => {
    if (!profile) return;
    let savedData: any[] = [];
    let bookingsData: any[] = [];

    try {
      // Fetch Saved
      const savedRef = collection(db, 'users', profile.uid, 'savedDestinations');
      const savedSnap = await getDocs(query(savedRef, orderBy('createdAt', 'desc'), limit(10)));
      savedData = savedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSaved(savedData);
    } catch (err) {
      console.warn("Unable to fetch saved destinations (possibly offline):", err);
    }

    try {
      // Fetch Bookings
      const bookingsRef = collection(db, 'users', profile.uid, 'bookings');
      const bookingsSnap = await getDocs(query(bookingsRef, orderBy('createdAt', 'desc'), limit(10)));
      bookingsData = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingsData);
    } catch (err) {
      console.warn("Unable to fetch bookings (possibly offline):", err);
    }

    try {
      // Fetch Savings Goals
      const savingsRef = collection(db, 'users', profile.uid, 'savingsGoals');
      const savingsSnap = await getDocs(query(savingsRef, orderBy('createdAt', 'desc')));
      setSavingsGoals(savingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.warn("Unable to fetch savings goals (possibly offline):", err);
    }

    // Fetch Preferences
    let hotelPreferences = {};
    try {
      const prefRef = doc(db, 'users', profile.uid, 'settings', 'hotelPreferences');
      const prefSnap = await getDoc(prefRef);
      if (prefSnap.exists()) {
        hotelPreferences = prefSnap.data();
      }
    } catch (err) {
      console.error("Preferences fetch failed", err);
    }

    // Fetch Recommendations if we have data
    if (savedData.length > 0 || bookingsData.length > 0) {
      setLoadingRecs(true);
      try {
        const resp = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            pastBookings: bookingsData.map((b: any) => b.destinationTitle),
            savedDestinations: savedData.map((s: any) => s.title),
            hotelPreferences
          }),
        });
        const data = await resp.json();
        setRecommendations(data);
      } catch (err) {
        console.error("Recs failed", err);
      } finally {
        setLoadingRecs(false);
      }
    }
  };

  const removeSaved = async (id: string) => {
    if (!profile) return;
    setIsRemoving(id);
    try {
      await deleteDoc(doc(db, 'users', profile.uid, 'savedDestinations', id));
      setSaved(prev => prev.filter(s => s.id !== id));
      showToast("Destination removed from saved list.", "info");
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setIsRemoving(null);
      setDeleteConfirm(null);
    }
  };

  const removeBooking = async (id: string) => {
    if (!profile) return;
    setIsRemoving(id);
    try {
      await deleteDoc(doc(db, 'users', profile.uid, 'bookings', id));
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error("Booking delete failed", err);
    } finally {
      setIsRemoving(null);
      setDeleteConfirm(null);
    }
  };

  const handleGenerateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planDest.trim()) {
      setItinError("Please enter a destination to explore!");
      return;
    }
    if (!planStart || !planEnd) {
      setItinError("Please select both check-in (start) and check-out (end) dates.");
      return;
    }

    setIsGeneratingItin(true);
    setItinError(null);
    setGeneratedItinerary(null);

    try {
      const resp = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: planDest,
          startDate: planStart,
          endDate: planEnd,
          preferences: `${planBudget} budget level, traveling as ${planPersons}. Custom interest focal points: ${planPrefs.join(', ')}`
        })
      });

      if (!resp.ok) {
        throw new Error("Unable to contact the Voyago dynamic itinerary generator.");
      }

      const data = await resp.json();
      if (!data || !data.days) {
        throw new Error("Invalid itinerary JSON schema returned from server.");
      }

      setGeneratedItinerary(data);
    } catch (err: any) {
      console.error("Itinerary build error:", err);
      setItinError(err.message || "Failed to customize your travel itinerary. Please verify your connection.");
    } finally {
      setIsGeneratingItin(false);
    }
  };

  const getDestinationImage = (dest: string) => {
    const images: Record<string, string> = {
      "santorini": "https://lh3.googleusercontent.com/aida-public/AB6AXuBSrKynr_axne6_dcqMxeYMtm6QK6K_RruxQCC4pUl46yb49XC5RgsW2E6vfbbRjWx6o_y_rs_7z7KbNUywhto7_siLh7CnFM4cxNXSOpSJykA0cftIHdPTF2NqpShzvLiwmbG2Zsq3ELGTqHRg13EwaO6dZsscWwi5OoLQuEhhlTlN7yaWOHQ6mt1m2uURyHMt5nn-u07p5_JuojGb8xsaIzkXtTqGa04HsqAvNqIE5mj6SRTtl5A0Z3BqsfB4FK7KY73J0HNTtko",
      "amalfi": "https://lh3.googleusercontent.com/aida-public/AB6AXuAXbMfMH92Idscq2OH-1zdVtug4pI99l9KImSkRsGmv2x6vCMi4pWk8FHTa-W5VQAuT7aHJ-lWuVrecGpZ0lchJQNvWPI4cp3G78rdloO26STAOM9P1E8P7ynaIqTHkuxvkEa3Tg2RkoHkXWHiHlOm6oYECsDubLJbK_5dyBR1K8G2jLe984zHLo4mgT_kaxwenjNNunEX_ht7VRlhhdq339yJpdsLueKH1EHXScU0ku65sTp1uuVCm3GULz9mUwg3tmMoDTv3LrKI",
      "athens": "https://images.unsplash.com/photo-1503122037265-a5f1f91d3b99?auto=format&fit=crop&q=80&w=800",
      "kyoto": "https://lh3.googleusercontent.com/aida-public/AB6AXuBggAzW9e-_XJQQIvV5b5ZzLJpohgRfkk8gp_5FLSzqBHMkLcDitsn-jXVMD2jEZLww1_ATB7WhM6szSSAEUKoTI-17eepljGa1ffwXQ3T9RHQCPlEck-6hYh-N3NT_mQu2iX5InuSLRUUypQmHG4-Q9m-8OX1JOWq6V8VgInwgXsm-CXeK8j79zaMeeSIcN6znCg8cdpoCKyTt-sLbTlKNHQ4zI_8Q_BQusoV0Y0kxUVxZdW7R-zITK-mXQLho1LsuLruXYsIvTDw",
      "venice": "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=800",
      "barcelona": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&q=80&w=800",
      "paris": "https://lh3.googleusercontent.com/aida-public/AB6AXuA_aCbBo8cjosfmB2fizaZ1ntBYAMWPVEAfkK-7GkA8melGKRRbFjfcu27-m1X6VyITRNu8RMUqZaPY6u0H__uvbcYChVnSzlbrW_Oc-jV6XQDHU9QjhfbWmcepCK9r1618lF0zY-nFupn6g0SPYdYg-fn6RoVk22tV-9VYTM51dvbOhSsx5s2IAaXfCXqWSMkxlSPpu5Padkj620Jlgjak4bW3GK-9rhzL_TUwtUsqQvUDh6Jf78VvuXTXgJxUiKNUNOhtpmfMrqg"
    };
    const key = Object.keys(images).find(k => dest.toLowerCase().includes(k)) || "athens";
    return images[key] || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800";
  };

  const handleSavePlannedTrip = async () => {
    if (!profile || !generatedItinerary) return;
    try {
      const bookingRef = collection(db, 'users', profile.uid, 'bookings');
      let nights = 3;
      if (planStart && planEnd) {
        const diff = new Date(planEnd).getTime() - new Date(planStart).getTime();
        nights = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
      }
      
      let amount = 0;
      if (generatedItinerary.days) {
        generatedItinerary.days.forEach((d: any) => {
          if (d.activities) {
            d.activities.forEach((act: any) => {
              amount += (Number(act.cost) || 0);
            });
          }
        });
      }
      if (amount === 0) amount = 450;

      const startFmt = planStart ? new Date(planStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Jun 01';
      const endFmt = planEnd ? new Date(planEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jun 05, 2026';

      const tripId = `planned_${Date.now()}`;
      await setDoc(doc(bookingRef, tripId), {
        id: tripId,
        destinationTitle: `${planDest} Journey`,
        startDate: `${startFmt} - ${endFmt}`,
        nights,
        amount,
        status: 'upcoming',
        imageUrl: getDestinationImage(planDest),
        itinerary: generatedItinerary,
        hotelName: `${planDest} Premium Villa`,
        roomType: "Aesthetic Deluxe Suite",
        flightInfo: `Voyago Direct Airways • ${planBudget === 'Ultra-Luxe' ? 'First Class' : 'Premium Economy'}`,
        airline: 'Voyago Airways',
        flightNumber: `VY${Math.floor(Math.random() * 900) + 100}`,
        departureTime: '11:15 AM',
        arrivalTime: '02:30 PM',
        terminal: '2',
        gate: 'B18',
        checkIn: '3:00 PM',
        checkOut: '11:00 AM',
        budget: amount * 1.5,
        expenses: [],
        createdAt: serverTimestamp()
      });

      showToast(`Saved! Your custom trip to ${planDest} has been added to your Dashboard.`, 'success');
      
      setIsPlanningTrip(false);
      setGeneratedItinerary(null);
      setPlanDest('');
      setPlanStart('');
      setPlanEnd('');
      
      fetchData();
    } catch (err) {
      console.error("Save planned trip failed:", err);
      showToast("Unable to save trip. Please check your network connection.", 'error');
    }
  };

  useEffect(() => {
    if (profile) {
      fetchData();
      fetchAlerts();
    }
  }, [profile]);

  if (!profile) return null;

  return (
    <main className="pt-24 pb-24 px-8 max-w-7xl mx-auto">
      {/* Header */}
      <section className="mb-12 flex flex-col md:flex-row items-center gap-12 bg-surface-container-low p-12 rounded-xl overflow-hidden relative">
        <div className="flex-1 z-10 flex flex-col items-start">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-lg">
              <img 
                src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} 
                className="w-full h-full object-cover"
                alt="Profile"
              />
            </div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold tracking-widest uppercase">
              Explorer Level: {profile.explorerLevel}
            </span>
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-on-surface tracking-tight mb-6">
            Hello, {profile.displayName?.split(' ')[0] || 'Traveler'}.
          </h1>
          <p className="text-xl text-on-surface-variant max-w-xl mb-10 leading-relaxed font-body">
            Ready for your next adventure? Your journey through the Mediterranean awaits.
          </p>
          <div className="flex flex-col gap-6">
            <button 
              onClick={() => {
                setIsPlanningTrip(true);
                setGeneratedItinerary(null);
                setItinError(null);
              }}
              className="w-fit px-10 py-4 bg-secondary text-white rounded-full font-headline font-bold text-lg hover:scale-95 active:scale-95 transition-all shadow-xl"
            >
              Plan New Trip
            </button>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => openWithPrompt("I'm looking for destination inspiration for a luxury getaway. What do you recommend?")}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 text-on-surface-variant hover:text-secondary hover:border-secondary/30 transition-all text-xs font-bold shadow-sm group"
              >
                <Sparkles size={14} className="text-tertiary group-hover:scale-110 transition-transform" />
                Get Destination Ideas
              </button>
              <button 
                onClick={() => openWithPrompt("I want to plan a new trip for my next vacation. Can you help me find the best dates and flights?")}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 text-on-surface-variant hover:text-secondary hover:border-secondary/30 transition-all text-xs font-bold shadow-sm group"
              >
                <Navigation size={14} className="text-secondary group-hover:scale-110 transition-transform" />
                Plan Dates & Flights
              </button>
              <button 
                onClick={() => openWithPrompt("Check my travel points. What rewards or upgrades can I get for my next trip?")}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 text-on-surface-variant hover:text-secondary hover:border-secondary/30 transition-all text-xs font-bold shadow-sm group"
              >
                <Trophy size={14} className="text-tertiary group-hover:scale-110 transition-transform" />
                Check Rewards
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 relative hidden md:block">
          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGkxIya3fKCb5-_tZRPkEPPdnKRVNfdAgooHFarNRBxxCaHdIIsBRN1zF168ps7ELIdhhj_jw1lEE7qpINWtG_wc3kUY-Ju8Uk5d-bzdOR0IpuoS1cs4sarTP_jRyZtt3Dzm-bS2ATM-ogb1pwfKTiS_RH-FrQkBcy-qDiQzFfVfwb6D6eEDwpbzIK631KnRfcNCWCKk0TXpjmTV0qm8kDbxlRY5FF-bQbpDq3MWi2gD39RVExmTDrxD4RshtjAjGEW8NFmjGttqk" 
              className="w-full h-full object-cover" 
              alt="Planning"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 -mt-20 relative z-20">
        {/* Next Adventure */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-xl p-8 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 aspect-[4/5] rounded-lg overflow-hidden relative group">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSrKynr_axne6_dcqMxeYMtm6QK6K_RruxQCC4pUl46yb49XC5RgsW2E6vfbbRjWx6o_y_rs_7z7KbNUywhto7_siLh7CnFM4cxNXSOpSJykA0cftIHdPTF2NqpShzvLiwmbG2Zsq3ELGTqHRg13EwaO6dZsscWwi5OoLQuEhhlTlN7yaWOHQ6mt1m2uURyHMt5nn-u07p5_JuojGb8xsaIzkXtTqGa04HsqAvNqIE5mj6SRTtl5A0Z3BqsfB4FK7KY73J0HNTtko" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt="Santorini"
            />
            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">
              <span className="text-secondary font-headline font-bold text-sm tracking-wide">Upcoming Trip</span>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex flex-col justify-center py-4">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface mb-2">Escape to Santorini</h2>
            <p className="text-on-surface-variant font-medium mb-8">September 14-21, 2024</p>
            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <Plane size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">Aegean Flight 742</p>
                  <p className="text-xs text-on-surface-variant">Departs: 09:45 AM • Terminal 3</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 size={12} />
                    <span className="text-[10px] font-bold uppercase">On Time</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <Hotel size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">Canaves Oia Suites</p>
                  <p className="text-xs text-on-surface-variant">Superior Suite • All-inclusive</p>
                </div>
              </div>
              
              {/* Weather Addon */}
              <div className="pt-6 border-t border-slate-100 mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low/50">
                  <div className="p-2 rounded-lg bg-white shadow-sm text-amber-500">
                    <Sun size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Oia Weather</p>
                    <p className="text-sm font-bold text-on-surface">28°C • Sunny</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low/50">
                  <div className="p-2 rounded-lg bg-white shadow-sm text-secondary">
                    <Thermometer size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Sea Temp</p>
                    <p className="text-sm font-bold text-on-surface">24°C • Perfect</p>
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                const element = document.getElementById('past-bookings');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center justify-center gap-2 bg-secondary/10 text-secondary px-8 py-4 rounded-full font-headline font-bold text-sm hover:bg-secondary hover:text-white transition-all shadow-sm active:scale-95"
            >
              <Calendar size={18} />
              Manage Bookings
            </button>
          </div>
        </div>

        {/* Stats & Tools */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="bg-on-background rounded-xl p-8 text-white relative overflow-hidden flex-1 shadow-xl flex flex-col">
            <div className="relative z-10 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/60 font-label font-bold text-xs tracking-widest uppercase mb-1">Available Points</p>
                  <h3 className="font-headline text-4xl font-black">{profile.availablePoints?.toLocaleString() ?? '0'}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                  <BarChart3 size={20} className="text-tertiary-fixed" />
                </div>
              </div>
              
              <div className="h-32 -mx-8 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={POINTS_DATA}>
                    <defs>
                      <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffb4a2" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ffb4a2" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="points" 
                      stroke="#ffb4a2" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPoints)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 flex items-center justify-between text-xs text-white/60 font-bold border-t border-white/10 pt-4">
                <span>Monthly Growth</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <TrendingUp size={12} /> +12%
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-xl border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-bold text-on-surface-variant tracking-[0.2em] uppercase">Active Alerts</h4>
              <span className="text-[10px] font-bold text-secondary">{alerts.length} Tracking</span>
            </div>
            <div className="space-y-4 flex-1">
              {alerts.length > 0 ? alerts.map(alert => (
                <div key={alert.id} className="p-4 rounded-xl bg-surface-container-low/50 group relative">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-black text-on-surface">{alert.destination}</p>
                    <button 
                      onClick={() => setDeleteConfirm({ id: alert.id, type: 'alert' })}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete Alert"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {alert.type.includes('price') && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[8px] font-bold uppercase tracking-widest">Price Watch</span>
                    )}
                    {alert.type.includes('advisory') && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[8px] font-bold uppercase tracking-widest">Advisories</span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No active travel alerts.
                </div>
              )}
            </div>
            <button className="mt-6 w-full py-3 rounded-xl bg-secondary text-white text-xs font-bold shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all">
              Add New Alert
            </button>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-xl border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-bold text-on-surface-variant tracking-[0.2em] uppercase">Travel Savings</h4>
              <Link to="/profile" className="text-[10px] font-bold text-secondary uppercase hover:underline">Manage All</Link>
            </div>
            <div className="space-y-4 flex-1">
              {savingsGoals.length > 0 ? savingsGoals.slice(0, 2).map(goal => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-on-surface truncate pr-2">{goal.goalTitle}</span>
                      <span className="text-[10px] font-black text-secondary">${goal.currentAmount.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        className="h-full bg-secondary rounded-full"
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No active savings goals.
                </div>
              )}
            </div>
            <Link 
              to="/profile" 
              className="mt-6 w-full py-3 rounded-xl bg-secondary/5 text-secondary text-center text-[10px] font-black uppercase tracking-widest hover:bg-secondary/10 transition-all"
            >
              Start New Goal
            </Link>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-xl border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-bold text-on-surface-variant tracking-[0.2em] uppercase">Important Notices</h4>
            </div>
            <div className="space-y-4">
              {notifications.map(notif => (
                <div key={notif.id} className={cn(
                  "p-4 rounded-xl transition-all",
                  notif.read ? "bg-slate-50 opacity-60" : "bg-secondary/5 border-l-4 border-secondary shadow-sm"
                )}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-black text-on-surface uppercase tracking-tighter">{notif.title}</p>
                    <span className="text-[10px] text-on-surface-variant">{getReadableDate(notif)}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{notif.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-xl border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-bold text-on-surface-variant tracking-[0.2em] uppercase">Pre-Trip Checklist</h4>
              <span className="text-[10px] font-bold text-secondary">{checklist.filter(c => c.checked).length}/{checklist.length} Done</span>
            </div>

            {/* List of active tasks */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 mb-4">
              {checklist.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all text-left group border border-slate-50"
                >
                  <button 
                    onClick={() => toggleChecklist(item.id)}
                    className="flex-1 flex items-center gap-3"
                  >
                    {item.checked ? (
                      <CheckCircle2 size={17} className="text-secondary shrink-0 animate-scale-in" />
                    ) : (
                      <Circle size={17} className="text-slate-300 group-hover:text-secondary shrink-0 transition-colors" />
                    )}
                    <span className={cn(
                      "text-xs font-medium transition-all leading-normal text-left",
                      item.checked ? "text-slate-400 line-through" : "text-on-surface"
                    )}>
                      {item.task}
                    </span>
                  </button>
                  <button 
                    onClick={() => {
                      setChecklist(prev => prev.filter(c => c.id !== item.id));
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all ml-2"
                    title="Delete item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Manual Task adding fold */}
            <AnimatePresence>
              {isAddingTask && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="e.g. Charge backup battery charger"
                      value={newTaskValue}
                      onChange={(e) => setNewTaskValue(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-secondary/35 transition-all text-on-surface"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddManualTask()}
                      autoFocus
                    />
                    <button 
                      onClick={handleAddManualTask}
                      className="px-3.5 bg-secondary text-white rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all"
                    >
                      Add
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Smart Generation Panel - Expandable inline drawer */}
            <AnimatePresence>
              {isGeneratorOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-4 rounded-2xl bg-slate-950 text-white overflow-hidden border border-white/5 flex flex-col gap-4 shadow-xl text-left"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-secondary animate-pulse" />
                      <span className="text-[10px] font-black tracking-widest uppercase text-slate-200">AI Climate Recommender</span>
                    </div>
                    <button 
                      onClick={() => setIsGeneratorOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Config parameters */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Context Objective</label>
                      <select 
                        value={genDestination}
                        onChange={(e) => setGenDestination(e.target.value)}
                        className="w-full text-xs font-bold bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-secondary/50"
                      >
                        <option value="Santorini, Greece" className="bg-slate-950 text-white">Santorini, Greece (Upcoming Trip)</option>
                        <option value="Athens, Greece" className="bg-slate-950 text-white">Athens, Greece (Tracking Flights)</option>
                        <option value="Ubud, Bali" className="bg-slate-950 text-white">Ubud, Bali (Saved Destination)</option>
                        <option value="Venice, Italy" className="bg-slate-950 text-white">Venice, Italy (Saved Destination)</option>
                        <option value="Kyoto, Japan" className="bg-slate-950 text-white">Kyoto, Japan (Saved Vacation)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Planned Leisure Types</label>
                      <div className="flex flex-wrap gap-1.5">
                        {activityChoices.map(choice => {
                          const isActive = genActivities.includes(choice.key);
                          return (
                            <button
                              key={choice.key}
                              onClick={() => {
                                setGenActivities(prev => 
                                  isActive ? prev.filter(k => k !== choice.key) : [...prev, choice.key]
                                );
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[9px] font-black tracking-wide border transition-all uppercase whitespace-nowrap",
                                isActive 
                                  ? "bg-secondary/25 text-secondary border-secondary" 
                                  : "bg-white/5 text-slate-300 border-white/10 hover:border-slate-400"
                              )}
                            >
                              {choice.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Embedded Climate Feed */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-1">Destined Current Weather</p>
                      {isLoadingWeather ? (
                        <div className="flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin text-secondary" />
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Querying weather satellites...</span>
                        </div>
                      ) : genWeatherData ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">{genWeatherData.temp}°C</span>
                          <span className="text-slate-600">|</span>
                          <span className="text-sm font-semibold text-slate-300">{genWeatherData.label}</span>
                          {genWeatherData.isRain ? '🌧️' : '☀️'}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-bold">Awaiting coordinates query</span>
                      )}
                    </div>
                    {!isLoadingWeather && genWeatherData && (
                      <div className="text-right">
                        <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-1">Precipitation Warning</p>
                        <p className={`text-[10px] font-bold ${genWeatherData.isRain ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {genWeatherData.isRain ? 'Rain Shell Mandatory!' : 'Dry & Clear Skies'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Calculated packing recommendations preview list */}
                  <div className="space-y-2 mt-1">
                    <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Generated Advice Checklist</p>
                    {generatedItemsList.length > 0 ? (
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {generatedItemsList.map(item => (
                          <button
                            key={item}
                            onClick={() => toggleGeneratedItem(item)}
                            className="w-full flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors text-left"
                          >
                            <div className={cn(
                              "h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                              selectedItems[item] 
                                ? "bg-secondary border-secondary text-white" 
                                : "border-white/20 text-transparent"
                            )}>
                              <CheckCircle2 size={11} className="fill-current text-white" />
                            </div>
                            <span className="text-[11px] text-slate-200 truncate">{item}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 leading-relaxed font-body">Configure destination constraints to output predictions.</p>
                    )}
                  </div>

                  {/* Actions inside the generator fold */}
                  <div className="flex gap-2.5 pt-2 border-t border-white/5">
                    <button 
                      onClick={() => setIsGeneratorOpen(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Dismiss
                    </button>
                    <button 
                      onClick={handleApplyRecommendations}
                      disabled={!generatedItemsList.some(item => selectedItems[item])}
                      className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ml-4"
                    >
                      <Sparkles size={12} />
                      Integrate List
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating primary controllers */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button 
                onClick={() => {
                  setIsAddingTask(!isAddingTask);
                  setIsGeneratorOpen(false);
                }}
                className={cn(
                  "py-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5",
                  isAddingTask 
                    ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/15" 
                    : "bg-surface-container-low border-slate-100 text-secondary hover:bg-secondary-fixed"
                )}
              >
                <Plus size={14} className={cn("transition-transform", isAddingTask && "rotate-45")} />
                <span>Manual Task</span>
              </button>
              
              <button 
                onClick={() => {
                  setIsGeneratorOpen(!isGeneratorOpen);
                  setIsAddingTask(false);
                }}
                className={cn(
                  "py-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5",
                  isGeneratorOpen 
                    ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/15" 
                    : "bg-secondary/5 border-secondary/10 text-secondary hover:bg-secondary/10"
                )}
              >
                <Sparkles size={14} className={cn("text-secondary", isGeneratorOpen && "text-white animate-spin-slow")} />
                <span>AI Recommender</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <section className="mt-24">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-headline text-3xl font-extrabold text-on-surface">Curated for You</h2>
              <p className="text-sm text-on-surface-variant font-medium">AI-powered suggestions based on your taste</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loadingRecs ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-[400px] rounded-2xl bg-surface-container-low animate-pulse flex items-center justify-center">
                <Loader2 className="text-secondary animate-spin" size={32} />
              </div>
            ))
          ) : recommendations.length > 0 ? (
            recommendations.map((rec: any, i: number) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className="group relative h-[400px] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all"
              >
                <img 
                  src={rec.image || `https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800`} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={rec.title} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-6 left-6 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-widest uppercase">
                  {rec.type}
                </div>
                <div className="absolute bottom-8 left-8 right-8">
                  <h4 className="text-white font-headline font-bold text-2xl mb-2">{rec.title}</h4>
                  <p className="text-white/80 text-sm leading-relaxed">{rec.reason}</p>
                  <button 
                    onClick={() => openWithPrompt(`I'm interested in the recommendation for ${rec.title}. What makes it a great ${rec.type}?`)}
                    className="mt-6 w-full py-3 bg-white text-secondary rounded-full font-bold text-sm hover:bg-secondary hover:text-white transition-colors"
                  >
                    Explore This Trip
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-on-surface-variant font-medium">Explore more to see personalized suggestions here.</p>
            </div>
          )}
        </div>
      </section>

      {/* Saved Destinations */}
      <section className="mt-24" id="saved-destinations">
        <div className="flex items-baseline justify-between mb-12 flex-wrap gap-4">
          <div>
            <h2 className="font-headline text-3xl font-extrabold text-on-surface">Saved Destinations</h2>
            <p className="text-xs text-slate-500 mt-1">Flights saved here are tracked in background for price drops.</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={triggerPriceDropSimulation}
              disabled={isSimulatingDrop}
              className="py-1.5 px-3 rounded-full border border-secondary/20 bg-secondary/5 hover:bg-secondary/10 text-secondary font-headline text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {isSimulatingDrop ? 'Verifying...' : simulationStatus || 'Simulate Price Drop'}
            </button>
            <Link to="/" className="text-secondary font-bold text-sm hover:underline">View All</Link>
          </div>
        </div>
        <div className="flex gap-8 overflow-x-auto pb-8 scrollbar-hide font-body">
          {saved.length > 0 ? saved.map((item: any) => (
             <div key={item.id} className="min-w-[320px] bg-white rounded-xl overflow-hidden group shadow-sm hover:shadow-xl transition-all hover:-translate-y-2">
               <div className="h-56 overflow-hidden relative">
                 <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.title} />
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => setDeleteConfirm({ id: item.id, type: 'saved' })}
                    className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-on-surface-variant hover:text-red-500 hover:scale-110 transition-all shadow-sm"
                    title="Delete Saved"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-primary group/heart transition-all"
                  >
                    <Heart 
                      size={20} 
                      className="fill-red-500 text-red-500" 
                    />
                  </button>
                </div>
               </div>
               <div className="p-8">
                 <h4 className="font-headline font-bold text-xl mb-2">{item.title}</h4>
                 <p className="text-sm text-on-surface-variant">{item.recommendation}</p>
               </div>
             </div>
          )) : (
            <div className="w-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              No saved destinations yet. Start exploring!
            </div>
          )}
        </div>
      </section>

      {/* Bottom Layout: Bookings & Stats */}
      <section className="mt-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Past Bookings */}
        <div className="lg:col-span-8" id="past-bookings">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface">Past Bookings</h2>
            <Link to="/bookings" className="text-secondary font-bold text-sm hover:underline">View All</Link>
          </div>
          <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100">
            <div className="divide-y divide-slate-100">
              {bookings.length > 0 ? bookings.map((booking: any) => (
                <div 
                  key={booking.id} 
                  className="flex items-center p-6 gap-6 hover:bg-surface transition-colors cursor-default group"
                >
                  <div className="flex items-center gap-6 flex-1 cursor-pointer" onClick={() => setSelectedBooking(booking)}>
                    <img src={booking.imageUrl} className="h-16 w-16 rounded-lg object-cover group-hover:scale-105 transition-transform" alt={booking.destinationTitle} />
                    <div className="flex-1">
                      <h5 className="font-bold text-base text-on-surface">{booking.destinationTitle}</h5>
                      <p className="text-[10px] text-on-surface-variant mb-2">{booking.startDate} • {booking.nights} Nights</p>
                      
                      <div className="flex flex-wrap gap-2">
                        {(booking.airline || booking.flightNumber) && (
                          <div className="flex items-center gap-1.5 text-[8px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-low px-1.5 py-0.5 rounded">
                            <Plane size={8} />
                            <span>{booking.airline || booking.flightNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-base font-bold text-on-surface">${(booking.amount || 0).toLocaleString()}</p>
                      <p className={cn("text-[9px] font-bold uppercase tracking-widest", 
                        booking.status === 'completed' ? 'text-green-600' : 'text-orange-500'
                      )}>{booking.status}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ id: booking.id, type: 'booking' });
                      }}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete Booking"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-400">
                  No past bookings found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Travel Stats Summary */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-xl p-8 shadow-xl border border-slate-100">
            <h4 className="text-xs font-bold text-on-surface-variant tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
              <TrendingUp size={14} className="text-secondary" /> Lifetime Stats
            </h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-on-surface-variant">Miles Traveled</span>
                <span className="text-lg font-headline font-black text-on-surface">12,480</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-on-surface-variant">Countries Visited</span>
                <span className="text-lg font-headline font-black text-on-surface">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-on-surface-variant">Hotels Booked</span>
                <span className="text-lg font-headline font-black text-on-surface">{profile.totalTrips}</span>
              </div>
              <div className="pt-6 border-t border-slate-100">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-3">Favorite Destination</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" alt="Santorini" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface">Santorini, Greece</p>
                    <p className="text-[10px] text-on-surface-variant">Visited 3 times</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-secondary rounded-xl p-8 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Trophy size={140} />
            </div>
            <h4 className="text-xs font-bold text-white/60 tracking-[0.2em] uppercase mb-4">Traveler Rank</h4>
            <div className="flex items-end gap-3 mb-6">
              <h3 className="text-4xl font-headline font-black">Elite</h3>
              <span className="text-sm font-bold text-white/60 pb-1">Top 5%</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed mb-6">You're getting close to <span className="text-white font-bold">Ambassador</span> status. One more trip and you're there!</p>
            <button 
              onClick={() => setIsBenefitsOpen(true)}
              className="w-full py-3 bg-white text-secondary rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg hover:shadow-white/10"
              id="unlock-benefits-trigger-btn"
            >
              Unlock Benefits
            </button>
          </div>
        </div>
      </section>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-3xl p-8 flex flex-col items-center text-center"
            >
              <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-headline font-bold text-on-surface mb-2">Are you sure?</h3>
              <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
                This action cannot be undone. This {deleteConfirm.type === 'saved' ? 'destination' : deleteConfirm.type === 'booking' ? 'booking' : 'price alert'} will be permanently removed from your account.
              </p>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 px-6 rounded-2xl bg-slate-50 text-on-surface font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (deleteConfirm.type === 'saved') {
                      removeSaved(deleteConfirm.id);
                    } else if (deleteConfirm.type === 'booking') {
                      removeBooking(deleteConfirm.id);
                    } else if (deleteConfirm.type === 'alert') {
                      removeAlert(deleteConfirm.id);
                    }
                  }}
                  disabled={isRemoving !== null}
                  className="flex-1 py-3 px-6 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
                >
                  {isRemoving ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn("relative w-full bg-white rounded-2xl shadow-3xl overflow-hidden flex flex-col transition-all max-h-[90vh]",
                selectedBooking.itinerary ? "max-w-4xl" : "max-w-2xl"
              )}
            >
              <div className="flex flex-col md:flex-row overflow-y-auto divide-y md:divide-y-0 md:divide-x divide-slate-100 max-h-[60vh] w-full">
              <div className="w-full md:w-2/5 relative h-64 md:h-auto">
                <img src={selectedBooking.imageUrl} className="w-full h-full object-cover" alt={selectedBooking.destinationTitle} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white">
                  <span className={cn("inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-3",
                    selectedBooking.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'
                  )}>
                    {selectedBooking.status}
                  </span>
                  <h3 className="text-2xl font-headline font-extrabold leading-tight">{selectedBooking.destinationTitle}</h3>
                </div>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="absolute top-4 right-4 md:hidden h-10 w-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="w-full md:w-3/5 p-8 relative">
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="hidden md:flex absolute top-4 right-4 h-10 w-10 rounded-full hover:bg-surface-container-low justify-center items-center text-on-surface-variant transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="space-y-8">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface-variant tracking-[0.2em] uppercase mb-4">Trip Details</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-secondary" />
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Dates</p>
                          <p className="text-sm font-medium text-on-surface">{selectedBooking.startDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin size={18} className="text-secondary" />
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Duration</p>
                          <p className="text-sm font-medium text-on-surface">{selectedBooking.nights} Nights</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(selectedBooking.flightInfo || selectedBooking.hotelInfo || selectedBooking.airline) && (
                    <div className="space-y-6 pt-6 border-t border-slate-100">
                      {(selectedBooking.flightInfo || selectedBooking.airline) && (
                        <div className="p-4 rounded-xl bg-surface-container-low">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-secondary shadow-sm">
                              <Plane size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Flight Information</p>
                              <p className="text-sm font-bold text-on-surface">{selectedBooking.airline || "Airline"} {selectedBooking.flightNumber}</p>
                              <p className="text-xs text-on-surface-variant font-medium">{selectedBooking.flightInfo}</p>
                            </div>
                          </div>
                          
                          {selectedBooking.departureTime && (
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-200/50 pt-4 mt-2">
                              <div>
                                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Departure</p>
                                <p className="text-xs font-bold text-on-surface">{selectedBooking.departureTime}</p>
                                {selectedBooking.terminal && <p className="text-[10px] text-on-surface-variant">terminal {selectedBooking.terminal}</p>}
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Arrival</p>
                                <p className="text-xs font-bold text-on-surface">{selectedBooking.arrivalTime}</p>
                                {selectedBooking.gate && <p className="text-[10px] text-on-surface-variant">Gate {selectedBooking.gate}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {(selectedBooking.hotelInfo || selectedBooking.hotelName) && (
                        <div className="p-4 rounded-xl bg-surface-container-low">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-secondary shadow-sm">
                              <Hotel size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Accommodation</p>
                              <p className="text-sm font-bold text-on-surface">{selectedBooking.hotelName || "Hotel"}</p>
                              <p className="text-xs text-on-surface-variant font-medium">{selectedBooking.roomType || selectedBooking.hotelInfo}</p>
                            </div>
                          </div>

                          {selectedBooking.checkIn && (
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-200/50 pt-4 mt-2">
                              <div>
                                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Check-in</p>
                                <p className="text-xs font-bold text-on-surface">{selectedBooking.checkIn}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Check-out</p>
                                <p className="text-xs font-bold text-on-surface">{selectedBooking.checkOut}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Budget Tracker */}
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-secondary" />
                        <h4 className="text-xs font-bold text-on-surface-variant tracking-[0.2em] uppercase">Budget Tracker</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={budgetInput}
                          onChange={(e) => setBudgetInput(e.target.value)}
                          placeholder="Set Budget"
                          className="w-24 px-3 py-1 bg-surface-container-low rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-secondary/50 transition-all"
                        />
                        <button 
                          onClick={handleUpdateBudget}
                          disabled={isUpdatingBudget}
                          className="text-[10px] font-bold text-secondary uppercase tracking-widest hover:underline disabled:opacity-50"
                        >
                          {selectedBooking.budget ? 'Update' : 'Set'}
                        </button>
                      </div>
                    </div>

                    {selectedBooking.budget > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Spent</p>
                            <p className="text-xl font-headline font-black text-on-surface">
                              ${calculateTotalExpenses(selectedBooking.expenses).toLocaleString()}
                              <span className="text-xs font-medium text-on-surface-variant ml-2">/ ${(selectedBooking.budget || 0).toLocaleString()}</span>
                            </p>
                          </div>
                          <div className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                             calculateTotalExpenses(selectedBooking.expenses) > selectedBooking.budget ? "bg-primary/10 text-primary" : "bg-green-100 text-green-700"
                          )}>
                            {Math.round((calculateTotalExpenses(selectedBooking.expenses) / selectedBooking.budget) * 100)}% Used
                          </div>
                        </div>
                        <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((calculateTotalExpenses(selectedBooking.expenses) / selectedBooking.budget) * 100, 100)}%` }}
                            className={cn("h-full rounded-full transition-all duration-500",
                              calculateTotalExpenses(selectedBooking.expenses) > selectedBooking.budget ? "bg-primary" : "bg-secondary"
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={expenseTitle}
                          onChange={(e) => setExpenseTitle(e.target.value)}
                          placeholder="Expense (e.g. Dinner)"
                          className="flex-1 px-4 py-2 bg-surface-container-low border border-transparent rounded-xl text-sm focus:outline-none focus:border-secondary/30 transition-all"
                        />
                        <input 
                          type="number" 
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          placeholder="$ Amount"
                          className="w-24 px-4 py-2 bg-surface-container-low border border-transparent rounded-xl text-sm focus:outline-none focus:border-secondary/30 transition-all"
                        />
                        <button 
                          onClick={handleAddExpense}
                          className="h-10 w-10 bg-secondary text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {selectedBooking.expenses?.length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                          {selectedBooking.expenses.slice().reverse().map((exp: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-surface hover:bg-slate-50 transition-colors">
                              <div>
                                <p className="text-xs font-bold text-on-surface">{exp.title}</p>
                                <p className="text-[10px] text-on-surface-variant">{new Date(exp.date).toLocaleDateString()}</p>
                              </div>
                              <p className="text-xs font-bold text-on-surface">${(exp.amount || 0).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Transaction</p>
                      <p className="text-xl font-headline font-black text-on-surface">${(selectedBooking.amount || 0).toLocaleString()}</p>
                    </div>
                    <button className="px-6 py-3 bg-secondary text-white rounded-full text-sm font-bold shadow-lg shadow-secondary/20 hover:scale-105 active:scale-95 transition-all">
                      Download Receipt
                    </button>
                  </div>
                </div>
              </div>
              </div>

              {selectedBooking.itinerary && (
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 overflow-y-auto max-h-[40vh] border-b border-slate-150">
                  <div className="flex items-center gap-2 mb-4">
                    <Compass size={18} className="text-secondary" />
                    <h4 className="text-xs font-bold text-on-surface-variant tracking-[0.2em] uppercase">Bespoke Day-by-Day AI Itinerary</h4>
                  </div>
                  <div className="border border-slate-100 bg-white rounded-xl overflow-hidden shadow-2xs">
                    <ItineraryCard itinerary={selectedBooking.itinerary} />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {isBenefitsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBenefitsOpen(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-3xl overflow-hidden flex flex-col"
              id="elite-benefits-modal"
            >
              <div className="bg-secondary p-8 text-white relative overflow-hidden">
                <div className="absolute -right-12 -top-12 opacity-10">
                  <Trophy size={200} />
                </div>
                <button 
                  onClick={() => setIsBenefitsOpen(false)}
                  className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  id="close-benefits-modal-btn"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                    Active Status
                  </span>
                  <span className="text-white/60 text-xs font-sans">Elite Level Tier</span>
                </div>
                <h3 className="text-3xl font-headline font-black tracking-tight flex items-center gap-2">
                  <Trophy className="text-amber-400 shrink-0" size={28} />
                  Elite Tier Benefits
                </h3>
                <p className="text-sm text-white/80 mt-2 leading-relaxed font-sans">
                  As an <span className="text-white font-bold">Elite Traveler</span> in the top 5% of global explorers, you unlock premium perks curated to elevate your journeys.
                </p>
              </div>

              <div className="p-8 space-y-6 max-h-[450px] overflow-y-auto">
                <h4 className="text-xs font-bold text-on-surface-variant tracking-[0.2em] uppercase">Your Exclusive Privileges</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lounge */}
                  <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/80 hover:border-indigo-100 transition-colors">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                      <Compass size={20} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-on-surface mb-0.5">VIP Airport Lounge</h5>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">Unlimited priority access to 1,200+ premium lounges worldwide for you and a guest.</p>
                    </div>
                  </div>

                  {/* Hotels */}
                  <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/80 hover:border-emerald-100 transition-colors">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                      <Hotel size={20} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-on-surface mb-0.5">Hotel Upgrades</h5>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">Complimentary room upgrades, late checkouts, and free breakfasts upon availability.</p>
                    </div>
                  </div>

                  {/* Booking */}
                  <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/80 hover:border-amber-100 transition-colors">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                      <Plane size={20} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-on-surface mb-0.5">Priority Check-In</h5>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">Skip the lines with express lane boarding, priority standby lists, and free luggage handling.</p>
                    </div>
                  </div>

                  {/* Support */}
                  <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/80 hover:border-rose-100 transition-colors">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-on-surface mb-0.5">Elite AI Assistant</h5>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">24/7 hyper-personalized priority travel planning and itinerary concierge.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100/50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                      <Star size={18} fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">Double Rewards Points Active</p>
                      <p className="text-[10px] text-on-surface-variant">Earning 2.0x points on all reservations & transfers automatic benefit</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-lg uppercase tracking-wider font-mono">
                    2X PTS
                  </span>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Next Tier Progress</p>
                  <p className="text-xs font-bold text-on-surface">Ambassador Rank: <span className="text-secondary">4,800 miles to go</span></p>
                </div>
                <button 
                  onClick={() => setIsBenefitsOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-secondary text-white rounded-full text-sm font-bold shadow-lg shadow-secondary/10 hover:bg-secondary/90 hover:scale-105 active:scale-95 transition-all outline-none"
                  id="close-benefits-bottom-btn"
                >
                  Excellent, Thank You
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Trip Planner Workspace */}
      <AnimatePresence>
        {isPlanningTrip && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isGeneratingItin) {
                  setIsPlanningTrip(false);
                }
              }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-3xl overflow-hidden flex flex-col z-10 max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary col-span-1 border border-slate-100 shadow-3xs">
                    <Sparkles size={22} className="animate-pulse text-secondary" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-headline font-black text-slate-900 tracking-tight uppercase">Voyago AI Trip Architect</h3>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Dynamic custom itinerary workspace</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPlanningTrip(false)}
                  disabled={isGeneratingItin}
                  className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-50"
                  title="Close Trip Architect"
                >
                  <X size={20} />
                </button>
              </div>

              {itinError && (
                <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-semibold flex items-center gap-3">
                  <span className="text-sm">⚠️</span>
                  <span>{itinError}</span>
                </div>
              )}

              {/* Main Workspace Scroll Area */}
              <div className="flex-1 overflow-y-auto p-8">
                {!generatedItinerary ? (
                  /* Form configuration */
                  <form onSubmit={handleGenerateItinerary} className="space-y-6 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Destination block */}
                      <div className="space-y-3 p-6 rounded-2xl bg-surface-container-low border border-slate-100 shadow-2xs">
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block mb-1">Destination Search</label>
                        <div className="relative">
                          <MapPin size={16} className="absolute left-4 top-3.5 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Type a city or region... (e.g. Rome, Tokyo)"
                            value={planDest}
                            onChange={(e) => setPlanDest(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-secondary transition-all font-semibold"
                            required
                          />
                        </div>
                        <div className="pt-2">
                          <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Mediterranean Inspirations</p>
                          <div className="flex flex-wrap gap-1.5">
                            {['Santorini, Greece', 'Amalfi Coast, Italy', 'Barcelona, Spain', 'Rome, Italy', 'Paris, France'].map((dest) => (
                              <button
                                key={dest}
                                type="button"
                                onClick={() => setPlanDest(dest)}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border shadow-2xs",
                                  planDest === dest
                                    ? "bg-secondary text-white border-secondary"
                                    : "bg-white text-slate-600 border-slate-100 hover:border-slate-300 hover:text-slate-800"
                                )}
                              >
                                {dest}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Travel Calendar block */}
                      <div className="space-y-3 p-6 rounded-2xl bg-surface-container-low border border-slate-100 shadow-2xs flex flex-col justify-between">
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block mb-1">Travel Dates Selection</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tight mb-1.5">Start Date</p>
                            <div className="relative">
                              <Calendar size={14} className="absolute left-3 top-3 text-slate-400" />
                              <input 
                                type="date"
                                value={planStart}
                                onChange={(e) => setPlanStart(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-secondary transition-all font-semibold"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tight mb-1.5">End Date</p>
                            <div className="relative">
                              <Calendar size={14} className="absolute left-3 top-3 text-slate-400" />
                              <input 
                                type="date"
                                value={planEnd}
                                onChange={(e) => setPlanEnd(e.target.value)}
                                min={planStart || new Date().toISOString().split('T')[0]}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-secondary transition-all font-semibold"
                                required
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-[9px] text-slate-400 font-semibold italic mt-2">
                          * Map coordinate indicators will automatically calibrate to daily activity paths.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Persona and Co-traveler block */}
                      <div className="space-y-4 p-6 rounded-2xl bg-surface-container-low border border-slate-100 shadow-2xs">
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block mb-1">Travel Settings</label>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tight mb-2">Traveler Dynamic</p>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { key: 'Solo', label: 'Solo Explorer 🧭' },
                                { key: 'Couple', label: 'Romantic Couple 👩&zwj;❤️&zwj;👨' },
                                { key: 'Family', label: 'Family Adventure 👨&zwj;👩&zwj;👧&zwj;👦' },
                                { key: 'Friends', label: 'Friends Getaway ⛵' }
                              ].map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => setPlanPersons(item.key)}
                                  className={cn(
                                    "p-2.5 rounded-xl border text-left text-[11px] font-bold transition-all shadow-2xs",
                                    planPersons === item.key
                                      ? "bg-secondary/5 text-secondary border-secondary ring-1 ring-secondary/20"
                                      : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                                  )}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tight mb-2">Budget Allocation</p>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { key: 'Wanderer', label: 'Wanderer', tip: 'Eco & Sights' },
                                { key: 'Balanced', label: 'Standard', tip: 'Elite Balanced' },
                                { key: 'Ultra-Luxe', label: 'Ultra-Luxe', tip: 'Max Concierge' }
                              ].map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => setPlanBudget(item.key)}
                                  className={cn(
                                    "p-2 rounded-xl border text-center transition-all shadow-2xs flex flex-col items-center",
                                    planBudget === item.key
                                      ? "bg-secondary/5 text-secondary border-secondary ring-1 ring-secondary/20"
                                      : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                                  )}
                                >
                                  <span className="text-[11px] font-black">{item.label}</span>
                                  <span className="text-[8px] text-slate-400 font-medium mt-0.5">{item.tip}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tailored Interests block */}
                      <div className="space-y-4 p-6 rounded-2xl bg-surface-container-low border border-slate-100 shadow-2xs">
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block mb-1">Tailored Interests</label>
                        <p className="text-[9px] text-on-surface-variant font-medium mb-2">Select interest categories for customized daily timelines:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'Hist', label: 'Culture & Museum Heritage 🏛️' },
                            { key: 'Gastro', label: 'Gourmet Culinary Tours 🍽️' },
                            { key: 'Beach', label: 'Pristine Luxury Resorts 🏖️' },
                            { key: 'Night', label: 'Vibrant Local Nightlife 🍸' },
                            { key: 'Yacht', label: 'Water Sports & Yachting ⛵' },
                            { key: 'Adventure', label: 'Active & Wilderness Hiking 🥾' }
                          ].map((item) => {
                            const isSelected = planPrefs.includes(item.label);
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setPlanPrefs(prev => prev.filter(p => p !== item.label));
                                  } else {
                                    setPlanPrefs(prev => [...prev, item.label]);
                                  }
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-2xs flex items-center gap-2",
                                  isSelected
                                    ? "bg-secondary/5 text-secondary border-secondary ring-1 ring-secondary/20"
                                    : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                                )}
                              >
                                <span className={cn(
                                  "w-3 h-3 rounded flex items-center justify-center border text-[8px]",
                                  isSelected ? "bg-secondary text-white border-secondary" : "border-slate-300"
                                )}>
                                  {isSelected && "✓"}
                                </span>
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        className="px-8 py-3.5 bg-secondary text-white rounded-full font-headline font-bold text-sm hover:scale-102 active:scale-98 transition-all shadow-lg flex items-center gap-2"
                      >
                        <Sparkles size={16} />
                        Architect Custom Itinerary
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Render successfully generated itinerary */
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-secondary/5 border border-secondary/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs text-left">
                      <div>
                        <span className="text-[9px] font-bold text-secondary uppercase tracking-[0.2em] block mb-1">Itinerary Completed</span>
                        <h4 className="text-xl font-headline font-black text-slate-900 leading-tight flex items-center gap-2">
                          📌 {generatedItinerary.tripTitle}
                        </h4>
                        <p className="text-xs text-on-surface-variant font-medium mt-1">
                          Crafted for {planDest} ({planStart} to {planEnd}) • {planPersons} • {planBudget} mode
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setGeneratedItinerary(null)}
                          className="px-4 py-2 bg-white text-slate-700 border border-slate-150 rounded-full text-xs font-bold hover:bg-slate-50 transition-all active:scale-95"
                        >
                          Draft New Itinerary
                        </button>
                        <button
                          onClick={handleSavePlannedTrip}
                          className="px-5 py-2 bg-secondary text-white rounded-full text-xs font-bold hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <Check size={14} />
                          Save to My Trips
                        </button>
                      </div>
                    </div>

                    {/* Embedding ItineraryCard */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs bg-white text-left">
                      <ItineraryCard itinerary={generatedItinerary} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generating/Architecting Loading State View */}
      <AnimatePresence>
        {isGeneratingItin && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-3xl p-8 flex flex-col items-center text-center overflow-hidden"
            >
              <div className="relative mb-6">
                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-secondary relative z-10 border border-slate-100">
                  <Compass size={32} className="animate-spin text-secondary" style={{ animationDuration: '6s' }} />
                </div>
                <div className="absolute -inset-1.5 rounded-full border border-dashed border-secondary/30 animate-spin" style={{ animationDuration: '4s' }} />
                <div className="absolute -inset-3.5 rounded-full border border-dotted border-secondary/10 animate-spin" style={{ animationDuration: '10s' }} />
              </div>
              
              <h4 className="text-md font-headline font-black text-slate-900 tracking-tight uppercase mb-1">Architecting Your Journey</h4>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-[0.2em] text-secondary mb-4">Gemini composing details</p>
              
              {/* Dynamic steps phrases */}
              <div className="h-12 flex items-center px-4 w-full justify-center">
                <LoadingStepPhrase />
              </div>
              
              <p className="text-[9px] text-slate-400 font-bold tracking-tight mt-6">Please allow up to 10 seconds for custom activities matching</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};
