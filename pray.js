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

  // 손끝이 손목보다 위에 있어야 세운 손이다. 기도하는 손은 조금 기울어지므로
  // 너무 빡빡하게 보면 맞잡고도 인식되지 않는다.
  const upright = mid.y < wrist.y - size * 0.25;
  // 주먹이면 기도가 아니다. 합장은 손가락이 붙어 곧게 서므로 손목에서 멀어진다.
  const open = Math.hypot(mid.x - wrist.x, mid.y - wrist.y) > size * 1.15;

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

  // 두 손이 맞닿아 있어야 한다. 손바닥 중심끼리는 합장을 해도 손 두께만큼
  // 떨어지므로, 손끝이 서로 가까운지를 함께 본다 — 이쪽이 훨씬 잘 잡힌다.
  const gap = Math.hypot(a.cx - b.cx, a.cy - b.cy);
  const tipGap = Math.hypot(a.mid.x - b.mid.x, a.mid.y - b.mid.y);
  if (gap > size * 2.2 || tipGap > size * 1.4) return null;

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
  glow.addColorStop(0, `rgba(255,247,214,${0.2 * power})`);
  glow.addColorStop(0.45, `rgba(253,224,120,${0.09 * power})`);
  glow.addColorStop(1, "rgba(253,224,120,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();

  // 천천히 도는 빛줄기 — 손을 가리지 않을 만큼만 옅게 둔다
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 8; i++) {
    const a = t / 2600 + (i * Math.PI * 2) / 8;
    const long = R * (1.05 + 0.25 * Math.sin(t / 420 + i));
    ctx.save();
    ctx.rotate(a);
    const ray = ctx.createLinearGradient(0, 0, 0, -long);
    ray.addColorStop(0, `rgba(255,240,190,${0.06 * power})`);
    ray.addColorStop(1, "rgba(255,240,190,0)");
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(-p.size * 0.11, 0);
    ctx.lineTo(p.size * 0.11, 0);
    ctx.lineTo(0, -long);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** 인코딩 창의 시간 표기 — 프리미어는 hh:mm:ss로 적는다 */
function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const p = (n) => String(n).padStart(2, "0");
  return `${p((s / 3600) | 0)}:${p(((s / 60) | 0) % 60)}:${p(s % 60)}`;
}

/** 남은 시간 — 인코더는 처음부터 끝까지 무언가를 보여준다.
 *
 *  99%에 닿기 전에는 진행 속도로 어림잡고, 닿은 뒤로는 기도가 정하는
 *  실제 남은 시간을 그대로 쓴다. 시작 직후에는 아직 셈할 수 없어 --를 띄운다. */
function remainOf(state, pct, left, spent) {
  if (state === "done") return "00:00:00";
  if (state === "stuck" || state === "error") return clock(left);
  if (spent < 700 || pct < 1) return "--:--:--";
  // 최근 속도로 남은 몫을 환산한다. 기도하는 동안에는 빨라지니 줄어들고,
  // 손을 놓으면 기어가는 속도가 반영되어 도로 불어난다.
  return clock((spent / pct) * (100 - pct));
}

const MONO = `"SF Mono", "Menlo", "Consolas", "Courier New", monospace`;

/** 인코딩 창 — 프리미어 프로의 내보내기 진행 창을 흉내낸다.
 *
 *  어두운 패널에 얇은 막대, 그 아래 경과·남은 시간을 나란히 놓는다.
 *  편집자에게는 이 배치가 곧 "인코딩 중"이라는 신호다. */
const STUCK_LINES = [
  "거의 다 됐습니다",
  "마무리 중",
  "샘플링 정리 중",
  "프레임 병합 중",
  "곧 끝납니다",
];

/** 인코더가 지금 무엇을 하고 있는지 한 줄 */
function statusLine(state, growing, t) {
  const dots = ".".repeat(1 + (Math.floor(t / 420) % 3));
  if (state === "idle") return "대기 중 — 두 손을 모으세요";
  if (state === "render") return `인코딩 중${dots}`;
  if (state === "stuck") {
    return growing
      ? `기도가 모자랍니다${dots}`
      : `${STUCK_LINES[Math.floor(t / 2600) % STUCK_LINES.length]}${dots}`;
  }
  return state === "done" ? "내보내기 완료" : "인코딩 실패";
}

