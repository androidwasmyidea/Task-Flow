const STORAGE_KEY = "taskflow.tasks.v1";
const THEME_KEY = "taskflow.theme.v1";

const state = {
  tasks: loadTasks(),
  currentDate: startOfDay(new Date()),
  view: "day",
  filter: "all",
  editingId: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function uid() {
  return "task_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(value) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(key) {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function minutesFromTime(time) {
  const [h, m] = String(time).split(":").map(Number);
  return h * 60 + m;
}

function timeFromMinutes(total) {
  const safe = Math.max(0, Math.min(1439, total));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function prettyTime(minutes) {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return formatDate(d, { hour: "numeric", minute: "2-digit" });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeTask(task) {
  return {
    id: task.id || uid(),
    title: String(task.title || "Untitled task"),
    duration: Math.max(5, Number(task.duration) || 30),
    priority: ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium",
    deadline: task.deadline || "",
    notes: task.notes || "",
    completed: Boolean(task.completed),
    scheduledDate: task.scheduledDate || null,
    startMinutes: Number.isFinite(Number(task.startMinutes)) ? Number(task.startMinutes) : null,
    createdAt: task.createdAt || Date.now()
  };
}

function createTask(data) {
  return normalizeTask({
    ...data,
    id: uid(),
    createdAt: Date.now()
  });
}

function taskMatchesFilter(task) {
  if (state.filter === "all") return true;
  if (state.filter === "high") return task.priority === "high" && !task.completed;
  if (state.filter === "unscheduled") return !task.scheduledDate && !task.completed;
  if (state.filter === "completed") return task.completed;
  return true;
}

function visibleTasks() {
  return state.tasks
    .filter(taskMatchesFilter)
    .sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      const priority = { high: 0, medium: 1, low: 2 };
      if (priority[a.priority] !== priority[b.priority]) {
        return priority[a.priority] - priority[b.priority];
      }
      return a.createdAt - b.createdAt;
    });
}

function tasksForDate(key) {
  return state.tasks
    .filter(t => t.scheduledDate === key)
    .sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0));
}

function isToday(date) {
  return dateKey(date) === dateKey(new Date());
}

