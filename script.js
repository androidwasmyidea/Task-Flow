/* ============================================================
   TASKFLOW
   Standalone Time Blocking Planner
============================================================ */


/* ============================================================
   STORAGE
============================================================ */

const STORAGE_KEYS = {

    TASKS: "taskflow_tasks_v3",

    BLOCKS: "taskflow_blocks_v3",

    SETTINGS: "taskflow_settings_v3",

    THEME: "taskflow_theme_v3"

};


const DEFAULT_SETTINGS = {

    workingStart: "09:00",

    workingEnd: "22:00"

};


let tasks = loadData(
    STORAGE_KEYS.TASKS,
    []
);


let manualBlocks = loadData(
    STORAGE_KEYS.BLOCKS,
    []
);


let settings = loadData(
    STORAGE_KEYS.SETTINGS,
    DEFAULT_SETTINGS
);


let selectedDate = new Date();

let currentView = "today";

let calendarView = "day";

let draggedItem = null;

let currentSearchTerm = "";


/* ============================================================
   DOM
============================================================ */

const $ = selector =>
    document.querySelector(selector);


const $$ = selector =>
    [...document.querySelectorAll(selector)];


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);


function initialize() {

    initializeEventListeners();

    initializeSettings();

    initializeTheme();

    renderApplication();

    updateCurrentTimeLine();

    setInterval(
        updateCurrentTimeLine,
        60000
    );

}


/* ============================================================
   STORAGE FUNCTIONS
============================================================ */

function loadData(key, fallback) {

    try {

        const stored =
            localStorage.getItem(key);

        if (!stored) {

            return fallback;

        }

        return JSON.parse(stored);

    } catch (error) {

        console.error(
            "Storage error:",
            error
        );

        return fallback;

    }

}


function saveTasks() {

    localStorage.setItem(
        STORAGE_KEYS.TASKS,
        JSON.stringify(tasks)
    );

}


function saveBlocks() {

    localStorage.setItem(
        STORAGE_KEYS.BLOCKS,
        JSON.stringify(manualBlocks)
    );

}


function saveSettings() {

    localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings)
    );

}


/* ============================================================
   DATE UTILITIES
============================================================ */

function dateKey(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function parseDate(key) {

    const [
        year,
        month,
        day
    ] = key.split("-").map(Number);

    return new Date(
        year,
        month - 1,
        day
    );

}


function isToday(date) {

    return dateKey(date) ===
        dateKey(new Date());

}


function formatDate(date) {

    return date.toLocaleDateString(
        "en-IN",
        {
            weekday: "long",
            day: "numeric",
            month: "long"
        }
    );

}


function formatShortDate(key) {

    if (!key) return "No date";

    const date =
        parseDate(key);

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short"
        }
    );

}


/* ============================================================
   TIME UTILITIES
============================================================ */

function timeToMinutes(time) {

    if (!time) return 0;

    const [
        hours,
        minutes
    ] = time.split(":").map(Number);

    return (
        hours * 60 +
        minutes
    );

}


function minutesToTime(minutes) {

    const hours =
        Math.floor(minutes / 60);

    const mins =
        minutes % 60;

    return (
        String(hours).padStart(2, "0") +
        ":" +
        String(mins).padStart(2, "0")
    );

}


function formatTime(minutes) {

    minutes =
        Math.max(
            0,
            Math.min(
                1439,
                minutes
            )
        );

    let hours =
        Math.floor(
            minutes / 60
        );

    const mins =
        minutes % 60;

    const suffix =
        hours >= 12
            ? "PM"
            : "AM";

    hours =
        hours % 12;

    if (hours === 0) {

        hours = 12;

    }

    return (
        hours +
        ":" +
        String(mins).padStart(2, "0") +
        " " +
        suffix
    );

}


function formatDuration(minutes) {

    if (minutes < 60) {

        return `${minutes}m`;

    }

    const hours =
        Math.floor(
            minutes / 60
        );

    const remaining =
        minutes % 60;

    if (remaining === 0) {

        return `${hours}h`;

    }

    return `${hours}h ${remaining}m`;

}


/* ============================================================
   ID GENERATOR
============================================================ */

