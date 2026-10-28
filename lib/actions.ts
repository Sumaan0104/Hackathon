'use server';

import { campusStore } from './store';
import { Resource, UserRole, Booking, IncidentReport, AuditLogEntry, Profile, InspectionChecklist, IncidentSeverity, IncidentType, ConditionRating } from './types';
import { revalidatePath } from 'next/cache';
import { createClient as createServerSupabase } from './supabase/server';
import { 
  isSupabaseDbConnected, 
  fetchSupabaseBookings, 
  fetchSupabaseResources, 
  fetchSupabaseProfiles, 
  fetchSupabaseIncidents, 
  fetchSupabaseAuditLogs, 
  insertSupabaseBooking, 
  updateSupabaseBooking, 
  insertSupabaseAuditLog, 
  insertSupabaseIncident, 
  insertSupabaseResource 
} from './supabase-db';

export async function getProfileServer(profileIdOrEmail: string): Promise<Profile> {
  // Check if there's an active Supabase Auth user session from cookies
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
      let p = campusStore.getProfileByEmail(user.email);
      if (!p) {
        p = campusStore.upsertProfile({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          department: user.user_metadata?.department || 'Campus Department',
          role: (user.user_metadata?.role as UserRole) || 'user',
          weekly_hours_cap: user.user_metadata?.weekly_hours_cap || 6.0,
          certifications: user.user_metadata?.certifications || [],
          created_at: user.created_at,
        });
      }
      if (profileIdOrEmail === user.id || profileIdOrEmail === user.email || !profileIdOrEmail) {
        return p;
      }
    }
  } catch (e) {
    // Fall back to store lookup
  }

  // Lookup in store by ID or by Email
  let profile = campusStore.getProfile(profileIdOrEmail) || campusStore.getProfileByEmail(profileIdOrEmail);
  if (!profile) {
    const all = campusStore.getAllProfiles();
    profile = all.find(p => p.id === profileIdOrEmail || p.email.toLowerCase() === profileIdOrEmail.toLowerCase());
  }

  if (!profile) {
    throw new Error(`Server Authentication: Profile record '${profileIdOrEmail}' not found.`);
  }
  return profile;
}

export async function fetchAllData(profileIdOrEmail: string = 'user-1') {
  // Sync with live Supabase Postgres tables if available
  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    try {
      const [supaProfiles, supaResources, supaBookings, supaIncidents, supaAudit] = await Promise.all([
        fetchSupabaseProfiles(),
        fetchSupabaseResources(),
        fetchSupabaseBookings(),
        fetchSupabaseIncidents(),
        fetchSupabaseAuditLogs(),
      ]);

      if (supaProfiles && supaResources && supaBookings) {
        campusStore.syncFromSupabase(
          supaProfiles,
          supaResources,
          supaBookings,
          supaIncidents || undefined,
          supaAudit || undefined
        );
      }
    } catch (e) {
      console.warn('Supabase DB sync note:', e);
    }
  }

  const currentProfile = await getProfileServer(profileIdOrEmail);
  const resources = campusStore.getResources();
  const bookings = campusStore.getBookings();
  const incidents = campusStore.getIncidents();
  const auditLogs = campusStore.getAuditLogs();
  const profiles = campusStore.getAllProfiles();

  // Weekly hours booked calculation on server
  const weeklyHours = campusStore.getUserWeeklyBookedHours(currentProfile.id, new Date().toISOString());
  const notifications = campusStore.getNotifications(currentProfile.id);

  return {
    currentProfile,
    resources,
    bookings,
    incidents,
    auditLogs,
    profiles,
    weeklyHours,
    notifications,
    isDatabaseConnected: isConnected,
  };
}

export async function requestBookingAction(
  profileIdOrEmail: string,
  resourceId: string,
  startTime: string,
  endTime: string,
  purpose: string
) {
  const actor = await getProfileServer(profileIdOrEmail);
  // Authoritative server-side validation & creation
  const result = campusStore.requestBooking(actor, resourceId, startTime, endTime, purpose);

  // Sync to Supabase Postgres if connected
  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    if (result.success && result.booking) {
      await insertSupabaseBooking(result.booking);
    }
    const latestAudit = campusStore.getAuditLogs()[0];
    if (latestAudit) await insertSupabaseAuditLog(latestAudit);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/audit');
  return result;
}

