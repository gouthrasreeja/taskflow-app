const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not defined in the environment");
  }

  mongoose.set("strictQuery", true);

  // 10 s instead of the 30 s default, so a wrong URI or an Atlas IP-allow-list problem fails quickly
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  logger.info("mongo_connected", { host: mongoose.connection.host });

  mongoose.connection.on("error", (err) => {
    logger.error("mongo_error", { message: err.message });
  });
}

module.exports = connectDB;
