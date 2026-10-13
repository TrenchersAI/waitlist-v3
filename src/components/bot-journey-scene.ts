// Falling token field, rebuilt from the supplied Connectivity Cloud reference.
// The center stays fixed; tokens drift, collide, and reconnect as they pass.
type Token = { id: number; x: number; y: number; vx: number; vy: number; radius: number; mark: number; opacity: number };
const TAU = Math.PI * 2;
const STEP = 1 / 90;
const hash = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export class TokenField {
  readonly tokens: Token[] = [];
  readonly center: { x: number; y: number; radius: number };
  private elapsed = 0;
  private tick = 0;
  constructor(readonly width: number, readonly height: number) {
    this.center = { x: width / 2, y: height / 2, radius: width < 700 ? 82 : 93 };
    const columns = Math.ceil(width / 145) + 1;
    const rows = Math.ceil(height / 155) + 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const id = row * columns + col;
        this.tokens.push({
          id, x: col * 154 + (row % 2 ? 77 : 0) - 70,
          y: row * 168 - 140 + hash(id + 41) * 24,
          vx: (hash(id + 73) - .5) * 22, vy: 175 + hash(id + 12) * 24,
          radius: 54 + hash(id + 8) * 24,
          mark: id % 8, opacity: id % 3 === 0 ? .18 : .95,
        });
      }
    }
    // Start in an already flowing arrangement, as in the reference.
    for (let i = 0; i < 270; i++) this.step();
  }
  advanceTo(time: number) {
    while (this.elapsed + STEP <= time) {
      this.step();
      this.elapsed += STEP;
    }
  }
  private recycle(p: Token) {
    let bestX = 0, bestScore = -Infinity;
    for (let i = 0; i < 7; i++) {
      const x = hash(p.id * 217 + this.tick + i * 131) * this.width;
      const score = Math.min(...this.tokens.filter(b => b !== p).map(b => Math.hypot(x - b.x, -p.radius - 50 - b.y) - b.radius));
      if (score > bestScore) { bestScore = score; bestX = x; }
    }
    p.x = bestX; p.y = -p.radius - 50;
    p.vy = 180 + hash(this.tick + p.id) * 22; p.vx = (hash(this.tick + 20) - .5) * 18;
    p.mark = (p.mark + 3) % 8;
  }
  private step() {
    this.tick++;
    const c = this.center;
    for (const p of this.tokens) {
      p.vy += (190 - p.vy) * STEP * 1.1;
      p.vx *= 1 - STEP * .35;
      // Small lateral force prevents an incoming circle balancing on the center.
      if (p.y < c.y && p.y > c.y - 230 && Math.abs(p.x - c.x) < 115) {
        p.vx += (p.x < c.x || p.x === c.x && p.id % 2 ? -1 : 1) * STEP * 80;
      }
      // Rejoin the stream below the bot instead of leaving a permanent empty wake.
      if (p.y > c.y) {
        const influence = clamp((p.y - c.y) / 55) * clamp((310 - Math.abs(p.x - c.x)) / 100);
        const inward = (c.x - p.x) * 2.4;
        p.vx += (inward - p.vx) * STEP * 4 * influence;
      }
      p.x += p.vx * STEP; p.y += p.vy * STEP;
      if (p.y > this.height + p.radius + 35) this.recycle(p);
      if (p.x < -p.radius * .45) { p.x = -p.radius * .45; p.vx = Math.abs(p.vx) * .5; }
      if (p.x > this.width + p.radius * .45) { p.x = this.width + p.radius * .45; p.vx = -Math.abs(p.vx) * .5; }
    }
    for (let iteration = 0; iteration < 5; iteration++) {
      for (let a = 0; a < this.tokens.length; a++) {
        const p = this.tokens[a];
        for (let b = a + 1; b < this.tokens.length; b++) {
          const q = this.tokens[b];
          const dx = q.x - p.x, dy = q.y - p.y;
          const distance = Math.hypot(dx, dy) || .001;
          const overlap = p.radius + q.radius + 16 - distance;
          if (overlap <= 0) continue;
          const nx = dx / distance, ny = dy / distance;
          const correction = Math.max(0, overlap - 2) * .32;
          p.x -= nx * correction * .5; p.y -= ny * correction * .5;
          q.x += nx * correction * .5; q.y += ny * correction * .5;
          const approach = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
          if (approach < 0) {
            // Remove the closing speed gently, with almost no rebound.
            const impulse = approach * .5;
            p.vx += impulse * nx; p.vy += impulse * ny;
            q.vx -= impulse * nx; q.vy -= impulse * ny;
            if (iteration === 0) {
              const relativeX = q.vx - p.vx, relativeY = q.vy - p.vy;
              const tangentX = relativeX - (relativeX * nx + relativeY * ny) * nx;
              const tangentY = relativeY - (relativeX * nx + relativeY * ny) * ny;
              p.vx += tangentX * .015; p.vy += tangentY * .015;
              q.vx -= tangentX * .015; q.vy -= tangentY * .015;
            }
          }
        }
        const dx = p.x - c.x, dy = p.y - c.y;
        const distance = Math.hypot(dx, dy) || .001;
        const overlap = p.radius + c.radius + 10 - distance;
        if (overlap > 0) {
          const nx = dx / distance, ny = dy / distance;
          const correction = Math.max(0, overlap - 2) * .32;
          p.x += nx * correction; p.y += ny * correction;
          const approach = p.vx * nx + p.vy * ny;
          if (approach < 0) { p.vx -= nx * approach; p.vy -= ny * approach; }
        }
      }
    }
  }
}

