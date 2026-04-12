const MEDICAL_SAFETY_RESPONSE = "I recommend consulting a healthcare professional for accurate guidance.";

const MEDICAL_QUERY_PATTERNS = [
	/\bdiagnos(e|is|ing)\b/i,
	/\bdisease(s)?\b/i,
	/\bmedicine(s)?\b/i,
	/\bmedication(s)?\b/i,
	/\bdrug(s)?\b/i,
	/\btablet(s)?\b/i,
	/\bpill(s)?\b/i,
	/\btreatment(s)?\b/i,
	/\bcure(s|d)?\b/i,
	/\bprescription(s)?\b/i,
];

function shouldUseMedicalSafetyResponse(message) {
	const normalizedMessage = String(message || "").trim();
	if (!normalizedMessage) {
		return false;
	}

	return MEDICAL_QUERY_PATTERNS.some((pattern) => pattern.test(normalizedMessage));
}

module.exports = {
	MEDICAL_SAFETY_RESPONSE,
	shouldUseMedicalSafetyResponse,
};