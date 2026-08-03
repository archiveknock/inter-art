// 저장 버튼 누르기 챌린지 — Save 버튼이 손가락을 피해 달아난다.
// 기어이 누르면 프로그램이 얼어붙고 "응답 없음"이 뜬다.
//
// 화면 좌표(미러 해제)에서 계산하고 그린다. 버튼과 대화상자의 글자가 뒤집히면
// 안 되기 때문이다. 손끝 좌표는 들여올 때 한 번만 뒤집는다.

import { ac, fxOut } from "./audio.js";
import { sx, sy, len } from "./view.js";

const FONT = `"Pretendard Variable", "Pretendard", -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** 핸드 트래킹 결과에서 검지 끝 좌표(화면 픽셀)를 뽑아낸다 (양손이면 2개) */
export function fingertipsOf(result, W, H) {
  const tips = [];
  for (const lm of result?.landmarks ?? []) {
    const p = lm[8];   // 검지 끝
    if (p) tips.push({ x: sx(p.x * W, W), y: sy(p.y * H, H) });
  }
  return tips;
}

/* ── 소리 ────────────────────────────────────────────── */

/** 버튼을 누르는 짧은 딸깍 */
function click() {
  try {
    const a = ac();
    const t = a.currentTime;
    const osc = a.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.03);
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(gain).connect(fxOut());
    osc.start(t);
    osc.stop(t + 0.08);
  } catch { /* 소리는 실패해도 진행에 영향 없음 */ }
}

/** 응답 없음 — 두 음이 내려앉는 시스템 오류음 */
function errorTone() {
  try {
    const a = ac();
    const t = a.currentTime;
    [[622.25, 0], [466.16, 0.16]].forEach(([f, at]) => {
      const osc = a.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f;
      const gain = a.createGain();
      gain.gain.setValueAtTime(0.0001, t + at);
      gain.gain.exponentialRampToValueAtTime(0.22, t + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.42);
      osc.connect(gain).connect(fxOut());
      osc.start(t + at);
      osc.stop(t + at + 0.46);
    });
  } catch { /* 무시 */ }
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

/** Save 버튼 — 눌리면 살짝 가라앉고, 얼어붙으면 잿빛이 된다 */
function drawButton(btn, ctx, { pressed = false, dead = false } = {}) {
  const { x, y, w, h } = btn;
  const r = h * 0.28;
  const sink = pressed ? h * 0.06 : 0;

  ctx.save();
  ctx.translate(0, sink);

  if (!dead) {
    ctx.shadowColor = "rgba(6, 20, 40, 0.55)";
    ctx.shadowBlur = h * (pressed ? 0.2 : 0.5);
    ctx.shadowOffsetY = h * (pressed ? 0.05 : 0.16);
  }

  const face = ctx.createLinearGradient(0, y, 0, y + h);
  if (dead) {
    face.addColorStop(0, "#9aa3ad");
    face.addColorStop(1, "#767f89");
  } else if (pressed) {
    face.addColorStop(0, "#0ea5b7");
    face.addColorStop(1, "#0891b2");
  } else {
    face.addColorStop(0, "#38dcf0");
    face.addColorStop(1, "#0ea5c4");
  }
  ctx.fillStyle = face;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 위쪽 반사광
  if (!dead) {
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    roundRect(ctx, x + w * 0.04, y + h * 0.08, w * 0.92, h * 0.36, r * 0.7);
    ctx.fill();
  }

  ctx.strokeStyle = dead ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.55)";
  ctx.lineWidth = Math.max(1, h * 0.035);
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();

  const fs = h * 0.42;
  ctx.font = `700 ${fs}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = dead ? "#e8ecf1" : "#05242c";
  ctx.fillText("💾  Save", x + w / 2, y + h / 2 + fs * 0.04);
  ctx.restore();
}

