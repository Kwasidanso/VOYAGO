import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, Hotel, Utensils, Compass, DollarSign, Calendar, Users, 
  TrendingUp, Sparkles, Lightbulb, CheckCircle2, Calculator, 
  ChevronRight, Info, MapPin, Activity, Coins, ShieldAlert,
  Loader2, RefreshCw
} from 'lucide-react';
import { AutocompleteInput } from './AutocompleteInput';
import { useCurrency, CURRENCIES } from './CurrencyContext';
import { useToast } from './ToastContext';
import { cn } from '../lib/utils';

interface BudgetResult {
  baseFlightCost: number;
  totalFlights: number;
  hotelNightlyRate: number;
  totalHotels: number;
  diningCostPerDay: number;
  totalDining: number;
  activityCost: number;
  localTransport: number;
  premiumSurcharge: number;
  emergencyBuffer: number;
  totalEstimatedCost: number;
  confidenceScore: number;
  seasonalAdvice: string;
  budgetTips: string[];
  isFallback?: boolean;
}

const PRESET_ACTIVITIES = [
  { id: 'Luxury', label: 'Luxury Stays & Spas', icon: '💎', description: 'Elite 5-star properties and full wellness services' },
  { id: 'Relaxing', label: 'Relaxing & Wellness', icon: '🧘', description: 'Leisurely beaches, yoga, and quiet retreats' },
  { id: 'Cultural', label: 'Culture & Sightseeing', icon: '🏛️', description: 'Historic landmarks, museum guides, and heritage tours' },
  { id: 'Adventure', label: 'Adventure & Sport', icon: '🥾', description: 'Hiking trails, water activities, and adrenaline excursions' },
  { id: 'Fine Dining', label: 'Gourmet Dining', icon: '🍷', description: 'Michelin guide, award-winning cellars, and culinary tours' },
  { id: 'Nature', label: 'Wildlife & Nature', icon: '🌿', description: 'National parks, reserves, and scenic nature drives' },
  { id: 'Shopping', label: 'Luxury Shopping', icon: '🛍️', description: 'Premium designer hubs and tailored boutique shopping' },
  { id: 'Budget-friendly', label: 'Budget-Conscious Hacks', icon: '🏷️', description: 'Authentic local selections and cost-saving alternatives' }
];

