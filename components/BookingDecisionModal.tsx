'use client';

import React, { useState } from 'react';
import { Booking } from '@/lib/types';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  MessageSquareQuote 
} from 'lucide-react';

interface BookingDecisionModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitDecision: (bookingId: string, decision: 'approved' | 'rejected' | 'waitlisted', writtenReason: string) => Promise<void>;
}

export const BookingDecisionModal: React.FC<BookingDecisionModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSubmitDecision,
}) => {
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'waitlisted'>('approved');
  const [writtenReason, setWrittenReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!writtenReason || writtenReason.trim().length < 10) {
      setErrorMsg('Mandatory Rule: Every decision requires a written justification of at least 10 characters shown to the borrower.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitDecision(booking.id, decision, writtenReason.trim());
      onClose();
    } catch (err: any) {
      let rawMsg = err.message || 'Failed to process decision.';
      if (rawMsg.includes('Minified React error') || rawMsg.includes('react.dev/errors')) {
        rawMsg = 'Server Authorization / Sync Notice: Only verified facility custodians (owner@demo.com) or administrators can approve requests. Please ensure you are signed into an authorized account.';
      }
      setErrorMsg(rawMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Owner Decision & Review
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white line-clamp-1">
              Review: {booking.resource?.name || 'Resource Booking'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Request Details Summary */}
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3.5 space-y-2 border border-zinc-200 dark:border-zinc-700 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Borrower:</span>
              <strong className="text-zinc-800 dark:text-zinc-200">{booking.user_name} ({booking.user_email})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Scheduled Time:</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {new Date(booking.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} –{' '}
                {new Date(booking.end_time).toLocaleTimeString([], { timeStyle: 'short' })} ({booking.duration_hours}h)
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-0.5">Purpose:</span>
              <p className="p-2 rounded bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                {booking.purpose}
              </p>
            </div>
          </div>

          {/* Decision Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Select Decision Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision('approved')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  decision === 'approved'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span>Approve</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('waitlisted')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  decision === 'waitlisted'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Clock className="h-5 w-5 text-amber-600" />
                <span>Waitlist</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('rejected')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  decision === 'rejected'
                    ? 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200 ring-2 ring-red-500/20'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <XCircle className="h-5 w-5 text-red-600" />
                <span>Reject</span>
              </button>
            </div>
          </div>

          {/* Mandatory Written Reason */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <MessageSquareQuote className="h-3.5 w-3.5 text-indigo-500" />
                <span>Mandatory Written Reason (Shown to Borrower)</span>
              </label>
              <span className={`text-[10px] font-mono font-bold ${
                writtenReason.trim().length >= 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {writtenReason.trim().length} / 10 chars min
              </span>
            </div>
            <textarea
              rows={3}
              value={writtenReason}
              onChange={(e) => setWrittenReason(e.target.value)}
              placeholder={
                decision === 'approved'
                  ? 'e.g. Safety certifications verified. Access badge provisioned for Lab 304.'
                  : decision === 'waitlisted'
                  ? 'e.g. Bench is scheduled for priority laser calibration. Added to waitlist queue.'
                  : 'e.g. Prerequisite certification missing or gear requires scheduled maintenance overhaul.'
              }
              required
              className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Campus Rule: Writes to audit_log and delivers in-app alert.</span>
              </span>
              {writtenReason.trim().length < 10 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  Needs {10 - writtenReason.trim().length} more chars
                </span>
              )}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || writtenReason.trim().length < 10}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {submitting ? 'Applying Decision...' : 'Confirm Decision & Notify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
