import csv
import io
import os
import sqlite3
from datetime import date, datetime
from flask import Flask, jsonify, render_template, request, Response, g

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "expenses.db")

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount REAL NOT NULL CHECK(amount > 0),
                category TEXT NOT NULL,
                expense_date TEXT NOT NULL,
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        g.db.commit()
    return g.db

@app.teardown_appcontext
def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

def row_to_dict(row):
    return dict(row) if row else None

@app.route("/")
def index():
    return render_template("index.html")

@app.get("/api/expenses")
def list_expenses():
    db = get_db()
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip()
    start = request.args.get("start", "").strip()
    end = request.args.get("end", "").strip()

    sql = "SELECT * FROM expenses WHERE 1=1"
    params = []
    if category and category != "All":
        sql += " AND category = ?"
        params.append(category)
    if search:
        sql += " AND (title LIKE ? OR notes LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    if start:
        sql += " AND expense_date >= ?"
        params.append(start)
    if end:
        sql += " AND expense_date <= ?"
        params.append(end)
    sql += " ORDER BY expense_date DESC, id DESC"
    rows = db.execute(sql, params).fetchall()
    return jsonify([row_to_dict(row) for row in rows])

@app.post("/api/expenses")
def create_expense():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    category = str(data.get("category", "")).strip()
    notes = str(data.get("notes", "")).strip()
    amount = data.get("amount")
    expense_date = str(data.get("expense_date", "")).strip()

    if not title or not category or not expense_date or amount in (None, ""):
        return jsonify({"error": "Title, amount, category and date are required."}), 400
    try:
        amount = float(amount)
        datetime.strptime(expense_date, "%Y-%m-%d")
    except (ValueError, TypeError):
        return jsonify({"error": "Enter a valid positive amount and date."}), 400
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero."}), 400

    db = get_db()
    cursor = db.execute(
        "INSERT INTO expenses (title, amount, category, expense_date, notes) VALUES (?, ?, ?, ?, ?)",
        (title, amount, category, expense_date, notes)
    )
    db.commit()
    row = db.execute("SELECT * FROM expenses WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(row_to_dict(row)), 201

@app.put("/api/expenses/<int:expense_id>")
def update_expense(expense_id):
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    category = str(data.get("category", "")).strip()
    notes = str(data.get("notes", "")).strip()
    amount = data.get("amount")
    expense_date = str(data.get("expense_date", "")).strip()
    if not title or not category or not expense_date or amount in (None, ""):
        return jsonify({"error": "Title, amount, category and date are required."}), 400
    try:
        amount = float(amount)
        datetime.strptime(expense_date, "%Y-%m-%d")
    except (ValueError, TypeError):
        return jsonify({"error": "Enter a valid positive amount and date."}), 400
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero."}), 400

    db = get_db()
    result = db.execute(
        """UPDATE expenses SET title=?, amount=?, category=?, expense_date=?, notes=?
           WHERE id=?""",
        (title, amount, category, expense_date, notes, expense_id)
    )
    db.commit()
    if result.rowcount == 0:
        return jsonify({"error": "Expense not found."}), 404
    return jsonify(row_to_dict(db.execute("SELECT * FROM expenses WHERE id=?", (expense_id,)).fetchone()))

@app.delete("/api/expenses/<int:expense_id>")
def delete_expense(expense_id):
    db = get_db()
    result = db.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    db.commit()
    if result.rowcount == 0:
        return jsonify({"error": "Expense not found."}), 404
    return jsonify({"message": "Expense deleted successfully."})

@app.get("/api/summary")
def summary():
    db = get_db()
    total = db.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM expenses").fetchone()["total"]
    count = db.execute("SELECT COUNT(*) AS count FROM expenses").fetchone()["count"]
    month = date.today().strftime("%Y-%m")
    monthly = db.execute(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE substr(expense_date, 1, 7)=?",
        (month,)
    ).fetchone()["total"]
    categories = db.execute(
        "SELECT category, SUM(amount) AS total FROM expenses GROUP BY category ORDER BY total DESC"
    ).fetchall()
    return jsonify({
        "total": round(total, 2),
        "count": count,
        "monthly": round(monthly, 2),
        "categories": [dict(row) for row in categories]
    })

@app.get("/api/export")
def export_csv():
    rows = get_db().execute(
        "SELECT id, title, amount, category, expense_date, notes, created_at FROM expenses ORDER BY expense_date DESC"
    ).fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Amount", "Category", "Date", "Notes", "Created At"])
    for row in rows:
        writer.writerow([row["id"], row["title"], row["amount"], row["category"],
                         row["expense_date"], row["notes"], row["created_at"]])
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"}
    )

@app.errorhandler(404)
def not_found(_error):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Endpoint not found."}), 404
    return "Page not found", 404

if __name__ == "__main__":
    app.run(debug=True)
