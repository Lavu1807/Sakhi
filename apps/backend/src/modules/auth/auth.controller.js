const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { createUser, findUserByEmail, savePasswordResetToken } = require('./auth.model');
const logger = require('../../shared/utils/logger');
const { authAttemptsTotal } = require('../../shared/utils/metrics');

const SALT_ROUNDS = 10;

function parseOptionalNumber(value) {
	if (value === undefined || value === null || value === "") {
		return null;
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return null;
	}

	return parsed;
}

function createToken(user) {
	return jwt.sign(
		{
			userId: user.id,
			email: user.email,
		},
		process.env.JWT_SECRET || "sakhi_dev_secret",
		{ expiresIn: "7d" },
	);
}

async function signup(req, res) {
	try {
		const { name, email, password, age, weight, height, lifestyle } = req.body;

		if (!name || !email || !password) {
			return res.status(400).json({
				message: "Name, email, and password are required.",
			});
		}

		const normalizedEmail = String(email).trim().toLowerCase();
		const parsedAge = parseOptionalNumber(age);
		const parsedWeight = parseOptionalNumber(weight);
		const parsedHeight = parseOptionalNumber(height);
		const normalizedLifestyle = lifestyle ? String(lifestyle).trim().toLowerCase() : null;

		if (age !== undefined && parsedAge === null) {
			return res.status(400).json({
				message: "Age must be a valid number.",
			});
		}

		if (weight !== undefined && parsedWeight === null) {
			return res.status(400).json({
				message: "Weight must be a valid number.",
			});
		}

		if (height !== undefined && parsedHeight === null) {
			return res.status(400).json({
				message: "Height must be a valid number.",
			});
		}

		if (normalizedLifestyle && !["sedentary", "active", "moderate"].includes(normalizedLifestyle)) {
			return res.status(400).json({
				message: "lifestyle must be one of: sedentary, moderate, active.",
			});
		}

		const existingUser = await findUserByEmail(normalizedEmail);

		if (existingUser) {
			return res.status(409).json({
				message: "An account with this email already exists.",
			});
		}

		const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
		const newUser = await createUser({
			name: String(name).trim(),
			email: normalizedEmail,
			passwordHash,
			age: parsedAge,
			weight: parsedWeight,
			height: parsedHeight,
			lifestyle: normalizedLifestyle,
		});

		authAttemptsTotal.inc({ result: "signup_success" });
		logger.info({ msg: "Signup successful", userId: newUser.id, email: normalizedEmail });

		return res.status(201).json({
			message: "Signup successful.",
			user: newUser,
		});
	} catch (error) {
		authAttemptsTotal.inc({ result: "signup_failure" });
		logger.error({ msg: "Signup failed", error: error.message });
		return res.status(500).json({
			message: "Failed to create account.",
		});
	}
}

async function login(req, res) {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({
				message: "Email and password are required.",
			});
		}

		const normalizedEmail = String(email).trim().toLowerCase();
		const user = await findUserByEmail(normalizedEmail);

		if (!user) {
			authAttemptsTotal.inc({ result: "failure" });
			return res.status(401).json({
				message: "Invalid email or password.",
			});
		}

		const passwordMatches = await bcrypt.compare(password, user.password);

		if (!passwordMatches) {
			authAttemptsTotal.inc({ result: "failure" });
			return res.status(401).json({
				message: "Invalid email or password.",
			});
		}

		const token = createToken(user);

		authAttemptsTotal.inc({ result: "success" });
		logger.info({ msg: "Login successful", userId: user.id, email: normalizedEmail });

		return res.status(200).json({
			message: "Login successful.",
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				age: user.age,
				weight: user.weight,
				height: user.height,
				lifestyle: user.lifestyle,
				created_at: user.created_at,
			},
		});
	} catch (error) {
		authAttemptsTotal.inc({ result: "failure" });
		logger.error({ msg: "Login failed", error: error.message });
		return res.status(500).json({
			message: "Failed to login.",
		});
	}
}

async function forgotPassword(req, res) {
	try {
		const { email } = req.body;

		if (!email) {
			return res.status(400).json({
				message: "Email is required.",
			});
		}

		const normalizedEmail = String(email).trim().toLowerCase();
		const user = await findUserByEmail(normalizedEmail);

		if (!user) {
			// For security reasons, don't reveal if the email exists
			return res.status(200).json({
				message: "If an account with that email exists, a password reset link has been sent.",
			});
		}

		// Generate token
		const token = crypto.randomBytes(32).toString('hex');
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

		await savePasswordResetToken(user.id, token, expiresAt);

		// Log the token (scaffold for email delivery)
		logger.info({ 
			msg: "Password reset requested", 
			userId: user.id, 
			email: normalizedEmail, 
			resetToken: token 
		});

		return res.status(200).json({
			message: "If an account with that email exists, a password reset link has been sent.",
		});
	} catch (error) {
		logger.error({ msg: "Forgot password failed", error: error.message });
		return res.status(500).json({
			message: "Failed to process request.",
		});
	}
}

module.exports = {
	signup,
	login,
	forgotPassword,
};
