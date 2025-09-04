import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import VoiceInteraction from "./VoiceInteraction";
import './CSS/Home.css'

// Reusable fancy button component
function FancyButton({ onClick, children }) {
  return (
    <button className="btn" onClick={onClick}>
      <strong>{children}</strong>
      <div id="container-stars"><div id="stars"></div></div>
      <div id="glow"><div className="circle"></div><div className="circle"></div></div>
    </button>
  );
}

function Home() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const voiceTimeoutRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [mood, setMood] = useState("Waiting...");
  const [suggestions, setSuggestions] = useState({
    userPreferred: [],
    mlBased: [],
    gemini: [],
  });
  const [detailedSuggestion, setDetailedSuggestion] = useState();

  const DETECT_API = "http://127.0.0.1:5000/detect_mood";
  const SUGGESTION_API = "http://localhost:8000/api/suggestion";
  const SAVE_API = "http://localhost:8000/api/savesuggestion";
  const DETAILED_API = "http://localhost:8000/api/detailedsuggestions";
  const MOOD_ACTION_API = "http://localhost:8000/api/saveMoodAction";
  const LOGOUT_API = "http://localhost:8000/logout";

  const token = localStorage.getItem("accessToken");
  let userId = null;
  if (token) {
    try {
      const base64Payload = token.split(".")[1];
      const payload = JSON.parse(atob(base64Payload));
      userId = payload.id;
    } catch (err) {
      console.error("Invalid token:", err);
    }
  }

  const normalize = (raw) =>
    Array.isArray(raw)
      ? raw.flatMap((item) => item.split(",")).map((s) => s.trim()).filter((s) => s.length > 0)
      : [];

  const handleLogout = async () => {
    try {
      const response = await fetch(LOGOUT_API, { method: "POST", credentials: "include" });
      if (response.ok) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userId");
        navigate("/");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSuggestions = async (s) => {
    try {
      await fetch(SAVE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, userId, suggestion: s }),
      });

      const res = await fetch(DETAILED_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion: s, userId }),
      });

      const data = await res.json();
      setDetailedSuggestion(`You selected: ${s}\nHere is the details:\n${data.detailed}`);
    } catch (err) {
      console.error("Error saving suggestion:", err);
    }
  };

  const handleMLSuggestion = async (s) => {
    try {
      await fetch(MOOD_ACTION_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, mood, action: s }),
      });
      await handleSuggestions(s);
    } catch (err) {
      console.error("Error saving ML suggestion:", err);
    }
  };

  const captureFrameDataUri = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const getMoodMessage = (detected) => detected;

  const sendFrameAndGetMood = async () => {
    try {
      const dataUri = captureFrameDataUri();
      if (!dataUri) return;

      const resp = await fetch(DETECT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUri }),
      });

      if (!resp.ok) {
        setMood("API error");
        return;
      }

      const body = await resp.json();
      const detected = body.mood || "unknown";
      setMood(getMoodMessage(detected));

      stopCamera();
      setRunning(false);

      if (userId) {
        const suggResp = await fetch(SUGGESTION_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId, mood: detected }),
        });

        const suggData = await suggResp.json();
        setSuggestions({
          userPreferred: normalize(suggData.categories?.userPreferred || []),
          mlBased: normalize(suggData.categories?.mlBased || []),
          gemini: normalize(suggData.categories?.gemini || []),
        });
      }
    } catch (err) {
      console.error("Error:", err);
      setMood("Network/Error");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Could not start camera:", err);
      setMood("Camera error");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startDetection = async () => {
    await startCamera();
    setRunning(true);
    setTimeout(sendFrameAndGetMood, 2000);
  };

  const clearVoiceTimeout = () => {
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
  };

  const handleVoiceMoodDetected = async (voiceMood) => {
    clearVoiceTimeout();
    setMood(voiceMood);
    if (userId) {
      const suggResp = await fetch(SUGGESTION_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, mood: voiceMood }),
      });
      const suggData = await suggResp.json();
      setSuggestions({
        userPreferred: normalize(suggData.categories?.userPreferred || []),
        mlBased: normalize(suggData.categories?.mlBased || []),
        gemini: normalize(suggData.categories?.gemini || []),
      });
    }
  };

  useEffect(() => {
    voiceTimeoutRef.current = setTimeout(() => {
      startDetection();
    }, 1000000);

    return () => {
      clearVoiceTimeout();
      stopCamera();
    };
  }, []);

  return (
    <>
      <h1>Welcome to MoodX!!!!</h1>

      <FancyButton onClick={handleLogout}>Logout</FancyButton>

      <div className="container">
        <div className="video-col">
          <video ref={videoRef} width="480" height="360" autoPlay playsInline muted />
          <div className="controls">
            {!running ? (
              <FancyButton onClick={startDetection}>Start Detection</FancyButton>
            ) : (
              <FancyButton onClick={stopCamera}>Stop Detection</FancyButton>
            )}
          </div>
        </div>

        <div className="info-col">
          <h3>Detected Mood</h3>
          <div>{mood}</div>

          {suggestions.userPreferred.length > 0 && (
            <div>
              <h4>User Preferred Suggestions</h4>
              {suggestions.userPreferred.map((s, i) => (
                <FancyButton key={i} onClick={() => handleSuggestions(s)}>{s}</FancyButton>
              ))}
            </div>
          )}

          {suggestions.mlBased.length > 0 && (
            <div>
              <h4>ML Based Suggestions</h4>
              {suggestions.mlBased.map((s, i) => (
                <FancyButton key={i} onClick={() => handleMLSuggestion(s)}>{s}</FancyButton>
              ))}
            </div>
          )}

          {suggestions.gemini.length > 0 && (
            <div>
              <h4>Gemini Suggestions</h4>
              {suggestions.gemini.map((s, i) => (
                <FancyButton key={i} onClick={() => handleSuggestions(s)}>{s}</FancyButton>
              ))}
            </div>
          )}

          {detailedSuggestion && (
            <div style={{ whiteSpace: "pre-line" }}>
              {detailedSuggestion}
            </div>
          )}

          <hr />

          <VoiceInteraction onMoodDetected={handleVoiceMoodDetected} />
        </div>
      </div>
    </>
  );
}

export default Home;
