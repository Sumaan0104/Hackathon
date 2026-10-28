'use client';

import React, { useState } from 'react';
import { useCampusShare } from '@/components/CampusShareProvider';
import { Booking, BookingStatus } from '@/lib/types';
import { 
  CalendarCheck, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ClipboardCheck, 
  RotateCcw, 
  Flag, 
  Layers, 
  UserCheck, 
  ShieldAlert,
  ListOrdered,
  FileText,
  Hourglass
} from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';

export default function BookingsPage() {
  const { 
    currentProfile, 
    bookings, 
    resources, 
    openDecisionModal, 
    openCheckInModal, 
    openReturnModal, 
    openIncidentModal,
    openWaitlistModal
  } = useCampusShare();

  const [activeTab, setActiveTab] = useState<'my-bookings' | 'owner' | 'history'>('my-bookings');

  // Filter bookings for the current authenticated user (My Bookings)
  const myBookings = bookings.filter((b) => b.user_id === currentProfile.id || b.user_email === currentProfile.email);

  // For facility owners/managers/admins:
  const ownerBookings = bookings.filter((b) => {
    if (['manager', 'admin'].includes(currentProfile.role)) return true;
    const resource = resources.find((r) => r.id === b.resource_id);
    return resource?.owner_id === currentProfile.id || resource?.owner_name === currentProfile.full_name;
  });

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          classes: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        };
      case 'pending':
        return {
          label: 'Pending Review',
          classes: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        };
      case 'waitlisted':
        return {
          label: 'Waitlisted',
          classes: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
        };
      case 'checked_in':
        return {
          label: 'Checked In / Active',
          classes: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        };
      case 'completed':
        return {
          label: 'Returned & Completed',
          classes: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
        };
      case 'rejected':
      default:
        return {
          label: 'Rejected',
          classes: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
        };
    }
  };

  const renderBookingCard = (booking: Booking, isOwnerPerspective: boolean) => {
    const badge = getStatusBadge(booking.status);
    const resource = resources.find((r) => r.id === booking.resource_id) || booking.resource;

    return (
      <div
        key={booking.id}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4"
      >
        {/* Top Header: Badge, ID & Scheduled Time */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.classes}`}>
                {badge.label}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                #{booking.id}
              </span>
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-1">
              {resource?.name || 'Academic Facility'}
            </h3>
          </div>

          <div className="text-xs text-zinc-500 text-left sm:text-right">
            <div>
              <strong><FormattedDate date={booking.start_time} type="date" /></strong>
            </div>
            <div>
              <FormattedDate date={booking.start_time} type="time" /> –{' '}
              <FormattedDate date={booking.end_time} type="time" />{' '}
              ({booking.duration_hours}h session)
            </div>
          </div>
        </div>

        {/* Borrower & Facility Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
            <span className="text-zinc-400 block text-[10px] uppercase font-bold">Borrower Record</span>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {booking.user_name}
            </div>
            <div className="text-zinc-500 text-[11px]">{booking.user_email}</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
            <span className="text-zinc-400 block text-[10px] uppercase font-bold">Location & Custodian</span>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
              {resource?.location}
            </div>
            <div className="text-zinc-500 text-[11px]">Custodian: {resource?.owner_name}</div>
          </div>
        </div>

        {/* Stated Purpose */}
        <div className="text-xs">
          <span className="text-zinc-500 font-semibold block mb-1">Stated Purpose:</span>
          <p className="text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
            {booking.purpose}
          </p>
        </div>

        {/* DECISION REASON DISPLAY (SPEC REQUIREMENT) */}
        {booking.status_reason ? (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
              <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Decision Reason:</span>
            </div>
            <p className="text-indigo-800 dark:text-indigo-300 font-medium text-xs leading-relaxed">
              &ldquo;{booking.status_reason}&rdquo;
            </p>
            {booking.status_updated_at && (
              <span className="text-[10px] text-zinc-400 block pt-0.5">
                Updated: <FormattedDate date={booking.status_updated_at} />
              </span>
            )}
          </div>
        ) : booking.status === 'pending' ? (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/30 p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Hourglass className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Awaiting review by facility custodian. A written justification will appear here upon decision.</span>
          </div>
        ) : null}

        {/* Condition Notes (Check-In & Return History) */}
        {(booking.checkin_condition_notes || booking.return_condition_notes) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            {booking.checkin_condition_notes && (
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1 mb-1">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                  Check-In Condition Notes:
                </span>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  {booking.checkin_condition_notes}
                </p>
              </div>
            )}

            {booking.return_condition_notes && (
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1 mb-1">
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                  Return Condition Notes:
                </span>
                <p className="text-[11px] text-blue-800 dark:text-blue-300">
                  {booking.return_condition_notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-zinc-100 dark:border-zinc-800">
          
          {/* Owner Decision Action */}
          {isOwnerPerspective && (booking.status === 'pending' || booking.status === 'waitlisted') && (
            <button
              onClick={() => openDecisionModal(booking)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Review & Make Decision (Mandatory Written Reason)</span>
            </button>
          )}

          {/* Borrower Check-In Action */}
          {booking.status === 'approved' && (
            <button
              onClick={() => openCheckInModal(booking)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Check-In (Submit Arrival Condition Notes)</span>
            </button>
          )}

          {/* Return Resource Action */}
          {booking.status === 'checked_in' && (
            <button
              onClick={() => openReturnModal(booking)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Return Resource & Complete</span>
            </button>
          )}

          {/* Incident / Delay Reporting */}
          {(booking.status === 'approved' || booking.status === 'checked_in' || booking.status === 'completed') && (
            <button
              onClick={() => openIncidentModal(booking)}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 dark:bg-zinc-800 dark:hover:bg-rose-950 dark:text-zinc-300 dark:hover:text-rose-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Flag className="h-4 w-4" />
              <span>Report Delay / Damage</span>
            </button>
          )}

          {/* Waitlist View */}
          {resource && booking.status === 'waitlisted' && (
            <button
              onClick={() => openWaitlistModal(resource)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-xs font-medium rounded-xl hover:bg-purple-100 transition-colors"
            >
              <ListOrdered className="h-4 w-4" />
              <span>View Waitlist Queue</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Page Title & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Bookings & Reservations
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Track status, review owner decision reasons, log condition inspections, and oversee campus sharing.
          </p>
        </div>

        {/* Tab Controls: My Bookings is default */}
        <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
          <button
            onClick={() => setActiveTab('my-bookings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'my-bookings'
                ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
            }`}
          >
            My Bookings ({myBookings.length})
          </button>

          <button
            onClick={() => setActiveTab('owner')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'owner'
                ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
            }`}
          >
            Owner Review Portal ({ownerBookings.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
            }`}
          >
            All Bookings ({bookings.length})
          </button>
        </div>
      </div>

      {/* MY BOOKINGS TAB (DEFAULT) */}
      {activeTab === 'my-bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Reservations requested by: <strong>{currentProfile.full_name}</strong> ({currentProfile.email})</span>
            <span>Weekly Limit: <strong>{currentProfile.weekly_hours_cap || 6.0}h</strong></span>
          </div>

          {myBookings.length === 0 ? (
            <div className="text-center py-12 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8">
              <CalendarCheck className="h-10 w-10 text-zinc-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No Reservations Yet</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Browse campus facilities on the home page and click &quot;Reserve Slot&quot; to make your first request!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myBookings.map((b) => renderBookingCard(b, false))}
            </div>
          )}
        </div>
      )}

      {/* OWNER REVIEW PORTAL */}
      {activeTab === 'owner' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Custodian Decision Authority & Transparency</strong>
              <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Every Approve, Reject, or Waitlist decision requires a written reason that is permanently recorded in the audit trail and presented to the student borrower.
              </div>
            </div>
          </div>

          {ownerBookings.length === 0 ? (
            <div className="text-center py-12 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8">
              <ClipboardCheck className="h-10 w-10 text-zinc-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No Pending Requests</h3>
              <p className="text-xs text-zinc-500 mt-1">
                You have no active requests for resources you manage. Switch personas in the top right to test as Prof. Elena Vance (Owner).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {ownerBookings.map((b) => renderBookingCard(b, true))}
            </div>
          )}
        </div>
      )}

      {/* ALL BOOKINGS TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="text-xs text-zinc-500">
            Complete collegiate booking history across all campus labs, gear, and makerspaces.
          </div>
          <div className="space-y-4">
            {bookings.map((b) => renderBookingCard(b, ['owner', 'manager', 'admin'].includes(currentProfile.role)))}
          </div>
        </div>
      )}

    </div>
  );
}