function generateId(prefix = "item") {

    return (
        prefix +
        "_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );

}


/* ============================================================
   EVENT LISTENERS
============================================================ */

function initializeEventListeners() {

    $("#sidebarAddTask")
        .addEventListener(
            "click",
            () => openTaskModal()
        );


    $("#topAddTask")
        .addEventListener(
            "click",
            () => openTaskModal()
        );


    $("#panelAddTask")
        .addEventListener(
            "click",
            () => openTaskModal()
        );


    $("#todayButton")
        .addEventListener(
            "click",
            goToday
        );


    $("#calendarToday")
        .addEventListener(
            "click",
            goToday
        );


    $("#previousDay")
        .addEventListener(
            "click",
            () => changeDate(-1)
        );


    $("#nextDay")
        .addEventListener(
            "click",
            () => changeDate(1)
        );


    $("#autoPlanButton")
        .addEventListener(
            "click",
            autoPlan
        );


    $("#clearScheduleButton")
        .addEventListener(
            "click",
            clearSchedule
        );


    $("#addBlockButton")
        .addEventListener(
            "click",
            openBlockModal
        );


    $("#filterButton")
        .addEventListener(
            "click",
            toggleFilters
        );


    $("#priorityFilter")
        .addEventListener(
            "change",
            renderTasks
        );


    $("#scheduleFilter")
        .addEventListener(
            "change",
            renderTasks
        );


    $("#themeButton")
        .addEventListener(
            "click",
            toggleTheme
        );


    $("#settingsButton")
        .addEventListener(
            "click",
            openSettings
        );


    $("#searchButton")
        .addEventListener(
            "click",
            openSearch
        );


    $("#mobileMenuButton")
        .addEventListener(
            "click",
            toggleMobileSidebar
        );


    $("#taskForm")
        .addEventListener(
            "submit",
            saveTaskFromForm
        );


    $("#blockForm")
        .addEventListener(
            "submit",
            saveBlockFromForm
        );


    $("#searchInput")
        .addEventListener(
            "input",
            renderSearchResults
        );


    $("#exportData")
        .addEventListener(
            "click",
            exportData
        );


    $("#importData")
        .addEventListener(
            "click",
            () =>
                $("#importFile").click()
        );


    $("#importFile")
        .addEventListener(
            "change",
            importData
        );


    $("#resetData")
        .addEventListener(
            "click",
            resetEverything
        );


    $("#workingStart")
        .addEventListener(
            "change",
            saveWorkingHours
        );


    $("#workingEnd")
        .addEventListener(
            "change",
            saveWorkingHours
        );


    $$("[data-close-modal]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    closeModal(
                        button.dataset.closeModal
                    );

                }
            );

        });


    $$(".modal-overlay")
        .forEach(overlay => {

            overlay.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        overlay
                    ) {

                        overlay.classList.add(
                            "hidden"
                        );

                    }

                }
            );

        });


    $$(".nav-button[data-view]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    currentView =
                        button.dataset.view;

                    $$(".nav-button[data-view]")
                        .forEach(item =>
                            item.classList.remove(
                                "active"
                            )
                        );

                    button.classList.add(
                        "active"
                    );

                    renderApplication();

                    closeMobileSidebar();

                }
            );

        });


    $$(".view-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    calendarView =
                        button.dataset.calendarView;

                    $$(".view-button")
                        .forEach(item =>
                            item.classList.remove(
                                "active"
                            )
                        );

                    button.classList.add(
                        "active"
                    );

                    renderCalendar();

                }
            );

        });


    document.addEventListener(
        "keydown",
        handleKeyboardShortcuts
    );

}


/* ============================================================
   MODALS
============================================================ */

function openModal(id) {

    $("#" + id)
        .classList.remove("hidden");

}


function closeModal(id) {

    $("#" + id)
        .classList.add("hidden");

}


function openTaskModal(task = null) {

    const form =
        $("#taskForm");

    form.reset();

    $("#editingTaskId").value =
        "";

    $("#taskModalTitle")
        .textContent =
        task
            ? "Edit Task"
            : "Add Task";


    $("#taskDate").value =
        task?.date ||
        dateKey(selectedDate);


    $("#taskDeadline").value =
        task?.deadline || "";


    if (task) {

        $("#editingTaskId").value =
            task.id;

        $("#taskTitle").value =
            task.title;

        $("#taskDuration").value =
            task.duration;

        $("#taskPriority").value =
            task.priority;

        $("#taskProject").value =
            task.project || "";

        $("#taskNotes").value =
            task.notes || "";

    }

    openModal("taskModal");

    setTimeout(
        () => $("#taskTitle").focus(),
        50
    );

}


function openBlockModal() {

    $("#blockForm").reset();

    $("#blockDate").value =
        dateKey(selectedDate);

    openModal("blockModal");

}


function openSearch() {

    $("#searchInput").value =
        currentSearchTerm;

    renderSearchResults();

    openModal("searchModal");

    setTimeout(
        () => $("#searchInput").focus(),
        50
    );

}


function openSettings() {

    $("#workingStart").value =
        settings.workingStart;

    $("#workingEnd").value =
        settings.workingEnd;

    openModal("settingsModal");

}


/* ============================================================
   TASK CREATION / EDITING
============================================================ */

function saveTaskFromForm(event) {

    event.preventDefault();


    const id =
        $("#editingTaskId").value;


    const taskData = {

        title:
            $("#taskTitle")
                .value
                .trim(),

        duration:
            Number(
                $("#taskDuration").value
            ),

        priority:
            $("#taskPriority").value,

        date:
            $("#taskDate").value ||
            dateKey(selectedDate),

        deadline:
            $("#taskDeadline").value,

        project:
            $("#taskProject")
                .value
                .trim(),

        notes:
            $("#taskNotes")
                .value
                .trim()

    };


    if (!taskData.title) {

        showToast(
            "Enter a task name."
        );

        return;

    }


    if (id) {

        const task =
            tasks.find(
                item =>
                    item.id === id
            );

        if (!task) return;


        task.title =
            taskData.title;

        task.duration =
            taskData.duration;

        task.priority =
            taskData.priority;

        task.date =
            taskData.date;

        task.deadline =
            taskData.deadline;

        task.project =
            taskData.project;

        task.notes =
            taskData.notes;


        showToast(
            "Task updated."
        );

    } else {

        tasks.push({

            id:
                generateId("task"),

            title:
                taskData.title,

            duration:
                taskData.duration,

            priority:
                taskData.priority,

            date:
                taskData.date,

            deadline:
                taskData.deadline,

            project:
                taskData.project,

            notes:
                taskData.notes,

            completed:
                false,

            scheduledDate:
                null,

            startMinutes:
                null,

            createdAt:
                Date.now(),

            completedAt:
                null

        });


        showToast(
            "Task added."
        );

    }


    saveTasks();

    closeModal("taskModal");

    renderApplication();

}


/* ============================================================
   TASK RENDERING
============================================================ */

