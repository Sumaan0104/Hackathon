import { 
  Booking, 
  BookingStatus, 
  Resource, 
  Profile, 
  IncidentReport, 
  AuditLogEntry, 
  UserRole 
} from './types';
import { 
  MOCK_PROFILES, 
  MOCK_RESOURCES, 
  MOCK_BOOKINGS, 
  MOCK_INCIDENTS, 
  MOCK_AUDIT_LOGS 
} from './mock-data';

// Server-side in-memory repository (initialized with rich fictional college data)
// In production with Supabase connected, this syncs and mirrors DB state.
class CampusShareStore {
  private profiles: Map<string, Profile> = new Map();
  private resources: Map<string, Resource> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private incidents: Map<string, IncidentReport> = new Map();
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    Object.values(MOCK_PROFILES).forEach((p) => this.profiles.set(p.id, { ...p }));
    MOCK_RESOURCES.forEach((r) => this.resources.set(r.id, { ...r }));
    MOCK_BOOKINGS.forEach((b) => this.bookings.set(b.id, { ...b }));
    MOCK_INCIDENTS.forEach((inc) => this.incidents.set(inc.id, { ...inc }));
    this.auditLogs = [...MOCK_AUDIT_LOGS];
  }

  // --- Profiles ---
  getProfile(id: string): Profile | undefined {
    return this.profiles.get(id);
  }

  getAllProfiles(): Profile[] {
    return Array.from(this.profiles.values());
  }

  // --- Resources ---
  getResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  getResource(id: string): Resource | undefined {
    return this.resources.get(id);
  }

  addResource(actor: Profile, resourceData: Omit<Resource, 'id' | 'created_at' | 'owner_id' | 'owner_name' | 'owner_department'>): Resource {
    // Server Role Check: only owner, manager, or admin can list resources
    if (!['owner', 'manager', 'admin'].includes(actor.role)) {
      throw new Error('Unauthorized: Only resource owners, managers, or admins can list resources.');
    }

    const newResource: Resource = {
      ...resourceData,
      id: `res-${Date.now()}`,
      owner_id: actor.id,
      owner_name: actor.full_name,
      owner_department: actor.department,
      created_at: new Date().toISOString(),
    };

    this.resources.set(newResource.id, newResource);

    // Audit log
    this.logAction(actor, 'RESOURCE_CREATED', 'resource', newResource.id, {
      name: newResource.name,
      type: newResource.type,
      location: newResource.location,
    });

    return newResource;
  }

  // --- Bookings & Validation Rules ---

  /**
   * Calculates the total hours a user has booked in the given target week.
   * Only approved, pending, checked_in, and completed bookings count towards weekly cap.
   */
  getUserWeeklyBookedHours(userId: string, targetDateStr: string, excludeBookingId?: string): number {
    const targetDate = new Date(targetDateStr);
    
    // Determine start and end of the ISO week (Monday to Sunday)
    const day = targetDate.getUTCDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const weekStart = new Date(targetDate);
    weekStart.setUTCDate(targetDate.getUTCDate() + diffToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

    let totalHours = 0;
    this.bookings.forEach((b) => {
      if (b.user_id !== userId) return;
      if (excludeBookingId && b.id === excludeBookingId) return;
      if (['rejected', 'cancelled', 'waitlisted'].includes(b.status)) return;

      const bStart = new Date(b.start_time);
      if (bStart >= weekStart && bStart < weekEnd) {
        totalHours += b.duration_hours;
      }
    });

    return totalHours;
  }

  /**
   * Checks for schedule clashes with existing approved or checked-in bookings for a resource.
   */
  hasBookingClash(resourceId: string, startTimeStr: string, endTimeStr: string, excludeBookingId?: string): boolean {
    const start = new Date(startTimeStr).getTime();
    const end = new Date(endTimeStr).getTime();

    for (const b of this.bookings.values()) {
      if (b.resource_id !== resourceId) continue;
      if (excludeBookingId && b.id === excludeBookingId) continue;
      if (!['approved', 'checked_in'].includes(b.status)) continue;

      const bStart = new Date(b.start_time).getTime();
      const bEnd = new Date(b.end_time).getTime();

      // Check overlap: (StartA < EndB) and (EndA > StartB)
      if (start < bEnd && end > bStart) {
        return true;
      }
    }
    return false;
  }

  /**
   * Request a booking.
   * Enforces weekly cap, checks clashes, and records to audit log.
   */
  requestBooking(
    actor: Profile, 
    resourceId: string, 
    startTime: string, 
    endTime: string, 
    purpose: string
  ): { booking: Booking; waitlisted: boolean; warning?: string } {
    const resource = this.resources.get(resourceId);
    if (!resource) throw new Error('Resource not found.');
    if (!resource.is_active) throw new Error('Resource is currently inactive.');

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid start or end date format.');
    }
    if (end <= start) {
      throw new Error('End time must be after start time.');
    }

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0) {
      throw new Error('Booking duration must be greater than zero.');
    }

    // Weekly hours cap check (default 6h)
    const currentWeekHours = this.getUserWeeklyBookedHours(actor.id, startTime);
    const userCap = actor.weekly_hours_cap ?? 6.0;

    if (currentWeekHours + durationHours > userCap) {
      throw new Error(
        `Weekly hours cap exceeded. You currently have ${currentWeekHours.toFixed(1)}h booked this week. Requesting ${durationHours.toFixed(1)}h would exceed your weekly cap of ${userCap}h.`
      );
    }

    // Check clash
    const clash = this.hasBookingClash(resourceId, startTime, endTime);

    // Initial status: if clash exists, system flags waitlist option; otherwise pending owner review
    const initialStatus: BookingStatus = clash ? 'waitlisted' : 'pending';
    const statusReason = clash 
      ? 'Automatically placed on waitlist due to time clash with an approved booking. Ordered by least recent use.'
      : undefined;

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      resource_id: resourceId,
      resource,
      user_id: actor.id,
      user_name: actor.full_name,
      user_email: actor.email,
      start_time: startTime,
      end_time: endTime,
      duration_hours: durationHours,
      purpose,
      status: initialStatus,
      status_reason: statusReason,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.bookings.set(newBooking.id, newBooking);

    // Audit log
    this.logAction(actor, 'BOOKING_REQUESTED', 'booking', newBooking.id, {
      resource_id: resourceId,
      resource_name: resource.name,
      duration_hours: durationHours,
      weekly_hours_before: currentWeekHours,
      status: initialStatus,
    });

    return { 
      booking: newBooking, 
      waitlisted: clash, 
      warning: clash ? 'Time slot clashes with another booking. You have been placed on the waitlist.' : undefined 
    };
  }

  /**
   * Owner decision: approve, reject, or waitlist.
   * RULE: Every approve/reject/waitlist needs a written reason shown to the user.
   * RULE: Owners make final decisions. All role checks happen on the server.
   */
  updateBookingDecision(
    actor: Profile,
    bookingId: string,
    decision: 'approved' | 'rejected' | 'waitlisted',
    writtenReason: string
  ): Booking {
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking not found.');

    const resource = this.resources.get(booking.resource_id);
    if (!resource) throw new Error('Resource not found.');

    // Server-side Role Check: Must be the resource owner, a manager, or admin
    const isOwner = resource.owner_id === actor.id;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);
    if (!isOwner && !isPrivileged) {
      throw new Error('Unauthorized: Only the resource owner or an administrator can make decisions on this booking.');
    }

    // RULE: Written reason is strictly required
    if (!writtenReason || writtenReason.trim().length < 5) {
      throw new Error('A written reason of at least 5 characters is required for all approve, reject, or waitlist decisions.');
    }

    // If approving, verify again no clash exists
    if (decision === 'approved') {
      const clash = this.hasBookingClash(booking.resource_id, booking.start_time, booking.end_time, booking.id);
      if (clash) {
        throw new Error('Cannot approve booking: There is a time clash with another already approved booking.');
      }
    }

    booking.status = decision;
    booking.status_reason = writtenReason.trim();
    booking.status_updated_at = new Date().toISOString();
    booking.status_updated_by = actor.id;
    booking.updated_at = new Date().toISOString();

    this.bookings.set(booking.id, booking);

    // Audit log
    const actionName = decision === 'approved' ? 'BOOKING_APPROVED' : decision === 'rejected' ? 'BOOKING_REJECTED' : 'BOOKING_WAITLISTED';
    this.logAction(actor, actionName, 'booking', booking.id, {
      decision,
      writtenReason: booking.status_reason,
      borrower_id: booking.user_id,
      borrower_name: booking.user_name,
    });

    return booking;
  }

  /**
   * Check-in with condition notes.
   * Borrower or Owner confirms arrival and inspects condition before usage.
   */
  checkIn(actor: Profile, bookingId: string, conditionNotes: string): Booking {
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking not found.');

    if (booking.status !== 'approved') {
      throw new Error(`Cannot check in: Booking is currently '${booking.status}', must be 'approved'.`);
    }

    const resource = this.resources.get(booking.resource_id);
    const isBorrower = booking.user_id === actor.id;
    const isOwner = resource?.owner_id === actor.id;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);

    if (!isBorrower && !isOwner && !isPrivileged) {
      throw new Error('Unauthorized to perform check-in.');
    }

    if (!conditionNotes || conditionNotes.trim().length < 3) {
      throw new Error('Please provide initial check-in condition notes (e.g. equipment state, cleanliness).');
    }

    booking.status = 'checked_in';
    booking.checked_in_at = new Date().toISOString();
    booking.checkin_condition_notes = conditionNotes.trim();
    booking.updated_at = new Date().toISOString();

    this.bookings.set(booking.id, booking);

    this.logAction(actor, 'BOOKING_CHECKED_IN', 'booking', booking.id, {
      checkin_notes: booking.checkin_condition_notes,
    });

    return booking;
  }

  /**
   * Return with condition notes.
   * Records final inspection, condition notes, and completes the booking.
   */
  returnResource(actor: Profile, bookingId: string, conditionNotes: string): Booking {
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking not found.');

    if (booking.status !== 'checked_in') {
      throw new Error(`Cannot return: Booking must be 'checked_in' first.`);
    }

    const resource = this.resources.get(booking.resource_id);
    const isBorrower = booking.user_id === actor.id;
    const isOwner = resource?.owner_id === actor.id;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);

    if (!isBorrower && !isOwner && !isPrivileged) {
      throw new Error('Unauthorized to record resource return.');
    }

    if (!conditionNotes || conditionNotes.trim().length < 3) {
      throw new Error('Please provide return condition notes (e.g. returned clean, all accessories verified).');
    }

    booking.status = 'completed';
    booking.returned_at = new Date().toISOString();
    booking.return_condition_notes = conditionNotes.trim();
    booking.updated_at = new Date().toISOString();

    this.bookings.set(booking.id, booking);

    this.logAction(actor, 'BOOKING_RETURNED', 'booking', booking.id, {
      return_notes: booking.return_condition_notes,
    });

    return booking;
  }

  /**
   * Report delay, damage, or incident.
   * RULE: No automated penalties. Owners make final decisions.
   */
  reportIncident(actor: Profile, bookingId: string, type: 'delay' | 'damage' | 'incident', description: string): IncidentReport {
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking not found.');

    const resource = this.resources.get(booking.resource_id);
    const isBorrower = booking.user_id === actor.id;
    const isOwner = resource?.owner_id === actor.id;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);

    if (!isBorrower && !isOwner && !isPrivileged) {
      throw new Error('Unauthorized: Only parties involved or admins can log an incident report.');
    }

    if (!description || description.trim().length < 5) {
      throw new Error('Please provide a descriptive incident summary of at least 5 characters.');
    }

    const incident: IncidentReport = {
      id: `inc-${Date.now()}`,
      booking_id: bookingId,
      resource_name: resource?.name,
      reported_by: actor.id,
      reporter_name: actor.full_name,
      reporter_role: actor.role,
      type,
      description: description.trim(),
      created_at: new Date().toISOString(),
    };

    this.incidents.set(incident.id, incident);

    this.logAction(actor, 'INCIDENT_REPORTED', 'incident', incident.id, {
      booking_id: bookingId,
      incident_type: type,
      description: incident.description,
      note: 'Logged for review. No automated penalty applied.',
    });

    return incident;
  }

  // --- Waitlist Ordered by Least Recent Use ---
  /**
   * Retrieves waitlisted bookings for a resource ordered by least recent use:
   * Users who have either NEVER used the resource (or platform) or haven't used it for the longest time
   * appear at the top of the priority queue.
   */
  getWaitlistByLeastRecentUse(resourceId: string): Array<Booking & { lastUsedAt: string | null; priorityScore: number }> {
    const waitlisted = Array.from(this.bookings.values()).filter(
      (b) => b.resource_id === resourceId && b.status === 'waitlisted'
    );

    // Compute last completed/checked_in booking timestamp for each user
    return waitlisted.map((b) => {
      let lastUsageTime: number = 0; // 0 means never used = highest priority
      let lastUsageIso: string | null = null;

      this.bookings.forEach((otherB) => {
        if (otherB.user_id === b.user_id && ['completed', 'checked_in'].includes(otherB.status) && otherB.id !== b.id) {
          const t = new Date(otherB.start_time).getTime();
          if (t > lastUsageTime) {
            lastUsageTime = t;
            lastUsageIso = otherB.start_time;
          }
        }
      });

      return {
        ...b,
        lastUsedAt: lastUsageIso,
        priorityScore: lastUsageTime,
      };
    }).sort((a, b) => a.priorityScore - b.priorityScore); // ascending: 0 (never used) first!
  }

  // --- Bookings Query ---
  getBookings(): Booking[] {
    return Array.from(this.bookings.values()).map((b) => ({
      ...b,
      resource: this.resources.get(b.resource_id),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getIncidents(): IncidentReport[] {
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  private logAction(
    actor: Profile, 
    action: string, 
    targetType: 'resource' | 'booking' | 'incident' | 'profile', 
    targetId: string, 
    details: Record<string, any>
  ) {
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actor_id: actor.id,
      actor_name: actor.full_name,
      actor_role: actor.role,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);
  }
}

// Global singleton instance on server
declare global {
  var __campusShareStore: CampusShareStore | undefined;
}

export const campusStore = global.__campusShareStore ?? new CampusShareStore();
if (process.env.NODE_ENV !== 'production') {
  global.__campusShareStore = campusStore;
}
