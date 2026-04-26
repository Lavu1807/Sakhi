// Load backend secrets and config (including USDA_API_KEY) from .env.
require("dotenv").config();

const app = require("./app");
const logger = require('./shared/utils/logger');

// PORT is configurable via environment variable for deployment flexibility.
const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
	logger.info({ msg: `SAKHI backend running on http://localhost:${port}`, port });
});
