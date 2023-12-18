import express, { Express } from "express";
import deserialiseUser from "./middleware/deserialiseUser";
import apiRouter from "./routes/api.router";
import cors from "cors";

const app: Express = express();

app.use(deserialiseUser);

app.use(express.json());

const origin =
    process.env.NODE_ENV === "development"
        ? process.env.FRONTEND_DEVELOPMENT_URL
        : process.env.FRONTEND_PRODUCTION_ORIGIN;
app.use(cors({ origin }));

app.use("/", apiRouter);

export default app;
