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

jest.mock("../../src/modules/chatbot/chat.memory", () => ({
	getConversationMemory: jest.fn(),
	updateConversationMemory: jest.fn(),
}));

jest.mock("../../src/modules/chatbot/chat.service", () => ({
	getHybridChatResponse: jest.fn(),
}));

const { getConversationMemory, updateConversationMemory } = require("../../src/modules/chatbot/chat.memory");
const { getHybridChatResponse } = require("../../src/modules/chatbot/chat.service");
const app = require("../../src/app");

describe("Chat endpoints", () => {
	beforeEach(() => {
		getConversationMemory.mockReset();
		updateConversationMemory.mockReset();
		getHybridChatResponse.mockReset();

		getConversationMemory.mockResolvedValue({
			messages: [],
			lastIntent: "general",
			geminiCallCount: 0,
		});

		updateConversationMemory.mockResolvedValue({
			messages: [{ message: "hello", intent: "general" }],
			lastIntent: "general",
			geminiCallCount: 1,
		});

		getHybridChatResponse.mockResolvedValue({
			intent: "general",
			reply: "Hello from Sakhi.",
		});
	});

	it("should return 400 when message is missing", async () => {
		const response = await request(app)
			.post("/api/chat")
			.send({ sessionId: "session-1" });

		expect(response.status).toBe(400);
		expect(response.body.message).toBe("message is required.");
	});

	it("should return 400 for anonymous request without sessionId", async () => {
		const response = await request(app)
			.post("/api/chat")
			.send({ message: "hello" });

		expect(response.status).toBe(400);
		expect(response.body.message).toContain("sessionId is required");
	});

	it("should return 200 for anonymous request with sessionId", async () => {
		const response = await request(app)
			.post("/api/chat")
			.send({ message: "hello", sessionId: "abc123" });

		expect(response.status).toBe(200);
		expect(response.body.reply).toBe("Hello from Sakhi.");
		expect(getConversationMemory).toHaveBeenCalledWith("session:abc123");
		expect(updateConversationMemory).toHaveBeenCalledWith("session:abc123", {
			message: "hello",
			intent: "general",
		});
	});

	it("should use user conversation key for authenticated requests", async () => {
		const token = createAuthToken(42);

		const response = await request(app)
			.post("/api/chat")
			.set("Authorization", `Bearer ${token}`)
			.send({ message: "I feel tired" });

		expect(response.status).toBe(200);
		expect(getConversationMemory).toHaveBeenCalledWith("user:42");
		expect(updateConversationMemory).toHaveBeenCalledWith("user:42", {
			message: "I feel tired",
			intent: "general",
		});
	});
});
