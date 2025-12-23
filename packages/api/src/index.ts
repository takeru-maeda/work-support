import { Hono } from "hono";
import { HonoEnv } from "./custom-types";
import effort from "./features/effort";
import missions from "./features/missions";
import goals from "./features/goals";
import projects from "./features/projects";
import reports from "./features/reports";
import userSettings from "./features/user-settings";
import users from "./features/users";
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
      const requestOrigin: string | undefined =
        origin || c.req.header("Origin") || undefined;

      const allowedOrigins: string[] = [
        c.env.PROD_FRONTEND_URL,
        c.env.DEV_FRONTEND_URL || "http://localhost:5173",
      ].filter(Boolean);

      if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        return requestOrigin;
      }
      return undefined;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 86400, // プリフライトリクエストのキャッシュ時間（24時間）
  }),
);

app.use(accessLogMiddleware);
app.use("*", logger());

app.onError(globalErrorHandler);

app.get("/", async (c) => c.text("Hello Work Support"));

app.route("/api/effort", effort);
app.route("/api/missions", missions);
app.route("/api/goals", goals);
app.route("/api/projects", projects);
app.route("/api/reports", reports);
app.route("/api/user-settings", userSettings);
app.route("/api/users", users);
app.route("/api/logs", logs);

app.get(
  "/openapi",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "Work Support API",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  }),
);

app.get("/ui", swaggerUI({ url: "/openapi" }));

export default app;
