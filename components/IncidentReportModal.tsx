'use client';

import React, { useState } from 'react';
import { Booking, IncidentType, IncidentSeverity } from '@/lib/types';
import { X, AlertTriangle, ShieldCheck, Flag, Flame, Clock, ShieldAlert, Users } from 'lucide-react';

interface IncidentReportModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitIncident: (bookingId: string, type: IncidentType, severity: IncidentSeverity, description: string) => Promise<void>;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSubmitIncident,
}) => {
  const [type, setType] = useState<IncidentType>('damage');
  const [severity, setSeverity] = useState<IncidentSeverity>('low');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const charCount = description.trim().length;
  const isDescValid = charCount >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || description.trim().length < 10) {
      setErrorMsg('Mandatory Rule: Incident description must be at least 10 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitIncident(booking.id, type, severity, description.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Operational Reporting Log
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mt-0.5 line-clamp-1">
              {booking.resource?.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-xs text-red-700 border border-red-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Governance Guarantee Banner */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong>CampusShare Rule: Strict &ldquo;No Automated Penalties&rdquo; Policy</strong>
              <div className="text-[11px] text-indigo-800 dark:text-indigo-300 mt-0.5">
                All reports are recorded to maintain transparency and maintenance queues. No automated fines or account locks will be imposed. Owners and facility managers make all contextual decisions.
              </div>
            </div>
          </div>

          {/* Issue Type */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Incident Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'damage' as IncidentType, label: 'Damage', desc: 'Hardware defect', icon: Flame },
                { id: 'delay' as IncidentType, label: 'Delay', desc: 'Schedule overrun', icon: Clock },
                { id: 'safety' as IncidentType, label: 'Safety', desc: 'Protocol hazard', icon: ShieldAlert },
                { id: 'conflict' as IncidentType, label: 'Conflict', desc: 'Schedule dispute', icon: Users },
              ].map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setType(cat.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      type === cat.id
                        ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-bold">{cat.label}</span>
                    <span className="text-[10px] font-normal opacity-75">{cat.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Estimated Severity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'low' as IncidentSeverity, label: 'Low (Minor / 10-min)' },
                { id: 'medium' as IncidentSeverity, label: 'Medium (Calibration)' },
                { id: 'high' as IncidentSeverity, label: 'High (Immediate Fix)' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeverity(s.id)}
                  className={`p-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                    severity === s.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Descriptive Summary (min 10 chars)
              </label>
              <span className={`text-[11px] font-mono ${isDescValid ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                {charCount} / 10 min
              </span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail observations (e.g. Card key reader failed to unlock door; lab supervisor notified at 10:15)."
              required
              className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isDescValid}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Flag className="h-4 w-4" />
              <span>{submitting ? 'Logging...' : 'Submit Incident Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
