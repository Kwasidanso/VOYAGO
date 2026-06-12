import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Instagram } from 'lucide-react';
import { LegalModal } from './LegalModal';

export const Footer: React.FC = () => {
  const [legalType, setLegalType] = useState<'privacy' | 'terms' | 'safety' | null>(null);

  const openLegal = (e: React.MouseEvent, type: 'privacy' | 'terms' | 'safety') => {
    e.preventDefault();
    setLegalType(type);
  };

  return (
    <footer className="w-full py-12 bg-slate-50 border-t border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-12 max-w-7xl mx-auto">
        <div className="space-y-4">
          <Link to="/" className="text-xl font-bold text-secondary font-headline">Voyago</Link>
          <p className="text-slate-500 font-body text-sm leading-relaxed">
            Crafting extraordinary journeys for the modern explorer. Your gateway to the world's most exclusive destinations.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-secondary font-headline text-sm mb-4">Company</h4>
          <div className="flex flex-col gap-3">
            <Link className="text-slate-500 hover:text-secondary transition-opacity font-body text-sm" to="/concierge">Concierge</Link>
            <Link className="text-slate-500 hover:text-secondary transition-opacity font-body text-sm" to="/dashboard">Dashboard</Link>
            <Link className="text-slate-500 hover:text-secondary transition-opacity font-body text-sm" to="/profile">My Profile</Link>
          </div>
        </div>
        <div>
          <h4 className="font-bold text-secondary font-headline text-sm mb-4">Support</h4>
          <div className="flex flex-col gap-3">
            <a className="text-slate-500 hover:text-secondary transition-opacity font-body text-sm" href="#">Help Center</a>
            <button 
              onClick={(e) => openLegal(e, 'safety')}
              className="text-left text-slate-500 hover:text-secondary transition-opacity font-body text-sm"
            >
              Safety Information
            </button>
          </div>
        </div>
        <div>
          <h4 className="font-bold text-secondary font-headline text-sm mb-4">Legal</h4>
          <div className="flex flex-col gap-3">
            <button 
              onClick={(e) => openLegal(e, 'privacy')}
              className="text-left text-slate-500 hover:text-secondary transition-opacity font-body text-sm"
            >
              Privacy Policy
            </button>
            <button 
              onClick={(e) => openLegal(e, 'terms')}
              className="text-left text-slate-500 hover:text-secondary transition-opacity font-body text-sm"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-12 mt-12 pt-8 border-t border-slate-200 flex justify-between items-center">
        <p className="text-slate-500 font-body text-sm">© 2026 Voyago Travel. All rights reserved.</p>
        <div className="flex gap-6 text-slate-400">
          <a href="#" className="hover:text-secondary"><Twitter size={20} /></a>
          <a href="#" className="hover:text-secondary"><Instagram size={20} /></a>
          <a href="#" className="hover:text-secondary"><Github size={20} /></a>
        </div>
      </div>

      <LegalModal 
        isOpen={legalType !== null} 
        onClose={() => setLegalType(null)} 
        type={legalType} 
      />
    </footer>
  );
};
