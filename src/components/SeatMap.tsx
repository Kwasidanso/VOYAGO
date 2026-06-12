import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Armchair, ShieldCheck, Users, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Seat {
  id: string;
  row: number;
  letter: string;
  class: 'First' | 'Business' | 'Economy';
  type: 'window' | 'aisle' | 'middle';
  isPremium: boolean;
  status: 'available' | 'booked';
  price: number; // seat selection supplement in USD
  features: string[];
}

interface SeatMapProps {
  flightClass: string; // e.g., "First", "Business", "Economy"
  onSeatSelect: (seat: Seat | null) => void;
  selectedSeat: Seat | null;
}

export const SeatMap: React.FC<SeatMapProps> = ({ flightClass, onSeatSelect, selectedSeat }) => {
  const normClass = useMemo(() => {
    const c = flightClass.toLowerCase();
    if (c.includes('first')) return 'First';
    if (c.includes('business')) return 'Business';
    return 'Economy';
  }, [flightClass]);

  // Generate a realistic cabin seat configuration
  const seats = useMemo(() => {
    const generated: Seat[] = [];

    // Row configuration:
    // First: Rows 1-3, 1-2-1 layout (A _ C D _ F)
    // Business: Rows 4-8, 2-2 layout (A B _ E F)
    // Economy: Rows 9-25, 3-3 layout (A B C _ D E F)
    
    // First Class Configuration
    for (let r = 1; r <= 3; r++) {
      ['A', 'C', 'D', 'F'].forEach((l) => {
        const type = l === 'A' || l === 'F' ? 'window' : 'aisle';
        // Deterministic status based on seed hash of ID
        const isBooked = (r * 13 + l.charCodeAt(0)) % 3 === 0;
        generated.push({
          id: `${r}${l}`,
          row: r,
          letter: l,
          class: 'First',
          type,
          isPremium: true,
          status: isBooked ? 'booked' : 'available',
          price: 150,
          features: ['Extra wide seat', '180° Flatbed recline', 'Direct aisle access', 'Premium dining included']
        });
      });
    }

    // Business Class Configuration
    for (let r = 4; r <= 8; r++) {
      ['A', 'B', 'E', 'F'].forEach((l) => {
        const type = l === 'A' || l === 'F' ? 'window' : 'aisle';
        const isBooked = (r * 7 + l.charCodeAt(0)) % 3 === 1;
        generated.push({
          id: `${r}${l}`,
          row: r,
          letter: l,
          class: 'Business',
          type,
          isPremium: true,
          status: isBooked ? 'booked' : 'available',
          price: 75,
          features: ['Deep lounge recline', 'Ample legroom', 'Acoustic privacy screen', 'Premium noise-canceling headsets']
        });
      });
    }

    // Economy Class Configuration
    for (let r = 9; r <= 24; r++) {
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((l) => {
        const type = l === 'A' || l === 'F' ? 'window' : (l === 'C' || l === 'D' ? 'aisle' : 'middle');
        const isBooked = (r * 4 + l.charCodeAt(0)) % 5 <= 1; // ~40% occupancy
        const isPremiumRow = r === 9 || r === 15; // Extra legroom exit row
        generated.push({
          id: `${r}${l}`,
          row: r,
          letter: l,
          class: 'Economy',
          type,
          isPremium: isPremiumRow,
          status: isBooked ? 'booked' : 'available',
          price: isPremiumRow ? 35 : 0,
          features: isPremiumRow 
            ? ['Exit Row', '4 inches extra legroom', 'Priority boarding group']
            : ['Standard recline', 'Personal inflight video screeen', 'In-seat power socket']
        });
      });
    }

    return generated;
  }, []);

  // Filter seats based on active flight class selection
  const visibleSeats = useMemo(() => {
    return seats.filter((s) => s.class === normClass);
  }, [seats, normClass]);

  // Group seats by Row number
  const seatsByRow = useMemo(() => {
    const grouped: Record<number, Seat[]> = {};
    visibleSeats.forEach((seat) => {
      if (!grouped[seat.row]) {
        grouped[seat.row] = [];
      }
      grouped[seat.row].push(seat);
    });
    return grouped;
  }, [visibleSeats]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'booked') return;
    
    if (selectedSeat?.id === seat.id) {
      onSeatSelect(null);
    } else {
      onSeatSelect(seat);
    }
  };

  // Get layout columns configuration
  const getLayoutConfig = () => {
    if (normClass === 'First') {
      return {
        columns: ['A', 'C', '', 'D', 'F'],
        gridCols: 'grid-cols-5',
        label: 'First Class — Ultra Spacious 1-2-1 Suite'
      };
    }
    if (normClass === 'Business') {
      return {
        columns: ['A', 'B', '', 'E', 'F'],
        gridCols: 'grid-cols-5',
        label: 'Business Class — Comfort 2-2 Cabin'
      };
    }
    return {
      columns: ['A', 'B', 'C', '', 'D', 'E', 'F'],
      gridCols: 'grid-cols-7',
      label: 'Economy Class — 3-3 Coach Cabin'
    };
  };

  const layout = getLayoutConfig();

  return (
    <div id="seat-map-module" className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-6 font-sans">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xs font-black uppercase text-on-surface tracking-widest mb-1">Select Cabin Seat</h3>
          <p className="text-[10px] text-on-surface-variant leading-none">{layout.label}</p>
        </div>
        <div className="bg-white/80 border border-slate-100 px-2.5 py-1 rounded-full text-[10px] font-black text-secondary tracking-widest uppercase">
          {normClass} Cabin
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-2 py-3 bg-white rounded-2xl border border-slate-100/60 text-[10px]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-400">
            <Armchair size={10} />
          </div>
          <span className="font-bold text-slate-500 uppercase">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-secondary text-white flex items-center justify-center">
            <Armchair size={10} />
          </div>
          <span className="font-black text-slate-800 uppercase">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-slate-200 text-slate-400 flex items-center justify-center cursor-not-allowed">
            <Armchair size={10} />
          </div>
          <span className="font-bold text-slate-500 uppercase">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <span className="text-[8px] font-black font-sans">★</span>
          </div>
          <span className="font-bold text-slate-500 uppercase">Premium</span>
        </div>
      </div>

      {/* Visually rendered Airplane frame */}
      <div className="relative mx-auto w-full max-w-[320px] bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl shadow-slate-500/5 select-none overflow-hidden">
        {/* Plane outline details */}
        <div className="absolute top-0 inset-x-0 h-10 border-b border-dashed border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          Cockpit / Fore
        </div>
        
        {/* Rows wrapper inside the cockpit frame */}
        <div className="mt-8 mb-6 flex flex-col gap-2.5">
          {/* Plane Columns Letters Headers */}
          <div className={cn("grid gap-1 mb-1 text-center text-[10px] font-black text-slate-400", layout.gridCols)}>
            {layout.columns.map((col, index) => (
              <span key={index} className="h-4">
                {col}
              </span>
            ))}
          </div>

          {/* Render individual Seat Rows */}
          {Object.keys(seatsByRow).map((rowStr) => {
            const rowNo = parseInt(rowStr);
            const rowSeats = seatsByRow[rowNo];
            
            return (
              <div key={rowNo} className="relative flex items-center">
                {/* Row Number Side Badging */}
                <span className="absolute -left-4 text-[9px] font-black font-mono text-slate-300 w-3 text-right">
                  {rowNo}
                </span>

                <div className={cn("grid gap-1 w-full text-center items-center justify-center", layout.gridCols)}>
                  {layout.columns.map((columnLetter, index) => {
                    if (columnLetter === '') {
                      // Render readable center aisle spacing/line
                      return (
                        <div key={`aisle-${index}`} className="flex items-center justify-center h-7 text-[8px] font-bold text-slate-200 uppercase tracking-tighter">
                          Aisle
                        </div>
                      );
                    }

                    const seat = rowSeats.find((s) => s.letter === columnLetter);
                    if (!seat) {
                      return <div key={`empty-${index}`} className="w-7 h-7" />;
                    }

                    const isSelected = selectedSeat?.id === seat.id;
                    const isBooked = seat.status === 'booked';
                    const isPremium = seat.isPremium;

                    return (
                      <motion.button
                        key={seat.id}
                        onClick={() => handleSeatClick(seat)}
                        disabled={isBooked}
                        whileTap={!isBooked ? { scale: 0.85 } : {}}
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center relative transition-all border outline-none text-xs",
                          isBooked && "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed",
                          !isBooked && !isSelected && !isPremium && "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm",
                          !isBooked && !isSelected && isPremium && "bg-emerald-50/75 hover:bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-300 shadow-sm",
                          isSelected && "bg-secondary border-secondary text-white shadow-md shadow-secondary/20"
                        )}
                        title={`${seat.id} (${seat.class}, ${seat.type}) ${seat.price > 0 ? `+ $${seat.price}` : 'No Fee'}`}
                      >
                        {isBooked ? (
                          <XSign />
                        ) : isSelected ? (
                          <Armchair size={12} className="stroke-[2.5]" />
                        ) : isPremium ? (
                          <div className="flex flex-col items-center">
                            <span className="text-[7px] font-black leading-none text-emerald-600 uppercase">★</span>
                            <Armchair size={10} className="stroke-[2]" />
                          </div>
                        ) : (
                          <Armchair size={12} className="stroke-[1.5]" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <span className="absolute -right-4 text-[9px] font-black font-mono text-slate-300 w-3 text-left">
                  {rowNo}
                </span>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 inset-x-0 h-8 border-t border-dashed border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          Aft / Exhaust
        </div>
      </div>

      {/* Selected Seat Stats Details Card */}
      <AnimatePresence mode="wait">
        {selectedSeat ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-col gap-3"
          >
            <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
              <div className="flex items-center gap-2">
                <div className="bg-secondary text-white text-[13px] font-sans font-black h-8 px-3 rounded-xl flex items-center justify-center">
                  {selectedSeat.id}
                </div>
                <div>
                  <p className="text-[10px] font-black text-on-surface uppercase leading-none">Seat Confirmed</p>
                  <p className="text-[9px] text-on-surface-variant capitalize">{selectedSeat.type} Seat • {selectedSeat.class} Cabin</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Selection Fee</p>
                <p className="text-[13px] font-black text-emerald-600 leading-none">
                  {selectedSeat.price > 0 ? `+$${selectedSeat.price}` : 'FREE'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Amenities Included</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedSeat.features.map((feat, idx) => (
                  <span 
                    key={idx} 
                    className="text-[9px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white border border-dashed border-slate-200/80 p-5 rounded-2xl flex flex-col items-center justify-center text-center py-6 min-h-[90px]"
          >
            <Users size={16} className="text-slate-300 mb-1.5" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">No seat selected</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Choose an empty cell in the map above to secure your seat preference.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const XSign = () => (
  <svg 
    viewBox="0 0 24 24" 
    width="8" 
    height="8" 
    stroke="currentColor" 
    strokeWidth="3.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="opacity-50 text-slate-400"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
