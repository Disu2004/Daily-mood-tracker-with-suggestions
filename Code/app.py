from flask import Flask, render_template, request, jsonify
from deepface import DeepFace
import cv2
import base64
import numpy as np

app = Flask(__name__)

# Home route
@app.route('/')
def index():
    return render_template('home.html')

# Webcam route
@app.route('/webcam')
def webcam():
    return render_template('webcam.html')

# Webcam route
@app.route('/emoji')
def emoji():
    return render_template('emoji.html')

# Detect mood from webcam image
@app.route('/detect_mood', methods=['POST'])
def detect_mood():
    try:
        data = request.get_json()
        img_data = data['image'].split(',')[1]
        img_bytes = base64.b64decode(img_data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        result = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
        emotion = result[0]['dominant_emotion']
        return jsonify({'mood': emotion})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/favicon.ico')
def favicon():
    return '', 204  # No Content


# Run the app
if __name__ == '__main__':
    app.run(debug=True)
