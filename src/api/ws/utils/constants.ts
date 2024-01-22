export const ORIGIN =
    process.env.NODE_ENV === "development"
        ? process.env.FRONTEND_DEVELOPMENT_URL
        : process.env.FRONTEND_PRODUCTION_ORIGIN;
