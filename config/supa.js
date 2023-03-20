require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseDBURL = process.env.SUPBASE_DB_URL;
const supabaseDBKEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseDBURL, supabaseDBKEY);

exports.supabase = supabase;