function getWeekStart(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function render() {
  renderCounts();
  renderTaskList();
  renderDay();
  renderWeek();
  renderTaskTable();
  updateViewVisibility();
}

function renderCounts() {
  const active = state.tasks.filter(t => !t.completed);
  $("#inboxCount").textContent = active.length;
  $("#allCount").textContent = active.length;
  $("#highCount").textContent = active.filter(t => t.priority === "high").length;
  $("#unscheduledCount").textContent = active.filter(t => !t.scheduledDate).length;
  $("#completedCount").textContent = state.tasks.filter(t => t.completed).length;
}

function renderTaskList() {
  const list = $("#taskList");
  const empty = $("#emptyTasks");
  const tasks = visibleTasks();

  list.innerHTML = tasks.slice(0, 100).map(task => {
    const scheduled = task.scheduledDate
      ? `${formatDate(parseDateKey(task.scheduledDate), { month: "short", day: "numeric" })} ${prettyTime(task.startMinutes ?? 0)}`
      : "Unscheduled";

    return `
      <article class="task-card" data-task-id="${escapeHTML(task.id)}">
        <div class="task-main">
          <button class="check ${task.completed ? "done" : ""}" data-action="complete" data-id="${escapeHTML(task.id)}" aria-label="Complete task"></button>
          <div>
            <p class="task-title ${task.completed ? "done" : ""}">${escapeHTML(task.title)}</p>
          </div>
        </div>
        <div class="task-meta">
          <span class="badge">${formatDuration(task.duration)}</span>
          <span class="badge ${task.priority}">${escapeHTML(task.priority)}</span>
          <span class="badge">${escapeHTML(scheduled)}</span>
        </div>
      </article>
    `;
  }).join("");

  empty.classList.toggle("hidden", tasks.length !== 0);
}

function renderDay() {
  const key = dateKey(state.currentDate);
  const title = isToday(state.currentDate)
    ? "Today"
    : formatDate(state.currentDate, { weekday: "long", month: "long", day: "numeric" });

  $("#dayTitle").textContent = title;
  $("#dayDateLabel").textContent = formatDate(state.currentDate, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const timeline = $("#timeline");
  const startHour = 0;
  const endHour = 24;
  const hourHeight = 64;

  timeline.innerHTML = Array.from({ length: endHour - startHour }, (_, index) => {
    const hour = startHour + index;
    return `
      <div class="hour-row" data-hour="${hour}">
        <span class="hour-label">${formatHour(hour)}</span>
        <div class="hour-line"></div>
        <div class="quarter-line"></div>
      </div>
    `;
  }).join("");

  tasksForDate(key).forEach(task => {
    if (task.startMinutes == null) return;
    const top = task.startMinutes / 60 * hourHeight;
    const height = Math.max(26, task.duration / 60 * hourHeight - 3);
    const element = document.createElement("div");
    element.className = `calendar-task ${task.priority} ${task.completed ? "completed" : ""}`;
    element.style.top = `${top}px`;
    element.style.height = `${height}px`;
    element.dataset.taskId = task.id;
    element.innerHTML = `
      <strong>${escapeHTML(task.title)}</strong>
      <small>${prettyTime(task.startMinutes)} · ${formatDuration(task.duration)}</small>
    `;
    timeline.appendChild(element);
  });

  if (isToday(state.currentDate)) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const line = document.createElement("div");
    line.className = "current-time";
    line.style.top = `${currentMinutes / 60 * hourHeight}px`;
    timeline.appendChild(line);
  }
}

function formatHour(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return formatDate(d, { hour: "numeric" });
}

function renderWeek() {
  const start = getWeekStart(state.currentDate);
  const end = addDays(start, 6);

  $("#weekTitle").textContent =
    `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(end, { month: "short", day: "numeric", year: "numeric" })}`;

  $("#weekGrid").innerHTML = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const key = dateKey(date);
    const tasks = tasksForDate(key);

    return `
      <div class="week-day ${isToday(date) ? "today" : ""}" data-date="${key}">
        <div class="week-day-header">
          <strong>${formatDate(date, { weekday: "short" })}</strong>
          <span>${formatDate(date, { month: "short", day: "numeric" })}</span>
        </div>
        ${tasks.map(task => `
          <div class="week-task" data-task-id="${escapeHTML(task.id)}">
            <strong>${escapeHTML(task.title)}</strong>
            <small>${prettyTime(task.startMinutes ?? 0)} · ${formatDuration(task.duration)}</small>
          </div>
        `).join("")}
      </div>
    `;
  }).join("");
}

function renderTaskTable() {
  const table = $("#taskTable");
  const tasks = state.tasks.slice().sort((a, b) => b.createdAt - a.createdAt);

  table.innerHTML = tasks.map(task => {
    const scheduled = task.scheduledDate
      ? `${formatDate(parseDateKey(task.scheduledDate), { month: "short", day: "numeric" })} · ${prettyTime(task.startMinutes ?? 0)}`
      : "Not scheduled";

    return `
      <div class="task-row" data-task-id="${escapeHTML(task.id)}">
        <div>
          <div class="row-title">${escapeHTML(task.title)}</div>
          ${task.deadline ? `<div class="row-sub">Deadline: ${escapeHTML(task.deadline)}</div>` : ""}
        </div>
        <div>${formatDuration(task.duration)}</div>
        <div><span class="badge ${task.priority}">${escapeHTML(task.priority)}</span></div>
        <div>${escapeHTML(scheduled)}</div>
        <button class="delete-small" data-action="delete" data-id="${escapeHTML(task.id)}" title="Delete">×</button>
      </div>
    `;
  }).join("");
}

function updateViewVisibility() {
  $("#dayView").classList.toggle("hidden", state.view !== "day");
  $("#weekView").classList.toggle("hidden", state.view !== "week");
  $("#tasksView").classList.toggle("hidden", state.view !== "tasks");

  $$(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === state.view);
  });
}

