const request = require("supertest");
const createApp = require("../src/app");

const app = createApp();

async function signupAndGetToken(email = "task-user@example.com") {
  const res = await request(app).post("/api/auth/signup").send({
    name: "Task User",
    email,
    password: "password123",
  });
  return res.body.data.token;
}

describe("Task API", () => {
  test("rejects all task routes without a token", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(401);
  });

  test("POST /api/tasks creates a task for the authenticated user", async () => {
    const token = await signupAndGetToken();

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Write tests", status: "pending" });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Write tests");
    expect(res.body.data.status).toBe("pending");
  });

  test("POST /api/tasks rejects a missing title", async () => {
    const token = await signupAndGetToken();

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "pending" });

    expect(res.status).toBe(400);
  });

  test("GET /api/tasks only returns the requesting user's tasks", async () => {
    const tokenA = await signupAndGetToken("userA@example.com");
    const tokenB = await signupAndGetToken("userB@example.com");

    await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "User A task" });

    await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ title: "User B task" });

    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].title).toBe("User A task");
  });

  test("GET /api/tasks?status=done filters by status", async () => {
    const token = await signupAndGetToken();

    await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Done task", status: "done" });
    await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Pending task", status: "pending" });

    const res = await request(app)
      .get("/api/tasks?status=done")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].title).toBe("Done task");
  });

  test("PUT /api/tasks/:id updates an existing task", async () => {
    const token = await signupAndGetToken();

    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Original title" });

    const id = createRes.body.data._id;

    const updateRes = await request(app)
      .put(`/api/tasks/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "done" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe("done");
    expect(updateRes.body.data.title).toBe("Original title");
  });

  test("PUT /api/tasks/:id returns 404 for another user's task", async () => {
    const tokenA = await signupAndGetToken("ownerA@example.com");
    const tokenB = await signupAndGetToken("ownerB@example.com");

    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Owner A's task" });

    const id = createRes.body.data._id;

    const res = await request(app)
      .put(`/api/tasks/${id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ status: "done" });

    expect(res.status).toBe(404);
  });

  test("DELETE /api/tasks/:id removes the task", async () => {
    const token = await signupAndGetToken();

    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "To be deleted" });

    const id = createRes.body.data._id;

    const deleteRes = await request(app)
      .delete(`/api/tasks/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/tasks/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.status).toBe(404);
  });
});
