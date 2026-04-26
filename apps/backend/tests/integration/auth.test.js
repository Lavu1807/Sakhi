const request = require("supertest");

// Mock the database pool.
jest.mock("../../src/config/db", () => {
	const mockPool = {
		query: jest.fn(),
		totalCount: 5,
		idleCount: 3,
		waitingCount: 0,
		on: jest.fn(),
	};
	return mockPool;
});

const pool = require('../../src/config/db');
const app = require('../../src/app');

describe("Auth endpoints", () => {
	beforeEach(() => {
		pool.query.mockReset();
	});

	describe("POST /api/auth/signup", () => {
		it("should return 400 when required fields are missing", async () => {
			const response = await request(app)
				.post("/api/auth/signup")
				.send({ name: "Test" });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Name, email, and password are required.");
		});

		it("should return 409 when email already exists", async () => {
			pool.query.mockResolvedValueOnce({
				rows: [{ id: 1, name: "Existing", email: "test@test.com", password: "hash" }],
			});

			const response = await request(app)
				.post("/api/auth/signup")
				.send({ name: "Test", email: "test@test.com", password: "password123" });

			expect(response.status).toBe(409);
			expect(response.body.message).toBe("An account with this email already exists.");
		});

		it("should return 201 on successful signup", async () => {
			// findUserByEmail returns null (no existing user).
			pool.query.mockResolvedValueOnce({ rows: [] });
			// createUser returns new user.
			pool.query.mockResolvedValueOnce({
				rows: [{
					id: 1,
					name: "Test User",
					email: "new@test.com",
					age: 25,
					weight: 60,
					height: 165,
					lifestyle: "active",
					created_at: new Date().toISOString(),
				}],
			});

			const response = await request(app)
				.post("/api/auth/signup")
				.send({
					name: "Test User",
					email: "new@test.com",
					password: "password123",
					age: 25,
					weight: 60,
					height: 165,
					lifestyle: "active",
				});

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("Signup successful.");
			expect(response.body.user).toBeDefined();
			expect(response.body.user.email).toBe("new@test.com");
		});

		it("should return 400 for invalid age", async () => {
			const response = await request(app)
				.post("/api/auth/signup")
				.send({ name: "Test", email: "t@t.com", password: "pass123", age: "invalid" });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Age must be a valid number.");
		});

		it("should return 400 for invalid lifestyle", async () => {
			const response = await request(app)
				.post("/api/auth/signup")
				.send({ name: "Test", email: "t@t.com", password: "pass123", lifestyle: "extreme" });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("lifestyle must be one of: sedentary, moderate, active.");
		});
	});

	describe("POST /api/auth/login", () => {
		it("should return 400 when email or password is missing", async () => {
			const response = await request(app)
				.post("/api/auth/login")
				.send({ email: "test@test.com" });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Email and password are required.");
		});

		it("should return 401 when user not found", async () => {
			pool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.post("/api/auth/login")
				.send({ email: "noone@test.com", password: "password" });

			expect(response.status).toBe(401);
			expect(response.body.message).toBe("Invalid email or password.");
		});

		it("should return 200 with token on successful login", async () => {
			const bcrypt = require("bcrypt");
			const hashedPassword = await bcrypt.hash("correct_password", 10);

			pool.query.mockResolvedValueOnce({
				rows: [{
					id: 1,
					name: "Test",
					email: "user@test.com",
					password: hashedPassword,
					age: 25,
					weight: 60,
					height: 165,
					lifestyle: "active",
					created_at: new Date().toISOString(),
				}],
			});

			const response = await request(app)
				.post("/api/auth/login")
				.send({ email: "user@test.com", password: "correct_password" });

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Login successful.");
			expect(response.body.token).toBeDefined();
			expect(response.body.user).toBeDefined();
			expect(response.body.user.id).toBe(1);
		});

		it("should return 401 for wrong password", async () => {
			const bcrypt = require("bcrypt");
			const hashedPassword = await bcrypt.hash("correct_password", 10);

			pool.query.mockResolvedValueOnce({
				rows: [{
					id: 1,
					name: "Test",
					email: "user@test.com",
					password: hashedPassword,
				}],
			});

			const response = await request(app)
				.post("/api/auth/login")
				.send({ email: "user@test.com", password: "wrong_password" });

			expect(response.status).toBe(401);
			expect(response.body.message).toBe("Invalid email or password.");
		});
	});
});
