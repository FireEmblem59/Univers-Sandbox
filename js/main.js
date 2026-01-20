import { state } from "./state.js";
import { camera } from "./camera.js";
import { physics } from "./physics.js";
import { initUI, updateObjectList } from "./ui.js";
import { setupInput } from "./input.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

camera.updateSize(canvas);
window.addEventListener("resize", () => camera.updateSize(canvas));

setupInput(canvas);
initUI();

/* ---------------- BACKGROUND STARS ---------------- */
for (let i = 0; i < 1000; i++) {
  state.stars.push({
    x: (Math.random() - 0.5) * 10000,
    y: (Math.random() - 0.5) * 10000,
    baseSize: Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.8 + 0.2,
  });
}

/* ---------------- DEFAULT SUN ---------------- */
state.bodies.push({
  id: crypto.randomUUID(),
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  mass: 40000,
  radius: Math.max(10, Math.sqrt(40000) / 3),
  color: "#ffca3a",
  glow: "#ff9e00",
  type: "sun",
  trail: [],
});

/* ---------------- HELPERS ---------------- */
function drawArrow(ctx, fromX, fromY, toX, toY) {
  const head = 10 / camera.zoom;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const a = Math.atan2(dy, dx);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.lineTo(
    toX - head * Math.cos(a - Math.PI / 6),
    toY - head * Math.sin(a - Math.PI / 6),
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - head * Math.cos(a + Math.PI / 6),
    toY - head * Math.sin(a + Math.PI / 6),
  );
  ctx.stroke();
}

function simulatePath(x, y, vx, vy) {
  const path = [];
  let sx = x,
    sy = y,
    svx = vx,
    svy = vy;

  for (let i = 0; i < 300; i++) {
    path.push({ x: sx, y: sy });
    let ax = 0,
      ay = 0;

    for (const b of state.bodies) {
      const a = physics.getAcceleration(sx, sy, b.x, b.y, b.mass);
      ax += a.x;
      ay += a.y;
    }

    svx += ax;
    svy += ay;
    sx += svx;
    sy += svy;
  }
  return path;
}

/* ---------------- MAIN LOOP ---------------- */
function loop() {
  physics.update(state.bodies, state.config.timeScale);
  camera.applyTransform(ctx, canvas);

  /* ---- STARS (PARALLAX SIZE) ---- */
  ctx.fillStyle = "white";
  for (const s of state.stars) {
    const size = s.baseSize * Math.max(0.5, Math.min(2, 1 / camera.zoom));
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* ---- LAGRANGE POINTS ---- */
  if (state.config.showLagrange) {
    ctx.fillStyle = "#00ff00";
    ctx.font = `${12 / camera.zoom}px monospace`;
    for (const p of physics.getLagrangePoints(state.bodies)) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 / camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(p.label, p.x + 5 / camera.zoom, p.y - 5 / camera.zoom);
    }
  }

  /* ---- TRAILS ---- */
  if (state.config.showTrails) {
    ctx.lineWidth = 2 / camera.zoom;
    for (const b of state.bodies) {
      if (b.trail.length < 2) continue;
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (const t of b.trail) ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---- BODIES ---- */
  for (const b of state.bodies) {
    if (b.mass > 2000) {
      const g = ctx.createRadialGradient(
        b.x,
        b.y,
        b.radius,
        b.x,
        b.y,
        b.radius * 4,
      );
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.2, "rgba(255,255,255,0.05)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (b.glow) {
      ctx.shadowBlur = b.radius * 2;
      ctx.shadowColor = b.glow;
    }

    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (state.selection.id === b.id) {
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2 / camera.zoom;
      ctx.beginPath();
      ctx.arc(
        b.x,
        b.y,
        b.radius + 5 + 2 * Math.sin(Date.now() / 200),
        0,
        Math.PI * 2,
      );
      ctx.stroke();

      ctx.fillStyle = "white";
      ctx.font = `${12 / camera.zoom}px Arial`;
      ctx.fillText(
        `M:${Math.floor(b.mass)}`,
        b.x + b.radius + 5 / camera.zoom,
        b.y,
      );
    }
  }

  /* ---- PARTICLES ---- */
  for (const p of state.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* ---- VECTOR / ORBIT PREVIEW ---- */
  if (
    state.mode.type &&
    state.mouse.dragStartWorld &&
    state.mouse.isDown &&
    state.mode.type !== "delete"
  ) {
    const s = state.mouse.dragStartWorld;
    const c = state.mouse.world;

    if (state.mode.behavior === "vector") {
      const dx = c.x - s.x;
      const dy = c.y - s.y;
      const power = state.mode.type === "sun" ? 0.02 : 0.05;
      const vx = dx * power;
      const vy = dy * power;

      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "white";
      drawArrow(ctx, s.x, s.y, c.x, c.y);
      ctx.setLineDash([]);

      const path = simulatePath(s.x, s.y, vx, vy);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      for (const p of path) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = state.mode.type === "sun" ? "orange" : "cyan";
      ctx.lineWidth = 1 / camera.zoom;
      ctx.stroke();
    } else if (state.mode.behavior === "orbit") {
      const parent = physics.nearestSun(s, state.bodies);
      if (parent) {
        const r = Math.hypot(s.x - parent.x, s.y - parent.y);
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.arc(parent.x, parent.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // ORBIT HOVER PREVIEW
  if (state.mode.type === "planet" && state.mode.behavior === "orbit") {
    // If dragging, lock to start. If hovering, follow mouse.
    const pos =
      state.mouse.isDown && state.mouse.dragStartWorld
        ? state.mouse.dragStartWorld
        : state.mouse.world;

    const parent = physics.nearestSun(pos, state.bodies);

    if (parent) {
      const r = Math.hypot(pos.x - parent.x, pos.y - parent.y);

      // Draw dashed orbit circle
      ctx.beginPath();
      ctx.arc(parent.x, parent.y, r, 0, Math.PI * 2);
      ctx.lineWidth = 1 / camera.zoom;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw guide line
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(parent.x, parent.y);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.stroke();

      // Draw ghost planet
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5 / camera.zoom, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 200, 255, 0.5)";
      ctx.fill();
    }
  }

  requestAnimationFrame(loop);
}

loop();

/* ---- DEBUG ACCESS ---- */
window.Sandbox = { state, physics, camera };