function openTaskModal(task = null) {
  state.editingId = task?.id || null;
  $("#modalTitle").textContent = task ? "Edit task" : "New task";
  $("#taskId").value = task?.id || "";
  $("#taskTitle").value = task?.title || "";
  $("#taskPriority").value = task?.priority || "medium";
  $("#taskDeadline").value = task?.deadline || "";
  $("#taskNotes").value = task?.notes || "";
  $("#deleteTaskBtn").classList.toggle("hidden", !task);

  const standardDurations = ["15", "30", "45", "60", "90", "120", "180"];
  const durationValue = String(task?.duration || 30);
  if (standardDurations.includes(durationValue)) {
    $("#taskDuration").value = durationValue;
    $("#customDurationWrap").classList.add("hidden");
  } else {
    $("#taskDuration").value = "custom";
    $("#customDuration").value = task?.duration || 30;
    $("#customDurationWrap").classList.remove("hidden");
  }

  const scheduled = Boolean(task?.scheduledDate);
  $("#scheduleNow").checked = scheduled;
  $("#scheduleFields").classList.toggle("hidden", !scheduled);
  $("#scheduleDate").value = task?.scheduledDate || dateKey(state.currentDate);
  $("#scheduleTime").value = task?.startMinutes != null ? timeFromMinutes(task.startMinutes) : "09:00";

  $("#taskModal").classList.remove("hidden");
  setTimeout(() => $("#taskTitle").focus(), 20);
}

function closeTaskModal() {
  $("#taskModal").classList.add("hidden");
  state.editingId = null;
}

function getFormDuration() {
  const selected = $("#taskDuration").value;
  if (selected === "custom") {
    return Math.max(5, Math.min(1440, Number($("#customDuration").value) || 30));
  }
  return Number(selected);
}

function saveTaskFromForm(event) {
  event.preventDefault();

  const title = $("#taskTitle").value.trim();
  if (!title) return;

  const schedule = $("#scheduleNow").checked;
  const scheduledDate = schedule ? $("#scheduleDate").value : null;
  const startMinutes = schedule ? minutesFromTime($("#scheduleTime").value) : null;

  const data = {
    title,
    duration: getFormDuration(),
    priority: $("#taskPriority").value,
    deadline: $("#taskDeadline").value,
    notes: $("#taskNotes").value.trim(),
    completed: false,
    scheduledDate,
    startMinutes
  };

  if (state.editingId) {
    const index = state.tasks.findIndex(t => t.id === state.editingId);
    if (index !== -1) {
      const old = state.tasks[index];
      state.tasks[index] = normalizeTask({
        ...old,
        ...data,
        completed: old.completed
      });
    }
  } else {
    state.tasks.push(createTask(data));
  }

  saveTasks();
  closeTaskModal();
  render();
  showToast(state.editingId ? "Task updated" : "Task created");
}

function toggleComplete(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
}

function deleteTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  if (!confirm(`Delete "${task.title}"?`)) return;

  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
  render();
  showToast("Task deleted");
}

function clearCompleted() {
  const count = state.tasks.filter(t => t.completed).length;
  if (!count) return;
  if (!confirm(`Delete ${count} completed task${count === 1 ? "" : "s"}?`)) return;

  state.tasks = state.tasks.filter(t => !t.completed);
  saveTasks();
  render();
  showToast("Completed tasks cleared");
}

function findFreeSlot(date, duration, preferredStart = 9 * 60) {
  const dayKey = dateKey(date);
  const busy = tasksForDate(dayKey)
    .filter(t => t.startMinutes != null)
    .map(t => ({
      start: t.startMinutes,
      end: t.startMinutes + t.duration
    }))
    .sort((a, b) => a.start - b.start);

  const workStart = Math.max(7 * 60, preferredStart);
  const workEnd = 22 * 60;

  let candidate = workStart;

  for (const block of busy) {
    if (candidate + duration <= block.start && candidate + duration <= workEnd) {
      return candidate;
    }
    if (block.end > candidate) candidate = block.end;
  }

  return candidate + duration <= workEnd ? candidate : null;
}

function autoPlan() {
  const unscheduled = state.tasks
    .filter(t => !t.completed && !t.scheduledDate)
    .sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority];
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return a.createdAt - b.createdAt;
    });

  let planned = 0;
  let date = startOfDay(state.currentDate);

  for (const task of unscheduled) {
    let placed = false;

    for (let offset = 0; offset < 14; offset++) {
      const target = addDays(date, offset);
      if (task.deadline && dateKey(target) > task.deadline) break;

      const slot = findFreeSlot(target, task.duration, 9 * 60);
      if (slot != null) {
        task.scheduledDate = dateKey(target);
        task.startMinutes = slot;
        planned++;
        placed = true;
        break;
      }
    }

    if (!placed) break;
  }

  saveTasks();
  render();

  if (planned) {
    showToast(`${planned} task${planned === 1 ? "" : "s"} scheduled`);
  } else {
    showToast("No free slots found");
  }
}

