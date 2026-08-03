// Ctrl+Z 충전소 — 떠다니는 Ctrl+Z를 손으로 모아 에너지를 채운다.
//
// 그러다 갑자기 "저번 버전이 더 좋은 것 같아요."가 도착하면 모아 둔 Ctrl+Z가
// 한꺼번에 소모된다. 화면 좌표(미러 해제)에서 계산하고 그린다.

import { ac, fxOut } from "./audio.js";
import { sx, sy, len } from "./view.js";

const FONT = `"Pretendard Variable", "Pretendard", -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const CAP = 12;   // 에너지 칸 수

/* ── 소리 ────────────────────────────────────────────── */

/** 하나 주울 때 — 모을수록 음이 높아진다 */
function blip(n) {
  try {
    const a = ac();
    const t = a.currentTime;
    const osc = a.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440 + n * 42, t);
    osc.frequency.exponentialRampToValueAtTime(880 + n * 60, t + 0.07);
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(gain).connect(fxOut());
    osc.start(t);
    osc.stop(t + 0.16);
  } catch { /* 소리는 실패해도 진행에 영향 없음 */ }
}

/** 메시지 도착 — 두 번 울리는 알림음 */
function ding() {
  try {
    const a = ac();
    const t = a.currentTime;
    [[1174.7, 0], [1567.98, 0.12]].forEach(([f, at]) => {
      const osc = a.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const gain = a.createGain();
      gain.gain.setValueAtTime(0.0001, t + at);
      gain.gain.exponentialRampToValueAtTime(0.2, t + at + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.34);
      osc.connect(gain).connect(fxOut());
      osc.start(t + at);
      osc.stop(t + at + 0.38);
    });
  } catch { /* 무시 */ }
}

/** 에너지가 빠져나가는 소리 — 길게 내려앉는다 */
function drainTone() {
  try {
    const a = ac();
    const t = a.currentTime;
    const osc = a.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(760, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 1.1);
    const filter = a.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1600;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    osc.connect(filter).connect(gain).connect(fxOut());
    osc.start(t);
    osc.stop(t + 1.25);
  } catch { /* 무시 */ }
}

/* ── 손 ──────────────────────────────────────────────── */

/** 검지 끝과 닿는 범위 (화면 좌표)
 *
 *  손바닥 전체로 훑으면 너무 쉽게 쓸어 담긴다. 검지 하나로 콕 집어야
 *  모으는 맛이 난다. 범위는 손 크기를 따라가므로 멀리 서면 좁아진다. */
export function tipsOf(handResult, W, H) {
  const out = [];
  for (const lm of (handResult?.landmarks ?? []).slice(0, 2)) {
    const p = lm[8];   // 검지 끝
    if (!p) continue;
    const size = len(Math.hypot((lm[9].x - lm[0].x) * W, (lm[9].y - lm[0].y) * H));
    if (!size) continue;
    out.push({ x: sx(p.x * W, W), y: sy(p.y * H, H), r: size * 0.22 });
  }
  return out;
}

/* ── 그리기 ──────────────────────────────────────────── */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 떠다니는 Ctrl+Z 키캡 */
function drawKey(ctx, k, t) {
  const w = k.r * 2.6, h = k.r * 1.5;
  const x = k.x - w / 2, y = k.y - h / 2;
  const bob = Math.sin(t / 420 + k.seed) * k.r * 0.12;

  ctx.save();
  ctx.translate(0, bob);
  ctx.globalAlpha = k.fade;

  ctx.shadowColor = "rgba(34,211,238,0.55)";
  ctx.shadowBlur = k.r * (0.8 + 0.25 * Math.sin(t / 300 + k.seed));

  // 키캡 옆면
  ctx.fillStyle = "#0f3b46";
  roundRect(ctx, x, y + h * 0.12, w, h, h * 0.24);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 윗면
  const top = ctx.createLinearGradient(0, y, 0, y + h);
  top.addColorStop(0, "#e8fbff");
  top.addColorStop(1, "#a5eaf5");
  ctx.fillStyle = top;
  roundRect(ctx, x, y, w, h, h * 0.24);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = Math.max(1, h * 0.045);
  roundRect(ctx, x + h * 0.08, y + h * 0.08, w - h * 0.16, h - h * 0.16, h * 0.2);
  ctx.stroke();

  ctx.font = `700 ${h * 0.44}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#0b3541";
  ctx.fillText("Ctrl+Z", k.x, k.y + h * 0.03);
  ctx.restore();
}

