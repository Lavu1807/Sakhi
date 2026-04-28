const pool = require('../../config/db');

async function findUserByEmail(email) {
	const query = `
		SELECT id, name, email, password, age, weight, height, lifestyle, created_at
		FROM users
		WHERE email = $1
		LIMIT 1
	`;

	const { rows } = await pool.query(query, [email]);
	return rows[0] || null;
}

async function createUser({ name, email, passwordHash, age, weight, height, lifestyle }) {
	const query = `
		INSERT INTO users (name, email, password, age, weight, height, lifestyle)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, email, age, weight, height, lifestyle, created_at
	`;

	const { rows } = await pool.query(query, [
		name,
		email,
		passwordHash,
		age,
		weight,
		height,
		lifestyle,
	]);
	return rows[0];
}

async function savePasswordResetToken(userId, token, expiresAt) {
	const query = `
		INSERT INTO password_reset_tokens (user_id, token, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, token
	`;

	const { rows } = await pool.query(query, [userId, token, expiresAt]);
	return rows[0];
}

module.exports = {
	findUserByEmail,
	createUser,
	savePasswordResetToken,
};
