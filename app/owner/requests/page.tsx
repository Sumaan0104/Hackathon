'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCampusShare } from '@/components/CampusShareProvider';
import { 
  getOwnerPendingRequestsAction, 
  OwnerPendingRequestItem, 
  updateBookingDecisionAction 
} from '@/lib/actions';
import { 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  MessageSquareQuote, 
  Users, 
  Award, 
  Calendar, 
  MapPin, 
  ListOrdered,
  ArrowRight,
  UserCheck,
  RefreshCw,
  Sparkles,
  Inbox
} from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';

export default function OwnerRequestsPage() {
  const { currentProfile, switchProfile } = useCampusShare();

  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [actorRole, setActorRole] = useState(currentProfile.role);
  const [requests, setRequests] = useState<OwnerPendingRequestItem[]>([]);
  
  // Selected decision & written reasons per booking
  const [activeDecisions, setActiveDecisions] = useState<Record<string, 'approved' | 'rejected' | 'waitlisted'>>({});
  const [writtenReasons, setWrittenReasons] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<Record<string, { success: boolean; message: string }>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await getOwnerPendingRequestsAction(currentProfile.email || currentProfile.id);
      if (res.unauthorized) {
        setUnauthorized(true);
        setActorRole(res.role);
        setRequests([]);
      } else {
        setUnauthorized(false);
        setActorRole(res.role);
        setRequests(res.requests || []);
        
        // Initialize default decision state for each request
        const initialDecisions: Record<string, 'approved' | 'rejected' | 'waitlisted'> = {};
        const initialReasons: Record<string, string> = {};
        res.requests?.forEach((r) => {
          initialDecisions[r.booking.id] = r.clash ? 'waitlisted' : 'approved';
          initialReasons[r.booking.id] = '';
        });
        setActiveDecisions((prev) => ({ ...initialDecisions, ...prev }));
        setWrittenReasons((prev) => ({ ...initialReasons, ...prev }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve owner pending requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, [currentProfile.id, currentProfile.email, currentProfile.role]);

  const handleDecisionSubmit = async (item: OwnerPendingRequestItem) => {
    const bookingId = item.booking.id;
    const decision = activeDecisions[bookingId] || 'approved';
    const reason = (writtenReasons[bookingId] || '').trim();

    if (reason.length < 10) {
      setErrorMsg(`Compliance Violation: Written reason must be at least 10 characters (currently: ${reason.length}).`);
      return;
    }

    try {
      setSubmittingId(bookingId);
      setErrorMsg(null);
      const res = await updateBookingDecisionAction(
        currentProfile.email || currentProfile.id,
        bookingId,
        decision,
        reason
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Server rejected decision authorization.');
        return;
      }

      const feedbackMsg = decision === 'approved'
        ? `Approved! Verified schedule and weekly quota. Stated reason logged to audit trail.`
        : decision === 'rejected'
        ? `Rejected. Decision justification logged and borrower notified.`
        : `Added to Fair-Access Waitlist at position #${res.waitlistPosition || 1} (ordered by least recent use).`;

      setDecisionFeedback((prev) => ({
        ...prev,
        [bookingId]: { success: true, message: feedbackMsg },
      }));

      // Refresh list after brief moment
      setTimeout(() => {
        fetchPendingRequests();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Server rejected decision authorization.');
    } finally {
      setSubmittingId(null);
    }
  };

  // 1. Server-Side Role Gate View (403 Unauthorized)
  if (unauthorized) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6 animate-in fade-in duration-200">
        <div className="rounded-3xl border-2 border-red-300 dark:border-red-900 bg-red-50/70 dark:bg-red-950/40 p-8 text-center space-y-4 shadow-xl">
          <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              403 Server-Enforced Role Gate
            </span>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              Access Restricted to Facility Owners
            </h1>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
            Per campus governance rules, only facility custodians (<strong>owner</strong>), department managers (<strong>manager</strong>), or academic administrators (<strong>admin</strong>) can authorize booking requests at <code className="font-mono text-red-700 dark:text-red-300">/owner/requests</code>.
          </p>

          <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs inline-flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <span>Your Active Persona:</span>
            <strong className="text-zinc-900 dark:text-white">{currentProfile.full_name}</strong>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
              role: {actorRole}
            </span>
          </div>

          {/* Quick Persona Switchers to test */}
          <div className="pt-4 border-t border-red-200 dark:border-red-900/60 space-y-2">
            <span className="text-[11px] text-zinc-500 font-semibold block">
              Switch to an authorized role to test this portal:
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => switchProfile('owner@demo.com')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Switch to Prof. Elena Vance (Owner)</span>
              </button>

              <button
                onClick={() => switchProfile('admin@demo.com')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Switch to Dr. Sarah Chen (Admin)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              Role: {actorRole.toUpperCase()} PORTAL
            </span>
            <span className="text-xs text-zinc-400 font-mono">/owner/requests</span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight mt-1">
            Owner Booking Review Desk
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Evaluate requester safety certificates, inspect 6h weekly quotas, verify schedule clashes, and provide mandatory written justifications.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchPendingRequests}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>

          <Link
            href="/bookings"
            className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-white transition-colors"
          >
            All Bookings &rarr;
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Governance Instruction Banner */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1">
        <div className="flex items-center gap-2 font-bold text-sm">
          <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Custodian Decision Transparency Rule</span>
        </div>
        <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
          Every Approve, Reject, or Waitlist decision requires a <strong>written justification of at least 10 characters</strong>. The reason is permanently recorded in the audit trail (<code className="font-mono text-amber-900 dark:text-amber-200">audit_log</code>), delivered as an in-app notification to the borrower, and displayed on their &quot;My Bookings&quot; portal.
        </p>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500 text-xs">
          <RefreshCw className="h-8 w-8 mx-auto mb-2 text-zinc-400 animate-spin" />
          Loading pending authorization queue from server...
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 space-y-2">
          <Inbox className="h-10 w-10 text-zinc-400 mx-auto mb-1" />
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            No Pending Requests Awaiting Authorization
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            All reservation requests for facilities under your custodial stewardship have been reviewed. Switch to a student persona to request a new slot!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((item) => {
            const b = item.booking;
            const res = item.resource;
            const req = item.requester;
            const decision = activeDecisions[b.id] || (item.clash ? 'waitlisted' : 'approved');
            const reason = writtenReasons[b.id] || '';
            const feedback = decisionFeedback[b.id];
            const isSubmitting = submittingId === b.id;

            // Calculations
            const requiredCerts = res.required_certifications || [];
            const heldCerts = req.certifications || [];
            const missingCerts = requiredCerts.filter((c) => !heldCerts.includes(c));
            const hasPrerequisites = missingCerts.length === 0;

            const userCap = item.weeklyHoursCap || 6.0;
            const currentHours = item.hoursUsedThisWeek;
            const projectedHours = currentHours + b.duration_hours;
            const exceedsCap = projectedHours > userCap;
            const hoursLeft = Math.max(0, userCap - currentHours);

            const isReasonValid = reason.trim().length >= 10;

            return (
              <div
                key={b.id}
                className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Header: Facility & Booking ID */}
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        Pending Review
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        #{b.id}
                      </span>
                      {res.safety_tier && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          Tier {res.safety_tier} Safety
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white mt-1">
                      {res.name}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{res.location}</span>
                      </span>
                      <span>&bull;</span>
                      <span>Operating: {res.open_time} – {res.close_time}</span>
                    </div>
                  </div>

                  {/* Scheduled Slot Time */}
                  <div className="text-xs text-left sm:text-right p-3 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <div className="font-bold text-zinc-900 dark:text-white">
                      <FormattedDate date={b.start_time} type="date" />
                    </div>
                    <div className="text-zinc-600 dark:text-zinc-300 mt-0.5">
                      <FormattedDate date={b.start_time} type="time" /> –{' '}
                      <FormattedDate date={b.end_time} type="time" />
                    </div>
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                      Duration: {b.duration_hours}h session
                    </div>
                  </div>
                </div>

                {/* Body Details: Requester, Certs, Quota & Purpose */}
                <div className="p-5 space-y-4 text-xs">
                  
                  {/* Grid: Requester Profile & Certifications */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Requester Identity */}
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Requester Identification
                      </span>
                      <div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                          <span>{req.full_name}</span>
                          <span className="text-[10px] font-bold uppercase px-1.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                            {req.role}
                          </span>
                        </div>
                        <div className="text-zinc-500 text-[11px]">{req.email}</div>
                        <div className="text-zinc-500 text-[11px] mt-0.5">Dept: {req.department}</div>
                      </div>

                      {/* Certifications Held */}
                      <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                        <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                          Safety Certificates Held:
                        </span>
                        {heldCerts.length === 0 ? (
                          <span className="text-[11px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>No safety certificates on file</span>
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {heldCerts.map((c, i) => {
                              const isPrereqMatch = requiredCerts.includes(c);
                              return (
                                <span
                                  key={i}
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                    isPrereqMatch
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                                  }`}
                                >
                                  {isPrereqMatch ? '✓ ' : ''}{c}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {!hasPrerequisites && (
                          <div className="mt-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                            ⚠️ Missing Required: {missingCerts.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fair-Use Weekly Quota Status (6.0h Cap) */}
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Fair-Use Weekly Cap Tracking
                        </span>
                        <span className="text-zinc-500 font-mono text-[11px]">
                          Limit: {userCap.toFixed(1)}h/wk
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-600 dark:text-zinc-300">
                            Currently Booked This Week:
                          </span>
                          <strong className="text-zinc-900 dark:text-white font-mono">
                            {currentHours.toFixed(1)}h
                          </strong>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-600 dark:text-zinc-300">
                            This Request (+{b.duration_hours.toFixed(1)}h):
                          </span>
                          <strong className={`font-mono ${exceedsCap ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {projectedHours.toFixed(1)}h / {userCap.toFixed(1)}h
                          </strong>
                        </div>

                        {/* Quota Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex">
                          <div 
                            style={{ width: `${Math.min(100, (currentHours / userCap) * 100)}%` }}
                            className="h-full bg-indigo-500" 
                          />
                          <div 
                            style={{ width: `${Math.min(100 - (currentHours / userCap) * 100, (b.duration_hours / userCap) * 100)}%` }}
                            className={`h-full ${exceedsCap ? 'bg-red-500' : 'bg-emerald-400'}`} 
                          />
                        </div>

                        <div className="text-[11px] text-zinc-500 flex justify-between pt-0.5">
                          <span>{hoursLeft.toFixed(1)}h quota remaining</span>
                          <span>{exceedsCap ? '⚠️ EXCEEDS CAP' : 'Within fair-use quota'}</span>
                        </div>
                      </div>

                      {/* Waitlist Position Status */}
                      <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">Waitlist Queue Position:</span>
                        <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <ListOrdered className="h-3.5 w-3.5" />
                          <span>{item.waitlistPosition ? `#${item.waitlistPosition} of ${item.totalWaitlisted}` : 'Not waitlisted'}</span>
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Stated Purpose */}
                  <div>
                    <span className="text-zinc-400 font-bold uppercase text-[10px] block mb-1">
                      Stated Academic / Research Purpose:
                    </span>
                    <p className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 leading-relaxed italic">
                      &ldquo;{b.purpose}&rdquo;
                    </p>
                  </div>

                  {/* Clash Warning if detected */}
                  {item.clash && (
                    <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Contested Slot Clash Detected:</strong>
                        <div className="text-[11px] text-purple-800 dark:text-purple-300 mt-0.5">
                          This slot conflicts with an active booking ({item.clash.conflictingSlot} by {item.clash.userName}). Approving will double-book the bench unless the other session is cancelled. We recommend selecting <strong>Waitlist</strong>.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Selection & Mandatory Written Justification Form */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                    
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Select Decision Action:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveDecisions((prev) => ({ ...prev, [b.id]: 'approved' }))}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            decision === 'approved'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Approve</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveDecisions((prev) => ({ ...prev, [b.id]: 'waitlisted' }))}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            decision === 'waitlisted'
                              ? 'border-purple-500 bg-purple-50 text-purple-800 dark:bg-purple-950/70 dark:text-purple-200 ring-2 ring-purple-500/20'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Clock className="h-4 w-4 text-purple-600" />
                          <span>Waitlist (LRU)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveDecisions((prev) => ({ ...prev, [b.id]: 'rejected' }))}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            decision === 'rejected'
                              ? 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950/70 dark:text-red-200 ring-2 ring-red-500/20'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>

                    {/* Written Reason with 10-char counter */}
                    <div>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <MessageSquareQuote className="h-4 w-4 text-indigo-500" />
                          <span>Written Reason (Shown to Borrower & Logged to Audit Trail):</span>
                        </label>
                        <span className={`font-mono text-[11px] font-bold ${
                          isReasonValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {reason.trim().length} / 10 characters min
                        </span>
                      </div>

                      <textarea
                        rows={2}
                        value={reason}
                        onChange={(e) => setWrittenReasons((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        placeholder={
                          decision === 'approved'
                            ? 'e.g. Safety certifications verified. Optical bench reserved for capstone research.'
                            : decision === 'waitlisted'
                            ? 'e.g. Slot is contested by senior priority session. Placed on LRU waitlist queue.'
                            : 'e.g. Incomplete laser safety prerequisites or outside facility maintenance windows.'
                        }
                        className="w-full text-xs rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />

                      {!isReasonValid && reason.length > 0 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-1">
                          * Needs {10 - reason.trim().length} more character{10 - reason.trim().length === 1 ? '' : 's'} before submitting.
                        </span>
                      )}
                    </div>

                    {/* Feedback Callout */}
                    {feedback && (
                      <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                        feedback.success 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{feedback.message}</span>
                      </div>
                    )}

                    {/* Submit Decision Button */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-[11px] text-zinc-400">
                        All decisions re-check schedule clashes & weekly cap on the server.
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDecisionSubmit(item)}
                        disabled={isSubmitting || !isReasonValid}
                        className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          decision === 'approved'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : decision === 'waitlisted'
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Authorizing on Server...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit {decision.toUpperCase()} Decision</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
