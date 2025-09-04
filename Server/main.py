from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import traceback
from deepface import DeepFace

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

def _strip_data_uri(data_uri: str) -> str:
    """
    If the incoming base64 string is a data URI (e.g. "data:image/png;base64,..."),
    strip the prefix and return only the base64 payload.
    """
    if data_uri is None:
        return data_uri
    if "," in data_uri:
        return data_uri.split(",", 1)[1]
    return data_uri

def analyze_emotion_from_base64(image_b64: str) -> str:
    """
    Decode a base64-encoded image, decode into an OpenCV image and run DeepFace emotion analysis.
    Returns the detected dominant emotion as a lowercase string. On failure returns "neutral".
    """
    try:
        b64_payload = _strip_data_uri(image_b64)
        img_data = base64.b64decode(b64_payload)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            # Could not decode image
            app.logger.error("Unable to decode image from base64 payload.")
            return "neutral"

        # Use enforce_detection=False so it returns something even if face detection is weak
        result = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)

        if isinstance(result, list) and len(result) > 0:
            dominant = result[0].get('dominant_emotion', "neutral")
        elif isinstance(result, dict):
            dominant = result.get('dominant_emotion', "neutral")
        else:
            dominant = "neutral"

        return str(dominant).lower()
    except Exception as e:
        app.logger.error("Emotion analysis error: %s", e)
        traceback.print_exc()
        return "neutral"

@app.route("/detect_mood", methods=["POST", "OPTIONS"])
def detect_mood():
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return jsonify({"message": "CORS preflight success"}), 200

    try:
        data = request.get_json(silent=True)
        if not data or "image" not in data:
            return jsonify({"error": "No image provided. Provide JSON with 'image' field (base64)."}), 400

        image_b64 = data.get("image")
        mood = analyze_emotion_from_base64(image_b64)

        return jsonify({
            "mood": mood
        }), 200

    except Exception as e:
        app.logger.error("Error in /detect_mood endpoint: %s", e)
        traceback.print_exc()
        return jsonify({"error": "Mood detection failed"}), 500

if __name__ == "__main__":
    # Use 0.0.0.0 if you want it reachable from other machines on your network
    app.run(host="127.0.0.1", port=5000, debug=True)
