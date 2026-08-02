<div align="center">

# 🎨 Interactive Art

**웹캠으로 손과 얼굴의 움직임을 인식하여 반응하는 브라우저 기반 인터랙티브 아트 모음**

[![Live Demo](https://img.shields.io/badge/▶_작품_보기-archiveknock.github.io-22d3ee?style=for-the-badge)](https://archiveknock.github.io/inter-art/)

[![MediaPipe](https://img.shields.io/badge/MediaPipe-Tasks_Vision_1.0.1-0097A7?style=flat-square&logo=google)](https://ai.google.dev/edge/mediapipe/solutions/vision)
![No Build](https://img.shields.io/badge/빌드_도구-불필요-4ade80?style=flat-square)
![No Server](https://img.shields.io/badge/서버-불필요-4ade80?style=flat-square)
![On Device](https://img.shields.io/badge/영상_처리-기기_내부-a78bfa?style=flat-square)

별도의 설치나 계정 없이 웹 주소를 여는 것만으로 이용할 수 있습니다.

</div>

---

> 🔒 **개인정보 보호**
> 카메라 영상은 **이용자의 기기 안에서만 처리**되며, 서버로 전송되거나 저장되지 않습니다.
> 모든 인식 연산은 방문자의 브라우저에서 수행됩니다.

## 🖐️ 수록 작품

<table>
<tr>
<td width="60" align="center">🪳</td>
<td><b>바퀴벌레 잡기</b><br>
화면을 돌아다니는 바퀴벌레를 <b>검지 끝</b>으로 눌러 잡습니다.<br>
손가락이 가까이 가면 반대 방향으로 달아납니다.</td>
</tr>
<tr>
<td align="center">💬</td>
<td><b>손가락 메시지</b><br>
여덟 손가락에 글자가 한 자씩 배정됩니다.<br>
손끝을 <b>입술</b>에 가져가면 해당 글자를 음성으로 읽어 줍니다.</td>
</tr>
<tr>
<td align="center">🎵</td>
<td><b>손가락 멜로디</b><br>
여덟 손가락에 <b>도–레–미–파–솔–라–시–도</b>를 배정합니다.<br>
손끝을 <b>엄지</b>에 맞대면 실로폰 소리가 납니다.</td>
</tr>
</table>

## 🎬 저장

화면에 표시되는 결과를 그대로 저장할 수 있습니다.

| 형식 | 방식 |
|:---:|---|
| 🎥 **영상** | 효과음과 함께 `mp4`로 녹화합니다. 마이크 음성도 함께 담을 수 있습니다 |
| 📸 **이미지** | `png` 형식의 정지 이미지로 저장합니다 |

녹화 표시등과 인식 상태 배지는 화면 요소이므로 저장된 결과에는 포함되지 않습니다.

🔊 손가락 메시지에서 글자를 읽어 주는 음성은 브라우저 음성 합성이 오디오 경로를 제공하지
않아 그대로는 녹화에 담기지 않습니다. **고급 설정 › 읽어주는 음성까지 녹음**을 선택하면
녹화 시작 시 화면 공유 창이 열리며, **이 탭**을 지정하고 **탭 오디오 공유**를 함께 선택하면
음성까지 저장됩니다. 이 기능을 지원하는 데스크톱 브라우저에서만 표시됩니다.

## 📖 이용 방법

| 단계 | 내용 |
|:---:|---|
| 1️⃣ | **카메라 켜기**를 누르고 카메라 사용 권한을 허용합니다.<br>최초 실행 시 인식 모델을 내려받습니다. |
| 2️⃣ | 원하는 작품을 선택합니다. |
| 3️⃣ | 손을 화면에 충분히 크게 비춥니다.<br>화면 오른쪽 위에 인식 상태가 표시됩니다. |
| 4️⃣ | 필요에 따라 **녹화 시작** 또는 **스냅샷 PNG**로 결과를 저장합니다. |

📱 스마트폰에서도 동일하게 동작합니다.

✏️ 손가락 메시지에 표시할 문구는 우측 입력란에서 변경할 수 있으며, 공백을 제외한 여덟 글자가
손가락에 한 자씩 배정됩니다. 기본값인 `I LOVE YOU`가 공백을 제외하고 정확히 여덟 글자입니다.

⚙️ 인식이 원활하지 않을 경우 **GPU 가속 끄기**를 선택해 주십시오. 일부 환경에서 GPU 연산
경로가 결과를 반환하지 못하는 사례가 있어 CPU 연산으로 전환할 수 있도록 하였습니다.

## 🛠️ 기술 구성

- **[MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision) 1.0.1** — `HandLandmarker`, `FaceLandmarker` (CDN에서 ESM으로 로드)
- **브라우저 표준 API** — `getUserMedia`, Canvas 2D, `canvas.captureStream()`, `MediaRecorder`, Web Audio, Speech Synthesis
- 프레임워크 및 번들러를 사용하지 않으며, 별도의 서버를 요구하지 않습니다.

| 파일 | 역할 |
|---|---|
| 📄 `index.html` | 캔버스 및 조작 화면 |
| ⚙️ `app.js` | 카메라 제어, 모델 로딩, 렌더 루프, 녹화 및 저장 |
| 🪳 `roaches.js` | 바퀴벌레 잡기 (이동·도주 로직, 파열 파티클) |
| 🖐️ `fingers.js` | 손가락 메시지 및 손가락 멜로디 |
| 🔊 `audio.js` | 효과음 출력과 녹화용 오디오 합성 |
| 🎨 `style.css` | 화면 스타일 |

인식 모델은 해당 작품을 처음 실행할 때만 내려받습니다(손 7.8MB, 얼굴 3.8MB).
얼굴 모델은 손가락 메시지의 입술 인식에만 사용됩니다.

---

<div align="center">

**제작 · archiveknock**

</div>
