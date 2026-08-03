// 커피콩 받기 : 주먹을 쥐면 KNOCK 머그컵을 잡고, 위에서 떨어지는 커피콩을 받는다.
//  - 받아내면 눈이 초롱초롱해지고, 놓치면 눈 밑에 다크서클이 짙어진다.
//  - 컵이 가득 차면 한 잔을 비우고 다시 채운다.
//
// 이 작품은 화면 좌표(미러 해제)에서 계산하고 그린다. 컵과 콩은 얼굴·손 위에
// 겹쳐 그려지는데, 컵의 KNOCK 글자가 뒤집히면 안 되기 때문이다.
// 손·얼굴 랜드마크의 x는 W - x로 한 번만 뒤집어 들여온다.

import { ac, fxOut } from "./audio.js";
import { sx, sy, len } from "./view.js";

// 실제로 불러온 글꼴을 먼저 적는다. 없는 굵기를 요구하면 브라우저가 억지로
// 굵게 만들어 글자가 뭉개지므로, 굵기도 글꼴이 가진 값만 쓴다.
const FONT = `"Pretendard Variable", "Pretendard", -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ── 소리 ────────────────────────────────────────────── */

/** 컵에 콩이 떨어지는 소리 — 짧고 둔탁한 '톡' */
function plunk() {
  try {
    const a = ac();
    const t = a.currentTime;
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(rnd(420, 560), t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.09);
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.32, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(fxOut());
    osc.start(t);
    osc.stop(t + 0.14);
  } catch { /* 소리는 실패해도 진행에 영향 없음 */ }
}

/** 바닥에 떨어지는 소리 — 낮고 힘없는 '툭' */
function thud() {
  try {
    const a = ac();
    const t = a.currentTime;
    const osc = a.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.16);
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(gain).connect(fxOut());
    osc.start(t);
    osc.stop(t + 0.22);
  } catch { /* 무시 */ }
}

/** 한 잔을 다 채웠을 때의 짧은 종소리 */
function chime() {
  try {
    const a = ac();
    const t = a.currentTime;
    [784, 1046.5].forEach((f, i) => {
      const osc = a.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const gain = a.createGain();
      const at = t + i * 0.09;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.26, at + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      osc.connect(gain).connect(fxOut());
      osc.start(at);
      osc.stop(at + 0.55);
    });
  } catch { /* 무시 */ }
}

/* ── 손 → 머그컵 ─────────────────────────────────────── */

// 주먹은 손끝이 손목 쪽으로 접혀 손바닥 길이와 비슷해진다.
// 편 손은 검지 끝만 해도 손바닥의 두 배가 넘는다.
const GRIP = 1.5;

/** 접힌 손가락 수 — 손끝이 중간 마디보다 손목에 가까우면 접힌 것이다.
 *
 *  길이 비율만 보면 손을 카메라 쪽으로 곧게 뻗어도 짧아 보여 주먹으로 오해한다.
 *  마디끼리 견주면 그런 착시에 흔들리지 않는다. */
function foldedCount(lm, W, H) {
  const d = (i, j) => Math.hypot((lm[i].x - lm[j].x) * W, (lm[i].y - lm[j].y) * H);
  let n = 0;
  for (const [tip, pip] of [[8, 6], [12, 10], [16, 14], [20, 18]]) {
    if (d(tip, 0) < d(pip, 0) * 1.08) n++;
  }
  return n;
}

/** 얼굴이 차지한 자리 (화면 좌표, 조금 넉넉하게)
 *
 *  손 인식기는 얼굴을 손으로 잘못 볼 때가 있다. 게다가 그렇게 잡힌 가짜 손은
 *  손가락이 없는 덩어리라 주먹으로 판정되어 얼굴에 컵이 얹힌다.
 *  그래서 얼굴 자리에 있는 손은 아예 세지 않는다. */
export function faceBoxOf(faceResult, W, H) {
  const lm = faceResult?.faceLandmarks?.[0];
  if (!lm) return null;

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of lm) {
    const x = sx(p.x * W, W), y = sy(p.y * H, H);
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  if (!isFinite(x0)) return null;

  const mx = (x1 - x0) * 0.08, my = (y1 - y0) * 0.08;
  return { x0: x0 - mx, y0: y0 - my, x1: x1 + mx, y1: y1 + my };
}

/** 주먹을 쥔 손마다 머그컵을 하나 만든다 (화면 좌표)
 *
 *  컵은 손 위에 얹히는 것이 아니라 손이 손잡이를 쥔 자리에 놓인다.
 *  크기는 손바닥 길이와 주먹 너비에서 뽑아 손이 크면 컵도 커진다.
 *
 *  sides는 직전 프레임에 컵을 어느 쪽에 뒀는지다. 손이 화면 한가운데
 *  있을 때 좌우로 튀지 않도록 가운데에서는 쓰던 쪽을 유지한다. */
export function mugsOf(handResult, W, H, sides = [], faceBox = null) {
  const out = [];
  const hands = (handResult?.landmarks ?? []).slice(0, 2);

  hands.forEach((lm, i) => {
    const palm = Math.hypot((lm[9].x - lm[0].x) * W, (lm[9].y - lm[0].y) * H);
    if (!palm) return;

    // 주먹의 한가운데 — 접힌 손가락들이 모인 자리다. 컵은 바로 여기에 놓인다.
    let mx = 0, my = 0;
    const GRIPPED = [5, 9, 13, 17, 8, 12, 16, 20];
    for (const j of GRIPPED) { mx += lm[j].x; my += lm[j].y; }
    const hx = sx((mx / GRIPPED.length) * W, W);
    const hy = sy((my / GRIPPED.length) * H, H);

    // 얼굴 자리에 잡힌 손은 오인식이다
    if (faceBox && hx > faceBox.x0 && hx < faceBox.x1 && hy > faceBox.y0 && hy < faceBox.y1) return;

    let reach = 0;
    for (const j of [8, 12, 16, 20]) {
      reach += Math.hypot((lm[j].x - lm[0].x) * W, (lm[j].y - lm[0].y) * H);
    }
    const curl = reach / (4 * palm);
    const folded = foldedCount(lm, W, H);

    // 손바닥 길이만 쓰면 손을 앞뒤로 기울일 때 컵이 커졌다 작아졌다 한다.
    // 주먹 너비(검지~새끼 관절)를 함께 재면 훨씬 덜 흔들린다.
    const span = Math.hypot((lm[5].x - lm[17].x) * W, (lm[5].y - lm[17].y) * H);
    const hs = len((palm + span * 1.15) / 2);

    const w = hs * 1.55;
    const h = hs * 1.75;

    // 손잡이를 어느 쪽에 달지 — 컵이 화면 안쪽으로 오게 둔다
    const dead = W * 0.06;
    let side = sides[i] ?? (hx > W / 2 ? 1 : -1);
    if (hx > W / 2 + dead) side = 1;
    else if (hx < W / 2 - dead) side = -1;

    // 컵은 주먹 자리에 그대로 놓인다. 손잡이만 옆으로 뻗는다.
    const cx = hx;
    const cy = hy;

    out.push({
      // 길이 비율과 접힌 손가락 수가 모두 맞아야 주먹으로 본다
      grip: curl < GRIP && folded >= 3,
      hx, hy, hs, curl, folded, side,
      cx, cy, w, h,
      rimY: cy - h / 2,
    });
  });
  return out;
}

/* ── 얼굴 → 두 눈 ────────────────────────────────────── */

let eyeIndices = null;

function indicesOf(FaceLandmarker) {
  if (eyeIndices) return eyeIndices;
  const pick = (conns) => {
    const set = new Set();
    for (const c of conns ?? []) { set.add(c.start); set.add(c.end); }
    return [...set];
  };
  eyeIndices = {
    left: pick(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE),
    right: pick(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE),
  };
  return eyeIndices;
}

function boxOf(lm, idx, W, H) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of idx) {
    const p = lm[i];
    if (!p) continue;
    const x = sx(p.x * W, W), y = sy(p.y * H, H);
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  if (!isFinite(x0)) return null;
  return {
    x: (x0 + x1) / 2, y: (y0 + y1) / 2,
    rx: (x1 - x0) / 2, ry: (y1 - y0) / 2,
  };
}

/** 두 눈의 위치와 크기 (화면 좌표) */
export function eyesOf(faceResult, FaceLandmarker, W, H) {
  const lm = faceResult?.faceLandmarks?.[0];
  if (!lm) return null;
  const idx = indicesOf(FaceLandmarker);
  const a = boxOf(lm, idx.left, W, H);
  const b = boxOf(lm, idx.right, W, H);
  if (!a || !b) return null;
  return [a, b];
}

/* ── 그리기 ──────────────────────────────────────────── */

function drawBean(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rot);

  const g = ctx.createLinearGradient(-b.r, -b.r, b.r, b.r);
  g.addColorStop(0, "#7a4a26");
  g.addColorStop(0.6, "#4a2a13");
  g.addColorStop(1, "#2c180a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, b.r * 0.72, b.r, 0, 0, Math.PI * 2);
  ctx.fill();

  // 가운데 골
  ctx.strokeStyle = "rgba(28,16,6,0.95)";
  ctx.lineWidth = Math.max(1, b.r * 0.17);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -b.r * 0.84);
  ctx.quadraticCurveTo(b.r * 0.36, 0, 0, b.r * 0.84);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,226,190,0.2)";
  ctx.beginPath();
  ctx.ellipse(-b.r * 0.24, -b.r * 0.32, b.r * 0.18, b.r * 0.32, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMug(ctx, m, fill, glow) {
  const { cx, cy, w, h, side } = m;
  const rx = w / 2, ry = w * 0.15;
  const top = cy - h / 2, bot = cy + h / 2;

  ctx.save();
  if (glow > 0) {
    ctx.shadowColor = `rgba(253,224,71,${glow * 0.9})`;
    ctx.shadowBlur = w * 0.55 * glow;
  }

  // 손잡이 — 몸통보다 먼저 그려 뒤로 보내진다. 주먹이 이 고리를 쥔 모양이 된다.
  ctx.strokeStyle = "#dfe6ee";
  ctx.lineWidth = w * 0.14;
  ctx.beginPath();
  ctx.ellipse(cx + side * rx * 0.92, cy + h * 0.04, w * 0.3, h * 0.3,
    side > 0 ? 0 : Math.PI, -1.25, 1.25);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 몸통 — 아래로 살짝 좁아지는 도자기 컵
  const body = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  body.addColorStop(0, "#aeb9c7");
  body.addColorStop(0.22, "#f4f7fb");
  body.addColorStop(0.72, "#dae1ea");
  body.addColorStop(1, "#9aa6b5");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(cx - rx, top);
  ctx.lineTo(cx - rx * 0.87, bot - ry * 0.6);
  ctx.quadraticCurveTo(cx, bot + ry * 0.7, cx + rx * 0.87, bot - ry * 0.6);
  ctx.lineTo(cx + rx, top);
  ctx.closePath();
  ctx.fill();

  // 컵 안쪽과 커피 — 잔이 찰수록 수면이 림 가까이 올라온다
  ctx.fillStyle = "#1b1209";
  ctx.beginPath();
  ctx.ellipse(cx, top, rx * 0.87, ry * 0.87, 0, 0, Math.PI * 2);
  ctx.fill();

  if (fill > 0.001) {
    const k = clamp(fill, 0, 1);
    const sy = top + ry * 0.8 * (1 - k);
    const sr = rx * 0.87 * (0.45 + 0.55 * k);
    const cof = ctx.createLinearGradient(cx - sr, sy, cx + sr, sy);
    cof.addColorStop(0, "#4b2a12");
    cof.addColorStop(0.5, "#7b4a22");
    cof.addColorStop(1, "#3a2010");
    ctx.fillStyle = cof;
    ctx.beginPath();
    ctx.ellipse(cx, sy, sr, ry * 0.8 * (0.45 + 0.55 * k), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,226,180,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx - sr * 0.3, sy - ry * 0.2, sr * 0.3, ry * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 림
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, w * 0.045);
  ctx.beginPath();
  ctx.ellipse(cx, top, rx * 0.93, ry * 0.93, 0, 0, Math.PI * 2);
  ctx.stroke();

  // KNOCK 라벨
  const fs = Math.max(9, w * 0.2);
  ctx.font = `700 ${fs}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  try { ctx.letterSpacing = `${fs * 0.14}px`; } catch { /* 지원하지 않는 브라우저는 그대로 */ }
  ctx.fillStyle = "rgba(17,22,29,0.9)";
  ctx.fillText("KNOCK", cx + fs * 0.07, cy + h * 0.08);
  try { ctx.letterSpacing = "0px"; } catch { /* 무시 */ }

  ctx.restore();
}