function autoPlanWeek() {
  autoPlan();
}

function scheduleTaskAt(task, date, minutes) {
  const slot = findFreeSlot(date, task.duration, minutes);
  if (slot == null) {
    showToast("Not enough free time in this day");
    return;
  }

  task.scheduledDate = dateKey(date);
  task.startMinutes = slot;
  saveTasks();
  render();
  showToast("Task scheduled");
}

function handleTimelineClick(event) {
  if (event.target.closest(".calendar-task")) {
    const id = event.target.closest(".calendar-task").dataset.taskId;
    const task = state.tasks.find(t => t.id === id);
    if (task) openTaskModal(task);
    return;
  }

  const rect = $("#timeline").getBoundingClientRect();
  const y = event.clientY - rect.top + $("#timeline").scrollTop;
  const minutes = Math.floor((y / 64) * 60 / 15) * 15;

  const unscheduled = state.tasks
    .filter(t => !t.completed && !t.scheduledDate)
    .sort((a, b) => a.createdAt - b.createdAt);

  if (!unscheduled.length) {
    openTaskModal();
    $("#scheduleNow").checked = true;
    $("#scheduleFields").classList.remove("hidden");
    $("#scheduleDate").value = dateKey(state.currentDate);
    $("#scheduleTime").value = timeFromMinutes(minutes);
    return;
  }

  const task = unscheduled[0];
  scheduleTaskAt(task, state.currentDate, Math.max(0, Math.min(23 * 60, minutes)));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function setView(view) {
  state.view = view;
  render();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark") document.body.classList.add("dark");
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    THEME_KEY,
    document.body.classList.contains("dark") ? "dark" : "light"
  );
}

function bindEvents() {
  $("#newTaskBtn").addEventListener("click", () => openTaskModal());
  $("#quickAddBtn").addEventListener("click", () => openTaskModal());
  $("#closeModalBtn").addEventListener("click", closeTaskModal);
  $("#cancelTaskBtn").addEventListener("click", closeTaskModal);
  $("#taskForm").addEventListener("submit", saveTaskFromForm);
  $("#themeBtn").addEventListener("click", toggleTheme);
  $("#todayBtn").addEventListener("click", () => {
    state.currentDate = startOfDay(new Date());
    render();
  });

  $("#prevDayBtn").addEventListener("click", () => {
    state.currentDate = addDays(state.currentDate, -1);
    render();
  });

  $("#nextDayBtn").addEventListener("click", () => {
    state.currentDate = addDays(state.currentDate, 1);
    render();
  });

  $("#prevWeekBtn").addEventListener("click", () => {
    state.currentDate = addDays(state.currentDate, -7);
    render();
  });

  $("#nextWeekBtn").addEventListener("click", () => {
    state.currentDate = addDays(state.currentDate, 7);
    render();
  });

  $("#autoPlanBtn").addEventListener("click", autoPlan);
  $("#weekAutoPlanBtn").addEventListener("click", autoPlanWeek);
  $("#tasksAutoPlanBtn").addEventListener("click", autoPlan);
  $("#clearCompletedBtn").addEventListener("click", clearCompleted);

  $("#taskDuration").addEventListener("change", () => {
    $("#customDurationWrap").classList.toggle(
      "hidden",
      $("#taskDuration").value !== "custom"
    );
  });

  $("#scheduleNow").addEventListener("change", () => {
    $("#scheduleFields").classList.toggle("hidden", !$("#scheduleNow").checked);
  });

  $$(".nav-btn").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  $$(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      render();
    });
  });

  $("#timeline").addEventListener("click", handleTimelineClick);

  $("#taskList").addEventListener("click", event => {
    const complete = event.target.closest('[data-action="complete"]');
    if (complete) {
      event.stopPropagation();
      toggleComplete(complete.dataset.id);
      return;
    }

    const card = event.target.closest(".task-card");
    if (card) {
      const task = state.tasks.find(t => t.id === card.dataset.taskId);
 
