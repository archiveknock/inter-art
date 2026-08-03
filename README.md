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

메인 페이지에서 고르거나, **주소로 작품에 바로 들어갈 수 있습니다.**

| 작품 | 주소 |
|---|---|
| 💾 저장 버튼 누르기 챌린지 | `/save.html` |
| 🎵 손가락 멜로디 | `/melody.html` |
| ☕ 커피콩 받기 | `/coffee.html` |

<table>
<tr>
<td width="60" align="center">💾</td>
<td><b>저장 버튼 누르기 챌린지</b><br>
<b>Save</b> 버튼이 검지 끝을 피해 달아납니다. 가까이 갈수록 세게 도망갑니다.<br>
기어이 누르면 저장되지 않고 <b>응답 없음</b> 창이 뜹니다.
잠시 뒤 버튼은 새 자리에서 다시 달아납니다.</td>
</tr>
<tr>
<td align="center">🎵</td>
<td><b>손가락 멜로디</b><br>
여덟 손가락에 <b>도–레–미–파–솔–라–시–도</b>를 배정합니다.<br>
손끝을 <b>엄지</b>에 맞대면 실로폰 소리가 납니다.</td>
</tr>
<tr>
<td align="center">☕</td>
<td><b>커피콩 받기</b><br>
머그컵을 잡듯 <b>주먹을 쥐면</b> KNOCK 컵을 손에 쥡니다.<br>
위에서 떨어지는 커피콩을 컵으로 받아내면 <b>눈이 초롱초롱</b>해지고,<br>
놓치면 <b>눈 밑에 다크서클</b>이 짙어집니다. 한 잔을 채울 때마다 잔 수가 올라갑니다.</td>
</tr>
</table>

## 🎬 저장

화면에 표시되는 결과를 그대로 저장할 수 있습니다.

| 형식 | 방식 |
|:---:|---|
| 🎥 **영상** | 효과음과 함께 `mp4`로 녹화합니다. 마이크 음성도 함께 담을 수 있습니다 |
| 📸 **이미지** | `png` 형식의 정지 이미지로 저장합니다 |

녹화 표시등과 인식 상태 배지는 화면 요소이므로 저장된 결과에는 포함되지 않습니다.

## 📖 이용 방법

작품 화면의 조작은 아래 **툴바**에 모여 있습니다. 카메라와 저장, 그리고 **설정(⚙)** 과
**몰입 모드(⛶)** 입니다. 다른 작품으로는 왼쪽 위 **작품 목록**으로 돌아가 고릅니다.

| 단계 | 내용 |
|:---:|---|
| 1️⃣ | 메인 페이지에서 작품을 고릅니다. |
| 2️⃣ | **카메라 켜기**를 누르고 카메라 사용 권한을 허용합니다.<br>최초 실행 시 인식 모델을 내려받습니다. |
| 3️⃣ | 손을 화면에 충분히 크게 비춥니다.<br>화면 오른쪽 위에 인식 상태가 표시됩니다. |
| 4️⃣ | 필요에 따라 **녹화(⏺)** 또는 **스냅샷(📷)** 으로 결과를 저장합니다. |

📱 스마트폰에서도 동일하게 동작합니다.

🔭 카메라는 화각이 고정이라 실제로 뒤로 물러날 수 없습니다. 대신 **설정 › 화면 배율**을
줄이면 화면 전체가 가운데로 모여 뒤로 물러난 것처럼 보입니다. 효과와 손 판정도 같은 배율을
따르며, 선택한 값은 다음 방문에도 유지됩니다.

⚙️ 일부 환경에서 GPU 연산 경로가 결과를 반환하지 못하는 사례가 있어 CPU 연산으로 전환할
수 있도록 하였습니다. 해당 사례가 잦은 모바일에서는 **GPU 가속 끄기**가 기본으로 적용되며,
데스크톱에서는 속도를 위해 GPU 연산을 사용합니다. 인식이 원활하지 않을 경우 이 항목을
조정해 주십시오. 선택한 값은 다음 방문에도 유지됩니다.

## 🛠️ 기술 구성

- **[MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision) 1.0.1** — `HandLandmarker`, `FaceLandmarker` (CDN에서 ESM으로 로드)
- **브라우저 표준 API** — `getUserMedia`, Canvas 2D, `canvas.captureStream()`, `MediaRecorder`, Web Audio, Speech Synthesis
- 프레임워크 및 번들러를 사용하지 않으며, 별도의 서버를 요구하지 않습니다.

| 파일 | 역할 |
|---|---|
| 🏠 `index.html` · `home.css` | 메인 페이지 (작품 목록) |
| 📄 `save.html` `melody.html` `coffee.html` | 작품 페이지 — 주소로 바로 접근 |
| 🗂️ `works.js` | 작품 목록 정보 (이름·아이콘·필요한 모델) |
| 🧱 `ui.js` | 작품 화면 구성 (무대·툴바·설정) |
| ⚙️ `app.js` | 카메라 제어, 모델 로딩, 렌더 루프, 녹화 및 저장 |
| 💾 `save.js` | 저장 버튼 챌린지 (도주 로직, 커서, 응답 없음 창) |
| 🎵 `fingers.js` | 손가락 멜로디 |
| ☕ `coffee.js` | 커피콩 받기 (주먹 판정, 머그컵·커피콩, 눈 효과) |
| 🔭 `view.js` | 화면 배율 — 미러링과 배율을 한곳에서 관리 |
| 🔊 `audio.js` | 효과음 출력과 녹화용 오디오 합성 |
| 🎨 `style.css` | 작품 화면 스타일 |

작품마다 페이지가 하나씩 있으며, 화면 구성은 `ui.js`가 한 번만 만들어 네 곳에 같은
마크업을 두지 않습니다. 인식 모델은 해당 작품을 처음 실행할 때만 내려받습니다
(손 7.8MB, 얼굴 3.8MB). 얼굴 모델은 커피콩 받기의 눈 인식에 사용됩니다.

---

<div align="center">

**제작 · archiveknock**

</div>
