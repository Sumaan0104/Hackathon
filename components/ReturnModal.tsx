'use client';

import React, { useState } from 'react';
import { Booking, InspectionChecklist } from '@/lib/types';
import { X, AlertTriangle, RotateCcw, CheckSquare, Square } from 'lucide-react';

interface ReturnModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReturn: (bookingId: string, notes: string, checklist: InspectionChecklist) => Promise<void>;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSubmitReturn,
}) => {
  const [returnNotes, setReturnNotes] = useState(
    'Departure inspection complete: Work area wiped clean, laser/power source securely turned off and shrouded, key and security badge returned.'
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
    if (!returnNotes || returnNotes.trim().length < 3) {
      setErrorMsg('Mandatory: Please specify return condition notes.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitReturn(booking.id, returnNotes.trim(), checklist);
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
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700">
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
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Final Departure Condition Log
            </label>
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
              className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
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
