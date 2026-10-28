-- ==============================================================================
-- CampusShare Seed Data (Fictional College Campus Data Only)
-- ==============================================================================

-- Sample mock resources across Labs, Equipment, and Spaces
-- (Note: owner_id will link to whichever profile creates them or a placeholder)
-- You can run this after users/profiles exist, or execute as test fixtures.

-- Sample Resources fixtures table/script
INSERT INTO resources (name, description, type, location, capacity, eligibility_requirements)
VALUES 
(
    'Photonics & Laser Spectroscopy Lab (Room 304)', 
    'High-precision optical bench, pulsed laser sources, and cryogenic spectrophotometer.', 
    'lab', 
    'Science Block B, 3rd Floor', 
    4, 
    'Physics or ECE graduate students, Laser Safety Level 2 clearance certified.'
),
(
    'Sony FX6 Cinema Camera Rig & Prime Lenses', 
    'Complete full-frame 4K digital cinema camera package with 24-70mm GM and wireless lavalier kit.', 
    'equipment', 
    'Media Arts Center Equipment Depot - Locker 12', 
    1, 
    'Film & Journalism majors or approved student media organizations.'
),
(
    'Makerspace 3D Printing & PCB Milling Station', 
    'Dual Prusa XL multi-tool 3D printers and Voltera V-One precision PCB milling system.', 
    'space', 
    'Engineering Building 1, Hallway Annex', 
    6, 
    'Completion of Makerspace Safety Orientation.'
),
(
    'Anechoic Sound & Acoustic Chamber', 
    'Fully sound-isolated chamber with calibrated B&K reference measurement microphones.', 
    'lab', 
    'Acoustics & Vibration Institute, Sub-Basement', 
    3, 
    'Audio Engineering or Architecture senior projects with faculty mentor sign-off.'
),
(
    'DJI Matrice 300 RTK Industrial Drone Package', 
    'Commercial drone with thermal imaging and LiDAR payload for campus environmental surveys.', 
    'equipment', 
    'Earth Science & Geospatial Lab - Cabinet 04', 
    1, 
    'DGCA/FAA Remote Pilot License on file with Campus Safety.'
);
