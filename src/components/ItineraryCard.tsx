import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Clock, List, Map as MapIcon, GripVertical, Calendar, Check, ChevronUp, ChevronDown, Coins, DollarSign } from 'lucide-react';
import { Itinerary, ItineraryMap } from './ItineraryMap';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency } from './CurrencyContext';

const estimateDuration = (title: string, description: string): string => {
  const fullText = `${title} ${description}`.toLowerCase();
  
  // Try to find explicit mentions of hours (e.g., "2 hours", "1.5 hrs", "1-2 hr", "half hour", "an hour")
  const hourRegex = /(\d+(?:\.\d+)?)\s*(?:hour|hr|hrs)/i;
  const hourMatch = fullText.match(hourRegex);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    return hours === 1 ? '1 hr' : `${hours} hrs`;
  }

  const rangeHourRegex = /(\d+)\s*[-to]+\s*(\d+)\s*(?:hour|hr|hrs)/i;
  const rangeHourMatch = fullText.match(rangeHourRegex);
  if (rangeHourMatch) {
    return `${rangeHourMatch[1]}-${rangeHourMatch[2]} hrs`;
  }

  if (fullText.includes('half hour') || fullText.includes('half an hour') || fullText.includes('30 min') || fullText.includes('30-min')) {
    return '30 mins';
  }

  if (fullText.includes('an hour') || fullText.includes('one hour') || fullText.includes('1-hour')) {
    return '1 hr';
  }

  // Try to find explicit mentions of minutes (e.g., "45 minutes", "15 mins")
  const minRegex = /(\d+)\s*(?:min|minute|mins|minutes)/i;
  const minMatch = fullText.match(minRegex);
  if (minMatch) {
    return `${minMatch[1]} mins`;
  }

  // Fallback defaults based on activity category clues
  if (/dinner|lunch|breakfast|meal|food|culinary|dine|dining/i.test(fullText)) {
    return '1.5 hrs';
  }
  if (/museum|tour|hike|walking tour|gallery|hike|explore|cruising|cruise|boat|excursion|city orientation/i.test(fullText)) {
    return '2-3 hrs';
  }
  if (/flight|drive|journey|transfer|train|bus|travel/i.test(fullText)) {
    return '2+ hrs';
  }
  if (/photo stop|brief|quick check-in|scenic viewpoint|snapshot/i.test(fullText)) {
    return '30 mins';
  }
  if (/relax|spa|beach|swim|unwind|leisure/i.test(fullText)) {
    return '2 hrs';
  }

  return '1 hr'; // Good general baseline
};

interface CompletedActivity {
  time: string;
  title: string;
  description: string;
  completed?: boolean;
}

interface CompletedDay {
  day: number;
  theme: string;
  activities: CompletedActivity[];
}

interface ItineraryCardProps {
  itinerary: Itinerary;
}

