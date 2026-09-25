import { useState, useEffect } from 'react';
import { Phone, Mail, MessageCircle, Clock } from 'lucide-react';
import { BusinessSettingsService } from '../services/dataService';
import type { BusinessSettings } from '../services/dataService';

interface FooterProps {
  onContactClick: () => void;
}

const DEFAULT_BIZ: BusinessSettings = {
  name: 'Prayer is the key ventures',
  email: 'danquahbertram26@gmail.com',
  phone: '0596215537',
  tagline: 'Your trusted source for quality phone accessories.',
  monFriHours: '8:00 AM – 6:00 PM',
  satHours: '9:00 AM – 4:00 PM',
  sunHours: 'Closed',

  homepageTitle: 'Welcome to Prayer Is The Key Ventures',
  homepageSubtitle: 'Quality phone accessories delivered to your door.',
  homepageButtonText: 'Shop Now',
  homepageAboutTitle: 'About Us',
  homepageAboutText: 'Your trusted source for quality phone accessories.',

  homepageFeatures: [],

  footerCopyright: '© 2026 Prayer Is The Key Ventures. All rights reserved.',
  footerDescription: 'Quality phone accessories delivered to your door.',
};

export default function Footer({ onContactClick }: FooterProps) {
const [biz, setBiz] = useState<BusinessSettings | null>(null);
const [loading, setLoading] = useState(true);





useEffect(() => {
  let mounted = true;

  BusinessSettingsService.get()
    .then(settings => {
      if (!mounted) return;
      setBiz(settings);
    })
    .catch(error => {
      console.error('Failed to load footer settings:', error);
    })
    .finally(() => {
      if (mounted) {
        setLoading(false);
      }
    });

  return () => {
    mounted = false;
  };
}, []);


if (loading) {
  return null;
}

if (!biz) {
  return null;
}


  return (
    <footer className="bg-blue-950 text-blue-100 mt-auto">
      <div className="container mx-auto px-4 py-12">

        {/* Footer columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

         {/* Brand */}
<div className="space-y-4">
  <div className="flex items-center gap-2.5">
    {biz.logoUrl ? (
      <img
        src={biz.logoUrl}
        alt={`${biz.name} logo`}
        className="w-9 h-9 rounded-lg object-contain bg-white shadow-md shrink-0"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ) : (
      <div className="w-9 h-9 bg-red-700 rounded-lg flex items-center justify-center shrink-0">
        <span className="text-white text-sm font-bold">
          {biz.logoText || 'PK'}
        </span>
      </div>
    )}

    <h3 className="text-white font-bold text-lg leading-tight">
      {biz.name}
    </h3>
  </div>

  <p className="text-sm text-blue-300 leading-relaxed">
    {biz.tagline}
  </p>
</div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-base border-b border-blue-800 pb-2">
              Contact Us
            </h3>

            <div className="space-y-3">

              <a
                href={`mailto:${biz.email}`}
                className="flex items-center gap-3 text-sm text-blue-300 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-red-700 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>

                <span>{biz.email}</span>
              </a>

              <a
                href={`tel:${biz.phone}`}
                className="flex items-center gap-3 text-sm text-blue-300 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-red-700 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>

                <span>{biz.phone}</span>
              </a>

              <button
                type="button"
                onClick={onContactClick}
                className="flex items-center gap-3 text-sm text-red-400 hover:text-red-300 transition-colors group"
              >
                <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-red-700 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </div>

                <span>Send us a message</span>
              </button>

            </div>
          </div>

          {/* Business Hours */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-base border-b border-blue-800 pb-2">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                Business Hours
              </span>
            </h3>

            <div className="text-sm text-blue-300 space-y-2">

              <div className="flex justify-between gap-4">
                <span>Mon – Fri</span>
                <span className="text-white text-right">
                  {biz.monFriHours}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Saturday</span>
                <span className="text-white text-right">
                  {biz.satHours}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Sunday</span>
                <span className="text-blue-400 text-right">
                  {biz.sunHours}
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Bottom footer */}
        <div className="border-t border-blue-900 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-blue-400">

          <span>
            {biz.footerCopyright}
          </span>

          <span>
            {biz.footerDescription}
          </span>

        </div>

      </div>
    </footer>
  );
}