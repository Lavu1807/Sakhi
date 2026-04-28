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

describe("Symptoms endpoints", () => {
	const token = createAuthToken();

	beforeEach(() => {
		pool.query.mockReset();
	});

	describe("POST /api/symptoms", () => {
		it("should return 400 for invalid payload", async () => {
			const response = await request(app)
				.post("/api/symptoms")
				.set("Authorization", `Bearer ${token}`)
				.send({
					date: "2024-01-10",
					cycleDay: 4,
					phase: "Menstrual",
					painLevel: 11,
					flowLevel: "medium",
					mood: "sad",
					symptoms: ["cramps"],
					sleepHours: 7,
					activityLevel: "low",
				});

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("painLevel");
		});

		it("should return 201 and saved symptom entry for valid payload", async () => {
			pool.query.mockResolvedValueOnce({ rows: [] });
			pool.query.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						user_id: 1,
						entry_date: "2024-01-10",
						cycle_day: 4,
						phase: "Menstrual",
						pain_level: 8,
						flow_level: "heavy",
						mood: "sad",
						symptoms: ["cramps", "fatigue"],
						sleep_hours: 6.5,
						activity_level: "low",
						created_at: new Date().toISOString(),
					},
				],
			});

			const response = await request(app)
				.post("/api/symptoms")
				.set("Authorization", `Bearer ${token}`)
				.send({
					date: "2024-01-10",
					cycleDay: 4,
					phase: "Menstrual",
					painLevel: 8,
					flowLevel: "heavy",
					mood: "sad",
					symptoms: ["cramps", "fatigue"],
					sleepHours: 6.5,
					activityLevel: "low",
				});

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("Symptom entry saved successfully.");
			expect(response.body.entry).toBeDefined();
			expect(response.body.entry.painLevel).toBe(8);
			expect(response.body.analysis).toBeDefined();
		});
	});

	describe("GET /api/symptoms", () => {
		it("should return 200 with entries", async () => {
			pool.query.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						user_id: 1,
						entry_date: "2024-01-10",
						cycle_day: 4,
						phase: "Menstrual",
						pain_level: 5,
						flow_level: "medium",
						mood: "anxious",
						symptoms: ["headache"],
						sleep_hours: 7,
						activity_level: "moderate",
						created_at: new Date().toISOString(),
					},
				],
			});

			const response = await request(app)
				.get("/api/symptoms")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.entries)).toBe(true);
			expect(response.body.entries).toHaveLength(1);
		});

		it("should return 401 without auth token", async () => {
			const response = await request(app).get("/api/symptoms");
			expect(response.status).toBe(401);
		});
	});
});
