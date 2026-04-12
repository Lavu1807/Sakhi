const { getGeminiResponse } = require("./geminiFallback");
const {
	MEDICAL_SAFETY_RESPONSE,
	shouldUseMedicalSafetyResponse,
} = require("./safetyService");

async function getFallbackResponse(message, context) {
	if (shouldUseMedicalSafetyResponse(message)) {
		return MEDICAL_SAFETY_RESPONSE;
	}

	return getGeminiResponse(message, context);
}

module.exports = {
	getFallbackResponse,
};
