const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not defined in the environment");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);

  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });
}

module.exports = connectDB;
