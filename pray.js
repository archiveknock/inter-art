// 렌더링 성공 기도하기 — 두 손을 모으면 렌더링이 진행된다.
//
// 99%에서 한참을 머무르다 기어이 에러가 난다. 기도는 통하지 않는다.
// 화면 좌표(미러 해제)에서 계산하고 그린다. 손 좌표는 들여올 때 한 번만 뒤집는다.

import { ac, fxOut } from "./audio.js";
import { sx, sy, len } from "./view.js";

const FONT = `"Pretendard Variable", "Pretendard", -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ── 소리 ────────────────────────────────────────────── */

/** 기도가 시작될 때의 맑은 종소리 */
function bell() {
  try {
    const a = ac();
    const t = a.currentTime;
    [[880, 0.5], [1318.5, 0.22], [1760, 0.1]].forEach(([f, amp]) => {
      const osc = a.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const gain = a.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(amp * 0.4, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      osc.connect(gain).connect(fxOut());
      osc.start(t);
      osc.stop(t + 1.7);
    });
  } catch { /* 소리는 실패해도 진행에 영향 없음 */ }
}

/** 진행률이 한 칸 오를 때의 작은 신호음 */
function tick(p) {
  try {
    const a = ac();
    const t = a.currentTime;
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 520 + p * 6;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(gain).connect(fxOut());
    osc.start(t);
    osc.stop(t + 0.09);
  } catch { /* 무시 */ }
}

/** 성공 — 올라가는 세 음 */
function fanfare() {
  try {
    const a = ac();
    const t = a.currentTime;
    [[659.25, 0], [830.61, 0.1], [1046.5, 0.2]].forEach(([f, at]) => {
      const osc = a.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f;
      const gain = a.createGain();
      gain.gain.setValueAtTime(0.0001, t + at);
      gain.gain.exponentialRampToValueAtTime(0.24, t + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.7);
      osc.connect(gain).connect(fxOut());
      osc.start(t + at);
      osc.stop(t + at + 0.75);
    });
  } catch { /* 무시 */ }
}

/** 에러 — 낮게 깨지는 소리 */
function crash() {
  try {
    const a = ac();
    const t = a.currentTime;

    // 잡음 한 방
    const dur = 0.5;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length) ** 2;
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    const filter = a.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const ng = a.createGain();
    ng.gain.value = 0.32;
    src.connect(filter).connect(ng).connect(fxOut());
    src.start(t);

    // 아래로 미끄러지는 음
    const osc = a.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.6);
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(gain).connect(fxOut());
    osc.start(t);
    osc.stop(t + 0.75);
  } catch { /* 무시 */ }
}

/* ── 손 모으기 판정 ──────────────────────────────────── */

const PALM = [0, 5, 9, 13, 17];

function handOf(lm, W, H) {
  let cx = 0, cy = 0;
  for (const i of PALM) { cx += sx(lm[i].x * W, W); cy += sy(lm[i].y * H, H); }
  cx /= PALM.length;
  cy /= PALM.length;

  const size = len(Math.hypot((lm[9].x - lm[0].x) * W, (lm[9].y - lm[0].y) * H));
  const wrist = { x: sx(lm[0].x * W, W), y: sy(lm[0].y * H, H) };
  const mid = { x: sx(lm[12].x * W, W), y: sy(lm[12].y * H, H) };

  // 손끝이 손목보다 뚜렷이 위에 있어야 세운 손이다
  const upright = mid.y < wrist.y - size * 0.5;
  // 주먹이면 기도가 아니다
  const open = Math.hypot(mid.x - wrist.x, mid.y - wrist.y) > size * 1.4;

  return { cx, cy, size, wrist, mid, upright, open };
}

/** 두 손을 모았는가 — 모았다면 그 자리를 돌려준다 */
export function prayerOf(handResult, W, H) {
  const lms = (handResult?.landmarks ?? []).slice(0, 2);
  if (lms.length < 2) return null;

  const a = handOf(lms[0], W, H);
  const b = handOf(lms[1], W, H);
  if (!a.upright || !b.upright || !a.open || !b.open) return null;

  const size = Math.max(a.size, b.size);
  const gap = Math.hypot(a.cx - b.cx, a.cy - b.cy);
  if (gap > size * 1.5) return null;   // 두 손이 맞닿아 있어야 한다

  return {
    x: (a.cx + b.cx) / 2,
    y: (a.cy + b.cy) / 2,
    tip: { x: (a.mid.x + b.mid.x) / 2, y: (a.mid.y + b.mid.y) / 2 },
    size,
  };
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

/** 모은 손을 감싸는 후광과 빛줄기 */
function drawHalo(ctx, p, t, power) {
  const R = p.size * 2.6;
  ctx.save();
  ctx.translate(p.x, p.y);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  glow.addColorStop(0, `rgba(255,247,214,${0.42 * power})`);
  glow.addColorStop(0.45, `rgba(253,224,120,${0.2 * power})`);
  glow.addColorStop(1, "rgba(253,224,120,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();

  // 천천히 도는 빛줄기
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 10; i++) {
    const a = t / 2600 + (i * Math.PI * 2) / 10;
    const long = R * (1.15 + 0.35 * Math.sin(t / 420 + i));
    ctx.save();
    ctx.rotate(a);
    const ray = ctx.createLinearGradient(0, 0, 0, -long);
    ray.addColorStop(0, `rgba(255,240,190,${0.16 * power})`);
    ray.addColorStop(1, "rgba(255,240,190,0)");
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(-p.size * 0.16, 0);
    ctx.lineTo(p.size * 0.16, 0);
    ctx.lineTo(0, -long);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** 진행 막대와 퍼센트 */
function drawProgress(ctx, W, H, pct, state, t) {
  const bw = Math.min(W * 0.56, H * 1.1);
  const bh = Math.max(8, H * 0.022);
  const bx = (W - bw) / 2;
  const by = H * 0.72;

  // 큰 숫자
  const fs = Math.round(H * 0.19);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${fs}px ${FONT}`;

  const text = `${Math.floor(pct)}%`;
  const fail = state === "error";
  const done = state === "done";
  ctx.shadowColor = fail ? "rgba(220,38,38,0.75)"
    : done ? "rgba(22,163,74,0.7)" : "rgba(8,20,30,0.7)";
  ctx.shadowBlur = fs * 0.28;
  const grad = ctx.createLinearGradient(0, by - fs * 0.95, 0, by - fs * 0.1);
  if (fail) {
    grad.addColorStop(0, "#fecaca");
    grad.addColorStop(1, "#ef4444");
  } else if (done) {
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, "#4ade80");
  } else {
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, "#67e8f9");
  }
  ctx.fillStyle = grad;
  ctx.fillText(text, W / 2, by - H * 0.055);
  ctx.shadowBlur = 0;

  // 막대
  ctx.fillStyle = "rgba(6,10,16,0.55)";
  roundRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.fill();

  const fillW = (bw * clamp(pct, 0, 100)) / 100;
  if (fillW > 1) {
    const bar = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    if (fail) {
      bar.addColorStop(0, "#b91c1c");
      bar.addColorStop(1, "#ef4444");
    } else if (done) {
      bar.addColorStop(0, "#16a34a");
      bar.addColorStop(1, "#4ade80");
    } else {
      bar.addColorStop(0, "#22d3ee");
      bar.addColorStop(1, "#a78bfa");
    }
    ctx.fillStyle = bar;
    roundRect(ctx, bx, by, fillW, bh, bh / 2);
    ctx.fill();

    // 진행 중엔 막대 끝이 은은하게 뛴다
    if (state === "render" || state === "stuck") {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.25 * Math.sin(t / 220)})`;
      ctx.beginPath();
      ctx.arc(bx + fillW, by + bh / 2, bh * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.stroke();

  // 상태 한 줄
  const ss = Math.round(H * 0.042);
  ctx.font = `600 ${ss}px ${FONT}`;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = ss * 0.5;

  const dots = ".".repeat(1 + (Math.floor(t / 420) % 3));
  const STUCK = [
    "거의 다 됐습니다",
    "마무리 중",
    "조금만 더",
    "샘플링 정리 중",
    "곧 끝납니다",
  ];
  let line, color;
  if (state === "idle") {
    line = "두 손을 모아 기도하세요";
    color = "#cbd5e1";
  } else if (state === "render") {
    line = `렌더링 중${dots}`;
    color = "#a5f3fc";
  } else if (state === "stuck") {
    line = `${STUCK[Math.floor(t / 2600) % STUCK.length]}${dots}`;
    color = "#fde68a";
  } else if (state === "done") {
    line = "렌더링 완료";
    color = "#86efac";
  } else {
    line = "렌더링 실패";
    color = "#fca5a5";
  }
  ctx.fillStyle = color;
  ctx.fillText(line, W / 2, by + bh * 2.2);
  ctx.restore();
}

/** 결과 창 — 실패이거나 완료이거나 */
function drawResult(ctx, W, H, t, k, code, ok) {
  const w = Math.min(W * 0.62, H * 1.05);
  const h = w * 0.4;
  const x = (W - w) / 2, y = (H - h) / 2;
  const bar = h * 0.24;

  ctx.save();
  ctx.globalAlpha = clamp(k, 0, 1);
  const s = 0.94 + 0.06 * clamp(k, 0, 1);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(s, s);
  ctx.translate(-(x + w / 2), -(y + h / 2));

  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = h * 0.3;
  ctx.shadowOffsetY = h * 0.06;
  ctx.fillStyle = "#f4f6f9";
  roundRect(ctx, x, y, w, h, h * 0.07);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.save();
  roundRect(ctx, x, y, w, h, h * 0.07);
  ctx.clip();
  ctx.fillStyle = ok ? "#dcfce7" : "#fee2e2";
  ctx.fillRect(x, y, w, bar);
  ctx.restore();

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `600 ${bar * 0.44}px ${FONT}`;
  ctx.fillStyle = ok ? "#166534" : "#991b1b";
  ctx.fillText(ok ? "렌더러 — 완료" : "렌더러 — 응답 중지됨", x + w * 0.035, y + bar / 2);

  const cx = x + w * 0.13, cy = y + bar + (h - bar) * 0.42, r = h * 0.12;
  if (ok) {
    // 초록 동그라미 안의 체크
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = r * 0.28;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.38);
    ctx.lineTo(cx + r * 0.46, cy - r * 0.36);
    ctx.stroke();
    ctx.lineCap = "butt";
  } else {
    // 느낌표 세모
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.92, cy + r * 0.7);
    ctx.lineTo(cx - r * 0.92, cy + r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - r * 0.09, cy - r * 0.42, r * 0.18, r * 0.66);
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.44, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#1f2937";
  ctx.font = `600 ${h * 0.125}px ${FONT}`;
  ctx.fillText(ok ? "렌더링을 마쳤습니다" : "99%에서 오류가 발생했습니다", x + w * 0.24, cy - h * 0.055);
  ctx.font = `400 ${h * 0.1}px ${FONT}`;
  ctx.fillStyle = "#6b7280";
  ctx.fillText(ok ? "기도가 통했습니다. 출력 파일이 저장되었습니다." : code, x + w * 0.24, cy + h * 0.09);

  const bw = w * 0.24, bh = h * 0.18, by = y + h - bh - h * 0.09;
  const labels = ok ? ["확인"] : ["다시 시도", "무시"];
  labels.forEach((label, i) => {
    const bx = x + w - (bw + w * 0.035) * (labels.length - i);
    ctx.fillStyle = i === 0 && !ok ? "#ffffff" : "#f6f8fa";
    ctx.strokeStyle = "#d3d9e0";
    ctx.lineWidth = Math.max(1, h * 0.008);
    roundRect(ctx, bx, by, bw, bh, bh * 0.28);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#374151";
    ctx.font = `600 ${bh * 0.44}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(label, bx + bw / 2, by + bh / 2);
    ctx.textAlign = "left";
  });
  ctx.restore();
}

