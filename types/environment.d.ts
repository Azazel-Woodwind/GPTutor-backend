declare global {
    namespace NodeJS {
        interface ProcessEnv {
            OPENAI_API_KEY: string;
            SUPBASE_DB_URL: string;
            SUPABASE_ANON_KEY: string;
            PORT: number;
        }
    }
}

export {};
