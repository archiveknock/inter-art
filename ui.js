// 작품 페이지의 화면을 만든다.
//
// 작품마다 페이지가 따로 있지만 화면 구성은 모두 같다. 페이지마다 같은 마크업을
// 베껴 두면 한 곳을 고칠 때 네 곳을 고쳐야 하므로, 여기서 한 번만 만든다.

import { WORKS } from "./works.js";

export function mount(fxId) {
  const work = WORKS[fxId];
  if (!work) throw new Error(`알 수 없는 작품: ${fxId}`);

  document.title = `${work.name} · Interactive Art`;
  document.body.className = "app";
  document.body.innerHTML = `
    <header>
      <a class="back" href="index.html">← 작품 목록</a>
      <div class="who">
        <b>${work.icon} ${work.name}</b>
        <span>${work.tag}</span>
      </div>
    </header>

    <main>
      <section class="viewer" id="viewer">
        <div class="stage" id="stage">
          <video id="video" autoplay playsinline muted></video>
          <canvas id="canvas"></canvas>
          <div id="status" class="status">아래 카메라 켜기를 누르면 시작합니다</div>
          <div id="recDot" class="rec-dot" hidden><span></span><b id="recTime">0:00</b></div>
          <div id="detect" class="detect" hidden></div>
        </div>

        <p id="note" class="diag" hidden></p>

        <!-- 설명은 data-tip으로 단다. 브라우저 기본 툴팁은 1초쯤 기다려야 뜨고
             생김새도 페이지와 따로 논다. -->
        <div id="bar" class="bar">
          <button id="btnStart" class="ficon primary" data-tip="웹캠 켜기" aria-label="웹캠 켜기">🎥</button>
          <button id="btnRec" class="ficon" data-tip="녹화" aria-label="녹화" disabled>⏺</button>
          <button id="btnShot" class="ficon" data-tip="이미지로 저장" aria-label="이미지로 저장" disabled>📷</button>
          <i class="fsep"></i>
          <button id="btnGpu" class="ficon toggle" data-tip="GPU 가속" aria-label="GPU 가속" aria-pressed="true">⚡</button>
          <button id="btnImmersive" class="ficon" data-tip="몰입 모드" aria-label="몰입 모드 (전체 화면)">⛶</button>
        </div>
      </section>
    </main>`;

  const $ = (id) => document.getElementById(id);
  return {
    work,
    video: $("video"), canvas: $("canvas"), stage: $("stage"), viewer: $("viewer"),
    statusEl: $("status"), recDot: $("recDot"), recTime: $("recTime"), detectEl: $("detect"),
    btnStart: $("btnStart"), btnRec: $("btnRec"), btnShot: $("btnShot"),
    btnGpu: $("btnGpu"), btnImmersive: $("btnImmersive"),
    noteEl: $("note"),
  };
}