/* ── 작품 ────────────────────────────────────────────── */

const CODES = [
  "예외 코드 0xC0000005 — 액세스 위반",
  "CUDA out of memory (요청 12.0GB / 남은 0.4GB)",
  "renderer.exe 이(가) 작동을 멈추었습니다",
  "오류 -1073741819 : 알 수 없는 이유",
  "디스크 공간이 부족합니다 (남은 0바이트)",
];

// 99%에서 버티다 결국 어떻게 되는지는 그때그때 다르다.
// 대개는 에러지만, 넷에 하나쯤은 기도가 통한다.
const SUCCESS_CHANCE = 0.25;
const HOLD_MS = { error: 4200, done: 3400 };   // 결과 창이 떠 있는 시간

export class PrayRender {
  constructor() {
    this.reset();
  }

  reset() {
    this.pct = 0;
    this.state = "idle";    // idle | render | stuck | error | done
    this.stuckAt = 0;       // 99%에 닿은 시각
    this.stuckFor = 0;      // 이번엔 얼마나 끌지
    this.endAt = 0;         // 결과가 난 시각
    this.code = CODES[0];
    this.tries = 0;
    this.fails = 0;
    this.wins = 0;
    this.sparks = [];
    this.power = 0;         // 후광의 세기 (부드럽게 따라간다)
    this.shake = 0;
    this.lastTick = 0;
    this.last = 0;
  }

