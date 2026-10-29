# PennyPilot — Personal Expense Tracker

A responsive personal finance web app built with **Python, Flask, SQLite, HTML, CSS, and JavaScript**. Add and manage expenses, review spending totals, filter records, and export your data to CSV.

## Repository details

- **Suggested repository name:** `pennypilot-expense-tracker`
- **Description:** `A responsive personal expense tracker built with Flask, SQLite, HTML, CSS and JavaScript. Manage expenses, view category summaries, filter records, and export CSV reports.`
- **Topics:** `python`, `flask`, `sqlite`, `javascript`, `html`, `css`, `expense-tracker`, `personal-finance`

## Features

- Create, view, update, and delete expenses (CRUD)
- Dashboard with all-time spending, current-month spending, and expense count
- Category-wise spending breakdown
- Search by title or notes
- Filter by category and date range
- Export all expenses to a CSV file
- SQLite database created automatically on first run
- Server-side validation and parameterized SQL queries
- Responsive layout for desktop and mobile
- Basic HTML escaping for user-provided text

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask |
| Database | SQLite |
| Frontend | HTML5, CSS3, JavaScript (Fetch API) |
| Data export | Python `csv` module |

## Project structure

```text
pennypilot-expense-tracker/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── styles.css
    └── js/
        └── app.js
```

The `expenses.db` file is generated automatically when the application first accesses the database. It is intentionally excluded from Git.

## Run locally

### 1. Install Python

Use Python 3.10 or newer. Check your installation:

```bash
python --version
```

### 2. Create and activate a virtual environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Start the application

```bash
python app.py
```

Open `http://127.0.0.1:5000` in your browser. Add an expense to create the local database.

Stop the server with `Ctrl+C`.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/expenses` | List expenses; supports `category`, `search`, `start`, and `end` query parameters |
| `POST` | `/api/expenses` | Create an expense |
| `PUT` | `/api/expenses/<id>` | Update an expense |
| `DELETE` | `/api/expenses/<id>` | Delete an expense |
| `GET` | `/api/summary` | Return totals and category breakdown |
| `GET` | `/api/export` | Download a CSV report |

### Example create request

```json
{
  "title": "Grocery shopping",
  "amount": 650.5,
  "category": "Food",
  "expense_date": "2026-10-30",
  "notes": "Weekly groceries"
}
```

## Manual test checklist

- [ ] Add an expense with all required fields.
- [ ] Try submitting an empty title or an amount of `0`; verify validation.
- [ ] Edit an existing expense and confirm the new values appear.
- [ ] Delete an expense and confirm it disappears.
- [ ] Search by title and by notes.
- [ ] Filter by category and date range.
- [ ] Check that dashboard totals refresh after add, edit, and delete.
- [ ] Download `expenses.csv` and open it in a spreadsheet.
- [ ] Resize the browser to check the mobile layout.

## Notes and future improvements

This project is intended as a local learning/demo app, not a production financial service. It has no user accounts or authentication, so do not expose it publicly with personal financial data. Possible extensions include login, monthly budgets, recurring expenses, charts, pagination, automated tests, and deployment.

## License

This project is provided under the MIT License. See [`LICENSE`](LICENSE).