function getTasksForCurrentView() {

    let result = [...tasks];


    if (currentView === "today") {

        result =
            result.filter(
                task =>
                    !task.completed &&
                    (
                        task.date ===
                        dateKey(selectedDate)
                        ||
                        task.scheduledDate ===
                        dateKey(selectedDate)
                    )
            );

    }


    else if (currentView === "inbox") {

        result =
            result.filter(
                task =>
                    !task.completed &&
                    !task.date
            );

    }


    else if (currentView === "upcoming") {

        const today =
            dateKey(new Date());

        result =
            result.filter(
                task =>
                    !task.completed &&
                    task.date &&
                    task.date >= today
            );

    }


    else if (currentView === "completed") {

        result =
            result.filter(
                task =>
                    task.completed
            );

    }


    return result;

}


function applyTaskFilters(result) {

    const priority =
        $("#priorityFilter").value;

    const schedule =
        $("#scheduleFilter").value;


    if (priority !== "all") {

        result =
            result.filter(
                task =>
                    task.priority === priority
            );

    }


    if (schedule === "scheduled") {

        result =
            result.filter(
                task =>
                    task.scheduledDate
            );

    }


    if (schedule === "unscheduled") {

        result =
            result.filter(
                task =>
                    !task.scheduledDate
            );

    }


    return result;

}


function renderTasks() {

    const container =
        $("#taskList");

    let visible =
        getTasksForCurrentView();


    visible =
        applyTaskFilters(visible);


    visible.sort(
        sortTasks
    );


    container.innerHTML =
        "";


    if (!visible.length) {

        container.innerHTML = `

            <div class="empty-state">

                <div>

                    <div class="empty-state-icon">
                        ✓
                    </div>

                    <h3>
                        Nothing here
                    </h3>

                    <p>
                        Add a task or change your filters.
                    </p>

                </div>

            </div>

        `;

        updateTaskPanelSubtitle(0);

        return;

    }


    visible.forEach(
        task =>
            container.appendChild(
                createTaskElement(task)
            )
    );


    updateTaskPanelSubtitle(
        visible.length
    );

}


function sortTasks(a, b) {

    if (
        a.completed !==
        b.completed
    ) {

        return a.completed
            ? 1
            : -1;

    }


    const priorityDifference =
        priorityScore(b.priority) -
        priorityScore(a.priority);


    if (priorityDifference !== 0) {

        return priorityDifference;

    }


    if (
        a.deadline &&
        b.deadline
    ) {

        return a.deadline
            .localeCompare(b.deadline);

    }


    if (a.deadline) return -1;

    if (b.deadline) return 1;


    return (
        (a.createdAt || 0) -
        (b.createdAt || 0)
    );

}


function priorityScore(priority) {

    if (priority === "high") return 3;

    if (priority === "medium") return 2;

    return 1;

}


function createTaskElement(task) {

    const item =
        document.createElement("article");

    item.className =
        "task-item" +
        (
            task.completed
                ? " completed"
                : ""
        );


    const scheduledLabel =
        task.scheduledDate
            ? formatTime(
                task.startMinutes
            )
            : "Unscheduled";


    item.innerHTML = `

        <div class="task-main">

            <button
                class="task-checkbox ${
                    task.completed
                        ? "checked"
                        : ""
                }"
                data-action="complete"
                data-id="${task.id}"
                aria-label="Complete task">
            </button>


            <div
                class="task-information"
                data-action="edit"
                data-id="${task.id}">

                <div class="task-title">
                    ${escapeHTML(task.title)}
                </div>


                <div class="task-meta">

                    <span class="task-tag">
                        ${formatDuration(
                            task.duration
                        )}
                    </span>


                    <span class="task-tag priority-${task.priority}">
                        ${capitalize(
                            task.priority
                        )}
                    </span>


                    <span class="task-tag">
                        ${escapeHTML(
                            scheduledLabel
                        )}
                    </span>


                    ${
                        task.deadline
                            ? `
                                <span class="task-tag">
                                    Due ${
                                        formatShortDate(
                                            task.deadline
                                        )
                                    }
                                </span>
                            `
                            : ""
                    }


                    ${
                        task.project
                            ? `
                                <span class="task-tag">
                                    ${
                                        escapeHTML(
                                            task.project
                                        )
                                    }
                                </span>
                            `
                            : ""
                    }

                </div>

            </div>

        </div>


        <div class="task-actions">

            <button
                class="task-action"
                data-action="edit"
                data-id="${task.id}">
                ✎
            </button>

            <button
                class="task-action delete"
                data-action="delete"
                data-id="${task.id}">
                ×
            </button>

        </div>

    `;


    item.addEventListener(
        "click",
        handleTaskClick
    );


    item.draggable = true;


    item.addEventListener(
        "dragstart",
        event => {

            draggedItem = {

                type: "task",

                id: task.id

            };


            event.dataTransfer.effectAllowed =
                "move";

        }
    );


    return item;

}


function handleTaskClick(event) {

    const target =
        event.target.closest(
            "[data-action]"
        );


    if (!target) return;


    const action =
        target.dataset.action;

    const id =
        target.dataset.id;


    if (action === "complete") {

        toggleTaskCompletion(id);

    }


    else if (action === "edit") {

        const task =
            tasks.find(
                item =>
                    item.id === id
            );

        if (task) {

            openTaskModal(task);

        }

    }


    else if (action === "delete") {

        deleteTask(id);

    }

}


/* ============================================================
   TASK ACTIONS
============================================================ */

function toggleTaskCompletion(id) {

    const task =
        tasks.find(
            item =>
                item.id === id
        );


    if (!task) return;


    task.completed =
        !task.completed;


    task.completedAt =
        task.completed
            ? Date.now()
            : null;


    saveTasks();

    renderApplication();


    showToast(
        task.completed
            ? "Task completed."
            : "Task reopened."
    );

}


