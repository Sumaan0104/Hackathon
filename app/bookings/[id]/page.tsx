'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useCampusShare } from '@/components/CampusShareProvider';
import { getBookingDetailAction, BookingTimelineEvent } from '@/lib/actions';
import { Booking, Resource, Profile, IncidentReport } from '@/lib/types';
import { FormattedDate } from '@/components/FormattedDate';
import { 
  ArrowLeft, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ClipboardCheck, 
  RotateCcw, 
  Flag, 
  Layers, 
  UserCheck, 
  Sparkles, 
  Wrench, 
  Flame, 
  Users, 
  ShieldCheck, 
  CheckSquare, 
  History,
  User,
  Building2,
  FileText
} from 'lucide-react';

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id: bookingId } = use(params);
  const { 
    currentProfile, 
    switchProfile, 
    openCheckInModal, 
    openReturnModal, 
    openIncidentModal, 
    openResolveIncidentModal 
  } = useCampusShare();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    unauthorized?: boolean;
    notFound?: boolean;
    role?: string;
    actorName?: string;
    booking?: Booking;
    resource?: Resource;
    requester?: Profile;
    incidents?: IncidentReport[];
    timeline?: BookingTimelineEvent[];
    isBorrower?: boolean;
    isOwner?: boolean;
    isPrivileged?: boolean;
  } | null>(null);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await getBookingDetailAction(currentProfile.email || currentProfile.id, bookingId);
      setData(res as any);
    } catch (err) {
      console.error('Failed to load booking detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [bookingId, currentProfile.id, currentProfile.role]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">Loading verified reservation history & audit timeline...</p>
        </div>
      </div>
    );
  }

  if (data?.notFound || !data?.booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Booking Record Not Found</h2>
          <p className="text-xs text-zinc-500">The requested reservation ID &ldquo;{bookingId}&rdquo; does not exist in the campus database.</p>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to My Bookings</span>
          </Link>
        </div>
      </div>
    );
  }

  // Server Access Control: Requirement 4 (visible to borrower and resource owner only)
  if (data?.unauthorized) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 shadow-xl text-center space-y-5">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Access Restricted (403 Forbidden)
            </span>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white mt-1">
              Confidential Booking Audit Timeline
            </h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto mt-2 leading-relaxed">
              Under CampusShare data privacy rules, detailed inspection timelines and condition logs for reservation #{bookingId} are visible strictly to the <strong>borrower</strong> and the <strong>facility custodian</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-left text-xs max-w-md mx-auto">
            <span className="text-[11px] font-semibold text-zinc-500 block mb-2">Switch persona to test authorized access:</span>
            <div className="space-y-2">
              <button
                onClick={() => switchProfile('user1@demo.com')}
                className="w-full text-left p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700 font-medium text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Alex Rivera (Borrower)</span>
                <span className="text-[10px] text-zinc-400 font-mono">user1@demo.com</span>
              </button>
              <button
                onClick={() => switchProfile('owner@demo.com')}
                className="w-full text-left p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700 font-medium text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Dr. Marcus Vance (Facility Owner)</span>
                <span className="text-[10px] text-zinc-400 font-mono">owner@demo.com</span>
              </button>
              <button
                onClick={() => switchProfile('admin@demo.com')}
                className="w-full text-left p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700 font-medium text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Dean Elena Rostova (Admin Oversight)</span>
                <span className="text-[10px] text-zinc-400 font-mono">admin@demo.com</span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/bookings"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to My Bookings</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { booking, resource, requester, incidents = [], timeline = [], isBorrower, isOwner } = data;

  const nowTime = new Date().getTime();
  const startTime = new Date(booking.start_time).getTime();
  const endTime = new Date(booking.end_time).getTime();
  const isWithinWindow = nowTime >= startTime && nowTime <= endTime;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/bookings"
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Reservation History
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                #{booking.id}
              </span>
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">
              {resource?.name || 'Campus Facility'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {booking.status === 'approved' && isWithinWindow && (
            <button
              onClick={() => openCheckInModal(booking)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Check-In Now</span>
            </button>
          )}

          {booking.status === 'checked_in' && (
            <button
              onClick={() => openReturnModal(booking)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Return Resource</span>
            </button>
          )}

          <button
            onClick={() => openIncidentModal(booking)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 dark:bg-zinc-800 dark:hover:bg-rose-950 dark:text-zinc-300 dark:hover:text-rose-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Flag className="h-4 w-4" />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column Details, Right Column Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Snapshot & Condition Reports) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Reservation Overview Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                Reservation Details
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                booking.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                booking.status === 'checked_in' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                booking.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                booking.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}>
                {booking.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300">
                <Calendar className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-zinc-900 dark:text-white block">
                    {new Date(booking.start_time).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &ndash; {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({booking.duration_hours.toFixed(1)}h session)
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300">
                <MapPin className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-zinc-900 dark:text-white">{resource?.location}</span>
                  <span className="text-[11px] text-zinc-500 block">Facility Tier {resource?.safety_tier || 1}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300">
                <User className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-zinc-900 dark:text-white">{booking.user_name}</span>
                  <span className="text-[11px] text-zinc-500 block">{booking.user_email}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300">
                <Building2 className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-zinc-900 dark:text-white">Facility Custodian</span>
                  <span className="text-[11px] text-zinc-500 block">{resource?.owner_name || 'Department Custodian'}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">Stated Academic Purpose:</span>
              <p className="text-zinc-600 dark:text-zinc-400 italic bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                &ldquo;{booking.purpose}&rdquo;
              </p>
            </div>

            {booking.status_reason && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">Custodian Written Justification:</span>
                <p className="text-zinc-700 dark:text-zinc-300 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                  {booking.status_reason}
                </p>
              </div>
            )}
          </div>

          {/* Inspection & Condition Record Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 text-xs">
            <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px] block pb-2 border-b border-zinc-100 dark:border-zinc-800">
              Condition & Inspection Logs
            </span>

            {/* Check-In Notes */}
            {booking.checkin_condition_notes ? (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                    Arrival Inspection
                  </span>
                  {booking.checked_in_at && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">
                      <FormattedDate date={booking.checked_in_at} />
                    </span>
                  )}
                </div>
                <p className="text-emerald-800 dark:text-emerald-300 text-[11px]">
                  {booking.checkin_condition_notes}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-[11px]">
                Arrival check-in inspection notes pending.
              </div>
            )}

            {/* Return Notes & Rating */}
            {booking.return_condition_notes ? (
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <RotateCcw className="h-4 w-4 text-blue-600" />
                    Departure Return Record
                  </span>
                  {booking.return_condition_rating && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      booking.return_condition_rating === 'good' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : booking.return_condition_rating === 'minor wear'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {booking.return_condition_rating}
                    </span>
                  )}
                </div>
                <p className="text-blue-800 dark:text-blue-300 text-[11px]">
                  {booking.return_condition_notes}
                </p>
                {booking.is_late && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Late Return: +{booking.late_minutes} minutes past scheduled session</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-[11px]">
                Departure return inspection notes pending.
              </div>
            )}
          </div>

          {/* Incidents Section */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                Reported Incidents ({incidents.length})
              </span>
              <button
                onClick={() => openIncidentModal(booking)}
                className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
              >
                + Log Incident
              </button>
            </div>

            {incidents.length === 0 ? (
              <p className="text-zinc-500 text-[11px] italic">No incidents or anomalies reported on this reservation.</p>
            ) : (
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <div 
                    key={inc.id}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Flag className="h-3.5 w-3.5 text-rose-500" />
                        <span className="font-bold text-zinc-900 dark:text-white capitalize">{inc.type}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 uppercase font-mono">
                          {inc.severity}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        inc.status === 'resolved' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {inc.status}
                      </span>
                    </div>

                    <p className="text-zinc-700 dark:text-zinc-300 text-[11px]">
                      {inc.description}
                    </p>

                    {inc.resolution_notes && (
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] text-emerald-800 dark:text-emerald-300">
                        <strong>Custodian Resolution:</strong> {inc.resolution_notes}
                      </div>
                    )}

                    {/* Owner Resolution Action */}
                    {inc.status !== 'resolved' && (isOwner || currentProfile.role === 'admin') && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => openResolveIncidentModal(inc)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                        >
                          Resolve Incident &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Chronological Timeline */}
        <div className="lg:col-span-7">
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Lifecycle Audit Timeline
                </h2>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                {timeline.length} Recorded Milestones
              </span>
            </div>

            {/* Timeline Stream */}
            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
              {timeline.map((event, index) => {
                const getEventBadge = () => {
                  switch (event.action) {
                    case 'BOOKING_REQUESTED':
                      return { icon: Calendar, bg: 'bg-blue-500 ring-blue-100 dark:ring-blue-900/60' };
                    case 'BOOKING_APPROVED':
                      return { icon: CheckCircle2, bg: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/60' };
                    case 'BOOKING_REJECTED':
                      return { icon: XCircle, bg: 'bg-rose-500 ring-rose-100 dark:ring-rose-900/60' };
                    case 'BOOKING_WAITLISTED':
                      return { icon: Clock, bg: 'bg-purple-500 ring-purple-100 dark:ring-purple-900/60' };
                    case 'CHECKED_IN':
                      return { icon: ClipboardCheck, bg: 'bg-emerald-600 ring-emerald-100 dark:ring-emerald-900/60' };
                    case 'RETURNED':
                      return { icon: RotateCcw, bg: 'bg-blue-600 ring-blue-100 dark:ring-blue-900/60' };
                    case 'LATE_RETURN':
                      return { icon: Clock, bg: 'bg-rose-500 ring-rose-100 dark:ring-rose-900/60' };
                    case 'INCIDENT_REPORTED':
                      return { icon: Flag, bg: 'bg-rose-500 ring-rose-100 dark:ring-rose-900/60' };
                    case 'INCIDENT_RESOLVED':
                      return { icon: ShieldCheck, bg: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/60' };
                    default:
                      return { icon: FileText, bg: 'bg-zinc-500 ring-zinc-100 dark:ring-zinc-800' };
                  }
                };

                const badge = getEventBadge();
                const Icon = badge.icon;

                return (
                  <div key={event.id || index} className="relative group text-xs">
                    {/* Node Dot */}
                    <div className={`absolute -left-[30px] top-0 h-6 w-6 rounded-full ${badge.bg} text-white flex items-center justify-center ring-4 shadow-xs`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    {/* Event Content Box */}
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 space-y-1.5 transition-colors group-hover:border-zinc-300 dark:group-hover:border-zinc-600">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-white text-xs">
                            {event.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 uppercase">
                            {event.action}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          <FormattedDate date={event.timestamp} />
                        </span>
                      </div>

                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-[11px]">
                        {event.description}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-700/60">
                        <span>
                          Actor: <strong>{event.actorName}</strong> ({event.actorRole})
                        </span>
                        {event.details?.delayMinutes && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono">
                            Delay: +{event.details.delayMinutes} mins
                          </span>
                        )}
                        {event.details?.rating && (
                          <span className="capitalize font-semibold text-zinc-700 dark:text-zinc-300">
                            Rating: {event.details.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
