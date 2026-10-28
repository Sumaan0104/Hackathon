'use client';

import React, { useState } from 'react';
import { useCampusShare } from '@/components/CampusShareProvider';
import { ResourceCard } from '@/components/ResourceCard';
import { ResourceType } from '@/lib/types';
import { 
  Search, 
  FlaskConical, 
  Camera, 
  Box, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Info,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Database,
  Building,
  Scale,
  Users
} from 'lucide-react';

export default function HomePage() {
  const { 
    currentProfile, 
    resources, 
    bookings,
    auditLogs,
    weeklyHours, 
    openBookingModal, 
    openWaitlistModal,
    openArchitectureModal
  } = useCampusShare();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Extract unique departments
  const departments = ['all', ...Array.from(new Set(resources.map((r) => r.owner_department).filter(Boolean))) as string[]];

  const filteredResources = resources.filter((res) => {
    const matchesType = selectedType === 'all' || res.type === selectedType;
    const matchesDept = selectedDepartment === 'all' || res.owner_department === selectedDepartment;
    const matchesSearch =
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.eligibility_requirements.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.specs && res.specs.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesType && matchesDept && matchesSearch;
  });

  const totalCapacity = resources.reduce((acc, r) => acc + (r.capacity || 1), 0);
  const activeBookingsCount = bookings.filter((b) => ['approved', 'checked_in'].includes(b.status)).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Hero & Governance Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-950 via-zinc-900 to-indigo-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>Collegiate Academic Resource Network</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Fair & Transparent Sharing for High-End Campus Facilities
          </h1>

          <p className="text-sm sm:text-base text-indigo-200/90 leading-relaxed">
            Eliminate equipment underutilization. Reserve specialized spectroscopy benches, cinema packages, and cleanrooms with strict 6h weekly quotas, fair-access waitlists, and mandatory written justifications.
          </p>

          {/* Quick Metrics Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <div className="rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/15 flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-indigo-300" />
              <div>
                <span className="text-indigo-200 block text-[10px]">Your Weekly Quota:</span>
                <span className="font-bold">
                  {weeklyHours.toFixed(1)} / {currentProfile.weekly_hours_cap} hrs booked
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/15 flex items-center gap-2.5">
              <Building className="h-4 w-4 text-emerald-300" />
              <div>
                <span className="text-indigo-200 block text-[10px]">Active Persona:</span>
                <span className="font-bold uppercase tracking-wider text-emerald-300">
                  {currentProfile.full_name} ({currentProfile.role})
                </span>
              </div>
            </div>

            <button
              onClick={openArchitectureModal}
              className="rounded-xl bg-indigo-600/60 hover:bg-indigo-600 backdrop-blur-md px-3 py-2 border border-indigo-400/40 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Architecture Blueprint</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="text-xs text-zinc-500 flex items-center justify-between">
            <span>Cataloged Facilities</span>
            <FlaskConical className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            {resources.length}
          </div>
          <div className="text-[11px] text-zinc-400">
            Across Labs, Gear & Spaces
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="text-xs text-zinc-500 flex items-center justify-between">
            <span>Concurrent Sessions</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            {activeBookingsCount}
          </div>
          <div className="text-[11px] text-zinc-400">
            Total capacity: {totalCapacity} students
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="text-xs text-zinc-500 flex items-center justify-between">
            <span>Fair-Access Policy</span>
            <Scale className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            LRU Queue
          </div>
          <div className="text-[11px] text-zinc-400">
            Least recent use priority
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="text-xs text-zinc-500 flex items-center justify-between">
            <span>Audit Trail Entries</span>
            <Database className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            {auditLogs.length}
          </div>
          <div className="text-[11px] text-zinc-400">
            100% immutable action logs
          </div>
        </div>
      </div>

      {/* 9-Step Governance Lifecycle Banner */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center justify-between">
          <span>End-to-End Governance Lifecycle</span>
          <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">All role checks verified on server</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <span className="font-bold text-zinc-900 dark:text-white block">1. List & Discover</span>
            <span className="text-zinc-500 text-[10px]">Owners list specs; users check eligibility.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <span className="font-bold text-zinc-900 dark:text-white block">2. Cap & Clash</span>
            <span className="text-zinc-500 text-[10px]">6h weekly limit & schedule clash checks.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <span className="font-bold text-zinc-900 dark:text-white block">3. Written Reason</span>
            <span className="text-zinc-500 text-[10px]">Approve/reject/waitlist needs reason.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <span className="font-bold text-zinc-900 dark:text-white block">4. Fair Waitlist</span>
            <span className="text-zinc-500 text-[10px]">Ordered by least recent use.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <span className="font-bold text-zinc-900 dark:text-white block">5. Condition Notes</span>
            <span className="text-zinc-500 text-[10px]">Check-in and return inspection logs.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <span className="font-bold text-zinc-900 dark:text-white block">6. Audit Trail</span>
            <span className="text-zinc-500 text-[10px]">No auto penalties; full history visible.</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Resources', icon: Info },
              { id: 'lab', label: 'Labs', icon: FlaskConical },
              { id: 'equipment', label: 'Equipment', icon: Camera },
              { id: 'space', label: 'Makerspaces', icon: Box },
            ].map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedType === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedType(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px] sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by gear, specs, laser..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Department Sub-filter */}
        {departments.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs text-zinc-500 pt-1">
            <span className="font-semibold text-zinc-400 shrink-0">Department:</span>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer capitalize ${
                  selectedDepartment === dept
                    ? 'bg-indigo-100 text-indigo-900 font-semibold dark:bg-indigo-950 dark:text-indigo-200'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {dept === 'all' ? 'All Departments' : dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resource Grid */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-8">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No campus resources found matching your filters.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Try resetting your search query or selecting &quot;All Resources&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => (
            <ResourceCard
              key={res.id}
              resource={res}
              currentRole={currentProfile.role}
              onRequestBooking={openBookingModal}
              onViewWaitlist={openWaitlistModal}
            />
          ))}
        </div>
      )}

    </div>
  );
}
