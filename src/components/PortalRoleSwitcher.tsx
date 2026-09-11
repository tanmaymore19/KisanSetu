import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { UserRole } from '../types.js';
import { Sprout, ShoppingBag, ShieldCheck, ChevronDown, Check, ArrowRight } from 'lucide-react';

interface PortalRoleSwitcherProps {
  currentRole: UserRole;
  compact?: boolean;
}

export const PortalRoleSwitcher: React.FC<PortalRoleSwitcherProps> = ({ currentRole, compact = false }) => {
  const { switchRole, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const roles: {
    id: UserRole;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: 'consumer',
      label: 'Consumer App & Hub',
      subtitle: 'Shop produce, track orders, fund plots',
      icon: <ShoppingBag className="w-4 h-4 text-emerald-600" />,
      color: 'border-emerald-500 bg-emerald-50',
    },
    {
      id: 'farmer',
      label: 'Farmer Dashboard',
      subtitle: 'Produce inventory, plots & visit slots',
      icon: <Sprout className="w-4 h-4 text-[#5D7A4F]" />,
      color: 'border-[#5D7A4F] bg-[#EBF1E8]',
    },
    {
      id: 'admin',
      label: 'Master Admin Oversight',
      subtitle: 'System sync, vault, logs & oversight',
      icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
      color: 'border-amber-500 bg-[#1A331E] text-white',
    },
  ];

  // Hide Master Admin option from regular users (secret login only)
  const displayedRoles = currentRole === 'admin'
    ? roles
    : roles.filter((r) => r.id !== 'admin');

  const currentRoleObj = displayedRoles.find((r) => r.id === currentRole) || displayedRoles[0];

  const handleSelectRole = async (targetRole: UserRole) => {
    setIsOpen(false);
    if (targetRole === currentRole) return;
    await switchRole(targetRole, true);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={isLoading}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#F1EDE4] hover:bg-[#E5E0D5] text-[#2D3A26] border border-[#D4CDBC] text-xs font-bold transition-all shadow-2xs"
        title="Switch between Consumer, Farmer, and Admin Dashboards"
      >
        <span className="shrink-0">{currentRoleObj.icon}</span>
        <span className="hidden sm:inline font-serif">{currentRoleObj.label}</span>
        <span className="sm:hidden font-serif">
          {currentRole === 'consumer' ? 'Consumer' : currentRole === 'farmer' ? 'Farmer' : 'Admin'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#5D6D56] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-white border border-[#E5E0D5] shadow-xl z-50 p-2 space-y-1 animate-fadeIn">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8C9886] border-b border-[#E5E0D5]">
              Instant Dashboard Switcher
            </div>
            {displayedRoles.map((r) => {
              const isSelected = r.id === currentRole;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRole(r.id)}
                  className={`w-full p-2 rounded-xl text-left flex items-start gap-2.5 transition-all text-xs ${
                    isSelected
                      ? 'bg-[#EBF1E8] border border-[#D4CDBC]'
                      : 'hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="p-1 rounded-lg bg-white border border-[#E5E0D5] shrink-0 mt-0.5">
                    {r.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2D3A26]">{r.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#5D7A4F] shrink-0" />}
                    </div>
                    <p className="text-[10px] text-[#5D6D56] truncate leading-tight">
                      {r.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