/** 마우스 화살표 — 손끝이 곧 커서다 */
function drawCursor(ctx, x, y, s, busy, t) {
  ctx.save();
  ctx.translate(x, y);

  if (busy) {
    // 기다림 표시 — 파란 고리가 돈다
    const r = s * 0.85;
    for (let i = 0; i < 3; i++) {
      const a = t / 160 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, s * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56,189,248,${0.9 - i * 0.22})`;
      ctx.fill();
    }
  }

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, s * 1.7);
  ctx.lineTo(s * 0.42, s * 1.28);
  ctx.lineTo(s * 0.72, s * 1.95);
  ctx.lineTo(s * 1.0, s * 1.8);
  ctx.lineTo(s * 0.71, s * 1.16);
  ctx.lineTo(s * 1.2, s * 1.1);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(10,14,20,0.9)";
  ctx.lineWidth = Math.max(1.5, s * 0.13);
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

/** 응답 없음 대화상자 */
function drawDialog(ctx, W, H, box, t, k) {
  const { x, y, w, h } = box;

  ctx.save();
  // 뜰 때 살짝 커지며 나타난다
  ctx.globalAlpha = clamp(k, 0, 1);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(0.94 + 0.06 * clamp(k, 0, 1), 0.94 + 0.06 * clamp(k, 0, 1));
  ctx.translate(-(x + w / 2), -(y + h / 2));

  const bar = h * 0.24;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = h * 0.3;
  ctx.shadowOffsetY = h * 0.06;
  ctx.fillStyle = "#eef1f5";
  roundRect(ctx, x, y, w, h, h * 0.07);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 제목 표시줄
  ctx.save();
  roundRect(ctx, x, y, w, h, h * 0.07);
  ctx.clip();
  ctx.fillStyle = "#dfe4ea";
  ctx.fillRect(x, y, w, bar);
  ctx.restore();

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `600 ${bar * 0.44}px ${FONT}`;
  ctx.fillStyle = "#39414d";
  ctx.fillText("저장 — 응답 없음", x + w * 0.035, y + bar / 2);

  // 닫기 단추 (눌리지 않는다)
  ctx.font = `600 ${bar * 0.42}px ${FONT}`;
  ctx.fillStyle = "#8a929c";
  ctx.textAlign = "right";
  ctx.fillText("✕", x + w - w * 0.035, y + bar / 2);

  // 도는 대기 표시
  const cx = x + w * 0.13, cy = y + bar + (h - bar) * 0.4, r = h * 0.11;
  ctx.lineWidth = r * 0.42;
  ctx.strokeStyle = "#c9d1da";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#0ea5c4";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, t / 190, t / 190 + 1.7);
  ctx.stroke();
  ctx.lineCap = "butt";

  ctx.textAlign = "left";
  ctx.font = `600 ${h * 0.13}px ${FONT}`;
  ctx.fillStyle = "#20262e";
  ctx.fillText("이 프로그램이 응답하지 않습니다", x + w * 0.24, cy - h * 0.06);
  ctx.font = `400 ${h * 0.105}px ${FONT}`;
  ctx.fillStyle = "#5d6570";
  ctx.fillText("저장하지 못한 작업은 사라집니다.", x + w * 0.24, cy + h * 0.1);

  // 아래 단추 두 개
  const bw = w * 0.27, bh = h * 0.18, by = y + h - bh - h * 0.09;
  const labels = ["프로그램 닫기", "기다리기"];
  labels.forEach((label, i) => {
    const bx = x + w - (bw + w * 0.035) * (2 - i) + w * 0.0;
    ctx.fillStyle = i === 0 ? "#ffffff" : "#f6f8fa";
    ctx.strokeStyle = "#c3ccd6";
    ctx.lineWidth = Math.max(1, h * 0.008);
    roundRect(ctx, bx, by, bw, bh, bh * 0.28);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#39414d";
    ctx.font = `600 ${bh * 0.44}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx + bw / 2, by + bh / 2);
  });
  ctx.restore();
}

/* ── 작품 ────────────────────────────────────────────── */

const FROZEN_MS = 2600;   // 응답 없음이 떠 있는 시간

export class SaveChallenge {
  constructor() {
    this.reset();
  }

  reset() {
    this.btn = null;
    this.frozen = 0;       // 얼어붙은 시각 (0이면 평소)
    this.hangs = 0;        // 응답 없음 횟수
    this.press = 0;        // 눌린 표시가 남아 있는 시간
    this.last = 0;
  }

  spawn(W, H) {
    const w = Math.min(W, H) * 0.26;
    const h = w * 0.38;
    this.btn = {
      w, h,
      x: rnd(W * 0.2, W * 0.8) - w / 2,
      y: rnd(H * 0.25, H * 0.75) - h / 2,
      vx: rnd(-1, 1) * W * 0.06,
      vy: rnd(-1, 1) * H * 0.06,
      turn: 0,
      nextTurn: 0,
    };
  }

