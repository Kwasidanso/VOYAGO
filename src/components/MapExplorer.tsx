import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Hotel, Utensils, Compass, Moon, Sun, Navigation, 
  Search, SlidersHorizontal, Info, ChevronRight, X, Sparkles,
  ExternalLink, RotateCcw, HelpCircle, Check, Loader2, Star,
  ArrowUp, ArrowDown, Eye, EyeOff, Settings2, Sliders, Flame,
  GripVertical, Plus, Zap
} from 'lucide-react';
import L from 'leaflet';
import { useCurrency } from './CurrencyContext';
import { useToast } from './ToastContext';
import { cn } from '../lib/utils';

interface POI {
  id: string;
  name: string;
  category: 'hotel' | 'restaurant' | 'attraction';
  lat: number;
  lng: number;
  rating: number;
  reviews: number;
  price: string;
  description: string;
  address: string;
  image?: string;
  customColor?: string;
  customLabel?: string;
}

// Beautiful initial preset destinations with highly accurate Lat/Lng
const PRESET_DESTINATIONS = [
  {
    name: "Paris, France",
    lat: 48.8566,
    lng: 2.3522,
    pois: [
      { id: "p-h1", name: "Hôtel Plaza Athénée", category: "hotel", lat: 48.8660, lng: 2.3023, rating: 4.9, reviews: 412, price: "$$$$", description: "Elite Palace with signature red awnings and haute cuisine.", address: "25 Avenue Montaigne, 75008 Paris" },
      { id: "p-h2", name: "Le Meurice", category: "hotel", lat: 48.8652, lng: 2.3279, rating: 4.8, reviews: 320, price: "$$$$", description: "Stunning historical design inspired by Versailles.", address: "228 Rue de Rivoli, 75001 Paris" },
      { id: "p-r1", name: "Epicure at Le Bristol", category: "restaurant", lat: 48.8718, lng: 2.3150, rating: 4.9, reviews: 189, price: "$$$$", description: "Three-star Michelin masterpiece overlooks a serene garden.", address: "112 Rue du Faubourg Saint-Honoré, 75008 Paris" },
      { id: "p-r2", name: "Les Ombres", category: "restaurant", lat: 48.8615, lng: 2.2974, rating: 4.6, reviews: 540, price: "$$$", description: "Rooftop dining with unmatched, direct views of the Eiffel Tower.", address: "27 Quai Jacques Chirac, 75007 Paris" },
      { id: "p-a1", name: "Eiffel Tower", category: "attraction", lat: 48.8584, lng: 2.2945, rating: 4.8, reviews: 12400, price: "$$", description: "The iconic symbol of Paris, perfect at twilight or evening light.", address: "Champ de Mars, 75007 Paris" },
      { id: "p-a2", name: "The Louvre Museum", category: "attraction", lat: 48.8606, lng: 2.3376, rating: 4.7, reviews: 9200, price: "$$", description: "The world's largest art museum holding the Mona Lisa.", address: "Rue de Rivoli, 75001 Paris" }
    ] as POI[]
  },
  {
    name: "Tokyo, Japan",
    lat: 35.6762,
    lng: 139.6503,
    pois: [
      { id: "t-h1", name: "Aman Tokyo", category: "hotel", lat: 35.6848, lng: 139.7619, rating: 4.9, reviews: 298, price: "$$$$", description: "Urban luxury sanctuary soaring high over Otemachi.", address: "1-5-6 Otemachi, Chiyoda-ku, Tokyo" },
      { id: "t-h2", name: "Park Hyatt Tokyo", category: "hotel", lat: 35.6853, lng: 139.6912, rating: 4.8, reviews: 420, price: "$$$$", description: "Legendary high-rise hotel featuring panoramic Mount Fuji views.", address: "3-7-1-2 Nishi-Shinjuku, Shinjuku-ku, Tokyo" },
      { id: "t-r1", name: "Narisawa", category: "restaurant", lat: 35.6713, lng: 139.7214, rating: 4.9, reviews: 154, price: "$$$$", description: "Innovative wood-fired gastronomy paying homage to nature.", address: "2-6-15 Minami-Aoyama, Minato-ku, Tokyo" },
      { id: "t-r2", name: "Sukiyabashi Jiro", category: "restaurant", lat: 35.6722, lng: 139.7640, rating: 4.7, reviews: 280, price: "$$$$", description: "World-class legendary counter for premium edomae sushi.", address: "B1F, Tsukamoto Sogyo Bldg, Ginza, Tokyo" },
      { id: "t-a1", name: "Senso-ji Temple", category: "attraction", lat: 35.7148, lng: 139.7967, rating: 4.7, reviews: 8520, price: "Free", description: "Tokyo's oldest and most historically significant Buddhist temple.", address: "2-3-1 Asakusa, Taito-ku, Tokyo" },
      { id: "t-a2", name: "Shibuya Crossing", category: "attraction", lat: 35.6595, lng: 139.7005, rating: 4.6, reviews: 11400, price: "Free", description: "The iconic multi-way intersection and pulse of modern Tokyo.", address: "Shibuya, Tokyo" }
    ] as POI[]
  },
  {
    name: "Maldives",
    lat: 3.2028,
    lng: 73.2207,
    pois: [
      { id: "m-h1", name: "Soneva Jani", category: "hotel", lat: 5.6841, lng: 73.3421, rating: 5.0, reviews: 145, price: "$$$$", description: "Iconic overwater villas with slide entry and open-air retractable roofs.", address: "Medhufaru Island, Noonu Atoll" },
      { id: "m-h2", name: "Conrad Rangali Island", category: "hotel", lat: 3.6186, lng: 72.7161, rating: 4.9, reviews: 210, price: "$$$$", description: "Spans across twin islands, including famous underwater suites.", address: "Rangali Island, South Ari Atoll" },
      { id: "m-r1", name: "Ithaa Undersea Restaurant", category: "restaurant", lat: 3.6185, lng: 72.7160, rating: 4.9, reviews: 92, price: "$$$$", description: "Unparalleled underwater gastronomy five meters below coral level.", address: "Conrad Rangali, Maldives" },
      { id: "m-a1", name: "Bikini Beach Maafushi", category: "attraction", lat: 3.9452, lng: 73.4901, rating: 4.5, reviews: 1320, price: "Free", description: "Gorgeous turquoise lagoon ideal for snorkeling with whale sharks.", address: "Maafushi Island, Kaafu Atoll" }
    ] as POI[]
  },
  {
    name: "Rome, Italy",
    lat: 41.9028,
    lng: 12.4964,
    pois: [
      { id: "r-h1", name: "Hotel de Russie", category: "hotel", lat: 41.9103, lng: 12.4770, rating: 4.9, reviews: 230, price: "$$$$", description: "Fabulous secret terraced gardens right off Piazza del Popolo.", address: "Via del Babuino 9, 00187 Rome" },
      { id: "r-h2", name: "Hassler Roma", category: "hotel", lat: 41.9061, lng: 12.4839, rating: 4.8, reviews: 175, price: "$$$$", description: "Stately luxury hotel positioned directly atop the Spanish Steps.", address: "Piazza Trinità dei Monti 6, 00187 Rome" },
      { id: "r-r1", name: "La Pergola", category: "restaurant", lat: 41.9192, lng: 12.4452, rating: 4.9, reviews: 310, price: "$$$$", description: "Rome's only 3-star Michelin experience with sprawling panorama.", address: "Via Alberto Cadolo 101, 00136 Rome" },
      { id: "r-a1", name: "The Colosseum", category: "attraction", lat: 41.8902, lng: 12.4922, rating: 4.9, reviews: 18400, price: "$$", description: "The majestic ancient amphitheater built by Roman emperors.", address: "Piazza del Colosseo, 00184 Rome" },
      { id: "r-a2", name: "Trevi Fountain", category: "attraction", lat: 41.9009, lng: 12.4833, rating: 4.8, reviews: 15400, price: "Free", description: "Stunning Baroque masterpiece; toss a coin to secure your return.", address: "Piazza di Trevi, 00187 Rome" }
    ] as POI[]
  }
];

