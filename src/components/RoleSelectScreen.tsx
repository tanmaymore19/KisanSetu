import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { UserRole } from '../types.js';
import { api } from '../lib/api.js';
import { Sprout, ShoppingBag, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Heart, AlertCircle } from 'lucide-react';

interface RoleSelectScreenProps {
  onSelectRole?: (role: UserRole) => void;
}

export const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({ onSelectRole }) => {
  const { setSelectedRoleForAuth, quickDemoLogin, isLoading } = useAuth();
  const [demoError, setDemoError] = useState<string | null>(null);
  const [loggingInUser, setLoggingInUser] = useState<string | null>(null);

  // Hero Banner image (2nd image: Indian farmer & child with harvest basket)
  const [bannerImage, setBannerImage] = useState<string>(() => {
    return localStorage.getItem('kisansetu_hero_banner') || '/WhatsApp Image 2026-09-09 at 10.03.35 PM.jpeg';
  });

  useEffect(() => {
    api.getAppBanner()
      .then((saved) => {
        if (saved) {
          setBannerImage(saved);
          localStorage.setItem('kisansetu_hero_banner', saved);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRoleForAuth(role);
    if (onSelectRole) {
      onSelectRole(role);
    }
  };

  const handleQuickDemo = async (
    username: 'rajesh_farmer' | 'anita_orchards' | 'tanmay123' | 'admin_master'
  ) => {
    setDemoError(null);
    setLoggingInUser(username);
    try {
      await quickDemoLogin(username);
    } catch (err: any) {
      setDemoError(err.message || 'Demo login failed.');
    } finally {
      setLoggingInUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-between p-4 sm:p-6 font-sans antialiased text-[#2D3A26]">
      {/* Top Banner Graphic & App Header */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center pt-2">
        {/* Farm & Harvest Graphic */}
        <div className="relative w-full h-48 sm:h-56 rounded-3xl overflow-hidden shadow-md border-2 border-[#E5E0D5] mb-4 bg-[#2D3A26]">
          <img
            src={bannerImage}
            alt="Indian farmer and child with fresh vegetable harvest basket"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              // Fallback to organic harvest basket if local file isn't found yet
              if (!target.src.includes('photo-1542838132-92c53300491e')) {
                target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80';
              }
            }}
            className="w-full h-full object-cover brightness-95"
          />

          {/* Gradient text overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-black/30 flex flex-col justify-end p-4 text-white pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#5D7A4F] text-white text-xs font-semibold tracking-wide flex items-center gap-1 shadow-xs">
                <Sprout className="w-3.5 h-3.5" /> Direct From Earth
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D97706] text-white text-xs font-semibold tracking-wide shadow-xs">
                100% Traceable
              </span>
            </div>
            <p className="text-sm font-medium text-[#FAF8F5] drop-shadow-sm">
              Connecting rural growers directly with city dining tables.
            </p>
          </div>
        </div>

        {/* Logo & Title */}
        <div className="flex flex-col items-center text-center mb-5">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#2D3A26] font-serif">
            KisanSetu
          </h1>
          <div className="mt-1 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EBF1E8] border border-[#D4CDBC] text-[#5D7A4F] text-xs font-bold uppercase tracking-wider">
            Farm2Home Marketplace
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5D6D56] flex items-center gap-1.5 mt-1">
            <span>❧</span> Direct from local farms to your home <span>☙</span>
          </p>
        </div>

        {/* Heading */}
        <div className="text-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#2D3A26] font-serif flex items-center justify-center gap-2">
            <span className="text-[#5D7A4F]">❧</span> Choose Your Role <span className="text-[#5D7A4F]">☙</span>
          </h2>
        </div>

        {/* Role Cards - Farmer & Consumer */}
        <div className="w-full grid grid-cols-2 gap-3 sm:gap-4">
          {/* Farmer Role Card */}
          <div
            id="role-card-farmer"
            onClick={() => handleSelectRole('farmer')}
            className="group relative bg-[#FAF8F5] rounded-2xl p-3.5 sm:p-5 border-2 border-[#E5E0D5] shadow-xs hover:shadow-md hover:border-[#5D7A4F] transition-all cursor-pointer flex flex-col justify-between text-center items-center h-full"
          >
            <div className="w-full flex flex-col items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#EBF1E8] border border-[#D4CDBC] flex items-center justify-center text-[#5D7A4F] shrink-0 shadow-inner group-hover:scale-105 transition-transform mb-2 sm:mb-3">
                <Sprout className="w-7 h-7 sm:w-9 sm:h-9" />
              </div>
              <span className="inline-block text-[10px] sm:text-xs font-semibold text-[#5D7A4F] bg-[#EBF1E8] px-2 py-0.5 rounded-md mb-1.5 border border-[#D4CDBC]/60">
                For Producers
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3A26] font-serif">I'm a Farmer</h3>
              <p className="text-[11px] sm:text-xs text-[#5D6D56] mt-1 leading-relaxed">
                Sell fresh harvest, manage farm stock & host visits.
              </p>
            </div>
            <button
              id="continue-farmer-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectRole('farmer');
              }}
              className="w-full mt-3 sm:mt-4 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="hidden sm:inline">Continue as</span> Farmer <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Consumer Role Card */}
          <div
            id="role-card-consumer"
            onClick={() => handleSelectRole('consumer')}
            className="group relative bg-[#FAF8F5] rounded-2xl p-3.5 sm:p-5 border-2 border-[#E5E0D5] shadow-xs hover:shadow-md hover:border-[#8A9A5B] transition-all cursor-pointer flex flex-col justify-between text-center items-center h-full"
          >
            <div className="w-full flex flex-col items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#F1EDE4] border border-[#E5E0D5] flex items-center justify-center text-[#8A9A5B] shrink-0 shadow-inner group-hover:scale-105 transition-transform mb-2 sm:mb-3">
                <ShoppingBag className="w-7 h-7 sm:w-9 sm:h-9" />
              </div>
              <span className="inline-block text-[10px] sm:text-xs font-semibold text-[#2D3A26] bg-[#F1EDE4] px-2 py-0.5 rounded-md mb-1.5 border border-[#E5E0D5]">
                For Buyers
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3A26] font-serif">I'm a Consumer</h3>
              <p className="text-[11px] sm:text-xs text-[#5D6D56] mt-1 leading-relaxed">
                Buy crisp local produce directly & book farm tours.
              </p>
            </div>
            <button
              id="continue-consumer-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectRole('consumer');
              }}
              className="w-full mt-3 sm:mt-4 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#8A9A5B] hover:bg-[#78884d] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="hidden sm:inline">Continue as</span> Consumer <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Demo Previews */}
        <div className="w-full mt-5 p-3.5 bg-[#F1EDE4]/80 border border-[#E5E0D5] rounded-2xl">
          {demoError && (
            <div className="mb-2.5 p-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-700" />
              <span>{demoError}</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2D3A26] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#5D7A4F]" /> Instant 1-Click Demo Dashboards:
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              id="demo-farmer-rajesh"
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickDemo('rajesh_farmer')}
              className="p-2 rounded-xl bg-white border border-[#E5E0D5] text-left hover:border-[#5D7A4F] hover:bg-[#FAF8F5] transition-all text-xs flex flex-col shadow-2xs disabled:opacity-50"
            >
              <span className="font-bold text-[#2D3A26] flex items-center gap-1">
                🌾 Rajesh
              </span>
              <span className="text-[10px] text-[#5D6D56] truncate">
                {loggingInUser === 'rajesh_farmer' ? 'Loading...' : 'Farmer Dashboard'}
              </span>
            </button>
            <button
              id="demo-farmer-anita"
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickDemo('anita_orchards')}
              className="p-2 rounded-xl bg-white border border-[#E5E0D5] text-left hover:border-[#5D7A4F] hover:bg-[#FAF8F5] transition-all text-xs flex flex-col shadow-2xs disabled:opacity-50"
            >
              <span className="font-bold text-[#2D3A26] flex items-center gap-1">
                🍊 Anita
              </span>
              <span className="text-[10px] text-[#5D6D56] truncate">
                {loggingInUser === 'anita_orchards' ? 'Loading...' : 'Orchards Dashboard'}
              </span>
            </button>
            <button
              id="demo-consumer-tanmay"
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickDemo('tanmay123')}
              className="p-2 rounded-xl bg-white border border-[#E5E0D5] text-left hover:border-[#8A9A5B] hover:bg-[#FAF8F5] transition-all text-xs flex flex-col shadow-2xs disabled:opacity-50"
            >
              <span className="font-bold text-[#2D3A26] flex items-center gap-1">
                🛒 Tanmay
              </span>
              <span className="text-[10px] text-[#5D6D56] truncate">
                {loggingInUser === 'tanmay123' ? 'Loading...' : 'Consumer Dashboard'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Branding matching mockup */}
      <footer className="w-full max-w-xl mx-auto text-center pt-6 pb-2">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#2D3A26]">
          <Sprout className="w-3.5 h-3.5 text-[#5D7A4F]" />
          <span>Fresh. Healthy. Direct.</span>
        </div>
        <p className="text-[11px] text-[#5D6D56] mt-0.5 flex items-center justify-center gap-1">
          Support local farmers <Heart className="w-3 h-3 text-[#5D7A4F] fill-[#5D7A4F] inline" />
        </p>
      </footer>
    </div>
  );
};
