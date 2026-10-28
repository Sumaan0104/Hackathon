import fs from 'fs';
import path from 'path';
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
  IncidentSeverity,
  ConditionRating,
  InAppNotification
} from './types';
import { 
  MOCK_PROFILES, 
  MOCK_RESOURCES, 
  MOCK_BOOKINGS, 
  MOCK_INCIDENTS, 
  MOCK_AUDIT_LOGS 
} from './mock-data';

const DB_FILE_DIR = path.join(process.cwd(), '.data');
const DB_FILE_PATH = path.join(DB_FILE_DIR, 'shared_db.json');

interface PersistedState {
  profiles: Record<string, Profile>;
  resources: Resource[];
  bookings: Booking[];
  incidents: IncidentReport[];
  auditLogs: AuditLogEntry[];
  notifications?: InAppNotification[];
}

export interface BookingValidationResult {
  success: boolean;
  clash: boolean;
  booking?: Booking;
  conflictingSlot?: {
    start: string;
    end: string;
    userName: string;
  };
  warning?: string;
}

class CampusShareStore {
  private profiles: Map<string, Profile> = new Map();
  private resources: Map<string, Resource> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private incidents: Map<string, IncidentReport> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private notifications: Map<string, InAppNotification> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    if (this.loadFromDisk()) {
      return;
    }
    this.seed();
    this.saveToDisk();
  }

  private loadFromDisk(): boolean {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const data: PersistedState = JSON.parse(raw);
        
        this.profiles.clear();
        this.resources.clear();
        this.bookings.clear();
        this.incidents.clear();
        this.notifications.clear();

        Object.values(data.profiles).forEach((p) => this.profiles.set(p.id, p));
        data.resources.forEach((r) => this.resources.set(r.id, r));
        data.bookings.forEach((b) => this.bookings.set(b.id, b));
        data.incidents.forEach((inc) => this.incidents.set(inc.id, inc));
        this.auditLogs = data.auditLogs || [];
        (data.notifications || []).forEach((n) => this.notifications.set(n.id, n));

        // Ensure user-2 exists in loaded profiles
        if (!this.profiles.has('user-2')) {
          this.profiles.set('user-2', MOCK_PROFILES['user-2']);
        }

        // Ensure resources have open_time / close_time / max_hours_per_booking
        data.resources.forEach((r) => {
          const mock = MOCK_RESOURCES.find(m => m.id === r.id);
          if (mock) {
            r.open_time = r.open_time || mock.open_time;
            r.close_time = r.close_time || mock.close_time;
            r.max_hours_per_booking = r.max_hours_per_booking || mock.max_hours_per_booking;
            r.required_certifications = r.required_certifications || mock.required_certifications;
          }
        });

        this.saveToDisk();
        return true;
      }
    } catch (e) {
      console.warn('Could not load shared_db.json, re-seeding...', e);
    }
    return false;
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(DB_FILE_DIR)) {
        fs.mkdirSync(DB_FILE_DIR, { recursive: true });
      }
      const data: PersistedState = {
        profiles: Object.fromEntries(this.profiles.entries()),
        resources: Array.from(this.resources.values()),
        bookings: Array.from(this.bookings.values()),
        incidents: Array.from(this.incidents.values()),
        auditLogs: this.auditLogs,
        notifications: Array.from(this.notifications.values()),
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not write to shared_db.json:', e);
    }
  }

  public seed() {
    this.profiles.clear();
    this.resources.clear();
    this.bookings.clear();
    this.incidents.clear();
    this.notifications.clear();
    this.auditLogs = [];

    Object.values(MOCK_PROFILES).forEach((p) => this.profiles.set(p.id, { ...p }));
    MOCK_RESOURCES.forEach((r) => this.resources.set(r.id, { ...r }));
    MOCK_BOOKINGS.forEach((b) => this.bookings.set(b.id, { ...b }));
    MOCK_INCIDENTS.forEach((inc) => this.incidents.set(inc.id, { ...inc }));
    this.auditLogs = [...MOCK_AUDIT_LOGS];

    this.saveToDisk();
  }

  public syncFromSupabase(
    profiles?: Profile[],
    resources?: Resource[],
    bookings?: Booking[],
    incidents?: IncidentReport[],
    auditLogs?: AuditLogEntry[]
  ) {
    if (profiles && profiles.length > 0) {
      profiles.forEach((p) => this.profiles.set(p.id, p));
    }
    if (resources && resources.length > 0) {
      resources.forEach((r) => this.resources.set(r.id, r));
    }
    if (bookings && bookings.length > 0) {
      bookings.forEach((b) => this.bookings.set(b.id, b));
    }
    if (incidents && incidents.length > 0) {
      incidents.forEach((inc) => this.incidents.set(inc.id, inc));
    }
    if (auditLogs && auditLogs.length > 0) {
      this.auditLogs = auditLogs;
    }
    this.saveToDisk();
  }

  // --- Profiles ---
  getProfile(id: string): Profile | undefined {
    this.loadFromDisk();
    return this.profiles.get(id);
  }

  getProfileByEmail(email: string): Profile | undefined {
    this.loadFromDisk();
    for (const p of this.profiles.values()) {
      if (p.email.toLowerCase() === email.toLowerCase()) {
        return p;
      }
    }
    return undefined;
  }

  upsertProfile(profile: Profile): Profile {
    this.profiles.set(profile.id, profile);
    this.saveToDisk();
    return profile;
  }

  getAllProfiles(): Profile[] {
    this.loadFromDisk();
    return Array.from(this.profiles.values());
  }

  // --- Resources ---
  getResources(): Resource[] {
    this.loadFromDisk();
    return Array.from(this.resources.values());
  }

  getResource(id: string): Resource | undefined {
    this.loadFromDisk();
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
      open_time: resourceData.open_time || '08:00',
      close_time: resourceData.close_time || '20:00',
      max_hours_per_booking: resourceData.max_hours_per_booking || 4.0,
      required_certifications: resourceData.required_certifications || [],
      created_at: new Date().toISOString(),
    };

    this.resources.set(newResource.id, newResource);
    this.logAction(actor, 'RESOURCE_CREATED', 'resource', newResource.id, {
      name: newResource.name,
      type: newResource.type,
      location: newResource.location,
      capacity: newResource.capacity,
    });

    this.saveToDisk();
    return newResource;
  }

  // --- Bookings & Validation Rules ---

  getUserWeeklyBookedHours(userId: string, targetDateStr: string, excludeBookingId?: string): number {
    this.loadFromDisk();
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
    this.loadFromDisk();
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

  /**
   * Internal common validator for a booking slot.
   * Validates:
   * 1. Date/time bounds & logic
   * 2. Operating hours (open_time, close_time)
   * 3. Max hours per booking
   * 4. Eligibility certifications
   * 5. Fair use weekly cap (6h)
   */
  private validateBookingRequest(
    actor: Profile,
    resource: Resource,
    startTime: string,
    endTime: string,
    purpose: string
  ): { start: Date; end: Date; durationHours: number; currentWeekHours: number } {
    if (!resource.is_active) {
      throw new Error('Resource is currently inactive for maintenance.');
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date-time format provided.');
    }
    if (end <= start) {
      throw new Error('End time must be later than start time.');
    }

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0) {
      throw new Error('Booking duration must be greater than zero.');
    }

    // 1. Operating Hours Validation
    const openTime = resource.open_time || '08:00';
    const closeTime = resource.close_time || '20:00';
    
    // Extract HH:mm part from string directly (wall-clock time intended by the user)
    const startTimePart = startTime.includes('T') 
      ? startTime.split('T')[1].substring(0, 5) 
      : `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`;
    const endTimePart = endTime.includes('T') 
      ? endTime.split('T')[1].substring(0, 5) 
      : `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`;

    if (startTimePart < openTime || endTimePart > closeTime) {
      const err = `Operating Hours Violation: Booking must fall within facility operating hours (${openTime} to ${closeTime}). Requested: ${startTimePart} to ${endTimePart}.`;
      this.logAction(actor, 'BOOKING_REJECTED', 'resource', resource.id, {
        reason: err,
        requested_slot: { start: startTime, end: endTime },
        operating_hours: { open: openTime, close: closeTime }
      });
      this.saveToDisk();
      throw new Error(err);
    }

    // 2. Max Hours Per Booking
    const maxHours = resource.max_hours_per_booking || 4.0;
    if (durationHours > maxHours) {
      const err = `Duration Limit Violation: Exceeds max allowed booking duration of ${maxHours.toFixed(1)} hours (requested: ${durationHours.toFixed(1)}h).`;
      this.logAction(actor, 'BOOKING_REJECTED', 'resource', resource.id, {
        reason: err,
        requested_duration: durationHours,
        max_allowed: maxHours
      });
      this.saveToDisk();
      throw new Error(err);
    }

    // 3. Strict Eligibility Certificate Gate
    if (resource.required_certifications && resource.required_certifications.length > 0) {
      const userCerts = actor.certifications || [];
      const missingCerts = resource.required_certifications.filter(c => !userCerts.includes(c));

      if (missingCerts.length > 0) {
        const missingStr = missingCerts.join(', ');
        const err = `Eligibility Blocked: You're missing: ${missingStr}.`;
        this.logAction(actor, 'BOOKING_REJECTED', 'resource', resource.id, {
          reason: err,
          missing_certifications: missingCerts,
          user_certifications: userCerts,
        });
        this.saveToDisk();
        throw new Error(err);
      }
    }

    // 4. Fair Use Weekly Cap (6.0h per user)
    const currentWeekHours = this.getUserWeeklyBookedHours(actor.id, startTime);
    const userCap = actor.weekly_hours_cap ?? 6.0;

    if (currentWeekHours + durationHours > userCap) {
      const hoursLeft = Math.max(0, userCap - currentWeekHours);
      const err = `Rule: Weekly cap of ${userCap.toFixed(1)} hours per user. You currently have ${currentWeekHours.toFixed(1)} hours booked this week (${hoursLeft.toFixed(1)} hours left). Requesting ${durationHours.toFixed(1)} hours exceeds your cap.`;
      this.logAction(actor, 'BOOKING_REJECTED', 'booking', resource.id, {
        reason: err,
        currentWeekHours,
        durationHours,
        hoursLeft,
        userCap
      });
      this.saveToDisk();
      throw new Error(err);
    }

    return { start, end, durationHours, currentWeekHours };
  }

  /**
   * Request a booking.
   * Enforces Operating hours, Max hours, Eligibility, Weekly cap, and Clash Detection.
   * If clash occurs: Rejects overlap, logs BOOKING_CLASH_DETECTED, and returns conflicting slot with waitlist offer.
   * If valid: Status is strictly 'pending', logs BOOKING_REQUESTED.
   */
  requestBooking(
    actor: Profile, 
    resourceId: string, 
    startTime: string, 
    endTime: string, 
    purpose: string
  ): BookingValidationResult {
    this.loadFromDisk();
    const resource = this.resources.get(resourceId);
    if (!resource) throw new Error('Resource not found.');

    // Enforce all validations (hours, max duration, eligibility, weekly cap)
    const { durationHours, currentWeekHours } = this.validateBookingRequest(actor, resource, startTime, endTime, purpose);

    // 5. Clash Detection against approved or checked_in bookings
    const clashingBooking = this.findBookingClash(resourceId, startTime, endTime);
    if (clashingBooking) {
      const clashStart = new Date(clashingBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const clashEnd = new Date(clashingBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Log clash to audit_log
      this.logAction(actor, 'BOOKING_CLASH_DETECTED', 'resource', resourceId, {
        requested_slot: { start: startTime, end: endTime },
        conflicting_booking_id: clashingBooking.id,
        conflicting_user: clashingBooking.user_name,
        conflicting_slot: `${clashStart} - ${clashEnd}`,
      });
      this.saveToDisk();

      return {
        success: false,
        clash: true,
        conflictingSlot: {
          start: clashingBooking.start_time,
          end: clashingBooking.end_time,
          userName: clashingBooking.user_name || 'Another Researcher',
        },
        warning: `Conflict: Slot overlaps with an approved booking (${clashStart} – ${clashEnd} by ${clashingBooking.user_name}). You may join the waitlist.`,
      };
    }

    // 6. Valid non-clashing booking: Create with status 'pending'
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
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.bookings.set(newBooking.id, newBooking);

    // Log request to audit_log
    this.logAction(actor, 'BOOKING_REQUESTED', 'booking', newBooking.id, {
      resource_id: resourceId,
      resource_name: resource.name,
      duration_hours: durationHours,
      weekly_hours_prior: currentWeekHours,
      status: 'pending',
    });

    this.saveToDisk();

    return {
      success: true,
      clash: false,
      booking: newBooking,
    };
  }

  /**
   * Join Waitlist:
   * Called when a slot is taken and the user opts to join the waitlist.
   * Enforces all checks, creates booking with status 'waitlisted', logs WAITLIST_JOINED.
   */
  joinWaitlist(
    actor: Profile,
    resourceId: string,
    startTime: string,
    endTime: string,
    purpose: string
  ): Booking {
    this.loadFromDisk();
    const resource = this.resources.get(resourceId);
    if (!resource) throw new Error('Resource not found.');

    const { durationHours, currentWeekHours } = this.validateBookingRequest(actor, resource, startTime, endTime, purpose);

    const waitlistedBooking: Booking = {
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
      status: 'waitlisted',
      status_reason: 'User accepted placement on fair-access waitlist due to schedule conflict. Ordered by least recent use.',
      clash_detected: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.bookings.set(waitlistedBooking.id, waitlistedBooking);

    // Log waitlist join to audit_log
    this.logAction(actor, 'WAITLIST_JOINED', 'booking', waitlistedBooking.id, {
      resource_id: resourceId,
      resource_name: resource.name,
      duration_hours: durationHours,
      weekly_hours_prior: currentWeekHours,
      status: 'waitlisted',
    });

    this.saveToDisk();
    return waitlistedBooking;
  }

  updateBookingDecision(
    actor: Profile,
    bookingId: string,
    decision: 'approved' | 'rejected' | 'waitlisted',
    writtenReason: string
  ): { booking: Booking; waitlistPosition?: number; notification?: InAppNotification } {
    this.loadFromDisk();
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking record not found.');

    const resource = this.resources.get(booking.resource_id);
    if (!resource) throw new Error('Resource facility record not found.');

    // Server Role Check: only owner, manager, or admin can decide
    const isOwner = resource.owner_id === actor.id || resource.owner_name === actor.full_name;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);
    if (!isOwner && !isPrivileged) {
      throw new Error('Unauthorized Access: Server policy permits only facility custodians, managers, or admins to review bookings.');
    }

    // MANDATORY RULE: Written reason required of at least 10 characters
    if (!writtenReason || writtenReason.trim().length < 10) {
      throw new Error(`Compliance Rule Violation: Every approve, reject, or waitlist decision must provide a written justification of at least 10 characters (provided: ${writtenReason ? writtenReason.trim().length : 0} characters).`);
    }

    let waitlistPosition: number | undefined;

    if (decision === 'approved') {
      // 1. Re-check clashes on the server
      const clash = this.findBookingClash(booking.resource_id, booking.start_time, booking.end_time, booking.id);
      if (clash) {
        const clashStart = new Date(clash.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const clashEnd = new Date(clash.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        throw new Error(`Schedule Conflict Detected: Cannot approve because this slot overlaps with an approved booking by ${clash.user_name} (${clashStart} – ${clashEnd}).`);
      }

      // 2. Re-check weekly cap on the server
      const borrower = this.profiles.get(booking.user_id) || this.getProfileByEmail(booking.user_email || '');
      const userCap = borrower?.weekly_hours_cap ?? 6.0;
      const currentWeekHours = this.getUserWeeklyBookedHours(booking.user_id, booking.start_time, booking.id);
      if (currentWeekHours + booking.duration_hours > userCap) {
        const hoursLeft = Math.max(0, userCap - currentWeekHours);
        throw new Error(`Weekly Cap Violation: Approving this ${booking.duration_hours.toFixed(1)}h request would total ${(currentWeekHours + booking.duration_hours).toFixed(1)}h, exceeding the weekly cap of ${userCap.toFixed(1)} hours (${hoursLeft.toFixed(1)}h remaining).`);
      }
    } else if (decision === 'waitlisted') {
      booking.clash_detected = true;
    }

    booking.status = decision;
    booking.status_reason = writtenReason.trim();
    booking.status_updated_at = new Date().toISOString();
    booking.status_updated_by = actor.id;
    booking.updated_at = new Date().toISOString();

    this.bookings.set(booking.id, booking);

    if (decision === 'waitlisted') {
      const queue = this.getWaitlistByLeastRecentUse(booking.resource_id);
      const idx = queue.findIndex(q => q.id === booking.id);
      waitlistPosition = idx >= 0 ? idx + 1 : 1;
    }

    // 4. Create In-App Notification for the borrower
    const notifTitle = decision === 'approved' 
      ? `Booking Approved: ${resource.name}`
      : decision === 'rejected'
      ? `Booking Rejected: ${resource.name}`
      : `Placed on Waitlist (#${waitlistPosition || 1}): ${resource.name}`;

    const notifMessage = decision === 'approved'
      ? `Your reservation for ${resource.name} was approved by ${actor.full_name}. Stated reason: "${booking.status_reason}"`
      : decision === 'rejected'
      ? `Your reservation for ${resource.name} was declined by ${actor.full_name}. Stated reason: "${booking.status_reason}"`
      : `Your reservation for ${resource.name} has been added to the Fair-Access Waitlist at position #${waitlistPosition || 1}. Stated reason: "${booking.status_reason}"`;

    const notification: InAppNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: booking.user_id,
      booking_id: booking.id,
      resource_name: resource.name,
      type: decision === 'approved' ? 'booking_approved' : decision === 'rejected' ? 'booking_rejected' : 'booking_waitlisted',
      title: notifTitle,
      message: notifMessage,
      reason: booking.status_reason,
      read: false,
      created_at: new Date().toISOString(),
    };
    this.notifications.set(notification.id, notification);

    // 5. Write to audit_log per rule 5
    const actionName = decision === 'approved' ? 'BOOKING_APPROVED' : decision === 'rejected' ? 'BOOKING_REJECTED' : 'BOOKING_WAITLISTED';
    this.logAction(actor, actionName, 'booking', booking.id, {
      decision,
      written_reason: booking.status_reason,
      borrower_id: booking.user_id,
      borrower_name: booking.user_name,
      resource_id: booking.resource_id,
      resource_name: resource.name,
      duration_hours: booking.duration_hours,
      waitlist_position: waitlistPosition,
      timestamp: booking.status_updated_at,
    });

    this.saveToDisk();
    return { booking, waitlistPosition, notification };
  }

  // --- Notification Helpers ---
  getNotifications(userId: string): InAppNotification[] {
    this.loadFromDisk();
    return Array.from(this.notifications.values())
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  markNotificationRead(notificationId: string): boolean {
    this.loadFromDisk();
    const notif = this.notifications.get(notificationId);
    if (notif) {
      notif.read = true;
      this.notifications.set(notif.id, notif);
      this.saveToDisk();
      return true;
    }
    return false;
  }

  markAllNotificationsRead(userId: string): boolean {
    this.loadFromDisk();
    let updated = false;
    this.notifications.forEach((n) => {
      if (n.user_id === userId && !n.read) {
        n.read = true;
        updated = true;
      }
    });
    if (updated) this.saveToDisk();
    return updated;
  }

  checkIn(
    actor: Profile, 
    bookingId: string, 
    conditionNotes: string, 
    checklist?: InspectionChecklist
  ): Booking {
    this.loadFromDisk();
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking record not found.');

    if (booking.status !== 'approved') {
      throw new Error(`Invalid lifecycle state: Booking status is '${booking.status}', must be 'approved' to check in.`);
    }

    const resource = this.resources.get(booking.resource_id);
    const isBorrower = booking.user_id === actor.id || booking.user_email === actor.email;
    const isOwner = resource?.owner_id === actor.id || resource?.owner_name === actor.full_name;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);

    if (!isBorrower && !isOwner && !isPrivileged) {
      throw new Error('Unauthorized Access: Only the designated borrower, facility custodian, or administrators can check in.');
    }

    // 1. Strictly verify the booked window
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    if (now.getTime() < startTime.getTime() || now.getTime() > endTime.getTime()) {
      const startStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = startTime.toLocaleDateString();
      throw new Error(`Check-in Window Violation: Check-in is only permitted within the scheduled reservation window (${dateStr} from ${startStr} to ${endStr}). Current time is outside this window.`);
    }

    // 2. Minimum 10 characters for arrival condition notes
    if (!conditionNotes || conditionNotes.trim().length < 10) {
      throw new Error(`Mandatory Inspection Rule: Arrival physical condition notes must be at least 10 characters (provided: ${conditionNotes ? conditionNotes.trim().length : 0} characters).`);
    }

    booking.status = 'checked_in';
    booking.checked_in_at = now.toISOString();
    booking.checkin_condition_notes = conditionNotes.trim();
    booking.checkin_checklist = checklist || {
      physicalChecked: true,
      cleanlinessVerified: true,
      safetySecured: true,
      accessoriesPresent: true,
    };
    booking.updated_at = now.toISOString();

    this.bookings.set(booking.id, booking);

    // 3. Write CHECKED_IN to audit_log
    this.logAction(actor, 'CHECKED_IN', 'booking', booking.id, {
      condition_notes: booking.checkin_condition_notes,
      checklist: booking.checkin_checklist,
      checked_in_at: booking.checked_in_at,
      resource_id: booking.resource_id,
      borrower_id: booking.user_id,
    });

    this.saveToDisk();
    return booking;
  }

  returnResource(
    actor: Profile, 
    bookingId: string, 
    conditionNotes: string, 
    conditionRating: ConditionRating,
    checklist?: InspectionChecklist
  ): { booking: Booking; isLate: boolean; lateMinutes: number } {
    this.loadFromDisk();
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking record not found.');

    if (booking.status !== 'checked_in') {
      throw new Error(`Invalid lifecycle state: Booking must be in 'checked_in' state to record departure return (current status: '${booking.status}').`);
    }

    const resource = this.resources.get(booking.resource_id);
    const isBorrower = booking.user_id === actor.id || booking.user_email === actor.email;
    const isOwner = resource?.owner_id === actor.id || resource?.owner_name === actor.full_name;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);

    if (!isBorrower && !isOwner && !isPrivileged) {
      throw new Error('Unauthorized Access: Only the borrower, facility custodian, or administrators can record return.');
    }

    // 1. Minimum 10 characters for return notes
    if (!conditionNotes || conditionNotes.trim().length < 10) {
      throw new Error(`Mandatory Inspection Rule: Departure return condition notes must be at least 10 characters (provided: ${conditionNotes ? conditionNotes.trim().length : 0} characters).`);
    }

    // 2. Condition rating check
    if (!['good', 'minor wear', 'damaged'].includes(conditionRating)) {
      throw new Error('Compliance Violation: Condition rating is mandatory upon return (choose: good, minor wear, or damaged).');
    }

    // 3. Late detection & delay calculation in minutes
    const now = new Date();
    const scheduledEnd = new Date(booking.end_time);
    const isLate = now.getTime() > scheduledEnd.getTime();
    const lateMinutes = isLate ? Math.max(1, Math.round((now.getTime() - scheduledEnd.getTime()) / 60000)) : 0;

    booking.status = 'completed';
    booking.returned_at = now.toISOString();
    booking.return_condition_notes = conditionNotes.trim();
    booking.return_condition_rating = conditionRating;
    booking.is_late = isLate;
    booking.late_minutes = lateMinutes;
    booking.return_checklist = checklist || {
      physicalChecked: true,
      cleanlinessVerified: true,
      safetySecured: true,
      accessoriesPresent: true,
    };
    booking.updated_at = now.toISOString();

    this.bookings.set(booking.id, booking);

    // 4. Write RETURNED to audit_log
    this.logAction(actor, 'RETURNED', 'booking', booking.id, {
      return_notes: booking.return_condition_notes,
      condition_rating: conditionRating,
      is_late: isLate,
      delay_minutes: lateMinutes,
      returned_at: booking.returned_at,
      resource_id: booking.resource_id,
      borrower_id: booking.user_id,
    });

    // 5. If late, write LATE_RETURN to audit_log
    if (isLate) {
      this.logAction(actor, 'LATE_RETURN', 'booking', booking.id, {
        delay_minutes: lateMinutes,
        scheduled_end: booking.end_time,
        returned_at: booking.returned_at,
        borrower_name: booking.user_name,
        resource_id: booking.resource_id,
        resource_name: resource?.name,
      });
    }

    this.saveToDisk();
    return { booking, isLate, lateMinutes };
  }

  reportIncident(
    actor: Profile, 
    bookingId: string, 
    type: IncidentType, 
    severity: IncidentSeverity,
    description: string
  ): IncidentReport {
    this.loadFromDisk();
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error('Booking record not found.');

    const resource = this.resources.get(booking.resource_id);
    const isBorrower = booking.user_id === actor.id || booking.user_email === actor.email;
    const isOwner = resource?.owner_id === actor.id || resource?.owner_name === actor.full_name;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);

    if (!isBorrower && !isOwner && !isPrivileged) {
      throw new Error('Unauthorized Access: Only the borrower, facility custodian, or administrators can report incidents.');
    }

    if (!['damage', 'delay', 'safety', 'conflict', 'incident'].includes(type)) {
      throw new Error('Invalid incident type: must be damage, delay, safety, or conflict.');
    }

    if (!description || description.trim().length < 10) {
      throw new Error(`Incident Reporting Rule: Incident description must be at least 10 characters (provided: ${description ? description.trim().length : 0} characters).`);
    }

    const incident: IncidentReport = {
      id: `inc-${Date.now()}`,
      booking_id: bookingId,
      resource_name: resource?.name,
      reported_by: actor.id,
      reporter_name: actor.full_name,
      reporter_role: actor.role,
      type,
      severity: severity || 'low',
      status: 'acknowledged',
      description: description.trim(),
      created_at: new Date().toISOString(),
    };

    this.incidents.set(incident.id, incident);

    this.logAction(actor, 'INCIDENT_REPORTED', 'incident', incident.id, {
      booking_id: bookingId,
      incident_type: type,
      severity: incident.severity,
      description: incident.description,
      governance_policy: 'Logged for review. No automated penalties applied.',
    });

    this.saveToDisk();
    return incident;
  }

  resolveIncident(
    actor: Profile,
    incidentId: string,
    resolutionNotes: string
  ): IncidentReport {
    this.loadFromDisk();
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error('Incident report record not found.');

    const booking = this.bookings.get(incident.booking_id);
    const resource = booking ? this.resources.get(booking.resource_id) : undefined;

    const isOwner = resource ? (resource.owner_id === actor.id || resource.owner_name === actor.full_name) : false;
    const isPrivileged = ['manager', 'admin'].includes(actor.role);

    if (!isOwner && !isPrivileged) {
      throw new Error('Unauthorized Access: Only facility custodians or administrators have authority to mark incidents resolved.');
    }

    if (!resolutionNotes || resolutionNotes.trim().length < 10) {
      throw new Error(`Resolution Justification Rule: Written resolution note must be at least 10 characters (provided: ${resolutionNotes ? resolutionNotes.trim().length : 0} characters).`);
    }

    const now = new Date().toISOString();
    incident.status = 'resolved';
    incident.resolution_notes = resolutionNotes.trim();
    incident.resolved_at = now;
    incident.resolved_by = actor.id;
    incident.resolved_by_name = actor.full_name;

    this.incidents.set(incident.id, incident);

    this.logAction(actor, 'INCIDENT_RESOLVED', 'incident', incident.id, {
      booking_id: incident.booking_id,
      resolution_notes: incident.resolution_notes,
      resolved_by: actor.full_name,
      resolved_by_role: actor.role,
      resolved_at: now,
      governance_policy: 'Resolved by custodian. No automated penalties applied.',
    });

    this.saveToDisk();
    return incident;
  }

  getBooking(bookingId: string): Booking | undefined {
    this.loadFromDisk();
    return this.bookings.get(bookingId);
  }

  getIncidentsByBooking(bookingId: string): IncidentReport[] {
    this.loadFromDisk();
    return Array.from(this.incidents.values()).filter((inc) => inc.booking_id === bookingId);
  }

  getAuditLogsByBooking(bookingId: string): AuditLogEntry[] {
    this.loadFromDisk();
    return this.auditLogs.filter(
      (entry) => entry.target_id === bookingId || entry.details?.booking_id === bookingId
    );
  }

  getWaitlistByLeastRecentUse(resourceId: string): Array<Booking & { lastUsedAt: string | null; priorityScore: number }> {
    this.loadFromDisk();
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
    this.loadFromDisk();
    return Array.from(this.bookings.values()).map((b) => ({
      ...b,
      resource: this.resources.get(b.resource_id),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getIncidents(): IncidentReport[] {
    this.loadFromDisk();
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getAuditLogs(): AuditLogEntry[] {
    this.loadFromDisk();
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