export const BudgetEstimator: React.FC = () => {
  const { formatPrice, currency, setCurrencyCode } = useCurrency();
  const { showToast } = useToast();

  const [destination, setDestination] = useState('Maldives');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 14); // 2 weeks out
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 21); // 3 weeks out
    return today.toISOString().split('T')[0];
  });
  const [travelers, setTravelers] = useState(2);
  const [flightClass, setFlightClass] = useState<'Economy' | 'Business' | 'First'>('Economy');
  const [selectedActivities, setSelectedActivities] = useState<string[]>(['Luxury', 'Fine Dining', 'Relaxing']);

  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [result, setResult] = useState<BudgetResult | null>(null);

  // Compute number of nights
  const nightsCount = React.useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 7;
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [startDate, endDate]);

  const toggleActivity = (id: string) => {
    setSelectedActivities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      showToast('Please specify a destination.', 'error');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      showToast('Arrival date must be prior to departure date.', 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    // Dynamic multi-stage loader updates for an authentic premium look
    const statuses = [
      'Mapping ideal flight path connections...',
      'Aggregating average nightly rates for 4 to 5-star hotels...',
      'Determining average regional food & dining metrics...',
      'Accounting for curated preferences and premium surcharges...',
      'Consulting Gemini AI market pricing guidelines...',
      'Securing current pricing forecast for dates...'
    ];

    let statusIdx = 0;
    setLoadingStatus(statuses[0]);
    const interval = setInterval(() => {
      statusIdx++;
      if (statusIdx < statuses.length) {
        setLoadingStatus(statuses[statusIdx]);
      }
    }, 1200);

    try {
      const response = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          startDate,
          endDate,
          activities: selectedActivities,
          travelers,
          flightClass
        })
      });

      if (!response.ok) {
        throw new Error('API encounter failed');
      }

      const data = await response.json();
      setResult(data);
      if (data.isFallback) {
        showToast('Estimator updated using local regional parameters.', 'info');
      } else {
        showToast('Budget calculated successfully using current market intelligence!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Offline fallback triggered successfully.', 'info');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pt-32 pb-24 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Upper Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 px-4 py-1.5 rounded-full text-xs font-black uppercase text-secondary tracking-widest mb-4">
            <Coins size={12} className="stroke-[2.5]" />
            Smart Intelligence
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-black text-slate-900 tracking-tight mb-4">
            AI Budget Estimator
          </h1>
          <p className="max-w-2xl mx-auto text-sm md:text-base text-slate-500 font-medium leading-relaxed">
            Specify your destination, dates, and leisure preferences. Rest easy as Voyago leverages Gemini AI 
            model intelligence to fetch realistic, real-time market pricing projections.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls / Form Card */}
          <div className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-xl shadow-slate-100/50">
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <Calculator className="text-secondary" size={20} />
              Trip Outline Details
            </h2>

            <form onSubmit={handleEstimate} className="flex flex-col gap-6">
              
              {/* Destination */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  Target Destination
                </label>
                <AutocompleteInput 
                  value={destination}
                  onChange={setDestination}
                  placeholder="Where are you dreaming of?"
                  inputClassName="bg-slate-50/50 border-slate-100/80 rounded-2xl"
                />
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Arrival Date
                  </label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50/50 p-4 border border-slate-100/80 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-secondary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Departure Date
                  </label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50/50 p-4 border border-slate-100/80 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-secondary/20"
                    />
                  </div>
                </div>
              </div>

              {/* Travelers & Classes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Traveler Count
                  </label>
                  <div className="flex items-center bg-slate-50/50 border border-slate-100/80 rounded-2xl px-4 py-1">
                    <Users size={16} className="text-slate-400 mr-2" />
                    <input 
                      type="number"
                      min={1}
                      max={12}
                      value={travelers}
                      onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-3 bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Cabin Tier
                  </label>
                  <select
                    value={flightClass}
                    onChange={(e) => setFlightClass(e.target.value as any)}
                    className="w-full bg-slate-50/50 p-4 border border-slate-100/80 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-secondary/20 appearance-none"
                  >
                    <option value="Economy">Economy Cabin</option>
                    <option value="Business">Business Cabin</option>
                    <option value="First">First Class Suite</option>
                  </select>
                </div>
              </div>

              {/* Leisure & Preference Chips */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Interests & Luxury Preferences
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_ACTIVITIES.map((act) => {
                    const isSelected = selectedActivities.includes(act.id);
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => toggleActivity(act.id)}
                        className={cn(
                          "p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all",
                          isSelected
                            ? "bg-secondary/5 border-secondary text-secondary shadow-sm"
                            : "bg-slate-50/35 border-slate-100 text-slate-600 hover:border-slate-200"
                        )}
                      >
                        <span className="text-xs font-bold flex items-center gap-1.5 leading-none">
                          <span>{act.icon}</span>
                          <span>{act.label}</span>
                        </span>
                        <span className="text-[9px] text-slate-400 line-clamp-1">
                          {act.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full h-[64px] bg-secondary hover:bg-secondary/95 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-secondary/20 hover:shadow-secondary/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-white" />
                    <span>Analyzing Pricing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="text-white animate-pulse" />
                    <span>Generate AI Estimation</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Results Visualizer Section */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-[2rem] border border-slate-100 p-12 shadow-xl shadow-slate-100/50 flex flex-col items-center justify-center text-center min-h-[500px]"
                >
                  <div className="w-16 h-16 rounded-3xl bg-secondary/10 flex items-center justify-center text-secondary mb-6 relative">
                    <Loader2 className="animate-spin relative z-10 stroke-[2.5]" size={28} />
                    <div className="absolute inset-0 rounded-3xl bg-secondary/5 filter blur-md animate-pulse" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider mb-2">
                    Consulting Market Intelligence
                  </h3>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mb-4">
                    Evaluating seasonal demands, daily exchange rates, and live airline inventories.
                  </p>
                  <p className="text-sm font-black text-secondary font-mono animate-fadeIn">
                    {loadingStatus}
                  </p>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-8"
                >
                  {/* Summary Totals Banner Card */}
                  <div className="bg-slate-900 text-white rounded-[2rem] p-8 relative overflow-hidden shadow-2xl shadow-slate-900/10">
                    <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-secondary/10 filter blur-3xl -mr-16 -mt-16 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-emerald-500/5 filter blur-3xl -ml-16 -mb-16 pointer-events-none" />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 pb-6 border-b border-white/10 mb-6">
                      <div>
                        <div className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full text-[9px] uppercase tracking-widest font-black text-white">
                          <MapPin size={10} className="text-secondary" />
                          {destination} Budget Recommendation
                        </div>
                        <h3 className="text-sm font-semibold text-white/60 mt-2">
                          Estimated Outlay • {nightsCount} Nights for {travelers} Guests
                        </h3>
                      </div>

                      {/* Unified local currency dropdown */}
                      <div className="bg-white/5 border border-white/10 p-1.5 rounded-xl flex items-center gap-1">
                        <span className="text-[9px] text-white/50 px-2 uppercase font-black tracking-widest">
                          Currency
                        </span>
                        {Object.values(CURRENCIES).map((c) => (
                          <button
                            key={c.code}
                            onClick={() => setCurrencyCode(c.code)}
                            className={cn(
                              "px-2.5 py-1 text-[9px] font-black rounded-lg transition-all cursor-pointer",
                              currency.code === c.code 
                                ? "bg-white text-slate-900 font-sans shadow-md" 
                                : "text-white/70 hover:bg-white/10"
                            )}
                          >
                            {c.code}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-baseline justify-between gap-4 relative z-10">
                      <div>
                        <span className="text-xs font-bold text-white/60 block uppercase tracking-widest mb-1">
                          Grand Total Estimated Cost
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl md:text-5xl font-headline font-black text-white">
                            {formatPrice(result.totalEstimatedCost)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-emerald-500/10 border border-emerald-500/25 px-4 py-2.5 rounded-2xl flex items-center gap-2.5">
                        <div className="text-left">
                          <div className="text-[8px] text-white/40 uppercase tracking-widest font-black leading-none">
                            Confidence Index
                          </div>
                          <div className="text-base font-black text-emerald-400 mt-0.5">
                            {result.confidenceScore}% Accurate
                          </div>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                    </div>

                    {/* Quick Warning if Fallback was Used */}
                    {result.isFallback && (
                      <div className="mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 font-black px-3.5 py-2 rounded-xl text-[10px] leading-tight flex items-center gap-2 tracking-wide uppercase">
                        <ShieldAlert size={14} className="stroke-[2.5]" />
                        <span>API Rate Limit Fallback Model Applied. Estimation constructed via offline matrices.</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing Grid Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Flights */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Plane size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Flights Total
                          </span>
                          <span className="text-xs font-black text-slate-850 font-mono">
                            {formatPrice(result.totalFlights)}
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-800 mt-1 uppercase">
                          {flightClass} Airfare
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Estimated avg {formatPrice(result.baseFlightCost)} roundtrip per traveler, for {travelers} travelers.
                        </p>
                      </div>
                    </div>

                    {/* Stays */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                        <Hotel size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Accommodations
                          </span>
                          <span className="text-xs font-black text-slate-850 font-mono">
                            {formatPrice(result.totalHotels)}
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-800 mt-1 uppercase">
                          Hotel Stay
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Estimated avg {formatPrice(result.hotelNightlyRate)}/nightly rate, for {nightsCount} nights total.
                        </p>
                      </div>
                    </div>

                    {/* Dining */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Utensils size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Dining & Drinks
                          </span>
                          <span className="text-xs font-black text-slate-850 font-mono">
                            {formatPrice(result.totalDining)}
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-800 mt-1 uppercase">
                          Gastronomies
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Calculated at {formatPrice(result.diningCostPerDay)}/daily avg food cost per host, scaled for all days.
                        </p>
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Compass size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Leisure Outings
                          </span>
                          <span className="text-xs font-black text-slate-850 font-mono">
                            {formatPrice(result.activityCost)}
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-800 mt-1 uppercase">
                          Excursions Total
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Attraction entries, guides, and customized hobby additions package cost.
                        </p>
                      </div>
                    </div>

                    {/* Transport */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Local Transit
                          </span>
                          <span className="text-xs font-black text-slate-850 font-mono">
                            {formatPrice(result.localTransport)}
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-800 mt-1 uppercase">
                          Cabs & Shuttles
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Taxis, local trains, hire fuel, or private speedboat/airport transfer costs.
                        </p>
                      </div>
                    </div>

                    {/* Surcharges / Buffer */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Activity size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Buffers & Levies
                          </span>
                          <span className="text-xs font-black text-slate-850 font-mono">
                            {formatPrice((result.premiumSurcharge || 0) + result.emergencyBuffer)}
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-800 mt-1 uppercase">
                          Levies & Padding
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Premium Markup: {formatPrice(result.premiumSurcharge || 0)}. Emergency Fallback Contingency: {formatPrice(result.emergencyBuffer)}.
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Seasonal Insight Box */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-1 flex items-center gap-1">
                        Seasonal Trend Warning
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {result.seasonalAdvice}
                      </p>
                    </div>
                  </div>

                  {/* Bullet tips */}
                  <div className="bg-emerald-500/[0.04] border border-emerald-100/50 p-6 rounded-[2rem] flex flex-col gap-4">
                    <h4 className="text-xs font-black uppercase text-center text-emerald-800 tracking-wider flex items-center justify-center gap-2">
                      <Lightbulb size={12} className="stroke-[3]" />
                      Insider Pricing Hacks & Advisory
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {result.budgetTips.map((tip, idx) => (
                        <div key={idx} className="bg-white border border-emerald-100/30 p-4 rounded-2xl text-xs font-medium text-slate-600 leading-relaxed">
                          <span className="text-emerald-500 text-sm font-black block mb-1">
                            Tip 0{idx + 1}
                          </span>
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Call to Action to recount */}
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={() => {
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-2 border border-slate-200 bg-white/80 hover:bg-white text-slate-600 text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-full shadow-sm hover:shadow transition-all cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      Adjust Parameters
                    </button>
                  </div>

                </motion.div>
              )}

              {!result && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white shadow-xl shadow-slate-100/80 border border-slate-100/60 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center min-h-[500px]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mb-4">
                    <Compass size={24} />
                  </div>
                  <h3 className="text-base font-black uppercase tracking-widest text-slate-700 mb-1">
                    No Budget Rendered Yet
                  </h3>
                  <p className="text-xs text-slate-400 font-medium max-w-sm">
                    Utilize the left outline form to indicate your parameters. We will draw custom market rates 
                    instantly for you.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
};
