const { GoogleGenerativeAI } = require("@google/generative-ai");

const MAX_OUTPUT_TOKENS = 140;
const SAFE_DEFAULT_RESPONSE = [
	"I am here with you. I cannot provide medical diagnosis, but I can offer supportive guidance.",
	"Try rest, hydration, and gentle self-care. If symptoms feel severe, please contact a healthcare professional.",
].join("\n");

let geminiModel = null;

function getGeminiModel() {
	if (geminiModel) {
		return geminiModel;
	}

	const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
	if (!apiKey || apiKey === "your_api_key_here") {
		return null;
	}

	const genAI = new GoogleGenerativeAI(apiKey);
	geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
	return geminiModel;
}

function normalizeContext(context) {
	const safeContext = context && typeof context === "object" ? context : {};
	const phase = typeof safeContext.phase === "string" ? safeContext.phase.trim() : "unknown";
	const symptoms = Array.isArray(safeContext.symptoms)
		? safeContext.symptoms.filter((item) => typeof item === "string" && item.trim().length > 0)
		: [];
	const symptomAnalysis = safeContext.symptomAnalysis && typeof safeContext.symptomAnalysis === "object"
		? safeContext.symptomAnalysis
		: {};
	const suggestions = Array.isArray(symptomAnalysis.suggestions)
		? symptomAnalysis.suggestions.filter((item) => typeof item === "string" && item.trim().length > 0)
		: [];
	const personalizedInsights = Array.isArray(symptomAnalysis.personalizedInsights)
		? symptomAnalysis.personalizedInsights.filter((item) => typeof item === "string" && item.trim().length > 0)
		: [];

	return {
		phase: phase || "unknown",
		symptoms: symptoms.length > 0 ? symptoms.join(", ") : "none",
		topSuggestion: suggestions[0] || "none",
		topPersonalizedInsight: personalizedInsights[0] || "none",
	};
}

function enforceShortResponse(text) {
	const lines = String(text || "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, 3);

	if (lines.length === 0) {
		return SAFE_DEFAULT_RESPONSE;
	}

	if (lines.length === 1) {
		return [
			lines[0],
			"I am here to support you with practical, gentle next steps.",
		].join("\n");
	}

	return lines.join("\n");
}

async function getGeminiResponse(message, context) {
	try {
		const model = getGeminiModel();
		if (!model) {
			return SAFE_DEFAULT_RESPONSE;
		}

		const userMessage = String(message || "").trim();
		if (!userMessage) {
			return SAFE_DEFAULT_RESPONSE;
		}

		const { phase, symptoms, topSuggestion, topPersonalizedInsight } = normalizeContext(context);
		const prompt = [
			"You are a supportive women's health assistant.",
			"Do not provide medical diagnosis.",
			"Be empathetic and helpful.",
			`User phase: ${phase}`,
			`Symptoms: ${symptoms}`,
			`Recent suggestion: ${topSuggestion}`,
			`Personalized symptom insight: ${topPersonalizedInsight}`,
			"",
			`User message: ${userMessage}`,
			"",
			"Respond in 2-3 short lines only.",
		].join("\n");

		const result = await model.generateContent({
			contents: [{ role: "user", parts: [{ text: prompt }] }],
			generationConfig: {
				temperature: 0.7,
				maxOutputTokens: MAX_OUTPUT_TOKENS,
			},
		});

		const content = result?.response?.text?.();
		return enforceShortResponse(content);
	} catch (error) {
		console.error("Gemini fallback request failed", error?.message || error);
		return SAFE_DEFAULT_RESPONSE;
	}
}

module.exports = {
	getGeminiResponse,
};