/**
 * Decorative animated space-themed canvas background.
 *
 * Wraps the previous functional `space.ts` into a class so the bootstrap
 * can `new SpaceBackground(canvas).start()` and the lifecycle is explicit.
 * Behaviour, counts, and rendering are unchanged.
 */

interface Star {
  x: number;
  y: number;
  z: number;
  vy: number;
  r: number;
  alpha: number;
  color: string;
  twinkleDelta: number;
  twinkleSpeed: number;
}

interface FluidObject {
  x: number;
  y: number;
  baseX: number;
  vx: number;
  vy: number;
  scale: number;
  alpha: number;
  color: string;
  type: number;
  fluidOffset: number;
  fluidSpeed: number;
  angle: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface BigBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: string;
  detailColor: string;
  angle: number;
  rotSpeed: number;
}

const STAR_COUNT = 600;
const FLUID_OBJ_COUNT = 40;

const STAR_COLORS = [
  '255, 255, 255',
  '186, 230, 253',
  '254, 240, 138',
  '221, 214, 254',
  '253, 164, 175',
];
const SHIP_COLORS = [
  '100, 116, 139',
  '56, 189, 248',
  '251, 191, 36',
  '129, 140, 248',
  '248, 113, 113',
  '52, 211, 153',
];
const BIG_BODY_COLORS = [
  { base: '226, 232, 240', detail: '203, 213, 225' },
  { base: '241, 245, 249', detail: '226, 232, 240' },
  { base: '236, 254, 255', detail: '207, 250, 254' },
];

