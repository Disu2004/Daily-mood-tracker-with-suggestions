import { useEffect, useRef, useState } from "react";

export default function VoiceInteraction({ onMoodDetected }) {
  const recognitionRef = useRef(null);
  const stepRef = useRef("waitingForWakeWord");
  const isSpeakingRef = useRef(false);
  const [voiceMessage, setVoiceMessage] = useState(
    "Say 'hi', 'hey', 'hello', or 'hyy' to start voice interaction"
  );
  const [synthAllowed, setSynthAllowed] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [conversation, setConversation] = useState([]); // Stores all messages

  const token = localStorage.getItem("accessToken");
  let userId = localStorage.getItem("userId");

  const SUGGESTION_API_URL = "http://localhost:8000/api/suggestion";
  const USER_NEED_API_URL = "http://localhost:8000/api/userneed";

  // ---- Load voices ----
  useEffect(() => {
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const voices = synth.getVoices();
      setAvailableVoices(voices);
      console.log(
        "🎙 Available voices:",
        voices.map((v) => `${v.name} (${v.lang})`)
      );
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // ---- Enable speech on first click/touch ----
  useEffect(() => {
    const enableSynth = () => {
      setSynthAllowed(true);
      setVoiceMessage(
        "Voice interaction enabled. Say 'hi', 'hey', 'hello', or 'hyy'."
      );
      window.removeEventListener("click", enableSynth);
      window.removeEventListener("touchstart", enableSynth);
    };
    window.addEventListener("click", enableSynth);
    window.addEventListener("touchstart", enableSynth);
    return () => {
      window.removeEventListener("click", enableSynth);
      window.removeEventListener("touchstart", enableSynth);
    };
  }, []);

  // ---- Speech recognition ----
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceMessage("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = async (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript
          .trim()
          .toLowerCase();
      console.log("🎤 Heard:", transcript);

      // ---- Show user input ----
      addToConversation("user", transcript);

      // ---- WAKE WORD ----
      const wakeWords = ["hi", "hey", "hello", "hyy", "hey babe", "hey proton"];
      if (
        wakeWords.some(
          (w) =>
            transcript === w || transcript.startsWith(w + " ")
        )
      ) {
        recognition.stop();
        stepRef.current = "askedMood";
        const botQuestion = "How's your mood today?";
        addToConversation("bot", botQuestion);
        speak(botQuestion, () => {
          setVoiceMessage("Listening for your mood...");
          safeStartRecognition();
        });
        return;
      }

      // ---- MOOD DETECTION ----
      if (stepRef.current === "askedMood") {
        recognition.stop();
        setVoiceMessage(`You said: "${transcript}"`);
        stepRef.current = "listeningForRequests";

        const moodWords = [
          "happy",
          "sad",
          "angry",
          "excited",
          "tired",
          "anxious",
          "bored",
          "surprised",
          "fear",
          "neutral",
        ];
        const foundMood = moodWords.find((mood) => transcript.includes(mood));

        if (foundMood) {
          if (onMoodDetected) onMoodDetected(foundMood);

          try {
            const resp = await fetch(SUGGESTION_API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mood: foundMood, id: userId }),
            });

            if (resp.ok) {
              const data = await resp.json();
              if (data.categories) {
                const firstSuggestion = data.categories.gemini?.[0];

                let replyText = "";
                if (firstSuggestion) {
                  const positiveMoods = ["happy", "excited", "surprised"];
                  if (positiveMoods.includes(foundMood)) {
                    replyText = `Awesome! Since you're feeling ${foundMood}, how about ${firstSuggestion}? Here are some more suggestions displayed. Tell me now how may I help you?`;
                  } else {
                    replyText = `Come on, don't be ${foundMood}, you can ${firstSuggestion}. Here are some more suggestions displayed. Tell me now how may I help you?`;
                  }
                } else {
                  replyText = `No saved actions found for mood: ${foundMood}`;
                }

                addToConversation("bot", replyText);
                speak(replyText);
              }
            }
          } catch (err) {
            console.error("Error fetching suggestion:", err);
            const msg = "Network error when fetching suggestion.";
            addToConversation("bot", msg);
            speak(msg);
          }
        } else {
          const fallback =
            "Sorry, I didn't catch your mood. Please try again.";
          addToConversation("bot", fallback);
          speak(fallback);
        }
      }

      // ---- REQUEST HANDLING ----
      else if (stepRef.current === "listeningForRequests") {
        recognition.stop();
        setVoiceMessage(`Processing your request: "${transcript}"`);

        try {
          const resp = await fetch(USER_NEED_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ request: transcript, id: userId }),
          });

          if (resp.ok) {
            const data = await resp.json();
            const reply =
              data.response || "Sorry, I don't have an answer for that.";
            addToConversation("bot", reply);
            speak(reply, () => {
              safeStartRecognition();
            });
          } else {
            const msg = "Failed to fetch response from server.";
            addToConversation("bot", msg);
            speak(msg, () => safeStartRecognition());
          }
        } catch (err) {
          console.error("Error calling userneed:", err);
          const msg = "Error processing your request.";
          addToConversation("bot", msg);
          speak(msg, () => safeStartRecognition());
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
        setVoiceMessage(`Error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    safeStartRecognition();

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, [synthAllowed, onMoodDetected]);

  // ---- Helpers ----
  const safeStartRecognition = () => {
    if (recognitionRef.current && !isSpeakingRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }
  };

  const speak = (text, onEnd) => {
    const synth = window.speechSynthesis;
    if (!synth || !synthAllowed) return;
    console.log("🔊 Speaking:", text);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    isSpeakingRef.current = true;

    if (availableVoices.length === 0) {
      synth.addEventListener("voiceschanged", () =>
        actuallySpeak(text, window.speechSynthesis.getVoices(), onEnd)
      );
    } else {
      actuallySpeak(text, availableVoices, onEnd);
    }
  };

  const actuallySpeak = (text, voices, onEnd) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";

    const indianVoice =
      voices.find(
        (v) =>
          v.lang === "hi-IN" ||
          v.name.toLowerCase().includes("veena") ||
          v.name.toLowerCase().includes("rishi") ||
          v.name.toLowerCase().includes("indian")
      ) ||
      voices.find((v) => v.lang === "en-GB") ||
      voices[0];
    console.log(indianVoice);
    if (indianVoice) utterance.voice = indianVoice;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      safeStartRecognition();
      if (onEnd) onEnd();
    };

    synth.speak(utterance);
  };

  // ---- Conversation helpers ----
  const addToConversation = (sender, text) => {
    if (sender === "bot") {
      typeTextEffect(text); // Type out AI reply
    } else {
      setConversation((prev) => [...prev, { sender, text }]);
    }
  };

  const typeTextEffect = (text) => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      const currentText = text.slice(0, i);
      setConversation((prev) => {
        const last = prev[prev.length - 1];
        if (last?.sender === "bot") {
          // Replace last bot message
          return [...prev.slice(0, -1), { sender: "bot", text: currentText }];
        } else {
          return [...prev, { sender: "bot", text: currentText }];
        }
      });
      if (i >= text.length) clearInterval(interval);
    }, 30); // typing speed
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Voice Interaction</h3>
      <div
        style={{
          border: "1px solid #ccc",
          padding: 10,
          height: 300,
          overflowY: "auto",
          marginBottom: 10,
        }}
      >
        {conversation.map((msg, idx) => (
          <div
            key={idx}
            style={{
              textAlign: msg.sender === "user" ? "right" : "left",
              marginBottom: 5,
            }}
          >
            <b>{msg.sender === "user" ? "You: " : "Bot: "}</b>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>
      <p>Status: {voiceMessage}</p>
      <p>
        <i>Tip: Say "hi" or "hey proton" anytime to give your mood again.</i>
      </p>
    </div>
  );
}