function fillDot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

/** Original cartoon marks for meme-coin culture: dog, frog, cat, hatted dog, rocket, moon, candle, laugh. */
function memeMark(ctx: CanvasRenderingContext2D, mark: number) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (mark % 8) {
    case 0:
      drawDog(ctx, false);
      break;
    case 1:
      drawFrog(ctx);
      break;
    case 2:
      drawCat(ctx);
      break;
    case 3:
      drawDog(ctx, true);
      break;
    case 4:
      drawRocket(ctx);
      break;
    case 5:
      drawMoon(ctx);
      break;
    case 6:
      drawCandle(ctx);
      break;
    default:
      drawLaugh(ctx);
      break;
  }
}

function drawDog(ctx: CanvasRenderingContext2D, withHat: boolean) {
  ctx.fillStyle = "#d3924e";
  ctx.beginPath();
  ctx.ellipse(-13, -10, 6, 9, -0.5, 0, TAU);
  ctx.ellipse(13, -10, 6, 9, 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffe1b5";
  ctx.beginPath();
  ctx.arc(0, 2, 14, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff8ee";
  ctx.beginPath();
  ctx.ellipse(0, 8, 8, 6.5, 0, 0, TAU);
  ctx.fill();
  fillDot(ctx, -5.5, -1, 2.6, "#241910");
  fillDot(ctx, 5.5, -1, 2.6, "#241910");
  fillDot(ctx, -4.7, -2, 0.8, "#fff");
  fillDot(ctx, 6.3, -2, 0.8, "#fff");
  ctx.fillStyle = "#2a2118";
  ctx.beginPath();
  ctx.ellipse(0, 6, 2.6, 1.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#e56b86";
  ctx.beginPath();
  ctx.ellipse(0, 13, 3.2, 4.2, 0, 0, TAU);
  ctx.fill();
  if (!withHat) return;
  ctx.fillStyle = "#ef3b4c";
  ctx.beginPath();
  ctx.arc(0, -8, 12, Math.PI, TAU);
  ctx.fill();
  ctx.fillRect(-12, -10, 24, 5);
  ctx.fillStyle = "#ffd1dc";
  ctx.beginPath();
  ctx.arc(9, -16, 3.4, 0, TAU);
  ctx.fill();
}

function drawFrog(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#3cba4f";
  ctx.beginPath();
  ctx.arc(0, 5, 14, 0, TAU);
  ctx.fill();
  fillDot(ctx, -10, -8, 7.5, "#3cba4f");
  fillDot(ctx, 10, -8, 7.5, "#3cba4f");
  fillDot(ctx, -10, -8, 4.6, "#f4fff6");
  fillDot(ctx, 10, -8, 4.6, "#f4fff6");
  fillDot(ctx, -9, -7, 2.2, "#1a1a1a");
  fillDot(ctx, 11, -7, 2.2, "#1a1a1a");
  ctx.strokeStyle = "#1d4a24";
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(0, 7, 7, 0.2, Math.PI - 0.2);
  ctx.stroke();
  fillDot(ctx, -11, 8, 1.8, "#ef6b7a");
  fillDot(ctx, 11, 8, 1.8, "#ef6b7a");
}

function drawCat(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#f4b56a";
  ctx.beginPath();
  ctx.moveTo(-15, -2);
  ctx.lineTo(-10, -18);
  ctx.lineTo(-2, -4);
  ctx.closePath();
  ctx.moveTo(15, -2);
  ctx.lineTo(10, -18);
  ctx.lineTo(2, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f07a8a";
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.lineTo(-10, -12);
  ctx.lineTo(-5, -4);
  ctx.closePath();
  ctx.moveTo(12, -4);
  ctx.lineTo(10, -12);
  ctx.lineTo(5, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f4b56a";
  ctx.beginPath();
  ctx.arc(0, 4, 13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#2a2118";
  ctx.beginPath();
  ctx.ellipse(-5, 2, 1.8, 2.8, 0, 0, TAU);
  ctx.ellipse(5, 2, 1.8, 2.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#e07a8a";
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(-2.4, 5.4);
  ctx.lineTo(2.4, 5.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fff6e8";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-6, 8); ctx.lineTo(-16, 6);
  ctx.moveTo(-6, 10); ctx.lineTo(-16, 12);
  ctx.moveTo(6, 8); ctx.lineTo(16, 6);
  ctx.moveTo(6, 10); ctx.lineTo(16, 12);
  ctx.stroke();
}

function drawRocket(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ffb020";
  ctx.beginPath();
  ctx.moveTo(-5, 8);
  ctx.lineTo(0, 20);
  ctx.lineTo(5, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ff5a1f";
  ctx.beginPath();
  ctx.moveTo(-3, 8);
  ctx.lineTo(0, 16);
  ctx.lineTo(3, 8);
  ctx.closePath();
  ctx.fill();
  const body = ctx.createLinearGradient(-10, 0, 10, 0);
  body.addColorStop(0, "#d7e4f5");
  body.addColorStop(1, "#8ea4c4");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(11, -6, 9, 10);
  ctx.lineTo(-9, 10);
  ctx.quadraticCurveTo(-11, -6, 0, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5b7cff";
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(-17, 12);
  ctx.lineTo(-9, 10);
  ctx.closePath();
  ctx.moveTo(9, 2);
  ctx.lineTo(17, 12);
  ctx.lineTo(9, 10);
  ctx.closePath();
  ctx.fill();
  fillDot(ctx, 0, -3, 3.6, "#7ec8ff");
  fillDot(ctx, 0, -3, 1.8, "#e8f6ff");
}

function drawMoon(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ffe08a";
  ctx.beginPath();
  ctx.arc(-3, 0, 13, -1.15, 1.15);
  ctx.arc(5, 0, 11, 0.95, -0.95, true);
  ctx.closePath();
  ctx.fill();
}

function drawCandle(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#d9ffe8";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, 16);
  ctx.stroke();
  ctx.fillStyle = "#3dd68c";
  ctx.beginPath();
  ctx.roundRect(-7, -7, 14, 15, 3);
  ctx.fill();
  ctx.fillStyle = "#b8ffd6";
  ctx.fillRect(-7, -7, 4, 15);
}

function drawLaugh(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ffd23a";
  ctx.beginPath();
  ctx.arc(0, 1, 15, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a2a10";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(-6, -1, 3.2, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(6, -1, 3.2, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.fillStyle = "#3a2a10";
  ctx.beginPath();
  ctx.ellipse(0, 6, 6.5, 4.5, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = "#ff6b8a";
  ctx.beginPath();
  ctx.ellipse(0, 9, 3.2, 2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#7ec8ff";
  ctx.beginPath();
  ctx.ellipse(-12, 3, 1.7, 2.6, -0.4, 0, TAU);
  ctx.ellipse(12, 3, 1.7, 2.6, 0.4, 0, TAU);
  ctx.fill();
}

function tokenMark(ctx: CanvasRenderingContext2D, mark: number, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 40, size / 40);
  memeMark(ctx, mark);
  ctx.restore();
}

export function createJourneyScene() {
  let field: TokenField | null = null;
  let lastTime = 0;
  let originTime = 0;
  return (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const worldWidth = width < 640 ? 980 : 1680;
    const scale = width / worldWidth;
    const worldHeight = height / scale;
    if (!field || field.width !== worldWidth || Math.abs(field.height - worldHeight) > 1 || time < lastTime || time - lastTime > .5) {
      field = new TokenField(worldWidth, worldHeight);
      originTime = time;
    }
    field.advanceTo(time - originTime);
    lastTime = time;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.scale(scale, scale);
    const c = field.center;
    // Fine straight connections follow nearby circles, underneath every disc.
    for (const p of field.tokens) {
      const dx = p.x - c.x, dy = p.y - c.y, distance = Math.hypot(dx, dy);
      const proximity = clamp((355 - distance) / 145);
      if (!proximity) continue;
      const nx = dx / distance, ny = dy / distance;
      ctx.strokeStyle = `rgba(140,162,197,${proximity * .25})`; ctx.lineWidth = .85;
      ctx.beginPath(); ctx.moveTo(c.x + nx * c.radius, c.y + ny * c.radius);
      ctx.lineTo(p.x - nx * (p.radius + 7), p.y - ny * (p.radius + 7)); ctx.stroke();
    }
    for (const p of field.tokens) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, TAU);
      ctx.fillStyle = "#010513"; ctx.fill(); ctx.lineWidth = 1;
      ctx.strokeStyle = "#202a3d"; ctx.stroke();
      ctx.save(); ctx.globalAlpha = p.opacity;
      tokenMark(ctx, p.mark, p.x, p.y, 56 + p.radius * .18); ctx.restore();
    }
    // The elevated central disc is the only element with a pronounced shadow.
    ctx.save(); ctx.shadowColor = "#00000080"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 11;
    const disc = ctx.createLinearGradient(c.x - c.radius, c.y - c.radius, c.x + c.radius, c.y + c.radius);
    disc.addColorStop(0, "#152035"); disc.addColorStop(1, "#080f1d");
    ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = "#35425b"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, TAU); ctx.stroke();
    ctx.restore();
    const fade = ctx.createLinearGradient(0, 0, 0, height);
    fade.addColorStop(0, "#000000c0"); fade.addColorStop(.12, "#00000000");
    fade.addColorStop(.86, "#00000000"); fade.addColorStop(1, "#000000e6");
    ctx.fillStyle = fade; ctx.fillRect(0, 0, width, height);
  };
}

