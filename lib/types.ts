export type UserRole = 'user' | 'owner' | 'manager' | 'admin';

export type ResourceType = 'lab' | 'equipment' | 'space';

export type BookingStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'waitlisted' 
  | 'checked_in' 
  | 'completed' 
  | 'cancelled';

export type IncidentType = 'delay' | 'damage' | 'incident';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: UserRole;
  weekly_hours_cap: number; // default 6h
  created_at: string;
}

export interface Resource {
  id: string;
  owner_id: string;
  owner_name?: string;
  owner_department?: string;
  name: string;
  description: string;
  type: ResourceType;
  location: string;
  capacity: number;
  eligibility_requirements: string;
  is_active: boolean;
  image_url?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  resource_id: string;
  resource?: Resource;
  user_id: string;
  user_name?: string;
  user_email?: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  duration_hours: number;
  purpose: string;
  status: BookingStatus;
  status_reason?: string; // Required for approved, rejected, waitlisted
  status_updated_at?: string;
  status_updated_by?: string;
  checkin_condition_notes?: string;
  checked_in_at?: string;
  return_condition_notes?: string;
  returned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentReport {
  id: string;
  booking_id: string;
  resource_name?: string;
  reported_by: string;
  reporter_name?: string;
  reporter_role?: UserRole;
  type: IncidentType;
  description: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  action: string;
  target_type: 'resource' | 'booking' | 'incident' | 'profile';
  target_id: string;
  details: Record<string, any>;
  created_at: string;
}