function deleteTask(id) {

    const task =
        tasks.find(
            item =>
                item.id === id
        );


    if (!task) return;


    const confirmed =
        confirm(
            `Delete "${task.title}"?`
        );


    if (!confirmed) return;


    tasks =
        tasks.filter(
            item =>
                item.id !== id
        );


    saveTasks();

    renderApplication();

    showToast(
        "Task deleted."
    );

}


/* ============================================================
   CALENDAR RENDERING
============================================================ */

function renderCalendar() {

    renderTimeLabels();

    renderGridLines();

    renderCalendarBlocks();

    updateCurrentTimeLine();

}


function renderTimeLabels() {

    const labels =
        $("#timeLabels");

    labels.innerHTML =
        "";


    for (
        let hour = 0;
        hour < 24;
        hour++
    ) {

        const element =
            document.createElement("div");

        element.className =
            "time-label";


        element.innerHTML = `

            <span>
                ${formatTime(hour * 60)}
            </span>

        `;


        labels.appendChild(
            element
        );

    }

}


function renderGridLines() {

    const grid =
        $("#calendarGridLines");

    grid.innerHTML =
        "";


    for (
        let hour = 0;
        hour <= 24;
        hour++
    ) {

        const line =
            document.createElement("div");

        line.className =
            "calendar-hour-line";

        line.style.top =
            `${hour * 60}px`;

        grid.appendChild(line);


        if (hour < 24) {

            const half =
                document.createElement("div");

            half.className =
                "calendar-half-line";

            half.style.top =
                `${hour * 60 + 30}px`;

            grid.appendChild(half);

        }

    }

}


function renderCalendarBlocks() {

    const container =
        $("#calendarBlocks");

    container.innerHTML =
        "";


    if (calendarView === "day") {

        renderDayBlocks(
            container,
            selectedDate
        );

    }

    else {

        renderWeekBlocks(
            container
        );

    }

}


function renderDayBlocks(
    container,
    date
) {

    const key =
        dateKey(date);


    const dayTasks =
        tasks.filter(
            task =>
                task.scheduledDate === key &&
                task.startMinutes !== null
        );


    dayTasks.forEach(
        task =>
            container.appendChild(
                createCalendarTaskBlock(task)
            )
    );


    const blocks =
        manualBlocks.filter(
            block =>
                block.date === key
        );


    blocks.forEach(
        block =>
            container.appendChild(
                createManualBlockElement(block)
            )
    );

}


function renderWeekBlocks(container) {

    /*
        The full weekly data remains stored
        in the same data model. For the compact
        interface, blocks are shown according
        to the selected week.
    */

    const start =
        startOfWeek(selectedDate);


    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const date =
            new Date(start);

        date.setDate(
            start.getDate() + i
        );


        const key =
            dateKey(date);


        const dayTasks =
            tasks.filter(
                task =>
                    task.scheduledDate === key
            );


        dayTasks.forEach(
            task => {

                const block =
                    createCalendarTaskBlock(
                        task
                    );


                const columnWidth =
                    100 / 7;


                block.style.width =
                    `calc(${columnWidth}% - 10px)`;


                block.style.left =
                    `calc(${i * columnWidth}% + 5px)`;


                container.appendChild(
                    block
                );

            }
        );

    }

}


function createCalendarTaskBlock(task) {

    const block =
        document.createElement("div");


    block.className =
        "calendar-block task-" +
        task.priority +
        (
            task.completed
                ? " completed"
                : ""
        );


    block.style.top =
        `${task.startMinutes}px`;


    block.style.height =
        `${Math.max(
            task.duration,
            25
        )}px`;


    block.dataset.id =
        task.id;


    block.dataset.type =
        "task";


    block.draggable =
        true;


    block.innerHTML = `

        <div class="calendar-block-title">
            ${escapeHTML(
                task.title
            )}
        </div>

        <div class="calendar-block-time">
            ${formatTime(
                task.startMinutes
            )}
            –
            ${formatTime(
                task.startMinutes +
                task.duration
            )}
        </div>

        <button
            class="calendar-block-delete"
            title="Remove from schedule">
            ×
        </button>

    `;


    block.addEventListener(
        "dragstart",
        event => {

            draggedItem = {

                type: "task",

                id: task.id

            };


            event.dataTransfer.effectAllowed =
                "move";

        }
    );


    block.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    ".calendar-block-delete"
                )
            ) {

                event.stopPropagation();

                unscheduleTask(
                    task.id
                );

                return;

            }


            openTaskModal(task);

        }
    );


    return block;

}


function createManualBlockElement(blockData) {

    const block =
        document.createElement("div");


    block.className =
        "calendar-block manual";


    block.style.top =
        `${blockData.startMinutes}px`;


    block.style.height =
        `${Math.max(
            blockData.duration,
            25
        )}px`;


    block.dataset.id =
        blockData.id;


    block.dataset.type =
        "manual";


    block.draggable =
        true;


    block.innerHTML = `

        <div class="calendar-block-title">
            ${escapeHTML(
                blockData.title
            )}
        </div>

        <div class="calendar-block-time">
            ${formatTime(
                blockData.startMinutes
            )}
            –
            ${formatTime(
                blockData.startMinutes +
                blockData.duration
            )}
        </div>

        <button
            class="calendar-block-delete">
            ×
        </button>

    `;


    block.addEventListener(
        "dragstart",
        event => {

            draggedItem = {

                type: "manual",

                id: blockData.id

            };


            event.dataTransfer.effectAllowed =
                "move";

        }
    );


    block.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    ".calendar-block-delete"
                )
            ) {

                event.stopPropagation();

                deleteManualBlock(
                    blockData.id
                );

            }

        }
    );


    return block;

}


/* ============================================================
   CALENDAR DRAG/DROP
============================================================ */

