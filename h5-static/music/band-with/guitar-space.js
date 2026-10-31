(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GuitarSpace = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STRING_NAMES = ["low E", "A", "D", "G", "B", "high E"];

  function solveLinear(matrix, values) {
    const n = values.length;
    const a = matrix.map((row, index) => [...row, values[index]]);
    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < n; row += 1) {
        if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
      }
      if (Math.abs(a[pivot][col]) < 1e-10) throw new Error("Degenerate calibration points");
      [a[col], a[pivot]] = [a[pivot], a[col]];
      const divisor = a[col][col];
      for (let j = col; j <= n; j += 1) a[col][j] /= divisor;
      for (let row = 0; row < n; row += 1) {
        if (row === col) continue;
        const factor = a[row][col];
        for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
      }
    }
    return a.map((row) => row[n]);
  }

  function homography(from, to) {
    if (from.length !== 4 || to.length !== 4) throw new Error("Homography requires four point pairs");
    const matrix = [];
    const values = [];
    for (let i = 0; i < 4; i += 1) {
      const [x, y] = from[i];
      const [u, v] = to[i];
      matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
      values.push(u);
      matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
      values.push(v);
    }
    return [...solveLinear(matrix, values), 1];
  }

  function project(h, point) {
    const [x, y] = point;
    const denominator = h[6] * x + h[7] * y + h[8];
    if (Math.abs(denominator) < 1e-10) return null;
    return [
      (h[0] * x + h[1] * y + h[2]) / denominator,
      (h[3] * x + h[4] * y + h[5]) / denominator,
    ];
  }

  function calibrate(imagePoints) {
    if (!Array.isArray(imagePoints) || imagePoints.length < 4) throw new Error("Four calibration points are required");
    const image = imagePoints.slice(0, 4).map((point) => [Number(point[0]), Number(point[1])]);
    const canonical = [[0, 0], [0, 1], [1, 0], [1, 1]];
    return {
      imagePoints: image,
      imageToGuitar: homography(image, canonical),
      guitarToImage: homography(canonical, image),
    };
  }

  function fretPosition(fret) {
    return fret <= 0 ? 0 : 1 - Math.pow(2, -fret / 12);
  }

  function fretForU(u, count = 22) {
    if (!Number.isFinite(u) || u < 0 || u > 1) return null;
    for (let fret = 1; fret <= count; fret += 1) {
      if (u <= fretPosition(fret)) return fret;
    }
    return count + 1;
  }

  function pickupZone(u) {
    if (u >= 0.57 && u <= 0.69) return "neck pickup";
    if (u >= 0.81 && u <= 0.93) return "bridge pickup";
    if (u >= 0.52 && u <= 0.98) return "picking zone";
    return "outside pickup zone";
  }

  function classify(calibration, imagePoint) {
    const mapped = project(calibration.imageToGuitar, imagePoint);
    if (!mapped) return null;
    const [u, v] = mapped;
    const stringIndex = Math.max(0, Math.min(5, Math.round(v * 5)));
    return {
      u,
      v,
      inside: u >= 0 && u <= 1 && v >= 0 && v <= 1,
      fret: fretForU(u),
      stringIndex,
      string: STRING_NAMES[stringIndex],
      pickup: pickupZone(u),
    };
  }

  class ActionTracker {
    constructor(options = {}) {
      this.crossingThreshold = options.crossingThreshold || 0.14;
      this.maxMotionMs = options.maxMotionMs || 350;
      this.cooldownMs = options.cooldownMs || 700;
      this.previous = null;
      this.cooldownUntil = 0;
      this.eventId = 0;
    }

    reset() {
      this.previous = null;
      this.cooldownUntil = 0;
    }

    update(coordinate, nowMs) {
      if (!coordinate || !coordinate.inside) {
        this.previous = null;
        return { state: "TRACKING", captured: false };
      }
      if (nowMs < this.cooldownUntil) {
        this.previous = { coordinate, nowMs };
        return { state: "COOLDOWN", captured: false, remainingMs: this.cooldownUntil - nowMs };
      }
      const inPickingZone = coordinate.u >= 0.52 && coordinate.u <= 0.98;
      if (!inPickingZone) {
        this.previous = { coordinate, nowMs };
        return { state: "TRACKING", captured: false };
      }
      let deltaV = 0;
      let elapsedMs = 0;
      if (this.previous) {
        deltaV = coordinate.v - this.previous.coordinate.v;
        elapsedMs = nowMs - this.previous.nowMs;
      }
      const captured = this.previous && elapsedMs > 0 && elapsedMs <= this.maxMotionMs && Math.abs(deltaV) >= this.crossingThreshold;
      this.previous = { coordinate, nowMs };
      if (captured) {
        this.cooldownUntil = nowMs + this.cooldownMs;
        this.eventId += 1;
        return { state: "CAPTURED", captured: true, eventId: this.eventId, deltaV, elapsedMs };
      }
      return { state: "CANDIDATE", captured: false, deltaV, elapsedMs };
    }
  }

  return { STRING_NAMES, solveLinear, homography, project, calibrate, fretPosition, fretForU, pickupZone, classify, ActionTracker };
});
