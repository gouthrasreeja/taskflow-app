require("dotenv").config();
const { validateEnv } = require("./src/config/env");
const logger = require("./src/utils/logger");

// Fail fast, with every problem listed, before touching the network.
const check = validateEnv(process.env);
check.warnings.forEach((w) => logger.warn("config_warning", { detail: w }));
if (!check.ok) {
  check.errors.forEach((e) => logger.error("config_error", { detail: e }));
  process.exit(1);
}

const mongoose = require("mongoose");
const createApp = require("./src/app");
const connectDB = require("./src/config/db");

async function start() {
  try {
    await connectDB();
    const server = createApp().listen(check.port, () => {
      logger.info("server_started", { port: check.port, env: process.env.NODE_ENV || "development" });
    });

    // Graceful shutdown: hosts send SIGTERM on every deploy/restart. Stop taking new requests,
    // let in-flight ones finish, close the database connection, then exit.
    let closing = false;
    const shutdown = (signal) => {
      if (closing) return;
      closing = true;
      logger.info("shutdown_started", { signal });
      server.close(async () => {
        await mongoose.connection.close();
        logger.info("shutdown_complete");
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref(); // force-exit if something hangs
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    logger.error("startup_failed", { message: err.message });
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason) => {
  logger.error("unhandled_rejection", { reason: String(reason && reason.stack ? reason.stack : reason) });
});
process.on("uncaughtException", (err) => {
  logger.error("uncaught_exception", { message: err.message, stack: err.stack });
  process.exit(1); // state is unknown after an uncaught exception; let the host restart us
});

start();
