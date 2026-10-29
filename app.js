const $ = (selector) => document.querySelector(selector);
const form = $("#expenseForm");
const today = new Date();
$("#todayLabel").textContent = today.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
$("#expenseDate").value = today.toISOString().slice(0, 10);

const currency = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value || 0));

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function getFilters() {
  const params = new URLSearchParams();
  if ($("#searchInput").value.trim()) params.set("search", $("#searchInput").value.trim());
  if ($("#filterCategory").value !== "All") params.set("category", $("#filterCategory").value);
  if ($("#startDate").value) params.set("start", $("#startDate").value);
  if ($("#endDate").value) params.set("end", $("#endDate").value);
  return params.toString();
}

async function loadExpenses() {
  const tbody = $("#expenseRows");
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Loading expenses...</td></tr>';
  try {
    const expenses = await api(`/api/expenses?${getFilters()}`);
    $("#resultCount").textContent = `${expenses.length} ${expenses.length === 1 ? "entry" : "entries"}`;
    if (!expenses.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No expenses found. Add one above to get started.</td></tr>';
      return;
    }
    tbody.innerHTML = expenses.map(item => `
      <tr>
        <td><span class="expense-title">${escapeHtml(item.title)}</span>${item.notes ? `<span class="expense-notes">${escapeHtml(item.notes)}</span>` : ""}</td>
        <td><span class="category-tag">${escapeHtml(item.category)}</span></td>
        <td>${formatDate(item.expense_date)}</td>
        <td class="amount-cell">${currency(item.amount)}</td>
        <td><div class="action-group"><button class="action-btn" data-edit="${item.id}">Edit</button><button class="action-btn delete" data-delete="${item.id}">Delete</button></div></td>
      </tr>`).join("");
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(error.message)}</td></tr>`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function formatDate(value) {
  const parsed = new Date(`${value}T00:00:00`);
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

async function loadSummary() {
  try {
    const summary = await api("/api/summary");
    $("#totalSpent").textContent = currency(summary.total);
    $("#monthlySpent").textContent = currency(summary.monthly);
    $("#expenseCount").textContent = summary.count;
    const holder = $("#categoryBreakdown");
    if (!summary.categories.length) {
      holder.innerHTML = '<p class="empty-state">Add your first expense to see the breakdown.</p>';
      return;
    }
    const max = Math.max(...summary.categories.map(item => Number(item.total)));
    holder.innerHTML = summary.categories.map(item => `
      <div class="category-row">
        <span class="category-name">${escapeHtml(item.category)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, Number(item.total) / max * 100)}%"></div></div>
        <span class="category-amount">${currency(item.total)}</span>
      </div>`).join("");
  } catch (error) {
    $("#categoryBreakdown").innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

function resetForm() {
  form.reset();
  $("#expenseId").value = "";
  $("#expenseDate").value = today.toISOString().slice(0, 10);
  $("#formTitle").textContent = "Add an expense";
  $("#saveButton").textContent = "Save expense";
  $("#cancelEdit").classList.add("hidden");
  $("#formMessage").textContent = "";
  $("#formMessage").classList.remove("error");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $("#expenseId").value;
  const payload = {
    title: $("#title").value.trim(),
    amount: $("#amount").value,
    category: $("#category").value,
    expense_date: $("#expenseDate").value,
    notes: $("#notes").value.trim()
  };
  const button = $("#saveButton");
  button.disabled = true;
  $("#formMessage").textContent = "Saving...";
  $("#formMessage").classList.remove("error");
  try {
    await api(id ? `/api/expenses/${id}` : "/api/expenses", {
      method: id ? "PUT" : "POST", body: JSON.stringify(payload)
    });
    resetForm();
    $("#formMessage").textContent = id ? "Expense updated successfully." : "Expense added successfully.";
    await Promise.all([loadExpenses(), loadSummary()]);
  } catch (error) {
    $("#formMessage").textContent = error.message;
    $("#formMessage").classList.add("error");
  } finally {
    button.disabled = false;
  }
});

$("#expenseRows").addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    try {
      const expenses = await api("/api/expenses");
      const item = expenses.find(expense => expense.id === Number(editButton.dataset.edit));
      if (!item) return;
      $("#expenseId").value = item.id;
      $("#title").value = item.title;
      $("#amount").value = item.amount;
      $("#category").value = item.category;
      $("#expenseDate").value = item.expense_date;
      $("#notes").value = item.notes || "";
      $("#formTitle").textContent = "Edit expense";
      $("#saveButton").textContent = "Update expense";
      $("#cancelEdit").classList.remove("hidden");
      $("#formMessage").textContent = "";
      $("#title").focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { alert(error.message); }
  }
  if (deleteButton) {
    if (!window.confirm("Delete this expense? This action cannot be undone.")) return;
    try {
      await api(`/api/expenses/${deleteButton.dataset.delete}`, { method: "DELETE" });
      await Promise.all([loadExpenses(), loadSummary()]);
    } catch (error) { alert(error.message); }
  }
});

$("#cancelEdit").addEventListener("click", resetForm);
["searchInput", "filterCategory", "startDate", "endDate"].forEach(id => {
  const element = $(`#${id}`);
  element.addEventListener(id === "searchInput" ? "input" : "change", loadExpenses);
});
$("#clearFilters").addEventListener("click", () => {
  $("#searchInput").value = "";
  $("#filterCategory").value = "All";
  $("#startDate").value = "";
  $("#endDate").value = "";
  loadExpenses();
});

Promise.all([loadExpenses(), loadSummary()]);