export async function joinWaitlistAction(
  profileIdOrEmail: string,
  resourceId: string,
  startTime: string,
  endTime: string,
  purpose: string
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const booking = campusStore.joinWaitlist(actor, resourceId, startTime, endTime, purpose);

  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    await insertSupabaseBooking(booking);
    const latestAudit = campusStore.getAuditLogs()[0];
    if (latestAudit) await insertSupabaseAuditLog(latestAudit);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/audit');
  return { success: true, booking };
}

export async function updateBookingDecisionAction(
  profileIdOrEmail: string,
  bookingId: string,
  decision: 'approved' | 'rejected' | 'waitlisted',
  writtenReason: string
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const result = campusStore.updateBookingDecision(actor, bookingId, decision, writtenReason);

  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    await updateSupabaseBooking(bookingId, {
      status: decision,
      status_reason: writtenReason.trim(),
      status_updated_at: result.booking.status_updated_at,
      status_updated_by: result.booking.status_updated_by,
      updated_at: result.booking.updated_at,
    });
    const latestAudit = campusStore.getAuditLogs()[0];
    if (latestAudit) await insertSupabaseAuditLog(latestAudit);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/owner/requests');
  revalidatePath('/audit');
  return { 
    success: true, 
    booking: result.booking, 
    waitlistPosition: result.waitlistPosition,
    notification: result.notification 
  };
}

export async function checkInAction(
  profileIdOrEmail: string, 
  bookingId: string, 
  conditionNotes: string,
  checklist?: InspectionChecklist
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const updatedBooking = campusStore.checkIn(actor, bookingId, conditionNotes, checklist);

  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    await updateSupabaseBooking(bookingId, {
      status: 'checked_in',
      checkin_condition_notes: updatedBooking.checkin_condition_notes,
      checkin_checklist: updatedBooking.checkin_checklist,
      checked_in_at: updatedBooking.checked_in_at,
      updated_at: updatedBooking.updated_at,
    });
    const latestAudit = campusStore.getAuditLogs()[0];
    if (latestAudit) await insertSupabaseAuditLog(latestAudit);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath('/owner/requests');
  revalidatePath('/audit');
  return { success: true, booking: updatedBooking };
}

export async function returnAction(
  profileIdOrEmail: string, 
  bookingId: string, 
  conditionNotes: string,
  conditionRating: ConditionRating,
  checklist?: InspectionChecklist
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const result = campusStore.returnResource(actor, bookingId, conditionNotes, conditionRating, checklist);

  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    await updateSupabaseBooking(bookingId, {
      status: 'completed',
      return_condition_notes: result.booking.return_condition_notes,
      return_checklist: result.booking.return_checklist,
      returned_at: result.booking.returned_at,
      updated_at: result.booking.updated_at,
    });
    // Insert RETURNED and LATE_RETURN (if late)
    const logs = campusStore.getAuditLogs();
    if (result.isLate && logs.length >= 2) {
      await insertSupabaseAuditLog(logs[1]);
      await insertSupabaseAuditLog(logs[0]);
    } else if (logs[0]) {
      await insertSupabaseAuditLog(logs[0]);
    }
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath('/owner/requests');
  revalidatePath('/audit');
  return { 
    success: true, 
    booking: result.booking, 
    isLate: result.isLate, 
    lateMinutes: result.lateMinutes 
  };
}

export async function reportIncidentAction(
  profileIdOrEmail: string,
  bookingId: string,
  type: IncidentType,
  severity: IncidentSeverity,
  description: string
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const report = campusStore.reportIncident(actor, bookingId, type, severity, description);

  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    await insertSupabaseIncident(report);
    const latestAudit = campusStore.getAuditLogs()[0];
    if (latestAudit) await insertSupabaseAuditLog(latestAudit);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath('/incidents');
  revalidatePath('/audit');
  return { success: true, incident: report };
}

export async function resolveIncidentAction(
  profileIdOrEmail: string,
  incidentId: string,
  resolutionNotes: string
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const report = campusStore.resolveIncident(actor, incidentId, resolutionNotes);

  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    const latestAudit = campusStore.getAuditLogs()[0];
    if (latestAudit) await insertSupabaseAuditLog(latestAudit);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath(`/bookings/${report.booking_id}`);
  revalidatePath('/incidents');
  revalidatePath('/audit');
  return { success: true, incident: report };
}

