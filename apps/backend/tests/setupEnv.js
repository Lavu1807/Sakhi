process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_value_1234567890";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
process.env.USDA_API_KEY = process.env.USDA_API_KEY || "test_usda_api_key";
process.env.LOG_LEVEL = "silent";
process.env.METRICS_ENABLED = "false";
