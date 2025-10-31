import { Hono } from "hono";
import { HonoEnv } from "./custom-types";
import effort from "./features/effort";
import missions from "./features/missions";
import goals from "./features/goals";
import reports from "./features/reports";
import { accessLogMiddleware } from "./middleware/logger";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { globalErrorHandler } from "./lib/errorHandler";
import { openAPIRouteHandler } from "hono-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import logs from "./features/logs";

const app = new Hono<HonoEnv>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowedOrigins = [
        c.env.PROD_FRONTEND_URL,
        c.env.DEV_FRONTEND_URL || "http://localhost:5173",
      ].filter(Boolean);

      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return undefined; // 許可しない
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.use(accessLogMiddleware);
app.use("*", logger());

app.onError(globalErrorHandler);

app.get("/", async (c) => c.text("Hello Work Support"));

app.route("/api/effort", effort);
app.route("/api/missions", missions);
app.route("/api/goals", goals);
app.route("/api/reports", reports);
app.route("/api/logs", logs);

app.get(
  "/openapi",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "Work Support API",
        version: "1.0.0",
      },
    },
  }),
);

app.get("/ui", swaggerUI({ url: "/openapi" }));

export default app;
