const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createUser, findUserByEmail } = require("../models/userModel");

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

		return res.status(201).json({
			message: "Signup successful.",
			user: newUser,
		});
	} catch (error) {
		console.error("Signup failed", error);
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
			return res.status(401).json({
				message: "Invalid email or password.",
			});
		}

		const passwordMatches = await bcrypt.compare(password, user.password);

		if (!passwordMatches) {
			return res.status(401).json({
				message: "Invalid email or password.",
			});
		}

		const token = createToken(user);

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
		console.error("Login failed", error);
		return res.status(500).json({
			message: "Failed to login.",
		});
	}
}

module.exports = {
	signup,
	login,
};
