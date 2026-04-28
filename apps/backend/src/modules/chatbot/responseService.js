async function generateResponse(intent, context, message) {
    if (intent === 'cycle') return "It looks like you're asking about your cycle. Your current phase is " + (context?.phase || 'unknown') + ".";
    if (intent === 'mood') return "I understand you're feeling " + (context?.latestMood || 'a certain way') + ". Take care of yourself.";
    if (intent === 'symptoms') return "If you are experiencing symptoms, make sure to rest and stay hydrated.";
    if (intent === 'nutrition') return "Eating healthy can help with your cycle.";
    return "I'm here to help you with your health companion needs.";
}

module.exports = { generateResponse };
