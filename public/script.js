const SUPABASE_URL = "https://fbhhmujhabtmgpujjvhc.supabase.co/rest/v1";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiaGhtdWpoYWJ0bWdwdWpqdmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTI5MzMsImV4cCI6MjA3NjI4ODkzM30.rJL3odf9xejqvrOYHvO97qkU1opah6DO2ox29BEIVt4";

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const assignmentForm = document.getElementById("assignmentForm");
const filterForm = document.getElementById("filterForm");
const assignmentsTableBody = document.querySelector("#assignmentsTable tbody");
const formMessage = document.getElementById("formMessage");
const listMessage = document.getElementById("listMessage");
const filterBtn = document.getElementById("filterBtn");
const clearFilterBtn = document.getElementById("clearFilterBtn");

// Submit new assignment
assignmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMessage.textContent = "";
  const fd = new FormData(assignmentForm);
  const payload = {
    assignment_title: fd.get("assignment_title").trim(),
    teacher_name: fd.get("teacher_name").trim(),
    class_name: fd.get("class_name").trim(),
    day_type: fd.get("day_type"),
    due_date: fd.get("due_date"),
  };

  // Basic validation
  if (!payload.assignment_title || !payload.teacher_name || !payload.class_name || !payload.day_type || !payload.due_date) {
    formMessage.textContent = "Please complete all fields.";
    formMessage.style.color = "red";
    return;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/calendar`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || res.statusText);
    }
    const created = await res.json();
    formMessage.textContent = "Saved.";
    formMessage.style.color = "var(--success)";
    assignmentForm.reset();
    // refresh list with same filters
    loadAssignmentsFromForm();
  } catch (err) {
    console.error(err);
    formMessage.textContent = "Error saving assignment.";
    formMessage.style.color = "red";
  }
});

// Load assignments with filters
async function loadAssignments(filters = {}) {
  listMessage.textContent = "Loading…";
  assignmentsTableBody.innerHTML = "";
  try {
    // build query: select=* and optional eq filters
    let q = "?select=*";
    if (filters.teacher_name) q += `&teacher_name=eq.${encodeURIComponent(filters.teacher_name)}`;
    if (filters.class_name) q += `&class_name=eq.${encodeURIComponent(filters.class_name)}`;
    if (filters.day_type) q += `&day_type=eq.${encodeURIComponent(filters.day_type)}`;
    // order by due_date asc (due_date stored as TEXT in your schema; storing as YYYY-MM-DD helps lexicographic order)
    q += `&order=due_date.asc`;
    const res = await fetch(`${SUPABASE_URL}/calendar${q}`, {
      method: "GET",
      headers,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      listMessage.textContent = "No assignments found.";
      return;
    }
    listMessage.textContent = `${rows.length} assignments`;
    renderRows(rows);
  } catch (err) {
    console.error(err);
    listMessage.textContent = "Failed to load assignments.";
  }
}

function renderRows(rows) {
  assignmentsTableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.assignment_title)}</td>
      <td>${escapeHtml(r.teacher_name)}</td>
      <td>${escapeHtml(r.class_name)}</td>
      <td>${escapeHtml(r.day_type)}</td>
      <td>${escapeHtml(r.due_date)}</td>
    `;
    fragment.appendChild(tr);
  });
  assignmentsTableBody.appendChild(fragment);
}

// Load using filter form fields
function loadAssignmentsFromForm() {
  const fd = new FormData(filterForm);
  const filters = {
    teacher_name: (fd.get("teacher_name") || "").trim() || null,
    class_name: (fd.get("class_name") || "").trim() || null,
    day_type: (fd.get("day_type") || "").trim() || null,
  };
  // only include non-empty
  Object.keys(filters).forEach((k) => {
    if (!filters[k]) delete filters[k];
  });
  loadAssignments(filters);
}

filterBtn.addEventListener("click", () => {
  loadAssignmentsFromForm();
});
clearFilterBtn.addEventListener("click", () => {
  filterForm.reset();
  loadAssignments({});
});

// quick escape for injection safety in UI
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// load initial list
loadAssignments({});