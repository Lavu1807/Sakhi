const MEDICAL_SAFETY_RESPONSE = "Please consult a healthcare professional for medical emergencies.";

function shouldUseMedicalSafetyResponse(message) {
    if (!message) return false;
    const lower = message.toLowerCase();
    return lower.includes("emergency") || lower.includes("suicide") || lower.includes("heart attack") || lower.includes("bleeding out");
}

module.exports = { MEDICAL_SAFETY_RESPONSE, shouldUseMedicalSafetyResponse };
