'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Profile, 
  Resource, 
  Booking, 
  IncidentReport, 
  AuditLogEntry, 
  UserRole,
  IncidentType,
  IncidentSeverity,
  InspectionChecklist,
  ConditionRating,
  InAppNotification
} from '@/lib/types';
import { 
  fetchAllData, 
  requestBookingAction, 
  joinWaitlistAction,
  updateBookingDecisionAction, 
  checkInAction, 
  returnAction, 
  reportIncidentAction, 
  resolveIncidentAction,
  createResourceAction,
  getWaitlistQueueAction,
  resetDemoDataAction,
  markNotificationReadAction
} from '@/lib/actions';
import { createClient } from '@/lib/supabase/client';
import { Navbar } from './Navbar';
import { BookingRequestModal } from './BookingRequestModal';
import { BookingDecisionModal } from './BookingDecisionModal';
import { WaitlistQueueModal } from './WaitlistQueueModal';
import { CheckInModal } from './CheckInModal';
import { ReturnModal } from './ReturnModal';
import { IncidentReportModal } from './IncidentReportModal';
import { ResolveIncidentModal } from './ResolveIncidentModal';
import { CreateResourceModal } from './CreateResourceModal';
import { ArchitectureModal } from './ArchitectureModal';

interface CampusShareContextType {
  currentProfile: Profile;
  profiles: Profile[];
  resources: Resource[];
  bookings: Booking[];
  incidents: IncidentReport[];
  auditLogs: AuditLogEntry[];
  weeklyHours: number;
  loading: boolean;
  isDatabaseConnected: boolean;
  notifications: InAppNotification[];
  markNotificationRead: (id: string) => Promise<void>;
  switchProfile: (profileIdOrEmail: string) => Promise<void>;
  openBookingModal: (resource: Resource) => void;
  openDecisionModal: (booking: Booking) => void;
  openWaitlistModal: (resource: Resource) => void;
  openCheckInModal: (booking: Booking) => void;
  openReturnModal: (booking: Booking) => void;
  openIncidentModal: (booking: Booking) => void;
  openResolveIncidentModal: (incident: IncidentReport) => void;
  openCreateResourceModal: () => void;
  openArchitectureModal: () => void;
  resetDemoData: () => Promise<void>;
}

const CampusShareContext = createContext<CampusShareContextType | null>(null);

export const useCampusShare = () => {
  const ctx = useContext(CampusShareContext);
  if (!ctx) throw new Error('useCampusShare must be used within CampusShareProvider');
  return ctx;
};

