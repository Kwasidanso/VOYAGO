import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, FileText, Lock } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms' | 'safety' | null;
}

const CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    icon: Lock,
    sections: [
      {
        subtitle: 'Information Collection',
        text: 'We collect information you provide directly to us, such as when you create an account, book a trip, or contact support. This includes name, email, payment details, and travel preferences.'
      },
      {
        subtitle: 'How We Use Data',
        text: 'Your data is used to provide travel services, personalize your experience with our Digital Concierge, and ensure secure transactions through our platform.'
      },
      {
        subtitle: 'Data Protection',
        text: 'We employ industry-standard encryption and security measures to protect your personal information from unauthorized access or disclosure.'
      }
    ]
  },
  terms: {
    title: 'Terms of Service',
    icon: FileText,
    sections: [
      {
        subtitle: 'Booking Conditions',
        text: 'All bookings made through Voyago are subject to availability and the terms of the specific travel provider (airline, hotel, or cruise line).'
      },
      {
        subtitle: 'User Conduct',
        text: 'Users must provide accurate information and are responsible for maintaining the security of their account credentials.'
      },
      {
        subtitle: 'Cancellation Policy',
        text: 'Cancellations and refunds are governed by the specific policies associated with each booking type, which are displayed prior to confirmation.'
      }
    ]
  },
  safety: {
    title: 'Safety Information',
    icon: Shield,
    sections: [
      {
        subtitle: 'Verified Partners',
        text: 'We only partner with travel providers who meet ನಮ್ಮ high standards for safety, reliability, and service quality.'
      },
      {
        subtitle: 'Crisis Support',
        text: 'Our 24/7 Digital Concierge and support team are available to assist with any emergencies or unexpected changes during your travels.'
      },
      {
        subtitle: 'Health & Well-being',
        text: 'We provide up-to-date travel advisories and health recommendations for all destinations listed on our platform.'
      }
    ]
  }
};

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  if (!type) return null;
  const content = CONTENT[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-3xl p-10 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <content.icon size={24} />
                </div>
                <h2 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tight">
                  {content.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8 mb-10 max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide">
              {content.sections.map((section, i) => (
                <div key={i} className="space-y-3">
                  <h4 className="font-headline font-bold text-sm text-on-surface uppercase tracking-wider">
                    {section.subtitle}
                  </h4>
                  <p className="text-sm text-on-surface-variant leading-relaxed font-body">
                    {section.text}
                  </p>
                </div>
              ))}
              <div className="pt-8 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                  Last updated: May 2026. This is a summary of our full legal documentation. For the complete version, please contact our legal team at legal@voyago.travel.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 bg-on-surface text-white rounded-2xl font-headline font-bold text-xs uppercase tracking-widest hover:bg-secondary active:scale-[0.98] transition-all shadow-xl shadow-on-surface/10"
            >
              I Understand
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