// Helper to project great-circle (geodesic) coordinates between points
const getGeodesicPoints = (start: [number, number], end: [number, number], segments = 25): [number, number][] => {
  const points: [number, number][] = [];
  const lat1 = start[0] * Math.PI / 180;
  const lon1 = start[1] * Math.PI / 180;
  const lat2 = end[0] * Math.PI / 180;
  const lon2 = end[1] * Math.PI / 180;

  const latDiff = Math.abs(start[0] - end[0]);
  const lonDiff = Math.abs(start[1] - end[1]);
  if (latDiff < 0.0001 && lonDiff < 0.0001) {
    return [start, end];
  }

  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((lat1 - lat2) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon1 - lon2) / 2) ** 2
  ));

  if (Math.abs(d) < 1e-6) {
    return [start, end];
  }

  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const px = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const py = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const pz = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(pz, Math.sqrt(px * px + py * py));
    const lon = Math.atan2(py, px);

    points.push([lat * 180 / Math.PI, lon * 180 / Math.PI]);
  }
  return points;
};

// Great-circle distance computation in Kilometers
const getDistanceKm = (start: [number, number], end: [number, number]): number => {
  const R = 6371; // Earth's radius
  const lat1 = start[0] * Math.PI / 180;
  const lon1 = start[1] * Math.PI / 180;
  const lat2 = end[0] * Math.PI / 180;
  const lon2 = end[1] * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const MapExplorer: React.FC = () => {
  const { showToast } = useToast();

  const [activeDestination, setActiveDestination] = useState(PRESET_DESTINATIONS[0]);
  const [pois, setPois] = useState<POI[]>(PRESET_DESTINATIONS[0].pois);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'hotel' | 'restaurant' | 'attraction'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);

  // Map toolbar search-and-pin states
  const [toolbarSearchQuery, setToolbarSearchQuery] = useState('');
  const [isToolbarSearching, setIsToolbarSearching] = useState(false);
  
  // Geodesic route parameters
  const [routeSequence, setRouteSequence] = useState<POI[]>(PRESET_DESTINATIONS[0].pois);
  const [showRouteFlow, setShowRouteFlow] = useState<boolean>(true);
  const [flowColor, setFlowColor] = useState<'secondary' | 'emerald' | 'amber' | 'purple'>('secondary');
  const [flowStyle, setFlowStyle] = useState<'solid' | 'pulsing' | 'dashed'>('dashed');
  
  // Drag and drop states for route reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Custom sidebar tabs
  const [activeTab, setActiveTab] = useState<'explorer' | 'itinerary'>('explorer');

  // States for toggles & overlays
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [findingLocation, setFindingLocation] = useState(false);
  
  // States for manually adding custom POI
  const [isAddPinOpen, setIsAddPinOpen] = useState(false);
  const [newPinName, setNewPinName] = useState('');
  const [newPinCategory, setNewPinCategory] = useState<'hotel' | 'restaurant' | 'attraction'>('attraction');
  const [newPinLat, setNewPinLat] = useState('');
  const [newPinLng, setNewPinLng] = useState('');
  const [newPinColor, setNewPinColor] = useState('#3b82f6');
  const [newPinLabel, setNewPinLabel] = useState('');
  const [newPinDescription, setNewPinDescription] = useState('');
  const [newPinPrice, setNewPinPrice] = useState<'Free' | '$' | '$$' | '$$$' | '$$$$'>('Free');
  
  // Sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // States for AI route optimization
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [aiRouteExplanation, setAiRouteExplanation] = useState('');
  const [optimizedMetrics, setOptimizedMetrics] = useState<{ totalDistanceBefore: number; totalDistanceAfter: number } | null>(null);
  const [showAiExplanationModal, setShowAiExplanationModal] = useState(false);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routesGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  // Synchronize POIs and route sequence when destination changes
  useEffect(() => {
    setPois(activeDestination.pois);
    setRouteSequence(activeDestination.pois);
    setSelectedPoi(null);
  }, [activeDestination]);

  // Register a global function for Leaflet popup callbacks to save custom edits
  useEffect(() => {
    (window as any).saveCustomPinChanges = (id: string) => {
      const nameInput = document.getElementById(`edit-pin-name-${id}`) as HTMLInputElement | null;
      const colorSelect = document.getElementById(`edit-pin-color-${id}`) as HTMLSelectElement | null;
      
      if (!nameInput) return;

      const newName = nameInput.value.trim() || "Unnamed Pin";
      const newColor = colorSelect?.value === "default" ? undefined : colorSelect?.value;

      // Update in pois state
      setPois(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, name: newName, customColor: newColor };
        }
        return p;
      }));

      // Update in routeSequence state
      setRouteSequence(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, name: newName, customColor: newColor };
        }
        return p;
      }));

      // Also update selectedPoi if it's currently selected
      setSelectedPoi(prev => {
        if (prev && prev.id === id) {
          return { ...prev, name: newName, customColor: newColor };
        }
        return prev;
      });

      showToast(`Pin "${newName}" updated successfully!`, "success");

      // Close open map popups gently
      if (mapRef.current) {
        mapRef.current.closePopup();
      }
    };

    return () => {
      delete (window as any).saveCustomPinChanges;
    };
  }, [showToast]);

  // Leaflet initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up previous map if exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [activeDestination.lat, activeDestination.lng],
      zoom: 13,
      zoomControl: false, // Custom positioned zoom buttons
      fadeAnimation: true,
      zoomAnimation: true
    });

    mapRef.current = map;

    // Positioned standard Leaflet zoom buttons on bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Group for places of interest markers
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    // Group for route lines
    const routesGroup = L.layerGroup().addTo(map);
    routesGroupRef.current = routesGroup;

    // Tile layers setup
    updateTileLayer(map, darkMode);

    // Initial populations
    renderMarkers();
    renderRoutes();

    // Resize observer to ensure responsive layout adjusts
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tile layer of map based on light/dark mode state
  useEffect(() => {
    if (mapRef.current) {
      updateTileLayer(mapRef.current, darkMode);
    }
  }, [darkMode]);

  // Re-render markers & lines if filtering criteria or coordinates shift
  useEffect(() => {
    renderMarkers();
    renderRoutes();
  }, [pois, selectedCategory, selectedPoi, routeSequence, showRouteFlow, flowColor, flowStyle]);

  // Fly to destination coordinate change
  const flyToCoords = (lat: number, lng: number, zoom = 14) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], zoom, {
        animate: true,
        duration: 1.8,
        easeLinearity: 0.25
      });
    }
  };

  // Zoom and pan map to show all currently enabled POI markers
  const resetMapView = () => {
    if (!mapRef.current) return;

    // Filter list
    const filtered = pois.filter(poi => {
      if (selectedCategory === 'all') return true;
      return poi.category === selectedCategory;
    });

    if (filtered.length === 0) {
      showToast("No active markers to fit in view", "info");
      return;
    }

    const bounds = L.latLngBounds(filtered.map(poi => [poi.lat, poi.lng] as [number, number]));
    mapRef.current.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16,
      animate: true,
      duration: 1.2
    });
    showToast("Map viewport reset to fit visible markers", "success");
  };

  // Prefill pin form with current map viewport coordinates and show manual pin modal
  const openAddPinModal = () => {
    let defaultLat = activeDestination.lat;
    let defaultLng = activeDestination.lng;
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      defaultLat = center.lat;
      defaultLng = center.lng;
    }
    setNewPinLat(defaultLat.toFixed(5));
    setNewPinLng(defaultLng.toFixed(5));
    setNewPinName('');
    setNewPinLabel('');
    setNewPinDescription('');
    setNewPinCategory('attraction');
    setNewPinPrice('Free');
    setNewPinColor('#3b82f6');
    setIsAddPinOpen(true);
  };

  // Build and insert a temporary handcrafted POI on user submit
  const handleAddManualPin = (e: React.FormEvent) => {
    e.preventDefault();

    const latVal = parseFloat(newPinLat);
    const lngVal = parseFloat(newPinLng);

    if (isNaN(latVal) || latVal < -90 || latVal > 90) {
      showToast("Please enter a valid Latitude between -90 and 90.", "error");
      return;
    }
    if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
      showToast("Please enter a valid Longitude between -180 and 180.", "error");
      return;
    }

    const trimmedName = newPinName.trim() || `Pin (${latVal.toFixed(4)}, ${lngVal.toFixed(4)})`;
    const finalDescription = newPinDescription.trim() || `User created manual temporary POI pin on map.`;
    const finalLabel = newPinLabel.trim();

    const customPoi: POI = {
      id: `custom-pin-${Date.now()}`,
      name: trimmedName,
      category: newPinCategory,
      lat: latVal,
      lng: lngVal,
      rating: 5.0,
      reviews: 1,
      price: newPinPrice,
      description: finalDescription,
      address: `Manual coordinates: ${latVal.toFixed(5)}, ${lngVal.toFixed(5)}`,
      customColor: newPinColor,
      customLabel: finalLabel || undefined
    };

    setPois(prev => [...prev, customPoi]);
    setRouteSequence(prev => [...prev, customPoi]);
    setSelectedPoi(customPoi);

    // Zoom and pan Leaflet map viewport beautifully
    flyToCoords(latVal, lngVal, 15);

    setIsAddPinOpen(false);
    showToast(`Successfully added temporary pin: "${trimmedName}"`, "success");
  };

  // AI-powered spatial sequence optimizer requesting server-side endpoints
  const handleAiRouteOptimize = async () => {
    if (routeSequence.length <= 1) {
      showToast("To optimize paths, please ensure there are at least 2 POIs loaded in your sequence.", "info");
      return;
    }

    setIsOptimizing(true);
    try {
      const response = await fetch("/api/route-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pois: routeSequence }),
      });

      if (!response.ok) {
        throw new Error("Could not compute AI sequence due to server communication issues.");
      }

      const data = await response.json();
      if (data.optimizedIndices && Array.isArray(data.optimizedIndices)) {
        // Map original sequence indices back to actual objects
        const orderedPois = data.optimizedIndices.map((idx: number) => routeSequence[idx]).filter(Boolean);
        
        if (orderedPois.length === routeSequence.length) {
          setRouteSequence(orderedPois);
          setAiRouteExplanation(data.aiExplanation || "Route optimized successfully.");
          setOptimizedMetrics({
            totalDistanceBefore: data.totalDistanceBefore,
            totalDistanceAfter: data.totalDistanceAfter
          });

          // Trigger high-craft confetti effect
          try {
            const confetti = (await import('canvas-confetti')).default;
            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 }
            });
          } catch (e) {
            console.warn("Confetti dynamic load omitted:", e);
          }

          setShowAiExplanationModal(true);
          showToast("AI Route optimization completed successfully!", "success");
        } else {
          showToast("Failed to match all Points of Interest indices.", "error");
        }
      } else {
        showToast("AI Route optimizer returned incorrect structured output.", "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "An error occurred during AI route optimization.", "error");
    } finally {
      setIsOptimizing(false);
    }
  };

  // Convert basic rich markdown structure into beautifully rendered JSX elements instantly
  const renderMarkdownText = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className="text-xs font-black text-slate-950 mt-4 mb-2 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1">
            <Sparkles size={12} className="text-secondary animate-pulse fill-secondary/20" />
            <span>{trimmed.replace('###', '').trim()}</span>
          </h4>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={idx} className="text-sm font-black text-slate-900 mt-5 mb-2.5 uppercase tracking-wide">
            {trimmed.replace('##', '').trim()}
          </h3>
        );
      }
      if (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('•')) {
        const lineContent = trimmed.replace(/^(\*|-|•)/, '').trim();
        const parts = lineContent.split('**');
        return (
          <li key={idx} className="text-[11.5px] text-slate-650 ml-4 list-disc pl-1 py-1.5 leading-relaxed font-semibold">
            {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="font-black text-slate-900">{p}</strong> : p)}
          </li>
        );
      }
      if (trimmed === '') return <div key={idx} className="h-1.5" />;

      const parts = trimmed.split('**');
      return (
        <p key={idx} className="text-[11.5px] text-slate-700 leading-relaxed py-1 font-semibold">
          {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="font-extrabold text-slate-950">{p}</strong> : p)}
        </p>
      );
    });
  };

  // Setup Tile Layers (Dark Mode or Premium Voyager Light)
  const updateTileLayer = (map: L.Map, isDark: boolean) => {
    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl = isDark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 20
    }).addTo(map);
  };

  // Customized marker pins with dynamic sequence ordering badge
  const getMarkerIcon = (category: POI['category'], isSelected: boolean, seqIndex?: number, customColor?: string, customLabel?: string) => {
    let bgClass = "bg-secondary";
    let emoji = "🏨";
    
    if (category === 'restaurant') {
      bgClass = "bg-amber-500";
      emoji = "🍽️";
    } else if (category === 'attraction') {
      bgClass = "bg-purple-500";
      emoji = "🏛️";
    }

    const selectRing = isSelected ? "ring-4 ring-white ring-offset-2 scale-125 z-[999]" : "";
    const badgeHtml = typeof seqIndex === 'number' 
      ? `<div class="absolute -top-2.5 -right-2.5 w-6 h-6 bg-slate-950 border-2 border-white text-[10px] font-black rounded-full flex items-center justify-center text-white shadow-md z-[1001] animate-bounce">${seqIndex + 1}</div>`
      : '';

    const bgStyle = customColor ? `background-color: ${customColor}; border-color: ${customColor};` : '';
    const displayLabel = customLabel || emoji;

    return L.divIcon({
      className: '',
      html: `
        <div class="relative flex items-center justify-center transition-all duration-300 transform select-none hover:scale-120 hover:z-[1000] ${selectRing}">
          ${badgeHtml}
          <div class="w-9 h-9 rounded-full ${customColor ? '' : bgClass} shadow-lg text-white flex items-center justify-center text-sm border-2 border-white font-sans" style="${bgStyle}">
            ${displayLabel}
          </div>
          <div class="absolute -bottom-1.5 w-3 h-3 rotate-45 transform left-1/2 -translate-x-1/2 shadow-sm border-r border-b ${customColor ? '' : 'bg-white border-slate-100'}" style="${bgStyle}"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -40]
    });
  };

  // Render current filters markers onto direct OSM layers
  const renderMarkers = () => {
    if (!mapRef.current || !markersGroupRef.current) return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    // Filter list
    const filtered = pois.filter(poi => {
      if (selectedCategory === 'all') return true;
      return poi.category === selectedCategory;
    });

    filtered.forEach((poi) => {
      const isSelected = selectedPoi?.id === poi.id;
      
      // Determine if visual sequence flows through this poi
      const seqIndex = showRouteFlow ? routeSequence.findIndex(p => p.id === poi.id) : -1;

      const marker = L.marker([poi.lat, poi.lng], {
        icon: getMarkerIcon(poi.category, isSelected, seqIndex >= 0 ? seqIndex : undefined, poi.customColor, poi.customLabel),
        title: poi.name
      });

      // Bind premium styled popup
      const isTemporaryPin = poi.id.startsWith('custom-pin-') || poi.id.startsWith('custom-');
      const customizationHtml = isTemporaryPin ? `
        <div class="mt-2.5 pt-2.5 border-t border-slate-100 select-none text-left">
          <label class="text-[8px] font-black uppercase text-slate-400 block tracking-wider mb-1">Pin Label</label>
          <input type="text" id="edit-pin-name-${poi.id}" value="${poi.name}" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 outline-none focus:bg-white focus:border-secondary transition-all" placeholder="Enter Label..." />
          
          <label class="text-[8px] font-black uppercase text-slate-400 block tracking-wider mt-2 mb-1">Line Color</label>
          <select id="edit-pin-color-${poi.id}" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:border-secondary transition-all cursor-pointer">
            <option value="default" ${!poi.customColor ? 'selected' : ''}>Default</option>
            <option value="#3b82f6" ${poi.customColor === '#3b82f6' ? 'selected' : ''}>Royal Blue</option>
            <option value="#10b981" ${poi.customColor === '#10b981' ? 'selected' : ''}>Forest Emerald</option>
            <option value="#f43f5e" ${poi.customColor === '#f43f5e' ? 'selected' : ''}>Rose Red</option>
            <option value="#f59e0b" ${poi.customColor === '#f59e0b' ? 'selected' : ''}>Warm Amber</option>
            <option value="#a855f7" ${poi.customColor === '#a855f7' ? 'selected' : ''}>Velvet Purple</option>
          </select>

          <button type="button" onclick="window.saveCustomPinChanges('${poi.id}')" class="w-full mt-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg py-1 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center block">
            Save & Update Map
          </button>
        </div>
      ` : '';

      const popupContent = `
        <div class="p-3 font-sans max-w-[245px] text-slate-800">
          <div class="flex items-center gap-1 bg-slate-100 uppercase font-black text-[8px] tracking-widest px-2 py-0.5 rounded-md inline-block text-slate-500 mb-1.5">
            ${isTemporaryPin ? 'Temporary Pin' : poi.category === 'hotel' ? 'Stays' : poi.category === 'restaurant' ? 'Dining' : 'Attraction'}
          </div>
          <h4 class="font-bold text-sm text-slate-950 mb-1 leading-tight">${poi.name}</h4>
          <p class="text-[10px] text-slate-500 leading-snug font-medium mb-2">${poi.description}</p>
          <div class="flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] font-bold">
            <span class="text-secondary font-mono">${poi.price}</span>
            <span class="text-amber-500 flex items-center gap-0.5">★ ${poi.rating}</span>
          </div>
          ${customizationHtml}
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: 'custom-leaflet-popup'
      });

      marker.on('click', () => {
        setSelectedPoi(poi);
        // Center slowly
        flyToCoords(poi.lat, poi.lng, 15);
      });

      marker.addTo(markersGroup);
    });
  };

  // Calculation and drawing of Geodesic path movement connectors
  const renderRoutes = () => {
    if (!mapRef.current || !routesGroupRef.current) return;

    routesGroupRef.current.clearLayers();

    if (!showRouteFlow || routeSequence.length < 2) return;

    // Resolve color values based on state selection
    let colorValue = '#0453cd'; // secondary
    switch (flowColor) {
      case 'emerald': colorValue = '#10b981'; break;
      case 'amber': colorValue = '#f59e0b'; break;
      case 'purple': colorValue = '#a855f7'; break;
    }

    // Connect sequence sequentially
    for (let i = 0; i < routeSequence.length - 1; i++) {
      const current = routeSequence[i];
      const next = routeSequence[i + 1];

      // Geodesic (great-circle route pathing curve interpolation)
      const geodesicCurveCoordinates = getGeodesicPoints([current.lat, current.lng], [next.lat, next.lng], 30);

      let lineStyleClass = '';
      if (flowStyle === 'dashed') {
        lineStyleClass = 'route-flow-dash';
      } else if (flowStyle === 'pulsing') {
        lineStyleClass = 'route-flow-pulse';
      }

      const polyline = L.polyline(geodesicCurveCoordinates, {
        color: colorValue,
        weight: flowStyle === 'pulsing' ? 4.5 : 3.5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        className: lineStyleClass
      });

      // Bind dynamic tooltip on path hover
      const distance = getDistanceKm([current.lat, current.lng], [next.lat, next.lng]);
      const distanceText = `Leg ${i + 1}: ${current.name} → ${next.name} (${distance.toFixed(1)} km / ${(distance * 0.621371).toFixed(1)} mi)`;
      polyline.bindTooltip(distanceText, { sticky: true, className: "font-sans font-bold text-[10px] px-2 py-1 rounded-md border" });

      polyline.addTo(routesGroupRef.current);
    }
  };

  // Process search-and-pin directly from the map toolbar
  const handleToolbarSearchAndPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = toolbarSearchQuery.trim();
    if (!query) return;

    setIsToolbarSearching(true);
    try {
      // 1. Detect if search is a coordinate pattern: "lat, lng" (e.g. "48.8584, 2.2945" or "-33.8688, 151.2093")
      const coordRegex = /^\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*$/;
      const match = query.match(coordRegex);

      let lat: number;
      let lng: number;
      let displayName = '';
      let address = '';

      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          showToast("Invalid coordinate range. Latitude: [-90, 90], Longitude: [-180, 180].", "error");
          setIsToolbarSearching(false);
          return;
        }
        displayName = `Pinned Spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        address = `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        // Attempt reverse geocoding asynchronously to resolve to a human-friendly label
        try {
          const revResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (revResponse.ok) {
            const revData = await revResponse.json();
            if (revData && revData.display_name) {
              address = revData.display_name;
              displayName = revData.display_name.split(',')[0] || displayName;
            }
          }
        } catch (revError) {
          console.warn("Could not reverse-geocode the point coordinates:", revError);
        }
      } else {
        // 2. Treat as descriptive place/POI name search (e.g. "Space Needle", "Parthenon")
        const searchAddr = encodeURIComponent(query);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchAddr}&limit=1`);
        if (!response.ok) throw new Error("Search service error");
        
        const results = await response.json();
        if (results && results.length > 0) {
          const first = results[0];
          lat = parseFloat(first.lat);
          lng = parseFloat(first.lon);
          displayName = first.display_name.split(',')[0];
          address = first.display_name;
        } else {
          showToast(`No coordinates or landmarks found for: "${query}".`, "error");
          setIsToolbarSearching(false);
          return;
        }
      }

      // 3. Create our polished dynamic Point Of Interest
      const customPoi: POI = {
        id: `custom-pin-${Date.now()}`,
        name: displayName,
        category: 'attraction',
        lat: lat,
        lng: lng,
        rating: 5.0,
        reviews: 1,
        price: 'Free',
        description: `Custom search-and-pin location saved on interactive route sequence.`,
        address: address
      };

      // 4. Update the map point array & automatic route flow sequence
      setPois(prev => [...prev, customPoi]);
      setRouteSequence(prev => [...prev, customPoi]);
      setSelectedPoi(customPoi);

      // 5. Instantly pan and fly leaflet map viewport details
      flyToCoords(lat, lng, 15);
      setToolbarSearchQuery('');
      showToast(`Successfully pinned and mapped: "${displayName}"`, "success");
    } catch (err) {
      console.error(err);
      showToast("Mapping search & pin request failed. Please check network connections.", "error");
    } finally {
      setIsToolbarSearching(false);
    }
  };

  // Perform free text custom geocoding search using official OpenStreetMap Nominatim
  const handleGeocodingSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingGeocode(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      if (!response.ok) throw new Error("Search provider error");
      
      const results = await response.json();
      if (results && results.length > 0) {
        const first = results[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        const name = first.display_name.split(',')[0];

        // Dynamically build smart POIs matching surrounding coordinates
        const generatedPois: POI[] = [
          { 
            id: `g-h1`, 
            name: `${name} Grand Chateaux`, 
            category: "hotel", 
            lat: lat + 0.004, 
            lng: lng - 0.005, 
            rating: 4.8, 
            reviews: 145, 
            price: "$$$$", 
            description: "Curated premier suites mirroring authentic local history.", 
            address: first.display_name 
          },
          { 
            id: `g-h2`, 
            name: `Aura Hotel & Lounge`, 
            category: "hotel", 
            lat: lat - 0.003, 
            lng: lng + 0.006, 
            rating: 4.7, 
            reviews: 102, 
            price: "$$$", 
            description: "Elite modern designs complete with high floor city garden wellness spas.", 
            address: first.display_name 
          },
          { 
            id: `g-r1`, 
            name: `The Candelabra Cookery`, 
            category: "restaurant", 
            lat: lat + 0.005, 
            lng: lng + 0.005, 
            rating: 4.9, 
            reviews: 80, 
            price: "$$$$", 
            description: "A contemporary gastrodome serving artisanal tasting lists.", 
            address: first.display_name 
          },
          { 
            id: `g-r2`, 
            name: `Bistro 77`, 
            category: "restaurant", 
            lat: lat - 0.004, 
            lng: lng - 0.004, 
            rating: 4.5, 
            reviews: 215, 
            price: "$$", 
            description: "Authentic, friendly taverna sourcing dynamic farmers' parameters.", 
            address: first.display_name 
          },
          { 
            id: `g-a1`, 
            name: `${name} Historic Observatory`, 
            category: "attraction", 
            lat: lat + 0.002, 
            lng: lng + 0.002, 
            rating: 4.8, 
            reviews: 2400, 
            price: "$", 
            description: "Picturesque landmarks providing breathtaking architectural panoramas.", 
            address: first.display_name 
          }
        ];

        const customDest = {
          name: name + ", searched",
          lat,
          lng,
          pois: generatedPois
        };

        setActiveDestination(customDest);
        setPois(generatedPois);
        setRouteSequence(generatedPois);
        flyToCoords(lat, lng, 13);
        showToast(`Located "${first.display_name.split(',')[0]}". Localized markers loaded!`, "success");
      } else {
        showToast(`Could not geolocate "${searchQuery}". Please specify city name clearly.`, "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Could not map geocode target. Check connectivity.", "error");
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  // HTML5 Geolocated position with user permission
  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      showToast("Your modern browser does not support Geolocation.", "error");
      return;
    }

    setFindingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const latLng = L.latLng(latitude, longitude);
        
        setUserLocation(latLng);
        setFindingLocation(false);

        if (mapRef.current) {
          // Remove previous geolocation marker
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.remove();
          }

          // Pulse circle marker using custom divIcon
          const locMarker = L.marker(latLng, {
            icon: L.divIcon({
              className: '',
              html: `
                <div class="relative w-8 h-8 flex items-center justify-center">
                  <div class="absolute w-6 h-6 bg-secondary/30 rounded-full animate-ping"></div>
                  <div class="w-4 h-4 bg-secondary border-2 border-white rounded-full shadow-lg"></div>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          }).addTo(mapRef.current);

          userLocationMarkerRef.current = locMarker;
          
          flyToCoords(latitude, longitude, 15);
          showToast(`Position locked. Accurate within ${Math.round(accuracy)} meters.`, "success");
        }
      },
      (error) => {
        console.error(error);
        setFindingLocation(false);
        showToast("Access denied or delayed. Set frame permissions to allow geolocation.", "info");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Re-ordering logic for the custom route sequence
  const moveSeqUp = (index: number) => {
    if (index === 0) return;
    const cloned = [...routeSequence];
    const temp = cloned[index];
    cloned[index] = cloned[index - 1];
    cloned[index - 1] = temp;
    setRouteSequence(cloned);
    showToast("Route flow updated. Geodesic arcs redrawn.", "success");
  };

  const moveSeqDown = (index: number) => {
    if (index === routeSequence.length - 1) return;
    const cloned = [...routeSequence];
    const temp = cloned[index];
    cloned[index] = cloned[index + 1];
    cloned[index + 1] = temp;
    setRouteSequence(cloned);
    showToast("Route flow updated. Geodesic arcs redrawn.", "success");
  };

  // Drag and drop sequence reordering handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...routeSequence];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, removed);
    setRouteSequence(updated);

    showToast(`Sequence updated. "${removed.name}" moved.`, "success");

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Toggle dynamic point exclusion from route flow polyline
  const toggleRouteInclusion = (poi: POI) => {
    const exists = routeSequence.some(p => p.id === poi.id);
    if (exists) {
      setRouteSequence(routeSequence.filter(p => p.id !== poi.id));
      showToast(`Removed "${poi.name}" from movement path.`, "info");
    } else {
      setRouteSequence([...routeSequence, poi]);
      showToast(`Added "${poi.name}" back into movement path.`, "success");
    }
  };

  // Live computation of total cumulative route segments distance in Kilometers and Miles
  const cumulativeDistance = useMemo(() => {
    let totalKm = 0;
    for (let i = 0; i < routeSequence.length - 1; i++) {
      totalKm += getDistanceKm([routeSequence[i].lat, routeSequence[i].lng], [routeSequence[i + 1].lat, routeSequence[i + 1].lng]);
    }
    const totalMiles = totalKm * 0.621371;
    return { km: totalKm, miles: totalMiles };
  }, [routeSequence]);

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-12 font-sans relative overflow-hidden flex flex-col">
      
      {/* Dynamic Header Section */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-secondary/15 border border-secondary/25 px-3 py-1 rounded-full text-[9px] uppercase font-black text-secondary tracking-widest mb-1">
            <Compass size={10} className="animate-spin text-secondary" />
            Atlas Intelligence
          </div>
          <h1 className="text-xl md:text-2xl font-headline font-black text-slate-900 tracking-tight">
            Voyago Map Explorer
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            Browse premium hotels, fine dining, and popular local sights connected with animated geodesic route flows.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Custom Search-to-Pin Field */}
          <form onSubmit={handleToolbarSearchAndPin} className="relative flex items-center shrink-0 w-full sm:w-64">
            <input 
              type="text"
              placeholder="Search or target coords (lat,lng)..."
              value={toolbarSearchQuery}
              onChange={(e) => setToolbarSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl pl-8 pr-8 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:border-secondary outline-none transition-all placeholder:text-slate-400"
              title="Enter coordinate (e.g., 48.8584, 2.2945) or a location to automatically pin & add to route sequence."
            />
            <MapPin size={13} className="absolute left-2.5 text-secondary animate-pulse" />
            <button 
              type="submit" 
              disabled={isToolbarSearching}
              className="absolute right-1.5 w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
              title="Search and Drop Temporary Pin"
            >
              {isToolbarSearching ? (
                <Loader2 size={10} className="animate-spin text-white" />
              ) : (
                <Sparkles size={10} className="text-amber-300" />
              )}
            </button>
          </form>

          {/* Quick preset dropdown selection */}
          <div className="relative">
            <select
              value={activeDestination.name.includes(", searched") ? "custom" : activeDestination.name}
              onChange={(e) => {
                const found = PRESET_DESTINATIONS.find(d => d.name === e.target.value);
                if (found) {
                  setActiveDestination(found);
                  flyToCoords(found.lat, found.lng, 13);
                  showToast(`Centered map on ${found.name}`, "success");
                }
              }}
              className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-secondary cursor-pointer"
            >
              <option disabled value="custom">-- Custom Location --</option>
              {PRESET_DESTINATIONS.map((dest) => (
                <option key={dest.name} value={dest.name}>
                  {dest.name} Preset
                </option>
              ))}
            </select>
          </div>

          {/* Map Style Dark/Light mode button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-10 h-10 border border-slate-150 rounded-xl bg-white shadow-xs hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
            title="Toggle Dark Mode Tiles"
            id="map-style-toggle"
          >
            {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-600" />}
          </button>

          {/* Current Geolocation Trigger */}
          <button
            onClick={handleLocationRequest}
            disabled={findingLocation}
            className="h-10 border border-slate-150 px-3.5 rounded-xl bg-white shadow-xs hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Locate Me"
            id="map-geolocation"
          >
            {findingLocation ? (
              <Loader2 size={16} className="animate-spin text-secondary" />
            ) : (
              <Navigation size={16} className="text-secondary fill-secondary/20" />
            )}
            <span className="text-xs font-black uppercase tracking-wider">My Position</span>
          </button>
        </div>
      </div>

      {/* Main Map + Sidebar Flex container */}
      <div className="flex-1 w-full flex flex-col md:flex-row relative min-h-[500px]">
        
        {/* Leaflet OSM Container */}
        <div 
          ref={mapContainerRef} 
          className="flex-1 h-[450px] md:h-auto w-full z-10 border-b md:border-b-0 border-slate-150"
          id="leaflet-voyago-map"
        />

        {/* Floating Map Category Filter Bar */}
        <div 
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200/80 select-none max-w-[calc(100%-2rem)] overflow-x-auto transition-all"
          style={{ animation: 'fadeInDown 0.3s ease-out' }}
        >
          <div className="flex items-center gap-1.5 px-2 text-slate-500 font-bold text-[9px] uppercase tracking-wider shrink-0 border-r border-slate-150 mr-1">
            <Sliders size={11} className="text-secondary animate-pulse" />
            <span className="hidden sm:inline">Legend</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {([
              { id: 'all', label: 'All', emoji: '📍', bgClass: 'bg-slate-900 border-slate-900 text-white' },
              { id: 'hotel', label: 'Stays', emoji: '🏨', bgClass: 'bg-secondary border-secondary text-white' },
              { id: 'restaurant', label: 'Dining', emoji: '🍽️', bgClass: 'bg-amber-500 border-amber-550 text-white' },
              { id: 'attraction', label: 'Sights', emoji: '🏛️', bgClass: 'bg-purple-500 border-purple-550 text-white' }
            ] as const).map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = pois.filter(p => cat.id === 'all' || p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    showToast(`Showing ${cat.label} only`, "info");
                  }}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-350 shrink-0 cursor-pointer select-none group",
                    isSelected
                      ? "bg-slate-950 text-white border-slate-950 shadow-md scale-[1.03] ring-2 ring-slate-950/20"
                      : "bg-white/60 text-slate-750 border-slate-150 hover:bg-slate-100/60 hover:border-slate-300 hover:shadow-3xs"
                  )}
                >
                  {/* Styled Iconic mini marker pin representing category */}
                  <div className="relative flex flex-col items-center shrink-0">
                    <div className={cn(
                      "w-6 h-6 rounded-full border border-white text-[10px] flex items-center justify-center shadow-3xs transition-all duration-300 relative z-10 group-hover:scale-110",
                      cat.bgClass
                    )}>
                      {cat.emoji}
                    </div>
                    <div className={cn(
                      "w-1.5 h-1.5 rotate-45 border-r border-b border-white -mt-0.5 shadow-3xs relative z-5 transition-transform duration-300 group-hover:translate-y-0.1",
                      cat.bgClass
                    )} />
                  </div>

                  <div className="flex flex-col items-start leading-none pr-1">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-wider",
                      isSelected ? "text-white" : "text-slate-850"
                    )}>
                      {cat.label}
                    </span>
                    <span className={cn(
                      "text-[7.5px] font-bold mt-0.5 px-1 py-0.2 rounded-md transition-all",
                      isSelected ? "bg-white/20 text-white/95" : "bg-slate-100 text-slate-500"
                    )}>
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Divider element and Reset View Button */}
            <div className="h-6 w-px bg-slate-200/80 mx-1 shrink-0" />
            <button
              type="button"
              onClick={resetMapView}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700 transition-all duration-200 shrink-0 cursor-pointer select-none hover:shadow-3xs animate-fade-in"
              title="Reset View to Show All Markers"
            >
              <div className="w-6 h-6 rounded-full bg-white border border-slate-150 flex items-center justify-center shadow-3xs text-slate-500 hover:text-slate-700 transition-transform hover:rotate-180 duration-500">
                <RotateCcw size={11} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-col items-start leading-none pr-1 select-none">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-800">
                  Reset View
                </span>
                <span className="text-[7.5px] font-semibold mt-0.5 text-slate-400">
                  Fit Map
                </span>
              </div>
            </button>

            {/* Divider element and Add Pin Button */}
            <div className="h-6 w-px bg-slate-200/80 mx-1 shrink-0" />
            <button
              id="map-manual-add-pin"
              type="button"
              onClick={openAddPinModal}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-secondary/20 bg-secondary/[0.03] hover:bg-secondary/[0.08] text-secondary transition-all duration-200 shrink-0 cursor-pointer select-none hover:shadow-3xs"
              title="Add a Custom Temporary POI Pin to Map"
            >
              <div className="w-6 h-6 rounded-full bg-secondary hover:bg-secondary/90 flex items-center justify-center shadow-3xs text-white transition-transform hover:scale-110 duration-200">
                <Plus size={11} className="stroke-[3]" />
              </div>
              <div className="flex flex-col items-start leading-none pr-1 select-none">
                <span className="text-[9px] font-black uppercase tracking-wider text-secondary">
                  Add Pin
                </span>
                <span className="text-[7.5px] font-semibold mt-0.5 text-secondary/70">
                  Custom POI
                </span>
              </div>
            </button>

            {/* Divider element and AI Optimize Button */}
            <div className="h-6 w-px bg-slate-200/80 mx-1 shrink-0" />
            <button
              id="map-ai-optimize-route"
              type="button"
              disabled={isOptimizing || routeSequence.length <= 1}
              onClick={handleAiRouteOptimize}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-200 shrink-0 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed",
                isOptimizing 
                  ? "border-purple-300 bg-purple-50 text-purple-700 shadow-inner"
                  : "border-purple-200 bg-purple-50/45 hover:bg-purple-100/60 text-purple-700 hover:shadow-3xs"
              )}
              title={routeSequence.length <= 1 ? "Add at least 2 pins to optimize" : "Optimize your travel route sequence with Spatial AI"}
            >
              <div className="w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center shadow-3xs text-white transition-transform hover:rotate-12 duration-200">
                {isOptimizing ? (
                  <Loader2 size={11} className="animate-spin stroke-[3]" />
                ) : (
                  <Zap size={11} className="stroke-[3] fill-white" />
                )}
              </div>
              <div className="flex flex-col items-start leading-none pr-1 select-none">
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-800 flex items-center gap-0.5">
                  AI Optimize
                  <Sparkles size={8} className="text-purple-500 fill-purple-100 animate-pulse shrink-0" />
                </span>
                <span className="text-[7.5px] font-semibold mt-0.5 text-purple-600/70">
                  {isOptimizing ? "Calibrating..." : "Spatial Path"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Floating Controls Sidebar - Drawer style responsive */}
        <div className={cn(
          "w-full md:w-[390px] bg-white md:border-l border-slate-150 flex flex-col shrink-0 overflow-hidden relative z-20 transition-all duration-300 md:shadow-2xl shadow-slate-900/10",
          sidebarOpen ? "h-auto md:h-full block" : "h-12 md:w-0 overflow-hidden hidden"
        )}>
          
          {/* Custom Tabs Bar */}
          <div className="flex border-b border-slate-100 bg-slate-50/55 p-1.5 shrink-0 select-none">
            <button
              onClick={() => setActiveTab('explorer')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5",
                activeTab === 'explorer' 
                  ? "bg-white text-slate-950 shadow-sm border border-slate-100"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Compass size={13} />
              Sights Explorer
            </button>
            <button
              onClick={() => setActiveTab('itinerary')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 relative",
                activeTab === 'itinerary' 
                  ? "bg-white text-slate-950 shadow-sm border border-slate-100"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Sliders size={13} className="text-secondary" />
              Day Route Flow
              {routeSequence.length > 0 && (
                <span className="w-5 h-5 bg-secondary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {routeSequence.length}
                </span>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'explorer' ? (
              <motion.div
                key="explorer-tab"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="flex flex-col flex-1 overflow-hidden"
              >
                {/* Geocoding Search panel */}
                <div className="p-4 border-b border-slate-100 scale-100 shrink-0">
                  <form onSubmit={handleGeocodingSearch} className="relative">
                    <input 
                      type="text"
                      placeholder="Search any global city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50/50 p-3 pr-10 border border-slate-150 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-secondary outline-none transition-all pl-9"
                    />
                    <Search size={14} className="absolute left-3.5 top-[15px] text-slate-400" />
                    <button 
                      type="submit" 
                      disabled={isSearchingGeocode}
                      className="absolute right-3 top-[10px] w-7 h-7 rounded-lg bg-secondary text-white flex items-center justify-center hover:bg-secondary/90 transition-all cursor-pointer"
                    >
                      {isSearchingGeocode ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                  </form>

                  {/* Quick Category filters */}
                  <div className="flex items-center gap-1 mt-4 border-t border-slate-50 pt-3">
                    {(['all', 'hotel', 'restaurant', 'attraction'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border cursor-pointer transition-all",
                          selectedCategory === cat 
                            ? "bg-secondary text-white border-secondary shadow-xs scale-102"
                            : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                        )}
                      >
                        {cat === 'all' ? 'All' : cat === 'hotel' ? '🏨 Stays' : cat === 'restaurant' ? '🍽️ Food' : '🏛️ Sights'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List of Loaded Places */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3">
                  {pois.filter(poi => selectedCategory === 'all' || poi.category === selectedCategory).length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No matches in current view</p>
                      <p className="text-[10px] text-slate-400 mt-1">Try switching categories or search for a new city.</p>
                    </div>
                  ) : (
                    pois
                      .filter(poi => selectedCategory === 'all' || poi.category === selectedCategory)
                      .map((poi) => {
                        const isSelected = selectedPoi?.id === poi.id;
                        const isIncludedInRoute = routeSequence.some(r => r.id === poi.id);

                        return (
                          <div
                            key={poi.id}
                            onClick={() => {
                              setSelectedPoi(poi);
                              flyToCoords(poi.lat, poi.lng, 15);
                            }}
                            className={cn(
                              "p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer hover:border-slate-250 select-none group relative",
                              isSelected 
                                ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                : "bg-white border-slate-100 text-slate-800"
                            )}
                            style={poi.customColor ? { borderLeft: `5px solid ${poi.customColor}` } : {}}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest uppercase inline-block",
                                isSelected
                                  ? "bg-white/10 text-white border border-white/5"
                                  : poi.category === 'hotel' ? "bg-blue-50 text-blue-700" : poi.category === 'restaurant' ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"
                              )}>
                                {poi.category === 'hotel' ? 'Stays' : poi.category === 'restaurant' ? 'Dining' : 'Attraction'}
                              </span>
                              
                              <div className="flex items-center gap-1 font-mono text-[10px] font-bold">
                                <span className={isSelected ? "text-white" : "text-secondary"}>{poi.price}</span>
                                <span className={isSelected ? "text-slate-400" : "text-slate-350"}>•</span>
                                <span className="text-amber-500 flex items-center gap-0.5">★ {poi.rating}</span>
                              </div>
                            </div>

                            <h4 className="text-sm font-bold group-hover:text-secondary mt-1.5 transition-colors line-clamp-1 leading-snug">
                              {poi.name}
                            </h4>
                            <p className={cn(
                              "text-[10px] line-clamp-2 leading-relaxed font-semibold mt-0.5",
                              isSelected ? "text-slate-300" : "text-slate-500"
                            )}>
                              {poi.description}
                            </p>

                            <div className="flex items-center justify-between border-t pt-2 mt-2 border-slate-55 select-none">
                              <p className={cn(
                                "text-[9px] font-bold truncate flex items-center gap-1 max-w-[200px]",
                                isSelected ? "text-slate-400" : "text-slate-400"
                              )}>
                                <MapPin size={10} />
                                {poi.address}
                              </p>

                              {/* Route Inclusion toggle directly on item */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRouteInclusion(poi);
                                }}
                                className={cn(
                                  "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border cursor-pointer transition-all",
                                  isIncludedInRoute
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                )}
                              >
                                {isIncludedInRoute ? '✓ Connected' : '+ Add Flow'}
                              </button>
                            </div>

                          </div>
                        );
                      })
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="itinerary-tab"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="flex flex-col flex-1 overflow-hidden"
              >
                {/* Route parameters / visual filters section */}
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Geodesic Path Controls
                    </span>
                    <button
                      onClick={() => setShowRouteFlow(!showRouteFlow)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase border transition-all flex items-center gap-1 cursor-pointer",
                        showRouteFlow 
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-slate-500 border-slate-200"
                      )}
                    >
                      {showRouteFlow ? <Eye size={10} /> : <EyeOff size={10} />}
                      {showRouteFlow ? 'Routing Live' : 'Flow Hidden'}
                    </button>
                  </div>

                  {showRouteFlow && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Path Color
                        </label>
                        <select
                          value={flowColor}
                          onChange={(e) => setFlowColor(e.target.value as any)}
                          className="w-full bg-white border border-slate-150 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:border-secondary cursor-pointer"
                        >
                          <option value="secondary">Royal Blue</option>
                          <option value="emerald">Forest Emerald</option>
                          <option value="amber">Warm Amber</option>
                          <option value="purple">Velvet Purple</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Line Style
                        </label>
                        <select
                          value={flowStyle}
                          onChange={(e) => setFlowStyle(e.target.value as any)}
                          className="w-full bg-white border border-slate-150 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:border-secondary cursor-pointer"
                        >
                          <option value="dashed">Animated Dash ☄️</option>
                          <option value="pulsing">Pulsing Glow ✨</option>
                          <option value="solid">Standard Solid</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Distance stats report */}
                  {showRouteFlow && routeSequence.length >= 2 && (
                    <div className="bg-white/80 border border-slate-100 rounded-xl p-3 mt-3 flex items-center justify-between text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Flame size={14} className="animate-pulse" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-none">
                            Total Segment Flight
                          </p>
                          <p className="text-xs font-bold text-slate-800 mt-1 leading-none">
                            {cumulativeDistance.km.toFixed(1)} km / {cumulativeDistance.miles.toFixed(1)} miles
                          </p>
                        </div>
                      </div>
                      <div className="text-[8px] bg-slate-100 hover:bg-slate-150 text-slate-500 font-black px-2 py-1 rounded-md uppercase tracking-wider">
                        {routeSequence.length - 1} Segment legs
                      </div>
                    </div>
                  )}
                </div>

                {/* Day sequence builder list */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Interactive Sequence Ordering
                    </p>
                    <button
                      onClick={() => {
                        setRouteSequence(activeDestination.pois);
                        showToast("Route sequence reset to presets", "info");
                      }}
                      className="text-[9px] font-mono text-secondary hover:underline cursor-pointer"
                    >
                      Reset Order
                    </button>
                  </div>

                  {routeSequence.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-150">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Empty flow sequencer</p>
                      <p className="text-[10px] text-slate-450 mt-1">Add sights from the Explorer list to map geodesic movement paths.</p>
                    </div>
                  ) : (
                    routeSequence.map((poi, idx) => {
                      const isSelected = selectedPoi?.id === poi.id;
                      return (
                        <div
                          key={poi.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          onDrop={(e) => handleDrop(e, idx)}
                          className={cn(
                            "rounded-xl bg-white border flex flex-col p-3 transition-all duration-200 cursor-grab active:cursor-grabbing text-left",
                            idx === draggedIndex 
                              ? "opacity-40 border-dashed border-secondary/60 bg-slate-50" 
                              : idx === dragOverIndex 
                                ? "border-secondary scale-[1.02] ring-2 ring-secondary/15 bg-secondary/[0.02]" 
                                : isSelected
                                  ? "border-secondary/40 ring-1 ring-secondary/10 shadow-sm"
                                  : "border-slate-100 hover:border-slate-300 shadow-3xs"
                          )}
                          style={poi.customColor ? { borderLeft: `4px solid ${poi.customColor}` } : {}}
                        >
                          {/* Inner Header Row */}
                          <div className="flex items-center justify-between gap-2 w-full">
                            <div 
                              onClick={() => {
                                setSelectedPoi(isSelected ? null : poi);
                                if (!isSelected) {
                                  flyToCoords(poi.lat, poi.lng, 15);
                                }
                              }}
                              className="flex items-center gap-2 flex-1 min-w-0 select-none cursor-pointer group/header"
                            >
                              <GripVertical size={14} className="text-slate-300 cursor-grab shrink-0 select-none hover:text-slate-500 transition-colors" />
                              <div 
                                className="w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs"
                                style={{ backgroundColor: poi.customColor || '#0f172a' }}
                              >
                                {idx + 1}
                              </div>
                              <div className="truncate flex-1">
                                <h5 className={cn(
                                  "text-xs font-bold truncate leading-snug group-hover/header:text-secondary transition-colors",
                                  isSelected ? "text-secondary font-black" : "text-slate-900"
                                )}>
                                  {poi.name}
                                </h5>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black leading-none mt-1">
                                  {poi.category === 'hotel' ? 'Stay' : poi.category === 'restaurant' ? 'Dining' : 'Attraction'} • {poi.price}
                                </p>
                              </div>
                            </div>

                            {/* Order controls */}
                            <div 
                              className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg shrink-0 select-none"
                              onDragStart={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => moveSeqUp(idx)}
                                disabled={idx === 0}
                                className="w-5 h-5 rounded-md hover:bg-white text-slate-500 disabled:opacity-30 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
                                title="Move Up in Sequence"
                              >
                                <ArrowUp size={10} strokeWidth={3} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSeqDown(idx)}
                                disabled={idx === routeSequence.length - 1}
                                className="w-5 h-5 rounded-md hover:bg-white text-slate-500 disabled:opacity-30 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
                                title="Move Down in Sequence"
                              >
                                <ArrowDown size={10} strokeWidth={3} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRouteSequence(routeSequence.filter(p => p.id !== poi.id));
                                  showToast(`Removed "${poi.name}" from route sequence`, "info");
                                }}
                                className="w-5 h-5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-600 flex items-center justify-center transition-all cursor-pointer"
                                title="Exclude from Sequence"
                              >
                                <X size={10} strokeWidth={3} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded detail view */}
                          <AnimatePresence initial={false}>
                            {isSelected && (
                              <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: "auto", opacity: 1, marginTop: 10 }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="overflow-hidden border-t border-slate-100 pt-2.5 w-full select-text"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="space-y-2 text-left">
                                  {/* Ratings and Reviews */}
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center text-amber-500 gap-0.5 text-xs font-bold animate-pulse">
                                      <Star size={11} fill="currentColor" />
                                      <span>{poi.rating}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">({poi.reviews} reviews)</span>
                                    <span className="text-slate-300 text-[10px]">•</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{poi.price} Range</span>
                                  </div>

                                  {/* Description */}
                                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    {poi.description}
                                  </p>

                                  {/* Address */}
                                  <div className="flex items-start gap-1.5 p-1 rounded-md">
                                    <MapPin size={11} className="text-secondary shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                                      {poi.address}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Info Box */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 select-none">
            <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-100/80 shadow-xs">
              <Info size={14} className="text-secondary mt-0.5 shrink-0 animate-ping" />
              <div>
                <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none mb-1">
                  Did you know?
                </h5>
                <p className="text-[10px] text-slate-500 leading-normal font-medium">
                  We render mathematical geodesic curves to account for flight/travel distance curvature. Redraw legs in real-time above!
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Manual Temporary POI Pin Submission Dialog Modal */}
      <AnimatePresence>
        {isAddPinOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddPinOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs cursor-pointer"
            />
            
            {/* Dialog Content Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header block */}
              <div className="bg-slate-50 border-b border-slate-150 p-5 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                    <Plus size={16} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Add Custom POI Pin
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold leading-none mt-1">
                      Pin temporary custom coordinates
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPinOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-200/55 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* Form content */}
              <form onSubmit={handleAddManualPin} className="p-5 overflow-y-auto space-y-4 text-left">
                
                {/* Name Input */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 select-none">
                    POI Name / Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newPinName}
                    onChange={(e) => setNewPinName(e.target.value)}
                    placeholder="e.g., Le Petit Café, Hidden Overlook..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/15 transition-all outline-none"
                  />
                </div>

                {/* Category Selector */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 select-none font-sans">
                    Category Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'attraction', label: 'Sight/Attraction', emoji: '🏛️', selectClass: 'border-purple-350 bg-purple-50/50 text-purple-750 font-black' },
                      { id: 'hotel', label: 'Stay/Hotel', emoji: '🏨', selectClass: 'border-secondary/40 bg-secondary/[0.03] text-secondary font-black' },
                      { id: 'restaurant', label: 'Dining/Food', emoji: '🍽️', selectClass: 'border-amber-350 bg-amber-50/50 text-amber-750 font-black' }
                    ] as const).map((cat) => {
                      const isCatSel = newPinCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setNewPinCategory(cat.id)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none",
                            isCatSel 
                              ? cat.selectClass 
                              : "border-slate-150 bg-slate-50/20 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                          )}
                        >
                          <span className="text-lg">{cat.emoji}</span>
                          <span className="text-[8.5px] font-bold tracking-tight uppercase leading-none">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Coordinates Flexbox Input */}
                <div className="grid grid-cols-2 gap-3.5 select-none text-left">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newPinLat}
                      onChange={(e) => setNewPinLat(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/15 transition-all outline-none animate-fade-in"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newPinLng}
                      onChange={(e) => setNewPinLng(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/15 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Custom Label Symbol & Price Level */}
                <div className="grid grid-cols-2 gap-3.5 select-none text-left">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      Marker Label (Symbol)
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      value={newPinLabel}
                      onChange={(e) => setNewPinLabel(e.target.value)}
                      placeholder="e.g. 🎪, ✨, cafe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/15 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      Price Level
                    </label>
                    <select
                      value={newPinPrice}
                      onChange={(e) => setNewPinPrice(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/15 transition-all outline-none cursor-pointer"
                    >
                      <option value="Free">Free / Complimentary</option>
                      <option value="$">Cheap ($)</option>
                      <option value="$$">Moderate ($$)</option>
                      <option value="$$$">Expansive ($$$)</option>
                      <option value="$$$$">Ultra Palace ($$$$)</option>
                    </select>
                  </div>
                </div>

                {/* Custom Theme Pin Colors Selection */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 select-none">
                    Marker & Sequence Color Accent
                  </label>
                  <div className="flex items-center gap-2">
                    {([
                      { hex: '#3b82f6', name: 'Blue' },
                      { hex: '#10b981', name: 'Emerald' },
                      { hex: '#f43f5e', name: 'Rose' },
                      { hex: '#f59e0b', name: 'Amber' },
                      { hex: '#a855f7', name: 'Purple' },
                      { hex: '#0f172a', name: 'Charcoal' }
                    ]).map((color) => {
                      const isColorSel = newPinColor === color.hex;
                      return (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => setNewPinColor(color.hex)}
                          style={{ backgroundColor: color.hex }}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 border-white transition-all scale-100 cursor-pointer flex items-center justify-center shrink-0",
                            isColorSel 
                              ? "ring-2 ring-slate-950 scale-110 shadow-md" 
                              : "hover:scale-105 hover:shadow-3xs focus:outline-none"
                          )}
                          title={color.name}
                        >
                          {isColorSel && <Check size={11} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] font-extrabold" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description Input */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 select-none">
                    POI Short Description
                  </label>
                  <textarea
                    rows={2}
                    value={newPinDescription}
                    onChange={(e) => setNewPinDescription(e.target.value)}
                    placeholder="Short summary detailing reviews, sights, stay info..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/15 transition-all outline-none resize-none"
                  />
                </div>

                {/* Submit Block */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-secondary hover:bg-secondary/90 hover:shadow-md text-white font-black uppercase tracking-widest text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span>Map Custom Pin</span>
                  </button>
                </div>
                
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