  update(dt, W, H, prayer, t) {
    const sec = dt / 1000;
    this.power += ((prayer ? 1 : 0) - this.power) * Math.min(1, sec * 6);

    // 결과가 떠 있는 동안에는 멈춘다
    if (this.state === "error" || this.state === "done") {
      if (this.shake > 0) this.shake -= dt;
      // 성공했을 때만 마지막 1%가 채워진다
      if (this.state === "done") this.pct = Math.min(100, this.pct + 60 * sec);
      if (t - this.endAt > HOLD_MS[this.state]) {
        this.state = "idle";
        this.pct = 0;
      }
      this.updateSparks(sec, H);
      return;
    }

    if (!prayer) {
      // 손을 풀면 진행이 스르르 흘러내린다
      this.state = "idle";
      this.pct = Math.max(0, this.pct - 9 * sec);
      this.updateSparks(sec, H);
      return;
    }

    if (this.state === "idle") {
      this.state = "render";
      this.tries++;
      this.stuckFor = rnd(5200, 9000);
      this.code = CODES[(Math.random() * CODES.length) | 0];
      bell();
    }

    // 처음엔 시원하게 오르다가 끝으로 갈수록 굼떠진다
    if (this.pct < 99) {
      const speed = this.pct < 70 ? 17 : this.pct < 90 ? 7 : 2.2;
      const before = Math.floor(this.pct);
      this.pct = Math.min(99, this.pct + speed * sec);
      if (Math.floor(this.pct) !== before && t - this.lastTick > 60) {
        this.lastTick = t;
        tick(this.pct);
      }
      if (this.pct >= 99) {
        this.state = "stuck";
        this.stuckAt = t;
      }
    } else if (this.state === "stuck" && t - this.stuckAt > this.stuckFor) {
      // 기어이 — 갑자기 판가름이 난다
      this.endAt = t;
      if (Math.random() < SUCCESS_CHANCE) {
        this.state = "done";
        this.wins++;
        fanfare();
      } else {
        this.state = "error";
        this.fails++;
        this.shake = 420;
        crash();
      }
    }

    // 기도하는 동안 빛 알갱이가 올라간다
    if (prayer && Math.random() < 0.5) {
      this.sparks.push({
        x: prayer.x + rnd(-1, 1) * prayer.size * 1.1,
        y: prayer.tip.y + rnd(-0.3, 0.3) * prayer.size,
        vy: -rnd(0.06, 0.16) * H,
        vx: rnd(-0.02, 0.02) * H,
        r: prayer.size * rnd(0.03, 0.075),
        life: rnd(0.7, 1.5),
        max: 1.5,
      });
    }
    this.updateSparks(sec, H);
  }

