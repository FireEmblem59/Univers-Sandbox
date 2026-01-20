export const camera = {
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 5,

  screenToWorld(sx, sy, canvas) {
    return {
      x: (sx - canvas.width / 2) / this.zoom + this.x,
      y: (sy - canvas.height / 2) / this.zoom + this.y,
    };
  },

  worldToScreen(wx, wy, canvas) {
    return {
      x: (wx - this.x) * this.zoom + canvas.width / 2,
      y: (wy - this.y) * this.zoom + canvas.height / 2,
    };
  },

  applyTransform(ctx, canvas) {
    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Fill background
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Camera
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  },

  recenterOnMassive(bodies) {
    if (!bodies.length) {
      this.x = 0;
      this.y = 0;
      return;
    }
    const target = bodies.reduce((a, b) => (a.mass > b.mass ? a : b));

    // Simple interpolation could go here, but instant snap is fine for this tool
    this.x = target.x;
    this.y = target.y;
  },

  updateSize(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  },
};
