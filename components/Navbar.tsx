'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  Layers, 
  CalendarCheck, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Menu, 
  X,
  PlusCircle,
  Cpu,
  RotateCcw,
  LogIn,
  ShieldAlert,
  User
} from 'lucide-react';
import { Profile, UserRole } from '@/lib/types';

interface NavbarProps {
  currentProfile: Profile;
  profiles: Profile[];
  weeklyHours: number;
  onSwitchProfile: (profileId: string) => void;
  onOpenCreateResource?: () => void;
  onOpenArchitecture?: () => void;
  onResetDemoData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProfile,
  profiles,
  weeklyHours,
  onSwitchProfile,
  onOpenCreateResource,
  onOpenArchitecture,
  onResetDemoData,
}) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Explore Resources', icon: Layers },
    { href: '/bookings', label: 'Bookings & Reviews', icon: CalendarCheck },
    { href: '/incidents', label: 'Incident Desk', icon: AlertTriangle },
    { href: '/audit', label: 'Audit Trail', icon: ShieldCheck },
  ];

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'owner':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'user':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    }
  };

  const isUser2 = currentProfile.email === 'user2@demo.com';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur shadow-xs dark:border-zinc-800 dark:bg-zinc-900/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                  CampusShare
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Trusted
                  </span>
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                  Shared Labs, Equipment & Spaces
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Status, Role Switcher & Action */}
          <div className="hidden lg:flex items-center gap-2.5">
            
            {/* Architecture Specs Button */}
            {onOpenArchitecture && (
              <button
                onClick={onOpenArchitecture}
                title="View Server Architecture & Governance Rules"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Cpu className="h-4 w-4" />
                <span>Architecture</span>
              </button>
            )}

            {/* Weekly Cap Indicator */}
            <div 
              title={`Weekly quota: ${weeklyHours.toFixed(1)}h booked out of ${currentProfile.weekly_hours_cap}h allowed`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
            >
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>
                Quota: <strong>{weeklyHours.toFixed(1)}h</strong> / {currentProfile.weekly_hours_cap}h
              </span>
            </div>

            {/* List Resource Button (for owner/manager/admin) */}
            {['owner', 'manager', 'admin'].includes(currentProfile.role) && onOpenCreateResource && (
              <button
                onClick={onOpenCreateResource}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>List Resource</span>
              </button>
            )}

            {/* Login Link */}
            <Link
              href="/login"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Auth Desk</span>
            </Link>

            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg border transition-colors cursor-pointer text-left ${
                  isUser2
                    ? 'border-red-400 bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800'
                    : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100'
                }`}
              >
                <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                  {currentProfile.full_name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-semibold leading-tight flex items-center gap-1">
                    <span className="truncate max-w-[120px]">{currentProfile.full_name}</span>
                    {isUser2 && <ShieldAlert className="h-3.5 w-3.5 text-red-600 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-1 rounded border ${getRoleBadgeColor(currentProfile.role)}`}>
                      {currentProfile.role}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {currentProfile.email}
                    </span>
                  </div>
                </div>
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 p-2 z-50">
                  <div className="px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Switch Test Persona (Real Supabase Auth)</span>
                    {onResetDemoData && (
                      <button
                        onClick={() => {
                          onResetDemoData();
                          setRoleDropdownOpen(false);
                        }}
                        title="Reset sample fixtures"
                        className="text-[10px] text-zinc-500 hover:text-indigo-600 flex items-center gap-1 lowercase"
                      >
                        <RotateCcw className="h-3 w-3" /> reset
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 mt-1">
                    {profiles.map((p) => {
                      const isUncertified = p.email === 'user2@demo.com';
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSwitchProfile(p.email || p.id);
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            p.email === currentProfile.email
                              ? 'bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950/60 dark:text-indigo-200'
                              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <div>
                            <div className="font-semibold flex items-center gap-1">
                              <span>{p.full_name}</span>
                              {isUncertified && (
                                <span className="text-[9px] px-1 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold">
                                  No Certs
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">{p.email}</div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getRoleBadgeColor(p.role)}`}>
                            {p.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Link
                      href="/login"
                      onClick={() => setRoleDropdownOpen(false)}
                      className="block text-center py-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      Open Full Supabase Login Desk &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-200 bg-white px-4 pt-2 pb-4 dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600"
            >
              <LogIn className="h-5 w-5" />
              <span>Supabase Auth Desk</span>
            </Link>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-xs font-medium text-zinc-500 mb-2">
              Active Persona: <strong>{currentProfile.full_name}</strong> ({currentProfile.email})
            </div>
            <div className="grid grid-cols-2 gap-2">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSwitchProfile(p.email || p.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded border text-left text-xs ${
                    p.email === currentProfile.email
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <div className="truncate">{p.full_name}</div>
                  <div className="text-[10px] text-zinc-400 uppercase">{p.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
