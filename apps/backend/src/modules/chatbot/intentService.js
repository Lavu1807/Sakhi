function detectIntent(message) {
    if (!message || typeof message !== 'string') return { intent: 'general' };
    
    const lower = message.toLowerCase();
    if (lower.includes('symptom') || lower.includes('pain') || lower.includes('ache')) return { intent: 'symptoms' };
    if (lower.includes('mood') || lower.includes('feel')) return { intent: 'mood' };
    if (lower.includes('cycle') || lower.includes('period') || lower.includes('phase')) return { intent: 'cycle' };
    if (lower.includes('eat') || lower.includes('food') || lower.includes('nutrition')) return { intent: 'nutrition' };
    
    return { intent: 'general' };
}

module.exports = { detectIntent };