/** 아직 컵을 쥐지 않은 손에 '주먹을 쥐세요' 표시를 띄운다 */
function drawHint(ctx, m, t) {
  const r = m.hs * 1.1;
  const pulse = 1 + Math.sin(t / 240) * 0.08;
  ctx.save();
  ctx.strokeStyle = "rgba(253,224,71,0.85)";
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.setLineDash([r * 0.5, r * 0.4]);
  ctx.beginPath();
  ctx.arc(m.hx, m.hy, r * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const fs = Math.max(12, r * 0.42);
  ctx.font = `700 ${fs}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = fs * 0.28;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.fillStyle = "#fde047";
  ctx.strokeText("주먹을 쥐세요", m.hx, m.hy - r * 1.35);
  ctx.fillText("주먹을 쥐세요", m.hx, m.hy - r * 1.35);
  ctx.restore();
}

/** 네 갈래 반짝임 */
function star(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** 초롱초롱 — 눈 주위가 밝아지고 반짝임이 돈다 */
function drawSparkle(ctx, eye, k, t) {
  const R = Math.max(eye.rx * 0.85, eye.ry * 1.6);

  ctx.save();
  // 눈이 가려지지 않도록 옅게 얹는다
  const glow = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, R * 2.1);
  glow.addColorStop(0, `rgba(255,246,205,${0.3 * k})`);
  glow.addColorStop(0.5, `rgba(255,226,140,${0.15 * k})`);
  glow.addColorStop(1, "rgba(255,226,140,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, R * 2.1, 0, Math.PI * 2);
  ctx.fill();

  // 눈동자 위 하이라이트 — 촉촉하게 젖은 느낌
  ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`;
  ctx.beginPath();
  ctx.ellipse(eye.x - eye.rx * 0.22, eye.y - eye.ry * 0.34, R * 0.26, R * 0.22, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eye.x + eye.rx * 0.26, eye.y + eye.ry * 0.2, R * 0.13, R * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  // 주변을 도는 반짝임
  for (let i = 0; i < 3; i++) {
    const a = t / 900 + (i * Math.PI * 2) / 3;
    const twinkle = 0.45 + 0.55 * Math.max(0, Math.sin(t / 220 + i * 1.7));
    const d = R * (1.5 + 0.18 * Math.sin(t / 500 + i));
    ctx.fillStyle = `rgba(255,250,220,${k * twinkle})`;
    star(ctx, eye.x + Math.cos(a) * d * 1.35, eye.y + Math.sin(a) * d, R * 0.5 * twinkle);
  }
  ctx.restore();
}

/** 다크서클 — 눈 밑이 어둡게 가라앉는다 */
function drawDark(ctx, eye, k, t) {
  const R = Math.max(eye.rx * 0.85, eye.ry * 1.6);
  const cy = eye.y + R * 0.95;

  ctx.save();
  // 곱하기로 얹어야 피부색 위에 그림자처럼 내려앉는다
  ctx.globalCompositeOperation = "multiply";
  const g = ctx.createRadialGradient(eye.x, cy, 0, eye.x, cy, R * 1.5);
  g.addColorStop(0, `rgba(84,52,96,${0.72 * k})`);
  g.addColorStop(0.55, `rgba(96,64,90,${0.4 * k})`);
  g.addColorStop(1, "rgba(120,90,110,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(eye.x, cy, eye.rx * 1.35, R * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // 지친 주름 두 줄
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = `rgba(70,44,72,${0.5 * k})`;
  ctx.lineWidth = Math.max(1, R * 0.09);
  ctx.lineCap = "round";
  for (let i = 0; i < 2; i++) {
    const off = R * (0.75 + i * 0.42);
    ctx.beginPath();
    ctx.moveTo(eye.x - eye.rx * 0.9, eye.y + off * 0.7);
    ctx.quadraticCurveTo(eye.x, eye.y + off * 1.25, eye.x + eye.rx * 0.9, eye.y + off * 0.7);
    ctx.stroke();
  }

  // 눈꺼풀이 무거워 보이도록 위쪽에도 옅은 그늘을 얹는다
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `rgba(110,86,110,${0.35 * k})`;
  ctx.beginPath();
  ctx.ellipse(eye.x, eye.y - eye.ry * 0.75, eye.rx * 1.05, eye.ry * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 아주 지치면 한숨처럼 흐르는 표시
  if (k > 0.7) {
    ctx.save();
    const drip = ((t / 1600) % 1);
    ctx.globalAlpha = (1 - drip) * (k - 0.7) / 0.3;
    ctx.fillStyle = "#7c6a95";
    ctx.beginPath();
    ctx.ellipse(eye.x, cy + R * (0.6 + drip * 1.8), R * 0.16, R * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ── 작품 ────────────────────────────────────────────── */

export class CoffeeGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.beans = [];
    this.bits = [];        // 튄 조각
    this.caught = 0;
    this.missed = 0;
    this.cups = 0;
    this.fill = 0;         // 컵에 담긴 정도 0~1
    this.mood = 0;         // -1 다크서클 … +1 초롱초롱
    this.glow = 0;
    this.spawnAcc = 0;
    this.last = 0;
    this.eyes = null;      // 얼굴을 잠깐 놓쳐도 효과가 끊기지 않도록 붙잡아 둔다
    this.eyesAt = 0;
    this.sides = [];       // 손마다 컵을 어느 쪽에 뒀는지
  }

  spawn(W, H) {
    const r = Math.min(W, H) * rnd(0.026, 0.038);
    this.beans.push({
      x: rnd(W * 0.12, W * 0.88),
      y: -r * 2,
      py: -r * 2,
      vx: rnd(-0.025, 0.025) * W,
      vy: 0,
      r,
      rot: rnd(0, Math.PI * 2),
      vr: rnd(-3, 3),
    });
  }

  update(dt, W, H, mugs, t) {
    const sec = dt / 1000;

    // 받아낼수록 조금씩 잦아진다
    const every = Math.max(460, 900 - this.caught * 12);
    this.spawnAcc += dt;
    if (this.spawnAcc > every) {
      this.spawnAcc = 0;
      this.spawn(W, H);
    }

    // 컵을 옮겨 받을 틈은 남기되 늘어지지 않게 (위에서 바닥까지 대략 2.1초)
    const g = H * 0.44;
    const cups = mugs.filter((m) => m.grip);

    for (let i = this.beans.length - 1; i >= 0; i--) {
      const b = this.beans[i];
      b.py = b.y;
      b.vy += g * sec;
      b.x += b.vx * sec;
      b.y += b.vy * sec;
      b.rot += b.vr * sec;

      // 림을 지나는 순간에만 판정한다. 한 프레임에 컵 높이를 넘어가도 놓치지 않는다.
      let landed = false;
      for (const m of cups) {
        if (b.py <= m.rimY && b.y > m.rimY && Math.abs(b.x - m.cx) < m.w * 0.46) {
          landed = true;
          this.catchBean(b, m);
          break;
        }
      }
      if (landed) { this.beans.splice(i, 1); continue; }

      if (b.y - b.r > H) {
        this.beans.splice(i, 1);
        this.missBean(b, W, H);
      }
    }

    // 튄 조각
    const drag = Math.pow(0.25, sec);
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const p = this.bits[i];
      p.life -= sec;
      if (p.life <= 0) { this.bits.splice(i, 1); continue; }
      p.vy += g * 0.6 * sec;
      p.x += p.vx * sec;
      p.y += p.vy * sec;
      p.rot += p.vr * sec;
      p.vx *= drag;
    }

    // 기분은 가만히 두면 천천히 평소로 돌아온다
    if (this.mood !== 0) {
      const back = Math.sign(this.mood) * Math.min(Math.abs(this.mood), 0.055 * sec);
      this.mood -= back;
    }
    if (this.glow > 0) this.glow = Math.max(0, this.glow - sec * 2.2);
  }

  catchBean(b, m) {
    this.caught++;
    this.mood = clamp(this.mood + 0.3, -1, 1);
    this.glow = 1;
    this.fill += 0.1;
    if (this.fill >= 1) {
      this.fill = 0;
      this.cups++;
      this.mood = 1;
      chime();
    }
    plunk();

    for (let i = 0; i < 5; i++) {
      this.bits.push({
        x: b.x, y: m.rimY,
        vx: rnd(-1, 1) * m.w * 0.9,
        vy: rnd(-1.6, -0.5) * m.w * 1.4,
        r: b.r * rnd(0.3, 0.5),
        rot: rnd(0, 6.28), vr: rnd(-9, 9),
        life: rnd(0.3, 0.55),
      });
    }
  }

  missBean(b, W, H) {
    this.missed++;
    this.mood = clamp(this.mood - 0.26, -1, 1);
    thud();
    for (let i = 0; i < 4; i++) {
      this.bits.push({
        x: b.x, y: H - b.r,
        vx: rnd(-1, 1) * W * 0.14,
        vy: rnd(-1.2, -0.4) * H * 0.25,
        r: b.r * rnd(0.25, 0.45),
        rot: rnd(0, 6.28), vr: rnd(-9, 9),
        life: rnd(0.25, 0.45),
      });
    }
  }

  draw(ctx, video, W, H, handResult, faceResult, FaceLandmarker, t) {
    ctx.drawImage(video, 0, 0, W, H);

    const dt = Math.min(64, this.last ? t - this.last : 16);
    this.last = t;

    const faceBox = faceBoxOf(faceResult, W, H);
    const mugs = mugsOf(handResult, W, H, this.sides, faceBox);
    this.sides = mugs.map((m) => m.side);
    this.update(dt, W, H, mugs, t);

    // 한두 프레임 얼굴을 놓쳐도 효과가 깜빡이지 않게 붙잡아 두되,
    // 오래 못 찾으면 엉뚱한 자리에 남지 않도록 지운다.
    const eyes = eyesOf(faceResult, FaceLandmarker, W, H);
    if (eyes) {
      this.eyes = eyes;
      this.eyesAt = t;
    } else if (t - this.eyesAt > 500) {
      this.eyes = null;
    }

    // 이후로는 미러를 풀고 화면 좌표에서 그린다 (KNOCK 글자가 뒤집히지 않도록)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 눈 효과 — 컵과 콩보다 아래에 깔린다
    if (this.eyes && Math.abs(this.mood) > 0.02) {
      const k = Math.min(1, Math.abs(this.mood));
      for (const eye of this.eyes) {
        this.mood > 0 ? drawSparkle(ctx, eye, k, t) : drawDark(ctx, eye, k, t);
      }
    }

    for (const m of mugs) {
      m.grip ? drawMug(ctx, m, this.fill, this.glow) : drawHint(ctx, m, t);
    }

    for (const b of this.beans) drawBean(ctx, b);
    for (const p of this.bits) {
      ctx.globalAlpha = Math.min(1, p.life * 3);
      drawBean(ctx, p);
      ctx.globalAlpha = 1;
    }

    this.drawScore(ctx, W, H);
    ctx.restore();
  }

  drawScore(ctx, W, H) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // 제목 — 화면 가운데 위. 모서리의 녹화 표시등·인식 배지와 겹치지 않을 만큼만 내린다.
    //
    // 외곽선을 굵게 두르면 한글은 속이 메워져 뭉개진다. 얇은 선으로 윤곽만 잡고
    // 뒤에 그림자를 깔아 밝은 배경에서도 읽히게 한다.
    const ts = Math.round(H * 0.06);
    const ty = H * 0.045;
    const title = "편집자는 커피로 움직입니다!";
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
    warm.addColorStop(1, "#edc98a");
    ctx.fillStyle = warm;
    ctx.fillText(title, W / 2, ty);
    try { ctx.letterSpacing = "0px"; } catch { /* 무시 */ }

    const fs = Math.round(H * 0.05);
    ctx.font = `700 ${fs}px "Courier New", monospace`;
    ctx.lineWidth = fs * 0.14;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";

    const y = H * 0.15;
    const label = `CUP ${this.cups}   GOT ${this.caught}   MISS ${this.missed}`;
    ctx.fillStyle = this.mood < -0.35 ? "#c4b5fd" : "#fde047";
    ctx.strokeText(label, W / 2, y);
    ctx.fillText(label, W / 2, y);

    // 잔이 차오르는 정도를 가는 막대로 보여준다
    const bw = Math.min(W * 0.4, fs * 9), bh = fs * 0.2;
    const bx = (W - bw) / 2, by = y + fs * 1.25;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#a16207";
    ctx.fillRect(bx, by, bw * clamp(this.fill, 0, 1), bh);
    ctx.restore();
  }
}
