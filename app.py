"""Math teaching visualizations — Flask app.

Run:  python app.py   then open http://127.0.0.1:5000
"""
from flask import Flask, abort, render_template

app = Flask(__name__)

# Add new topics here: each one gets a card on the home screen.
TOPICS = [
    {
        "slug": "linear-transformations",
        "title": "Linear Transformations",
        "tagline": "Every invertible linear transformation is just a change of basis.",
        "template": "linear_transformations.html",
        "tags": ["Linear algebra", "Change of basis", "Eigenvectors", "PCA"],
    },
]
TOPICS_BY_SLUG = {t["slug"]: t for t in TOPICS}


@app.route("/")
def home():
    return render_template("index.html", topics=TOPICS)


@app.route("/topic/<slug>")
def topic(slug):
    t = TOPICS_BY_SLUG.get(slug)
    if t is None:
        abort(404)
    return render_template(t["template"], topic=t)


if __name__ == "__main__":
    app.run(debug=True)
