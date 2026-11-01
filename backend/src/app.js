const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const securityHeaders = require("./middleware/securityHeaders");
const requestLogger = require("./middleware/requestLogger");
const createRateLimiter = require("./middleware/rateLimiter");
const { parseOrigins } = require("./config/env");

function createApp() {
  const app = express();

  app.disable("x-powered-by"); // don't advertise the framework
  app.set("trust proxy", 1); // behind Render's proxy: req.ip must be the real client, not the proxy

  app.use(requestLogger);
  app.use(securityHeaders);

  const origins = parseOrigins(process.env.CLIENT_ORIGIN);
  app.use(
    cors({
      // Production requires an explicit allow-list (enforced at startup in server.js);
      // the wildcard is only a convenience for local development and tests.
      origin: origins.length ? origins : process.env.NODE_ENV === "production" ? false : "*",
    })
  );
  app.use(express.json({ limit: "10kb" })); // reject oversized bodies early

  // Liveness + database readiness. Used by the host's health check and by uptime monitors.
  app.get("/api/health", (_req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    res.status(dbReady ? 200 : 503).json({
      success: dbReady,
      status: dbReady ? "ok" : "degraded",
      db: dbReady ? "connected" : "disconnected",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Slow down password guessing: only the credential endpoints are limited
  // (GET /me runs on every page load and must not count against the limit).
  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  });
  app.post(["/api/auth/login", "/api/auth/signup"], authLimiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", taskRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
