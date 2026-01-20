export const state = {
  mode: {
    type: "select", // Default to selection mode
    behavior: null,
  },
  config: {
    showTrails: true,
    showLagrange: false,
    timeScale: 1,
  },
  settings: {
    planetMass: 50,
    sunMass: 10000,
    minZoom: 0.1,
    maxZoom: 5,
  },
  selection: {
    id: null, // ID of selected body
  },
  bodies: [],
  particles: [],
  stars: [],
  nextId: 1, // Auto-increment ID
  mouse: {
    screen: { x: 0, y: 0 },
    world: { x: 0, y: 0 },
    isDown: false,
    dragStartWorld: null,
  },
};
