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
export type IncidentSeverity = 'low' | 'medium' | 'high';
export type IncidentResolutionStatus = 'investigating' | 'resolved' | 'acknowledged';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: UserRole;
  weekly_hours_cap: number; // default 6h
  certifications: string[]; // e.g. ["Laser Safety Tier-2 Certification"]
  avatar_url?: string;
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
  required_certifications: string[]; // specific certs required to book
  is_active: boolean;
  image_url?: string;
  specs?: string[];
  safety_tier?: number;
  available_hours?: string;
  utilization_rate?: number;
  created_at: string;
}

export interface InspectionChecklist {
  physicalChecked: boolean;
  cleanlinessVerified: boolean;
  safetySecured: boolean;
  accessoriesPresent: boolean;
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
  status_reason?: string; // Mandatory for approved, rejected, waitlisted
  status_updated_at?: string;
  status_updated_by?: string;
  checkin_condition_notes?: string;
  checkin_checklist?: InspectionChecklist;
  checked_in_at?: string;
  return_condition_notes?: string;
  return_checklist?: InspectionChecklist;
  returned_at?: string;
  clash_detected?: boolean;
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
  severity: IncidentSeverity;
  status: IncidentResolutionStatus;
  description: string;
  resolution_notes?: string;
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
