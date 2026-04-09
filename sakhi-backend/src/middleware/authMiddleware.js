const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization || "";

	if (!authHeader.startsWith("Bearer ")) {
		return res.status(401).json({
			message: "Authorization token is missing.",
		});
	}

	const token = authHeader.split(" ")[1];

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET || "sakhi_dev_secret");

		req.user = {
			userId: decoded.userId,
			email: decoded.email,
		};

		return next();
	} catch (error) {
		return res.status(401).json({
			message: "Invalid or expired token.",
		});
	}
}

module.exports = authMiddleware;
