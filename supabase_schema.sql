-- ==============================================================================
-- CampusShare Database Schema & Policies
-- Designed for Supabase (PostgreSQL)
-- ==============================================================================

-- 1. Custom Types
CREATE TYPE user_role AS ENUM ('user', 'owner', 'manager', 'admin');
CREATE TYPE resource_type AS ENUM ('lab', 'equipment', 'space');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'waitlisted', 'checked_in', 'completed', 'cancelled');
CREATE TYPE incident_type AS ENUM ('delay', 'damage', 'incident');

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    department TEXT,
    role user_role NOT NULL DEFAULT 'user',
    weekly_hours_cap NUMERIC(4, 1) NOT NULL DEFAULT 6.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'::user_role)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type resource_type NOT NULL,
    location TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    eligibility_requirements TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    purpose TEXT NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending',
    status_reason TEXT, -- Mandatory for approved, rejected, waitlisted decisions
    checkin_condition_notes TEXT,
    checked_in_at TIMESTAMPTZ,
    return_condition_notes TEXT,
    returned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_timespan CHECK (end_time > start_time)
);

-- 5. Incidents / Reports Table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type incident_type NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Audit Log Table (Every important action writes here)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g. 'RESOURCE_CREATED', 'BOOKING_REQUESTED', 'STATUS_CHANGE', 'CHECKED_IN', 'RETURNED', 'INCIDENT_REPORTED'
    target_type TEXT NOT NULL, -- 'resource', 'booking', 'incident', 'profile'
    target_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast queries
CREATE INDEX IF NOT EXISTS idx_resources_owner ON resources(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_times ON bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- Helper function: calculate user's booked hours in the current week (ISO week)
CREATE OR REPLACE FUNCTION get_user_weekly_booked_hours(p_user_id UUID, p_target_date TIMESTAMPTZ DEFAULT NOW())
RETURNS NUMERIC AS $$
DECLARE
    total_hours NUMERIC;
BEGIN
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0), 0)
    INTO total_hours
    FROM bookings
    WHERE user_id = p_user_id
      AND status IN ('pending', 'approved', 'checked_in', 'completed')
      AND date_trunc('week', start_time) = date_trunc('week', p_target_date);

    RETURN total_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles: public read for authenticated users, users update own profile
CREATE POLICY "Public read profiles" ON profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users update self" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Resources: active resources visible to all authenticated
CREATE POLICY "View resources" ON resources
    FOR SELECT TO authenticated USING (is_active = TRUE OR auth.uid() = owner_id);

CREATE POLICY "Owners and Admins manage resources" ON resources
    FOR ALL TO authenticated
    USING (
        auth.uid() = owner_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Bookings: visible to borrower, resource owner, and managers/admins
CREATE POLICY "View bookings" ON bookings
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM resources WHERE resources.id = bookings.resource_id AND resources.owner_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

CREATE POLICY "Users create bookings" ON bookings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and Admins update bookings" ON bookings
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM resources WHERE resources.id = bookings.resource_id AND resources.owner_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Incidents: visible to parties involved and admins
CREATE POLICY "View incidents" ON incidents
    FOR SELECT TO authenticated
    USING (
        auth.uid() = reported_by OR
        EXISTS (
            SELECT 1 FROM bookings b
            JOIN resources r ON r.id = b.resource_id
            WHERE b.id = incidents.booking_id
              AND (b.user_id = auth.uid() OR r.owner_id = auth.uid())
        ) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

CREATE POLICY "Report incidents" ON incidents
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reported_by);

-- Audit log: readable by manager/admin and relevant parties, insertable by authenticated actions
CREATE POLICY "View audit log" ON audit_log
    FOR SELECT TO authenticated
    USING (
        auth.uid() = actor_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

CREATE POLICY "Insert audit log" ON audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);
