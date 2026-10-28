-- ==============================================================================
-- CampusShare Production Database Setup for Supabase (PostgreSQL)
-- Execute this script in your Supabase Project Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing tables if re-running (clean slate)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. Profiles Table (supports Supabase Auth UUIDs and text identifiers)
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    department TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'owner', 'manager', 'admin')),
    weekly_hours_cap NUMERIC(4, 1) NOT NULL DEFAULT 6.0,
    certifications TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Resources Table
CREATE TABLE resources (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    owner_department TEXT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('lab', 'equipment', 'space')),
    location TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    eligibility_requirements TEXT,
    required_certifications TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    open_time TEXT NOT NULL DEFAULT '08:00',
    close_time TEXT NOT NULL DEFAULT '20:00',
    max_hours_per_booking NUMERIC(4, 1) NOT NULL DEFAULT 4.0,
    safety_tier INT DEFAULT 1,
    available_hours TEXT,
    utilization_rate INT DEFAULT 0,
    specs TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bookings Table
CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_hours NUMERIC(4, 1) NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted', 'checked_in', 'completed', 'cancelled')),
    status_reason TEXT,
    status_updated_at TIMESTAMPTZ,
    status_updated_by TEXT,
    checkin_condition_notes TEXT,
    checkin_checklist JSONB DEFAULT '{"physicalChecked": true, "cleanlinessVerified": true, "safetySecured": true, "accessoriesPresent": true}'::jsonb,
    checked_in_at TIMESTAMPTZ,
    return_condition_notes TEXT,
    return_checklist JSONB DEFAULT '{"physicalChecked": true, "cleanlinessVerified": true, "safetySecured": true, "accessoriesPresent": true}'::jsonb,
    returned_at TIMESTAMPTZ,
    clash_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_timespan CHECK (end_time > start_time)
);

