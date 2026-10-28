'use client';

import React, { useState } from 'react';
import { Booking, IncidentType } from '@/lib/types';
import { X, AlertTriangle, ShieldCheck, Flag } from 'lucide-react';

interface IncidentReportModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitIncident: (bookingId: string, type: IncidentType, description: string) => Promise<void>;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSubmitIncident,
}) => {
  const [type, setType] = useState<IncidentType>('delay');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || description.trim().length < 5) {
      setErrorMsg('Please provide a descriptive report of at least 5 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitIncident(booking.id, type, description.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Report Incident / Issue
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

          {/* Rule Reminder */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Campus Policy: No automated penalties.</strong>
              <div className="text-[11px] mt-0.5">
                All reports are reviewed by resource owners and lab managers to ensure fair and contextual resolution.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Issue Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['delay', 'damage', 'incident'] as IncidentType[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setType(cat)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                    type === cat
                      ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 ring-2 ring-rose-500/20'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Description & Details
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail what occurred (e.g. keycard reader offline causing 25-min delay, loose cable connection on laser power supply)."
              required
              className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
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
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Flag className="h-4 w-4" />
              <span>{submitting ? 'Submitting...' : 'Log Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
