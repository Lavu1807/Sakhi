const axios = require("axios");
const logger = require("../../shared/utils/logger");

const MODULE_LOG = logger.child({ module: "geminiFallback" });
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_LOCAL_FALLBACK_RESPONSE = "I can still help with cycle, mood, symptoms, and nutrition guidance. Please share a little more detail so I can support you better.";

function parseTimeout(rawValue) {
    const parsed = Number.parseInt(String(rawValue || ""), 10);
    if (!Number.isFinite(parsed) || parsed < 1000) {
        return 10000;
    }

    if (parsed > 30000) {
        return 30000;
    }

    return parsed;
}

const GEMINI_TIMEOUT_MS = parseTimeout(process.env.GEMINI_TIMEOUT_MS);

function normalizeText(value, maxLength = 280) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) {
        return "";
    }

    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength - 3)}...`;
}

function stringifyContextValue(value) {
    if (value === undefined || value === null) {
        return "";
    }

    if (Array.isArray(value)) {
        return normalizeText(value.map((item) => String(item || "").trim()).filter(Boolean).join(", "), 220);
    }

    if (typeof value === "object") {
        return normalizeText(JSON.stringify(value), 220);
    }

    return normalizeText(value, 220);
}

function buildContextLines(context) {
    if (!context || typeof context !== "object") {
        return [];
    }

    const allowedKeys = [
        "latestMood",
        "latestMoodIntensity",
        "latestMoodPhase",
        "severity",
        "risk",
        "phase",
        "cycleDay",
        "symptoms",
    ];

    const lines = [];
    for (const key of allowedKeys) {
        if (!Object.prototype.hasOwnProperty.call(context, key)) {
            continue;
        }

        const value = stringifyContextValue(context[key]);
        if (!value) {
            continue;
        }

        lines.push(`- ${key}: ${value}`);
    }

    return lines;
}

function buildPrompt(message, context) {
    const normalizedMessage = normalizeText(message, 600);
    const contextLines = buildContextLines(context);

    const basePrompt = [
        "You are Sakhi, a supportive menstrual health assistant.",
        "Respond in plain, empathetic language and avoid medical diagnosis.",
        "Keep responses concise (2 to 5 sentences).",
        "If symptoms seem severe, suggest consulting a healthcare professional.",
        "", 
        `User message: ${normalizedMessage || "No message provided."}`,
    ];

    if (contextLines.length > 0) {
        basePrompt.push("", "Relevant user context:", ...contextLines);
    }

    return basePrompt.join("\n");
}

function extractGeminiReply(responseData) {
    const parts = responseData?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) {
        return "";
    }

    const text = parts
        .map((part) => String(part?.text || "").trim())
        .filter(Boolean)
        .join("\n")
        .trim();

    return normalizeText(text, 1200);
}

function getGeminiApiKey() {
    return String(process.env.GEMINI_API_KEY || "").trim();
}

async function requestGemini(promptText, apiKey, modelName) {
    const endpoint = `${GEMINI_API_BASE_URL}/${encodeURIComponent(modelName)}:generateContent`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: promptText }],
            },
        ],
        generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 220,
        },
    };

    const { data } = await axios.post(endpoint, payload, {
        params: { key: apiKey },
        timeout: GEMINI_TIMEOUT_MS,
    });

    return extractGeminiReply(data);
}

async function getGeminiResponse(message, context) {
    const promptText = buildPrompt(message, context);
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
        MODULE_LOG.warn({ msg: "GEMINI_API_KEY is not configured; using local fallback response" });
        return GEMINI_LOCAL_FALLBACK_RESPONSE;
    }

    try {
        const reply = await requestGemini(promptText, apiKey, DEFAULT_GEMINI_MODEL);
        if (!reply) {
            MODULE_LOG.warn({ msg: "Gemini returned empty content; using local fallback response" });
            return GEMINI_LOCAL_FALLBACK_RESPONSE;
        }

        return reply;
    } catch (error) {
        MODULE_LOG.warn({ msg: "Gemini request failed; using local fallback response", error: error.message });
        return GEMINI_LOCAL_FALLBACK_RESPONSE;
    }
}

module.exports = {
    getGeminiResponse,
};
