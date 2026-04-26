module.exports = {
	testEnvironment: "node",
	setupFiles: ["<rootDir>/tests/setupEnv.js"],
	testMatch: ["<rootDir>/tests/**/*.test.js"],
	clearMocks: true,
	restoreMocks: true,
	collectCoverageFrom: [
		"src/modules/**/*.js",
		"src/ai/**/*.js",
		"src/integrations/**/*.js",
		"src/shared/**/*.js",
		"!src/server.js",
	],
	coveragePathIgnorePatterns: ["/node_modules/"],
};
