const request = require("supertest");

// Mock the database pool.
jest.mock("../../src/config/db", () => {
	const mockPool = {
		query: jest.fn().mockResolvedValue({ rows: [] }),
		totalCount: 5,
		idleCount: 3,
		waitingCount: 0,
		on: jest.fn(),
	};
	return mockPool;
});

// Mock the USDA service.
jest.mock("../../src/integrations/usda.integration", () => ({
	getFoodNutrition: jest.fn(),
}));

const { getFoodNutrition } = require('../../src/integrations/usda.integration');
const app = require('../../src/app');

describe("Nutrition endpoints", () => {
	beforeEach(() => {
		getFoodNutrition.mockReset();
	});

	describe("GET /api/nutrition/:food", () => {
		it("should return 200 with nutrition data for valid food", async () => {
			getFoodNutrition.mockResolvedValueOnce({
				name: "Apple, raw",
				calories: 52,
				protein: 0.3,
				carbs: 13.8,
				fat: 0.2,
			});

			const response = await request(app).get("/api/nutrition/apple");

			expect(response.status).toBe(200);
			expect(response.body.name).toBe("Apple, raw");
			expect(response.body.calories).toBe(52);
			expect(response.body.protein).toBe(0.3);
		});

		it("should return 404 when food not found", async () => {
			getFoodNutrition.mockResolvedValueOnce(null);

			const response = await request(app).get("/api/nutrition/xyznonexistent");

			expect(response.status).toBe(404);
			expect(response.body.message).toBe("Nutrition data unavailable");
		});

		it("should return 503 when USDA service fails", async () => {
			getFoodNutrition.mockRejectedValueOnce(new Error("USDA API request failed."));

			const response = await request(app).get("/api/nutrition/apple");

			expect(response.status).toBe(503);
			expect(response.body.message).toBe("Nutrition data unavailable");
		});
	});
});