  update(dt, W, H, tips, t) {
    if (!this.btn) this.spawn(W, H);
    if (this.press > 0) this.press -= dt;

    // 얼어 있는 동안에는 아무것도 움직이지 않는다
    if (this.frozen) {
      if (t - this.frozen > FROZEN_MS) {
        this.frozen = 0;
        this.spawn(W, H);
      }
      return;
    }

    const b = this.btn;
    const sec = dt / 1000;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const reach = Math.hypot(b.w, b.h) / 2;

    // 손끝이 다가오면 반대로 달아나고, 닿으면 눌린다
    let fleeX = 0, fleeY = 0, panic = 0, hit = false;
    for (const tip of tips) {
      const dx = cx - tip.x, dy = cy - tip.y;
      // 버튼은 네모라 사각형 안에 들어왔는지로 본다
      if (tip.x > b.x && tip.x < b.x + b.w && tip.y > b.y && tip.y < b.y + b.h) {
        hit = true;
        break;
      }
      const d = Math.hypot(dx, dy) || 1;
      const fleeR = reach * 3.4;
      if (d < fleeR) {
        const wgt = (1 - d / fleeR) ** 2;
        fleeX += (dx / d) * wgt;
        fleeY += (dy / d) * wgt;
        panic = Math.max(panic, wgt);
      }
    }

    if (hit) return this.hang(t);

    const base = Math.min(W, H) * 0.16;
    if (panic > 0.01) {
      // 손끝 반대 방향으로 밀린다. 가까울수록 세게.
      const speed = base * (1 + panic * 5.5);
      const norm = Math.hypot(fleeX, fleeY) || 1;
      b.vx += ((fleeX / norm) * speed - b.vx) * Math.min(1, sec * 9);
      b.vy += ((fleeY / norm) * speed - b.vy) * Math.min(1, sec * 9);
    } else {
      // 평소엔 느긋하게 떠다닌다
      b.nextTurn -= dt;
      if (b.nextTurn <= 0) {
        b.nextTurn = rnd(600, 1600);
        const a = rnd(0, Math.PI * 2);
        b.turn = a;
      }
      const drift = base * 0.35;
      b.vx += (Math.cos(b.turn) * drift - b.vx) * Math.min(1, sec * 1.6);
      b.vy += (Math.sin(b.turn) * drift - b.vy) * Math.min(1, sec * 1.6);
    }

    b.x += b.vx * sec;
    b.y += b.vy * sec;

    // 화면 밖으로는 나가지 않는다 — 벽에 닿으면 튕긴다
    const m = Math.min(W, H) * 0.02;
    if (b.x < m) { b.x = m; b.vx = Math.abs(b.vx); }
    if (b.x + b.w > W - m) { b.x = W - m - b.w; b.vx = -Math.abs(b.vx); }
    if (b.y < m) { b.y = m; b.vy = Math.abs(b.vy); }
    if (b.y + b.h > H - m) { b.y = H - m - b.h; b.vy = -Math.abs(b.vy); }
  }

  /** 눌렸다 — 곧바로 얼어붙는다 */
  hang(t) {
    this.frozen = t;
    this.hangs++;
    this.press = 260;
    this.btn.vx = 0;
    this.btn.vy = 0;
    click();
    setTimeout(errorTone, 260);
  }

  draw(ctx, video, W, H, tips, t) {
    ctx.drawImage(video, 0, 0, W, H);

    const dt = Math.min(64, this.last ? t - this.last : 16);
    this.last = t;
    this.update(dt, W, H, tips, t);

    // 이후로는 미러를 풀고 화면 좌표에서 그린다 (글자가 뒤집히지 않도록)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const age = this.frozen ? t - this.frozen : 0;
    drawButton(this.btn, ctx, {
      pressed: this.press > 0,
      dead: !!this.frozen && age > 240,
    });

    // 누른 뒤 잠깐 있다가 대화상자가 뜬다
    if (this.frozen && age > 240) {
      const w = Math.min(W * 0.62, H * 1.0);
      const h = w * 0.42;
      drawDialog(ctx, W, H, { x: (W - w) / 2, y: (H - h) / 2, w, h }, t, (age - 240) / 220);
    }

    const cur = Math.min(W, H) * 0.035;
    for (const tip of tips) drawCursor(ctx, tip.x, tip.y, cur, !!this.frozen, t);

    this.drawScore(ctx, W, H);
    ctx.restore();
  }

  drawScore(ctx, W, H) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // 제목 — 커피콩 받기와 같은 방식이다. 외곽선은 얇게 두르고 그림자로 읽힘을 잡는다.
    const ts = Math.round(H * 0.06);
    const ty = H * 0.045;
    const title = "저장 버튼 누르기 챌린지";
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

    const fs = Math.round(H * 0.05);
    ctx.font = `700 ${fs}px "Courier New", monospace`;
    ctx.lineWidth = fs * 0.14;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    const label = `SAVED 0   응답없음 ${this.hangs}`;
    ctx.strokeText(label, W / 2, H * 0.15);
    ctx.fillStyle = this.frozen ? "#fca5a5" : "#7dd3fc";
    ctx.fillText(label, W / 2, H * 0.15);
    ctx.restore();
  }
}
