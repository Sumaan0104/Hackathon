import { 
  Booking, 
  BookingStatus, 
  Resource, 
  Profile, 
  IncidentReport, 
  AuditLogEntry, 
  UserRole,
  InspectionChecklist,
  IncidentType,
  IncidentSeverity
} from './types';
import { 
  MOCK_PROFILES, 
  MOCK_RESOURCES, 
  MOCK_BOOKINGS, 
  MOCK_INCIDENTS, 
  MOCK_AUDIT_LOGS 
} from './mock-data';

class CampusShareStore {
  private profiles: Map<string, Profile> = new Map();
  private resources: Map<string, Resource> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private incidents: Map<string, IncidentReport> = new Map();
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.seed();
  }

  public seed() {
    this.profiles.clear();
    this.resources.clear();
    this.bookings.clear();
    this.incidents.clear();
    this.auditLogs = [];

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

  addResource(
    actor: Profile, 
    resourceData: Omit<Resource, 'id' | 'created_at' | 'owner_id' | 'owner_name' | 'owner_department'>
  ): Resource {
    if (!['owner', 'manager', 'admin'].includes(actor.role)) {
      throw new Error('Unauthorized: Server role policy permits only owner, manager, or admin roles to list resources.');
    }

    const newResource: Resource = {
      ...resourceData,
      id: `res-${Date.now()}`,
      owner_id: actor.id,
      owner_name: actor.full_name,
      owner_department: actor.department,
      utilization_rate: 0,
      created_at: new Date().toISOString(),
    };

    this.resources.set(newResource.id, newResource);

    this.logAction(actor, 'RESOURCE_CREATED', 'resource', newResource.id, {
      name: newResource.name,
      type: newResource.type,
      location: newResource.location,
      capacity: newResource.capacity,
    });

    return newResource;
  }

  // --- Bookings & Validation Rules ---

  getUserWeeklyBookedHours(userId: string, targetDateStr: string, excludeBookingId?: string): number {
    const targetDate = new Date(targetDateStr);
    
    // ISO week calculation (Monday to Sunday)
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

  findBookingClash(resourceId: string, startTimeStr: string, endTimeStr: string, excludeBookingId?: string): Booking | null {
    const start = new Date(startTimeStr).getTime();
    const end = new Date(endTimeStr).getTime();

    for (const b of this.bookings.values()) {
      if (b.resource_id !== resourceId) continue;
      if (excludeBookingId && b.id === excludeBookingId) continue;
      if (!['approved', 'checked_in'].includes(b.status)) continue;

      const bStart = new Date(b.start_time).getTime();
      const bEnd = new Date(b.end_time).getTime();

      // Overlap: (StartA < EndB) && (EndA > StartB)
      if (start < bEnd && end > bStart) {
        return b;
      }
    }
    return null;
  }

  requestBooking(
    actor: Profile, 
    resourceId: string, 
    startTime: string, 
    endTime: string, 
    purpose: string
  ): { booking: Booking; waitlisted: boolean; warning?: string; clashingWith?: string } {
    const resource = this.resources.get(resourceId);
    if (!resource) throw new Error('Resource not found.');
    if (!resource.is_active) throw new Error('Resource is currently inactive for maintenance.');

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date-time format provided.');
    }
    if (end <= start) {
      throw new Error('End time must be after start time.');
    }

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0) {
      throw new Error('Booking duration must be greater than zero.');
    }

    // Weekly cap enforcement (default 6.0h)
    const currentWeekHours = this.getUserWeeklyBookedHours(actor.id, startTime);
    const userCap = actor.weekly_hours_cap ?? 6.0;

    if (currentWeekHours + durationHours > userCap) {
      throw new Error(
        `Weekly quota exceeded: You have ${currentWeekHours.toFixed(1)}h booked this week. Requesting ${durationHours.toFixed(1)}h would exceed your quota of ${userCap}h.`
      );
    }

    // Clash detection
    const clashingBooking = this.findBookingClash(resourceId, startTime, endTime);
    const clash = !!clashingBooking;

    const initialStatus: BookingStatus = clash ? 'waitlisted' : 'pending';
    const statusReason = clash 
      ? `Auto-routed to Fair-Access Waitlist: Time slot conflicts with scheduled session (${new Date(clashingBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(clashingBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Ordered by least recent use.`
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
      duration_hours: Number(durationHours.toFixed(1)),
      purpose,
      status: initialStatus,
      status_reason: statusReason,
      clash_detected: clash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.bookings.set(newBooking.id, newBooking);

    this.logAction(actor, 'BOOKING_REQUESTED', 'booking', newBooking.id, {
      resource_id: resourceId,
      resource_name: resource.name,
      duration_hours: durationHours,
      weekly_hours_prior: currentWeekHours,
      status: initialStatus,
      clash_detected: clash,
    });

    return { 
      booking: newBooking, 
      waitlisted: clash, 
      warning: clash ? `Slot conflicts with an approved booking. You've been placed on the Fair-Access Waitlist.` : undefined,
      clashingWith: clashingBooking ? clashingBooking.user_name : undefined
    };
  }

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

    // Server Role Check
    const isOwner = resource.owner_id === actor.id;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);
    if (!isOwner && !isPrivileged) {
      throw new Error('Unauthorized: Only resource owners, managers, or admins can authorize booking decisions.');
    }

    // MANDATORY RULE: Written reason required
    if (!writtenReason || writtenReason.trim().length < 5) {
      throw new Error('Compliance Violation: Every approve, reject, or waitlist decision must provide a written reason of at least 5 characters shown to the borrower.');
    }

    if (decision === 'approved') {
      const clash = this.findBookingClash(booking.resource_id, booking.start_time, booking.end_time, booking.id);
      if (clash) {
        throw new Error(`Conflict Detected: Cannot approve because this slot overlaps with an approved booking by ${clash.user_name}.`);
      }
    }

    booking.status = decision;
    booking.status_reason = writtenReason.trim();
    booking.status_updated_at = new Date().toISOString();
    booking.status_updated_by = actor.id;
    booking.updated_at = new Date().toISOString();

    this.bookings.set(booking.id, booking);

    const actionName = decision === 'approved' ? 'BOOKING_APPROVED' : decision === 'rejected' ? 'BOOKING_REJECTED' : 'BOOKING_WAITLISTED';
    this.logAction(actor, actionName, 'booking', booking.id, {
      decision,
      written_reason: booking.status_reason,
      borrower_id: booking.user_id,
      borrower_name: booking.user_name,
    });

    return booking;
  }

  checkIn(
    actor: Profile, 
    bookingId: string, 
    conditionNotes: string, 
    checklist?: InspectionChecklist
  ): Booking {
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking not found.');

    if (booking.status !== 'approved') {
      throw new Error(`Invalid lifecycle state: Booking status is '${booking.status}', must be 'approved' to check in.`);
    }

    const resource = this.resources.get(booking.resource_id);
    const isBorrower = booking.user_id === actor.id;
    const isOwner = resource?.owner_id === actor.id;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);

    if (!isBorrower && !isOwner && !isPrivileged) {
      throw new Error('Unauthorized: Only the borrower, facility owner, or administrators can check in.');
    }

    if (!conditionNotes || conditionNotes.trim().length < 3) {
      throw new Error('Physical condition inspection notes are mandatory upon arrival.');
    }

    booking.status = 'checked_in';
    booking.checked_in_at = new Date().toISOString();
    booking.checkin_condition_notes = conditionNotes.trim();
    booking.checkin_checklist = checklist || {
      physicalChecked: true,
      cleanlinessVerified: true,
      safetySecured: true,
      accessoriesPresent: true,
    };
    booking.updated_at = new Date().toISOString();

    this.bookings.set(booking.id, booking);

    this.logAction(actor, 'BOOKING_CHECKED_IN', 'booking', booking.id, {
      condition_notes: booking.checkin_condition_notes,
      checklist: booking.checkin_checklist,
    });

    return booking;
  }

  returnResource(
    actor: Profile, 
    bookingId: string, 
    conditionNotes: string, 
    checklist?: InspectionChecklist
  ): Booking {
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking not found.');

    if (booking.status !== 'checked_in') {
      throw new Error(`Invalid lifecycle state: Booking must be in 'checked_in' state to record departure return.`);
    }

    const resource = this.resources.get(booking.resource_id);
    const isBorrower = booking.user_id === actor.id;
    const isOwner = resource?.owner_id === actor.id;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);

    if (!isBorrower && !isOwner && !isPrivileged) {
      throw new Error('Unauthorized to record resource return.');
    }

    if (!conditionNotes || conditionNotes.trim().length < 3) {
      throw new Error('Final return condition notes are mandatory upon departure.');
    }

    booking.status = 'completed';
    booking.returned_at = new Date().toISOString();
    booking.return_condition_notes = conditionNotes.trim();
    booking.return_checklist = checklist || {
      physicalChecked: true,
      cleanlinessVerified: true,
      safetySecured: true,
      accessoriesPresent: true,
    };
    booking.updated_at = new Date().toISOString();

    this.bookings.set(booking.id, booking);

    this.logAction(actor, 'BOOKING_RETURNED', 'booking', booking.id, {
      return_notes: booking.return_condition_notes,
      checklist: booking.return_checklist,
    });

    return booking;
  }

  reportIncident(
    actor: Profile, 
    bookingId: string, 
    type: IncidentType, 
    severity: IncidentSeverity,
    description: string
  ): IncidentReport {
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking not found.');

    const resource = this.resources.get(booking.resource_id);
    const isBorrower = booking.user_id === actor.id;
    const isOwner = resource?.owner_id === actor.id;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);

    if (!isBorrower && !isOwner && !isPrivileged) {
      throw new Error('Unauthorized to report incidents on this booking.');
    }

    if (!description || description.trim().length < 5) {
      throw new Error('Detailed description of at least 5 characters is required.');
    }

    const incident: IncidentReport = {
      id: `inc-${Date.now()}`,
      booking_id: bookingId,
      resource_name: resource?.name,
      reported_by: actor.id,
      reporter_name: actor.full_name,
      reporter_role: actor.role,
      type,
      severity,
      status: 'acknowledged',
      description: description.trim(),
      created_at: new Date().toISOString(),
    };

    this.incidents.set(incident.id, incident);

    this.logAction(actor, 'INCIDENT_REPORTED', 'incident', incident.id, {
      booking_id: bookingId,
      incident_type: type,
      severity,
      description: incident.description,
      governance_policy: 'Logged for review. No automated penalties applied.',
    });

    return incident;
  }

  getWaitlistByLeastRecentUse(resourceId: string): Array<Booking & { lastUsedAt: string | null; priorityScore: number }> {
    const waitlisted = Array.from(this.bookings.values()).filter(
      (b) => b.resource_id === resourceId && b.status === 'waitlisted'
    );

    return waitlisted.map((b) => {
      let lastUsageTime: number = 0;
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
    }).sort((a, b) => a.priorityScore - b.priorityScore);
  }

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

declare global {
  var __campusShareStore: CampusShareStore | undefined;
}

export const campusStore = global.__campusShareStore ?? new CampusShareStore();
if (process.env.NODE_ENV !== 'production') {
  global.__campusShareStore = campusStore;
}
