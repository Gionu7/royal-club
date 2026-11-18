// Club mode: login and one shared database for the whole club.
// false = no login: everyone uses the app on their own device with every screen
// open, and data stays in that browser. Set it to true to switch the login on;
// the club database below is already set up for it.
export const CLUB_MODE = false;

// Club database settings, used only when CLUB_MODE is true. Leave both empty to
// run the app on one device only, with no login (data stays in that browser).
//
// To share one database with the whole club, create a Supabase project and paste
// its Project URL and its publishable ("anon") key here. Both are meant to be
// public: what each account can see is enforced by the rules in supabase/schema.sql.
// Never put the secret / service_role key in this file.
export const SUPABASE_URL = 'https://avyjgyztpxrvkpwrvbql.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2eWpneXp0cHhydmtwd3J2YnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5OTMzNzQsImV4cCI6MjExMDU2OTM3NH0.kl5E9cSb0LMEgGe2Wbyqs90vspNOcDAwqWq2IC7YjJ8';

// Accounts for children or parents without an email address log in with a
// username. Behind the scenes it becomes username@USERNAME_DOMAIN. No email is
// ever sent to this address, so turn off "Confirm email" in Supabase.
export const USERNAME_DOMAIN = 'cont.royalclub.ro';

// Supabase's browser library, loaded only when the settings above are filled in.
export const SUPABASE_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