export const ItineraryCard: React.FC<ItineraryCardProps> = ({ itinerary }) => {
  const { formatPrice, currency } = useCurrency();
  const [convertLocal, setConvertLocal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [days, setDays] = useState<CompletedDay[]>(itinerary.days);
  const [draggedItem, setDraggedItem] = useState<{ dayIndex: number; activityIndex: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ dayIndex: number; activityIndex: number } | null>(null);

  useEffect(() => {
    setDays(itinerary.days);
  }, [itinerary]);

  // Compute total USD budget
  const totalUsdBudget = useMemo(() => {
    let sum = 0;
    days.forEach((day) => {
      day.activities.forEach((act) => {
        // Fallback or parse cost
        const parsedCost = typeof (act as any).cost === 'number' 
          ? (act as any).cost 
          : (act.title.toLowerCase().includes('lunch') || act.title.toLowerCase().includes('dinner') || act.title.toLowerCase().includes('meal') ? 35 
             : act.title.toLowerCase().includes('hotel') || act.title.toLowerCase().includes('check-in') ? 0 : 25);
        sum += parsedCost;
      });
    });
    return sum;
  }, [days]);

  const handleDragStart = (e: React.DragEvent, dayIndex: number, activityIndex: number) => {
    setDraggedItem({ dayIndex, activityIndex });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, activityIndex: number) => {
    e.preventDefault();
    if (draggedItem && (draggedItem.dayIndex !== dayIndex || draggedItem.activityIndex !== activityIndex)) {
      setDragOverItem({ dayIndex, activityIndex });
    }
  };

  const handleDrop = (e: React.DragEvent, targetDayIndex: number, targetActivityIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const sourceDayIndex = draggedItem.dayIndex;
    const sourceActivityIndex = draggedItem.activityIndex;

    const updatedDays = JSON.parse(JSON.stringify(days));
    const [movedActivity] = updatedDays[sourceDayIndex].activities.splice(sourceActivityIndex, 1);
    updatedDays[targetDayIndex].activities.splice(targetActivityIndex, 0, movedActivity);

    setDays(updatedDays);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const toggleActivityCompletion = (dayIndex: number, activityIndex: number) => {
    const updatedDays = JSON.parse(JSON.stringify(days));
    if (updatedDays[dayIndex]?.activities?.[activityIndex]) {
      updatedDays[dayIndex].activities[activityIndex].completed = !updatedDays[dayIndex].activities[activityIndex].completed;
      setDays(updatedDays);
    }
  };

  const moveActivity = (dayIndex: number, activityIndex: number, direction: 'up' | 'down') => {
    const updatedDays = JSON.parse(JSON.stringify(days));
    const targetIndex = direction === 'up' ? activityIndex - 1 : activityIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < updatedDays[dayIndex].activities.length) {
      const temp = updatedDays[dayIndex].activities[activityIndex];
      updatedDays[dayIndex].activities[activityIndex] = updatedDays[dayIndex].activities[targetIndex];
      updatedDays[dayIndex].activities[targetIndex] = temp;
      setDays(updatedDays);
    }
  };

  // Generate and download a standard .ics iCalendar file for a specific activity
  const downloadActivityIcs = (dayNum: number, timeStr: string, title: string, description: string) => {
    let baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + dayNum); // Default offset

    // Try parsing date string like 2026-06-01 from tripTitle
    const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
    const match = itinerary.tripTitle.match(dateRegex);
    if (match) {
      const parsedDate = new Date(match[1] + '-' + match[2] + '-' + match[3]);
      if (!isNaN(parsedDate.getTime())) {
        baseDate = parsedDate;
        baseDate.setDate(baseDate.getDate() + (dayNum - 1));
      }
    }

    // Parse timeStr e.g., "09:00 AM" or "3:00 PM"
    let startHour = 9;
    let startMinute = 0;
    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let hrs = parseInt(timeMatch[1], 10);
      const mins = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === 'PM' && hrs < 12) hrs += 12;
      if (ampm === 'AM' && hrs === 12) hrs = 0;
      startHour = hrs;
      startMinute = mins;
    }

    const startDate = new Date(baseDate);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1); // 1-hour duration default

    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeIcsText = (str: string) => {
      return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
    };

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Voyago Travel//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:${escapeIcsText(title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate and download a standard .ics iCalendar file for the ENTIRE itinerary
  const downloadEntireItineraryIcs = () => {
    let baseDate = new Date();
    const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
    const match = itinerary.tripTitle.match(dateRegex);
    if (match) {
      const parsedDate = new Date(match[1] + '-' + match[2] + '-' + match[3]);
      if (!isNaN(parsedDate.getTime())) {
        baseDate = parsedDate;
      }
    }

    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeIcsText = (str: string) => {
      return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
    };

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Voyago Travel//EN',
      'CALSCALE:GREGORIAN'
    ];

    days.forEach(day => {
      day.activities.forEach(act => {
        let startHour = 9;
        let startMinute = 0;
        const timeMatch = act.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          let hrs = parseInt(timeMatch[1], 10);
          const mins = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3].toUpperCase();
          if (ampm === 'PM' && hrs < 12) hrs += 12;
          if (ampm === 'AM' && hrs === 12) hrs = 0;
          startHour = hrs;
          startMinute = mins;
        }

        const activityDate = new Date(baseDate);
        activityDate.setDate(baseDate.getDate() + (day.day - 1));
        activityDate.setHours(startHour, startMinute, 0, 0);

        const endDate = new Date(activityDate);
        endDate.setHours(activityDate.getHours() + 1);

        icsLines.push('BEGIN:VEVENT');
        icsLines.push(`SUMMARY:${escapeIcsText(act.title)}`);
        icsLines.push(`DESCRIPTION:${escapeIcsText(act.description)}`);
        icsLines.push(`DTSTART:${formatIcsDate(activityDate)}`);
        icsLines.push(`DTEND:${formatIcsDate(endDate)}`);
        icsLines.push('STATUS:CONFIRMED');
        icsLines.push('END:VEVENT');
      });
    });

    icsLines.push('END:VCALENDAR');

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${itinerary.tripTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_full.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
      {/* Header with Switcher Segment Control */}
      <div className="bg-secondary/5 px-6 py-4 border-b border-secondary/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1">
          <h4 className="font-headline font-black text-secondary text-sm flex items-center gap-2 uppercase tracking-tight">
            <Sparkles size={16} className="shrink-0" /> {itinerary.tripTitle}
          </h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">
            Tip: Drag activities to customize your day-by-day sequence
          </p>
        </div>
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 grow-0 self-end sm:self-auto gap-1">
          <button
            onClick={downloadEntireItineraryIcs}
            className="px-2.5 py-1.5 rounded-md text-[9px] uppercase font-black tracking-wider transition-all flex items-center gap-1 text-slate-500 hover:text-slate-800 hover:bg-white"
            title="Download full trip calendar (.ics)"
          >
            <Calendar size={10} /> Full iCal
          </button>
          <div className="w-px h-4 bg-slate-200 self-center mx-0.5" />
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-md text-[9px] uppercase font-black tracking-wider transition-all flex items-center gap-1 ${
              activeTab === 'list' 
                ? 'bg-white text-secondary shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List size={10} /> Agenda
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-md text-[9px] uppercase font-black tracking-wider transition-all flex items-center gap-1 ${
              activeTab === 'map' 
                ? 'bg-white text-secondary shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapIcon size={10} /> Interactive Map
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {activeTab === 'list' ? (
          <div className="space-y-6">
            {/* Global Itinerary Budget & Currency Converter Toggle */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 animate-pulse">
                  <Coins size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                    Itinerary global budget estimate
                  </h4>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-headline font-black text-slate-800">
                      {convertLocal ? formatPrice(totalUsdBudget) : `$${totalUsdBudget.toLocaleString()}`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {convertLocal ? `${currency.code} Total` : 'USD Total'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle controls with premium visual state feedback */}
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-100/80 shadow-xs hover:border-slate-200 transition-colors">
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-700 block uppercase leading-none tracking-wide">
                    Convert Costs
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">
                    to {currency.code} ({currency.symbol})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setConvertLocal(!convertLocal)}
                  className={`relative w-12 h-6.5 rounded-full p-1 transition-all duration-300 ease-out cursor-pointer ${
                    convertLocal ? 'bg-secondary' : 'bg-slate-250'
                  }`}
                  aria-label="Toggle currency conversion"
                  id="currency-toggle-button"
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-all duration-300 ease-out transform ${
                      convertLocal ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {days.map((day, di) => {
              const totalActivities = day.activities.length;
              const completedActivities = day.activities.filter(a => a.completed).length;
              const completionPercentage = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
              
              // SVG circular layout variables
              const radius = 10;
              const strokeWidth = 2.5;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

              return (
                <div key={di} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100/60 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="bg-secondary text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase font-sans">
                        Day {day.day}
                      </div>
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none">
                        {day.theme}
                      </span>
                    </div>

                    {/* Circular Progress Indicator */}
                    <div 
                      className="flex items-center gap-2 select-none group/progress cursor-help"
                      title={`${completedActivities} of ${totalActivities} activities completed (${completionPercentage}%)`}
                    >
                      <span className="text-[10px] font-black font-mono text-slate-400 group-hover/progress:text-slate-600 transition-colors">
                        {completedActivities}/{totalActivities}
                      </span>
                      <div className="relative w-8 h-8 flex items-center justify-center">
                        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                          {/* Background Track */}
                          <circle
                            cx="16"
                            cy="16"
                            r={radius}
                            className="stroke-slate-100 fill-none"
                            strokeWidth={strokeWidth}
                          />
                          {/* Foreground Animated Track */}
                          <circle
                            cx="16"
                            cy="16"
                            r={radius}
                            className={`fill-none transition-all duration-300 ease-out ${
                              completionPercentage === 100 ? 'stroke-emerald-500' : 'stroke-secondary'
                            }`}
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {completionPercentage === 100 ? (
                            <Check size={11} className="text-emerald-500 stroke-[3.5] animate-pulse" />
                          ) : (
                            <span className="text-[8px] font-black font-sans text-slate-600">
                              {completionPercentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-slate-100/80">
                  <AnimatePresence initial={false}>
                    {day.activities.map((act, ai) => {
                      const isDragged = draggedItem?.dayIndex === di && draggedItem?.activityIndex === ai;
                      const isOver = dragOverItem?.dayIndex === di && dragOverItem?.activityIndex === ai;

                      return (
                        <div key={`${act.time}-${act.title}-${ai}`} className="relative space-y-1">
                          {isOver && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0, scale: 0.95 }}
                              animate={{ height: 'auto', opacity: 1, scale: 1 }}
                              exit={{ height: 0, opacity: 0, scale: 0.95 }}
                              className="w-full flex items-center justify-center border border-dashed border-secondary bg-secondary/5 py-1.5 text-[9px] font-black uppercase tracking-widest text-secondary text-center px-4 rounded-xl pointer-events-none"
                            >
                              ↓↓ Drop activity here ↓↓
                            </motion.div>
                          )}
                          <motion.div 
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                            id={`itinerary-activity-${di}-${ai}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, di, ai)}
                            onDragOver={(e) => handleDragOver(e, di, ai)}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => handleDrop(e, di, ai)}
                            className={`group relative pl-12 pr-12 py-3.5 rounded-xl border transition-all duration-300 ease-out cursor-grab active:cursor-grabbing transform ${
                              isDragged 
                                ? 'opacity-40 border-dashed border-secondary bg-slate-50 scale-95 shadow-none' 
                                : isOver 
                                  ? 'border-secondary/60 bg-secondary/5 scale-[1.03] shadow-md border-t-4' 
                                  : `border-transparent hover:border-slate-100/85 hover:bg-slate-50/80 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:scale-[1.02] ${
                                      act.completed ? 'opacity-65' : ''
                                    }`
                            }`}
                          >
                            <div className="absolute left-[-12px] top-5 w-4.5 h-4.5 rounded-full bg-white border-2 border-secondary flex items-center justify-center group-hover:scale-110 transition-all duration-200">
                              <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                            </div>
                            
                            {/* Circular Checkbox */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleActivityCompletion(di, ai);
                              }}
                              className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                act.completed
                                  ? 'bg-emerald-500 border-emerald-500 hover:bg-emerald-600 hover:border-emerald-600 text-white shadow-sm'
                                  : 'border-slate-300 hover:border-secondary bg-white text-transparent shadow-xs'
                              }`}
                              aria-label={act.completed ? "Mark activity as incomplete" : "Mark activity as complete"}
                              id={`activity-checkbox-${di}-${ai}`}
                            >
                              {act.completed ? (
                                <Check size={11} className="stroke-[3.5]" />
                              ) : (
                                <Check size={11} className="opacity-0 group-hover:opacity-30 group-hover:text-slate-400 stroke-[3]" />
                              )}
                            </button>

                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Clock size={10} className="text-secondary shrink-0 transition-all group-hover:scale-110" />
                                <span className="text-[9px] font-bold text-secondary uppercase tracking-wider">{act.time}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-secondary/20 transition-all group-hover:bg-secondary/20 shadow-sm">
                                  {estimateDuration(act.title, act.description)}
                                </div>
                                <div className="bg-emerald-500/[0.08] text-emerald-800 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-emerald-500/20 transition-all shadow-sm flex items-center gap-1">
                                  <Coins size={8} className="text-emerald-600 shrink-0" />
                                  {(() => {
                                    const actCost = typeof (act as any).cost === 'number' 
                                      ? (act as any).cost 
                                      : (act.title.toLowerCase().includes('lunch') || act.title.toLowerCase().includes('dinner') || act.title.toLowerCase().includes('meal') ? 35 
                                         : act.title.toLowerCase().includes('hotel') || act.title.toLowerCase().includes('check-in') ? 0 : 25);
                                    return actCost === 0 ? "Free" : convertLocal ? formatPrice(actCost) : `$${actCost}`;
                                  })()}
                                </div>
                              </div>
                            </div>
                            <p className={`text-xs font-black mb-1 transition-all ${
                              act.completed 
                                ? 'line-through text-slate-400 font-medium' 
                                : 'text-on-surface group-hover:text-secondary'
                            }`}>{act.title}</p>
                            <p className="text-[11px] text-on-surface-variant leading-relaxed">{act.description}</p>
                            
                            {/* Actions Overlay (Always-visible iCal Export Button, Move Controls, & Drag Handle) */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              {/* Desktop-Hover / Mobile-visible swap controllers */}
                              <div className="flex flex-col gap-0.5 border-r border-slate-200/60 pr-2 mr-0.5 opacity-40 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                                <button
                                  disabled={ai === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveActivity(di, ai, 'up');
                                  }}
                                  className={`p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-secondary transition-colors ${
                                    ai === 0 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                  title="Move Up"
                                  id={`move-up-btn-${di}-${ai}`}
                                >
                                  <ChevronUp size={12} className="stroke-[2.5]" />
                                </button>
                                <button
                                  disabled={ai === day.activities.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveActivity(di, ai, 'down');
                                  }}
                                  className={`p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-secondary transition-colors ${
                                    ai === day.activities.length - 1 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                  title="Move Down"
                                  id={`move-down-btn-${di}-${ai}`}
                                >
                                  <ChevronDown size={12} className="stroke-[2.5]" />
                                </button>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadActivityIcs(day.day, act.time, act.title, act.description);
                                }}
                                title="Export to calendar (.ics)"
                                className="p-1.5 bg-slate-50 hover:bg-secondary/10 hover:text-secondary text-slate-500 rounded-lg border border-slate-200/50 shadow-xs transition-all flex items-center justify-center cursor-pointer pointer-events-auto"
                                id={`export-activity-btn-${di}-${ai}`}
                              >
                                <Calendar size={13} className="shrink-0" />
                              </button>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block">
                                <GripVertical size={14} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing" />
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
            })}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">
                Interactive Map Route
              </span>
              <span className="text-[9px] text-secondary font-bold">
                {days.reduce((total, d) => total + (d.activities?.length || 0), 0)} plotted activities
              </span>
            </div>
            <ItineraryMap tripTitle={itinerary.tripTitle} days={days} />
          </div>
        )}
      </div>
    </div>
  );
};

