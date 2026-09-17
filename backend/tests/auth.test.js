const request = require("supertest");
const createApp = require("../src/app");

const app = createApp();

describe("Auth API", () => {
  const validUser = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  };

  test("POST /api/auth/signup creates a new user and returns a token", async () => {
    const res = await request(app).post("/api/auth/signup").send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(validUser.email);
    // password must never be returned
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test("POST /api/auth/signup rejects a duplicate email", async () => {
    await request(app).post("/api/auth/signup").send(validUser);
    const res = await request(app).post("/api/auth/signup").send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/auth/signup rejects a short password", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ ...validUser, password: "123" });

    expect(res.status).toBe(400);
  });

  test("POST /api/auth/login succeeds with correct credentials", async () => {
    await request(app).post("/api/auth/signup").send(validUser);

    const res = await request(app).post("/api/auth/login").send({
      email: validUser.email,
      password: validUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  test("POST /api/auth/login rejects a wrong password", async () => {
    await request(app).post("/api/auth/signup").send(validUser);

    const res = await request(app).post("/api/auth/login").send({
      email: validUser.email,
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me requires a valid token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me returns the user when authenticated", async () => {
    const signupRes = await request(app)
      .post("/api/auth/signup")
      .send(validUser);
    const token = signupRes.body.data.token;

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });
});
