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

        <!-- 설정은 평소에 숨겨 두고 톱니 단추로 꺼낸다 -->
        <div id="pop" class="pop" hidden>
          <label class="field range">
            화면 배율 <span class="for" id="zoomVal">100%</span>
            <input id="zoom" type="range" min="0.5" max="1" step="0.05" value="1" />
            <span class="hint">줄일수록 뒤로 물러난 것처럼 보입니다</span>
          </label>

          <label class="check"><input id="withAudio" type="checkbox" /> 마이크 소리 함께 녹음</label>
          <label class="check" id="tabAudioField" hidden>
            <input id="withTabAudio" type="checkbox" /> 읽어주는 음성까지 녹음
          </label>
          <label class="check"><input id="cpuMode" type="checkbox" /> GPU 가속 끄기</label>

          <p class="note">
            음성까지 녹음하려면 공유 창에서 <b>이 탭</b>과 <b>탭 오디오 공유</b>를 선택하세요.
          </p>
          <p class="note">영상은 기기 안에서만 처리되며 서버로 전송되지 않습니다.</p>
          <p id="note" class="diag" hidden></p>
        </div>

        <div id="bar" class="bar">
          <button id="btnStart" class="pill primary">카메라 켜기</button>
          <button id="btnRec" class="ficon" title="녹화" disabled>⏺</button>
          <button id="btnShot" class="ficon" title="스냅샷" disabled>📷</button>
          <i class="fsep"></i>
          <button id="btnMore" class="ficon" title="설정">⚙</button>
          <button id="btnImmersive" class="ficon" title="몰입 모드 (전체 화면)">⛶</button>
        </div>
      </section>
    </main>`;

  const $ = (id) => document.getElementById(id);
  return {
    work,
    video: $("video"), canvas: $("canvas"), stage: $("stage"), viewer: $("viewer"),
    statusEl: $("status"), recDot: $("recDot"), recTime: $("recTime"), detectEl: $("detect"),
    btnStart: $("btnStart"), btnRec: $("btnRec"), btnShot: $("btnShot"),
    btnMore: $("btnMore"), btnImmersive: $("btnImmersive"), pop: $("pop"),
    zoomEl: $("zoom"), zoomVal: $("zoomVal"),
    withAudio: $("withAudio"), withTabAudio: $("withTabAudio"),
    tabAudioField: $("tabAudioField"), cpuModeEl: $("cpuMode"), noteEl: $("note"),
  };
}
