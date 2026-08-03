// 화면 배율 — 카메라를 뒤로 물리는 대신 그림을 줄여 멀어져 보이게 한다.
//
// 웹캠은 화각이 고정이라 더 넓게 담을 수 없다. 대신 화면 전체를 가운데로
// 모아 줄이면 사람이 뒤로 물러난 것처럼 보인다. 줄어든 바깥은 여백으로 남는다.
//
// 각 작품은 영상 원본 좌표(0~W, 0~H)로 계산하고, 글자처럼 뒤집히면 안 되는 것만
// 미러를 풀고 화면 좌표로 그린다. 배율은 그 두 좌표계 사이에 함께 얹혀야 하므로
// 변환을 이곳 한곳에 모아 둔다.

export const view = { zoom: 1 };

/** 작품이 그리기 시작할 때의 기본 변환 — 셀피 미러링 + 배율 */
export function base(ctx, W, H) {
  const z = view.zoom;
  ctx.setTransform(-z, 0, 0, z, (W * (1 + z)) / 2, (H * (1 - z)) / 2);
}

/** 영상 좌표 → 화면 좌표 (미러 해제) */
export function sx(x, W) {
  const z = view.zoom;
  return (W * (1 + z)) / 2 - z * x;
}

export function sy(y, H) {
  const z = view.zoom;
  return (H * (1 - z)) / 2 + z * y;
}

/** 길이(반지름·글자 크기 등)에 배율을 먹인다 */
export function len(v) {
  return v * view.zoom;
}
