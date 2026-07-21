console.log("Dashboard JS Loaded");

// Global task state
let tasks = [];

// Board exam countdown target: March 1, 2027
const targetExamDate = new Date("March 1, 2027 09:00:00").getTime();

document.addEventListener("DOMContentLoaded", () => {
    loadTasks();
    setupEventListeners();
    updateCountdown();
    // Update countdown every minute
    setInterval(updateCountdown, 60000);
});

// Load tasks from localStorage
function loadTasks() {
    const stored = localStorage.getItem("lockin_tasks");
    if (stored) {
        tasks = JSON.parse(stored);
    } else {
        // Default tasks
        tasks = [
            { text: "Maths Revision", completed: false },
            { text: "Science Practice", completed: false },
            { text: "English Reading", completed: true }
        ];
        saveTasksToStorage();
    }
    renderTasks();
}

// Save tasks to localStorage
function saveTasksToStorage() {
    localStorage.setItem("lockin_tasks", JSON.stringify(tasks));
}

// Render dynamic task list
function renderTasks() {
    const listContainer = document.getElementById("taskList");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    if (tasks.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; color: #64748B; padding: 20px; font-style: italic;">
                No tasks for today. Add one above!
            </div>
        `;
        updateStats(0, 0);
        return;
    }

    let completedCount = 0;

    tasks.forEach((task, index) => {
        if (task.completed) completedCount++;

        const taskItem = document.createElement("div");
        taskItem.className = "task-item";
        taskItem.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--card);
            padding: 15px 18px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.03);
            margin-bottom: 12px;
            transition: transform 0.2s, background-color 0.2s;
        `;

        taskItem.innerHTML = `
            <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; user-select: none;">
                <input type="checkbox" ${task.completed ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;">
                <span style="text-decoration: ${task.completed ? 'line-through' : 'none'}; color: ${task.completed ? '#64748B' : '#F8FAFC'}; font-size: 15px; transition: 0.2s;">${task.text}</span>
            </label>
            <button class="delete-task-btn" style="background: transparent; border: none; color: #EF4444; cursor: pointer; font-size: 16px; padding: 5px; opacity: 0.6; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center;">✕</button>
        `;

        // Add events dynamically to prevent inline script issues
        const checkbox = taskItem.querySelector("input[type='checkbox']");
        checkbox.addEventListener("change", () => toggleTask(index));

        const deleteBtn = taskItem.querySelector(".delete-task-btn");
        deleteBtn.addEventListener("click", () => deleteTask(index));
        deleteBtn.addEventListener("mouseover", () => deleteBtn.style.opacity = "1");
        deleteBtn.addEventListener("mouseout", () => deleteBtn.style.opacity = "0.6");

        listContainer.appendChild(taskItem);
    });

    updateStats(completedCount, tasks.length);
}

// Setup task input listeners
function setupEventListeners() {
    const addBtn = document.getElementById("addTaskBtn");
    const input = document.getElementById("newTaskInput");

    if (addBtn && input) {
        addBtn.addEventListener("click", () => {
            const val = input.value.trim();
            if (val === "") return;
            tasks.push({ text: val, completed: false });
            saveTasksToStorage();
            input.value = "";
            renderTasks();
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                addBtn.click();
            }
        });
    }
}

// Toggle task completed state
function toggleTask(index) {
    tasks[index].completed = !tasks[index].completed;
    saveTasksToStorage();
    renderTasks();
}

// Delete task
function deleteTask(index) {
    tasks.splice(index, 1);
    saveTasksToStorage();
    renderTasks();
}

// Update the "Tasks Done" statistic
function updateStats(completed, total) {
    const statsEl = document.getElementById("tasksDoneCount");
    if (statsEl) {
        statsEl.innerText = `${completed}/${total}`;
    }
}

// Board countdown generator
function updateCountdown() {
    const countdownEl = document.getElementById("countdownText");
    if (!countdownEl) return;

    const now = new Date().getTime();
    const diff = targetExamDate - now;

    if (diff <= 0) {
        countdownEl.innerText = "Exam Day!";
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    countdownEl.innerText = `${days}d ${hours}h ${minutes}m`;
}
