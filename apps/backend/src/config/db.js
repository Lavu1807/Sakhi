const { Pool } = require("pg");

require("dotenv").config();

const pool = new Pool({
	host: process.env.DB_HOST || "localhost",
	port: Number(process.env.DB_PORT) || 5432,
	user: process.env.DB_USER || "postgres",
	password: process.env.DB_PASSWORD || "",
	database: process.env.DB_NAME || "sakhi",
});

pool.on("error", (error) => {
	const logger = require('../shared/utils/logger');
	logger.error({ msg: "Unexpected PostgreSQL client error", error: error.message });
});

module.exports = pool;
