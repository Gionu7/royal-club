// Club database settings. Leave both empty to run the app on one device only,
// with no login (data stays in that browser).
//
// To share one database with the whole club, create a Supabase project and paste
// its Project URL and its publishable ("anon") key here. Both are meant to be
// public: what each account can see is enforced by the rules in supabase/schema.sql.
// Never put the secret / service_role key in this file.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// Accounts for children or parents without an email address log in with a
// username. Behind the scenes it becomes username@USERNAME_DOMAIN. No email is
// ever sent to this address, so turn off "Confirm email" in Supabase.
export const USERNAME_DOMAIN = 'cont.royalclub.ro';

// Supabase's browser library, loaded only when the settings above are filled in.
export const SUPABASE_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
