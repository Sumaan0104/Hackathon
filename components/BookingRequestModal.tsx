'use client';

import React, { useState } from 'react';
import { Resource, Profile } from '@/lib/types';
import { 
  X, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Send 
} from 'lucide-react';

interface BookingRequestModalProps {
  resource: Resource | null;
  currentProfile: Profile;
  weeklyHours: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resourceId: string, startTime: string, endTime: string, purpose: string) => Promise<void>;
}

export const BookingRequestModal: React.FC<BookingRequestModalProps> = ({
  resource,
  currentProfile,
  weeklyHours,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [purpose, setPurpose] = useState('');
  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  if (!isOpen || !resource) return null;

  // Calculate requested duration in hours
  const startIso = startDate ? `${startDate}T${startTime}:00` : '';
  const endIso = startDate ? `${startDate}T${endTime}:00` : '';
  const startDateObj = startIso ? new Date(startIso) : null;
  const endDateObj = endIso ? new Date(endIso) : null;
  const durationHours = (startDateObj && endDateObj) 
    ? Math.max(0, (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60))
    : 0;

  const userCap = currentProfile.weekly_hours_cap || 6.0;
  const projectedWeeklyHours = weeklyHours + durationHours;
  const isCapExceeded = projectedWeeklyHours > userCap;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!eligibilityConfirmed) {
      setErrorMsg('You must review and confirm you meet the eligibility criteria.');
      return;
    }

    if (durationHours <= 0) {
      setErrorMsg('End time must be later than start time.');
      return;
    }

    if (isCapExceeded) {
      setErrorMsg(
        `Weekly hour limit exceeded: You have ${weeklyHours.toFixed(1)}h booked. Requesting ${durationHours.toFixed(1)}h would total ${projectedWeeklyHours.toFixed(1)}h, exceeding your weekly cap of ${userCap}h.`
      );
      return;
    }

    if (purpose.trim().length < 8) {
      setErrorMsg('Please provide a specific academic or research purpose (at least 8 characters).');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(resource.id, new Date(startIso).toISOString(), new Date(endIso).toISOString(), purpose.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit booking request.');
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Booking Request
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white line-clamp-1">
              {resource.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Eligibility Requirement Check */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span>Required Eligibility & Certifications</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              {resource.eligibility_requirements}
            </p>
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={eligibilityConfirmed}
                onChange={(e) => setEligibilityConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                I verify that I hold the required certifications and qualify to use this resource.
              </span>
            </label>
          </div>

          {/* Date & Time Select */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Booking Date
              </label>
              <input
                type="date"
                value={startDate}
                min={startDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          {/* Live Weekly Hours Cap Calculator */}
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            isCapExceeded
              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
              : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              <div>
                <div>Slot Duration: <strong>{durationHours.toFixed(1)} hrs</strong></div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Weekly used: {weeklyHours.toFixed(1)}h / {userCap}h cap
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`font-bold ${isCapExceeded ? 'text-red-600' : 'text-emerald-600'}`}>
                {projectedWeeklyHours.toFixed(1)}h / {userCap}h
              </span>
              <div className="text-[10px] text-zinc-400">
                {isCapExceeded ? 'Exceeds weekly cap' : 'Within cap'}
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Academic / Research Purpose
            </label>
            <textarea
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Preparing solar cell efficiency test samples for Senior Design Capstone project."
              required
              className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Policy Note */}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            • Requests are sent to the resource owner for review. If time clashes occur, you will be automatically added to the priority waitlist (ordered by least recent use).
          </p>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isCapExceeded || !eligibilityConfirmed}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Booking Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
