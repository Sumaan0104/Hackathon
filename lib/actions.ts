'use server';

import { campusStore } from './store';
import { Resource, UserRole, Booking, IncidentReport, AuditLogEntry, Profile, InspectionChecklist, IncidentSeverity, IncidentType } from './types';
import { revalidatePath } from 'next/cache';
import { createClient as createServerSupabase } from './supabase/server';

export async function getProfileServer(profileIdOrEmail: string): Promise<Profile> {
  // First, check if there's an active Supabase Auth user session from cookies
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
      let p = campusStore.getProfileByEmail(user.email);
      if (!p) {
        // Register or sync user profile
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
    // If Supabase session is unavailable or cookies not set, fall back to store lookup
  }

  // Lookup in store by ID or by Email
  let profile = campusStore.getProfile(profileIdOrEmail) || campusStore.getProfileByEmail(profileIdOrEmail);
  if (!profile) {
    // Check all profiles
    const all = campusStore.getAllProfiles();
    profile = all.find(p => p.id === profileIdOrEmail || p.email.toLowerCase() === profileIdOrEmail.toLowerCase());
  }

  if (!profile) {
    throw new Error(`Server Authentication: Profile record '${profileIdOrEmail}' not found.`);
  }
  return profile;
}

export async function fetchAllData(profileIdOrEmail: string = 'user-1') {
  const currentProfile = await getProfileServer(profileIdOrEmail);
  const resources = campusStore.getResources();
  const bookings = campusStore.getBookings();
  const incidents = campusStore.getIncidents();
  const auditLogs = campusStore.getAuditLogs();
  const profiles = campusStore.getAllProfiles();

  // Weekly hours booked calculation on server
  const weeklyHours = campusStore.getUserWeeklyBookedHours(currentProfile.id, new Date().toISOString());

  return {
    currentProfile,
    resources,
    bookings,
    incidents,
    auditLogs,
    profiles,
    weeklyHours,
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
  const result = campusStore.requestBooking(actor, resourceId, startTime, endTime, purpose);
  revalidatePath('/');
  revalidatePath('/bookings');
  return { 
    success: true, 
    booking: result.booking, 
    waitlisted: result.waitlisted, 
    warning: result.warning,
    clashingWith: result.clashingWith
  };
}

export async function updateBookingDecisionAction(
  profileIdOrEmail: string,
  bookingId: string,
  decision: 'approved' | 'rejected' | 'waitlisted',
  writtenReason: string
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const updatedBooking = campusStore.updateBookingDecision(actor, bookingId, decision, writtenReason);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/audit');
  return { success: true, booking: updatedBooking };
}

export async function checkInAction(
  profileIdOrEmail: string, 
  bookingId: string, 
  conditionNotes: string,
  checklist?: InspectionChecklist
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const updatedBooking = campusStore.checkIn(actor, bookingId, conditionNotes, checklist);
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
    specs?: string[];
    available_hours?: string;
    safety_tier?: number;
  }
) {
  const actor = await getProfileServer(profileIdOrEmail);
  const newResource = campusStore.addResource(actor, {
    ...resourceData,
    required_certifications: resourceData.required_certifications || [],
  });
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
