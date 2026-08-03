// 작품 목록 — 메인 페이지와 각 작품 페이지가 함께 쓴다.
//
// 작품마다 페이지가 하나씩 있어 주소로 바로 들어갈 수 있다.
// id는 효과 이름이자 저장 파일 이름에 쓰인다.

export const WORKS = {
  save: {
    name: "저장 버튼 누르기 챌린지",
    icon: "💾",
    page: "save.html",
    tag: "달아나는 Save 버튼을 검지로 눌러 보세요",
    tasks: ["hand"],
  },
  melody: {
    name: "손가락 멜로디",
    icon: "🎵",
    page: "melody.html",
    tag: "손끝을 엄지에 맞대면 실로폰이 울립니다",
    tasks: ["hand"],
  },
  coffee: {
    name: "커피콩 받기",
    icon: "☕",
    page: "coffee.html",
    tag: "주먹을 쥐면 머그컵을 잡습니다",
    tasks: ["hand", "face"],   // 눈 효과에 얼굴 모델이 필요하다
  },
};
