import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { openAPIRouteHandler } from "hono-openapi";

import effort from "./features/effort";
import goals from "./features/goals";
import logs from "./features/logs";
import mcp from "./features/mcp";
import missions from "./features/missions";
import projects from "./features/projects";
import reports from "./features/reports";
import userSettings from "./features/user-settings";
import users from "./features/users";
import { globalErrorHandler } from "./lib/errorHandler";
import { accessLogMiddleware } from "./middleware/logger";

import type { HonoEnv } from "./customTypes";

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
// MCP サーバー（/mcp）と、その保護されたリソースの情報（/.well-known/oauth-protected-resource）
app.route("/", mcp);

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