function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export class SpaceBackground {
  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private frame = 0;
  private rafId: number | null = null;
  private boundResize: () => void;
  private stars: Star[] = [];
  private fluidObjs: FluidObject[] = [];
  private meteors: Meteor[] = [];
  private bigBodies: BigBody[] = [];

  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('SpaceBackground: 2D context unavailable');
    this.ctx = ctx;
    this.boundResize = (): void => this.resize();
  }

  start(): void {
    this.resize();
    window.addEventListener('resize', this.boundResize);

    for (let i = 0; i < STAR_COUNT; i++) {
      const s: Star = {
        x: 0, y: 0, z: 0, vy: 0, r: 0, alpha: 0,
        color: '', twinkleDelta: 0, twinkleSpeed: 0,
      };
      this.initStar(s);
      this.stars.push(s);
    }
    for (let i = 0; i < FLUID_OBJ_COUNT; i++) this.fluidObjs.push(this.makeFluidObj());

    this.tick();
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    window.removeEventListener('resize', this.boundResize);
  }

  private resize(): void {
    this.W = this.canvas.width = window.innerWidth;
    this.H = this.canvas.height = window.innerHeight;
  }

  private initStar(s: Star): void {
    s.x = rnd(0, this.W);
    s.y = rnd(0, this.H);
    s.z = rnd(0.1, 2);
    s.vy = rnd(0.05, 0.2) * s.z;
    s.r = rnd(0.4, 2) * s.z;
    s.alpha = rnd(0.2, 0.85);
    s.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
    s.twinkleDelta = rnd(0, Math.PI * 2);
    s.twinkleSpeed = rnd(0.01, 0.03);
  }

  private makeFluidObj(): FluidObject {
    const speed = rnd(0.1, 0.8);
    const angle = rnd(-Math.PI / 6, -Math.PI / 3);
    return {
      x: rnd(-100, this.W),
      baseX: 0,
      y: rnd(0, this.H + 100),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      scale: rnd(0.4, 1.5),
      alpha: rnd(0.2, 0.5),
      color: SHIP_COLORS[Math.floor(Math.random() * SHIP_COLORS.length)],
      type: Math.floor(rnd(0, 5)),
      fluidOffset: rnd(0, Math.PI * 2),
      fluidSpeed: rnd(0.005, 0.015),
      angle: 0,
    };
  }

  private spawnMeteor(): void {
    const x = rnd(0, this.W * 0.8);
    const y = rnd(this.H * 0.5, this.H);
    const angle = -Math.PI / 4 + rnd(-0.1, 0.1);
    const speed = rnd(3, 8);
    this.meteors.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: rnd(70, 180),
      alpha: rnd(0.4, 0.7),
      life: 0,
      maxLife: rnd(50, 120),
    });
  }

  private spawnBigBody(): void {
    if (this.bigBodies.length >= 2) return;
    const speed = rnd(0.01, 0.05);
    const angle = rnd(-Math.PI / 6, -Math.PI / 3);
    const colors = BIG_BODY_COLORS[Math.floor(Math.random() * BIG_BODY_COLORS.length)];
    this.bigBodies.push({
      x: rnd(-300, this.W),
      y: this.H + 300,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: rnd(80, 200),
      alpha: rnd(0.05, 0.15),
      color: colors.base,
      detailColor: colors.detail,
      angle: rnd(0, Math.PI * 2),
      rotSpeed: rnd(0.0001, 0.0005),
    });
  }

  private drawFluidShape(
    x: number,
    y: number,
    alpha: number,
    scale: number,
    color: string,
    type: number,
    angle: number
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = `rgba(${color}, ${alpha})`;
    ctx.beginPath();
    if (type === 0) ctx.arc(0, 0, 8, 0, Math.PI * 2);
    else if (type === 1) ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
    else if (type === 2) {
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, 0);
      ctx.lineTo(-6, 6);
      ctx.closePath();
    } else if (type === 3) ctx.rect(-5, -5, 10, 10);
    else {
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  private drawPlanet(p: BigBody): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.r * 0.3, p.r * 0.2, p.r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.detailColor}, ${p.alpha * 0.8})`;
    ctx.fill();
    ctx.restore();
  }

  private tick = (): void => {
    this.rafId = requestAnimationFrame(this.tick);
    this.frame++;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    if (this.frame % 800 === 0 && Math.random() > 0.6) this.spawnBigBody();
    for (let i = this.bigBodies.length - 1; i >= 0; i--) {
      const p = this.bigBodies[i];
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.rotSpeed;
      this.drawPlanet(p);
      if (p.x > this.W + p.r * 2 || p.y < -p.r * 2) this.bigBodies.splice(i, 1);
    }

    for (const s of this.stars) {
      s.x += Math.sin(this.frame * 0.001 + s.twinkleDelta) * 0.2;
      s.y -= s.vy;
      if (s.y < -10) {
        s.y = this.H + 10;
        s.x = rnd(0, this.W);
      }
      if (s.x > this.W + 10) s.x = -10;
      else if (s.x < -10) s.x = this.W + 10;

      s.twinkleDelta += s.twinkleSpeed;
      const a = s.alpha + Math.sin(s.twinkleDelta) * 0.3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.color}, ${Math.max(0.05, a)})`;
      ctx.fill();
    }

    for (const obj of this.fluidObjs) {
      obj.x += obj.vx;
      obj.y += obj.vy;
      obj.fluidOffset += obj.fluidSpeed;

      const fluidX = obj.x + Math.sin(obj.fluidOffset) * 20 * obj.scale;
      const fluidY = obj.y + Math.cos(obj.fluidOffset * 0.8) * 10 * obj.scale;
      obj.angle = Math.atan2(
        obj.vy + Math.cos(obj.fluidOffset) * 0.2,
        obj.vx + Math.sin(obj.fluidOffset) * 0.2
      );

      if (obj.x > this.W + 150 || obj.y < -150) {
        obj.x = rnd(-250, this.W);
        obj.y = this.H + 250;
        if (obj.x > this.W) obj.x = rnd(-150, this.W);
      }
      this.drawFluidShape(fluidX, fluidY, obj.alpha, obj.scale, obj.color, obj.type, obj.angle);
    }

    if (this.frame % 200 === 0 && Math.random() > 0.4) this.spawnMeteor();
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life++;
      const progress = m.life / m.maxLife;
      const a = m.alpha * (1 - progress);
      const angle = Math.atan2(m.vy, m.vx);
      const tailX = m.x - Math.cos(angle) * m.len * (1 - progress * 0.5);
      const tailY = m.y - Math.sin(angle) * m.len * (1 - progress * 0.5);
      const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      grad.addColorStop(0, 'rgba(186, 230, 253, 0)');
      grad.addColorStop(1, `rgba(186, 230, 253, ${a})`);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      if (m.life >= m.maxLife || m.x > this.W + 200 || m.y < -200) this.meteors.splice(i, 1);
    }
  };
}
