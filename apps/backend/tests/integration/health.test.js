const request = require("supertest");

// Mock the database pool so no real DB connection is needed.
jest.mock("../../src/config/db", () => {
	const mockPool = {
		query: jest.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }),
		totalCount: 5,
		idleCount: 3,
		waitingCount: 0,
		on: jest.fn(),
	};
	return mockPool;
});

const app = require('../../src/app');

describe("Health endpoint", () => {
	it("GET /api/health should return 200 with ok status", async () => {
		const response = await request(app).get("/api/health");

		expect(response.status).toBe(200);
		expect(response.body.status).toBe("ok");
		expect(response.body.service).toBe("sakhi-backend");
		expect(response.body.database).toBe("up");
		expect(response.body.timestamp).toBeDefined();
		expect(response.body.uptime).toBeDefined();
		expect(response.body.pool).toBeDefined();
		expect(response.body.alerts).toBeDefined();
	});

	it("should include requestId header in responses", async () => {
		const response = await request(app).get("/api/health");

		expect(response.headers["x-request-id"]).toBeDefined();
	});
});

describe("404 handling", () => {
	it("should return 404 for unknown routes", async () => {
		const response = await request(app).get("/api/nonexistent-route");

		expect(response.status).toBe(404);
		expect(response.body.message).toBe("Route not found.");
	});
});
