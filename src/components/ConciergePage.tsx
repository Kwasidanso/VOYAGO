import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, Shield, Zap, Phone, Mail, Globe, Award, Briefcase, Users, LayoutGrid, List, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConciergeCompany {
  id: number;
  name: string;
  logo: string;
  description: string;
  location: string;
  rating: number;
  reviews: number;
  specialties: string[];
  features: string[];
  contact: {
    phone: string;
    email: string;
    website: string;
  };
  verified: boolean;
}

const CONCIERGE_COMPANIES: ConciergeCompany[] = [
  {
    id: 1,
    name: 'Elite Global Services',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=EGS&backgroundColor=023047',
    description: 'Providing bespoke travel management and personal assistance for high-net-worth individuals worldwide. From private aviation to exclusive event access.',
    location: 'London, UK',
    rating: 4.9,
    reviews: 1240,
    specialties: ['Private Aviation', 'Exclusive Events', 'Luxury Lifestyle'],
    features: ['24/7 Availability', 'Global Network', 'Dedicated Manager'],
    contact: {
      phone: '+44 20 7123 4567',
      email: 'priority@eliteglobal.com',
      website: 'www.eliteglobal.com'
    },
    verified: true
  },
  {
    id: 2,
    name: 'Azure Personal Assistants',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=APA&backgroundColor=219ebc',
    description: 'Boutique concierge firm specializing in luxury travel, restaurant reservations, and personal shopping in the world\'s most vibrant cities.',
    location: 'Paris, France',
    rating: 4.8,
    reviews: 850,
    specialties: ['Fine Dining', 'Personal Shopping', 'Boutique Travel'],
    features: ['Multilingual Staff', 'Local Experts', 'Rapid Response'],
    contact: {
      phone: '+33 1 45 67 89 00',
      email: 'hello@azureconcierge.fr',
      website: 'www.azureconcierge.fr'
    },
    verified: true
  },
  {
    id: 3,
    name: 'Vertex Lifestyle Management',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=VLM&backgroundColor=fb8500',
    description: 'Your premier partner for luxury lifestyle in New York and beyond. We handle the details so you can focus on the experience.',
    location: 'New York, USA',
    rating: 4.7,
    reviews: 2100,
    specialties: ['Corporate Travel', 'Real Estate', 'Yacht Charters'],
    features: ['Corporate Solutions', 'Event Planning', 'Secure Logistics'],
    contact: {
      phone: '+1 212 555 0198',
      email: 'concierge@vertexlifestyle.com',
      website: 'www.vertexlifestyle.com'
    },
    verified: true
  },
  {
    id: 4,
    name: 'Zenith Travel & Concierge',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=ZTC&backgroundColor=8ecae6',
    description: 'Specializing in exotic destination management and luxury adventure travel. We turn your wildest travel dreams into reality.',
    location: 'Dubai, UAE',
    rating: 5.0,
    reviews: 420,
    specialties: ['Exotic Travel', 'Adventure Luxury', 'Private Tours'],
    features: ['Custom Itineraries', 'On-ground Support', 'Unique Experiences'],
    contact: {
      phone: '+971 4 123 4567',
      email: 'info@zenithconcierge.ae',
      website: 'www.zenithconcierge.ae'
    },
    verified: true
  }
];