function initializeCalendarDrop() {

    const timeline =
        $("#calendarTimeline");


    timeline.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            timeline.classList.add(
                "drag-over"
            );

        }
    );


    timeline.addEventListener(
        "dragleave",
        () => {

            timeline.classList.remove(
                "drag-over"
            );

        }
    );


    timeline.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            timeline.classList.remove(
                "drag-over"
            );


            if (!draggedItem) return;


            const rect =
                timeline.getBoundingClientRect();


            let minutes =
                event.clientY -
                rect.top +
                timeline.scrollTop;


            minutes =
                snapTo15Minutes(
                    minutes
                );


            minutes =
                clamp(
                    minutes,
                    0,
                    1439
                );


            if (
                draggedItem.type ===
                "task"
            ) {

                moveTaskToSchedule(
                    draggedItem.id,
                    dateKey(selectedDate),
                    minutes
                );

            }


            if (
                draggedItem.type ===
                "manual"
            ) {

                moveManualBlock(
                    draggedItem.id,
                    dateKey(selectedDate),
                    minutes
                );

            }


            draggedItem = null;

        }
    );

}


/* ============================================================
   CALENDAR INITIAL DROP LISTENER
============================================================ */

initializeCalendarDrop();


/* ============================================================
   SCHEDULE OPERATIONS
============================================================ */

function moveTaskToSchedule(
    id,
    date,
    minutes
) {

    const task =
        tasks.find(
            item =>
                item.id === id
        );


    if (!task) return;


    const collision =
        findCollision(
            date,
            minutes,
            task.duration,
            id
        );


    if (collision) {

        showToast(
            "That time overlaps another block."
        );

        return;

    }


    task.scheduledDate =
        date;

    task.startMinutes =
        minutes;


    saveTasks();

    renderApplication();

    showToast(
        "Task scheduled."
    );

}


function unscheduleTask(id) {

    const task =
        tasks.find(
            item =>
                item.id === id
        );


    if (!task) return;


    task.scheduledDate =
        null;

    task.startMinutes =
        null;


    saveTasks();

    renderApplication();

    showToast(
        "Task removed from calendar."
    );

}


function moveManualBlock(
    id,
    date,
    minutes
) {

    const block =
        manualBlocks.find(
            item =>
                item.id === id
        );


    if (!block) return;


    const collision =
        findCollision(
            date,
            minutes,
            block.duration,
            null,
            id
        );


    if (collision) {

        showToast(
            "That time overlaps another block."
        );

        return;

    }


    block.date =
        date;

    block.startMinutes =
        minutes;


    saveBlocks();

    renderApplication();

}


/* ============================================================
   COLLISION DETECTION
============================================================ */

function findCollision(
    date,
    start,
    duration,
    ignoreTaskId = null,
    ignoreBlockId = null
) {

    const end =
        start + duration;


    for (const task of tasks) {

        if (
            task.scheduledDate !== date ||
            task.startMinutes === null ||
            task.id === ignoreTaskId
        ) {

            continue;

        }


        const taskEnd =
            task.startMinutes +
            task.duration;


        if (
            start < taskEnd &&
            end > task.startMinutes
        ) {

            return task;

        }

    }


    for (const block of manualBlocks) {

        if (
            block.date !== date ||
            block.id === ignoreBlockId
        ) {

            continue;

        }


        const blockEnd =
            block.startMinutes +
            block.duration;


        if (
            start < blockEnd &&
            end > block.startMinutes
        ) {

            return block;

        }

    }


    return null;

}


/* ============================================================
   AUTO PLANNER
============================================================ */

function autoPlan() {

    const date =
        dateKey(selectedDate);


    const unscheduled =
        tasks
        .filter(
            task =>
                !task.completed &&
                !task.scheduledDate
        )
        .sort(
            autoPlanSort
        );


    if (!unscheduled.length) {

        showToast(
            "There are no unscheduled tasks."
        );

        return;

    }


    const existing =
        getScheduleItems(date);


    const slots =
        generateFreeSlots(
            date,
            existing
        );


    let plannedCount = 0;


    for (
        const task of unscheduled
    ) {

        const slot =
            findSlotForTask(
                task,
                slots
            );


        if (!slot) {

            continue;

        }


        task.scheduledDate =
            date;

        task.startMinutes =
            slot.start;


        slot.start +=
            task.duration;

        slot.duration -=
            task.duration;


        plannedCount++;

    }


    saveTasks();

    renderApplication();


    if (plannedCount) {

        showToast(
            `${plannedCount} task${
                plannedCount === 1
                    ? ""
                    : "s"
            } planned.`
        );

    } else {

        showToast(
            "No free time was large enough."
        );

    }

}


function autoPlanSort(a, b) {

    /*
        Priority first.
        Earlier deadline second.
        Longer tasks third.
    */

    const priorityDifference =
        priorityScore(b.priority) -
        priorityScore(a.priority);


    if (priorityDifference !== 0) {

        return priorityDifference;

    }


    if (
        a.deadline &&
        b.deadline
    ) {

        const deadlineDifference =
            a.deadline.localeCompare(
                b.deadline
            );


        if (
            deadlineDifference !== 0
        ) {

            return deadlineDifference;

        }

    }


    if (a.deadline) return -1;

    if (b.deadline) return 1;


    return b.duration -
        a.duration;

}


function getScheduleItems(date) {

    const items = [];


    tasks.forEach(task => {

        if (
            task.scheduledDate === date &&
            task.startMinutes !== null
        ) {

            items.push({

                type: "task",

                id: task.id,

                start:
                    task.startMinutes,

                duration:
                    task.duration

            });

        }

    });


    manualBlocks.forEach(block => {

        if (
            block.date === date
        ) {

            items.push({

                type: "manual",

                id: block.id,

                start:
                    block.startMinutes,

                duration:
                    block.duration

            });

        }

    });


    return items.sort(
        (a,b) =>
            a.start -
            b.start
    );

}


