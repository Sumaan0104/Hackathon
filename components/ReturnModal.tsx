'use client';

import React, { useState } from 'react';
import { Booking, InspectionChecklist, ConditionRating } from '@/lib/types';
import { X, AlertTriangle, RotateCcw, CheckSquare, Square, Clock, ShieldAlert, Sparkles, Wrench } from 'lucide-react';

interface ReturnModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReturn: (bookingId: string, notes: string, rating: ConditionRating, checklist: InspectionChecklist) => Promise<void>;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSubmitReturn,
}) => {
  const [returnNotes, setReturnNotes] = useState(
    'Departure inspection complete: Work area wiped clean, power source securely shut down, accessories intact.'
  );
  const [conditionRating, setConditionRating] = useState<ConditionRating>('good');
  const [checklist, setChecklist] = useState<InspectionChecklist>({
    physicalChecked: true,
    cleanlinessVerified: true,
    safetySecured: true,
    accessoriesPresent: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const toggleChecklist = (key: keyof InspectionChecklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const now = new Date();
  const scheduledEnd = new Date(booking.end_time);
  const isPastEnd = now.getTime() > scheduledEnd.getTime();
  const delayMinutes = isPastEnd ? Math.max(1, Math.round((now.getTime() - scheduledEnd.getTime()) / 60000)) : 0;

  const charCount = returnNotes.trim().length;
  const isNotesValid = charCount >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnNotes || returnNotes.trim().length < 10) {
      setErrorMsg('Mandatory Rule: Final return condition notes must be at least 10 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitReturn(booking.id, returnNotes.trim(), conditionRating, checklist);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record return.');
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Return & Departure Verification
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

          {/* Late Return Alert Banner */}
          {isPastEnd && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Turnaround Delay Detected (+{delayMinutes}m delay)</strong>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  Scheduled reservation window ended at {scheduledEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. This submission will be recorded as late with a {delayMinutes}-minute delay. (Policy: No automated penalties).
                </div>
              </div>
            </div>
          )}

          {/* Condition Rating Selector */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Physical Condition Rating upon Return (Mandatory)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { 
                  id: 'good' as ConditionRating, 
                  label: 'Good Condition', 
                  desc: 'Pristine, fully functional',
                  icon: Sparkles,
                  color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                },
                { 
                  id: 'minor wear' as ConditionRating, 
                  label: 'Minor Wear', 
                  desc: 'Standard cosmetic use',
                  icon: Wrench,
                  color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
                },
                { 
                  id: 'damaged' as ConditionRating, 
                  label: 'Damaged', 
                  desc: 'Defect or damage detected',
                  icon: ShieldAlert,
                  color: 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500'
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = conditionRating === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setConditionRating(opt.id)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? opt.color
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{opt.label}</span>
                    </div>
                    <span className="text-[10px] opacity-80 leading-tight">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Checklist */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Departure Inspection Checklist
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: 'safetySecured' as const, label: 'Equipment safely powered down & laser shrouds secured' },
                { key: 'cleanlinessVerified' as const, label: 'Station wiped clean, consumables returned' },
                { key: 'accessoriesPresent' as const, label: 'All camera lenses / adapters accounted for' },
                { key: 'physicalChecked' as const, label: 'No newly incurred damage or cosmetic marks' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleChecklist(item.key)}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-colors cursor-pointer ${
                    checklist[item.key]
                      ? 'border-blue-300 bg-blue-50/70 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {checklist[item.key] ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4 text-zinc-400" />
                    )}
                  </span>
                  <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Final Departure Condition Log (min 10 chars)
              </label>
              <span className={`text-[11px] font-mono ${isNotesValid ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                {charCount} / 10 min
              </span>
            </div>
            <textarea
              rows={3}
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
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
              disabled={submitting || !isNotesValid}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{submitting ? 'Recording...' : 'Complete Return Inspection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
