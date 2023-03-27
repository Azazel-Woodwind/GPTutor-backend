import { UserData } from "../src/lib/jwt.utils";

declare global {
  namespace Express {
    interface Request {
      user?: UserData;
    }
  }
}

export {};
