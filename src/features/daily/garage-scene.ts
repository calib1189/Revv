/*
 * The streak garage (features/daily/chest-opener.tsx drives it): a real
 * building at night, lit like a photograph rather than drawn like a game.
 *
 * The outside (a concrete wall, the soffit with its two downlights, the
 * driveway, a steel sectional door) is rendered once, pixel by pixel: every
 * surface is a plane in a small 3D scene, lit by the actual fixtures
 * (inverse-square falloff, the beam's cone, the door's recess throwing its
 * shadow), then tone mapped like a camera would. The SORZA mark over the
 * door is a lit sign whose glow lands on the concrete around it.
 *
 * Opening it is just a garage door opening: the door rises into the
 * header at an opener's steady pace, and the light inside (a honeycomb of
 * LED tubes, the cove strip in the prize's colour) spills out under it
 * and across the driveway, reaching further the higher the door goes.
 *
 * Plain 2D canvas, no ctx.filter (WKWebView's canvas lacks it). The
 * expensive work happens once; a frame is a handful of drawImage calls.
 */

export type RGB = [number, number, number];

/** What changes from frame to frame; the rest is baked. */
export interface GarageFrame {
  /** The whole scene's fade up from black, 0-1. */
  fade: number;
  /** The sign's power, 0-1. */
  logo: number;
  /** How far the door has risen, 0-1. */
  open: number;
  /** The slow camera push, 1 = none. */
  zoom: number;
  /** The opener's jolt as it engages, in CSS px. */
  lurch: number;
}

export interface GarageLayout {
  /** The doorway in CSS px, before the camera's push. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** What the camera pushes toward (the doorway's middle). */
  anchorX: number;
  anchorY: number;
}

// ---- The scene, in door widths --------------------------------------------
const D = 4; // camera to wall
const E = 0.33; // camera height
const DOOR_H = 0.78;
const RECESS = 0.04;
const TRIM = 0.016;
const SOFFIT_Y = 1.22;
const SOFFIT_D = 0.32;
const FASCIA_H = 0.1;
const FIX_X = 0.56;
const FIX_Y = SOFFIT_Y - 0.015;
const FIX_Z = D - 0.13;
const FIX_POWER = 0.09;
const COS_IN = Math.cos((22 * Math.PI) / 180);
const COS_OUT = Math.cos((37 * Math.PI) / 180);
const FIX_RGB: RGB = [1, 0.8, 0.6]; // 3000K
const LOGO_W = 0.37;
const LOGO_CY = 1.0;
/** Inside: the back wall, and the honeycomb on it. */
const BACK = 3.3;
const HEX_R = 0.125;
const HEX_BOX = { x0: -0.78, x1: 0.78, y0: 0.5, y1: 1.0 };
/** The inside's ceiling lights, for the spill: how far behind the door, how high. */
const SPILL_B = 1.0;
const SPILL_LO = 0.7;
const SPILL_HI = 1.0;
const EXPOSURE = 1.9;

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ---- Tone mapping ----------------------------------------------------------
const LUT = new Uint8ClampedArray(4097);
for (let i = 0; i <= 4096; i++) LUT[i] = Math.round(255 * Math.pow(i / 4096, 1 / 2.2));
function aces(x: number) {
  const v = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
/** Linear light to an 8-bit value, with a little dither so the dark
 * gradients never band. */
function toByte(lin: number, dither: number) {
  return LUT[(aces(lin * EXPOSURE) * 4096) | 0] + dither;
}

// ---- Noise -----------------------------------------------------------------
const NS = 256;
const GRID = (() => {
  const g = new Float32Array(NS * NS);
  let s = 1234567;
  for (let i = 0; i < g.length; i++) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    g[i] = ((s >>> 0) % 10000) / 10000;
  }
  return g;
})();
function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const x0 = xi & 255;
  const y0 = yi & 255;
  const x1 = (x0 + 1) & 255;
  const y1 = (y0 + 1) & 255;
  const a = GRID[y0 * NS + x0] + (GRID[y0 * NS + x1] - GRID[y0 * NS + x0]) * u;
  const b = GRID[y1 * NS + x0] + (GRID[y1 * NS + x1] - GRID[y1 * NS + x0]) * u;
  return a + (b - a) * v;
}
function makeDither() {
  let s = 88675123;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296 - 0.5) * 1.6;
  };
}

