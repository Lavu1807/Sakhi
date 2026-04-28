const request = require("supertest");

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

const app = require("../../src/app");

describe("Myths endpoints", () => {
	it("should return myths list", async () => {
		const response = await request(app).get("/api/myths");

		expect(response.status).toBe(200);
		expect(Array.isArray(response.body.myths)).toBe(true);
		expect(response.body.total).toBeGreaterThan(0);
	});

	it("should return 400 for invalid category", async () => {
		const response = await request(app).get("/api/myths?category=invalid");

		expect(response.status).toBe(400);
		expect(response.body.message).toContain("Invalid category");
	});

	it("should return one random myth", async () => {
		const response = await request(app).get("/api/myths/random");

		expect(response.status).toBe(200);
		expect(response.body.myth).toBeDefined();
		expect(response.body.myth.id).toBeDefined();
	});

	it("should return 400 for invalid feedback payload", async () => {
		const response = await request(app)
			.post("/api/myths/feedback")
			.send({ mythId: 0, feedbackType: "helpful" });

		expect(response.status).toBe(400);
		expect(response.body.message).toContain("mythId must be a positive integer");
	});

	it("should save feedback for valid myth", async () => {
		const response = await request(app)
			.post("/api/myths/feedback")
			.send({ mythId: 1, feedbackType: "helpful" });

		expect(response.status).toBe(201);
		expect(response.body.message).toBe("Feedback received. Thank you!");
		expect(response.body.feedback).toBeDefined();
		expect(response.body.feedback.mythId).toBe(1);
	});
});
