export const ORIGIN =
    process.env.NODE_ENV === "development"
        ? process.env.FRONTEND_DEVELOPMENT_ORIGIN
        : process.env.FRONTEND_PRODUCTION_ORIGIN;

export const QUESTIONS_PER_LEARNING_OBJECTIVE = 2;
