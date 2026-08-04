<div align="center">

# 🎨 Interactive Art

**웹캠으로 손과 얼굴의 움직임을 인식해 반응하는 인터랙티브 아트웍**

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

작품은 하나씩 공개합니다.

<table>
<tr>
<td width="60" align="center">🙏</td>
<td><b>렌더링 성공 기도하기</b> · <code>/pray.html</code><br>
웹캠을 켜면 인코딩이 혼자 돌기 시작합니다. 다만 기어가는 속도라 남은 시간은 계속 불어납니다.<br>
<b>두 손을 모으면</b> 그제야 제 속도가 나고 남은 시간이 줄어듭니다.<br>
99%에 닿으면 남은 시간 싸움입니다 — 끝까지 빌면 완료, 손을 놓으면 도로 늘어나다 <b>에러</b>.</td>
</tr>
</table>

## 🎬 저장

화면에 표시되는 결과를 그대로 저장할 수 있습니다.

| 형식 | 방식 |
|:---:|---|
| 🎥 **영상** | 효과음과 함께 `mp4`로 녹화합니다 |
| 📸 **이미지** | `png` 형식의 정지 이미지로 저장합니다 |

녹화 표시등과 인식 상태 배지는 화면 요소이므로 저장된 결과에는 포함되지 않습니다.

## 📖 이용 방법

작품 화면의 조작은 아래 **툴바**에 모여 있습니다.

| 단추 | 하는 일 |
|:---:|---|
| 🎥 | 웹캠 켜기 · 끄기 |
| ⏺ | 녹화 |
| 📷 | 이미지로 저장 |
| ⚡ | GPU 가속 켜기 · 끄기 |
| ⛶ | 몰입 모드 (전체 화면) |

| 단계 | 내용 |
|:---:|---|
| 1️⃣ | 메인 페이지에서 작품을 선택합니다. |
| 2️⃣ | **웹캠(🎥)** 을 켜고 카메라 사용 권한을 허용합니다.<br>최초 실행 시 인식 모델을 내려받습니다. |
| 3️⃣ | 손이나 얼굴을 화면에 충분히 크게 비춥니다.<br>화면 오른쪽 위에 인식 상태가 표시됩니다. |
| 4️⃣ | 필요에 따라 **녹화(⏺)** 또는 **캡처(📷)** 로 결과를 저장합니다. |

📱 스마트폰에서도 동일하게 동작합니다.

## 🔧 손이나 얼굴이 인식되지 않을 때

| 방법 | 설명 |
|---|---|
| **GPU 가속(⚡)을 끕니다** | 일부 기기는 GPU 연산이 결과를 돌려주지 않습니다. 느려지지만 인식은 됩니다.<br>이런 사례가 잦은 모바일에서는 처음부터 꺼진 채로 시작하며, 선택한 값은 다음 방문에도 유지됩니다. |
| **맥이라면 사파리로 엽니다** | 크롬에서 인식이 불안정한 경우 사파리 쪽이 안정적입니다. |
| **더 크게, 밝은 곳에서 비춥니다** | 손이나 얼굴이 화면 안에 다 들어와야 합니다. 손은 손바닥이 웹캠을 향하게 폅니다. |
| **인앱 브라우저는 피합니다** | 카카오톡·인스타그램 안에서 열었다면 기본 브라우저로 다시 엽니다. |

## 🛠️ 기술 구성

- **[MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision) 1.0.1** — `HandLandmarker`, `FaceLandmarker` (CDN에서 ESM으로 로드)
- **브라우저 표준 API** — `getUserMedia`, Canvas 2D, `canvas.captureStream()`, `MediaRecorder`, Web Audio
- 프레임워크 및 번들러를 사용하지 않으며, 별도의 서버를 요구하지 않습니다.

| 파일 | 역할 |
|---|---|
| 🏠 `index.html` · `home.css` | 메인 페이지 (작품 목록) |
| 📄 `pray.html` | 작품 페이지 |
| 🗂️ `works.js` | 작품 목록 정보 (이름·아이콘·필요한 모델) |
| 🧱 `ui.js` | 작품 화면 구성 (무대·툴바) |
| ⚙️ `app.js` | 웹캠 제어, 모델 로딩, 렌더 루프, 녹화 및 저장 |
| 🙏 `pray.js` | 렌더링 성공 기도하기 (합장 판정, 인코딩 창, 결과 창) |
| 🔭 `view.js` | 미러링과 화면 배율을 한곳에서 관리 |
| 🔊 `audio.js` | 효과음 출력과 녹화용 오디오 합성 |
| 🎨 `style.css` | 작품 화면 스타일 |

작품마다 페이지가 하나씩 있으며, 화면 구성은 `ui.js`가 한 번만 만들어 페이지마다 같은
마크업을 두지 않습니다. 인식 모델(손 7.8MB)은 작품을 처음 실행할 때만 내려받습니다.

준비 중인 작품의 파일(`save.*` `undo.*` `coffee.*`)도 저장소에 함께 있습니다. 공개할 때
`works.js`에 항목을 되살리고 `app.js`에서 불러오면 됩니다.

---

<div align="center">

**제작 · archiveknock**

</div>
