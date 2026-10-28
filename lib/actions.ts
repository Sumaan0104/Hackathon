'use server';

import { campusStore } from './store';
import { Resource, UserRole, Booking, IncidentReport, AuditLogEntry, Profile } from './types';
import { revalidatePath } from 'next/cache';

/**
 * Server-side profile resolution.
 * All role checks happen strictly on the server!
 */
export async function getProfileServer(profileId: string): Promise<Profile> {
  const profile = campusStore.getProfile(profileId);
  if (!profile) {
    throw new Error('Profile not found on server.');
  }
  return profile;
}

export async function fetchAllData(profileId: string = 'user-1') {
  const currentProfile = campusStore.getProfile(profileId) || campusStore.getAllProfiles()[0];
  const resources = campusStore.getResources();
  const bookings = campusStore.getBookings();
  const incidents = campusStore.getIncidents();
  const auditLogs = campusStore.getAuditLogs();
  const profiles = campusStore.getAllProfiles();

  // Calculate current user's weekly booked hours
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
  profileId: string,
  resourceId: string,
  startTime: string,
  endTime: string,
  purpose: string
) {
  const actor = await getProfileServer(profileId);
  const result = campusStore.requestBooking(actor, resourceId, startTime, endTime, purpose);
  revalidatePath('/');
  revalidatePath('/bookings');
  return { success: true, booking: result.booking, waitlisted: result.waitlisted, warning: result.warning };
}

export async function updateBookingDecisionAction(
  profileId: string,
  bookingId: string,
  decision: 'approved' | 'rejected' | 'waitlisted',
  writtenReason: string
) {
  const actor = await getProfileServer(profileId);
  // Server-side check
  const updatedBooking = campusStore.updateBookingDecision(actor, bookingId, decision, writtenReason);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/audit');
  return { success: true, booking: updatedBooking };
}

export async function checkInAction(profileId: string, bookingId: string, conditionNotes: string) {
  const actor = await getProfileServer(profileId);
  const updatedBooking = campusStore.checkIn(actor, bookingId, conditionNotes);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/audit');
  return { success: true, booking: updatedBooking };
}

export async function returnAction(profileId: string, bookingId: string, conditionNotes: string) {
  const actor = await getProfileServer(profileId);
  const updatedBooking = campusStore.returnResource(actor, bookingId, conditionNotes);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/audit');
  return { success: true, booking: updatedBooking };
}

export async function reportIncidentAction(
  profileId: string,
  bookingId: string,
  type: 'delay' | 'damage' | 'incident',
  description: string
) {
  const actor = await getProfileServer(profileId);
  const report = campusStore.reportIncident(actor, bookingId, type, description);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/incidents');
  revalidatePath('/audit');
  return { success: true, incident: report };
}

export async function createResourceAction(
  profileId: string,
  resourceData: {
    name: string;
    description: string;
    type: 'lab' | 'equipment' | 'space';
    location: string;
    capacity: number;
    eligibility_requirements: string;
    is_active: boolean;
  }
) {
  const actor = await getProfileServer(profileId);
  const newResource = campusStore.addResource(actor, resourceData);
  revalidatePath('/');
  revalidatePath('/resources');
  revalidatePath('/audit');
  return { success: true, resource: newResource };
}

export async function getWaitlistQueueAction(resourceId: string) {
  return campusStore.getWaitlistByLeastRecentUse(resourceId);
}
