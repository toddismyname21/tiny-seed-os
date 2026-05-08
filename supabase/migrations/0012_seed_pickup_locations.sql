-- ═══════════════════════════════════════════════════════════════════
-- Migration 0012: Seed pickup locations (12 known stops)
-- Sourced from project_csa_locations.md (PM agent memory)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO pickup_locations (name, address, city, state, zip, day_of_week, time_start, time_end, is_delivery_zone, is_active) VALUES
  ('Allison Park - Simons',      '4312 Middle Rd',         'Allison Park',  'PA', '15101', 'Wed', '16:00', '18:30', false, true),
  ('Highland Park',              NULL,                     'Pittsburgh',    'PA', '15206', 'Wed', '16:00', '18:30', false, true),
  ('Mt. Lebanon',                NULL,                     'Pittsburgh',    'PA', '15228', 'Wed', '16:00', '18:30', false, true),
  ('Squirrel Hill',              NULL,                     'Pittsburgh',    'PA', '15217', 'Wed', '16:00', '18:30', false, true),
  ('North Side',                 NULL,                     'Pittsburgh',    'PA', '15212', 'Wed', '16:00', '18:30', false, true),
  ('Fox Chapel',                 NULL,                     'Pittsburgh',    'PA', '15238', 'Wed', '16:00', '18:30', false, true),
  ('Sewickley (CSA)',            NULL,                     'Sewickley',     'PA', '15143', 'Wed', '16:00', '18:30', false, true),
  ('Cranberry',                  NULL,                     'Cranberry Twp', 'PA', '16066', 'Wed', '16:00', '18:30', false, true),
  ('Bloomfield',                 NULL,                     'Pittsburgh',    'PA', '15224', 'Wed', '16:00', '18:30', false, true),
  ('Bloomfield Market',          '5050 Liberty Ave',       'Pittsburgh',    'PA', '15224', 'Sat', '09:00', '13:00', false, true),
  ('Sewickley Market',           '200 Walnut St',          'Sewickley',     'PA', '15143', 'Sat', '09:00', '13:00', false, true),
  ('Rochester (Farm Pickup)',    '257 Zeigler Rd',         'Rochester',     'PA', '15074', 'Wed', '11:00', '19:00', false, true);

-- Note: addresses are TBD for in-home stops (privacy). Hosts are stored in host_name column once we get that data.
