import { state } from "./state.js";
import { camera } from "./camera.js";
import { physics } from "./physics.js";

// DOM Elements
const objList = document.getElementById("objectList");
const objCount = document.getElementById("objCount");
const selInfo = document.getElementById("selectionInfo");

export function updateObjectList() {
  objCount.innerText = state.bodies.length;
  objList.innerHTML = "";

  // Sort by mass (descending) so Suns are at top
  const sorted = [...state.bodies].sort((a, b) => b.mass - a.mass);

  sorted.forEach((b) => {
    const li = document.createElement("li");
    li.innerText = `${b.type.toUpperCase()} (M:${Math.floor(b.mass)})`;
    if (state.selection.id === b.id) li.classList.add("selected");

    li.onclick = () => {
      state.selection.id = b.id;
      updateSelectionUI();
      updateObjectList(); // Refresh highlight

      // Auto Focus Camera
      camera.x = b.x;
      camera.y = b.y;
    };
    objList.appendChild(li);
  });
}

export function updateSelectionUI() {
  const b = state.bodies.find((x) => x.id === state.selection.id);
  if (!b) {
    selInfo.classList.add("hidden");
    return;
  }
  selInfo.classList.remove("hidden");
  document.getElementById("selType").innerText = b.type;
  document.getElementById("selMass").innerText = Math.floor(b.mass);
  const vel = Math.hypot(b.vx, b.vy).toFixed(2);
  document.getElementById("selVel").innerText = vel;
}

// Preset Loader
function loadPreset(name) {
  state.bodies = [];
  state.particles = [];
  state.selection.id = null;

  if (name === "solar") {
    // Sun
    state.bodies.push({
      id: 1,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: 30000,
      radius: 25,
      color: "#ffaa00",
      type: "sun",
      trail: [],
    });
    // Earth-like
    state.bodies.push({
      id: 2,
      x: 400,
      y: 0,
      vx: 0,
      vy: 6,
      mass: 100,
      radius: 8,
      color: "#00aaff",
      type: "planet",
      trail: [],
    });
    // Jupiter-like
    state.bodies.push({
      id: 3,
      x: 700,
      y: 0,
      vx: 0,
      vy: 4.6,
      mass: 600,
      radius: 14,
      color: "#dcb",
      type: "planet",
      trail: [],
    });
  } else if (name === "binary") {
    state.bodies.push({
      id: 1,
      x: -200,
      y: 0,
      vx: 0,
      vy: -3.5,
      mass: 10000,
      radius: 20,
      color: "#ff5500",
      type: "sun",
      trail: [],
    });
    state.bodies.push({
      id: 2,
      x: 200,
      y: 0,
      vx: 0,
      vy: 3.5,
      mass: 10000,
      radius: 20,
      color: "#0055ff",
      type: "sun",
      trail: [],
    });
  } else if (name === "chaos") {
    for (let i = 0; i < 10; i++) {
      state.bodies.push({
        id: i,
        x: (Math.random() - 0.5) * 1000,
        y: (Math.random() - 0.5) * 1000,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        mass: Math.random() * 2000 + 500,
        radius: Math.random() * 10 + 5,
        color: "#fff",
        type: "planet",
        trail: [],
      });
    }
  }

  state.nextId = 100;
  updateObjectList();
}

export function initUI() {
  // Mode Buttons
  const setMode = (type, behavior, btnId) => {
    state.mode.type = type;
    state.mode.behavior = behavior;
    document
      .querySelectorAll(".tool-btn")
      .forEach((b) => b.classList.remove("active-tool"));
    if (btnId) document.getElementById(btnId).classList.add("active-tool");
    document.getElementById("status").innerText =
      `${type.toUpperCase()} - ${behavior || "Standard"}`;
  };

  document.getElementById("planetBtn").onclick = () =>
    setMode("planet", "orbit", "planetBtn");
  document.getElementById("sunBtn").onclick = () =>
    setMode("sun", "vector", "sunBtn");
  document.getElementById("selectBtn").onclick = () =>
    setMode("select", null, "selectBtn");

  // Sub-options
  document.querySelectorAll(".options button").forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const parent = e.target.closest(".mode-group").querySelector(".tool-btn");
      const type = parent.id === "planetBtn" ? "planet" : "sun";
      setMode(type, e.target.dataset.behavior, parent.id);
    };
  });

  // Start Menu
  const menu = document.getElementById("startMenu");
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.onclick = () => {
      loadPreset(btn.dataset.preset);
      menu.classList.add("hidden");
      // Slide in sidebars
      document.querySelector(".sidebar.left").classList.add("open");
    };
  });

  // Sidebar Actions
  document.getElementById("btnStop").onclick = () => {
    const b = state.bodies.find((x) => x.id === state.selection.id);
    if (b) b.vx = b.vy = 0;
    updateSelectionUI();
  };
  document.getElementById("btnDel").onclick = () => {
    const idx = state.bodies.findIndex((x) => x.id === state.selection.id);
    if (idx !== -1) {
      state.bodies.splice(idx, 1);
      state.selection.id = null;
      updateSelectionUI();
      updateObjectList();
    }
  };

  const timeSlider = document.getElementById("timeSlider");
  const timeLabel = document.getElementById("timeVal");

  // Define the "magnet" points we want to snap to
  const snapPoints = [0, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0];
  const snapDistance = 0.3; // How close you need to be to snap (the "gravity")

  timeSlider.oninput = (e) => {
    let rawValue = parseFloat(e.target.value);
    let finalValue = rawValue;
    let isSnapped = false;

    // Check distance to each snap point
    for (let point of snapPoints) {
      if (Math.abs(rawValue - point) < snapDistance) {
        finalValue = point;
        isSnapped = true;
        break;
      }
    }

    // Apply to Physics Engine
    state.config.timeScale = finalValue;

    // Update Label UI
    if (finalValue === 0) {
      timeLabel.innerText = "PAUSED";
      timeLabel.style.color = "#ff4444"; // Red for pause
    } else {
      timeLabel.innerText = `×${finalValue}`;
      // Green if snapped, Blue if manual
      timeLabel.style.color = isSnapped ? "#00ff00" : "#00aaff";
    }
  };

  // When user lets go of the mouse, physically snap the slider handle to the number
  timeSlider.onchange = (e) => {
    // We re-run the logic to find the exact snap point
    let rawValue = parseFloat(e.target.value);
    for (let point of snapPoints) {
      if (Math.abs(rawValue - point) < snapDistance) {
        timeSlider.value = point; // Move the actual slider handle
        break;
      }
    }
  };

  // Save/Load
  document.getElementById("btnSave").onclick = () => {
    const blob = new Blob([physics.exportScene()], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "scene.json";
    a.click();
  };
  const fileIn = document.getElementById("fileInput");
  document.getElementById("btnLoad").onclick = () => fileIn.click();
  fileIn.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      physics.importScene(evt.target.result);
      updateObjectList();
    };
    reader.readAsText(file);
  };

  // Toggles
  document.getElementById("lagrangeBtn").onclick = (e) => {
    state.config.showLagrange = !state.config.showLagrange;
    e.target.classList.toggle("active");
  };

  // Periodically update UI (for velocities etc)
  setInterval(() => {
    if (state.selection.id) updateSelectionUI();
  }, 200);
}