function statusColor(state, growing) {
  if (state === "error") return "#ff5c57";
  if (state === "done") return "#5ac85a";
  if (growing) return "#ff9f4a";
  if (state === "stuck") return "#e8d48a";
  if (state === "render") return "#9ec9f5";
  return "rgba(232,236,241,0.7)";
}

function drawProgress(ctx, W, H, pct, state, t, left, spent) {
  const fail = state === "error";
  const done = state === "done";
  const growing = state === "stuck" && left > STUCK_MS;

  // 패널 — 주인공은 기도하는 손이므로 창은 작게, 그리고 비쳐 보이게 둔다
  const pw = Math.min(W * 0.42, H * 0.86);
  const ph = pw * 0.3;
  const px = (W - pw) / 2;
  const py = H * 0.71;
  const pad = pw * 0.055;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = ph * 0.22;
  ctx.shadowOffsetY = ph * 0.04;
  ctx.fillStyle = "rgba(28,30,34,0.62)";     // 프리미어의 짙은 회색, 반투명
  roundRect(ctx, px, py, pw, ph, ph * 0.08);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, px, py, pw, ph, ph * 0.08);
  ctx.stroke();

  // 창이 반투명이라 글자는 그림자를 깔아야 영상 위에서 읽힌다
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = ph * 0.1;

  // 맨 윗줄 — 지금 무엇을 하고 있는지. 인코더는 여기에 상태를 적는다.
  const ts = Math.round(ph * 0.145);
  ctx.font = `500 ${ts}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = statusColor(state, growing);
  ctx.fillText(statusLine(state, growing, t), px + pad, py + pad * 0.85);

  ctx.textAlign = "right";
  ctx.fillStyle = fail ? "#ff5c57" : done ? "#5ac85a" : "rgba(232,236,241,0.6)";
  ctx.font = `600 ${ts}px ${MONO}`;
  ctx.fillText(`${Math.floor(pct)}%`, px + pw - pad, py + pad * 0.85);

  // 막대 — 얇고 각지고, 프리미어의 파랑
  const bh = Math.max(6, ph * 0.115);
  const bx = px + pad;
  const bw = pw - pad * 2;
  const by = py + ph * 0.38;

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  roundRect(ctx, bx, by, bw, bh, bh * 0.22);
  ctx.fill();

  const fillW = (bw * clamp(pct, 0, 100)) / 100;
  if (fillW > 1) {
    ctx.fillStyle = fail ? "#c8443e" : done ? "#3f9e42" : "#2d8ceb";
    roundRect(ctx, bx, by, fillW, bh, bh * 0.22);
    ctx.fill();

    // 99%에서 버티는 동안 사선 줄무늬가 흐른다
    if (state === "stuck") {
      ctx.save();
      roundRect(ctx, bx, by, fillW, bh, bh * 0.22);
      ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = bh * 0.5;
      const step = bh * 1.6;
      const shift = (t / 30) % (step * 2);
      ctx.beginPath();
      for (let x = bx - bh * 3 + shift; x < bx + fillW + bh * 3; x += step * 2) {
        ctx.moveTo(x, by + bh * 1.3);
        ctx.lineTo(x + bh * 1.3, by - bh * 0.3);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, bh, bh * 0.22);
  ctx.stroke();

  // 아래 두 줄 — 경과 시간과 남은 시간을 좌우로 벌려 놓는다
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = ph * 0.1;
  const ls = Math.round(ph * 0.125);
  const ly = by + bh + ph * 0.1;
  ctx.font = `400 ${ls}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(232,236,241,0.62)";
  ctx.fillText("경과", bx, ly);
  ctx.textAlign = "right";
  ctx.fillText("남은 시간", bx + bw, ly);

  const vs = Math.round(ph * 0.165);
  ctx.font = `600 ${vs}px ${MONO}`;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(232,236,241,0.9)";
  ctx.fillText(clock(spent), bx, ly + ls * 1.5);

  // 남은 시간이 도로 늘어나면 붉게 — 편집자가 가장 싫어하는 장면이다
  ctx.textAlign = "right";
  ctx.fillStyle = fail ? "#ff5c57" : growing ? "#ff9f4a" : "rgba(232,236,241,0.9)";
  ctx.fillText(remainOf(state, pct, left, spent), bx + bw, ly + ls * 1.5);

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

