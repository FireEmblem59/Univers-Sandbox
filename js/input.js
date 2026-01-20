import { state } from "./state.js";
import { camera } from "./camera.js";
import { createPlanet, createSun } from "./entities.js";
import { updateSelectionUI, updateObjectList } from "./ui.js"; // Circular dep handled via init

export function setupInput(canvas) {
  // --- MOUSE MOVE ---
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.screen.x = e.clientX - rect.left;
    state.mouse.screen.y = e.clientY - rect.top;
    state.mouse.world = camera.screenToWorld(
      state.mouse.screen.x,
      state.mouse.screen.y,
      canvas,
    );

    // Pan Camera (Middle click or Left click if Select mode and hitting nothing)
    if (
      state.mouse.isDown &&
      (!state.mode.type || state.mode.type === "select")
    ) {
      // Only pan if we didn't click an object (logic in mousedown)
      if (state.mouse.panning) {
        camera.x -= e.movementX / camera.zoom;
        camera.y -= e.movementY / camera.zoom;
      }
    }
  });

  // --- MOUSE DOWN ---
  canvas.addEventListener("mousedown", (e) => {
    state.mouse.isDown = true;
    state.mouse.dragStartWorld = { ...state.mouse.world };

    // 1. SELECTION MODE
    if (state.mode.type === "select" || !state.mode.type) {
      // Check for click on body
      const clicked = state.bodies.find((b) => {
        const d = Math.hypot(
          b.x - state.mouse.world.x,
          b.y - state.mouse.world.y,
        );
        return d < Math.max(b.radius * 1.5, 10 / camera.zoom); // Generous hit box
      });

      if (clicked) {
        state.selection.id = clicked.id;
        updateSelectionUI();
        state.mouse.panning = false;
      } else {
        // Clicked empty space -> Start Panning or Deselect
        state.selection.id = null;
        updateSelectionUI();
        state.mouse.panning = true;
        canvas.style.cursor = "grabbing";
      }
      return;
    }

    // 2. CREATION MODE
    if (state.mode.type === "planet" || state.mode.type === "sun") {
      state.mouse.panning = false;
    }
  });

  // --- MOUSE UP ---
  canvas.addEventListener("mouseup", (e) => {
    state.mouse.isDown = false;
    state.mouse.panning = false;
    canvas.style.cursor = "default";

    const start = state.mouse.dragStartWorld;
    const current = state.mouse.world;
    if (!start) return;

    // Creation Logic
    if (state.mode.type && state.mode.type !== "select") {
      const dx = current.x - start.x;
      const dy = current.y - start.y;

      if (state.mode.type === "planet") {
        if (state.mode.behavior === "orbit") createPlanet.orbit(start);
        if (state.mode.behavior === "vector")
          createPlanet.vector(start, dx, dy);
        if (state.mode.behavior === "free") createPlanet.free(start);
      }
      if (state.mode.type === "sun") {
        if (state.mode.behavior === "vector") createSun.vector(start, dx, dy);
        if (state.mode.behavior === "static") createSun.static(start);
        if (state.mode.behavior === "massive") createSun.massive(start);
      }
      updateObjectList(); // Refresh list on create
    }
    state.mouse.dragStartWorld = null;
  });

  // --- ZOOM ---
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const newZoom = camera.zoom * Math.exp(wheel * zoomIntensity);
    // Use settings for limits
    const min = 0.05,
      max = parseFloat(document.getElementById("inMaxZoom").value);

    if (newZoom < min || newZoom > max) return;

    const mouseWx = state.mouse.world.x;
    const mouseWy = state.mouse.world.y;
    camera.zoom = newZoom;
    camera.x =
      mouseWx - (state.mouse.screen.x - canvas.width / 2) / camera.zoom;
    camera.y =
      mouseWy - (state.mouse.screen.y - canvas.height / 2) / camera.zoom;
  });

  // --- KEYBOARD ---
  window.addEventListener("keydown", (e) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      if (state.selection.id) {
        const idx = state.bodies.findIndex((b) => b.id === state.selection.id);
        if (idx !== -1) {
          state.bodies.splice(idx, 1);
          state.selection.id = null;
          updateSelectionUI();
          updateObjectList();
        }
      }
    }
    if (e.key === "s" || e.key === "S") {
      // Stop selected object
      if (state.selection.id) {
        const b = state.bodies.find((x) => x.id === state.selection.id);
        if (b) {
          b.vx = 0;
          b.vy = 0;
          updateSelectionUI();
        }
      }
    }

    if (e.key === "Space") {
      const slider = document.getElementById("timeSlider");
      const label = document.getElementById("timeVal");

      if (state.config.timeScale > 0) {
        // Pause
        state._lastTimeScale = state.config.timeScale;
        state.config.timeScale = 0;
        slider.value = 0;
        label.innerText = "PAUSED";
        label.style.color = "#ff4444";
      } else {
        // Unpause (Restore last speed or default to 1)
        const restore = state._lastTimeScale || 1;
        state.config.timeScale = restore;
        slider.value = restore;
        label.innerText = `×${restore}`;
        label.style.color = "#00aaff";
      }
    }
  });
}
