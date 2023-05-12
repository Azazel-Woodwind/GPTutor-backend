declare global {
    namespace NodeJS {
        interface ProcessEnv {
            OPENAI_API_KEY: string;
            SUPBASE_DB_URL: string;
            SUPABASE_ANON_KEY: string;
            PORT: number;
            JWT_SECRET: string;
            SUPABASE_DB_URL: string;
            SUPABASE_SERVICE_ROLE_KEY: string;
        }
    }
}

export {};