export async function createResourceAction(
  profileIdOrEmail: string,
  resourceData: {
    name: string;
    description: string;
    type: 'lab' | 'equipment' | 'space';
    location: string;
    capacity: number;
    eligibility_requirements: string;
    required_certifications?: string[];
    is_active: boolean;
    open_time?: string;
    close_time?: string;
    max_hours_per_booking?: number;
    specs?: string[];
    available_hours?: string;
    safety_tier?: number;
  }
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const newResource = campusStore.addResource(actor, {
    ...resourceData,
    open_time: resourceData.open_time || '08:00',
    close_time: resourceData.close_time || '20:00',
    max_hours_per_booking: resourceData.max_hours_per_booking || 4.0,
    required_certifications: resourceData.required_certifications || [],
  });

  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    await insertSupabaseResource(newResource);
    const latestAudit = campusStore.getAuditLogs()[0];
    if (latestAudit) await insertSupabaseAuditLog(latestAudit);
  }

  revalidatePath('/');
  revalidatePath('/resources');
  revalidatePath('/audit');
  return { success: true, resource: newResource };
}

export async function getWaitlistQueueAction(resourceId: string) {
  return campusStore.getWaitlistByLeastRecentUse(resourceId);
}

export async function resetDemoDataAction(profileIdOrEmail: string) {
  const actor = await getProfileServer(profileIdOrEmail);
  if (!['admin', 'manager'].includes(actor.role)) {
    throw new Error('Unauthorized: Only administrators or facility managers can reset sample demonstration fixtures.');
  }
  campusStore.seed();
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/incidents');
  revalidatePath('/audit');
  return { success: true };
}

export interface OwnerPendingRequestItem {
  booking: Booking;
  resource: Resource;
  requester: Profile;
  hoursUsedThisWeek: number;
  weeklyHoursCap: number;
  waitlistPosition?: number;
  totalWaitlisted?: number;
  clash?: {
    conflictingSlot: string;
    userName: string;
  };
}

