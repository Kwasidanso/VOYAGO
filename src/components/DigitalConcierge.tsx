import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, MessageSquare, Loader2, Calendar, MapPin, Compass, Sparkles, ChevronLeft, Clock, Hotel } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from './FirebaseProvider';

import { useConcierge } from './ConciergeContext';
import { ItineraryCard } from './ItineraryCard';

interface Itinerary {
  tripTitle: string;
  days: {
    day: number;
    theme: string;
    activities: { time: string, title: string, description: string }[];
  }[];
}

export const DigitalConcierge: React.FC = () => {
  const { isOpen, setIsOpen } = useConcierge();
  const [view, setView] = useState<'chat' | 'itinerary-form'>('chat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string | Itinerary, type?: 'itinerary' }[]>([
    { role: 'model', content: 'Hello! I am your Voyago Digital Concierge. How can I help you plan your next extraordinary journey?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();

  // Use refs to prevent stale closures inside background events
  const messagesRef = useRef(messages);
  const profileRef = useRef(profile);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    profileRef.current = profile;
    // Auto-update message history greeting when a premium user logs in
    if (profile && messages.length === 1) {
      setMessages([
        { 
          role: 'model', 
          content: `Welcome back, ${profile.displayName || 'Explorer'}! As a valued ${profile.explorerLevel || 'Gold'} Tier member with **${(profile.availablePoints || 0).toLocaleString()} points**, how can I assist you today? I can build detailed tour itineraries, recommend elite cruises, or help you share your dynamic referral code (**${profile.referralCode || 'VOYAGO-MEMBER'}**) to earn 2,500 bonus points!` 
        }
      ]);
    }
  }, [profile]);

  // Itinerary Form State
  const [itinDestination, setItinDestination] = useState('');
  const [itinStart, setItinStart] = useState('');
  const [itinEnd, setItinEnd] = useState('');
  const [itinPrefs, setItinPrefs] = useState('');

  // Local beautiful markdown formatter
  const renderFormattedText = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-[13px] leading-relaxed">
        {lines.map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={index} className="h-1.5" />;
          
          if (trimmed.startsWith('###')) {
            return (
              <h4 key={index} className="text-xs font-black uppercase tracking-wider mt-3 mb-1 text-slate-800">
                {parseInlineStyles(trimmed.replace(/^###\s*/, ''))}
              </h4>
            );
          }
          if (trimmed.startsWith('##')) {
            return (
              <h3 key={index} className="text-sm font-black uppercase tracking-wide mt-4 mb-1.5 text-slate-900 border-b border-slate-100 pb-0.5">
                {parseInlineStyles(trimmed.replace(/^##\s*/, ''))}
              </h3>
            );
          }
          if (trimmed.startsWith('#')) {
            return (
              <h2 key={index} className="text-base font-black uppercase tracking-widest mt-4 mb-2 text-slate-900 border-b border-slate-200 pb-1">
                {parseInlineStyles(trimmed.replace(/^#\s*/, ''))}
              </h2>
            );
          }
          
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            return (
              <div key={index} className="flex items-start gap-2 ml-1.5 my-0.5">
                <span className="text-secondary select-none mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-secondary" />
                <span className="flex-1">
                  {parseInlineStyles(trimmed.replace(/^[-*•]\s+/, ''))}
                </span>
              </div>
            );
          }
          
          const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numberedMatch) {
            return (
              <div key={index} className="flex items-start gap-1.5 ml-1.5 my-0.5">
                <span className="font-bold text-secondary text-xs shrink-0 min-w-[14px]">{numberedMatch[1]}.</span>
                <span className="flex-1">
                  {parseInlineStyles(numberedMatch[2])}
                </span>
              </div>
            );
          }
          
          return (
            <p key={index}>
              {parseInlineStyles(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-950">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 bg-slate-100 text-secondary font-mono text-[11px] rounded border border-slate-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    const handlePrompt = (event: any) => {
      const prompt = event.detail;
      setIsOpen(true);
      if (prompt) {
        if (prompt === 'BUILD_ITINERARY') {
          setView('itinerary-form');
        } else {
          setMessages(prev => [...prev, { role: 'user', content: prompt }]);
          sendPrompt(prompt);
        }
      }
    };

    window.addEventListener('concierge-prompt', handlePrompt);
    return () => window.removeEventListener('concierge-prompt', handlePrompt);
  }, [setIsOpen]);

  const sendPrompt = async (promptContent: string) => {
    setIsTyping(true);
    try {
      const currentHistory = [
        ...messagesRef.current.filter(m => typeof m.content === 'string')
          .map(m => ({ role: m.role, parts: [{ text: m.content as string }] })),
        { role: 'user', parts: [{ text: promptContent }] }
      ];
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: promptContent,
          history: currentHistory.slice(0, currentHistory.length - 1), // Send the preceding history
          profile: profileRef.current
        }),
      });

      const data = await response.json();
      if (data.text) {
        setMessages(prev => [...prev, { role: 'model', content: data.text }]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleBuildItinerary = async () => {
    if (!itinDestination || !itinStart || !itinEnd) return;
    
    setIsTyping(true);
    setView('chat');
    setMessages(prev => [...prev, { role: 'user', content: `Create itinerary for ${itinDestination} (${itinStart} to ${itinEnd}) with interests in: ${itinPrefs}` }]);
    
    try {
      const response = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          destination: itinDestination,
          startDate: itinStart,
          endDate: itinEnd,
          preferences: itinPrefs
        }),
      });

      const data = await response.json();
      if (data.tripTitle) {
        setMessages(prev => [...prev, { role: 'model', content: data, type: 'itinerary' }]);
      } else {
        throw new Error('Failed to generate itinerary');
      }
    } catch (error) {
      console.error('Itinerary error:', error);
      setMessages(prev => [...prev, { role: 'model', content: "I encountered an error while building your itinerary. Please try again with different parameters." }]);
    } finally {
      setIsTyping(false);
      // Reset form
      setItinDestination('');
      setItinStart('');
      setItinEnd('');
      setItinPrefs('');
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');

    if (userMessage.toLowerCase().includes('build itinerary')) {
      setView('itinerary-form');
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    sendPrompt(userMessage);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-secondary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group border border-white/10"
      >
        <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white animate-pulse"></span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            className="fixed bottom-28 right-8 w-[400px] max-w-[92vw] h-[660px] bg-white rounded-3xl shadow-3xl flex flex-col border border-slate-100/80 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-slate-950 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center shadow-lg relative shrink-0">
                  <Bot size={22} className="text-white" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-black uppercase text-sm tracking-tight text-white">Voyago Concierge</h3>
                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded">AI</span>
                  </div>
                  {profile ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-secondary-fixed/90 flex items-center gap-1 bg-secondary-fixed/15 border border-secondary-fixed/20 px-1.5 py-0.2 rounded">
                        <Sparkles size={10} className="fill-current text-secondary" />
                        {profile.explorerLevel || 'Gold'} Member
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {profile.availablePoints?.toLocaleString() || '12,400'} pts
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 font-medium">Bespoke Travel Intelligence</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const defaultMsg = profile 
                      ? `Welcome back, ${profile.displayName || 'Explorer'}! As a valued ${profile.explorerLevel || 'Gold'} Tier member with **${(profile.availablePoints || 0).toLocaleString()} points**, how can I assist you today? I can build detailed tour itineraries, recommend elite cruises, or help you share your dynamic referral code (**${profile.referralCode || 'VOYAGO-MEMBER'}**) to earn 2,500 bonus points!`
                      : 'Hello! I am your Voyago Digital Concierge. How can I help you plan your next extraordinary journey?';
                    setMessages([{ role: 'model', content: defaultMsg }]);
                  }}
                  title="Clear Chat History"
                  className="px-2.5 h-8 border border-white/10 hover:border-white/20 text-white/75 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Reset
                </button>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-xl text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Quick Suggestion Action Chips - Always visible at start, and horizontally scrollable */}
            {view === 'chat' && (
              <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
                <button 
                  onClick={() => setView('itinerary-form')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-secondary text-white rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-md shadow-secondary/15 hover:scale-105 active:scale-95 transition-transform shrink-0"
                >
                  <Sparkles size={11} className="fill-current" /> Build Itinerary
                </button>
                
                <button 
                  onClick={() => {
                    const q = "Suggest 3 spectacular boutique hotels & luxury villas in Europe";
                    setMessages(prev => [...prev, { role: 'user', content: q }]);
                    sendPrompt(q);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:border-secondary hover:text-secondary rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:bg-slate-50 active:scale-95 transition-all shrink-0"
                >
                  <Hotel size={11} /> Luxury Villas
                </button>

                <button 
                  onClick={() => {
                    const q = "How do I earn referral points and share my coupon?";
                    setMessages(prev => [...prev, { role: 'user', content: q }]);
                    sendPrompt(q);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:border-secondary hover:text-secondary rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:bg-slate-50 active:scale-95 transition-all shrink-0"
                >
                  💎 Referral Benefits
                </button>

                <button 
                  onClick={() => {
                    const q = "Who are Voyago Concierge Partners and Elite Global Services?";
                    setMessages(prev => [...prev, { role: 'user', content: q }]);
                    sendPrompt(q);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:border-secondary hover:text-secondary rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:bg-slate-50 active:scale-95 transition-all shrink-0"
                >
                  🌟 Partners
                </button>
              </div>
            )}

            {/* Messages Area / Form View */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {view === 'chat' ? (
                <>
                  {messages.map((m, i) => (
                    <div key={i} className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border", 
                        m.role === 'user' ? "bg-secondary border-secondary/20 text-white" : "bg-white border-slate-100 text-slate-500"
                      )}>
                        {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={cn("max-w-[85%] rounded-2xl text-[13px] leading-relaxed shadow-sm", 
                        m.role === 'user' 
                          ? "bg-secondary text-white p-4.5 rounded-tr-none font-medium" 
                          : "bg-white text-slate-700 rounded-tl-none border border-slate-100 overflow-hidden"
                      )}>
                        {m.type === 'itinerary' ? (
                          <ItineraryCard itinerary={m.content as Itinerary} />
                        ) : (
                          <div className={cn(m.role === 'user' ? "p-0" : "p-4.5")}>
                            {m.role === 'user' ? (
                              m.content as string
                            ) : (
                              renderFormattedText(m.content as string)
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Bot size={14} />
                      </div>
                      <div className="bg-white px-5 py-3.5 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center justify-center">
                        <Loader2 size={14} className="animate-spin text-secondary" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">Concierge thinking...</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6 py-2">
                  <button 
                    onClick={() => setView('chat')}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-secondary hover:underline"
                  >
                    <ChevronLeft size={14} /> Back to Chat
                  </button>
                  <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
                    <div>
                      <h4 className="text-xl font-headline font-black text-slate-900 tracking-tighter uppercase mb-2">Build Your Itinerary</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Tell me where you want to go and what you love doing, and our custom AI engine will craft a personalized masterpiece in seconds.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Destination</label>
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-3.5 rounded-2xl border border-slate-100 focus-within:border-secondary/30 transition-all">
                          <MapPin size={16} className="text-secondary" />
                          <input 
                            value={itinDestination}
                            onChange={(e) => setItinDestination(e.target.value)}
                            placeholder="e.g. Mykonos, Greece"
                            className="bg-transparent border-none focus:outline-none w-full text-xs font-bold text-slate-800 placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
                          <div className="flex items-center gap-3 bg-slate-50 px-4 py-3.5 rounded-2xl border border-slate-100">
                            <Calendar size={16} className="text-secondary" />
                            <input 
                              type="date"
                              value={itinStart}
                              onChange={(e) => setItinStart(e.target.value)}
                              className="bg-transparent border-none focus:outline-none w-full text-[10px] font-bold text-slate-800"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">End Date</label>
                          <div className="flex items-center gap-3 bg-slate-50 px-4 py-3.5 rounded-2xl border border-slate-100">
                            <Calendar size={16} className="text-secondary" />
                            <input 
                              type="date"
                              value={itinEnd}
                              onChange={(e) => setItinEnd(e.target.value)}
                              className="bg-transparent border-none focus:outline-none w-full text-[10px] font-bold text-slate-800"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Preferred Activities</label>
                        <div className="flex items-start gap-3 bg-slate-50 px-4 py-3.5 rounded-2xl border border-slate-100 focus-within:border-secondary/30 transition-all">
                          <Compass size={16} className="text-secondary mt-1" />
                          <textarea 
                            value={itinPrefs}
                            onChange={(e) => setItinPrefs(e.target.value)}
                            placeholder="e.g. Sailing, fine dining, ancient ruins..."
                            className="bg-transparent border-none focus:outline-none w-full text-xs font-bold text-slate-800 h-24 resize-none pt-0.5 placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleBuildItinerary}
                      disabled={!itinDestination || !itinStart || !itinEnd || isTyping}
                      className="w-full h-13 bg-secondary text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-secondary/15 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      {isTyping ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Generating...
                        </>
                      ) : 'Craft Masterpiece'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input Footer */}
            {view === 'chat' && (
              <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                <div className="flex gap-2.5 bg-slate-50 p-2 rounded-2xl border border-slate-150 focus-within:border-secondary/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-secondary/5 transition-all">
                  <input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your bespoke request..."
                    className="flex-1 bg-transparent px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none placeholder:text-slate-400"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!message.trim() || isTyping}
                    className="w-11 h-11 bg-secondary text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 shrink-0 border border-white/5"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
