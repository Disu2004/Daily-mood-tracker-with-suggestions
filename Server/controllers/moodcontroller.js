// moodController.js
// import fetch from "node-fetch";
const Mood = require("../Schemas/moodschema")
const UserSuggestion = require('../Schemas/UserSuggestionSchema ');
const gemini_api_key = process.env.GEMINI_API_KEY;
// Utility function for safe network calls with timeout
async function safeFetch(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// ------------------------
// 📝 Save Mood & Action
// ------------------------
const saveMoodAction = async (req, res) => {
    try {
        const { id, mood, action } = req.body;
        console.log("Save Mood Action:", id, mood, action);

        if (!id || !mood || !action) {
            return res.status(400).json({ message: "User ID, Mood, and Action are required" });
        }

        const newMood = new Mood({
            id: id,
            mood: mood.trim().toLowerCase(),
            action: action.trim().toLowerCase()
        });

        await newMood.save();

        return res.json({
            status: true,
            message: "Mood and Action saved successfully",
            data: newMood
        });

    } catch (err) {
        console.error("Error saving mood/action:", err);
        return res.status(500).json({ message: "Failed to save mood/action" });
    }
};
// ------------------------
// 🔍 Fetch Suggestions
// ------------------------
const suggestion = async (req, res) => {
    try {
        const { id, mood } = req.body;
        console.log("📩 Request:", id, mood);

        if (!id || !mood) {
            return res.status(400).json({ message: "User ID and mood are required" });
        }

        // User Preferred Suggestions
        const userSaved = await Mood.find({
            id: String(id),
            mood: mood.toLowerCase()
        });
        const userSuggestions = userSaved.map((s) => s.action);

        // ML Based Suggestions
        let mlSuggestions = [];
        try {
            const flaskResp = await safeFetch("http://127.0.0.1:5001/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mood }),
            });

            if (flaskResp.ok) {
                const flaskData = await flaskResp.json();
                mlSuggestions = flaskData.suggestions || [];
            } else {
                console.error("⚠️ Flask API error:", flaskResp.statusText);
            }
        } catch (err) {
            console.error("⚠️ Flask server not reachable:", err.message);
        }

        // Gemini Suggestions
        let geminiSuggestions = [];
        //gemini suggestions fetch over here
        try {
            const geminiResponse = await safeFetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${gemini_api_key}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    {
                                        text: `The user is in a "${mood}" mood. Suggest 5 fresh, engaging activities, movies, or books they might enjoy. 
                                        Keep them short and varied, separated by commas.`
                                    }
                                ]
                            }
                        ]
                    }),
                },
                5000
            );

            if (geminiResponse.ok) {
                const data = await geminiResponse.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                geminiSuggestions = text
                    .split(/,|\n/)
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
            } else {
                console.error("⚠️ Gemini API error:", geminiResponse.statusText);
            }
        } catch (err) {
            console.error("⚠️ Gemini fetch error:", err.message);
        }
    console.log(mlSuggestions)
        return res.json({
            status: true,
            message: "Suggestions fetched successfully",
            categories: {
                userPreferred: userSuggestions.length ? userSuggestions : ["No suggestions yet."],
                mlBased: mlSuggestions.length ? mlSuggestions : ["No ML suggestions yet."],
                gemini: geminiSuggestions.length ? geminiSuggestions : ["No Gemini suggestions yet."],
            },
        });

    } catch (err) {
        console.error("❌ Error fetching suggestions:", err);
        return res.status(500).json({ message: "Failed to fetch suggestions" });
    }
};

// ------------------------
// 🎯 Detailed Suggestion
// ------------------------
const detailedSuggetion = async (req, res) => {
    try {
        const { suggestion } = req.body;
        if (!suggestion) {
            return res.status(400).json({ error: "Suggestion is required" });
        }
        const response = await safeFetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${gemini_api_key}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `The user selected "${suggestion}".
                                        Provide 5 short, specific recommendations related to this selection.
                                        Focus only on examples, titles, or concrete items, not explanations.
                                        Keep them concise, actionable, and directly relevant.
                                            `
                                }
                            ]
                        }
                    ]
                }),
            },
            7000
        );

        const data = await response.json();
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

        return res.json({ detailed: result });
    } catch (error) {
        console.error("Gemini API error:", error.message);
        return res.status(500).json({ error: "Failed to fetch detailed suggestion" });
    }
};

// ------------------------
// 🙋 User Need
// ------------------------
const userNeed = async (req, res) => {
    try {
        const { id, request } = req.body;

        if (!request) {
            return res.status(400).json({ response: "Please provide a request." });
        }

        const geminiResp = await safeFetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${gemini_api_key}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `The user asked: "${request}". 
                                    Provide exactly 5 unique titles if it's about songs, movies, or books, 
                                    or a short, relevant reply for other requests. 
                                    Avoid repetition, keep responses short.`
                                }
                            ]
                        }
                    ]
                }),
            },
            7000
        );

        if (!geminiResp.ok) {
            console.error("Gemini API request failed:", geminiResp.statusText);
            return res.status(500).json({ response: "Failed to fetch suggestions from API." });
        }

        const geminiData = await geminiResp.json();
        const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "No results found.";

        return res.json({ response: reply });
    } catch (err) {
        console.error("Error in userNeed:", err.message);
        return res.status(500).json({ response: "Something went wrong." });
    }
};

// ------------------------
// 💾 Save Suggestion
// ------------------------
const savesuggestion = async (req, res) => {
    try {
        const { userId, mood, suggestion } = req.body;

        if (!userId || !mood || !suggestion) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const saved = new UserSuggestion({ userId, mood, suggestion });
        await saved.save();

        console.log("Suggestion saved successfully");
        return res.json({ message: "Suggestion saved successfully", data: saved });
    } catch (err) {
        console.error("Save suggestion error:", err.message);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    saveMoodAction,
    suggestion,
    detailedSuggetion,
    userNeed,
    savesuggestion
};
