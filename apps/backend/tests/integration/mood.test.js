const request = require("supertest");
const jwt = require("jsonwebtoken");

const TEST_SECRET = process.env.JWT_SECRET || "test_jwt_secret_value_1234567890";

function createAuthToken(userId = 1) {
	return jwt.sign({ userId, email: "test@test.com" }, TEST_SECRET, { expiresIn: "1h" });
}

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

const pool = require("../../src/config/db");
const app = require("../../src/app");

describe("Mood endpoints", () => {
	const token = createAuthToken();

	beforeEach(() => {
		pool.query.mockReset();
	});

	describe("POST /api/mood", () => {
		it("should return 400 for invalid payload", async () => {
			const response = await request(app)
				.post("/api/mood")
				.set("Authorization", `Bearer ${token}`)
				.send({
					date: "2024-01-10",
					mood: "happy",
					intensity: 7,
					cycleDay: 5,
					phase: "Follicular",
				});

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("intensity");
		});

		it("should return 201 and saved entry for valid payload", async () => {
			pool.query.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						user_id: 1,
						entry_date: "2024-01-10",
						mood: "sad",
						intensity: 2,
						note: "Low energy",
						cycle_day: 3,
						phase: "Menstrual",
						created_at: new Date().toISOString(),
					},
				],
			});

			pool.query.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						user_id: 1,
						entry_date: "2024-01-10",
						mood: "sad",
						intensity: 2,
						note: "Low energy",
						cycle_day: 3,
						phase: "Menstrual",
						created_at: new Date().toISOString(),
					},
				],
			});

			const response = await request(app)
				.post("/api/mood")
				.set("Authorization", `Bearer ${token}`)
				.send({
					date: "2024-01-10",
					mood: "sad",
					intensity: 2,
					note: "Low energy",
					cycleDay: 3,
					phase: "Menstrual",
				});

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("Mood entry saved successfully.");
			expect(response.body.entry).toBeDefined();
			expect(response.body.entry.mood).toBe("sad");
			expect(response.body.analysis).toBeDefined();
		});
	});

	describe("GET /api/mood", () => {
		it("should return 200 with mood entries", async () => {
			pool.query.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						user_id: 1,
						entry_date: "2024-01-10",
						mood: "happy",
						intensity: 4,
						note: "Good day",
						cycle_day: 10,
						phase: "Follicular",
						created_at: new Date().toISOString(),
					},
				],
			});

			const response = await request(app)
				.get("/api/mood")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.entries)).toBe(true);
			expect(response.body.entries).toHaveLength(1);
			expect(response.body.analysis).toBeDefined();
		});

		it("should return 401 without auth token", async () => {
			const response = await request(app).get("/api/mood");
			expect(response.status).toBe(401);
		});
	});
});
