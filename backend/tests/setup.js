process.env.AUTH_RATE_LIMIT_MAX = "100000"; // tests create many accounts from one IP
process.env.LOG_LEVEL = "error"; // keep test output quiet
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = "test_secret_key_for_jest";
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  // Reset all collections between tests so each test starts clean
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
