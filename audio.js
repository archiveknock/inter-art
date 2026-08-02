// 소리를 한곳에서 관리한다.
//
// 효과음은 스피커로 나가는 동시에 녹화용 출력으로도 흘려보내야 영상에 함께 담긴다.
// 마이크를 켜면 같은 녹화용 출력에 섞어, 오디오 트랙 하나로 내보낸다.
// (MediaRecorder는 오디오 트랙을 하나만 담기 때문에 미리 섞어야 한다.)
//
//        효과음 ─┬─▶ 스피커
//                └─▶ 녹화 출력 ◀─ 마이크
//
// 마이크를 스피커로 보내지 않는 이유는 하울링을 막기 위해서다.
//
// 글자를 읽어 주는 음성만은 이 그림에 들어오지 못한다. 브라우저가 소리를
// 스피커로 바로 내보내고 오디오 경로를 내주지 않기 때문이다. 그 소리까지
// 담아야 할 때는 탭 소리를 통째로 받아 온다(attachTabAudio).

let ctx = null;
let master = null;   // 효과음이 모이는 지점
let dest = null;     // 녹화용 출력
let micStream = null;
let micNode = null;
let tabStream = null;
let tabNode = null;

/** 공용 AudioContext. 처음 필요할 때 만든다. */
export function ac() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** 효과음을 연결할 지점 */
export function fxOut() {
  if (!master) {
    const a = ac();
    master = a.createGain();
    master.gain.value = 1;
    master.connect(a.destination);
  }
  return master;
}

/** 녹화에 실을 오디오 스트림 (효과음 + 켜져 있으면 마이크)
 *
 *  소리가 한동안 없으면 브라우저가 오디오 처리를 쉬게 두고, 그러면 녹화의
 *  오디오 트랙이 그 지점에서 끊긴다. 영상만 계속 이어지니 파일을 열면 소리와
 *  화면이 어긋난다. 그래서 들리지 않을 만큼 작은 소리를 계속 흘려 보내
 *  오디오가 멈추지 않게 붙잡아 둔다. */
export function recordStream() {
  if (!dest) {
    const a = ac();
    dest = a.createMediaStreamDestination();
    fxOut().connect(dest);

    const keep = a.createConstantSource();
    keep.offset.value = 1e-5;   // 사람 귀에는 완전한 무음이다
    keep.connect(dest);
    keep.start();
  }
  return dest.stream;
}

/** 마이크를 녹화 출력에 섞는다. 실패하면 예외를 그대로 올린다. */
export async function attachMic() {
  if (micStream) return;
  const a = ac();
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  micNode = a.createMediaStreamSource(micStream);
  micNode.connect(recordStream() && dest);   // 스피커로는 보내지 않는다
}

export function detachMic() {
  try { micNode?.disconnect(); } catch { /* 무시 */ }
  micStream?.getTracks().forEach((t) => t.stop());
  micNode = null;
  micStream = null;
}

/** 이 브라우저가 탭 소리 녹음을 지원하는가 */
export function canCaptureTab() {
  return typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

/** 탭에서 나는 소리를 통째로 녹화 출력에 싣는다.
 *
 *  글자를 읽어 주는 음성은 브라우저가 스피커로 바로 내보낼 뿐 오디오 경로를
 *  내주지 않아 직접 가져올 수 없다. 대신 탭 소리를 통째로 받아 오면 그 안에
 *  음성이 들어 있다. 이때 효과음도 함께 들어오므로 효과음을 따로 섞던 연결은
 *  끊어 두 번 겹치지 않게 한다. */
export async function attachTabAudio() {
  if (tabNode) return;
  if (!canCaptureTab()) throw new Error("이 브라우저는 탭 소리 녹음을 지원하지 않습니다");

  const a = ac();
  // 영상 없이 소리만 요구하면 브라우저가 거절하므로 영상도 함께 받고 곧바로 버린다
  const shared = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
    preferCurrentTab: true,   // 공유 창에서 이 탭이 먼저 보이도록
  });
  const audio = shared.getAudioTracks();
  if (!audio.length) {
    shared.getTracks().forEach((t) => t.stop());
    throw new Error("공유 창에서 ‘탭 오디오 공유’를 함께 선택해 주세요");
  }
  shared.getVideoTracks().forEach((t) => t.stop());

  tabStream = shared;
  tabNode = a.createMediaStreamSource(new MediaStream(audio));
  recordStream();
  tabNode.connect(dest);
  try { fxOut().disconnect(dest); } catch { /* 연결이 없으면 그만 */ }
}

export function detachTabAudio() {
  if (!tabNode) return;
  try { tabNode.disconnect(); } catch { /* 무시 */ }
  tabStream?.getTracks().forEach((t) => t.stop());
  tabNode = null;
  tabStream = null;
  if (dest) fxOut().connect(dest);   // 효과음을 다시 직접 싣는다
}