/** 검지 끝이 닿는 자리 */
function drawTip(ctx, p, t) {
  ctx.save();
  const pulse = 1 + Math.sin(t / 300) * 0.07;

  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.4);
  g.addColorStop(0, "rgba(103,232,249,0.34)");
  g.addColorStop(1, "rgba(34,211,238,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(103,232,249,0.9)";
  ctx.lineWidth = Math.max(1.2, p.r * 0.16);
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(230,253,255,0.95)";
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 에너지 칸 — 채워질수록 색이 짙어진다 */
function drawEnergy(ctx, W, H, charge, shownCharge, t, draining) {
  const bw = Math.min(W * 0.5, H * 0.95);
  const cellGap = bw * 0.012;
  const cw = (bw - cellGap * (CAP - 1)) / CAP;
  const ch = H * 0.038;
  const bx = (W - bw) / 2;
  const by = H * 0.78;

  ctx.save();
  // 배터리 껍데기
  ctx.fillStyle = "rgba(6,12,18,0.5)";
  roundRect(ctx, bx - ch * 0.35, by - ch * 0.35, bw + ch * 0.7, ch + ch * 0.7, ch * 0.4);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = Math.max(1, ch * 0.07);
  roundRect(ctx, bx - ch * 0.35, by - ch * 0.35, bw + ch * 0.7, ch + ch * 0.7, ch * 0.4);
  ctx.stroke();
  // 배터리 꼭지
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  roundRect(ctx, bx + bw + ch * 0.45, by + ch * 0.22, ch * 0.3, ch * 0.56, ch * 0.12);
  ctx.fill();

  for (let i = 0; i < CAP; i++) {
    const x = bx + i * (cw + cellGap);
    const on = i < shownCharge;
    if (on) {
      const hue = draining ? 0 : 190 - (i / CAP) * 70;
      const g = ctx.createLinearGradient(0, by, 0, by + ch);
      g.addColorStop(0, `hsl(${hue} 92% 72%)`);
      g.addColorStop(1, `hsl(${hue} 88% 52%)`);
      ctx.fillStyle = g;
      ctx.shadowColor = `hsla(${hue}, 92%, 62%, 0.8)`;
      ctx.shadowBlur = ch * 0.5;
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.shadowBlur = 0;
    }
    roundRect(ctx, x, by, cw, ch, ch * 0.22);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 칸 아래 글자
  const fs = Math.round(H * 0.04);
  ctx.font = `600 ${fs}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = fs * 0.5;
  ctx.fillStyle = draining ? "#fca5a5" : charge >= CAP ? "#86efac" : "#a5f3fc";
  const line = draining ? "Ctrl+Z 전부 소모됨"
    : charge >= CAP ? "충전 완료 — 무엇이든 되돌릴 수 있습니다"
    : `충전 ${charge} / ${CAP}`;
  ctx.fillText(line, W / 2, by + ch * 1.9);
  ctx.restore();
}

/** 클라이언트 메시지 — 타이핑하다 문장이 뜬다 */
function drawMessage(ctx, W, H, age, k) {
  const w = Math.min(W * 0.56, H * 0.98);
  const pad = w * 0.055;
  const h = w * 0.3;
  const x = (W - w) / 2;
  const y = H * 0.34;
  const typing = age < 900;

  ctx.save();
  ctx.globalAlpha = clamp(k, 0, 1);
  const rise = (1 - clamp(k, 0, 1)) * H * 0.03;
  ctx.translate(0, rise);

  // 보낸 사람
  const av = h * 0.3;
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.arc(x + av * 0.7, y + av * 0.7, av * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#06232a";
  ctx.font = `800 ${av * 0.62}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("클", x + av * 0.7, y + av * 0.72);

  ctx.textAlign = "left";
  ctx.font = `600 ${h * 0.15}px ${FONT}`;
  ctx.fillStyle = "#e8ecf1";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = h * 0.12;
  ctx.fillText("클라이언트", x + av * 1.6, y + av * 0.5);
  ctx.font = `400 ${h * 0.12}px ${FONT}`;
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("방금", x + av * 1.6 + ctx.measureText("클라이언트  ").width * 1.35, y + av * 0.52);
  ctx.shadowBlur = 0;

  // 말풍선
  const by = y + av * 1.15;
  const bh = h * 0.62;
  const bw = typing ? w * 0.24 : w;
  ctx.fillStyle = "#f6f8fb";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = h * 0.2;
  ctx.shadowOffsetY = h * 0.04;
  roundRect(ctx, x, by, bw, bh, bh * 0.3);
  ctx.fill();
  // 말풍선 꼬리
  ctx.beginPath();
  ctx.moveTo(x + bh * 0.1, by + bh * 0.22);
  ctx.lineTo(x - bh * 0.22, by + bh * 0.08);
  ctx.lineTo(x + bh * 0.3, by + bh * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (typing) {
    // 점 세 개가 차례로 커진다
    for (let i = 0; i < 3; i++) {
      const s = 0.6 + 0.4 * Math.sin(age / 160 - i * 0.9);
      ctx.fillStyle = `rgba(100,116,139,${0.45 + 0.4 * s})`;
      ctx.beginPath();
      ctx.arc(x + bw * (0.3 + i * 0.2), by + bh / 2, bh * 0.09 * (0.8 + s * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#111827";
    ctx.font = `600 ${bh * 0.34}px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.fillText("저번 버전이 더 좋은 것 같아요.", x + pad, by + bh / 2);
  }
  ctx.restore();
}

/* ── 작품 ────────────────────────────────────────────── */

const TYPING_MS = 900;     // 점 세 개가 뜨는 시간
const MESSAGE_MS = 3400;   // 메시지가 떠 있는 시간

export class UndoStation {
  constructor() {
    this.reset();
  }

  reset() {
    this.keys = [];
    this.charge = 0;        // 모아 둔 Ctrl+Z
    this.shown = 0;         // 화면에 켜진 칸 (소모될 때 하나씩 꺼진다)
    this.total = 0;         // 지금까지 모은 수
    this.wipes = 0;         // 전부 날아간 횟수
    this.state = "collect"; // collect | message
    this.msgAt = 0;
    this.doomAt = 5 + Math.floor(rnd(0, 6));   // 이번엔 몇 개째에 메시지가 올지
    this.drainAcc = 0;
    this.spawnAcc = 0;
    this.sparks = [];
    this.last = 0;
  }

  spawn(W, H) {
    const r = Math.min(W, H) * rnd(0.05, 0.07);
    const edge = (Math.random() * 4) | 0;
    const pos = [
      { x: rnd(W * 0.1, W * 0.9), y: -r * 2 },
      { x: W + r * 3, y: rnd(H * 0.15, H * 0.7) },
      { x: rnd(W * 0.1, W * 0.9), y: H * 0.72 + r * 2 },
      { x: -r * 3, y: rnd(H * 0.15, H * 0.7) },
    ][edge];

    // 화면 가운데 쪽으로 느긋하게 흘러간다
    const a = Math.atan2(H * 0.45 - pos.y, W / 2 - pos.x) + rnd(-0.5, 0.5);
    const speed = Math.min(W, H) * rnd(0.055, 0.1);
    this.keys.push({
      ...pos, r,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      seed: rnd(0, 6.28),
      fade: 0,
      taken: 0,
    });
  }

  update(dt, W, H, tips, t) {
    const sec = dt / 1000;

    // 메시지가 떠 있는 동안엔 칸이 0.11초에 하나씩 꺼진다
    if (this.state === "message") {
      const age = t - this.msgAt;
      if (age > TYPING_MS && this.shown > 0) {
        this.drainAcc += dt;
        while (this.drainAcc > 110 && this.shown > 0) {
          this.drainAcc -= 110;
          this.shown--;
          this.burst(W, H);
        }
      }
      if (age > MESSAGE_MS) {
        this.state = "collect";
        this.charge = 0;
        this.shown = 0;
        this.drainAcc = 0;
        this.doomAt = 5 + Math.floor(rnd(0, 6));
      }
      this.updateSparks(sec);
      return;
    }

    // 늘 몇 개쯤은 떠 있게 한다
    this.spawnAcc += dt;
    if (this.keys.length < 5 && this.spawnAcc > 700) {
      this.spawnAcc = 0;
      this.spawn(W, H);
    }

    const margin = Math.min(W, H) * 0.25;
    for (let i = this.keys.length - 1; i >= 0; i--) {
      const k = this.keys[i];
      k.fade = Math.min(1, k.fade + sec * 2.5);

      // 검지 끝이 닿으면 빨려 들어간다
      let caught = false;
      for (const p of tips) {
        if (Math.hypot(k.x - p.x, k.y - p.y) < p.r + k.r * 0.8) { caught = true; break; }
      }
      if (caught) {
        this.keys.splice(i, 1);
        this.collect(k, t);
        continue;
      }

      k.x += k.vx * sec;
      k.y += k.vy * sec;

      // 충전 칸 위로는 내려오지 않는다 (글자가 가려진다)
      const floor = H * 0.7;
      if (k.y > floor) {
        k.y = floor;
        k.vy = -Math.abs(k.vy);
      }

      // 너무 멀리 흘러가면 사라진다
      if (k.x < -margin || k.x > W + margin || k.y < -margin || k.y > H + margin) {
        this.keys.splice(i, 1);
      }
    }

    this.updateSparks(sec);
  }

  collect(k, t) {
    this.charge = Math.min(CAP, this.charge + 1);
    this.shown = this.charge;
    this.total++;
    blip(this.charge);

    for (let i = 0; i < 8; i++) {
      const a = rnd(0, Math.PI * 2);
      const sp = rnd(0.3, 1) * k.r * 6;
      this.sparks.push({
        x: k.x, y: k.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: k.r * rnd(0.06, 0.13),
        life: rnd(0.25, 0.5), max: 0.5,
        hue: 190,
      });
    }

    // 갑자기 — 이만큼 모으면 메시지가 온다. 몇 개째일지는 매번 다르다.
    if (this.charge >= this.doomAt) {
      this.state = "message";
      this.msgAt = t;
      this.drainAcc = 0;
      this.wipes++;
      this.keys.length = 0;
      ding();
      setTimeout(drainTone, TYPING_MS);
    }
  }

  /** 칸이 꺼질 때 튀는 불꽃 */
  burst(W, H) {
    const bw = Math.min(W * 0.5, H * 0.95);
    const x = (W - bw) / 2 + (bw / CAP) * (this.shown + 0.5);
    const y = H * 0.78;
    for (let i = 0; i < 6; i++) {
      this.sparks.push({
        x, y,
        vx: rnd(-1, 1) * W * 0.06,
        vy: rnd(-0.2, 0.5) * H * 0.25,
        r: Math.min(W, H) * rnd(0.004, 0.009),
        life: rnd(0.3, 0.7), max: 0.7,
        hue: 0,
      });
    }
  }

  updateSparks(sec) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= sec;
      if (s.life <= 0) { this.sparks.splice(i, 1); continue; }
      s.x += s.vx * sec;
      s.y += s.vy * sec;
      s.vx *= 0.94;
      s.vy = s.vy * 0.94 + 240 * sec;
    }
  }

  draw(ctx, video, W, H, handResult, t) {
    ctx.drawImage(video, 0, 0, W, H);

    const dt = Math.min(64, this.last ? t - this.last : 16);
    this.last = t;

    const tips = tipsOf(handResult, W, H);
    this.update(dt, W, H, tips, t);

    // 이후로는 미러를 풀고 화면 좌표에서 그린다 (글자가 뒤집히지 않도록)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    for (const p of tips) drawTip(ctx, p, t);
    for (const k of this.keys) drawKey(ctx, k, t);

    for (const s of this.sparks) {
      ctx.globalAlpha = clamp(s.life / s.max, 0, 1);
      ctx.fillStyle = s.hue === 0 ? "#fca5a5" : "#a5f3fc";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const draining = this.state === "message" && t - this.msgAt > TYPING_MS;
    drawEnergy(ctx, W, H, draining ? this.shown : this.charge, this.shown, t, draining);

    if (this.state === "message") {
      const age = t - this.msgAt;
      drawMessage(ctx, W, H, age, age / 200);
    }

    this.drawScore(ctx, W, H);
    ctx.restore();
  }

  drawScore(ctx, W, H) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // 제목 — 다른 작품과 같은 방식이다
    const ts = Math.round(H * 0.06);
    const ty = H * 0.045;
    const title = "Ctrl+Z 충전소";
    ctx.font = `600 ${ts}px ${FONT}`;
    try { ctx.letterSpacing = `${ts * -0.01}px`; } catch { /* 무시 */ }

    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = ts * 0.5;
    ctx.shadowOffsetY = ts * 0.06;
    ctx.lineJoin = "round";
    ctx.lineWidth = ts * 0.07;
    ctx.strokeStyle = "rgba(6,18,28,0.55)";
    ctx.strokeText(title, W / 2, ty);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const cool = ctx.createLinearGradient(0, ty, 0, ty + ts);
    cool.addColorStop(0, "#f2fbff");
    cool.addColorStop(1, "#8ed8ef");
    ctx.fillStyle = cool;
    ctx.fillText(title, W / 2, ty);
    try { ctx.letterSpacing = "0px"; } catch { /* 무시 */ }

    const fs = Math.round(H * 0.048);
    ctx.font = `700 ${fs}px ${FONT}`;
    ctx.lineWidth = fs * 0.14;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    const label = `모은 Ctrl+Z ${this.total}   날아감 ${this.wipes}`;
    ctx.strokeText(label, W / 2, H * 0.15);
    ctx.fillStyle = this.state === "message" ? "#fca5a5" : "#7dd3fc";
    ctx.fillText(label, W / 2, H * 0.15);
    ctx.restore();
  }
}