  updateSparks(sec, H) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= sec;
      if (s.life <= 0) { this.sparks.splice(i, 1); continue; }
      s.x += s.vx * sec;
      s.y += s.vy * sec;
      s.vy *= 0.99;
    }
  }

  draw(ctx, video, W, H, handResult, t) {
    ctx.drawImage(video, 0, 0, W, H);

    const dt = Math.min(64, this.last ? t - this.last : 16);
    this.last = t;

    const prayer = prayerOf(handResult, W, H);
    this.update(dt, W, H, prayer, t);

    // 이후로는 미러를 풀고 화면 좌표에서 그린다 (글자가 뒤집히지 않도록)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 에러가 난 순간에는 화면이 흔들린다
    if (this.shake > 0) {
      const k = this.shake / 420;
      ctx.translate(rnd(-1, 1) * H * 0.012 * k, rnd(-1, 1) * H * 0.012 * k);
    }

    if (this.power > 0.01 && prayer) drawHalo(ctx, prayer, t, this.power);

    for (const s of this.sparks) {
      ctx.globalAlpha = clamp(s.life / s.max, 0, 1) * 0.9;
      ctx.fillStyle = "#fff7d6";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 성공하면 금빛이 번지고, 실패하면 붉은 기운이 내려앉는다
    if (this.state === "done") {
      const age = t - this.endAt;
      if (age < 320) {
        ctx.fillStyle = `rgba(255,240,190,${(1 - age / 320) * 0.32})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    if (this.state === "error") {
      const age = t - this.endAt;
      if (age < 260) {
        ctx.fillStyle = `rgba(220,38,38,${(1 - age / 260) * 0.35})`;
        ctx.fillRect(0, 0, W, H);
      }
      const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      vig.addColorStop(0, "rgba(120,0,0,0)");
      vig.addColorStop(1, "rgba(120,0,0,0.45)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
    }

    drawProgress(ctx, W, H, this.pct, this.state, t);

    if (this.state === "error" || this.state === "done") {
      drawResult(ctx, W, H, t, (t - this.endAt) / 220, this.code, this.state === "done");
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
    const title = "렌더링 성공 기도하기";
    ctx.font = `600 ${ts}px ${FONT}`;
    try { ctx.letterSpacing = `${ts * -0.01}px`; } catch { /* 무시 */ }

    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = ts * 0.5;
    ctx.shadowOffsetY = ts * 0.06;
    ctx.lineJoin = "round";
    ctx.lineWidth = ts * 0.07;
    ctx.strokeStyle = "rgba(24,14,6,0.55)";
    ctx.strokeText(title, W / 2, ty);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const warm = ctx.createLinearGradient(0, ty, 0, ty + ts);
    warm.addColorStop(0, "#fff6e2");
    warm.addColorStop(1, "#f0c674");
    ctx.fillStyle = warm;
    ctx.fillText(title, W / 2, ty);
    try { ctx.letterSpacing = "0px"; } catch { /* 무시 */ }

    const fs = Math.round(H * 0.048);
    ctx.font = `700 ${fs}px ${FONT}`;
    ctx.lineWidth = fs * 0.14;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    const label = `기도 ${this.tries}   성공 ${this.wins}   실패 ${this.fails}`;
    ctx.strokeText(label, W / 2, H * 0.15);
    ctx.fillStyle = this.state === "error" ? "#fca5a5"
      : this.state === "done" ? "#86efac" : "#fde68a";
    ctx.fillText(label, W / 2, H * 0.15);
    ctx.restore();
  }
}
