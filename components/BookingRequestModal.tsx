'use client';

import React, { useState, useEffect } from 'react';
import { Resource, Profile, Booking } from '@/lib/types';
import { 
  X, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  ShieldAlert,
  Send,
  AlertCircle,
  HelpCircle,
  Lock
} from 'lucide-react';

interface BookingRequestModalProps {
  resource: Resource | null;
  currentProfile: Profile;
  weeklyHours: number;
  existingBookings?: Booking[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resourceId: string, startTime: string, endTime: string, purpose: string) => Promise<void>;
}

export const BookingRequestModal: React.FC<BookingRequestModalProps> = ({
  resource,
  currentProfile,
  weeklyHours,
  existingBookings = [],
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

  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setErrorMsg(null);
      setEligibilityConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen || !resource) return null;

  // Eligibility checking: Compare resource.required_certifications with currentProfile.certifications
  const userCerts = currentProfile.certifications || [];
  const requiredCerts = resource.required_certifications || [];
  const missingCerts = requiredCerts.filter((c) => !userCerts.includes(c));
  const isEligibilityBlocked = missingCerts.length > 0;

  // Compute requested duration
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

  // Real-time clash detection with approved sessions for this resource
  const relevantBookings = existingBookings.filter(
    (b) => b.resource_id === resource.id && ['approved', 'checked_in'].includes(b.status)
  );

  const startMs = startDateObj?.getTime() || 0;
  const endMs = endDateObj?.getTime() || 0;

  const overlappingBooking = relevantBookings.find((b) => {
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return startMs < bEnd && endMs > bStart;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Strict front-end gate
    if (isEligibilityBlocked) {
      setErrorMsg(
        `Eligibility Blocked: You do not possess the required certification(s): "${missingCerts.join(', ')}". Booking cannot proceed.`
      );
      return;
    }

    if (!eligibilityConfirmed) {
      setErrorMsg('Mandatory Verification: You must certify you meet the eligibility criteria.');
      return;
    }

    if (durationHours <= 0) {
      setErrorMsg('Validation Error: End time must be later than start time.');
      return;
    }

    if (isCapExceeded) {
      setErrorMsg(
        `Weekly Quota Exceeded: You currently have ${weeklyHours.toFixed(1)}h booked this week. Requesting ${durationHours.toFixed(1)}h would reach ${projectedWeeklyHours.toFixed(1)}h, which exceeds your weekly cap of ${userCap}h.`
      );
      return;
    }

    if (purpose.trim().length < 8) {
      setErrorMsg('Please enter a specific research or project purpose (minimum 8 characters).');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(
        resource.id, 
        new Date(startIso).toISOString(), 
        new Date(endIso).toISOString(), 
        purpose.trim()
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Reservation Request
              </span>
              <span className="text-xs text-zinc-400">
                {resource.type.toUpperCase()}
              </span>
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mt-1 line-clamp-1">
              {resource.name}
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* CRITICAL ELIGIBILITY BLOCKING BANNER */}
          {isEligibilityBlocked ? (
            <div className="rounded-2xl border-2 border-red-500 bg-red-50/90 dark:bg-red-950/60 p-4 space-y-2.5 text-xs text-red-900 dark:text-red-200 shadow-md">
              <div className="flex items-center gap-2 text-sm font-extrabold text-red-700 dark:text-red-300">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                <span>Eligibility Blocked: Mandatory Certifications Missing</span>
              </div>
              <p className="leading-relaxed">
                You cannot reserve <strong>{resource.name}</strong> because your student profile lacks required prerequisite safety clearances:
              </p>
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 font-mono text-xs font-bold text-red-900 dark:text-red-100">
                Missing Required: {missingCerts.join(', ')}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 gap-1 pt-1 border-t border-red-200 dark:border-red-900/60">
                <span>
                  Logged in as: <strong>{currentProfile.email}</strong> ({currentProfile.full_name})
                </span>
                <span>
                  Certifications on file: <strong className="text-red-600 dark:text-red-400">{userCerts.length > 0 ? userCerts.join(', ') : 'None (0 on file)'}</strong>
                </span>
              </div>
              <p className="text-[11px] text-red-800 dark:text-red-300 italic">
                Notice: To unlock this facility, enroll in and pass the {missingCerts[0]} via the campus EHS safety portal.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Eligibility Verified & Active</span>
              </div>
              <p className="text-emerald-800 dark:text-emerald-300 leading-normal">
                {resource.eligibility_requirements}
              </p>
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eligibilityConfirmed}
                  onChange={(e) => setEligibilityConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-emerald-400 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  I certify that I hold verified credentials ({userCerts.join(', ') || 'Campus ID'}) and agree to standard laboratory safety protocols.
                </span>
              </label>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Date & Time Select */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Requested Date
              </label>
              <input
                type="date"
                value={startDate}
                min={startDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isEligibilityBlocked}
                required
                className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isEligibilityBlocked}
                required
                className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isEligibilityBlocked}
                required
                className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>

          {/* Conflict Indicator */}
          {overlappingBooking ? (
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong>Schedule Clash Detected</strong>
                <div className="text-[11px] text-purple-800 dark:text-purple-300 mt-0.5">
                  This slot overlaps with an approved booking by <strong>{overlappingBooking.user_name}</strong>. Submitting will automatically place your request on the <strong>Fair-Access Waitlist</strong> (ordered by least recent use).
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Time slot is currently clear with no conflicts.</span>
            </div>
          )}

          {/* Weekly Quota Cap Breakdown */}
          <div className={`p-3.5 rounded-xl border ${
            isCapExceeded
              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800'
              : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                <span>Weekly Hours Quota Engine (Default 6.0h cap)</span>
              </span>
              <span className={`font-mono font-bold ${isCapExceeded ? 'text-red-600' : 'text-emerald-600'}`}>
                {projectedWeeklyHours.toFixed(1)}h / {userCap.toFixed(1)}h
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex">
              <div 
                style={{ width: `${Math.min(100, (weeklyHours / userCap) * 100)}%` }} 
                className="h-full bg-indigo-500"
                title={`Already used: ${weeklyHours}h`}
              />
              <div 
                style={{ width: `${Math.min(100 - (weeklyHours / userCap) * 100, (durationHours / userCap) * 100)}%` }} 
                className={`h-full ${isCapExceeded ? 'bg-red-500' : 'bg-emerald-400'}`}
                title={`Requested: ${durationHours}h`}
              />
            </div>

            <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
              <span>Booked so far: <strong>{weeklyHours.toFixed(1)}h</strong></span>
              <span>This request: <strong>+{durationHours.toFixed(1)}h</strong></span>
              <span>Available left: <strong>{Math.max(0, userCap - weeklyHours).toFixed(1)}h</strong></span>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Academic & Research Justification
            </label>
            <textarea
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={isEligibilityBlocked}
              placeholder="State project details, faculty advisor or capstone scope (e.g. Senior Capstone: High-Speed Optical Dispersion Characterization)."
              required
              className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isCapExceeded || isEligibilityBlocked || !eligibilityConfirmed}
              className={`flex items-center gap-1.5 px-5 py-2 font-semibold rounded-xl shadow-xs transition-colors cursor-pointer ${
                isEligibilityBlocked
                  ? 'bg-zinc-400 text-white cursor-not-allowed opacity-60'
                  : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white'
              }`}
            >
              {isEligibilityBlocked ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Blocked: Missing Required Certification</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Submitting...' : overlappingBooking ? 'Join Priority Waitlist' : 'Submit Reservation'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
