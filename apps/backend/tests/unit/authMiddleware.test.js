const jwt = require("jsonwebtoken");

const TEST_SECRET = process.env.JWT_SECRET || "test_jwt_secret_value_1234567890";
const authMiddleware = require('../../src/shared/middleware/auth.middleware');

function createMockReq(authHeader) {
	return {
		headers: {
			authorization: authHeader || "",
		},
	};
}

function createMockRes() {
	const res = {};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
}

describe("authMiddleware", () => {
	it("should return 401 when no authorization header is present", () => {
		const req = createMockReq("");
		const res = createMockRes();
		const next = jest.fn();

		authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ message: "Authorization token is missing." });
		expect(next).not.toHaveBeenCalled();
	});

	it("should return 401 when header does not start with Bearer", () => {
		const req = createMockReq("Token abc123");
		const res = createMockRes();
		const next = jest.fn();

		authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it("should return 401 for an invalid token", () => {
		const req = createMockReq("Bearer invalid_token_value");
		const res = createMockRes();
		const next = jest.fn();

		authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired token." });
		expect(next).not.toHaveBeenCalled();
	});

	it("should return 401 for an expired token", () => {
		const token = jwt.sign(
			{ userId: 1, email: "test@test.com" },
			TEST_SECRET,
			{ expiresIn: "0s" },
		);

		const req = createMockReq(`Bearer ${token}`);
		const res = createMockRes();
		const next = jest.fn();

		// Small delay to ensure expiry.
		authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it("should set req.user and call next() for a valid token", () => {
		const token = jwt.sign(
			{ userId: 42, email: "sakhi@example.com" },
			TEST_SECRET,
			{ expiresIn: "1h" },
		);

		const req = createMockReq(`Bearer ${token}`);
		const res = createMockRes();
		const next = jest.fn();

		authMiddleware(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(req.user).toBeDefined();
		expect(req.user.userId).toBe(42);
		expect(req.user.email).toBe("sakhi@example.com");
		expect(res.status).not.toHaveBeenCalled();
	});
});
