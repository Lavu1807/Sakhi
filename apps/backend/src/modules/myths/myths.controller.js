const {
	normalizeCategory,
	getMythCategories,
	getPersonalizedMyths,
	getRandomMyth,
	submitMythFeedback,
} = require('./myths.service');

function validateCategoryQuery(category) {
	if (category === undefined) {
		return { normalizedCategory: null, error: null };
	}

	const normalizedCategory = normalizeCategory(category);
	if (!normalizedCategory) {
		return {
			normalizedCategory: null,
			error: {
				message: "Invalid category. Use one of: Menstruation, Nutrition, Hygiene, Exercise, Mental Health.",
				categories: getMythCategories(),
			},
		};
	}

	return { normalizedCategory, error: null };
}

function getMyths(req, res) {
	const { normalizedCategory, error } = validateCategoryQuery(req.query.category);
	if (error) {
		return res.status(400).json(error);
	}

	const myths = getPersonalizedMyths({
		category: normalizedCategory,
		phase: req.query.phase,
		symptoms: req.query.symptoms,
	});

	return res.status(200).json({
		myths,
		total: myths.length,
	});
}

function getRandomMythEntry(req, res) {
	const { normalizedCategory, error } = validateCategoryQuery(req.query.category);
	if (error) {
		return res.status(400).json(error);
	}

	const myth = getRandomMyth(normalizedCategory);
	if (!myth) {
		return res.status(404).json({
			message: "No myths found for the selected category.",
		});
	}

	return res.status(200).json({ myth });
}

function addMythFeedback(req, res) {
	const mythId = Number.parseInt(String(req.body?.mythId), 10);
	const feedbackType = String(req.body?.feedbackType || "")
		.trim()
		.toLowerCase();

	if (!Number.isInteger(mythId) || mythId <= 0) {
		return res.status(400).json({
			message: "mythId must be a positive integer.",
		});
	}

	if (!["believed", "helpful"].includes(feedbackType)) {
		return res.status(400).json({
			message: "feedbackType must be either 'believed' or 'helpful'.",
		});
	}

	try {
		const feedback = submitMythFeedback({
			mythId,
			feedbackType,
		});

		return res.status(201).json({
			message: "Feedback received. Thank you!",
			feedback,
		});
	} catch (error) {
		if (error.code === "MYTH_NOT_FOUND") {
			return res.status(404).json({
				message: "Myth not found.",
			});
		}

		if (error.code === "INVALID_FEEDBACK_TYPE") {
			return res.status(400).json({
				message: error.message,
			});
		}

		console.error("Failed to save myth feedback", error);
		return res.status(500).json({
			message: "Failed to save myth feedback.",
		});
	}
}

module.exports = {
	getMyths,
	getRandomMythEntry,
	addMythFeedback,
};