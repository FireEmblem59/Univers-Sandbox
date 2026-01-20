import { state } from "./state.js";

export const physics = {
  G: 0.5,
  TRAIL_LENGTH: 60,

  getAcceleration(ax, ay, bx, by, bMass) {
    const dx = bx - ax;
    const dy = by - ay;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    const force = (this.G * bMass) / (distSq + 50); // Softening
    return { x: (force * dx) / dist, y: (force * dy) / dist };
  },

  update(bodies, timeScale) {
    // 1. Gravity & Integration
    for (let i = 0; i < bodies.length; i++) {
      let ax = 0,
        ay = 0;
      const a = bodies[i];
      for (let j = 0; j < bodies.length; j++) {
        if (i === j) continue;
        const b = bodies[j];
        const accel = this.getAcceleration(a.x, a.y, b.x, b.y, b.mass);
        ax += accel.x;
        ay += accel.y;
      }
      a.vx += ax * timeScale;
      a.vy += ay * timeScale;
    }

    // 2. Move & Trails
    for (const b of bodies) {
      b.x += b.vx * timeScale;
      b.y += b.vy * timeScale;

      // Dynamic trail update: less frequent for better perf
      if (state.config.showTrails && Math.random() > 0.5) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > this.TRAIL_LENGTH) b.trail.shift();
      }
    }

    // 3. Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * timeScale;
      p.y += p.vy * timeScale;
      p.life -= 0.015 * timeScale;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    this.handleCollisions(bodies);
  },

  handleCollisions(bodies) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);

        if (dist < (a.radius + b.radius) * 0.85) {
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const impactSpeed = Math.hypot(dvx, dvy);

          // Identify who is bigger
          const killerIdx = a.mass > b.mass ? i : j;
          const victimIdx = a.mass > b.mass ? j : i;
          const killer = bodies[killerIdx];
          const victim = bodies[victimIdx];

          const massRatio = killer.mass / victim.mass;

          // CRASH FIX LOGIC:
          // 1. Don't shatter if the killer is a Sun (Stars eat planets).
          // 2. Don't shatter if victim is too small (Prevents infinite recursion).
          const isSunCollision = killer.type === "sun";
          const isTiny = victim.mass < 1;

          if (
            impactSpeed > 1.5 &&
            massRatio > 5 &&
            !isSunCollision &&
            !isTiny
          ) {
            // Shatter logic (Planets hitting Planets)
            this.shatterBody(victim);
            bodies.splice(victimIdx, 1);

            // If we removed 'i', decrement to stay on track
            if (victimIdx === i) i--;
            break;
          } else {
            // Merge logic (Stars eating planets, or slow collisions)
            this.createExplosion(
              (a.x + b.x) / 2,
              (a.y + b.y) / 2,
              a.color,
              Math.sqrt(a.mass + b.mass) * 0.5,
            );
            this.mergeBodies(bodies, i, j);
            i--;
            break;
          }
        }
      }
    }
  },

  shatterBody(body) {
    // Spawn 3-5 shards
    const shardCount = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < shardCount; k++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5;
      state.bodies.push({
        ...body,
        id: state.nextId++,
        radius: body.radius * 0.4, // smaller
        mass: body.mass / shardCount,
        vx: body.vx + Math.cos(angle) * speed,
        vy: body.vy + Math.sin(angle) * speed,
        trail: [],
      });
    }
    this.createExplosion(body.x, body.y, body.color, body.radius);
  },

  createExplosion(x, y, color, size) {
    const count = Math.floor(size * 2);
    for (let k = 0; k < count; k++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: color,
        size: Math.random() * 2 + 1,
      });
    }
  },

  nearestSun(pos, bodies) {
    let best = null,
      min = Infinity;
    for (const b of bodies) {
      if (b.type !== "sun") continue;
      const d = Math.hypot(pos.x - b.x, pos.y - b.y);
      if (d < min) {
        min = d;
        best = b;
      }
    }
    return best;
  },

  mergeBodies(bodies, i, j) {
    const a = bodies[i];
    const b = bodies[j];
    const totalMass = a.mass + b.mass;
    const newVx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
    const newVy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
    const newX = (a.x * a.mass + b.x * b.mass) / totalMass;
    const newY = (a.y * a.mass + b.y * b.mass) / totalMass;
    const newRadius = Math.sqrt(a.radius * a.radius + b.radius * b.radius);
    const survivor = a.mass > b.mass ? a : b;

    const newBody = {
      ...survivor,
      id: state.nextId++,
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
      mass: totalMass,
      radius: newRadius,
      trail: [],
    };
    bodies.splice(j, 1);
    bodies.splice(i, 1);
    bodies.push(newBody);

    // Update selection if merged
    if (state.selection.id === a.id || state.selection.id === b.id) {
      state.selection.id = newBody.id;
    }
  },

  // Calculate L1-L5 points for the two most massive bodies
  getLagrangePoints(bodies) {
    if (bodies.length < 2) return [];
    // Sort by mass descending
    const sorted = [...bodies].sort((a, b) => b.mass - a.mass);
    const m1 = sorted[0]; // Sun
    const m2 = sorted[1]; // Planet

    // L-points only make sense if m1 is significantly larger than m2 and they are orbiting
    // This is a simplified visual approximation
    const dx = m2.x - m1.x;
    const dy = m2.y - m1.y;
    const r = Math.hypot(dx, dy);

    // Unit vectors
    const ux = dx / r;
    const uy = dy / r;

    const points = [];

    // L1 (between) - approx 0.85r
    points.push({
      x: m1.x + ux * (r * 0.85),
      y: m1.y + uy * (r * 0.85),
      label: "L1",
    });

    // L2 (behind small) - approx 1.15r
    points.push({
      x: m1.x + ux * (r * 1.15),
      y: m1.y + uy * (r * 1.15),
      label: "L2",
    });

    // L3 (behind large) - approx -1.0r
    points.push({ x: m1.x - ux * r, y: m1.y - uy * r, label: "L3" });

    // L4 & L5 (Triangular, 60 deg offset)
    // Rotate u by 60 deg
    const cos60 = 0.5,
      sin60 = 0.866;
    points.push({
      x: m1.x + (ux * cos60 - uy * sin60) * r,
      y: m1.y + (ux * sin60 + uy * cos60) * r,
      label: "L4",
    });
    points.push({
      x: m1.x + (ux * cos60 + uy * sin60) * r,
      y: m1.y + (ux * -sin60 + uy * cos60) * r,
      label: "L5",
    });

    return points;
  },

  exportScene() {
    return JSON.stringify(state.bodies);
  },

  importScene(json) {
    try {
      const data = JSON.parse(json);
      state.bodies = data.map((b) => ({
        ...b,
        trail: [], // Reset trails to avoid rendering glitches
      }));
      state.nextId = Math.max(...state.bodies.map((b) => b.id || 0)) + 1;
    } catch (e) {
      console.error("Invalid Scene File");
    }
  },
};