function generateFreeSlots(
    date,
    existing
) {

    const dayStart =
        timeToMinutes(
            settings.workingStart
        );


    const dayEnd =
        timeToMinutes(
            settings.workingEnd
        );


    const slots = [];


    let cursor =
        dayStart;


    const sorted =
        [...existing].sort(
            (a,b) =>
                a.start -
                b.start
        );


    sorted.forEach(item => {

        const itemEnd =
            item.start +
            item.duration;


        if (
            item.start > cursor
        ) {

            slots.push({

                start:
                    cursor,

                duration:
                    item.start -
                    cursor

            });

        }


        cursor =
            Math.max(
                cursor,
                itemEnd
            );

    });


    if (
        cursor < dayEnd
    ) {

        slots.push({

            start:
                cursor,

            duration:
                dayEnd -
                cursor

        });

    }


    return slots;

}


function findSlotForTask(
    task,
    slots
) {

    /*
        Prefer the earliest slot that
        completely fits the task.
    */

    for (
        const slot of slots
    ) {

        if (
            slot.duration >=
            task.duration
        ) {

            return slot;

        }

    }


    return null;

}


/* ============================================================
   CLEAR SCHEDULE
============================================================ */

function clearSchedule() {

    const date =
        dateKey(selectedDate);


    const scheduledTasks =
        tasks.filter(
            task =>
                task.scheduledDate === date
        );


    const scheduledBlocks =
        manualBlocks.filter(
            block =>
                block.date === date
        );


    if (
        !scheduledTasks.length &&
        !scheduledBlocks.length
    ) {

        showToast(
            "Nothing is scheduled."
        );

        return;

    }


    if (
        !confirm(
            "Remove today's calendar blocks?"
        )
    ) {

        return;

    }


    scheduledTasks.forEach(
        task => {

            task.scheduledDate =
                null;

            task.startMinutes =
                null;

        }
    );


    manualBlocks =
        manualBlocks.filter(
            block =>
                block.date !== date
        );


    saveTasks();

    saveBlocks();

    renderApplication();

    showToast(
        "Schedule cleared."
    );

}


/* ============================================================
   MANUAL BLOCK
============================================================ */

function saveBlockFromForm(event) {

    event.preventDefault();


    const title =
        $("#blockTitle")
            .value
            .trim();


    const date =
        $("#blockDate").value;


    const start =
        timeToMinutes(
            $("#blockStart").value
        );


    const duration =
        Number(
            $("#blockDuration").value
        );


    if (!title || !date) {

        return;

    }


    if (
        findCollision(
            date,
            start,
            duration
        )
    ) {

        showToast(
            "That block overlaps another event."
        );

        return;

    }


    manualBlocks.push({

        id:
            generateId("block"),

        title,

        date,

        startMinutes:
            start,

        duration,

        createdAt:
            Date.now()

    });


    saveBlocks();

    closeModal("blockModal");

    renderApplication();

    showToast(
        "Time block added."
    );

}


function deleteManualBlock(id) {

    if (
        !confirm(
            "Delete this time block?"
        )
    ) {

        return;

    }


    manualBlocks =
        manualBlocks.filter(
            block =>
                block.id !== id
        );


    saveBlocks();

    renderApplication();

}


/* ============================================================
   DATE NAVIGATION
============================================================ */

function changeDate(amount) {

    const newDate =
        new Date(selectedDate);


    newDate.setDate(
        newDate.getDate() +
        amount
    );


    selectedDate =
        newDate;


    renderApplication();

}


function goToday() {

    selectedDate =
        new Date();


    renderApplication();

}


/* ============================================================
   CURRENT TIME
============================================================ */

function updateCurrentTimeLine() {

    const line =
        $("#currentTimeLine");


    if (
        !isToday(selectedDate) ||
        calendarView !== "day"
    ) {

        line.classList.add(
            "hidden"
        );

        return;

    }


    const now =
        new Date();


    const minutes =
        now.getHours() * 60 +
        now.getMinutes();


    line.style.top =
        `${minutes}px`;


    line.classList.remove(
        "hidden"
    );

}


/* ============================================================
   SEARCH
============================================================ */

