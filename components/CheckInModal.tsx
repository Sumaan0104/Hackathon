'use client';

import React, { useState } from 'react';
import { Booking, InspectionChecklist } from '@/lib/types';
import { X, ClipboardCheck, AlertTriangle, CheckSquare, Square } from 'lucide-react';

interface CheckInModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitCheckIn: (bookingId: string, notes: string, checklist: InspectionChecklist) => Promise<void>;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSubmitCheckIn,
}) => {
  const [conditionNotes, setConditionNotes] = useState(
    'Arrival inspection completed: Work bench clear, optics clean with zero scratches, baseline diagnostics normal, all safety goggles sanitized.'
  );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conditionNotes || conditionNotes.trim().length < 3) {
      setErrorMsg('Mandatory: Please record physical condition notes upon check-in.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitCheckIn(booking.id, conditionNotes.trim(), checklist);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete check-in.');
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Arrival Check-In & Physical Inspection
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

          {/* Interactive Inspection Checklist */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Mandatory Physical Verification Checklist
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: 'physicalChecked' as const, label: 'Physical integrity & zero prior structural damage' },
                { key: 'cleanlinessVerified' as const, label: 'Optics / workbench clean & sanitary' },
                { key: 'safetySecured' as const, label: 'Safety interlocks & emergency power off functional' },
                { key: 'accessoriesPresent' as const, label: 'All lenses, cables & accessories present' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleChecklist(item.key)}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-colors cursor-pointer ${
                    checklist[item.key]
                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {checklist[item.key] ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600" />
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
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Condition Notes & Baseline Inspection Log
            </label>
            <textarea
              rows={3}
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Note pre-existing wear or calibration readings to prevent false damage attribution.
            </p>
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
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>{submitting ? 'Verifying...' : 'Authorize Check-In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
