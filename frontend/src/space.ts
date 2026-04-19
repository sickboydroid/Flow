/**
 * Lightweight space background — canvas-based, persistent across tab switches.
 * Stars, tiny minimal ships, and occasional meteors.
 * All purely cosmetic, pointer-events: none, z-index: -1.
 */

const canvas = document.getElementById('space-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let W = 0, H = 0;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── Entities ──────────────────────────────────────────────────────────────────

interface Star {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  alpha: number;
  color: string;
  twinkleDelta: number;
  twinkleSpeed: number;
}

interface Ship {
  x: number; y: number;
  vx: number; vy: number;
  scale: number;
  alpha: number;
  color: string;
  type: number; // 0-8
}

interface Meteor {
  x: number; y: number;
  vx: number; vy: number;
  len: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface BigBody {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  alpha: number;
  color: string;
  detailColor: string;
  angle: number;
  rotSpeed: number;
}

const STAR_COUNT = 400;
const SHIP_COUNT = 25;

const stars: Star[] = [];
const ships: Ship[] = [];
const meteors: Meteor[] = [];
const bigBodies: BigBody[] = [];

// ── Colour sets ──────────────────────────────────────────────────────────────
const STAR_COLORS = [
  '255, 255, 255',   // White
  '186, 230, 253',   // Sky-200
  '254, 240, 138',   // Yellow-200
  '221, 214, 254',   // Violet-200
  '253, 164, 175',   // Rose-300
];

const SHIP_COLORS = [
  '100, 116, 139',   // Slate-500
  '56, 189, 248',    // Sky-400
  '251, 191, 36',    // Amber-400
  '129, 140, 248',   // Indigo-400
  '248, 113, 113',   // Red-400
  '52, 211, 153',    // Emerald-400
  '251, 113, 133',   // Rose-400
];

const BIG_BODY_COLORS = [
  { base: '226, 232, 240', detail: '203, 213, 225' }, // Slate-200/300
  { base: '241, 245, 249', detail: '226, 232, 240' }, // Slate-50/100
  { base: '236, 254, 255', detail: '207, 250, 254' }, // Cyan-50/100
  { base: '255, 247, 237', detail: '255, 237, 213' }, // Orange-50/100
];

// ── Init ──────────────────────────────────────────────────────────────────────
function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

function initStar(s: Star) {
  s.x = rnd(0, W);
  s.y = rnd(0, H);
  
  const speed = rnd(0.05, 0.15);
  const angle = rnd(-Math.PI/6, -Math.PI/3);
  s.vx = Math.cos(angle) * speed;
  s.vy = Math.sin(angle) * speed;

  s.r = rnd(0.4, 2.4);
  s.alpha = rnd(0.4, 0.85); 
  s.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
  s.twinkleDelta = rnd(0, Math.PI * 2);
  s.twinkleSpeed = rnd(0.005, 0.015);
}

function makeShip(): Ship {
  const speed = rnd(0.2, 1.0);
  const angle = rnd(-Math.PI/6, -Math.PI/3);
  
  return {
    x: rnd(-100, W),
    y: rnd(0, H + 100),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    scale: rnd(0.6, 1.3),
    alpha: rnd(0.3, 0.65), // Increased opacity
    color: SHIP_COLORS[Math.floor(Math.random() * SHIP_COLORS.length)],
    type: Math.floor(rnd(0, 9)) // 0-8 types
  };
}

function spawnMeteor() {
  const x = rnd(0, W * 0.5);
  const y = rnd(H * 0.5, H);
  const angle = -Math.PI / 4 + rnd(-0.1, 0.1);
  const speed = rnd(3, 8);
  meteors.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    len: rnd(70, 180),
    alpha: rnd(0.4, 0.7), // Increased opacity
    life: 0,
    maxLife: rnd(50, 120)
  });
}

function spawnBigBody() {
  if (bigBodies.length >= 2) return;
  
  const speed = rnd(0.02, 0.08);
  const angle = rnd(-Math.PI/6, -Math.PI/3);
  const colors = BIG_BODY_COLORS[Math.floor(Math.random() * BIG_BODY_COLORS.length)];
  
  bigBodies.push({
    x: rnd(-300, W),
    y: H + 300,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: rnd(60, 140),
    alpha: rnd(0.1, 0.2),
    color: colors.base,
    detailColor: colors.detail,
    angle: rnd(0, Math.PI * 2),
    rotSpeed: rnd(0.0001, 0.0005)
  });
}

// Initialise stars
for (let i = 0; i < STAR_COUNT; i++) {
  const s: Star = { x: 0, y: 0, vx: 0, vy: 0, r: 0, alpha: 0, color: '', twinkleDelta: 0, twinkleSpeed: 0 };
  initStar(s);
  stars.push(s);
}
// Initialise ships
for (let i = 0; i < SHIP_COUNT; i++) {
  const ship = makeShip();
  ships.push(ship);
}

// ── Draw helpers ──────────────────────────────────────────────────────────────

function drawRocket(x: number, y: number, alpha: number, scale: number, color: string, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI/2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(5, -4); ctx.lineTo(5, 8);
  ctx.lineTo(-5, 8); ctx.lineTo(-5, -4); ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-5, -4); ctx.lineTo(0, -14); ctx.lineTo(5, -4);
  ctx.stroke();
  ctx.restore();
}

function drawSaucer(x: number, y: number, alpha: number, scale: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -2, 6, 5, 0, Math.PI, 0);
  ctx.stroke();
  ctx.restore();
}

