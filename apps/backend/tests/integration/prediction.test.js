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

describe("Prediction endpoints", () => {
	const token = createAuthToken();

	beforeEach(() => {
		pool.query.mockReset();
	});

	describe("GET /api/prediction", () => {
		it("should return 200 with prediction when cycle history exists", async () => {
			pool.query.mockResolvedValueOnce({
				rows: [
					{
						period_start_date: "2024-01-01",
						period_end_date: "2024-01-05",
						cycle_length: 28,
					},
					{
						period_start_date: "2024-01-29",
						period_end_date: "2024-02-02",
						cycle_length: 28,
					},
					{
						period_start_date: "2024-02-26",
						period_end_date: "2024-03-01",
						cycle_length: 28,
					},
				],
			});

			const response = await request(app)
				.get("/api/prediction")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.latestPeriodDate).toBeDefined();
			expect(response.body.nextPeriodDate).toBeDefined();
			expect(response.body.currentPhase).toBeDefined();
			expect(response.body.cycleLengthUsed).toBeDefined();
			expect(response.body.confidenceLevel).toBeDefined();
			expect(response.body.phaseCalendar).toBeDefined();
		});

		it("should return 200 with message when no cycle history", async () => {
			pool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.get("/api/prediction")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("No cycle history");
		});

		it("should return 200 with message when no completed cycles", async () => {
			pool.query.mockResolvedValueOnce({
				rows: [
					{
						period_start_date: "2024-01-01",
						period_end_date: null,
						cycle_length: null,
					},
				],
			});

			const response = await request(app)
				.get("/api/prediction")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("completed cycles");
		});

		it("should return 400 for invalid from date", async () => {
			const response = await request(app)
				.get("/api/prediction?from=bad")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(400);
		});

		it("should return 401 without auth token", async () => {
			const response = await request(app).get("/api/prediction");

			expect(response.status).toBe(401);
		});
	});
});