// ---- Blur (box x3 ~ gaussian), on float planes -----------------------------
function boxPass(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, horizontal: boolean) {
  const n = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const step = horizontal ? 1 : w;
  const inv = 1 / (2 * r + 1);
  for (let l = 0; l < lines; l++) {
    const base = horizontal ? l * w : l;
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += src[base + clamp(i, 0, n - 1) * step];
    for (let i = 0; i < n; i++) {
      dst[base + i * step] = acc * inv;
      acc += src[base + Math.min(n - 1, i + r + 1) * step] - src[base + Math.max(0, i - r) * step];
    }
  }
}
function blur(plane: Float32Array, w: number, h: number, rx: number, ry: number) {
  const tmp = new Float32Array(plane.length);
  for (let i = 0; i < 3; i++) {
    if (rx > 0) {
      boxPass(plane, tmp, w, h, rx, true);
      plane.set(tmp);
    }
    if (ry > 0) {
      boxPass(plane, tmp, w, h, ry, false);
      plane.set(tmp);
    }
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}
function ctx2d(c: HTMLCanvasElement) {
  const x = c.getContext("2d");
  if (!x) throw new Error("2d canvas unavailable");
  return x;
}

/** A canvas's pixels blurred (separately across and down) and faded with
 * distance from its top edge: a reflection in damp concrete. */
function reflectionOf(src: HTMLCanvasElement, scale: number, rx: number, ry: number, fadeTo: number, strength: number) {
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const c = canvas(w, h);
  const x = ctx2d(c);
  x.translate(0, h);
  x.scale(1, -1);
  x.drawImage(src, 0, 0, w, h);
  const img = x.getImageData(0, 0, w, h);
  const planes = [0, 1, 2].map((ch) => {
    const p = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) p[i] = (img.data[i * 4 + ch] / 255) * (img.data[i * 4 + 3] / 255);
    blur(p, w, h, Math.round(rx * scale), Math.round(ry * scale));
    return p;
  });
  for (let yy = 0; yy < h; yy++) {
    const f = strength * Math.pow(1 - clamp(yy / (h * fadeTo)), 1.6);
    for (let xx = 0; xx < w; xx++) {
      const i = yy * w + xx;
      img.data[i * 4] = planes[0][i] * 255 * f;
      img.data[i * 4 + 1] = planes[1][i] * 255 * f;
      img.data[i * 4 + 2] = planes[2][i] * 255 * f;
      img.data[i * 4 + 3] = 255;
    }
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.putImageData(img, 0, 0);
  return c;
}

/** The honeycomb's tubes on the back wall, as segments in wall units,
 * clipped to its frame, plus the frame itself. */
function honeycomb(): [number, number, number, number][] {
  const segs: [number, number, number, number][] = [];
  const seen = new Set<string>();
  const { x0, x1, y0, y1 } = HEX_BOX;
  const R = HEX_R;
  const hx = 1.5 * R;
  const hy = Math.sqrt(3) * R;
  const clip = (ax: number, ay: number, bx: number, by: number) => {
    // Liang-Barsky against the frame.
    let t0 = 0;
    let t1 = 1;
    const dx = bx - ax;
    const dy = by - ay;
    const edges: [number, number][] = [
      [-dx, ax - x0],
      [dx, x1 - ax],
      [-dy, ay - y0],
      [dy, y1 - ay],
    ];
    for (const [p, q] of edges) {
      if (p === 0) {
        if (q < 0) return null;
      } else {
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
      }
    }
    if (t0 >= t1) return null;
    return [ax + dx * t0, ay + dy * t0, ax + dx * t1, ay + dy * t1] as [number, number, number, number];
  };
  const cy = (y0 + y1) / 2;
  for (let c = -8; c <= 8; c++) {
    for (let r = -6; r <= 6; r++) {
      const ox = c * hx;
      const oy = cy + r * hy + (Math.abs(c) % 2 ? hy / 2 : 0);
      for (let k = 0; k < 6; k++) {
        const a0 = (Math.PI / 3) * k;
        const a1 = (Math.PI / 3) * (k + 1);
        const ax = ox + R * Math.cos(a0);
        const ay = oy + R * Math.sin(a0);
        const bx = ox + R * Math.cos(a1);
        const by = oy + R * Math.sin(a1);
        const key = [((ax + bx) * 500) | 0, ((ay + by) * 500) | 0].join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        const s = clip(ax, ay, bx, by);
        if (s && Math.hypot(s[2] - s[0], s[3] - s[1]) > 0.02) segs.push(s);
      }
    }
  }
  segs.push([x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]);
  return segs;
}

export class GarageScene {
  private ctx: CanvasRenderingContext2D;
  /** Device px per CSS px. */
  private k = 1;
  private W = 0;
  private H = 0;
  // Projection, in device px.
  private cx = 0;
  private vy = 0;
  private unit = 0; // px per door width, at the wall
  private F = 0;
  private left = 0;
  private top = 0;
  private dW = 0;
  private dH = 0;
  private floorY = 0;
  // Baked layers.
  private outsideOff: HTMLCanvasElement | null = null;
  private outsideOn: HTMLCanvasElement | null = null;
  private door: HTMLCanvasElement | null = null;
  private sign: HTMLCanvasElement | null = null;
  private signRect = { x: 0, y: 0, w: 0, h: 0 };
  private signReflection: HTMLCanvasElement | null = null;
  private facadeReflection: HTMLCanvasElement | null = null;
  private vignette: HTMLCanvasElement | null = null;
  private inside: HTMLCanvasElement | null = null;
  private insideReflection: HTMLCanvasElement | null = null;
  private spill: HTMLCanvasElement | null = null;
  private spillMask: HTMLCanvasElement | null = null;
  private spillRgb: RGB = [255, 255, 255];
  private tier: RGB | null = null;
  /** The mark, trimmed and with its faint backdrop cut away. */
  private mark: HTMLCanvasElement | null = null;

  constructor(
    private el: HTMLCanvasElement,
    private logo: HTMLImageElement,
  ) {
    this.ctx = ctx2d(el);
  }

  get ready() {
    return this.outsideOff !== null;
  }

  /** Bakes everything outside. Heavy (a few hundred ms on a phone), so
   * it runs once, behind the black the scene fades up from. */
  prepare() {
    const k = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.k = k;
    this.W = Math.round(W * k);
    this.H = Math.round(H * k);
    this.el.width = this.W;
    this.el.height = this.H;
    const dw = Math.min(W * 0.7, H * 0.42, 420);
    this.unit = Math.round(dw * k);
    this.F = this.unit * D;
    this.cx = this.W / 2;
    this.vy = Math.round(H * 0.47 * k);
    this.left = Math.round(this.cx - this.unit / 2);
    this.dW = this.unit;
    this.top = Math.round(this.vy - (DOOR_H - E) * this.unit);
    this.floorY = Math.round(this.vy + E * this.unit);
    this.dH = this.floorY - this.top;
    this.mark = this.cleanMark();
    const glow = this.signGlow();
    this.bakeOutside(glow);
    this.bakeDoor();
    this.bakeSign(glow);
    this.bakeVignette();
    if (this.tier) this.setTier(this.tier);
  }

  layout(): GarageLayout {
    const k = this.k;
    return {
      left: this.left / k,
      top: this.top / k,
      width: this.dW / k,
      height: this.dH / k,
      anchorX: this.cx / k,
      anchorY: (this.top + this.dH / 2) / k,
    };
  }

  /** Where a point (CSS px, before the push) lands on screen at a zoom. */
  project(x: number, y: number, zoom: number): [number, number] {
    const a = this.layout();
    return [a.anchorX + (x - a.anchorX) * zoom, a.anchorY + (y - a.anchorY) * zoom];
  }

  private cleanMark() {
    const img = this.logo;
    // The mark's ink within logo-mark.png, which carries a faint grey box.
    const sx = 96;
    const sy = 138;
    const sw = 336;
    const sh = 210;
    const c = canvas(sw, sh);
    const x = ctx2d(c);
    x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const d = x.getImageData(0, 0, sw, sh);
    for (let i = 3; i < d.data.length; i += 4) {
      const a = d.data[i];
      d.data[i] = a < 90 ? 0 : Math.min(255, ((a - 90) / 120) * 255);
    }
    x.putImageData(d, 0, 0);
    return c;
  }

  /** The sign's light on the wall around it, in wall units: a tight halo
   * and a broad wash, for the white of the mark and its red slash. */
  private signGlow() {
    const res = 0.004;
    const X0 = -0.62;
    const Y0 = 0.72;
    const w = Math.round(1.24 / res);
    const h = Math.round((SOFFIT_Y - Y0) / res);
    const mark = this.mark;
    if (!mark) throw new Error("mark not ready");
    const lw = LOGO_W / res;
    const lh = (lw * mark.height) / mark.width;
    const c = canvas(w, h);
    const x = ctx2d(c);
    const lx = (-LOGO_W / 2 - X0) / res;
    const ly = h - (LOGO_CY - Y0) / res - lh / 2;
    x.drawImage(mark, lx, ly, lw, lh);
    const d = x.getImageData(0, 0, w, h).data;
    const white = new Float32Array(w * h);
    const red = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const a = d[i * 4 + 3] / 255;
      const isRed = d[i * 4] > 150 && d[i * 4 + 1] < 110;
      if (isRed) red[i] = a;
      else white[i] = a;
    }
    const tight = (p: Float32Array) => {
      const q = new Float32Array(p);
      blur(q, w, h, 3, 3);
      return q;
    };
    const wide = (p: Float32Array) => {
      const q = new Float32Array(p);
      blur(q, w, h, 16, 16);
      return q;
    };
    return { X0, Y0, res, w, h, whiteT: tight(white), whiteW: wide(white), redT: tight(red), redW: wide(red), lx, ly, lw, lh };
  }

  private bakeOutside(glow: ReturnType<GarageScene["signGlow"]>) {
    const { W, H, cx, vy, unit, F } = this;
    const off = canvas(W, H);
    const on = canvas(W, H);
    const offImg = ctx2d(off).createImageData(W, H);
    const onImg = ctx2d(on).createImageData(W, H);
    const A = offImg.data;
    const B = onImg.data;
    const dither = makeDither();
    const ySw = vy - (SOFFIT_Y - E) * unit;
    const ySf = vy - (F * (SOFFIT_Y - E)) / (D - SOFFIT_D);
    const yFf = vy - (F * (SOFFIT_Y + FASCIA_H - E)) / (D - SOFFIT_D);
    const fixes = [-FIX_X, FIX_X];
    const glowAt = (X: number, Y: number): [number, number] => {
      const gx = (X - glow.X0) / glow.res;
      const gy = glow.h - (Y - glow.Y0) / glow.res;
      if (gx < 0 || gy < 0 || gx >= glow.w - 1 || gy >= glow.h - 1) return [0, 0];
      const i = (gy | 0) * glow.w + (gx | 0);
      return [glow.whiteT[i] * 0.9 + glow.whiteW[i] * 0.55, glow.redT[i] * 0.9 + glow.redW[i] * 0.55];
    };

    for (let py = 0; py < H; py++) {
      const sy = py + 0.5;
      for (let px = 0; px < W; px++) {
        const sx = px + 0.5;
        const o = (py * W + px) * 4;
        let r = 0;
        let g = 0;
        let b = 0;
        let lr = 0;
        let lg = 0;
        let lb = 0;
        let alpha = 255;
        if (sy > this.floorY) {
          // The driveway.
          const z = (F * E) / (sy - vy);
          const X = ((sx - cx) * z) / F;
          const t = D - z;
          const pxW = z / F; // world units per px here
          let alb = 0.2 * (0.86 + 0.28 * noise(X * 9, z * 9) + 0.1 * (noise(X * 70, z * 70) - 0.5));
          const joint = (dist: number) => 1 - 0.55 * smooth(1.6 * pxW, 0.3 * pxW, dist);
          alb *= joint(Math.abs(Math.abs(X) - 0.62));
          alb *= joint(Math.abs(t - 1.35));
          let irr = 0;
          for (const fx of fixes) {
            const lx = fx - X;
            const ly = FIX_Y;
            const lz = FIX_Z - z;
            const r2 = lx * lx + ly * ly + lz * lz;
            const rr = Math.sqrt(r2);
            const c = ly / rr;
            irr += (FIX_POWER * smooth(COS_OUT, COS_IN, c) * c) / r2;
          }
          const ao = 1 - 0.5 * Math.exp(-t / 0.035);
          irr *= ao;
          r = alb * (irr * FIX_RGB[0] + 0.012 * ao);
          g = alb * (irr * FIX_RGB[1] + 0.014 * ao);
          b = alb * (irr * FIX_RGB[2] + 0.02 * ao);
          lr = r;
          lg = g;
          lb = b;
        } else if (sy > ySw) {
          // The wall, or the doorway in it.
          const X = (sx - cx) / unit;
          const Y = E - (sy - vy) / unit;
          if (px >= this.left && px < this.left + this.dW && py >= this.top) {
            alpha = 0;
          } else {
            const pxW = 1 / unit;
            const ax = Math.abs(X);
            let alb: number;
            let tint: RGB = [1, 0.97, 0.93];
            const inTrim = ax < 0.5 + TRIM && Y < DOOR_H + TRIM;
            if (inTrim) {
              // Steel trim round the doorway.
              alb = 0.055;
              tint = [0.92, 0.96, 1];
            } else {
              alb = 0.3 * (0.84 + 0.3 * noise(X * 5, Y * 5) + 0.12 * (noise(X * 40, Y * 40) - 0.5) + 0.06 * (noise(X * 160, Y * 160) - 0.5));
              if (noise(X * 120 + 7, Y * 120 + 3) > 0.9) alb *= 0.82;
              const joint = (dist: number) => 1 - 0.6 * smooth(1.4 * pxW, 0.25 * pxW, dist);
              alb *= joint(Math.abs(ax - 0.62));
              alb *= joint(Math.abs(ax - 1.4));
              if (ax > 0.62) {
                alb *= joint(Math.abs(Y - 0.42));
                alb *= joint(Math.abs(Y - 0.84));
              }
              // Form-tie holes, lit from above: dark inside, a bright lower lip.
              const hx = ax > 0.62 ? (((ax - 0.62) % 0.26) + 0.26) % 0.26 : (((ax + 0.2) % 0.4) + 0.4) % 0.4;
              const tx = ax > 0.62 ? hx - 0.13 : hx - 0.2;
              const ty = ((Y % 0.21) + 0.21) % 0.21 - 0.105;
              const nearSign = ax < 0.36 && Y > 0.82;
              if (!nearSign && !(ax < 0.66 && Y < DOOR_H + 0.06)) {
                const dd = Math.hypot(tx, ty);
                if (dd < 0.011) {
                  alb *= ty < 0 ? 0.55 + 0.9 * smooth(0.004, 0.011, dd) : 0.25;
                }
              }
            }
            let irr = 0;
            for (const fx of fixes) {
              const lx = fx - X;
              const ly = FIX_Y - Y;
              const lz = FIX_Z - D;
              const r2 = lx * lx + ly * ly + lz * lz + 0.0004;
              const rr = Math.sqrt(r2);
              const c = ly / rr;
              if (c <= 0) continue;
              irr += (FIX_POWER * smooth(COS_OUT, COS_IN, c) * (-lz / rr)) / r2;
            }
            const ao = (1 - 0.35 * Math.exp(-Y / 0.03)) * (1 - 0.3 * Math.exp(-(SOFFIT_Y - Y) / 0.03));
            r = alb * tint[0] * (irr * FIX_RGB[0] + 0.007) * ao;
            g = alb * tint[1] * (irr * FIX_RGB[1] + 0.008) * ao;
            b = alb * tint[2] * (irr * FIX_RGB[2] + 0.012) * ao;
            const [gw, gr] = glowAt(X, Y);
            const sgn = 1.0;
            lr = r + alb * tint[0] * sgn * (gw * 0.95 + gr * 1.0) * ao;
            lg = g + alb * tint[1] * sgn * (gw * 0.97 + gr * 0.12) * ao;
            lb = b + alb * tint[2] * sgn * (gw * 1.0 + gr * 0.1) * ao;
          }
        } else if (sy > ySf) {
          // The soffit's underside, and the two downlights in it.
          const z = (F * (SOFFIT_Y - E)) / (vy - sy);
          const X = ((sx - cx) * z) / F;
          let bounce = 0;
          let em = 0;
          for (const fx of fixes) {
            const d2 = (X - fx) * (X - fx) + (z - FIX_Z) * (z - FIX_Z);
            bounce += 0.06 * Math.exp(-d2 / 0.05);
            const pxW = z / F;
            const d = Math.sqrt(d2);
            em += 9 * smooth(0.026 + pxW, 0.026 - pxW, d);
            if (d > 0.026 && d < 0.036) bounce += 0.25;
          }
          const alb = 0.1 * (0.9 + 0.2 * noise(X * 30, z * 30));
          const slat = 0.85 + 0.15 * Math.abs(Math.sin(X * 140));
          r = alb * slat * (bounce * FIX_RGB[0] + 0.006) + em * FIX_RGB[0];
          g = alb * slat * (bounce * FIX_RGB[1] + 0.007) + em * FIX_RGB[1];
          b = alb * slat * (bounce * FIX_RGB[2] + 0.01) + em * FIX_RGB[2];
          lr = r;
          lg = g;
          lb = b;
        } else if (sy > yFf) {
          // The fascia: dark metal, catching the sky along its top.
          const f = (sy - yFf) / (ySf - yFf);
          const lit = 0.004 + 0.01 * Math.exp(-f * 12);
          r = lit * 0.8;
          g = lit * 0.9;
          b = lit * 1.2;
          lr = r;
          lg = g;
          lb = b;
        } else {
          // Night sky.
          const f = sy / Math.max(1, yFf);
          r = 0.0016 + 0.0024 * f;
          g = 0.002 + 0.003 * f;
          b = 0.0042 + 0.0055 * f;
          lr = r;
          lg = g;
          lb = b;
        }
        const d1 = dither();
        const d2 = dither();
        const d3 = dither();
        A[o] = toByte(r, d1);
        A[o + 1] = toByte(g, d2);
        A[o + 2] = toByte(b, d3);
        A[o + 3] = alpha;
        B[o] = toByte(lr, d1);
        B[o + 1] = toByte(lg, d2);
        B[o + 2] = toByte(lb, d3);
        B[o + 3] = alpha;
      }
    }
    ctx2d(off).putImageData(offImg, 0, 0);
    ctx2d(on).putImageData(onImg, 0, 0);
    // The downlights' lenses bloom a little, as they would in a lens.
    for (const c of [off, on]) {
      const x = ctx2d(c);
      x.globalCompositeOperation = "lighter";
      for (const fx of fixes) {
        const z = FIX_Z;
        const sx = cx + (F * fx) / z;
        const sy = vy - (F * (SOFFIT_Y - E)) / z;
        const rad = unit * 0.16;
        const gr = x.createRadialGradient(sx, sy, 0, sx, sy, rad);
        gr.addColorStop(0, "rgba(255,214,170,0.55)");
        gr.addColorStop(0.15, "rgba(255,190,140,0.16)");
        gr.addColorStop(1, "rgba(255,170,120,0)");
        x.fillStyle = gr;
        x.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
      }
    }
    this.outsideOff = off;
    this.outsideOn = on;
    // The lit wall, mirrored soft in the damp driveway.
    const hh = H - this.floorY;
    const wall = canvas(W, hh);
    ctx2d(wall).drawImage(off, 0, this.floorY - hh, W, hh, 0, 0, W, hh);
    this.facadeReflection = reflectionOf(wall, 0.25, 8, 30, 0.9, 1.1);
  }

  /** The door: anthracite steel in four sections, finely ribbed, lit by
   * the downlights past the recess's shadow. */
  private bakeDoor() {
    const { dW, dH } = this;
    const c = canvas(dW, dH);
    const x = ctx2d(c);
    const img = x.createImageData(dW, dH);
    const P = img.data;
    const dither = makeDither();
    const zP = D + RECESS;
    const joints = [0.25, 0.5, 0.75].map((f) => DOOR_H * f);
    const RIBS = 2; // per section: a faint swell, not a shutter's ribs
    for (let py = 0; py < dH; py++) {
      const Y = DOOR_H - ((py + 0.5) / dH) * DOOR_H;
      // The section's profile at this height: tilt (up-facing +) and occlusion.
      let tilt = 0;
      let occ = 1;
      for (const j of joints) {
        const dy = Y - j;
        if (Math.abs(dy) < 0.0016) occ = 0.08;
        else if (dy > 0 && dy < 0.008) tilt = -0.9 * (1 - dy / 0.008); // upper section's rounded lower edge
        else if (dy < 0 && dy > -0.007) tilt = 0.85 * (1 + dy / 0.007); // lower section's top lip
      }
      const sectionY = ((Y % (DOOR_H / 4)) + DOOR_H / 4) % (DOOR_H / 4);
      const rib = Math.sin((sectionY / (DOOR_H / 4)) * RIBS * Math.PI * 2);
      if (tilt === 0) tilt = 0.06 * rib;
      const ny = Math.sin(tilt);
      const nz = -Math.cos(tilt);
      const seal = Y < 0.012 ? 0.25 : 1;
      for (let px = 0; px < dW; px++) {
        const X = (px + 0.5) / dW - 0.5;
        let irr = 0;
        for (const fx of [-FIX_X, FIX_X]) {
          const lx = fx - X;
          const ly = FIX_Y - Y;
          const lz = FIX_Z - zP;
          const r2 = lx * lx + ly * ly + lz * lz;
          const rr = Math.sqrt(r2);
          const cc = ly / rr;
          // Does the ray clear the header and jambs on its way in?
          const s = RECESS / (RECESS + (D - FIX_Z));
          const yc = Y + ly * s;
          const xc = X + lx * s;
          const vis = smooth(DOOR_H + 0.004, DOOR_H - 0.012, yc) * smooth(0.5 + 0.004, 0.5 - 0.012, Math.abs(xc));
          const cosI = (ny * ly + nz * lz) / rr;
          if (cosI > 0) irr += (FIX_POWER * vis * smooth(COS_OUT, COS_IN, cc) * cosI) / r2;
        }
        const alb = 0.2 * occ * seal * (0.95 + 0.1 * noise(X * 60, Y * 60) + 0.04 * (noise(X * 300, Y * 300) - 0.5));
        const amb = 0.006 * (1 + 0.5 * ny);
        const r = alb * (irr * FIX_RGB[0] + amb * 0.85);
        const g = alb * (irr * FIX_RGB[1] + amb * 0.95);
        const b = alb * (irr * FIX_RGB[2] + amb * 1.15);
        const o = (py * dW + px) * 4;
        P[o] = toByte(r, dither());
        P[o + 1] = toByte(g, dither());
        P[o + 2] = toByte(b, dither());
        P[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    this.door = c;
  }

  /** The lit sign itself: the mark's face, and the bloom a camera sees
   * round a bright thing. */
  private bakeSign(glow: ReturnType<GarageScene["signGlow"]>) {
    const { unit, cx, vy } = this;
    const mark = this.mark;
    if (!mark) return;
    const pad = 0.14;
    const wU = LOGO_W + pad * 2;
    const hU = (LOGO_W * mark.height) / mark.width + pad * 2;
    const w = Math.round(wU * unit);
    const h = Math.round(hU * unit);
    const c = canvas(w, h);
    const x = ctx2d(c);
    // Bloom: the glow planes, mapped and tone-mapped into this box.
    const gw = Math.round(wU / glow.res);
    const gh = Math.round(hU / glow.res);
    const bloom = canvas(gw, gh);
    const bx = ctx2d(bloom);
    const bi = bx.createImageData(gw, gh);
    const ox = Math.round((-wU / 2 - glow.X0) / glow.res);
    const oy = Math.round(glow.h - (LOGO_CY + hU / 2 - glow.Y0) / glow.res);
    for (let yy = 0; yy < gh; yy++) {
      for (let xx = 0; xx < gw; xx++) {
        const sx = xx + ox;
        const sy = yy + oy;
        let wv = 0;
        let rv = 0;
        if (sx >= 0 && sy >= 0 && sx < glow.w && sy < glow.h) {
          const i = sy * glow.w + sx;
          wv = glow.whiteT[i] * 0.5 + glow.whiteW[i] * 0.35;
          rv = glow.redT[i] * 0.5 + glow.redW[i] * 0.35;
        }
        const o = (yy * gw + xx) * 4;
        bi.data[o] = 255 * (1 - Math.exp(-(wv * 0.75 + rv * 0.9)));
        bi.data[o + 1] = 255 * (1 - Math.exp(-(wv * 0.78 + rv * 0.12)));
        bi.data[o + 2] = 255 * (1 - Math.exp(-(wv * 0.85 + rv * 0.1)));
        bi.data[o + 3] = 255;
      }
    }
    bx.putImageData(bi, 0, 0);
    x.globalCompositeOperation = "lighter";
    x.drawImage(bloom, 0, 0, w, h);
    // The face: white acrylic lit from behind, its red slash, and the
    // slight overexposure a camera gives anything that bright.
    const mw = LOGO_W * unit;
    const mh = (mw * mark.height) / mark.width;
    x.globalCompositeOperation = "source-over";
    x.drawImage(mark, (w - mw) / 2, (h - mh) / 2, mw, mh);
    x.globalCompositeOperation = "lighter";
    x.globalAlpha = 0.35;
    x.drawImage(mark, (w - mw) / 2, (h - mh) / 2, mw, mh);
    x.globalAlpha = 1;
    this.sign = c;
    this.signRect = { x: cx - w / 2, y: vy - (LOGO_CY + hU / 2 - E) * unit, w, h };
    // Its reflection in the driveway, far below, streaked by the damp.
    this.signReflection = reflectionOf(c, 0.35, 6, 26, 1.4, 0.32);
  }

  private bakeVignette() {
    const { W, H } = this;
    const c = canvas(W, H);
    const x = ctx2d(c);
    const r = Math.hypot(W, H) * 0.62;
    const g = x.createRadialGradient(W / 2, H * 0.46, r * 0.35, W / 2, H * 0.46, r);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.6)");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    this.vignette = c;
  }

  /** Inside, once we know what's in there: the honeycomb, the cove strip
   * in the prize's colour, the light they throw on the driveway. */
  setTier(rgb: RGB) {
    this.tier = rgb;
    if (!this.outsideOff) return;
    this.bakeInside(rgb);
    this.bakeSpill(rgb);
  }

  private bakeInside(tier: RGB) {
    const { dW, dH, F, cx, vy, left, top } = this;
    const c = canvas(dW, dH);
    const x = ctx2d(c);
    const Zb = D + BACK;
    const P = (X: number, Y: number, Z: number): [number, number] => [cx + (F * X) / Z - left, vy - (F * (Y - E)) / Z - top];
    const s = F / Zb; // px per unit on the back wall
    const tube = (k: number): string => {
      const m = (a: number, b: number) => Math.round(a + (b - a) * k);
      return `${m(246, tier[0])},${m(250, tier[1])},${m(255, tier[2])}`;
    };
    const lightCol = tube(0.28);
    const [, wallTop] = P(0, 1.06, Zb);
    const [, wallBase] = P(0, 0, Zb);

    // Ceiling, back wall, floor.
    x.fillStyle = "#08090b";
    x.fillRect(0, 0, dW, dH);
    let g = x.createLinearGradient(0, wallTop, 0, wallBase);
    g.addColorStop(0, "#15171b");
    g.addColorStop(1, "#1c1e22");
    x.fillStyle = g;
    x.fillRect(0, wallTop, dW, wallBase - wallTop);
    g = x.createLinearGradient(0, wallBase, 0, dH);
    g.addColorStop(0, "#1a1b1f");
    g.addColorStop(1, "#0d0e10");
    x.fillStyle = g;
    x.fillRect(0, wallBase, dW, dH - wallBase);
    // The ceiling's edge, lit by the wall below it.
    g = x.createLinearGradient(0, 0, 0, wallTop);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(${lightCol},0.10)`);
    x.fillStyle = g;
    x.fillRect(0, 0, dW, wallTop);

    // The wall lit by the honeycomb.
    x.globalCompositeOperation = "lighter";
    const [hcx, hcy] = P(0, (HEX_BOX.y0 + HEX_BOX.y1) / 2, Zb);
    const rr = (HEX_BOX.x1 - HEX_BOX.x0) * s * 0.75;
    g = x.createRadialGradient(hcx, hcy, 0, hcx, hcy, rr);
    g.addColorStop(0, `rgba(${lightCol},0.20)`);
    g.addColorStop(0.6, `rgba(${lightCol},0.07)`);
    g.addColorStop(1, `rgba(${lightCol},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, dW, dH);

    // The tubes: a broad bloom, a tighter glow, and the bright core, with
    // the dark connectors where they meet.
    const segs = honeycomb();
    const strokeAll = (w: number, style: string, mirror: boolean) => {
      x.lineWidth = w;
      x.strokeStyle = style;
      x.beginPath();
      for (const [ax, ay, bx, by] of segs) {
        const len = Math.hypot(bx - ax, by - ay);
        const ux = (bx - ax) / len;
        const uy = (by - ay) / len;
        const gap = 0.012;
        const a = P(ax + ux * gap, (mirror ? -1 : 1) * (ay + uy * gap), Zb);
        const b = P(bx - ux * gap, (mirror ? -1 : 1) * (by - uy * gap), Zb);
        x.moveTo(a[0], a[1]);
        x.lineTo(b[0], b[1]);
      }
      x.stroke();
    };
    x.lineCap = "round";
    strokeAll(0.09 * s, `rgba(${lightCol},0.05)`, false);
    strokeAll(0.04 * s, `rgba(${lightCol},0.12)`, false);
    strokeAll(0.017 * s, `rgba(${lightCol},0.55)`, false);
    strokeAll(0.009 * s, "rgba(255,255,255,0.95)", false);

    // Its reflection in the epoxy floor.
    x.save();
    x.beginPath();
    x.rect(0, wallBase, dW, dH - wallBase);
    x.clip();
    strokeAll(0.05 * s, `rgba(${lightCol},0.05)`, true);
    strokeAll(0.014 * s, `rgba(${lightCol},0.16)`, true);
    g = x.createLinearGradient(0, wallBase, 0, dH);
    g.addColorStop(0, `rgba(${lightCol},0.16)`);
    g.addColorStop(1, `rgba(${lightCol},0.02)`);
    x.fillStyle = g;
    x.fillRect(0, wallBase, dW, dH - wallBase);
    x.restore();

    // The cove strip along the foot of the wall, in the prize's colour.
    const t = `${tier[0]},${tier[1]},${tier[2]}`;
    g = x.createLinearGradient(0, wallBase - 0.22 * s, 0, wallBase);
    g.addColorStop(0, `rgba(${t},0)`);
    g.addColorStop(1, `rgba(${t},0.5)`);
    x.fillStyle = g;
    x.fillRect(0, wallBase - 0.22 * s, dW, 0.22 * s);
    g = x.createLinearGradient(0, wallBase, 0, dH);
    g.addColorStop(0, `rgba(${t},0.55)`);
    g.addColorStop(0.35, `rgba(${t},0.12)`);
    g.addColorStop(1, `rgba(${t},0.03)`);
    x.fillStyle = g;
    x.fillRect(0, wallBase, dW, dH - wallBase);
    x.fillStyle = `rgba(${tube(0.6)},1)`;
    x.fillRect(0, wallBase - Math.max(1.5, 0.006 * s), dW, Math.max(1.5, 0.006 * s));

    // Connectors, drawn over the light so they read as hardware.
    x.globalCompositeOperation = "source-over";
    x.fillStyle = "rgba(18,19,22,0.9)";
    const nodes = new Set<string>();
    for (const [ax, ay, bx, by] of segs) {
      for (const [nx, ny] of [
        [ax, ay],
        [bx, by],
      ]) {
        const key = `${Math.round(nx * 200)},${Math.round(ny * 200)}`;
        if (nodes.has(key)) continue;
        nodes.add(key);
        const [px, py] = P(nx, ny, Zb);
        x.beginPath();
        x.arc(px, py, 0.01 * s, 0, Math.PI * 2);
        x.fill();
      }
    }
    // A touch of grain, so it sits with the photographed outside.
    const img = x.getImageData(0, 0, dW, dH);
    const dither = makeDither();
    for (let i = 0; i < img.data.length; i += 4) {
      const n = dither() * 1.3;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    x.putImageData(img, 0, 0);
    this.inside = c;
    this.insideReflection = reflectionOf(c, 0.5, 5, 18, 0.55, 0.3);
  }

  /** The light the inside throws through the doorway onto the driveway,
   * fully open. Each frame cuts it back to what the door lets through. */
  private bakeSpill(tier: RGB) {
    const { W, H, F, cx, vy, floorY } = this;
    const h = H - floorY;
    const c = canvas(W, h);
    const x = ctx2d(c);
    const img = x.createImageData(W, h);
    const P = img.data;
    const dither = makeDither();
    const mix = (k: number): RGB => [
      (246 + (tier[0] - 246) * k) / 255,
      (250 + (tier[1] - 250) * k) / 255,
      (255 + (tier[2] - 255) * k) / 255,
    ];
    const col = mix(0.3);
    this.spillRgb = [Math.round(col[0] * 255), Math.round(col[1] * 255), Math.round(col[2] * 255)];
    const lin = col.map((v) => Math.pow(v, 2.2));
    const N = 9;
    const xs = Array.from({ length: N }, (_, i) => -0.9 + (1.8 * i) / (N - 1));
    const Lh = (SPILL_LO + SPILL_HI) / 2;
    for (let py = 0; py < h; py++) {
      const sy = floorY + py + 0.5;
      const z = (F * E) / (sy - vy);
      const t = D - z;
      const bt = SPILL_B + t;
      const sFrac = SPILL_B / bt;
      for (let px = 0; px < W; px++) {
        const X = ((px + 0.5 - cx) * z) / F;
        let irr = 0;
        for (const xl of xs) {
          const xc = xl + (X - xl) * sFrac;
          const pass = smooth(0.5 + 0.02, 0.5 - 0.02, Math.abs(xc));
          if (pass <= 0) continue;
          const dx = X - xl;
          const r2 = dx * dx + Lh * Lh + bt * bt;
          irr += (pass * Lh * bt) / (r2 * r2);
        }
        irr *= 1.6 / N;
        const alb = 0.2 * (0.86 + 0.28 * noise(X * 9, z * 9) + 0.1 * (noise(X * 70, z * 70) - 0.5));
        const pxW = z / F;
        const joint = (dist: number) => 1 - 0.55 * smooth(1.6 * pxW, 0.3 * pxW, dist);
        const j = joint(Math.abs(Math.abs(X) - 0.62)) * joint(Math.abs(t - 1.35));
        const e = alb * j * irr * 3;
        const o = (py * W + px) * 4;
        P[o] = toByte(e * lin[0], dither());
        P[o + 1] = toByte(e * lin[1], dither());
        P[o + 2] = toByte(e * lin[2], dither());
        P[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    this.spill = c;
    this.spillMask = canvas(W, h);
  }

  draw(f: GarageFrame) {
    const { ctx, W, H, k } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    if (!this.outsideOff || !this.outsideOn || !this.door) return;
    const ax = this.cx;
    const ay = this.top + this.dH / 2;
    const z = f.zoom;
    ctx.setTransform(z, 0, 0, z, ax - ax * z, ay - ay * z);

    const { left, top, dW, dH, floorY } = this;
    const open = clamp(f.open);
    const lift = Math.round(open * dH);
    const doorBottom = floorY - lift;

    // Inside, where the door has cleared it.
    if (this.inside && open > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, doorBottom, dW, lift);
      ctx.clip();
      ctx.drawImage(this.inside, left, top);
      ctx.restore();
    }

    // The door, sliding up into the header.
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, dW, doorBottom - top);
    ctx.clip();
    ctx.drawImage(this.door, left, top - lift + f.lurch * k);
    // The header's shadow stays put while the door passes under it.
    const sh = 0.09 * this.unit;
    const g = ctx.createLinearGradient(0, top, 0, top + sh);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(left, top, dW, sh);
    ctx.restore();

    // A shut door still lets a line of the light inside under its seal.
    if (this.inside && open < 0.02) {
      const [r, gg, b] = this.spillRgb;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${r},${gg},${b},${0.35 * (1 - open / 0.02)})`;
      ctx.fillRect(left + 2 * k, floorY - k, dW - 4 * k, k);
      ctx.globalCompositeOperation = "source-over";
    }
    // Once the door's bottom edge is above eye level we see its underside,
    // lit from inside.
    if (this.inside && open > 0.02) {
      const [r, gg, b] = this.spillRgb;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${r},${gg},${b},${0.55 * smooth(0.02, 0.2, open)})`;
      ctx.fillRect(left, doorBottom - 1.5 * k, dW, 1.5 * k);
      ctx.globalCompositeOperation = "source-over";
    }

    // The building.
    if (f.logo < 1) ctx.drawImage(this.outsideOff, 0, 0);
    if (f.logo > 0) {
      ctx.globalAlpha = f.logo;
      ctx.drawImage(this.outsideOn, 0, 0);
      ctx.globalAlpha = 1;
    }

    ctx.globalCompositeOperation = "lighter";
    // The light under the door, reaching out as the gap grows. A shut door
    // still leaks a line of it.
    if (this.spill && this.spillMask) {
      const Ho = Math.max(0.006, open * DOOR_H);
      const m = ctx2d(this.spillMask);
      const mh = this.spillMask.height;
      m.globalCompositeOperation = "copy";
      m.drawImage(this.spill, 0, 0);
      m.globalCompositeOperation = "destination-in";
      const grad = m.createLinearGradient(0, 0, 0, mh);
      const a0 = SPILL_LO;
      const a1 = SPILL_HI;
      const STOPS = 24;
      for (let i = 0; i <= STOPS; i++) {
        const f2 = Math.pow(i / STOPS, 2);
        const sy = this.floorY + f2 * mh + 0.5;
        const zz = (this.F * E) / (sy - this.vy);
        const t = Math.max(0.0005, D - zz);
        const pass = clamp((Ho * (SPILL_B + t)) / t - a0, 0, a1 - a0) / (a1 - a0);
        grad.addColorStop(f2, `rgba(0,0,0,${pass})`);
      }
      m.fillStyle = grad;
      m.fillRect(0, 0, W, mh);
      m.globalCompositeOperation = "source-over";
      ctx.drawImage(this.spillMask, 0, floorY);
    }

    // Reflections in the damp driveway.
    if (this.facadeReflection) ctx.drawImage(this.facadeReflection, 0, floorY, W, H - floorY);
    if (this.insideReflection && open > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(left - dW, floorY, dW * 3, lift);
      ctx.clip();
      ctx.drawImage(this.insideReflection, left, floorY, dW, dH);
      ctx.restore();
    }
    if (this.sign && this.signReflection && f.logo > 0) {
      const r = this.signRect;
      ctx.globalAlpha = f.logo;
      ctx.drawImage(this.signReflection, r.x, 2 * floorY - r.y - r.h, r.w, r.h);
      // The sign itself.
      ctx.drawImage(this.sign, r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = "source-over";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.vignette) ctx.drawImage(this.vignette, 0, 0);
    if (f.fade < 1) {
      ctx.fillStyle = `rgba(0,0,0,${1 - f.fade})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