function drawArrow(x: number, y: number, alpha: number, scale: number, color: string, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
  ctx.moveTo(4, -6); ctx.lineTo(12, 0); ctx.lineTo(4, 6);
  ctx.stroke();
  ctx.restore();
}

function drawSatellite(x: number, y: number, alpha: number, scale: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = 1.2;
  // Core
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.stroke();
  // Solar panels
  ctx.strokeRect(-12, -3, 8, 6);
  ctx.strokeRect(4, -3, 8, 6);
  ctx.restore();
}

function drawScout(x: number, y: number, alpha: number, scale: number, color: string, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = 1.2;
  // H-Shape
  ctx.strokeRect(-8, -6, 2, 12);
  ctx.strokeRect(6, -6, 2, 12);
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
  ctx.stroke();
  ctx.restore();
}

function drawDiamond(x: number, y: number, alpha: number, scale: number, color: string, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI/4);
  ctx.scale(scale, scale);
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-6, -6, 12, 12);
  ctx.beginPath();
  ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
  ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
  ctx.stroke();
  ctx.restore();
}

function drawTwin(x: number, y: number, alpha: number, scale: number, color: string, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-10, -5, 3, 10);
  ctx.strokeRect(7, -5, 3, 10);
  ctx.restore();
}

function drawOrbiter(x: number, y: number, alpha: number, scale: number, color: string, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 10, -Math.PI/2, Math.PI/2); ctx.stroke();
  ctx.restore();
}

function drawTriangle(x: number, y: number, alpha: number, scale: number, color: string, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(12, 0); ctx.lineTo(-8, 8); ctx.lineTo(-4, 0); ctx.lineTo(-8, -8);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPlanet(p: BigBody) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  
  // Base circle
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${p.color}, ${p.alpha})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Surface details
  ctx.beginPath();
  ctx.arc(p.r * 0.3, p.r * 0.2, p.r * 0.2, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${p.detailColor}, ${p.alpha * 0.8})`;
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(-p.r * 0.4, -p.r * 0.1, p.r * 0.15, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.restore();
}

// ── Animation loop ─────────────────────────────────────────────────────────────

let frame = 0;

function tick() {
  requestAnimationFrame(tick);
  frame++;

  ctx.clearRect(0, 0, W, H);

  // ── Big Bodies (Planets)
  if (frame % 800 === 0 && Math.random() > 0.6) spawnBigBody();
  
  for (let i = bigBodies.length - 1; i >= 0; i--) {
    const p = bigBodies[i];
    p.x += p.vx;
    p.y += p.vy;
    p.angle += p.rotSpeed;
    drawPlanet(p);
    
    if (p.x > W + p.r * 2 || p.y < -p.r * 2) {
      bigBodies.splice(i, 1);
    }
  }

  // ── Stars
  for (const s of stars) {
    s.x += s.vx;
    s.y += s.vy;
    
    // Wrap around
    if (s.x > W + 10) s.x = -10;
    if (s.y < -10) s.y = H + 10;
    
    s.twinkleDelta += s.twinkleSpeed;
    const a = s.alpha + Math.sin(s.twinkleDelta) * 0.15;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = s.color.startsWith('rgba') ? s.color : `rgba(${s.color}, ${Math.max(0.1, a)})`;
    ctx.fill();
  }

  // ── Ships
  for (const ship of ships) {
    ship.x += ship.vx;
    ship.y += ship.vy;
    
    if (ship.x > W + 150 || ship.y < -150) {
      ship.x = rnd(-250, W);
      ship.y = H + 250;
      if (ship.x > W) ship.x = rnd(-150, W);
    }

    const angle = Math.atan2(ship.vy, ship.vx);

    if (ship.type === 0) drawRocket(ship.x, ship.y, ship.alpha, ship.scale, ship.color, angle);
    else if (ship.type === 1) drawSaucer(ship.x, ship.y, ship.alpha, ship.scale, ship.color);
    else if (ship.type === 2) drawArrow(ship.x, ship.y, ship.alpha, ship.scale, ship.color, angle);
    else if (ship.type === 3) drawSatellite(ship.x, ship.y, ship.alpha, ship.scale, ship.color);
    else if (ship.type === 4) drawScout(ship.x, ship.y, ship.alpha, ship.scale, ship.color, angle);
    else if (ship.type === 5) drawDiamond(ship.x, ship.y, ship.alpha, ship.scale, ship.color, angle);
    else if (ship.type === 6) drawTwin(ship.x, ship.y, ship.alpha, ship.scale, ship.color, angle);
    else if (ship.type === 7) drawOrbiter(ship.x, ship.y, ship.alpha, ship.scale, ship.color, angle);
    else drawTriangle(ship.x, ship.y, ship.alpha, ship.scale, ship.color, angle);
  }

  // ── Meteors
  if (frame % 150 === 0 && Math.random() > 0.4) spawnMeteor();

  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.x += m.vx;
    m.y += m.vy;
    m.life++;
    const progress = m.life / m.maxLife;
    const a = m.alpha * (1 - progress);

    ctx.save();
    const angle = Math.atan2(m.vy, m.vx);
    const tailX = m.x - Math.cos(angle) * m.len * (1 - progress * 0.5);
    const tailY = m.y - Math.sin(angle) * m.len * (1 - progress * 0.5);
    const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
    grad.addColorStop(0, `rgba(186, 230, 253, 0)`);
    grad.addColorStop(1, `rgba(186, 230, 253, ${a})`);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(m.x, m.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();

    if (m.life >= m.maxLife || m.x > W + 200 || m.y < -200) meteors.splice(i, 1);
  }
}

tick();
