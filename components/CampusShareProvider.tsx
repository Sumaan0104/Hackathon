'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Profile, 
  Resource, 
  Booking, 
  IncidentReport, 
  AuditLogEntry, 
  UserRole,
  IncidentType
} from '@/lib/types';
import { 
  fetchAllData, 
  requestBookingAction, 
  updateBookingDecisionAction, 
  checkInAction, 
  returnAction, 
  reportIncidentAction, 
  createResourceAction,
  getWaitlistQueueAction
} from '@/lib/actions';
import { Navbar } from './Navbar';
import { BookingRequestModal } from './BookingRequestModal';
import { BookingDecisionModal } from './BookingDecisionModal';
import { WaitlistQueueModal } from './WaitlistQueueModal';
import { CheckInModal } from './CheckInModal';
import { ReturnModal } from './ReturnModal';
import { IncidentReportModal } from './IncidentReportModal';
import { CreateResourceModal } from './CreateResourceModal';

interface CampusShareContextType {
  currentProfile: Profile;
  profiles: Profile[];
  resources: Resource[];
  bookings: Booking[];
  incidents: IncidentReport[];
  auditLogs: AuditLogEntry[];
  weeklyHours: number;
  loading: boolean;
  switchProfile: (profileId: string) => Promise<void>;
  openBookingModal: (resource: Resource) => void;
  openDecisionModal: (booking: Booking) => void;
  openWaitlistModal: (resource: Resource) => void;
  openCheckInModal: (booking: Booking) => void;
  openReturnModal: (booking: Booking) => void;
  openIncidentModal: (booking: Booking) => void;
  openCreateResourceModal: () => void;
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
    email: 'alex.rivera@college.edu',
    full_name: 'Alex Rivera',
    department: 'Electrical & Computer Engineering',
    role: 'user',
    weekly_hours_cap: 6.0,
    created_at: '2026-09-01T08:00:00Z',
  });

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [waitlistQueue, setWaitlistQueue] = useState<any[]>([]);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [isCreateResourceOpen, setIsCreateResourceOpen] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadData = async (profileId?: string) => {
    try {
      setLoading(true);
      const data = await fetchAllData(profileId || currentProfile.id);
      setCurrentProfile(data.currentProfile);
      setProfiles(data.profiles);
      setResources(data.resources);
      setBookings(data.bookings);
      setIncidents(data.incidents);
      setAuditLogs(data.auditLogs);
      setWeeklyHours(data.weeklyHours);
    } catch (e: any) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const switchProfile = async (profileId: string) => {
    await loadData(profileId);
    const target = profiles.find((p) => p.id === profileId);
    showToast(`Switched active persona to ${target?.full_name || profileId} (${target?.role || 'user'})`, 'info');
  };

  // Handler for booking request
  const handleBookingSubmit = async (
    resourceId: string, 
    startTime: string, 
    endTime: string, 
    purpose: string
  ) => {
    const res = await requestBookingAction(currentProfile.id, resourceId, startTime, endTime, purpose);
    await loadData(currentProfile.id);
    if (res.waitlisted) {
      showToast('Time clash detected: You have been placed on the Fair-Access Waitlist!', 'info');
    } else {
      showToast('Booking request submitted! Awaiting owner review.', 'success');
    }
  };

  // Handler for owner decision
  const handleDecisionSubmit = async (
    bookingId: string,
    decision: 'approved' | 'rejected' | 'waitlisted',
    writtenReason: string
  ) => {
    await updateBookingDecisionAction(currentProfile.id, bookingId, decision, writtenReason);
    await loadData(currentProfile.id);
    showToast(`Booking ${decision.toUpperCase()} with written justification recorded.`, 'success');
  };

  // Handler for check-in
  const handleCheckInSubmit = async (bookingId: string, notes: string) => {
    await checkInAction(currentProfile.id, bookingId, notes);
    await loadData(currentProfile.id);
    showToast('Check-in confirmed with condition notes logged.', 'success');
  };

  // Handler for return
  const handleReturnSubmit = async (bookingId: string, notes: string) => {
    await returnAction(currentProfile.id, bookingId, notes);
    await loadData(currentProfile.id);
    showToast('Return recorded and booking completed successfully!', 'success');
  };

  // Handler for incident report
  const handleIncidentSubmit = async (bookingId: string, type: IncidentType, description: string) => {
    await reportIncidentAction(currentProfile.id, bookingId, type, description);
    await loadData(currentProfile.id);
    showToast(`Incident report logged. No automated penalty applied.`, 'info');
  };

  // Handler for resource creation
  const handleCreateResourceSubmit = async (data: any) => {
    await createResourceAction(currentProfile.id, data);
    await loadData(currentProfile.id);
    showToast(`Resource "${data.name}" listed successfully.`, 'success');
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

  const openCreateResourceModal = () => {
    setIsCreateResourceOpen(true);
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
        switchProfile,
        openBookingModal,
        openDecisionModal,
        openWaitlistModal,
        openCheckInModal,
        openReturnModal,
        openIncidentModal,
        openCreateResourceModal,
      }}
    >
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
        <Navbar
          currentProfile={currentProfile}
          profiles={profiles}
          weeklyHours={weeklyHours}
          onSwitchProfile={switchProfile}
          onOpenCreateResource={openCreateResourceModal}
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
          <div className="max-w-7xl mx-auto px-4">
            CampusShare — Academic resource sharing platform for college labs, equipment & spaces. All decisions logged to <code className="text-indigo-600 dark:text-indigo-400 font-mono">audit_log</code>.
          </div>
        </footer>

        {/* Modals */}
        <BookingRequestModal
          resource={selectedResource}
          currentProfile={currentProfile}
          weeklyHours={weeklyHours}
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          onSubmit={handleBookingSubmit}
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

        <CreateResourceModal
          currentProfile={currentProfile}
          isOpen={isCreateResourceOpen}
          onClose={() => setIsCreateResourceOpen(false)}
          onSubmitCreate={handleCreateResourceSubmit}
        />
      </div>
    </CampusShareContext.Provider>
  );
};
