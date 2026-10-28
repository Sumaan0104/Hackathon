'use client';

import React from 'react';
import { Resource, UserRole } from '@/lib/types';
import { 
  FlaskConical, 
  Camera, 
  Box, 
  MapPin, 
  Users, 
  ShieldCheck, 
  CalendarPlus, 
  ListOrdered,
  Sparkles
} from 'lucide-react';

interface ResourceCardProps {
  resource: Resource;
  currentRole: UserRole;
  onRequestBooking: (resource: Resource) => void;
  onViewWaitlist: (resource: Resource) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  currentRole,
  onRequestBooking,
  onViewWaitlist,
}) => {
  const getTypeBadge = (type: Resource['type']) => {
    switch (type) {
      case 'lab':
        return {
          label: 'Lab Facility',
          icon: FlaskConical,
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        };
      case 'equipment':
        return {
          label: 'Equipment Gear',
          icon: Camera,
          classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        };
      case 'space':
      default:
        return {
          label: 'Makerspace / Area',
          icon: Box,
          classes: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
        };
    }
  };

  const badge = getTypeBadge(resource.type);
  const TypeIcon = badge.icon;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-900 group">
      <div>
        {/* Top Header: Badge & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.classes}`}>
            <TypeIcon className="h-3.5 w-3.5" />
            {badge.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Active on Campus
          </span>
        </div>

        {/* Resource Name */}
        <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
          {resource.name}
        </h3>

        {/* Location & Capacity */}
        <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="truncate max-w-[200px]">{resource.location}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span>Cap: {resource.capacity} person{resource.capacity > 1 ? 's' : ''}</span>
          </span>
        </div>

        {/* Description */}
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-2">
          {resource.description}
        </p>

        {/* Eligibility Requirements Box */}
        <div className="mt-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
            <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Eligibility Checklist</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
            {resource.eligibility_requirements || 'Open to all enrolled students with campus ID verification.'}
          </p>
        </div>

        {/* Owner Info */}
        <div className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
          Managed by: <strong className="text-zinc-700 dark:text-zinc-300">{resource.owner_name}</strong>
          {resource.owner_department && ` (${resource.owner_department})`}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <button
          onClick={() => onRequestBooking(resource)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <CalendarPlus className="h-4 w-4" />
          <span>Request Booking</span>
        </button>

        <button
          onClick={() => onViewWaitlist(resource)}
          title="View Waitlist Queue (Ordered by least recent use)"
          className="flex items-center justify-center gap-1 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
        >
          <ListOrdered className="h-4 w-4" />
          <span className="hidden sm:inline">Waitlist</span>
        </button>
      </div>
    </div>
  );
};
