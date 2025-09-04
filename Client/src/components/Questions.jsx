import React, { useState } from "react";
import "./CSS/Question.css";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const Questions = () => {
  const navigate = useNavigate();

  // Predefined moods
  const moodList = [ "happy",
          "sad",
          "angry",
          "excited",
          "tired",
          "anxious",
          "bored",
          "surprised",
          "fear",
          "neutral"
];

  // State for each mood’s action
  const [actions, setActions] = useState(
    moodList.reduce((acc, mood) => ({ ...acc, [mood]: "" }), {})
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Extract userId from token
  const token = localStorage.getItem("accessToken");
  let userId = localStorage.getItem("userId");
  
  // if (token) {
  //   try {
  //     const decoded = jwtDecode(token);
  //     userId = decoded.id;
  //     console.log(userId);
  //   } catch (err) {
  //     console.error("Invalid token:", err);
  //   }
  // }

  const handleCompleteRegistration = () => {
    navigate("/home");
  };

  const handleChange = (mood, value) => {
    setActions({ ...actions, [mood]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      // Loop through each mood and send only filled ones
      const filledMoods = Object.entries(actions).filter(([_, act]) => act.trim() !== "");

      for (const [mood, action] of filledMoods) {
        await fetch("http://localhost:8000/api/saveMoodAction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId, mood, action: action.trim() }),
        });
      }

      setMessage({
        type: "success",
        text: "Your responses have been saved! 🎉",
      });
      setActions(moodList.reduce((acc, mood) => ({ ...acc, [mood]: "" }), {}));
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save responses. Try again." });
    }

    setLoading(false);
  };

  return (
    <div
      className="question-container"
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        borderRadius: 8,
        backgroundColor: "#fff",
      }}
    >
      <h1 className="question-heading" style={{ textAlign: "center", marginBottom: 10 }}>
        Hey there! 👋
      </h1>
      <p className="question-subheading" style={{ textAlign: "center", marginBottom: 20 }}>
        Tell us what you usually do in different moods.
      </p>

      <form onSubmit={handleSubmit} className="question-form" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {moodList.map((mood) => (
          <div key={mood} style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor={mood} style={{ fontWeight: "600", marginBottom: 5 }}>
              What do you do when you are <strong>{mood}</strong>? 🙂
            </label>
            <input
              type="text"
              id={mood}
              placeholder={`e.g. ${mood === "Happy" ? "go for a walk" : mood === "Sad" ? "listen to music" : "..."}`}
              value={actions[mood]}
              onChange={(e) => handleChange(mood, e.target.value)}
              style={{
                padding: 10,
                borderRadius: 5,
                border: "1px solid #ccc",
                fontSize: 16,
              }}
              disabled={loading}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 20px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: 5,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = "#0056b3")}
          onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = "#007bff")}
        >
          {loading ? "Saving..." : "Submit"}
        </button>

        <button type="button" onClick={handleCompleteRegistration} style={{ marginTop: 10 }}>
          Complete Registration
        </button>
      </form>

      {message && (
        <p
          style={{
            marginTop: 20,
            color: message.type === "error" ? "red" : "green",
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
};

export default Questions;