export const ConciergePage: React.FC = () => {
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [showRequirements, setShowRequirements] = React.useState(false);

  return (
    <div className="min-h-screen pt-32 pb-20 px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="h-px w-8 bg-secondary"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Registered Partners</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-headline font-black text-on-surface tracking-tighter uppercase mb-6"
            >
              Voyago <span className="text-secondary">Concierge</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-on-surface-variant font-medium text-lg leading-relaxed"
            >
              Connect with our network of world-class concierge companies. From luxury lifestyle management to specialized travel assistance, our partners provide the extraordinary service you deserve.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm"
          >
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-3 rounded-xl transition-all",
                viewMode === 'grid' ? "bg-secondary text-white shadow-lg" : "text-slate-400 hover:text-on-surface"
              )}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-3 rounded-xl transition-all",
                viewMode === 'list' ? "bg-secondary text-white shadow-lg" : "text-slate-400 hover:text-on-surface"
              )}
            >
              <List size={20} />
            </button>
          </motion.div>
        </div>

        <div className={cn(
          "grid gap-8",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2" : "grid-cols-1"
        )}>
          {CONCIERGE_COMPANIES.map((company, index) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "group bg-white rounded-[2.5rem] border border-slate-100 hover:border-secondary/20 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-2xl flex flex-col",
                viewMode === 'list' && "md:flex-row md:items-center"
              )}
            >
              <div className={cn(
                "relative bg-slate-50 p-10 flex items-center justify-center shrink-0 overflow-hidden",
                viewMode === 'list' ? "md:w-72 md:h-full" : "h-64"
              )}>
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent"></div>
                <img 
                  src={company.logo} 
                  alt={company.name} 
                  className={cn(
                    "relative z-10 w-32 h-32 rounded-3xl object-cover shadow-xl group-hover:scale-110 transition-transform duration-500",
                    viewMode === 'list' ? "w-24 h-24" : "w-32 h-32"
                  )}
                />
                {company.verified && (
                  <div className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm border border-slate-100">
                    <Shield size={18} className="text-secondary" />
                  </div>
                )}
              </div>

              <div className="flex-1 p-10 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={12} className="text-secondary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{company.location}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tight group-hover:text-secondary transition-colors">{company.name}</h3>
                      {company.verified && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/10 border border-secondary/20 rounded-full shrink-0">
                          <Shield size={10} className="text-secondary fill-secondary" />
                          <span className="text-[8px] font-black uppercase tracking-tighter text-secondary">Verified Partner</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black text-on-surface">{company.rating}</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200"></div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{company.reviews} Reviews</span>
                  </div>
                </div>

                <p className="text-on-surface-variant text-sm leading-relaxed font-medium line-clamp-2 italic">
                  "{company.description}"
                </p>

                <div className="flex flex-wrap gap-2">
                  {company.specialties.map((spec, i) => (
                    <span key={i} className="px-3 py-1 bg-secondary/5 text-secondary text-[9px] font-black uppercase tracking-widest rounded-lg border border-secondary/10 group-hover:bg-secondary group-hover:text-white transition-colors">
                      {spec}
                    </span>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-50 grid grid-cols-2 md:grid-cols-3 gap-6">
                  {company.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-green-50 flex items-center justify-center">
                        <Star size={10} className="text-green-600 fill-green-600" />
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-6 flex flex-col sm:flex-row gap-4">
                  <a 
                    href={`tel:${company.contact.phone.replace(/ /g, '')}`}
                    className="flex-1 h-14 bg-on-surface text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest hover:bg-secondary active:scale-[0.98] transition-all shadow-xl shadow-on-surface/10"
                  >
                    <Phone size={16} /> Contact Agent
                  </a>
                  <button className="flex items-center justify-center w-14 h-14 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-secondary hover:border-secondary active:scale-[0.95] transition-all group/btn">
                    <Mail size={20} className="group-hover/btn:scale-110 transition-transform" />
                  </button>
                  <a 
                    href={`https://${company.contact.website}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center w-14 h-14 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-secondary hover:border-secondary active:scale-[0.95] transition-all group/btn"
                  >
                    <Globe size={20} className="group-hover/btn:scale-110 transition-transform" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 p-12 bg-secondary rounded-[3rem] text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10 scale-150 rotate-12">
            <Award size={200} />
          </div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl font-headline font-black uppercase tracking-tight mb-6">Become a Concierge Partner</h2>
            <p className="text-white/80 font-medium text-lg leading-relaxed mb-10">
              Are you a world-class service provider? Join our elite network of concierge partners and connect with discerning travelers across the globe.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="h-14 px-8 bg-white text-secondary rounded-2xl flex items-center gap-3 font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl">
                <Briefcase size={18} /> Apply for Partnership
              </button>
              <button 
                onClick={() => setShowRequirements(true)}
                className="h-14 px-8 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl flex items-center gap-3 font-bold text-xs uppercase tracking-widest hover:bg-white/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Users size={18} /> View Requirements
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showRequirements && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRequirements(false)}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-3xl p-12 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 text-secondary pointer-events-none">
                <Shield size={200} />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-8 bg-secondary"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Elite Standards</span>
                </div>
                
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-headline font-black text-on-surface uppercase tracking-tight">Partnership Requirements</h2>
                  <button 
                    onClick={() => setShowRequirements(false)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-6 mb-10">
                  {[
                    { icon: Award, title: "Industry Experience", desc: "Minimum of 5 years in high-end lifestyle management or luxury travel services." },
                    { icon: Globe, title: "Global Footprint", desc: "Proven capability to execute world-class services across multiple continents." },
                    { icon: Shield, title: "Verified Credentials", desc: "Proper licensing, insurance, and professional certifications in your jurisdiction." },
                    { icon: Zap, title: "Rapid Response", desc: "Ability to provide 24/7 dedicated support with a maximum 15-minute initial response time." },
                    { icon: Users, title: "Resource Network", desc: "Direct access to exclusive event inventories, private aviation, and luxury accommodation." }
                  ].map((req, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:border-secondary transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-secondary group-hover:scale-110 transition-transform">
                        <req.icon size={20} />
                      </div>
                      <div>
                        <h4 className="font-headline font-bold text-sm text-on-surface mb-1 uppercase tracking-tight">{req.title}</h4>
                        <p className="text-xs text-on-surface-variant font-medium leading-relaxed">{req.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => setShowRequirements(false)}
                  className="w-full h-14 bg-on-surface text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest hover:bg-secondary active:scale-[0.98] transition-all shadow-xl shadow-on-surface/10"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

