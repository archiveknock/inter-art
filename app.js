// 작품 페이지의 알맹이 — 카메라, 모델 로딩, 렌더 루프, 녹화와 저장.
//
// 페이지마다 작품 하나만 돌아간다. save.html 같은 페이지가 start("save")를 부른다.

import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1";

import { SaveChallenge, fingertipsOf } from "./save.js";
import { CoffeeGame } from "./coffee.js";
import { FingerMelody } from "./fingers.js";
import {
  recordStream, attachMic, detachMic,
  attachTabAudio, detachTabAudio, canCaptureTab,
} from "./audio.js";
import { view, base } from "./view.js";
import { mount } from "./ui.js";

const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODELS = {
  hand: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  face: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
};

export function start(effect) {
  const el = mount(effect);
  const { video, canvas, stage, viewer } = el;
  const ctx = canvas.getContext("2d");

  // 이 작품이 쓰는 모델. 그리기는 손 결과를 기준으로 돈다.
  const NEEDED = el.work.tasks;
  const MAIN = "hand";

  /** 무대가 카메라 비율을 따라가야 검은 여백이 생기지 않는다.
   *  --arn은 남는 자리를 끝까지 쓰도록 폭을 계산할 때 쓰는 숫자 값이다. */
  function setAspect() {
    stage.style.setProperty("--ar", `${canvas.width} / ${canvas.height}`);
    stage.style.setProperty("--arn", `${canvas.width / canvas.height}`);
  }

  // 탭 소리 녹음은 이를 지원하는 브라우저에서만 보인다 (모바일은 대체로 지원하지 않는다)
  el.tabAudioField.hidden = !canCaptureTab();

  let running = false;
  let lastTs = -1;
  const lastResults = {};     // 모델별 마지막 추론 결과
  const lastVideoTimes = {};  // 모델별로 마지막에 처리한 영상 시각
  let loopError = false;

  const saveGame = effect === "save" ? new SaveChallenge() : null;
  const melody = effect === "melody" ? new FingerMelody() : null;
  const coffee = effect === "coffee" ? new CoffeeGame() : null;

  let vision = null;
  const tasks = {};          // 지연 로딩된 모델
  const loading = {};        // 중복 로딩 방지

  const setStatus = (msg) => {
    el.statusEl.hidden = !msg;
    el.statusEl.textContent = msg ?? "";
  };

  // 인식이 되고 있는지 눈으로 확인할 수 있게 알려준다 (DOM 오버레이라 녹화엔 안 찍힌다)
  let lastDetectText = "";
  let fpsCount = 0, fpsSince = 0, fps = 0;

  function reportDetection(count, label) {
    const now = performance.now();
    fpsCount++;
    if (now - fpsSince >= 500) {
      fps = Math.round((fpsCount * 1000) / (now - fpsSince));
      fpsCount = 0;
      fpsSince = now;
    }

    const text = `${count > 0 ? `${label} ${count} 인식됨` : `${label} 인식 안 됨`} · ${fps}fps`;
    if (text === lastDetectText) return;
    lastDetectText = text;
    el.detectEl.textContent = text;
    el.detectEl.classList.toggle("off", count === 0);
    el.detectEl.hidden = false;
  }

  // 폰에서는 콘솔을 볼 수 없으므로 진단 메시지를 화면에 남긴다
  function note(msg) {
    el.noteEl.hidden = !msg;
    el.noteEl.textContent = msg ?? "";
  }

  /** 카메라 열기 — 안드로이드는 facingMode가 없으면 후면 카메라가 잡힌다 */
  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        location.protocol === "https:" || location.hostname === "localhost"
          ? "이 브라우저는 카메라를 지원하지 않습니다. 카카오톡·인스타 등 앱 안에서 열었다면 Chrome으로 열어주세요."
          : "https 주소로 접속해야 카메라를 쓸 수 있습니다."
      );
    }
    const attempts = [
      { video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: "user" } },
      { video: true },
    ];
    let lastErr;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastErr = err;
        console.warn("getUserMedia 실패:", constraints, err);
      }
    }
    throw lastErr;
  }

  /* ── 모델 지연 로딩 ──────────────────────────────────── */

  // VIDEO 모드는 이전 프레임의 추적 영역(ROI)을 이어받는데, 이 값이 NaN으로 깨지면
  // 그래프가 영구히 실패한다. 그때는 IMAGE 모드로 내려간다 — 매 프레임 새로 검출하므로
  // 이어받는 상태가 없어 같은 오류가 날 수 없다.
  const runMode = { hand: "VIDEO", face: "VIDEO" };

  function createTask(kind, delegate) {
    const baseOptions = { modelAssetPath: MODELS[kind], delegate };
    const runningMode = runMode[kind];
    // 기본 임계값(0.5)은 웹캠 화질·조명에서 놓치는 경우가 많아 낮춘다
    if (kind === "hand") {
      return HandLandmarker.createFromOptions(vision, {
        baseOptions, runningMode, numHands: 2,
        minHandDetectionConfidence: 0.3,
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });
    }
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions, runningMode, numFaces: 1,
      minFaceDetectionConfidence: 0.3,
      minFacePresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    });
  }

  /* ── 추론 실패 복구 ──────────────────────────────────── */

  const failures = {};
  const rebuilding = {};

  // 추론 그래프가 깨졌을 때 새 인스턴스로 교체한다. 교체가 끝날 때까지는
  // 기존 태스크를 그대로 두고 결과만 건너뛰어 화면이 깜빡이지 않게 한다.
  function recoverTask(kind, err) {
    if (rebuilding[kind]) return;
    rebuilding[kind] = true;
    failures[kind] = (failures[kind] ?? 0) + 1;

    const downgrade = failures[kind] >= 2 && runMode[kind] === "VIDEO";
    if (downgrade) runMode[kind] = "IMAGE";
    // 스스로 복구되는 상황이므로 화면에는 알리지 않는다 (사용자가 할 일이 없다)
    console.warn(
      downgrade
        ? `추적 그래프 반복 실패 → IMAGE 모드 전환 (${kind})`
        : `추적 그래프 오류 → 재시작 (${kind}): ${err.message}`
    );

    const old = tasks[kind];
    createTask(kind, "GPU")
      .catch(() => createTask(kind, "CPU"))
      .then((fresh) => {
        tasks[kind] = fresh;
        delete lastResults[kind];
        delete lastVideoTimes[kind];
        try { old?.close?.(); } catch { /* 정리 실패는 무시 */ }
      })
      .catch((e) => console.error(`추적기 재시작 실패 (${kind}):`, e))
      .finally(() => { rebuilding[kind] = false; });
  }

  /** 추론 실행 — 실패하면 복구를 걸고 null을 돌려준다 */
  function runDetect(kind, task, ts) {
    try {
      const res = runMode[kind] === "IMAGE"
        ? task.detect(video)
        : task.detectForVideo(video, ts);
      failures[kind] = 0;
      return res;
    } catch (err) {
      console.error(`${kind} 추론 실패:`, err);
      recoverTask(kind, err);
      return null;
    }
  }

  async function getTask(kind) {
    if (tasks[kind]) return tasks[kind];
    if (loading[kind]) return loading[kind];

    loading[kind] = (async () => {
      if (!vision) vision = await FilesetResolver.forVisionTasks(WASM);
      let task;
      if (el.cpuModeEl.checked) {
        tasks[kind] = await createTask(kind, "CPU");
        return tasks[kind];
      }
      try {
        task = await createTask(kind, "GPU");
      } catch (err) {
        // 일부 안드로이드 GPU에서는 WebGL 델리게이트 생성이 실패한다
        console.warn("GPU 델리게이트 실패, CPU로 전환:", err);
        task = await createTask(kind, "CPU");
      }
      tasks[kind] = task;
      return task;
    })();

    return loading[kind];
  }

  /* ── 카메라 ──────────────────────────────────────────── */

  function stopCamera() {
    running = false;
    if (recorder) stopRecording();

    video.srcObject?.getTracks().forEach((t) => t.stop());
    video.srcObject = null;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const k of Object.keys(lastResults)) delete lastResults[k];
    for (const k of Object.keys(lastVideoTimes)) delete lastVideoTimes[k];

    el.btnStart.textContent = "카메라 켜기";
    el.btnStart.classList.remove("off");
    el.btnRec.disabled = true;
    el.btnShot.disabled = true;
    el.detectEl.hidden = true;
    lastDetectText = "";
    setStatus("카메라가 꺼져 있습니다");
  }

  el.btnStart.addEventListener("click", async () => {
    if (running) return stopCamera();

    el.btnStart.disabled = true;
    setStatus("카메라 권한 요청 중…");
    try {
      const stream = await openCamera();
      video.srcObject = stream;
      await video.play();

      // 일부 기기는 play() 직후에도 해상도가 0이라 메타데이터를 기다려야 한다
      if (!video.videoWidth) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("카메라 영상이 시작되지 않았습니다")), 8000);
          video.addEventListener("loadedmetadata", () => { clearTimeout(timer); resolve(); }, { once: true });
        });
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setAspect();

      setStatus("모델 불러오는 중…");
      await Promise.all(NEEDED.map(getTask));

      setStatus(null);
      running = true;
      el.btnStart.disabled = false;
      el.btnRec.disabled = false;
      el.btnShot.disabled = false;
      el.btnStart.textContent = "카메라 끄기";
      el.btnStart.classList.add("off");
      requestAnimationFrame(loop);
    } catch (err) {
      console.error(err);
      setStatus(`시작 실패: ${err.message}`);
      note(`${err.name || "Error"}: ${err.message} / ${navigator.userAgent}`);
      el.btnStart.disabled = false;
      el.btnStart.textContent = "다시 시도";
    }
  });

  // GPU 연산이 통하지 않는 기기가 있다. 그런 이용자가 올 때마다 다시 켜지 않도록
  // 선택을 기억해 둔다.
  //
  // 데스크톱은 GPU가 기본이다. CPU 연산은 3배 가까이 느리다.
  // 다만 휴대폰은 GPU 연산이 아무것도 못 알아보는 사례가 잦아 CPU를 기본으로 둔다.
  // 느려도 인식되는 편이 빠르지만 안 되는 것보다 낫다. 원하면 끌 수 있다.
  const isMobile = matchMedia("(pointer: coarse)").matches && matchMedia("(max-width: 900px)").matches;
  try {
    const saved = localStorage.getItem("cpuMode");
    el.cpuModeEl.checked = saved === null ? isMobile : saved === "1";
  } catch { el.cpuModeEl.checked = isMobile; }

  // 캔버스는 아직 내려받지 않은 글꼴을 조용히 건너뛰고 다른 글꼴로 그린다.
  // 화면에 쓸 글자를 미리 달라고 해 두면 첫 프레임부터 제 글꼴로 나온다.
  try {
    document.fonts?.load('600 40px "Pretendard Variable"', "편집자는 커피로 움직입니다! 주먹을 쥐세요 KNOCK 도레미파솔라시");
  } catch { /* 글꼴을 못 불러와도 기본 글꼴로 나온다 */ }

  /* ── 화면 배율 ───────────────────────────────────────── */

  // 카메라는 화각이 고정이라 뒤로 물러날 수 없다. 대신 그림을 줄여 멀어져 보이게 한다.
  function applyZoom(save) {
    view.zoom = Number(el.zoomEl.value);
    el.zoomVal.textContent = `${Math.round(view.zoom * 100)}%`;
    if (save) {
      try { localStorage.setItem("zoom", el.zoomEl.value); } catch { /* 무시 */ }
    }
  }

  try {
    const saved = localStorage.getItem("zoom");
    if (saved) el.zoomEl.value = saved;
  } catch { /* 무시 */ }
  applyZoom(false);

  el.zoomEl.addEventListener("input", () => applyZoom(true));

  // GPU/CPU 전환 — 만들어 둔 추론기를 모두 버리고 다시 만든다
  el.cpuModeEl.addEventListener("change", async () => {
    try { localStorage.setItem("cpuMode", el.cpuModeEl.checked ? "1" : "0"); } catch { /* 무시 */ }

    for (const kind of Object.keys(tasks)) {
      try { tasks[kind]?.close?.(); } catch { /* 정리 실패는 무시 */ }
      delete tasks[kind];
      delete loading[kind];
      delete lastResults[kind];
      delete failures[kind];
      runMode[kind] = "VIDEO";
    }
    note(el.cpuModeEl.checked ? "CPU 모드로 다시 불러옵니다…" : "GPU 모드로 다시 불러옵니다…");
    if (running) {
      setStatus("모델 불러오는 중…");
      try {
        await Promise.all(NEEDED.map(getTask));
        setStatus(null);
        note(null);
      } catch (err) {
        setStatus(`모델 로딩 실패: ${err.message}`);
      }
    }
  });

  /* ── 렌더 루프 ───────────────────────────────────────── */

  function loop() {
    if (!running) return;

    // 화면 회전 등으로 카메라 해상도가 바뀌면 캔버스를 맞춘다
    // (녹화 중에는 스트림이 끊기므로 건드리지 않는다)
    if (!recorder && video.videoWidth &&
        (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setAspect();
      for (const k of Object.keys(lastResults)) delete lastResults[k];
    }

    const W = canvas.width, H = canvas.height;
    const ready = NEEDED.every((k) => tasks[k]);

    // 배율을 줄이면 그림이 가운데로 모이므로 바깥에 지난 프레임이 남는다
    if (view.zoom < 1) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
    }

    // 셀피 미러링 + 화면 배율: 이후 모든 그리기는 비디오 원본 좌표계에서 이뤄진다.
    base(ctx, W, H);

    if (!ready) {
      ctx.drawImage(video, 0, 0, W, H);
    } else {
      let ts = performance.now();
      if (ts <= lastTs) ts = lastTs + 1;   // 타임스탬프는 반드시 증가해야 한다
      lastTs = ts;

      // 같은 영상 프레임을 반복해서 넣으면 VIDEO 모드의 트래킹 상태가 흐트러진다.
      // 카메라가 새 프레임을 준 경우에만 추론하고, 그 사이엔 직전 결과를 재사용한다.
      // 영상 프레임이 아직 준비되지 않았는데 추론을 호출하면 내부에서 ROI가
      // NaN이 되어 그래프가 영구히 깨진다. 준비된 프레임에서만 추론한다.
      const frameReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;

      // 일부 브라우저는 MediaStream 재생 중에도 currentTime을 갱신하지 않는다.
      // 그것만 믿으면 첫 프레임 이후 추론이 영영 멈추므로, 벽시계로도 한 번씩 풀어준다.
      const advanced = video.currentTime !== lastVideoTimes.__frame;
      const overdue = ts - (lastVideoTimes.__at ?? -1e9) > 40;
      const fresh = frameReady && (advanced || overdue);
      if (fresh) {
        lastVideoTimes.__frame = video.currentTime;
        lastVideoTimes.__at = ts;
      }

      // 모델별로 추론하고 결과를 캐싱한다. 실패해도 직전 결과를 유지해 화면이 흔들리지 않는다.
      const detectOf = (kind) => {
        if (frameReady && (fresh || !lastResults[kind])) {
          const res = runDetect(kind, tasks[kind], ts);
          if (res) lastResults[kind] = res;
        }
        return lastResults[kind] ?? {};
      };

      try {
        if (effect === "coffee") {
          const hands = detectOf("hand");
          const face = detectOf("face");
          reportDetection(hands.landmarks?.length ?? 0, "손");
          coffee.draw(ctx, video, W, H, hands, face, FaceLandmarker, ts);
        } else if (effect === "melody") {
          const hands = detectOf(MAIN);
          reportDetection(hands.landmarks?.length ?? 0, "손");
          melody.draw(ctx, video, W, H, hands, ts);
        } else {
          const tips = fingertipsOf(detectOf(MAIN), W, H);
          reportDetection(tips.length, "검지");
          saveGame.draw(ctx, video, W, H, tips, ts);
        }
      } catch (err) {
        // 여기서 조용히 넘어가면 화면이 원본 영상과 효과 사이에서 깜빡이기만 하고
        // 원인을 알 수 없다. 폰에서도 보이도록 화면에 남긴다.
        if (!loopError) {
          loopError = true;
          console.error(`렌더 오류 [${effect}]`, err);
        }
        ctx.drawImage(video, 0, 0, W, H);
      }
    }

    requestAnimationFrame(loop);
  }

  /* ── 녹화 (효과가 합성된 캔버스를 그대로 저장) ───────── */

  let recorder = null;
  let starting = false;
  let recStart = 0;
  let recTimer = null;

  function pickMimeType() {
    // mp4를 먼저 고른다. webm/opus는 윈도우·맥 기본 플레이어에서 소리가 나지 않거나
    // 파일이 아예 열리지 않는 경우가 많다.
    const candidates = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  async function startRecording() {
    const stream = canvas.captureStream(30);

    // 바깥 소리는 모두 효과음과 같은 출력에 섞는다
    // (MediaRecorder는 오디오 트랙을 하나만 담는다)
    if (el.withTabAudio?.checked) {
      try {
        await attachTabAudio();
      } catch (err) {
        console.warn("탭 소리 사용 불가:", err);
        note(err.name === "NotAllowedError"
          ? "화면 공유를 취소하여 읽어주는 음성 없이 녹음합니다"
          : `읽어주는 음성 없이 녹음합니다 — ${err.message || err.name}`);
      }
    }

    if (el.withAudio.checked) {
      try {
        await attachMic();
      } catch (err) {
        console.warn("마이크 사용 불가:", err);
        note(`마이크를 쓸 수 없어 효과음만 녹음합니다 (${err.name || "오류"})`);
      }
    }

    // 실로폰·효과음이 영상에 함께 담기도록 앱 소리를 실어보낸다
    for (const t of recordStream().getAudioTracks()) stream.addTrack(t);

    const mimeType = pickMimeType();
    // onstop은 stopRecording()이 recorder를 비운 뒤에 실행되므로 지역 변수로 캡처한다.
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const parts = [];
    recorder = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) parts.push(e.data);
    };

    rec.onstop = () => {
      const type = rec.mimeType || "video/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      // 캔버스 트랙만 정리한다. 효과음 출력은 다음 녹화에서도 계속 쓴다.
      stream.getVideoTracks().forEach((t) => t.stop());
      detachMic();
      detachTabAudio();
      if (parts.length) {
        download(new Blob(parts, { type }), `artwork-${effect}-${stamp()}.${ext}`);
      }
    };

    rec.start();
    recStart = Date.now();
    el.recDot.hidden = false;
    recTimer = setInterval(() => {
      const s = Math.floor((Date.now() - recStart) / 1000);
      el.recTime.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }, 250);

    el.btnRec.textContent = "■";
    el.btnRec.classList.add("recording");
  }

  function stopRecording() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorder = null;
    clearInterval(recTimer);
    el.recDot.hidden = true;
    el.recTime.textContent = "0:00";
    el.btnRec.textContent = "⏺";
    el.btnRec.classList.remove("recording");
  }

  async function toggleRecording() {
    if (recorder) return stopRecording();
    if (starting) return;               // 마이크 권한 대기 중 중복 클릭 방지
    starting = true;
    try {
      await startRecording();
    } catch (err) {
      console.error(err);
      setStatus(`녹화 실패: ${err.message}`);
    } finally {
      starting = false;
    }
  }

  function takeSnapshot() {
    canvas.toBlob((blob) => {
      if (blob) download(blob, `artwork-${effect}-${stamp()}.png`);
    }, "image/png");
  }

  el.btnRec.addEventListener("click", toggleRecording);
  el.btnShot.addEventListener("click", takeSnapshot);

  /* ── 설정 팝오버 ─────────────────────────────────────── */

  function togglePop(open = el.pop.hidden) {
    el.pop.hidden = !open;
    el.btnMore.classList.toggle("is-on", open);
  }

  el.btnMore.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePop();
  });

  // 바깥을 누르거나 Esc를 누르면 닫는다
  el.pop.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => togglePop(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.pop.hidden) togglePop(false);
  });

  /* ── 몰입 모드 ───────────────────────────────────────── */

  async function enterImmersive() {
    try {
      await (viewer.requestFullscreen?.() ?? viewer.webkitRequestFullscreen?.());
    } catch (err) {
      setStatus(`전체 화면 전환 실패: ${err.message}`);
    }
  }

  function exitImmersive() {
    (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.())?.catch?.(() => {});
  }

  el.btnImmersive.addEventListener("click", () => {
    document.fullscreenElement ? exitImmersive() : enterImmersive();
  });

  // 조작이 없으면 컨트롤을 숨겨 작품만 남긴다
  let idleTimer = null;
  function wake() {
    viewer.classList.remove("idle");
    clearTimeout(idleTimer);
    if (document.fullscreenElement) {
      idleTimer = setTimeout(() => viewer.classList.add("idle"), 3500);
    }
  }

  for (const evt of ["pointermove", "pointerdown", "keydown"]) {
    viewer.addEventListener(evt, wake);
  }

  document.addEventListener("fullscreenchange", () => {
    const on = !!document.fullscreenElement;
    el.btnImmersive.title = on ? "몰입 모드 종료" : "몰입 모드 (전체 화면)";
    el.btnImmersive.classList.toggle("is-on", on);
    wake();
  });
}
