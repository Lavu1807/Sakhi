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

describe("Cycle endpoints", () => {
	const token = createAuthToken();

	beforeEach(() => {
		pool.query.mockReset();
	});

	describe("POST /api/cycle", () => {
		it("should return 400 when period_start_date is missing", async () => {
			const response = await request(app)
				.post("/api/cycle")
				.set("Authorization", `Bearer ${token}`)
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("period_start_date");
		});

		it("should return 400 for invalid date format", async () => {
			const response = await request(app)
				.post("/api/cycle")
				.set("Authorization", `Bearer ${token}`)
				.send({ period_start_date: "not-a-date" });

			expect(response.status).toBe(400);
		});

		it("should return 201 for valid cycle entry", async () => {
			// Mark other ongoing periods as not ongoing.
			pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
			// Upsert the new cycle entry.
			pool.query.mockResolvedValueOnce({
				rows: [{
					id: 1,
					user_id: 1,
					period_start_date: "2024-01-15",
					period_end_date: null,
					is_period_ongoing: true,
					cycle_length: null,
					flow_intensity: null,
					created_at: new Date().toISOString(),
				}],
			});
			// getPredictionSourceRows.
			pool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.post("/api/cycle")
				.set("Authorization", `Bearer ${token}`)
				.send({ period_start_date: "2024-01-15" });

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("Cycle entry added successfully.");
			expect(response.body.entry).toBeDefined();
			expect(response.body.prediction).toBeDefined();
		});

		it("should return 400 for invalid flow_intensity", async () => {
			const response = await request(app)
				.post("/api/cycle")
				.set("Authorization", `Bearer ${token}`)
				.send({ period_start_date: "2024-01-15", flow_intensity: "extreme" });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("flow_intensity");
		});

		it("should return 401 without auth token", async () => {
			const response = await request(app)
				.post("/api/cycle")
				.send({ period_start_date: "2024-01-15" });

			expect(response.status).toBe(401);
		});
	});

	describe("GET /api/cycle/status", () => {
		it("should return 200 with no ongoing period", async () => {
			pool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.get("/api/cycle/status")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.status.isPeriodOngoing).toBe(false);
			expect(response.body.shouldPrompt).toBe(false);
		});

		it("should return 200 with active period", async () => {
			pool.query.mockResolvedValueOnce({
				rows: [{
					id: 1,
					user_id: 1,
					period_start_date: "2024-01-15",
					period_end_date: null,
					is_period_ongoing: true,
					cycle_length: 28,
					flow_intensity: "medium",
					created_at: new Date().toISOString(),
				}],
			});

			const response = await request(app)
				.get("/api/cycle/status")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.status.isPeriodOngoing).toBe(true);
			expect(response.body.shouldPrompt).toBe(true);
		});
	});

	describe("GET /api/cycle", () => {
		it("should return 200 with cycle history", async () => {
			pool.query.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						user_id: 1,
						period_start_date: "2024-01-15",
						period_end_date: "2024-01-20",
						is_period_ongoing: false,
						cycle_length: 28,
						flow_intensity: "medium",
						created_at: new Date().toISOString(),
					},
				],
			});

			const response = await request(app)
				.get("/api/cycle")
				.set("Authorization", `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.entries).toBeDefined();
			expect(response.body.entries).toHaveLength(1);
		});
	});

	describe("PATCH /api/cycle/end", () => {
		it("should return 404 when no ongoing period found", async () => {
			pool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.patch("/api/cycle/end")
				.set("Authorization", `Bearer ${token}`)
				.send({});

			expect(response.status).toBe(404);
			expect(response.body.message).toContain("No ongoing period");
		});

		it("should return 200 when marking period end", async () => {
			// Find ongoing period.
			pool.query.mockResolvedValueOnce({
				rows: [{
					id: 1,
					user_id: 1,
					period_start_date: "2024-01-15",
					period_end_date: null,
					is_period_ongoing: true,
					cycle_length: 28,
					flow_intensity: "medium",
					created_at: new Date().toISOString(),
				}],
			});
			// Update period end.
			pool.query.mockResolvedValueOnce({
				rows: [{
					id: 1,
					user_id: 1,
					period_start_date: "2024-01-15",
					period_end_date: "2024-01-20",
					is_period_ongoing: false,
					cycle_length: 28,
					flow_intensity: "medium",
					created_at: new Date().toISOString(),
				}],
			});
			// getPredictionSourceRows.
			pool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.patch("/api/cycle/end")
				.set("Authorization", `Bearer ${token}`)
				.send({ period_end_date: "2024-01-20" });

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Period end marked successfully.");
			expect(response.body.entry).toBeDefined();
		});
	});
});