function renderSearchResults() {

    currentSearchTerm =
        $("#searchInput")
            .value
            .trim()
            .toLowerCase();


    const results =
        $("#searchResults");


    if (!currentSearchTerm) {

        results.innerHTML = `

            <div class="empty-state">

                <div>

                    <div class="empty-state-icon">
                        ⌕
                    </div>

                    <p>
                        Start typing to search.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    const matches =
        tasks.filter(
            task =>
                task.title
                    .toLowerCase()
                    .includes(
                        currentSearchTerm
                    )
                ||
                (
                    task.project || ""
                )
                    .toLowerCase()
                    .includes(
                        currentSearchTerm
                    )
        );


    results.innerHTML =
        "";


    if (!matches.length) {

        results.innerHTML = `

            <div class="empty-state">

                <div>

                    <h3>
                        No results
                    </h3>

                    <p>
                        No task matches your search.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    matches.forEach(task => {

        const item =
            document.createElement("div");


        item.className =
            "search-result";


        item.innerHTML = `

            <div class="search-result-title">
                ${escapeHTML(
                    task.title
                )}
            </div>

            <div class="search-result-meta">

                ${formatDuration(
                    task.duration
                )}

                ·

                ${capitalize(
                    task.priority
                )}

                ·

                ${
                    task.completed
                        ? "Completed"
                        : "Active"
                }

            </div>

        `;


        item.addEventListener(
            "click",
            () => {

                closeModal(
                    "searchModal"
                );

                openTaskModal(task);

            }
        );


        results.appendChild(
            item
        );

    });

}


/* ============================================================
   FILTERS
============================================================ */

function toggleFilters() {

    $("#filterBar")
        .classList.toggle(
            "hidden"
        );

}


/* ============================================================
   THEME
============================================================ */

function initializeTheme() {

    const theme =
        localStorage.getItem(
            STORAGE_KEYS.THEME
        );


    if (theme === "dark") {

        document.body.classList.add(
            "dark"
        );

    }

}


function toggleTheme() {

    const dark =
        document.body.classList.toggle(
            "dark"
        );


    localStorage.setItem(
        STORAGE_KEYS.THEME,
        dark
            ? "dark"
            : "light"
    );


    $("#themeButton")
        .querySelector("span:last-child")
        .textContent =
            dark
                ? "Light Mode"
                : "Dark Mode";

}


/* ============================================================
   SETTINGS
============================================================ */

function initializeSettings() {

    if (!settings.workingStart) {

        settings =
            {
                ...DEFAULT_SETTINGS
            };

    }


    $("#workingStart").value =
        settings.workingStart;


    $("#workingEnd").value =
        settings.workingEnd;

}


function saveWorkingHours() {

    const start =
        $("#workingStart").value;


    const end =
        $("#workingEnd").value;


    if (
        timeToMinutes(start) >=
        timeToMinutes(end)
    ) {

        showToast(
            "End time must be later than start time."
        );

        return;

    }


    settings.workingStart =
        start;

    settings.workingEnd =
        end;


    saveSettings();

    showToast(
        "Working hours saved."
    );

}


/* ============================================================
   DATA EXPORT
============================================================ */

function exportData() {

    const data = {

        version: 3,

        exportedAt:
            new Date().toISOString(),

        tasks,

        manualBlocks,

        settings

    };


    const blob =
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const anchor =
        document.createElement("a");


    anchor.href =
        url;


    anchor.download =
        `taskflow-backup-${
            dateKey(new Date())
        }.json`;


    anchor.click();


    URL.revokeObjectURL(
        url
    );


    showToast(
        "Backup exported."
    );

}


/* ============================================================
   DATA IMPORT
============================================================ */

function importData(event) {

    const file =
        event.target.files[0];


    if (!file) return;


    const reader =
        new FileReader();


    reader.onload =
        function() {

            try {

                const data =
                    JSON.parse(
                        reader.result
                    );


                if (
                    !Array.isArray(
                        data.tasks
                    )
                ) {

                    throw new Error(
                        "Invalid backup"
                    );

                }


                tasks =
                    data.tasks;


                manualBlocks =
                    Array.isArray(
                        data.manualBlocks
                    )
                        ? data.manualBlocks
                        : [];


                settings =
                    {
                        ...DEFAULT_SETTINGS,
                        ...(data.settings || {})
                    };


                saveTasks();

                saveBlocks();

                saveSettings();

                renderApplication();


                showToast(
                    "Backup imported."
                );

            }

            catch (error) {

                console.error(
                    error
                );

                showToast(
                    "Invalid backup file."
                );

            }

        };


    reader.readAsText(file);

}


/* ============================================================
   RESET
============================================================ */

function resetEverything() {

    if (
        !confirm(
            "This will permanently delete all tasks and schedules. Continue?"
        )
    ) {

        return;

    }


    tasks = [];

    manualBlocks = [];

    settings =
        {
            ...DEFAULT_SETTINGS
        };


    saveTasks();

    saveBlocks();

    saveSettings();

    renderApplication();

    showToast(
        "Everything has been reset."
    );

}


/* ============================================================
   STATS
============================================================ */

function renderStatistics() {

    const today =
        dateKey(selectedDate);


    const todayTasks =
        tasks.filter(
            task =>
                task.date === today ||
                task.scheduledDate === today
        );


    const completed =
        todayTasks.filter(
            task =>
                task.completed
        );


    const planned =
        todayTasks
            .filter(
                task =>
                    task.scheduledDate === today
            )
            .reduce(
                (sum, task) =>
                    sum + task.duration,
                0
            );


    const remaining =
        todayTasks
            .filter(
                task =>
                    !task.completed
            )
            .reduce(
                (sum, task) =>
                    sum + task.duration,
                0
            );


    const total =
        todayTasks.reduce(
            (sum, task) =>
                sum + task.duration,
            0
        );


    const progress =
        total > 0
            ? Math.round(
                (
                    completed.reduce(
                        (sum, task) =>
                            sum + task.duration,
                        0
                    ) /
                    total
                ) * 100
            )
            : 0;


    $("#completedStat")
        .textContent =
        completed.length;


    $("#plannedStat")
        .textContent =
        formatDuration(planned);


    $("#remainingStat")
        .textContent =
        formatDuration(remaining);


    $("#progressStat")
        .textContent =
        `${progress}%`;

}


/* ============================================================
   COUNTERS
============================================================ */

function updateNavigationCounts() {

    const today =
        dateKey(new Date());


    const todayCount =
        tasks.filter(
            task =>
                !task.completed &&
                (
                    task.date === today ||
                    task.scheduledDate === today
                )
        ).length;


    const inboxCount =
        tasks.filter(
            task =>
                !task.completed &&
                !task.date &&
                !task.scheduledDate
        ).length;


    $("#todayTaskCount")
        .textContent =
        todayCount;


    $("#inboxTaskCount")
        .textContent =
        inboxCount;

}


/* ============================================================
   PAGE TITLES
============================================================ */

function renderPageHeader() {

    let title =
        "Today";

    let subtitle =
        formatDate(selectedDate);


    if (currentView === "inbox") {

        title = "Inbox";

        subtitle =
            "Unorganized tasks";

    }


    else if (
        currentView === "upcoming"
    ) {

        title = "Upcoming";

        subtitle =
            "Your future tasks";

    }


    else if (
        currentView === "completed"
    ) {

        title = "Completed";

        subtitle =
            "Finished tasks";

    }


    $("#pageTitle")
        .textContent =
        title;


    $("#pageSubtitle")
        .textContent =
        subtitle;


    $("#calendarDate")
        .textContent =
        formatDate(selectedDate);

}


/* ============================================================
   TASK PANEL SUBTITLE
============================================================ */

function updateTaskPanelSubtitle(count) {

    $("#taskPanelSubtitle")
        .textContent =
        `${count} ${
            count === 1
                ? "task"
                : "tasks"
        }`;

}


/* ============================================================
   APPLICATION RENDER
============================================================ */

function renderApplication() {

    renderPageHeader();

    renderTasks();

    renderCalendar();

    renderStatistics();

    updateNavigationCounts();

}


/* ============================================================
   MOBILE SIDEBAR
============================================================ */

function toggleMobileSidebar() {

    document.body.classList.toggle(
        "sidebar-open"
    );

}


function closeMobileSidebar() {

    document.body.classList.remove(
        "sidebar-open"
    );

}


/* ============================================================
   KEYBOARD SHORTCUTS
============================================================ */

function handleKeyboardShortcuts(event) {

    if (
        event.target.matches(
            "input, textarea, select"
        )
    ) {

        if (
            event.key === "Escape"
        ) {

            event.target.blur();

        }

        return;

    }


    if (
        event.key === "n" ||
        event.key === "N"
    ) {

        event.preventDefault();

        openTaskModal();

        return;

    }


    if (
        event.key === "/"
    ) {

        event.preventDefault();

        openSearch();

        return;

    }


    if (
        event.key === "Escape"
    ) {

        $$(".modal-overlay")
            .forEach(
                modal =>
                    modal.classList.add(
                        "hidden"
                    )
            );

    }

}


/* ============================================================
   WEEK UTILITIES
============================================================ */

function startOfWeek(date) {

    const result =
        new Date(date);


    const day =
        result.getDay();


    const difference =
        day === 0
            ? -6
            : 1 - day;


    result.setDate(
        result.getDate() +
        difference
    );


    return result;

}


/* ============================================================
   MATH UTILITIES
============================================================ */

function snapTo15Minutes(minutes) {

    return Math.round(
        minutes / 15
    ) * 15;

}


function clamp(
    value,
    min,
    max
) {

    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );

}


