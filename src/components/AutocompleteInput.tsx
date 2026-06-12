import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, MapPin, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ALL_SUGGESTIONS } from '../constants/destinations';
import { COUNTRIES } from '../constants/countries';

const COMBINED_SUGGESTIONS = Array.from(new Set([
  ...ALL_SUGGESTIONS,
  ...COUNTRIES.map(c => c.name)
]));

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  icon?: React.ReactNode;
  showIcon?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  placeholder = "Where to next?",
  className,
  inputClassName,
  icon,
  showIcon = true
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    if (inputValue.trim()) {
      const parts = inputValue.split(',').map(p => p.trim());
      const lastPart = parts[parts.length - 1];

      if (lastPart) {
        const filtered = COMBINED_SUGGESTIONS.filter(s =>
          s.toLowerCase().includes(lastPart.toLowerCase()) && 
          !parts.slice(0, -1).includes(s)
        ).slice(0, 5);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
    setActiveIndex(-1);
  };

  const selectSuggestion = (suggestion: string) => {
    const parts = value.split(',').map(p => p.trim());
    parts[parts.length - 1] = suggestion;
    onChange(parts.join(', '));
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className={cn(
        "flex items-center gap-3 bg-surface-container-low px-5 py-4 rounded-xl border border-transparent focus-within:border-secondary/20 transition-all",
        inputClassName
      )}>
        {showIcon && (icon || <Navigation size={20} className="text-secondary" />)}
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="bg-transparent border-none focus:outline-none w-full text-on-surface font-bold text-sm placeholder:text-outline-variant/60"
        />
        {value && (
          <button 
            type="button"
            onClick={() => onChange('')}
            className="text-on-surface-variant/40 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
          >
            <div className="p-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-3",
                    index === activeIndex ? "bg-secondary text-white" : "text-on-surface-variant hover:bg-slate-50"
                  )}
                >
                  <MapPin size={14} className={index === activeIndex ? "text-white" : "text-secondary"} />
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="bg-slate-50 p-3 border-t border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                Tip: Separate multiple destinations with commas
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
