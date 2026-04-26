const request = require("supertest");
const jwt = require("jsonwebtoken");

const TEST_SECRET = process.env.JWT_SECRET || "test_jwt_secret_value_1234567890";

function createAuthToken(userId = 1) {
	return jwt.sign({ userId, email: "test@test.com" }, TEST_SECRET, { expiresIn: "1h" });
}

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

describe("Daily log endpoints", () => {
	const token = createAuthToken();

	beforeEach(() => {
		pool.query.mockReset();
	});

	describe("POST /api/daily-logs", () => {
		it("should return 400 for missing log_date", async () => {
			const response = await request(app)
				.post("/api/daily-logs")
				.set("Authorization", `Bearer ${token}`)
				.send({ mood: "happy" });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("log_date");
		});

		it("should return 400 for invalid log_date", async () => {
			const response = await request(app)
				.post("/api/daily-logs")
				.set("Authorization", `Bearer ${token}`)
				.send({ log_date: "not-a-date" });

			expect(response.status).toBe(400);
		});

		it("should return 201 for valid daily log", async () => {
			pool.query.mockResolvedValueOnce({
				rows: [{
					id: 1,
					user_id: 1,
					log_date: "2024-01-15",
					mood: "happy",
					energy_level: 4,
					stress_level: 2,
					sleep_hours: 7.5,
					cramps: false,
					headache: false,
					fatigue: false,
					bloating: false,
					water_intake: 2.5,
					exercise_done: true,
					notes: "Feeling great",
					created_at: new Date().toISOString(),
				}],
			});

			const response = await request(app)
				.post("/api/daily-logs")
				.set("Authorization", `Bearer ${token}`)
				.send({
					log_date: "2024-01-15",
					mood: "happy",
					energy_level: 4,
					stress_level: 2,
					sleep_hours: 7.5,
					cramps: false,
					exercise_done: true,
					notes: "Feeling great",
				});

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("Daily log saved successfully.");
			expect(response.body.entry).toBeDefined();
			expect(response.body.entry.log_date).toBe("2024-01-15");
		});

		it("should return 400 for invalid energy_level", async () => {
			const response = await request(app)
				.post("/api/daily-logs")
				.set("Authorization", `Bearer ${token}`)
				.send({ log_date: "2024-01-15", energy_level: 10 });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("energy_level");
		});

		it("should return 400 for invalid sleep_hours", async () => {
			const response = await request(app)
				.post("/api/daily-logs")
				.set("Authorization", `Bearer ${token}`)
				.send({ log_date: "2024-01-15", sleep_hours: 25 });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("sleep_hours");
		});
	});

	describe("GET /api/daily-logs", () => {
		it("should return 200 with logs", async () => {
			pool.query.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						user_id: 1,
						log_date: "2024-01-15",
						mood: "happy",
						energy_level: 4,
						stress_level: 2,
						sleep_hours: 7.5,
						cramps: false,
						headache: false,
						fatigue: false,
						bloating: false,
						water_intake: 2.5,
						exercise_done: true,
						notes: null,
						created_at: new Date().toISOString(),
					},
				],
			});

			const response = await request(app)
				.get("/api/daily-logs")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.entries).toBeDefined();
			expect(response.body.entries).toHaveLength(1);
		});

		it("should return 400 for invalid from date", async () => {
			const response = await request(app)
				.get("/api/daily-logs?from=invalid")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("from");
		});

		it("should return 400 for invalid to date", async () => {
			const response = await request(app)
				.get("/api/daily-logs?to=bad")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("to");
		});
	});
});
