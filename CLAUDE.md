# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Branch Workflow

**Two branches, two releases. `dev` is the preview; `main` is production.**

| Branch | Deploys to | Purpose |
|---|---|---|
| `dev` | GitHub Pages (`archiveknock.github.io/inter-art/`) | Preview build — where changes are checked |
| `main` | Downstream systems | Real release |

Development:
- All work happens on `dev`. Commit and push there.
- Never commit directly to `main`.
- If you find yourself on `main`, switch to `dev` before making changes.
- **Pushing `dev` publishes the preview site.** It is live and public, not a private
  branch — don't push half-finished work expecting it to stay unseen.

Production release (`dev` → `main`):
- Merging into `main` triggers the real release and connects to other systems.
  Perform it ONLY when the user explicitly asks.
- Don't merge because a task looks finished, tests pass, or a feature seems complete.
  "It works on the preview" is not the same as "release it."
- When asked to release: verify `dev` is pushed and clean, merge `dev` → `main`,
  push `main`, then return to `dev`.

GitHub Pages configuration (don't change without being asked):
- Pages source branch is `dev`. The `github-pages` environment has a deployment
  branch policy allowing `dev` only — `main` is deliberately rejected there.
- If a deploy fails with "Branch is not allowed to deploy to github-pages", the
  Pages source and that branch policy have drifted apart. Fix the source, not the policy.
- `.nojekyll` at the repo root keeps Pages from running Jekyll. Leave it in place.

## 6. Tone & Voice

**Audience: graphic designers and video editors. Korean, all user-facing text.**

The works are jokes about this audience's daily frustrations — failed saves,
render errors at 99%, client revision requests, caffeine dependency. The humor
only lands if the writing sounds like someone who has lived it.

Write like a peer, not a vendor:
- Plain 합니다체. No 해요체, no exclamation marks in UI copy.
- Their vocabulary, untranslated: 렌더링, 시퀀스, 프리뷰, 레이어, 마스킹, 키프레임,
  컴포지션, 소스, 서브밀리언. Don't explain what a designer already knows.
- The joke is deadpan. State the absurd thing flatly — "이 프로그램이 응답하지
  않습니다", "저번 버전이 더 좋은 것 같아요." Never wink at it or add "ㅋㅋ".

Avoid:
- Marketing voice — "지금 바로", "놀라운", "완벽한", "특별한 경험".
- Cutesy padding — emoji mid-sentence, "~해보세요!", 물결표.
- Tech-support register — "오류가 발생하였습니다" over "렌더링 실패".
- Over-explaining. If a designer would find it obvious, cut the sentence.

Reference the existing copy before writing new text. `pray.js` (진행률·결과 창),
`index.html` (카드 문안), and `README.md` set the register — match them rather
than inventing a new voice.

UI text specifics:
- Buttons and labels: short noun or verb phrase. "카메라 켜기", not "카메라를 켜주세요".
- Error messages state what happened and what to do, in that order, one line.
- Titles inside artworks are part of the joke; body UI outside them stays neutral.

## 7. Component Look — macOS

**System chrome — alerts, dialogs, sheets, system controls — follows macOS.**
The audience works in Mac-based studios; Mac chrome reads as "my machine" and
makes the joke land as their own screen, not a stock error.

**Exception: chrome that belongs to a specific app imitates that app instead.**
When a work is about Premiere, After Effects, or Photoshop failing, the panel
inside it should look like that app — Adobe's dark UI, its accent blue, its
`hh:mm:ss` monospace timers — not like a macOS system dialog. An editor
recognizes the encode window, and that recognition is the joke.
`pray.js` `drawProgress` is the reference: a Premiere export panel. Its result
alert, which pops on top, stays macOS. Follow the same split elsewhere —
in-app panel takes the app's look, the alert over it stays system-native.

Button order and emphasis (the part most often gotten wrong):
- Confirming action goes on the **right**, and is the filled blue default.
- Cancel/dismiss sits to its **left**, plain grey.
- This is the reverse of Windows. Existing dialogs still use Windows order
  (`save.js` `["프로그램 닫기", "기다리기"]`, `pray.js` `["다시 시도", "무시"]`) —
  flip them when you next touch those files.
- Destructive defaults are red, not blue.

Window and dialog form:
- Alerts are centered, no title bar, and carry no close button. Do not draw a
  `✕` — `save.js` currently does; drop it when reworking that dialog.
- Traffic lights (red/yellow/green, top-left) belong only on windows that are
  pretending to be real app windows, never on alerts.
- Corner radius is generous (about 12–16px at 1x). Panels are near-white
  (`#ececec`–`#f5f5f5`) with a soft drop shadow, not a hard border.
- Icon sits top-center or upper-left of the message, title bold below/beside it,
  explanatory line smaller and grey underneath.

Controls:
- Progress: thin rounded track, blue fill. Indeterminate work uses the barber-pole
  stripe or a spinner, never a fake percentage.
- Spinner is the 8-spoke rotating gear, not a rotating arc.
- Toggles are pill-shaped switches; checkboxes are small rounded squares with a
  white check on blue.
- System blue is `#007aff`; destructive red `#ff3b30`.

Keep it recognizable, not pixel-exact. These are canvas drawings inside an
artwork — enough cues that a Mac user reads it instantly is the bar.

