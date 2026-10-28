import { createClient } from '@supabase/supabase-js';
import { Booking, Resource, Profile, IncidentReport, AuditLogEntry } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton Supabase Client for Postgres DB interaction
export const supabaseDb = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let isSupabaseConfiguredCache: boolean | null = null;
let lastCheckTime = 0;

/**
 * Checks if the public tables exist in Supabase Postgres.
 * Cached for 15 seconds to avoid spamming the schema cache.
 */
export async function isSupabaseDbConnected(): Promise<boolean> {
  const now = Date.now();
  if (isSupabaseConfiguredCache !== null && now - lastCheckTime < 15000) {
    return isSupabaseConfiguredCache;
  }

  try {
    const { data, error } = await supabaseDb.from('bookings').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205') {
        // Table does not exist in Supabase schema cache yet
        isSupabaseConfiguredCache = false;
        lastCheckTime = now;
        return false;
      }
      // Any other error (e.g. empty table, RLS, etc.) means table exists!
      isSupabaseConfiguredCache = true;
      lastCheckTime = now;
      return true;
    }
    isSupabaseConfiguredCache = true;
    lastCheckTime = now;
    return true;
  } catch (e) {
    isSupabaseConfiguredCache = false;
    lastCheckTime = now;
    return false;
  }
}

// --- Supabase DB Query Helpers ---

export async function fetchSupabaseBookings(): Promise<Booking[] | null> {
  try {
    const { data, error } = await supabaseDb
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return null;
    return (data as any[]) || [];
  } catch {
    return null;
  }
}

export async function fetchSupabaseResources(): Promise<Resource[] | null> {
  try {
    const { data, error } = await supabaseDb
      .from('resources')
      .select('*')
      .order('name');
    if (error) return null;
    return (data as any[]) || [];
  } catch {
    return null;
  }
}

export async function fetchSupabaseProfiles(): Promise<Profile[] | null> {
  try {
    const { data, error } = await supabaseDb
      .from('profiles')
      .select('*');
    if (error) return null;
    return (data as any[]) || [];
  } catch {
    return null;
  }
}

export async function fetchSupabaseIncidents(): Promise<IncidentReport[] | null> {
  try {
    const { data, error } = await supabaseDb
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return null;
    return (data as any[]) || [];
  } catch {
    return null;
  }
}

export async function fetchSupabaseAuditLogs(): Promise<AuditLogEntry[] | null> {
  try {
    const { data, error } = await supabaseDb
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return null;
    return (data as any[]) || [];
  } catch {
    return null;
  }
}

export async function insertSupabaseBooking(booking: Booking): Promise<boolean> {
  try {
    const { resource, ...dbRow } = booking;
    const { error } = await supabaseDb.from('bookings').upsert(dbRow);
    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('column')) {
        const fallbackRow = { ...dbRow };
        delete (fallbackRow as any).return_condition_rating;
        delete (fallbackRow as any).is_late;
        delete (fallbackRow as any).late_minutes;
        const retry = await supabaseDb.from('bookings').upsert(fallbackRow);
        if (!retry.error) return true;
      }
      console.warn('Failed to upsert booking to Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Error inserting booking to Supabase:', e);
    return false;
  }
}

export async function updateSupabaseBooking(bookingId: string, updates: Partial<Booking>): Promise<boolean> {
  try {
    const { resource, ...dbRow } = updates;
    const { error } = await supabaseDb
      .from('bookings')
      .update(dbRow)
      .eq('id', bookingId);
    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('column')) {
        const fallbackRow = { ...dbRow };
        delete (fallbackRow as any).return_condition_rating;
        delete (fallbackRow as any).is_late;
        delete (fallbackRow as any).late_minutes;
        const retry = await supabaseDb.from('bookings').update(fallbackRow).eq('id', bookingId);
        if (!retry.error) return true;
      }
      console.warn('Failed to update booking in Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Error updating booking in Supabase:', e);
    return false;
  }
}

export async function insertSupabaseAuditLog(entry: AuditLogEntry): Promise<boolean> {
  try {
    const { error } = await supabaseDb.from('audit_log').insert(entry);
    if (error) {
      console.warn('Failed to insert audit_log to Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Error inserting audit_log to Supabase:', e);
    return false;
  }
}

export async function insertSupabaseIncident(incident: IncidentReport): Promise<boolean> {
  try {
    const { error } = await supabaseDb.from('incidents').insert(incident);
    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('column')) {
        const fallbackRow = { ...incident };
        delete (fallbackRow as any).resolution_notes;
        delete (fallbackRow as any).resolved_at;
        delete (fallbackRow as any).resolved_by;
        delete (fallbackRow as any).resolved_by_name;
        const retry = await supabaseDb.from('incidents').insert(fallbackRow);
        if (!retry.error) return true;
      }
      console.warn('Failed to insert incident to Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Error inserting incident to Supabase:', e);
    return false;
  }
}

export async function insertSupabaseResource(resource: Resource): Promise<boolean> {
  try {
    const { error } = await supabaseDb.from('resources').upsert(resource);
    if (error) {
      console.warn('Failed to insert resource to Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Error inserting resource to Supabase:', e);
    return false;
  }
}