/* ============================================================
   HTML ESCAPING
============================================================ */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function capitalize(value) {

    if (!value) return "";

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


/* ============================================================
   TOASTS
============================================================ */

function showToast(message) {

    const container =
        $("#toastContainer");


    const toast =
        document.createElement("div");


    toast.className =
        "toast";


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.remove();

        },
        2800
    );

}


/* ============================================================
   INITIAL CALENDAR DROP
============================================================ */

function setupCalendarDropEvents() {

    const timeline =
        $("#calendarTimeline");


    if (!timeline) return;


    timeline.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

        }
    );


    timeline.addEventListener(
        "drop",
        event => {

            event.preventDefault();


            if (!draggedItem) return;


            const rect =
                timeline.getBoundingClientRect();


            const y =
                event.clientY -
                rect.top +
                timeline.scrollTop;


            const minutes =
                clamp(
                    snapTo15Minutes(y),
                    0,
                    1439
                );


            if (
                draggedItem.type ===
                "task"
            ) {

                moveTaskToSchedule(
                    draggedItem.id,
                    dateKey(selectedDate),
                    minutes
                );

            }


            else if (
                draggedItem.type ===
                "manual"
            ) {

                moveManualBlock(
                    draggedItem.id,
                    dateKey(selectedDate),
                    minutes
                );

            }


            draggedItem = null;

        }
    );

}


/* ============================================================
   RUN DROP SETUP AGAIN AFTER DOM IS READY
============================================================ */

setupCalendarDropEvents();


/* ============================================================
   DEMO DATA
============================================================ */

/*
    The app starts empty.

    To add example tasks, set this to true.
*/

const LOAD_DEMO_DATA =
    false;


function loadDemoData() {

    if (
        !LOAD_DEMO_DATA ||
        tasks.length
    ) {

        return;

    }


    const today =
        dateKey(new Date());


    tasks = [

        {

            id:
                generateId("task"),

            title:
                "Physics revision",

            duration:
                90,

            priority:
                "high",

            date:
                today,

            deadline:
                today,

            project:
                "Physics",

            notes:
                "Revise current chapter.",

            completed:
                false,

            scheduledDate:
                null,

            startMinutes:
                null,

            createdAt:
                Date.now()

        },


        {

            id:
                generateId("task"),

            title:
                "Mathematics practice",

            duration:
                60,

            priority:
                "high",

            date:
                today,

            deadline:
                today,

            project:
                "Maths",

            notes:
                "",

            completed:
                false,

            scheduledDate:
                null,

            startMinutes:
                null,

            createdAt:
                Date.now()

        },


        {

            id:
                generateId("task"),

            title:
                "English assignment",

            duration:
                30,

            priority:
                "low",

            date:
                today,

            deadline:
                today,

            project:
                "English",

            notes:
                "",

            completed:
                false,

            scheduledDate:
                null,

            startMinutes:
                null,

            createdAt:
                Date.now()

        }

    ];


    saveTasks();

}


/* ============================================================
   FINAL STARTUP
============================================================ */

loadDemoData();

renderApplication();
