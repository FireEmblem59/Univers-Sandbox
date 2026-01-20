import { state } from "./state.js";
import { physics } from "./physics.js";

// --- NEW COLORS ---
const PLANET_COLORS = [
  "#4cc9f0", // Cyan
  "#4361ee", // Royal Blue
  "#3a0ca3", // Deep Indigo
  "#7209b7", // Purple
  "#56cfe1", // Light Blue
  "#80ffdb", // Aqua
  "#aacc00", // Alien Green
];

const SUN_COLORS = [
  "#f72585", // Hot Pink
  "#b5179e", // Magenta
  "#ffca3a", // Yellow/Gold
  "#ff9e00", // Orange
  "#ff0000", // Red Dwarf
  "#ffffff", // White Dwarf
];

const getPlanetMass = () => state.settings.planetMass;
const getSunMass = () => state.settings.sunMass;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function createBody(props) {
  state.bodies.push({
    id: state.nextId++,
    vx: 0,
    vy: 0,
    trail: [],
    ...props,
  });
}

export const createPlanet = {
  orbit(pos) {
    const parent = physics.nearestSun(pos, state.bodies);
    const mass = getPlanetMass();
    const color = pick(PLANET_COLORS);

    if (!parent) return this.free(pos);

    const dx = pos.x - parent.x;
    const dy = pos.y - parent.y;
    const r = Math.hypot(dx, dy);
    const speed = Math.sqrt((physics.G * parent.mass) / r);

    const vx = (-dy / r) * speed + parent.vx;
    const vy = (dx / r) * speed + parent.vy;

    createBody({
      x: pos.x,
      y: pos.y,
      vx,
      vy,
      mass: mass,
      radius: Math.max(4, Math.sqrt(mass)),
      color: color,
      glow: color,
      type: "planet",
    });
  },

  vector(pos, dx, dy) {
    const mass = getPlanetMass();
    const color = pick(PLANET_COLORS);
    createBody({
      x: pos.x,
      y: pos.y,
      vx: dx * 0.05,
      vy: dy * 0.05,
      mass: mass,
      radius: Math.max(4, Math.sqrt(mass)),
      color: color,
      glow: color,
      type: "planet",
    });
  },

  free(pos) {
    const mass = getPlanetMass();
    const color = pick(PLANET_COLORS);
    createBody({
      x: pos.x,
      y: pos.y,
      mass: mass,
      radius: Math.max(4, Math.sqrt(mass)),
      color: color,
      glow: color,
      type: "planet",
    });
  },
};

export const createSun = {
  vector(pos, dx, dy) {
    const mass = getSunMass();
    const color = pick(SUN_COLORS);
    createBody({
      x: pos.x,
      y: pos.y,
      vx: dx * 0.02,
      vy: dy * 0.02,
      mass: mass,
      radius: Math.max(10, Math.sqrt(mass) / 3),
      color: color,
      glow: color,
      type: "sun",
    });
  },

  static(pos) {
    const mass = getSunMass();
    const color = pick(SUN_COLORS);
    createBody({
      x: pos.x,
      y: pos.y,
      mass: mass,
      radius: Math.max(10, Math.sqrt(mass) / 3),
      color: color,
      glow: color,
      type: "sun",
    });
  },

  massive(pos) {
    const mass = getSunMass() * 5;
    createBody({
      x: pos.x,
      y: pos.y,
      mass: mass,
      radius: Math.max(20, Math.sqrt(mass) / 2),
      color: "#ffffff",
      glow: "#ffffff",
      type: "sun",
    });
  },
};