export const CampusShareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProfile, setCurrentProfile] = useState<Profile>({
    id: 'user-1',
    email: 'user1@demo.com',
    full_name: 'Alex Rivera (Certified)',
    department: 'Electrical & Computer Engineering',
    role: 'user',
    weekly_hours_cap: 6.0,
    certifications: ['Laser Safety Tier-2 Certification', 'Field Camera Operations', 'Makerspace Safety'],
    created_at: '2026-09-01T08:00:00Z',
  });

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<number>(0);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [waitlistQueue, setWaitlistQueue] = useState<any[]>([]);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [isResolveIncidentOpen, setIsResolveIncidentOpen] = useState(false);
  const [isCreateResourceOpen, setIsCreateResourceOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadData = async (profileIdOrEmail?: string) => {
    try {
      setLoading(true);
      const data = await fetchAllData(profileIdOrEmail || currentProfile.email || currentProfile.id);
      setCurrentProfile(data.currentProfile);
      setProfiles(data.profiles);
      setResources(data.resources);
      setBookings(data.bookings);
      setIncidents(data.incidents);
      setAuditLogs(data.auditLogs);
      setWeeklyHours(data.weeklyHours);
      setIsDatabaseConnected(Boolean(data.isDatabaseConnected));
      setNotifications(data.notifications || []);
    } catch (e: any) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSupabaseSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user && session.user.email) {
          await loadData(session.user.email);
          return;
        }
      } catch (e) {
        // Fall back to default profile
      }
      loadData();
    };
    checkSupabaseSession();
  }, []);

  const switchProfile = async (profileIdOrEmail: string) => {
    try {
      const email = profileIdOrEmail.includes('@') ? profileIdOrEmail : profiles.find(p => p.id === profileIdOrEmail)?.email;
      if (email) {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email,
          password: 'DemoPassword123!',
        });
      }
    } catch (e) {
      // In-memory fallback
    }

    await loadData(profileIdOrEmail);
    const target = profiles.find((p) => p.id === profileIdOrEmail || p.email === profileIdOrEmail);
    showToast(`Active persona: ${target?.full_name || profileIdOrEmail} (${target?.role || 'user'})`, 'info');
  };

  // Handler for booking request
  const handleBookingSubmit = async (
    resourceId: string, 
    startTime: string, 
    endTime: string, 
    purpose: string
  ): Promise<{ clash?: boolean; conflictingSlot?: any }> => {
    const res = await requestBookingAction(currentProfile.email || currentProfile.id, resourceId, startTime, endTime, purpose);
    await loadData(currentProfile.email || currentProfile.id);
    
    if (res.clash) {
      showToast('Schedule clash: Slot is occupied. Choose "Join Waitlist" below.', 'error');
      return { clash: true, conflictingSlot: res.conflictingSlot };
    } else {
      showToast('Booking submitted with status "PENDING"! Sent to facility owner.', 'success');
      return { clash: false };
    }
  };

  // Handler for joining the waitlist
  const handleJoinWaitlist = async (
    resourceId: string, 
    startTime: string, 
    endTime: string, 
    purpose: string
  ) => {
    await joinWaitlistAction(currentProfile.email || currentProfile.id, resourceId, startTime, endTime, purpose);
    await loadData(currentProfile.email || currentProfile.id);
    showToast('Joined Waitlist (Ordered by least recent use priority)!', 'info');
  };

  // Handler for owner decision
  const handleDecisionSubmit = async (
    bookingId: string,
    decision: 'approved' | 'rejected' | 'waitlisted',
    writtenReason: string
  ) => {
    const res = await updateBookingDecisionAction(currentProfile.email || currentProfile.id, bookingId, decision, writtenReason);
    if (!res.success) {
      throw new Error(res.error || 'Failed to update booking decision.');
    }
    await loadData(currentProfile.email || currentProfile.id);
    showToast(`Decision recorded: ${decision.toUpperCase()} with mandatory written justification.`, 'success');
  };

  // Handler for check-in with checklist
  const handleCheckInSubmit = async (bookingId: string, notes: string, checklist: InspectionChecklist) => {
    const res = await checkInAction(currentProfile.email || currentProfile.id, bookingId, notes, checklist);
    if (!res.success) {
      throw new Error(res.error || 'Arrival check-in failed.');
    }
    await loadData(currentProfile.email || currentProfile.id);
    showToast('Arrival check-in confirmed & physical inspection logged to audit trail.', 'success');
  };

  // Handler for return with checklist & condition rating
  const handleReturnSubmit = async (
    bookingId: string, 
    notes: string, 
    rating: ConditionRating, 
    checklist: InspectionChecklist
  ) => {
    const res = await returnAction(currentProfile.email || currentProfile.id, bookingId, notes, rating, checklist);
    if (!res.success) {
      throw new Error(res.error || 'Return submission failed.');
    }
    await loadData(currentProfile.email || currentProfile.id);
    if (res.isLate) {
      showToast(`Departure verified: Resource returned late (+${res.lateMinutes}m delay recorded). No automated penalties applied.`, 'info');
    } else {
      showToast('Departure verified: Equipment returned on time in good standing!', 'success');
    }
  };

  // Handler for incident report
  const handleIncidentSubmit = async (
    bookingId: string, 
    type: IncidentType, 
    severity: IncidentSeverity, 
    description: string
  ) => {
    const res = await reportIncidentAction(currentProfile.email || currentProfile.id, bookingId, type, severity, description);
    if (!res.success) {
      throw new Error(res.error || 'Failed to report incident.');
    }
    await loadData(currentProfile.email || currentProfile.id);
    showToast(`Incident report recorded. No automated penalty applied under campus policy.`, 'info');
  };

  // Handler for resolving incident
  const handleResolveIncidentSubmit = async (incidentId: string, resolutionNotes: string) => {
    const res = await resolveIncidentAction(currentProfile.email || currentProfile.id, incidentId, resolutionNotes);
    if (!res.success) {
      throw new Error(res.error || 'Failed to resolve incident.');
    }
    await loadData(currentProfile.email || currentProfile.id);
    showToast('Incident marked resolved by facility custodian. Audit trail updated.', 'success');
  };

  // Handler for resource creation
  const handleCreateResourceSubmit = async (data: any) => {
    const res = await createResourceAction(currentProfile.email || currentProfile.id, data);
    if (!res.success) {
      throw new Error(res.error || 'Failed to create resource.');
    }
    await loadData(currentProfile.email || currentProfile.id);
    showToast(`Resource "${data.name}" listed successfully.`, 'success');
  };

  // Reset demo fixtures with explicit safety confirmation
  const handleResetDemoData = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Factory Reset Warning: Are you sure you want to reset all campus fixtures and bookings back to baseline?')) {
      return;
    }
    const res = await resetDemoDataAction(currentProfile.email || currentProfile.id);
    if (!res.success) {
      showToast(res.error || 'Failed to reset demonstration fixtures.', 'error');
      return;
    }
    await loadData(currentProfile.email || currentProfile.id);
    showToast('Demonstration data & fixtures reset to factory baseline.', 'info');
  };

  const handleMarkNotificationRead = async (id: string) => {
    await markNotificationReadAction(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  // Modal openers
  const openBookingModal = (resource: Resource) => {
    setSelectedResource(resource);
    setIsBookingOpen(true);
  };

  const openDecisionModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDecisionOpen(true);
  };

  const openWaitlistModal = async (resource: Resource) => {
    setSelectedResource(resource);
    const queue = await getWaitlistQueueAction(resource.id);
    setWaitlistQueue(queue);
    setIsWaitlistOpen(true);
  };

  const openCheckInModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsCheckInOpen(true);
  };

  const openReturnModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsReturnOpen(true);
  };

  const openIncidentModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsIncidentOpen(true);
  };

  const openResolveIncidentModal = (incident: IncidentReport) => {
    setSelectedIncident(incident);
    setIsResolveIncidentOpen(true);
  };

  const openCreateResourceModal = () => {
    setIsCreateResourceOpen(true);
  };

  const openArchitectureModal = () => {
    setIsArchitectureOpen(true);
  };

  return (
    <CampusShareContext.Provider
      value={{
        currentProfile,
        profiles,
        resources,
        bookings,
        incidents,
        auditLogs,
        weeklyHours,
        loading,
        isDatabaseConnected,
        notifications,
        markNotificationRead: handleMarkNotificationRead,
        switchProfile,
        openBookingModal,
        openDecisionModal,
        openWaitlistModal,
        openCheckInModal,
        openReturnModal,
        openIncidentModal,
        openResolveIncidentModal,
        openCreateResourceModal,
        openArchitectureModal,
        resetDemoData: handleResetDemoData,
      }}
    >
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
        <Navbar
          currentProfile={currentProfile}
          profiles={profiles}
          weeklyHours={weeklyHours}
          isDatabaseConnected={isDatabaseConnected}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onSwitchProfile={switchProfile}
          onOpenCreateResource={openCreateResourceModal}
          onOpenArchitecture={openArchitectureModal}
          onResetDemoData={['admin', 'manager'].includes(currentProfile.role) ? handleResetDemoData : undefined}
        />

        {/* Global Toast */}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in slide-in-from-bottom-5">
            <div className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : toast.type === 'info'
                ? 'bg-indigo-600 text-white border-indigo-700'
                : 'bg-red-600 text-white border-red-700'
            }`}>
              <span>{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-auto opacity-75 hover:opacity-100">
                ✕
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-6 text-center text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              CampusShare — Shared Labs, Equipment & Spaces. All decisions logged to <code className="text-indigo-600 dark:text-indigo-400 font-mono">audit_log</code>.
            </div>
            <button
              onClick={openArchitectureModal}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Architecture & Security Blueprint ↗
            </button>
          </div>
        </footer>

        {/* Modals */}
        <BookingRequestModal
          resource={selectedResource}
          currentProfile={currentProfile}
          weeklyHours={weeklyHours}
          existingBookings={bookings}
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          onSubmit={handleBookingSubmit}
          onJoinWaitlist={handleJoinWaitlist}
        />

        <BookingDecisionModal
          booking={selectedBooking}
          isOpen={isDecisionOpen}
          onClose={() => setIsDecisionOpen(false)}
          onSubmitDecision={handleDecisionSubmit}
        />

        <WaitlistQueueModal
          resource={selectedResource}
          queue={waitlistQueue}
          isOpen={isWaitlistOpen}
          onClose={() => setIsWaitlistOpen(false)}
        />

        <CheckInModal
          booking={selectedBooking}
          isOpen={isCheckInOpen}
          onClose={() => setIsCheckInOpen(false)}
          onSubmitCheckIn={handleCheckInSubmit}
        />

        <ReturnModal
          booking={selectedBooking}
          isOpen={isReturnOpen}
          onClose={() => setIsReturnOpen(false)}
          onSubmitReturn={handleReturnSubmit}
        />

        <IncidentReportModal
          booking={selectedBooking}
          isOpen={isIncidentOpen}
          onClose={() => setIsIncidentOpen(false)}
          onSubmitIncident={handleIncidentSubmit}
        />

        <ResolveIncidentModal
          incident={selectedIncident}
          isOpen={isResolveIncidentOpen}
          onClose={() => setIsResolveIncidentOpen(false)}
          onSubmitResolve={handleResolveIncidentSubmit}
        />

        <CreateResourceModal
          currentProfile={currentProfile}
          isOpen={isCreateResourceOpen}
          onClose={() => setIsCreateResourceOpen(false)}
          onSubmitCreate={handleCreateResourceSubmit}
        />

        <ArchitectureModal
          isOpen={isArchitectureOpen}
          onClose={() => setIsArchitectureOpen(false)}
        />
      </div>
    </CampusShareContext.Provider>
  );
};
