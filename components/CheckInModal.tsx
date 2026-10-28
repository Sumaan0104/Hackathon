'use client';

import React, { useState } from 'react';
import { Booking } from '@/lib/types';
import { X, ClipboardCheck, AlertTriangle } from 'lucide-react';

interface CheckInModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitCheckIn: (bookingId: string, notes: string) => Promise<void>;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSubmitCheckIn,
}) => {
  const [conditionNotes, setConditionNotes] = useState(
    'Lab/equipment inspected upon arrival. Optics and surfaces clear, power-on diagnostics normal, no prior damage noticed.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conditionNotes || conditionNotes.trim().length < 3) {
      setErrorMsg('Please specify the initial condition of the resource.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitCheckIn(booking.id, conditionNotes.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Check-In Verification
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
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

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Initial Condition Notes & Physical Inspection
            </label>
            <textarea
              rows={4}
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Note any existing wear, pre-existing scratches, or calibration state before starting work.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>{submitting ? 'Checking In...' : 'Confirm Check-In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
