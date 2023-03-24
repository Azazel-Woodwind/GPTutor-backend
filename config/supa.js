require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseDBURL = process.env.SUPBASE_DB_URL;
const supabaseDBKEY = process.env.SUPABASE_ANON_KEY;

// 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubWdnZGdzdXNjbG1neXNldmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzkwMzM1OTAsImV4cCI6MTk5NDYwOTU5MH0.NYlO9Z-Uvznmk-WRFRpJBs-VOUAi-6sB0MnmzJplPic';

const supabase = createClient(supabaseDBURL, supabaseDBKEY);

exports.supabase = supabase;
