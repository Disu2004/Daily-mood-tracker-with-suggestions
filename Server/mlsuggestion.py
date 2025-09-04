from flask import Flask, request, jsonify
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from tabulate import tabulate  # pip install tabulate

app = Flask(__name__)

# Train model once
def train_model():
    # Load CSV
    df = pd.read_csv("Daylio_Mood_Activity_clean.csv")
    df = df.dropna(subset=["mood", "activities"])
    df = df[(df["mood"].str.strip() != "") & (df["activities"].str.strip() != "")]
    df = df.reset_index(drop=True)

    # Split activities by "|" and explode into separate rows
    df["activities"] = df["activities"].apply(lambda x: [a.strip() for a in x.split("|") if a.strip()])
    df = df.explode("activities").reset_index(drop=True)

    # Train TF-IDF + Logistic Regression model
    model = make_pipeline(TfidfVectorizer(), LogisticRegression(max_iter=1000))
    model.fit(df["mood"], df["activities"])

    return model, df

model, dataset = train_model()

@app.route("/predict", methods=["POST"])
def predict():
    try:
        req = request.get_json()
        mood = req.get("mood", "").strip()

        if not model or mood == "":
            return jsonify({"suggestions": []})

        clf = model.named_steps["logisticregression"]
        tfidf = model.named_steps["tfidfvectorizer"]

        # Transform input mood
        X_input = tfidf.transform([mood])
        probs = clf.predict_proba(X_input)[0]
        classes = clf.classes_

        # Get top 5 predicted activities (no need to split anymore)
        top_indices = probs.argsort()[-5:][::-1]
        final_suggestions = [classes[i] for i in top_indices]

        # Create a well-formatted probability table
        prob_table = pd.DataFrame({"activity": classes, "probability": probs})
        prob_table = prob_table.sort_values(by="probability", ascending=False)
        table_str = tabulate(prob_table.head(10), headers="keys", tablefmt="fancy_grid", showindex=False)
        print(f"\n===== ML Suggestion Table for Mood: {mood} =====")
        print(table_str)
        print("====================================\n")

        return jsonify({"suggestions": final_suggestions})

    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    app.run(port=5001, debug=True)
