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
  Lock,
  ListOrdered
} from 'lucide-react';

interface BookingRequestModalProps {
  resource: Resource | null;
  currentProfile: Profile;
  weeklyHours: number;
  existingBookings?: Booking[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resourceId: string, startTime: string, endTime: string, purpose: string) => Promise<{ clash?: boolean; conflictingSlot?: any }>;
  onJoinWaitlist: (resourceId: string, startTime: string, endTime: string, purpose: string) => Promise<void>;
}

export const BookingRequestModal: React.FC<BookingRequestModalProps> = ({
  resource,
  currentProfile,
  weeklyHours,
  existingBookings = [],
  isOpen,
  onClose,
  onSubmit,
  onJoinWaitlist,
}) => {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverClash, setServerClash] = useState<{ start: string; end: string; userName: string } | null>(null);

  useEffect(() => {
    if (isOpen && resource) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
      
      // Default times within resource operating hours
      const open = resource.open_time || '08:00';
      const openHour = parseInt(open.split(':')[0], 10);
      const defaultStart = `${String(Math.max(openHour, 9)).padStart(2, '0')}:00`;
      const defaultEnd = `${String(Math.min(openHour + 2, 21)).padStart(2, '0')}:00`;
      
      setStartTime(defaultStart);
      setEndTime(defaultEnd);
      setErrorMsg(null);
      setServerClash(null);
    }
  }, [isOpen, resource]);

  if (!isOpen || !resource) return null;

  // 1. Eligibility Check: Check if user lacks any required certificate
  const userCerts = currentProfile.certifications || [];
  const requiredCerts = resource.required_certifications || [];
  const missingCerts = requiredCerts.filter((c) => !userCerts.includes(c));
  const isEligibilityBlocked = missingCerts.length > 0;

  // 2. Times & Duration Calculation
  const startIso = startDate ? `${startDate}T${startTime}:00` : '';
  const endIso = startDate ? `${startDate}T${endTime}:00` : '';
  const startDateObj = startIso ? new Date(startIso) : null;
  const endDateObj = endIso ? new Date(endIso) : null;
  const durationHours = (startDateObj && endDateObj)
    ? Math.max(0, (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60))
    : 0;

  // 3. Operating Hours & Max Duration Checks
  const openTime = resource.open_time || '08:00';
  const closeTime = resource.close_time || '20:00';
  const maxHours = resource.max_hours_per_booking || 4.0;

  const isOutsideOperatingHours = startTime < openTime || endTime > closeTime;
  const isExceedingMaxDuration = durationHours > maxHours;

  // 4. Fair Use: Weekly Cap of 6.0 hours per user
  const userCap = currentProfile.weekly_hours_cap || 6.0;
  const hoursLeft = Math.max(0, userCap - weeklyHours);
  const projectedWeeklyHours = weeklyHours + durationHours;
  const isCapExceeded = projectedWeeklyHours > userCap;

  // 5. Live Clash Detection with approved/checked_in bookings
  const relevantBookings = existingBookings.filter(
    (b) => b.resource_id === resource.id && ['approved', 'checked_in'].includes(b.status)
  );

  const startMs = startDateObj?.getTime() || 0;
  const endMs = endDateObj?.getTime() || 0;

  const localClash = relevantBookings.find((b) => {
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return startMs < bEnd && endMs > bStart;
  });

  const activeClash = serverClash || (localClash ? {
    start: localClash.start_time,
    end: localClash.end_time,
    userName: localClash.user_name || 'Another Student',
  } : null);

  const handleRegularSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setServerClash(null);

    // Front-end sanity checks
    if (isEligibilityBlocked) {
      setErrorMsg(`You're missing: ${missingCerts.join(', ')}`);
      return;
    }

    if (isOutsideOperatingHours) {
      setErrorMsg(`Booking time is outside operating hours (${openTime} to ${closeTime}).`);
      return;
    }

    if (isExceedingMaxDuration) {
      setErrorMsg(`Exceeds maximum booking limit of ${maxHours.toFixed(1)} hours.`);
      return;
    }

    if (isCapExceeded) {
      setErrorMsg(`Rule: Weekly cap of ${userCap.toFixed(1)} hours per user. You have ${weeklyHours.toFixed(1)}h booked (${hoursLeft.toFixed(1)}h left).`);
      return;
    }

    if (durationHours <= 0) {
      setErrorMsg('End time must be after start time.');
      return;
    }

    if (purpose.trim().length < 5) {
      setErrorMsg('Please specify your academic or research purpose (at least 5 characters).');
      return;
    }

    try {
      setSubmitting(true);
      const res = await onSubmit(
        resource.id,
        new Date(startIso).toISOString(),
        new Date(endIso).toISOString(),
        purpose.trim()
      );

      if (res && res.clash) {
        setServerClash(res.conflictingSlot || { start: startIso, end: endIso, userName: 'Approved Session' });
        setErrorMsg('Conflict: The requested time slot is already booked. You can join the fair-access waitlist below.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server rejected booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinWaitlistSubmit = async () => {
    setErrorMsg(null);
    try {
      setWaitlistSubmitting(true);
      await onJoinWaitlist(
        resource.id,
        new Date(startIso).toISOString(),
        new Date(endIso).toISOString(),
        purpose.trim() || 'Waitlist request due to time slot clash.'
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join waitlist.');
    } finally {
      setWaitlistSubmitting(false);
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
                Reserve Slot
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
        <form onSubmit={handleRegularSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* 1. Operating Hours & Policy Pill Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-[11px]">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              <span>Open: <strong>{openTime} – {closeTime}</strong></span>
            </span>
            <span className="text-zinc-600 dark:text-zinc-300">
              Max Booking: <strong>{maxHours.toFixed(1)}h</strong>
            </span>
            <span className="text-zinc-500">
              Location: <strong>{resource.location}</strong>
            </span>
          </div>

          {/* 2. ELIGIBILITY BLOCK: "You're missing: <name>" */}
          {isEligibilityBlocked && (
            <div className="rounded-2xl border-2 border-red-500 bg-red-50/90 dark:bg-red-950/60 p-4 space-y-2 text-xs text-red-900 dark:text-red-200 shadow-md">
              <div className="flex items-center gap-2 text-sm font-extrabold text-red-700 dark:text-red-300">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                <span>Eligibility Blocked: Missing Prerequisites</span>
              </div>
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 font-bold text-xs text-red-900 dark:text-red-100">
                You&apos;re missing: {missingCerts.join(', ')}
              </div>
              <p className="text-[11px] text-red-800 dark:text-red-300">
                Your profile has no record of this safety qualification. Complete the prerequisite training before booking this facility.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 3. Date & Time Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Booking Date
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

          {/* Operating hours validation warnings */}
          {isOutsideOperatingHours && (
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 text-[11px] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Outside Operating Hours: This facility is only open from {openTime} to {closeTime}.</span>
            </div>
          )}

          {isExceedingMaxDuration && (
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 text-[11px] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Duration Limit Exceeded: Single booking cannot exceed {maxHours.toFixed(1)} hours (selected: {durationHours.toFixed(1)}h).</span>
            </div>
          )}

          {/* 4. CLASH DETECTION & WAITLIST CTA */}
          {activeClash && (
            <div className="rounded-2xl border-2 border-purple-500 bg-purple-50/90 dark:bg-purple-950/60 p-4 space-y-3 text-xs text-purple-950 dark:text-purple-100 shadow-md">
              <div className="flex items-center gap-2 font-bold text-sm text-purple-800 dark:text-purple-200">
                <AlertCircle className="h-5 w-5 text-purple-600 shrink-0" />
                <span>Schedule Clash: Slot Already Reserved</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-800">
                <div>Conflicting slot: <strong>{new Date(activeClash.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(activeClash.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                <div className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">Approved user: {activeClash.userName}</div>
              </div>
              <p className="text-[11px] leading-relaxed">
                You cannot double-book this active session. However, you can join the <strong>Fair-Access Waitlist</strong> (ordered by least recent use). If the slot opens or is cancelled, waitlisted users are granted access.
              </p>
              <button
                type="button"
                onClick={handleJoinWaitlistSubmit}
                disabled={waitlistSubmitting || isEligibilityBlocked || isCapExceeded}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <ListOrdered className="h-4 w-4" />
                <span>{waitlistSubmitting ? 'Joining Waitlist...' : 'Join Waitlist (Least Recent Use Priority)'}</span>
              </button>
            </div>
          )}

          {/* 5. FAIR USE: WEEKLY CAP OF 6 HOURS */}
          <div className={`p-3.5 rounded-xl border ${
            isCapExceeded
              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800'
              : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                <span>Rule: Weekly cap of 6.0 hours per user</span>
              </span>
              <span className={`font-mono font-bold ${isCapExceeded ? 'text-red-600' : 'text-emerald-600'}`}>
                {projectedWeeklyHours.toFixed(1)}h / {userCap.toFixed(1)}h
              </span>
            </div>

            {/* Visual Bar */}
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
              <span>You have <strong>{weeklyHours.toFixed(1)}h</strong> booked</span>
              <span><strong>{hoursLeft.toFixed(1)}h left</strong> this week</span>
              <span>Requested: <strong>+{durationHours.toFixed(1)}h</strong></span>
            </div>

            {isCapExceeded && (
              <div className="mt-2 text-[11px] text-red-600 dark:text-red-400 font-semibold">
                ⚠️ Weekly cap exceeded: Requesting {durationHours.toFixed(1)} hours would total {projectedWeeklyHours.toFixed(1)} hours, exceeding your {userCap.toFixed(1)}h limit.
              </div>
            )}
          </div>

          {/* 6. Purpose Input */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Purpose & Project Description
            </label>
            <textarea
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={isEligibilityBlocked}
              placeholder="State your academic or research purpose (e.g. Laser spectroscopy measurement for Senior Capstone project)."
              required
              className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Footer Submit Button */}
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
              disabled={
                submitting || 
                isEligibilityBlocked || 
                isOutsideOperatingHours || 
                isExceedingMaxDuration || 
                isCapExceeded || 
                Boolean(activeClash)
              }
              className={`flex items-center gap-1.5 px-5 py-2 font-semibold rounded-xl shadow-xs transition-colors cursor-pointer ${
                isEligibilityBlocked
                  ? 'bg-zinc-400 text-white cursor-not-allowed opacity-60'
                  : Boolean(activeClash)
                  ? 'bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white'
              }`}
            >
              {isEligibilityBlocked ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>You&apos;re missing: {missingCerts.join(', ')}</span>
                </>
              ) : activeClash ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Slot Taken (Join Waitlist Above)</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Request (Status: Pending)'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
