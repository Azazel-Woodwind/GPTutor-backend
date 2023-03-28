// @ts-nocheck

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseDBURL = process.env.SUPBASE_DB_URL;
const supabaseDBKEY = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseDBURL, supabaseDBKEY);
export default supabase;