// 99%에 닿으면 남은 시간이 뜬다. 기도하는 동안에만 줄어들고, 손을 풀면
// 도로 늘어난다. 끝까지 줄이면 완료, 너무 늘어나면 실패다.
const IDLE_RATE = 0.08;       // 기도하지 않을 때의 인코딩 속도 (기어가는 수준)
const STUCK_MS = 7000;        // 99%에 닿았을 때 남은 시간
const GIVEUP_MS = 14000;      // 여기까지 늘어나면 렌더러가 죽는다
const REGROW = 2.2;           // 손을 풀면 이 배로 다시 늘어난다
const HOLD_MS = { error: 4200, done: 3400 };   // 결과 창이 떠 있는 시간

export class PrayRender {
  constructor() {
    this.reset();
  }

  reset() {
    this.pct = 0;
    this.state = "idle";    // idle | render | stuck | error | done
    this.left = 0;          // 99%에서 남은 시간 (기도하면 줄고, 놓으면 는다)
    this.spent = 0;         // 인코딩을 시작한 뒤 흐른 시간
    this.endAt = 0;         // 결과가 난 시각
    this.code = CODES[0];
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

    // 99%에 닿은 뒤로는 손을 풀어도 렌더러가 계속 돈다. 기도가 모자라면
    // 남은 시간이 도로 늘어나다가 기어이 죽는다.
    if (this.state === "stuck") {
      this.spent += dt;
      this.left += prayer ? -dt : dt * REGROW;

      if (this.left <= 0) {
        this.left = 0;
        this.state = "done";
        this.endAt = t;
        fanfare();
      } else if (this.left >= GIVEUP_MS) {
        this.state = "error";
        this.endAt = t;
        this.shake = 420;
        crash();
      }
      this.updateSparks(sec, H);
      if (prayer) this.emitSpark(prayer, H);
      return;
    }

    // 렌더러는 웹캠을 켠 순간부터 혼자 돌고 있다. 기도는 그것을 재촉할 뿐이다.
    if (this.state === "idle") {
      this.state = "render";
      this.spent = 0;
      this.code = CODES[(Math.random() * CODES.length) | 0];
      bell();
    }

    this.spent += dt;

    // 손을 놓으면 기어가듯 느려진다. 진행이 멈추지는 않지만 끝날 기미도 없다.
    // 처음엔 시원하게 오르다가 끝으로 갈수록 굼떠진다.
    const base = this.pct < 70 ? 17 : this.pct < 90 ? 7 : 2.2;
    const speed = prayer ? base : base * IDLE_RATE;
    const before = Math.floor(this.pct);
    this.pct = Math.min(99, this.pct + speed * sec);
    if (Math.floor(this.pct) !== before && t - this.lastTick > 60) {
      this.lastTick = t;
      tick(this.pct);
    }

    // 99%에 닿으면 여기서부터 남은 시간 싸움이다
    if (this.pct >= 99) {
      this.state = "stuck";
      this.left = STUCK_MS;
    }

    if (prayer) this.emitSpark(prayer, H);
    this.updateSparks(sec, H);
  }

  /** 기도하는 동안 빛 알갱이가 올라간다 */
  emitSpark(prayer, H) {
    if (Math.random() >= 0.5) return;
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

    drawProgress(ctx, W, H, this.pct, this.state, t, this.left, this.spent);

    if (this.state === "error" || this.state === "done") {
      drawResult(ctx, W, H, t, (t - this.endAt) / 220, this.code, this.state === "done");
    }

    ctx.restore();
  }
}
