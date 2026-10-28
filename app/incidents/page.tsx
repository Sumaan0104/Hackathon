'use client';

import React from 'react';
import Link from 'next/link';
import { useCampusShare } from '@/components/CampusShareProvider';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Flame, 
  FileWarning, 
  CheckCircle2, 
  Info,
  ShieldAlert,
  Users,
  ArrowRight
} from 'lucide-react';
import { IncidentType } from '@/lib/types';

export default function IncidentsPage() {
  const { incidents, bookings, currentProfile, openResolveIncidentModal } = useCampusShare();

  const getIncidentBadge = (type: IncidentType) => {
    switch (type) {
      case 'damage':
        return {
          label: 'Equipment Damage',
          classes: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
          icon: Flame,
        };
      case 'delay':
        return {
          label: 'Schedule Delay',
          classes: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
          icon: Clock,
        };
      case 'safety':
        return {
          label: 'Safety Hazard',
          classes: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
          icon: ShieldAlert,
        };
      case 'conflict':
        return {
          label: 'Space Conflict',
          classes: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
          icon: Users,
        };
      case 'incident':
      default:
        return {
          label: 'Facility Anomaly',
          classes: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
          icon: FileWarning,
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title & Policy Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Incident & Delay Reports
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Transparency log for delays, equipment malfunctions, damage reports, and condition anomalies.
        </p>
      </div>

      {/* Mandatory SPEC Rule Banner */}
      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 p-4 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
        <div className="flex items-center gap-2 font-bold text-sm">
          <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span>CampusShare Governance: Strict &ldquo;No Automated Penalties&rdquo; Policy</span>
        </div>
        <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed text-[11px]">
          Academic research and equipment handling can encounter unforeseen technical snags, power outages, or accidental wear. To preserve a trusted and supportive campus environment, no automated fines, lockouts, or penalties are triggered by incident reports. Equipment owners and lab managers review reports individually to determine root cause and corrective actions.
        </p>
      </div>

      {/* Reports List */}
      {incidents.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-8">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No Incidents Reported</h3>
          <p className="text-xs text-zinc-500 mt-1">
            All equipment and facility sessions are currently operating without delays or damage reports.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => {
            const badge = getIncidentBadge(inc.type);
            const Icon = badge.icon;
            const booking = bookings.find((b) => b.id === inc.booking_id);

            return (
              <div
                key={inc.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.classes}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      #{inc.id}
                    </span>
                  </div>

                  <span className="text-xs text-zinc-400">
                    Reported on {new Date(inc.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Associated Resource & Booking</span>
                    <div className="font-bold text-zinc-900 dark:text-white mt-0.5">
                      {inc.resource_name || booking?.resource?.name || 'Academic Facility'}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Booking Reference: <span className="font-mono">{inc.booking_id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      inc.status === 'resolved' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {inc.status}
                    </span>

                    <Link
                      href={`/bookings/${inc.booking_id}`}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      <span>Timeline &rarr;</span>
                    </Link>
                  </div>
                </div>

                <div className="text-xs bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-1.5">
                  <div>
                    <span className="text-zinc-500 font-semibold block mb-0.5">Reported Description:</span>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {inc.description}
                    </p>
                  </div>

                  {inc.resolution_notes && (
                    <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-0.5">
                      <span className="font-bold block">Custodian Resolution Note:</span>
                      <p>{inc.resolution_notes}</p>
                      {inc.resolved_at && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block pt-0.5">
                          Resolved at {new Date(inc.resolved_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
                  <div>
                    Reported by: <strong className="text-zinc-700 dark:text-zinc-300">{inc.reporter_name}</strong>{' '}
                    <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                      {inc.reporter_role || 'user'}
                    </span>
                  </div>

                  {inc.status !== 'resolved' && ['owner', 'manager', 'admin'].includes(currentProfile.role) ? (
                    <button
                      onClick={() => openResolveIncidentModal(inc)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Resolve Incident &rarr;
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Logged to Server Audit Trail (No Auto Penalty)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
