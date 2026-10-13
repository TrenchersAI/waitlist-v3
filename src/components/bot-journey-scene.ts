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

function tokenMark(ctx: CanvasRenderingContext2D, mark: number, x: number, y: number, size: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 40, size / 40);
  ctx.lineWidth = 2.3; ctx.lineCap = "round"; ctx.lineJoin = "round";
  switch (mark) {
    case 0: { // SOL
      const gradient = ctx.createLinearGradient(-18, 18, 18, -18);
      gradient.addColorStop(0, "#8e63ee"); gradient.addColorStop(1, "#52cbb5"); ctx.fillStyle = gradient;
      for (let i = 0; i < 3; i++) {
        const top = -15 + i * 12, shift = i === 1 ? -1 : 1;
        ctx.beginPath(); ctx.moveTo(-18 + 5 * shift, top); ctx.lineTo(18 + 5 * shift, top);
        ctx.lineTo(18 - 5 * shift, top + 7); ctx.lineTo(-18 - 5 * shift, top + 7); ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 1: // USD token
      ctx.fillStyle = "#397ac2"; ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "500 30px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", 0, 1);
      ctx.strokeStyle = "#ffffffd0";
      for (const angle of [-.6, Math.PI - .6]) { ctx.beginPath(); ctx.arc(0, 0, 16, angle, angle + 1.2); ctx.stroke(); }
      break;
    case 2: // Jupiter-style striped mark
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.clip();
      ctx.fillStyle = "#202b21"; ctx.fillRect(-22, -22, 44, 44);
      ctx.strokeStyle = "#b6d690"; ctx.lineWidth = 2.8;
      for (let i = -4; i < 7; i++) { ctx.beginPath(); ctx.ellipse(0, -13 + i * 7, 33, 13, -.18, 0, TAU); ctx.stroke(); }
      ctx.restore();
      break;
    case 3: // RAY
      ctx.strokeStyle = "#a7a2ee"; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 2; const x = Math.cos(a) * 22, y = Math.sin(a) * 22; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, 11); ctx.lineTo(-8, -10); ctx.lineTo(3, -10); ctx.quadraticCurveTo(15, -10, 10, 0); ctx.lineTo(0, 0); ctx.lineTo(12, 12); ctx.stroke();
      break;
    case 4: // PYTH
      ctx.strokeStyle = "#b7a1ce"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-10, 18); ctx.lineTo(-10, -5); ctx.bezierCurveTo(-10, -26, 20, -26, 20, -5); ctx.lineTo(20, 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1, 18); ctx.lineTo(-1, -4); ctx.bezierCurveTo(-1, -15, 11, -15, 11, -4); ctx.lineTo(11, 5); ctx.stroke();
      break;
    case 5: // JTO
      ctx.fillStyle = "#172a20"; ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#b0e86d"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(12, -10); ctx.lineTo(1, 12); ctx.quadraticCurveTo(-3, 18, -10, 10); ctx.stroke();
      break;
    case 6: // Token with an interlocking mark
      ctx.strokeStyle = "#d1d9e5"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-20, -10); ctx.bezierCurveTo(-9, -11, -10, 16, 0, 12); ctx.bezierCurveTo(11, 9, 7, -16, 20, -10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-20, 6); ctx.bezierCurveTo(-9, 3, -8, 22, 2, 15); ctx.stroke();
      break;
    default: // USD stablecoin
      ctx.fillStyle = "#4b9a86"; ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillRect(-13, -11, 26, 5); ctx.fillRect(-3, -8, 6, 23);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, -1, 16, 4, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

function botMark(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save(); ctx.translate(x, y);
  const metal = ctx.createLinearGradient(-30, -30, 35, 35);
  metal.addColorStop(0, "#778698"); metal.addColorStop(.45, "#384658"); metal.addColorStop(1, "#202c3d");
  ctx.fillStyle = metal; ctx.beginPath(); ctx.roundRect(-34, -24, 68, 51, 13); ctx.fill();
  ctx.strokeStyle = "#d8e0e5"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#74849a"; ctx.beginPath(); ctx.roundRect(-42, -10, 5, 23, 2); ctx.roundRect(37, -10, 5, 23, 2); ctx.fill();
  ctx.strokeStyle = "#8495aa"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -36); ctx.stroke();
  ctx.fillStyle = "#c3deee"; ctx.beginPath(); ctx.arc(0, -39, 4, 0, TAU); ctx.fill();
  ctx.fillStyle = "#c3deee";
  ctx.beginPath(); ctx.roundRect(-21, -7, 15, 9, 3); ctx.roundRect(6, -7, 15, 9, 3); ctx.fill();
  ctx.fillStyle = "#667887"; ctx.beginPath(); ctx.roundRect(-11, 14, 22, 2, 1); ctx.fill();
  ctx.restore();
}

export function createJourneyScene() {
  let field: TokenField | null = null;
  let lastTime = 0;
  let originTime = 0;
  return (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const worldWidth = width < 640 ? 590 : 800;
    const scale = width / worldWidth;
    const worldHeight = height / scale;
    if (!field || field.width !== worldWidth || Math.abs(field.height - worldHeight) > 1 || time < lastTime || time - lastTime > .5) {
      field = new TokenField(worldWidth, worldHeight);
      originTime = time;
    }
    field.advanceTo(time - originTime);
    lastTime = time;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#010513"; ctx.fillRect(0, 0, width, height);
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
      tokenMark(ctx, p.mark, p.x, p.y, 35 + p.radius * .14); ctx.restore();
    }
    // The elevated central disc is the only element with a pronounced shadow.
    ctx.save(); ctx.shadowColor = "#00000080"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 11;
    const disc = ctx.createLinearGradient(c.x - c.radius, c.y - c.radius, c.x + c.radius, c.y + c.radius);
    disc.addColorStop(0, "#152035"); disc.addColorStop(1, "#080f1d");
    ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = "#35425b"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, TAU); ctx.stroke();
    botMark(ctx, c.x, c.y);
    ctx.restore();
    const fade = ctx.createLinearGradient(0, 0, 0, height);
    fade.addColorStop(0, "#010513c0"); fade.addColorStop(.12, "#01051300");
    fade.addColorStop(.86, "#01051300"); fade.addColorStop(1, "#010513cc");
    ctx.fillStyle = fade; ctx.fillRect(0, 0, width, height);
  };
}