export async function getOwnerPendingRequestsAction(profileIdOrEmail: string) {
  const actor = await getProfileServer(profileIdOrEmail);

  // Strict server role policy check
  const isAllowed = ['owner', 'manager', 'admin'].includes(actor.role);
  if (!isAllowed) {
    return {
      unauthorized: true,
      role: actor.role,
      actorName: actor.full_name,
      requests: [] as OwnerPendingRequestItem[],
    };
  }

  // Sync with Supabase Postgres if live
  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    try {
      const [supaProfiles, supaResources, supaBookings] = await Promise.all([
        fetchSupabaseProfiles(),
        fetchSupabaseResources(),
        fetchSupabaseBookings(),
      ]);
      if (supaProfiles && supaResources && supaBookings) {
        campusStore.syncFromSupabase(supaProfiles, supaResources, supaBookings);
      }
    } catch {}
  }

  const allBookings = campusStore.getBookings();
  const allResources = campusStore.getResources();
  const allProfiles = campusStore.getAllProfiles();

  // Filter pending bookings: for owner -> resources they manage; for manager/admin -> all
  const pending = allBookings.filter((b) => {
    if (b.status !== 'pending') return false;
    if (['manager', 'admin'].includes(actor.role)) return true;
    const res = allResources.find((r) => r.id === b.resource_id);
    return res?.owner_id === actor.id || res?.owner_name === actor.full_name;
  });

  const requests: OwnerPendingRequestItem[] = pending.map((b) => {
    const resource = allResources.find((r) => r.id === b.resource_id) || b.resource || {
      id: b.resource_id,
      name: 'Campus Facility',
      description: 'Campus facility description',
      type: 'lab' as const,
      location: 'Campus',
      capacity: 1,
      eligibility_requirements: '',
      required_certifications: [],
      is_active: true,
      open_time: '08:00',
      close_time: '20:00',
      max_hours_per_booking: 4,
      created_at: '',
      owner_id: '',
    };

    const requester = allProfiles.find((p) => p.id === b.user_id || p.email === b.user_email) || {
      id: b.user_id,
      email: b.user_email || 'student@demo.com',
      full_name: b.user_name || 'Campus Student',
      department: 'Academic Department',
      role: 'user' as UserRole,
      weekly_hours_cap: 6.0,
      certifications: [],
      created_at: '',
    };

    const hoursUsedThisWeek = campusStore.getUserWeeklyBookedHours(requester.id, b.start_time, b.id);
    const weeklyHoursCap = requester.weekly_hours_cap || 6.0;

    // Check waitlist for this resource
    const waitlist = campusStore.getWaitlistByLeastRecentUse(resource.id);
    const idx = waitlist.findIndex((w) => w.id === b.id || w.user_id === requester.id);
    const waitlistPosition = idx >= 0 ? idx + 1 : undefined;

    // Check if slot clashes with another approved booking
    const clashBooking = campusStore.findBookingClash(resource.id, b.start_time, b.end_time, b.id);
    const clash = clashBooking ? {
      conflictingSlot: `${new Date(clashBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(clashBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      userName: clashBooking.user_name || 'Approved Borrower',
    } : undefined;

    return {
      booking: b,
      resource,
      requester,
      hoursUsedThisWeek,
      weeklyHoursCap,
      waitlistPosition,
      totalWaitlisted: waitlist.length,
      clash,
    };
  });

  return {
    unauthorized: false,
    role: actor.role,
    actorName: actor.full_name,
    requests,
  };
}

export async function markNotificationReadAction(notificationId: string) {
  const ok = campusStore.markNotificationRead(notificationId);
  revalidatePath('/');
  revalidatePath('/bookings');
  return { success: ok };
}

export async function markAllNotificationsReadAction(profileIdOrEmail: string) {
  const actor = await getProfileServer(profileIdOrEmail);
  const ok = campusStore.markAllNotificationsRead(actor.id);
  revalidatePath('/');
  revalidatePath('/bookings');
  return { success: ok };
}

export interface BookingTimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: string;
  title: string;
  description: string;
  type: 'milestone' | 'inspection' | 'incident' | 'warning' | 'audit';
  badgeColor: string;
  details?: Record<string, any>;
}

export async function getBookingDetailAction(profileIdOrEmail: string, bookingId: string) {
  const actor = await getProfileServer(profileIdOrEmail);

  // Sync from Supabase Postgres if connected
  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    try {
      const [supaProfiles, supaResources, supaBookings] = await Promise.all([
        fetchSupabaseProfiles(),
        fetchSupabaseResources(),
        fetchSupabaseBookings(),
      ]);
      if (supaProfiles && supaResources && supaBookings) {
        campusStore.syncFromSupabase(supaProfiles, supaResources, supaBookings);
      }
    } catch {}
  }

  const booking = campusStore.getBooking(bookingId);
  if (!booking) {
    return { notFound: true, bookingId };
  }

  const resource = campusStore.getResource(booking.resource_id) || booking.resource;
  const isBorrower = booking.user_id === actor.id || booking.user_email === actor.email;
  const isOwner = resource ? (resource.owner_id === actor.id || resource.owner_name === actor.full_name) : false;
  const isPrivileged = ['manager', 'admin'].includes(actor.role);

  // Requirement 4: "visible to both the user and the resource owner only" (plus admin)
  if (!isBorrower && !isOwner && !isPrivileged) {
    return {
      unauthorized: true,
      role: actor.role,
      actorName: actor.full_name,
      bookingId,
    };
  }

  const requester = campusStore.getProfile(booking.user_id) || campusStore.getProfileByEmail(booking.user_email || '');
  const incidents = campusStore.getIncidentsByBooking(booking.id);
  const auditLogs = campusStore.getAuditLogsByBooking(booking.id);

  // Assemble comprehensive timeline
  const timeline: BookingTimelineEvent[] = [];

  // 1. Booking Creation
  timeline.push({
    id: `tl-created-${booking.id}`,
    timestamp: booking.created_at,
    action: 'BOOKING_REQUESTED',
    actorName: booking.user_name || 'Borrower',
    actorRole: 'user',
    title: 'Booking Requested',
    description: `Slot requested for ${booking.duration_hours.toFixed(1)}h with purpose: "${booking.purpose}"`,
    type: 'milestone',
    badgeColor: 'blue',
  });

  // 2. Decision Milestone (if reviewed)
  if (booking.status_updated_at && booking.status !== 'pending') {
    timeline.push({
      id: `tl-decision-${booking.id}`,
      timestamp: booking.status_updated_at,
      action: booking.status === 'approved' ? 'BOOKING_APPROVED' : booking.status === 'rejected' ? 'BOOKING_REJECTED' : 'BOOKING_WAITLISTED',
      actorName: booking.status_updated_by || resource?.owner_name || 'Custodian',
      actorRole: 'owner',
      title: `Booking ${booking.status.toUpperCase()}`,
      description: booking.status_reason || 'Decision recorded by custodian.',
      type: booking.status === 'approved' ? 'milestone' : booking.status === 'waitlisted' ? 'warning' : 'audit',
      badgeColor: booking.status === 'approved' ? 'emerald' : booking.status === 'waitlisted' ? 'amber' : 'rose',
    });
  }

  // 3. Check-In Milestone
  if (booking.checked_in_at) {
    timeline.push({
      id: `tl-checkin-${booking.id}`,
      timestamp: booking.checked_in_at,
      action: 'CHECKED_IN',
      actorName: booking.user_name || 'Borrower',
      actorRole: 'user',
      title: 'Arrival Check-In Completed',
      description: `Physical condition inspection: "${booking.checkin_condition_notes || 'Clean & verified'}"`,
      type: 'inspection',
      badgeColor: 'emerald',
      details: { checklist: booking.checkin_checklist },
    });
  }

  // 4. Incidents
  incidents.forEach((inc) => {
    timeline.push({
      id: `tl-inc-${inc.id}`,
      timestamp: inc.created_at,
      action: 'INCIDENT_REPORTED',
      actorName: inc.reporter_name || 'Reporter',
      actorRole: inc.reporter_role || 'user',
      title: `Incident Logged: ${inc.type.toUpperCase()}`,
      description: `${inc.severity.toUpperCase()} severity: "${inc.description}" (Policy: No automated penalties)`,
      type: 'incident',
      badgeColor: inc.severity === 'high' ? 'rose' : 'amber',
      details: { incidentId: inc.id, type: inc.type, severity: inc.severity },
    });

    if (inc.resolved_at) {
      timeline.push({
        id: `tl-inc-res-${inc.id}`,
        timestamp: inc.resolved_at,
        action: 'INCIDENT_RESOLVED',
        actorName: inc.resolved_by_name || 'Facility Custodian',
        actorRole: 'owner',
        title: `Incident Resolved: ${inc.type.toUpperCase()}`,
        description: `Custodian Resolution Note: "${inc.resolution_notes || 'Resolved without penalty'}"`,
        type: 'milestone',
        badgeColor: 'emerald',
        details: { incidentId: inc.id },
      });
    }
  });

  // 5. Return Milestone
  if (booking.returned_at) {
    timeline.push({
      id: `tl-return-${booking.id}`,
      timestamp: booking.returned_at,
      action: 'RETURNED',
      actorName: booking.user_name || 'Borrower',
      actorRole: 'user',
      title: 'Resource Returned & Completed',
      description: `Departure inspection: "${booking.return_condition_notes || 'Good'}" | Condition Rating: ${booking.return_condition_rating || 'good'}`,
      type: 'milestone',
      badgeColor: 'blue',
      details: { checklist: booking.return_checklist, rating: booking.return_condition_rating },
    });

    if (booking.is_late) {
      timeline.push({
        id: `tl-late-${booking.id}`,
        timestamp: booking.returned_at,
        action: 'LATE_RETURN',
        actorName: 'System Monitor',
        actorRole: 'admin',
        title: `Late Return Flagged (+${booking.late_minutes}m delay)`,
        description: `Resource returned ${booking.late_minutes} minutes past scheduled session end time.`,
        type: 'warning',
        badgeColor: 'rose',
        details: { delayMinutes: booking.late_minutes },
      });
    }
  }

  // Merge extra audit logs not already mapped
  auditLogs.forEach((log) => {
    const isMapped = timeline.some((t) => t.action === log.action && Math.abs(new Date(t.timestamp).getTime() - new Date(log.created_at).getTime()) < 5000);
    if (!isMapped) {
      timeline.push({
        id: `tl-audit-${log.id}`,
        timestamp: log.created_at,
        action: log.action,
        actorName: log.actor_name,
        actorRole: log.actor_role,
        title: log.action.replace(/_/g, ' '),
        description: log.details?.written_reason || log.details?.description || JSON.stringify(log.details || {}),
        type: 'audit',
        badgeColor: 'zinc',
        details: log.details,
      });
    }
  });

  // Sort timeline chronologically (oldest first)
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    unauthorized: false,
    booking,
    resource,
    requester,
    incidents,
    timeline,
    isBorrower,
    isOwner,
    isPrivileged,
    currentActor: actor,
  };
}
