const list = document.getElementById("task-list");
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const counter = document.getElementById("counter");
const errorBox = document.getElementById("error");

let tasks = [];

async function api(path, options = {}) {
  const res = await fetch(`/api/tasks${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function showError(err) {
  errorBox.textContent = err ? err.message : "";
  errorBox.hidden = !err;
}

function render() {
  list.replaceChildren(
    ...tasks.map((task) => {
      const li = document.createElement("li");
      li.classList.toggle("done", task.done);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `task-${task.id}`;
      checkbox.checked = task.done;
      checkbox.addEventListener("change", () => toggle(task, checkbox.checked));

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = task.title;

      const del = document.createElement("button");
      del.className = "delete";
      del.type = "button";
      del.title = "Supprimer";
      del.textContent = "✕";
      del.addEventListener("click", () => remove(task));

      li.append(checkbox, label, del);
      return li;
    })
  );

  const left = tasks.filter((t) => !t.done).length;
  counter.textContent =
    tasks.length === 0
      ? "Aucune tâche pour l'instant."
      : `${left} restante${left > 1 ? "s" : ""} sur ${tasks.length}`;
}

async function load() {
  try {
    tasks = await api("");
    render();
    showError(null);
  } catch (err) {
    showError(err);
  }
}

async function toggle(task, done) {
  try {
    Object.assign(task, await api(`/${task.id}`, { method: "PATCH", body: JSON.stringify({ done }) }));
    render();
  } catch (err) {
    showError(err);
  }
}

async function remove(task) {
  try {
    await api(`/${task.id}`, { method: "DELETE" });
    tasks = tasks.filter((t) => t.id !== task.id);
    render();
  } catch (err) {
    showError(err);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const task = await api("", { method: "POST", body: JSON.stringify({ title: input.value }) });
    tasks.push(task);
    input.value = "";
    render();
    showError(null);
  } catch (err) {
    showError(err);
  }
});

load();