-- 6. Incidents Table
CREATE TABLE incidents (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    resource_name TEXT,
    reported_by TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reporter_name TEXT NOT NULL,
    reporter_role TEXT NOT NULL DEFAULT 'user',
    type TEXT NOT NULL CHECK (type IN ('delay', 'damage', 'incident')),
    severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'acknowledged',
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Audit Log Table (Immutable Governance Trail)
CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,
    actor_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Performance Indexes
CREATE INDEX idx_resources_owner ON resources(owner_id);
CREATE INDEX idx_bookings_resource ON bookings(resource_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_times ON bookings(start_time, end_time);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- 9. Row Level Security (RLS) - Permissive access for both Anon and Authenticated
-- Allows Judge devices and browser sessions to share state seamlessly
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert on profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on profiles" ON profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public read on resources" ON resources FOR SELECT USING (true);
CREATE POLICY "Allow public insert on resources" ON resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on resources" ON resources FOR UPDATE USING (true);

CREATE POLICY "Allow public read on bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert on bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on bookings" ON bookings FOR UPDATE USING (true);

CREATE POLICY "Allow public read on incidents" ON incidents FOR SELECT USING (true);
CREATE POLICY "Allow public insert on incidents" ON incidents FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on audit_log" ON audit_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert on audit_log" ON audit_log FOR INSERT WITH CHECK (true);

-- 10. Initial Seed Data Fixtures (Fictional College Campus Data Only)

-- Seed Profiles
INSERT INTO profiles (id, email, full_name, department, role, weekly_hours_cap, certifications)
VALUES
('user-1', 'user1@demo.com', 'Alex Rivera (Certified)', 'Electrical & Computer Engineering', 'user', 6.0, ARRAY['Laser Safety Tier-2 Certification', 'Field Camera Operations', 'Makerspace Safety']),
('user-2', 'user2@demo.com', 'Jordan Lee (No Certs)', 'Undeclared Engineering Freshman', 'user', 6.0, ARRAY[]::TEXT[]),
('owner-1', 'owner@demo.com', 'Prof. Elena Vance', 'Applied Physics & Photonics', 'owner', 12.0, ARRAY['Laser Safety Tier-2 Certification', 'Cleanroom Protocol', 'PI Principal Investigator Clearance']),
('manager-1', 'manager@demo.com', 'David Kim', 'Campus Labs & Facilities Oversight', 'manager', 20.0, ARRAY['Facility Safety Director', 'Hazardous Materials Oversight']),
('admin-1', 'admin@demo.com', 'Dr. Sarah Chen', 'Office of Academic Dean', 'admin', 40.0, ARRAY['Dean Security Clearance'])
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  certifications = EXCLUDED.certifications;

-- Seed Resources
INSERT INTO resources (id, owner_id, owner_name, owner_department, name, description, type, location, capacity, eligibility_requirements, required_certifications, is_active, open_time, close_time, max_hours_per_booking, safety_tier, available_hours, utilization_rate, specs)
VALUES
('res-1', 'owner-1', 'Prof. Elena Vance', 'Applied Physics & Photonics', 'Photonics & Laser Spectroscopy Lab (Room 304)', 'Equipped with a high-precision Newport vibration-damped optical bench, pulsed femtosecond Ti:Sapphire laser source, and liquid nitrogen-cooled spectrophotometer.', 'lab', 'Science Complex, Building B, Room 304', 4, 'Strict Requirement: Active Laser Safety Tier-2 Certification issued by Environmental Health & Safety.', ARRAY['Laser Safety Tier-2 Certification'], TRUE, '08:00', '20:00', 3.0, 2, '08:00 - 20:00 (Max 3.0h / booking)', 82, ARRAY['Newport Optical Bench', 'Femtosecond 800nm Laser', 'Cryogenic Spectrophotometer', 'HEPA Laminar Flow Hood']),
('res-2', 'owner-1', 'Prof. Elena Vance', 'Applied Physics & Photonics', 'Sony FX6 Full-Frame Cinema Camera Kit', 'Pro cinema package: Sony FX6 Body, FE 24-70mm f/2.8 GM II, 2x 160GB CFexpress Type A cards, BP-U35 batteries, and dual Sennheiser EW-DP wireless audio kit.', 'equipment', 'Media Arts Center - Gear Vault Cage 2', 1, 'Film or Digital Arts students with verified Field Camera Operations clearance.', ARRAY['Field Camera Operations'], TRUE, '09:00', '18:00', 4.0, 1, '09:00 - 18:00 (Max 4.0h / booking)', 68, ARRAY['Sony FX6 4K Full-Frame', 'Sony 24-70 GM II f/2.8', 'Sennheiser Wireless Lavalier', 'Pelican Air 1535 Case']),
('res-3', 'owner-1', 'Prof. Elena Vance', 'Applied Physics & Photonics', 'Makerspace Rapid Prototyping & PCB Milling Station', 'Features 2x Prusa XL multi-toolhead 3D printers, Voltera V-One PCB conductive printer, and Weller digital soldering rework station.', 'space', 'Engineering Hub, Annex Hall East', 6, 'Enrolled students who completed the campus Makerspace Safety orientation.', ARRAY['Makerspace Safety'], TRUE, '07:00', '23:00', 4.0, 1, '07:00 - 23:00 (Max 4.0h / booking)', 91, ARRAY['Dual Prusa XL 5-Toolhead', 'Voltera V-One PCB Printer', 'Weller WXsmart Station', 'Bofa Fume Extractor']),
('res-4', 'owner-1', 'Prof. Elena Vance', 'Applied Physics & Photonics', 'Anechoic Sound & Precision Acoustic Chamber', 'Full RF and acoustic absorption chamber with calibrated Bruel & Kjaer 4189 measurement microphones and Audio Precision APx555 analyzer.', 'lab', 'Acoustics & Vibration Sub-Basement SB-12', 3, 'Audio Engineering or Architecture senior projects with Acoustics Lab Clearance.', ARRAY['Acoustics Lab Clearance'], TRUE, '10:00', '19:00', 3.0, 2, '10:00 - 19:00 (Max 3.0h / booking)', 55, ARRAY['Cutoff Frequency: 80Hz', 'B&K 4189 Reference Mics', 'Audio Precision APx555', 'Isolated Floating Concrete Slab']),
('res-5', 'owner-1', 'Prof. Elena Vance', 'Applied Physics & Photonics', 'DJI Matrice 300 RTK Industrial Drone Package', 'Enterprise aerial platform with Zenmuse H20T thermal sensor and LiDAR pod. Dual control remotes and high-capacity battery bank.', 'equipment', 'Geosciences & Surveying Storage Room 102', 2, 'Valid Remote Pilot License on file with Campus Security.', ARRAY['Remote Pilot License'], TRUE, '08:00', '17:00', 3.0, 3, '08:00 - 17:00 Daylight (Max 3.0h / booking)', 45, ARRAY['Zenmuse H20T Thermal & Optical', 'RTK Base Station Unit', 'Dual Smart Controllers', '6x TB60 Flight Packs']),
('res-6', 'owner-1', 'Prof. Elena Vance', 'Applied Physics & Photonics', 'VR Spatial Computing & Motion Capture Stage', '8-camera OptiTrack PrimeX motion capture volume, 4x Meta Quest Pro headsets, and Apple Vision Pro developer unit with dedicated RTX 4090 workstations.', 'space', 'Interactive Media Pavilion, Studio 4', 5, 'HCI, Game Development, or Biomedical Motion Analysis research teams.', ARRAY['VR Motion Lab Clearance'], TRUE, '09:00', '21:00', 4.0, 1, '09:00 - 21:00 (Max 4.0h / booking)', 76, ARRAY['8x OptiTrack PrimeX 13', 'Apple Vision Pro Dev Unit', '4x Meta Quest Pro', 'Dual RTX 4090 Workstations'])
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Bookings
INSERT INTO bookings (id, resource_id, user_id, user_name, user_email, start_time, end_time, duration_hours, purpose, status, status_reason, status_updated_at, status_updated_by)
VALUES
('bk-101', 'res-2', 'user-1', 'Alex Rivera (Certified)', 'user1@demo.com', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours', 2.0, 'Filming documentary B-roll for Campus Renewable Energy Capstone showcase.', 'approved', 'All gear safety prerequisites verified and shoot schedule is well within depot operational hours.', NOW() - INTERVAL '4 hours', 'owner-1'),
('bk-102', 'res-3', 'user-1', 'Alex Rivera (Certified)', 'user1@demo.com', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 2 hours', 2.0, 'Rapid PCB milling for solar sensor telemetry daughterboard prototype.', 'pending', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Audit Log
INSERT INTO audit_log (id, actor_id, actor_name, actor_role, action, target_type, target_id, details)
VALUES
('aud-101', 'user-1', 'Alex Rivera (Certified)', 'user', 'BOOKING_REQUESTED', 'booking', 'bk-101', '{"resource_name": "Sony FX6 Full-Frame Cinema Camera Kit", "duration_hours": 2.0}'::jsonb),
('aud-102', 'owner-1', 'Prof. Elena Vance', 'owner', 'BOOKING_APPROVED', 'booking', 'bk-101', '{"written_reason": "All gear safety prerequisites verified and shoot schedule is well within depot operational hours."}'::jsonb),
('aud-103', 'user-1', 'Alex Rivera (Certified)', 'user', 'BOOKING_REQUESTED', 'booking', 'bk-102', '{"resource_name": "Makerspace Rapid Prototyping & PCB Milling Station", "duration_hours": 2.0}'::jsonb)
ON CONFLICT (id) DO NOTHING;
