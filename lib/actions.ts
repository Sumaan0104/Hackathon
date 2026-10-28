'use server';

import { campusStore } from './store';
import { Resource, UserRole, Booking, IncidentReport, AuditLogEntry, Profile, InspectionChecklist, IncidentSeverity, IncidentType } from './types';
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
  revalidatePath('/audit');
  return { success: true, booking: updatedBooking };
}

export async function returnAction(
  profileIdOrEmail: string, 
  bookingId: string, 
  conditionNotes: string,
  checklist?: InspectionChecklist
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const updatedBooking = campusStore.returnResource(actor, bookingId, conditionNotes, checklist);

  const isConnected = await isSupabaseDbConnected();
  if (isConnected) {
    await updateSupabaseBooking(bookingId, {
      status: 'completed',
      return_condition_notes: updatedBooking.return_condition_notes,
      return_checklist: updatedBooking.return_checklist,
      returned_at: updatedBooking.returned_at,
      updated_at: updatedBooking.updated_at,
    });
    const latestAudit = campusStore.getAuditLogs()[0];
    if (latestAudit) await insertSupabaseAuditLog(latestAudit);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/audit');
  return { success: true, booking: updatedBooking };
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
