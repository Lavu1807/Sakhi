function buildSymptomSuggestions({ symptoms }) {
    const suggestions = [];
    
    if (!Array.isArray(symptoms)) return { suggestions };

    symptoms.forEach(symptom => {
        switch(symptom.toLowerCase()) {
            case 'cramps':
                suggestions.push("Try a warm heating pad on your lower abdomen.");
                suggestions.push("Drink chamomile or ginger tea to relax muscles.");
                break;
            case 'fatigue':
                suggestions.push("Ensure you get at least 8 hours of sleep.");
                suggestions.push("Take short naps if needed and stay hydrated.");
                break;
            case 'headache':
                suggestions.push("Stay hydrated and limit screen time.");
                suggestions.push("Apply a cool compress to your forehead.");
                break;
            case 'nausea':
                suggestions.push("Try eating small, frequent meals.");
                suggestions.push("Ginger ale or peppermint tea can help settle your stomach.");
                break;
            case 'bloating':
                suggestions.push("Reduce sodium intake and avoid carbonated drinks.");
                suggestions.push("Peppermint tea or gentle yoga stretches can relieve bloating.");
                break;
            default:
                break;
        }
    });

    if (suggestions.length === 0 && symptoms.length > 0) {
        suggestions.push("Rest, stay hydrated, and monitor your symptoms. Consult a doctor if they persist.");
    }

    return { suggestions };
}

module.exports = {
    buildSymptomSuggestions
};
