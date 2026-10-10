# UI 실행 로그

2026-10-10 기록. 초기 스냅샷과 최신 보고를 구분한다. 담당자 보고·검증 문서는 해당 범위의 증거이며 최종 통합 검사를 대체하지 않는다.

## 최신 요구 변경 — 세로 핸드폰에서 상단→하단 출력

2026-10-10 사용자 수정: **확인했어요** 이후 가로 회전 요구를 삭제한다. 세로 핸드폰의 상단 발권기에서 가로형 티켓이 위에서 아래로 출력된다. 최대 너비 500px, 6~8초 순차 A-Z 공개와 확인 gate는 유지한다.

- 상태 계약: `printing → complete`, 확인 시 즉시 printing. orientation 구독·landscape 액션·rotate phase·isLandscape prop 제거.
- 단일 출력: 확인 시각 기준 1600ms 종료, 중복 확인과 오래된 run의 reveal/print 타이머 무시, 다시 보기는 새로운 공개 흐름으로 시작. reduced-motion은 확인 후 0ms 완료.
- App의 booting 한정 복원 guard 및 발급 결과/navigate의 startTransition은 보존했다. 기존 `/preview/departure`, `/preview/issuer`와 직접 issuer 진입의 확인 gate도 유지한다.
- 아래 가로 회전·rotate·세로0장 검증과 점수표는 **변경 전 역사적 기록**이다. 최신 세로 출력의 시각·runtime 검증을 대신하지 않는다. 신규 검증 결과는 별도 갱신한다.

## 이전 통합 증거 갱신 — 주요 데모 런타임·최종 자동 검사 통과

이 갱신이 후반의 초기 scorecard/대기 체크표보다 최신이다. 기존 기획·검증 이력은 보존했다. 부모의 5173 제품 QA와 `storybook-quality.md`의 6006 보고를 반영했으며 문서 담당이 브라우저·검사를 재실행한 것은 아니다.

- 제품 입력: 이메일 형식 오류, 미등록 명단 안내, 닉네임 빈 값 오류와 오류 상태 유지 확인 보고. 실제 연결 실패 검증과 구분한다.
- 제품 모달: 확대의 실제 Escape 후 원래 trigger 초점 복귀, 재발급 취소 후 재발급 trigger 초점 복귀 확인 보고.
- 실제 다운로드 PNG: 부모가 `/Users/junhyeok_work/Downloads/gdg-boarding-pass-57275a37-a649-4395-84e4-cece53ca1a7d.png`를 이미지로 직접 열어 티켓만 포함한 ICN→DEL/A03/JASON JEONG/행사정보 및 이메일·버튼 제외를 확인했다. 긴 이름 PNG나 모든 브라우저·사진첩 저장 완료의 증거는 아니다.
- 제품 screenshots: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_Wpk6JRHPnl8TwZqa/artifacts/full-ui` (`landing`, `email-invalid`, `nickname`, `departure-start`, `ticket`, `enlarged`).
- Storybook은 현재37 stories(표현35+App회귀1+실제 App 수동회전1). 대표 320/390/500, 667×375/844×390 CSS viewport의 overflow·버튼 영역·확대 pan/scroll·reduced-motion·root font-size 200% reflow가 `storybook-quality.md`에 있다. 모든 화면/OS zoom/물리 기기 검증으로 확대하지 않는다.
- 수정 readback: grapheme/lowercase 휠, enlarged 글자 크기, h1 tabIndex, onContinue, 제목 우선 focus selector, booting 한정 restore 반영. 참가자 변경 작업 상태는 수정 후 부모의 기존 DEL 복원/미사용 재발급 표시로 재검증했다.
- P1 회귀의 두 원인: bootstrap의 navigate dependency로 반복 restore하던 문제와 urgent setTicket commit/deferred router navigation 사이 `/nickname`+hasTicket guard 경쟁을 구분했다. 첫 원인은 booting guard, 두 번째는 결과 상태와 navigate를 동일 startTransition으로 묶어 수정했다. 수정 후 동일 Storybook AppFlow **21 steps Pass**와 부모 실제5173 신규 flow를 확인했다. 이전 실패는 이력으로 유지하며 수정 결과와 구분한다.
- 부모 신규 flow: guest@gdg.example → 신규 발급 → /departure → 약7초 후 확인 대기 유지 → 확인 → /issuer 세로 회전 안내. /ticket 직접 접근은 회전 검증과 분리해 브라우저 history로 탐색했으므로 이 증거를 가로 출력 완료까지 통과한 것으로 확대하지 않는다.
- 부모 재발급/복원: FCO→ATH 변경, A03 gate 유지, 재발급1회 소진, 새로고침 ATH 복원 확인. 이어 member@gdg.example 재확인에서 기존 DEL 티켓 복원 및 미사용 재발급 표시가 정상인 것을 확인하여 참가자 변경 P2를 제품 수준에서 재검증했다.
- 최신 frontend 단위 검사 보고: `bun test` 21 pass / 244 assertions. 수치만으로 App/browser 회귀를 대체하지 않는다.
- 부모 최종 자동 검사 보고: `bun run check`(format/ESLint/TypeScript), `bun run build`, `bun run build-storybook`(37stories) 모두 exit0. `bun test`21pass244assert는 앞서 통과했다. Storybook Docs/axe chunk-size 경고만 남았고 제품 번들은446.25kB다. 5173 preview와6006 HTTP200, 서버 유지. 이 문서 마지막 갱신은 두 소유 문서의 Prettier 검사로 확인한다.

- 실제 App 출력/회전 최종 검증: 확인 후390×844에서 /issuer rotate/티켓0장. 667×375 가로 출력 시작 이후202/405/606/807/1062ms 가로·세로를 반복해도 /issuer printing, 같은 DOM 티켓1장을 유지했다. 1712ms complete, 2113ms에도 같은1장이며 타이머 재시작 없음. 완료 CTA→/ticket에서 France/CDG/A03/JASON JEONG 일치. `storybook-quality.md`의 실제 hook/route 검증이며 CSS iframe viewport, 물리 회전 센서 검증은 아니다.
- 프리뷰 호환성 최종 검증: 부모가 /preview/departure 샘플NRT→확인→세로rotate→844×390 CSS viewport 변경→/preview/issuer 티켓1장 출력완료, 다시보기→departure재생을 확인했다. /preview/issuer 직접 새 load는 확인 gate를 유지해 departure로 돌아갔다. 직접 확인한 화면은 위 full-ui의 `preview-landscape-complete.png`다.
- 최신 source scan을 독립 담당이 다시 실행했다: src39파일 / 3그룹 / 14hit. TicketIssuer 회전 안내SVG, Tokens 비교목록 일정 간격, 합의된 공항/티켓 mono 모두 intentional이며 confirmed slop 없음. Landing 승인 CTA/문의URL/제거사항과 데모 고지 소스를 대조했다. 생성물은 제외했다.

U4/U6의 **주요 데모 런타임과 프리뷰 호환성 검증은 위 범위에서 통과**. 부모 전역 check/build/Storybook build도 exit0로 확인됐다. 미검증인 전체 실패 경로·실제 폰·API·전체 접근성을 완료로 선언하지 않는다. 점수는 RFC의 엄격한 배점별 잔여 조건을 따라 보류한다.

## 초기 상태 — intake 당시 스냅샷

- 기준 문서: `screen-spec.md`, `design-system.md`, `rfc-ui-completion.md`.
- 로컬 repo에서 AGENTS.md/CLAUDE.md 검색 결과 없음. 대화의 사용자 지침 적용.
- 당시 Git: `main`, 작업 파일은 untracked. 현재 Git 상태 재조회 진술이 아니다. 독립 unit branch/rebase/merge 수행 보고 없음. 기존 작업 보존, commit/push/cleanup 없음.
- 당시 App은 `/`와 `/preview/departure`, `/preview/issuer`를 연결한 고정 샘플 프리뷰였다. 이후 전체 데모 흐름 구현으로 확장되었으며 최신 상태는 아래 표를 따른다.
- 실제 Sheets 정보 없음/Firebase 초기 설정 상태. live 명단·서버 원자성·실배포·물리 기기 검증은 이 로그가 증명하지 않는다.

## 초기 kill-ai-slop scan 및 보고

명령: `node /Users/junhyeok_work/.agents/skills/kill-ai-slop/scripts/scan.mjs /Users/junhyeok_work/code/gdsc-homecomming`

결과: 24파일, 2그룹, 15 hit. taxonomy/detection 및 실제 소스를 읽고 triage했다. UI 수정 전 부모 매니저에게 보고했고 부모가 사용자에게 전달 완료했다. 전체 UI 개선은 사용자 승인 범위이므로 개별 수정 허락을 반복 요청하지 않는다. 이번 담당은 UI 수정 없음.

| 분류 | file:line | 판단과 조치 |
| --- | --- | --- |
| intentional / scanner24 | src/containers/ticket/components/TicketIssuer/TicketIssuer.tsx:148 | circle은 가로 회전 안내 폰의 홈 버튼. 장식 마스코트·가짜 브랜드 아이콘이 아니므로 유지 |
| intentional / scanner34 | src/containers/ticket/components/DepartureReveal/DepartureReveal.tsx:121,179,185,194,202,208 및 TicketIssuer.tsx:37,69,76,91,98 | 공항 패널·티켓 mono는 사용자 확정 컨셉. 코드 전용 mono 규칙으로 삭제하지 않음 |
| confirmed / 수동10 | src/containers/ticket/TicketContainer.tsx:24 | WELCOME ABOARD kicker가 행사 외 새 정보를 주지 않음. 제품 landing 구현 시 제거 |
| confirmed / 임시카피 | src/containers/ticket/TicketContainer.tsx:28-29 | “우리를 다시 만나게 할 여행을 준비하고 있어요.”는 경험·발권 행동이 없는 임시 안내. 승인/기획된 경험 카피와 행사정보로 교체 |
| scope gap / 임시CTA | src/containers/ticket/TicketContainer.tsx:37 | 연출 미리보기는 현재 preview에 적합하지만 제품 입장 CTA가 아님. 전체 흐름에서는 확정 발권하기 사용, 데모 고지 유지 |

charcoal/ivory/Google4색/mono airport panels/종이 shadow/물리 hinge gradient는 intentional 보존한다. one-accent 원칙으로 사용자 확정 팔레트를 삭제하지 않는다. 중첩 카드 등은 실제 렌더 증거 없이 confirmed로 기록하지 않는다. 줄 번호는 초기 scan 시점 기준이며 후속 변경 후 갱신한다.

## Unit scorecards와 통합 큐 — 최종 런타임 보고 반영

| unit | 현재 근거 | 남은 조건 |
| --- | --- | --- |
| U0 | RFC/DAG/AC/소유권 정리 | 제품 점수 대상 아님 |
| U1 | 20국 데모 모델, 최초/재발급/복원/정원/멱등 실패보존 tests 포함21tests244assert 보고 | 실제 운영 API·서버 동시성 아님 |
| U2 | 5화면/티켓/확대/재발급 modal, grapheme·expanded·focus 수정, 부모 Escape/취소 초점복귀와 Storybook CSS viewport 확인 | 모든 제품 viewport·전체 keyboard/a11y·물리기기 미검증 |
| U3 | wheel-review 물리힌지/순차휠/정착, 최신 App 확인대기와 반복회전 동일1장/타이머 유지 통과 | 긴 입력 전체시간과 실제 폰 센서/키보드 미검증 |
| U4 | 신규·재발급·새로고침복원·참가자변경·실제PNG·preview gate/replay, 두 P1 원인 교정 및 AppFlow21stepsPass | 최종 전역검사 통과; 모든 failure integration 경로 미검증 |
| U5 | 37stories, 대표 plays/a11y/CSS viewport/200%reflow/실제 App 수동회전, 기존 정적 build 통과 | 최종 check/build/37stories 정적build 통과 |
| U6 | 부모 실제5173 및 독립 readback·source scan, Storybook 실제 hook/route 증거 | 엄격100점 항목 전부 통과 아님. 아래 잔여 확인 필요 |

증거 출처: 부모 보고, `storybook-quality.md`, `ux-independent-review.md`. 독립 담당은 마지막 source scan/readback만 수행했고 해당 브라우저/runtime 검증을 재실행하지 않았다.

- wheel-review: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_m1ssm1lRMpV85DWu/artifacts/wheel-review`.
- Storybook 대표 viewport·App 회귀/회전: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_FlWiDdT3v7YE8IEB/artifacts/`.
- 부모 제품/preview: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_Wpk6JRHPnl8TwZqa/artifacts/full-ui`.

## U6 범위별 최종 판정과 잔여

| 체크 | 확보된 판정 | 구체 잔여 |
| --- | --- | --- |
| 자동 검사 | 부모최종 check/build/Storybook build exit0,21tests244assert | 소유문서 마지막 갱신 후 Prettier 검사. 자동검사가 실기기/API를 증명하지 않음 |
| 입력 오류 | 제품 형식/미등록/닉네임빈값·입력/오류 유지 | 실제 연결·timeout→조회실패/재시도 제품 integration 미검증 |
| 복원/재발급 | FCO→ATH/게이트유지/1회소진/새로고침ATH, memberDEL 기존복원·미사용표시 | UI의 실패/대안없음·중복 요청·집계 재시도는 stories/service와 실제품 구분 |
| 모션/회전 | 순차휠·약7초대기·확인전출력없음·세로0장·반복회전동일1장·타이머유지·완료CTA 결과일치 | 긴 이름별6~8초 충족/차이 기록, 실제 폰회전 센서 미검증 |
| 프리뷰 | 기존 두URL/replay/직접issuer확인gate·NRT1장 출력 | 통과범위에서 추가 대기 없음 |
| viewport/확대 | Storybook 대표320/390/500,667×375/844×390·상한500·긴값wrap·확대pan | 모든 제품 상태를 모든폭에서 확인한 것은 아님 |
| 텍스트/키보드 | CSS root200%reflow·실제 ESC/trigger복귀 | 브라우저 zoom/OS글자크기·전체Tab/제목focus/스크린리더 알림·실제폰키보드/safe-area 미검증 |
| PNG | 실제 파일을 직접 열어 정상JASON/DEL/A03/행사정보·티켓만 포함 확인 | 긴 이름PNG·저장실패 UI·모바일 다운로드/사진첩 미검증 |
| slop/카피 | 최종src39파일14hit intentional, confirmed없음, 승인 CTA/문의URL/제거사항과 demo 경계 대조 | 전체 시각취향의100점 의미로 확대하지 않음 |

점수: **전체 계산 보류 / 100점 선언 불가**. 상태·모델·대표 CSS viewport·실제 브라우저·물리 기기·운영 API는 서로 다른 증거다. 실제 API와 물리 기기 미검증은 제품 코드의 확정 결함이 아니라 현재 검증/연동 경계다. 최종 전체 실패 integration과 접근성 증거도 아직 부족하므로 임의 배점 합산은 하지 않는다.

## 후속 기록 양식

- unit / 담당 / 소유 파일 / 단계 / 변경 요약
- 실행 명령·interaction·viewport·저장 이미지·접근성 증거 및 결과
- UI 변경 후 scan 결과, confirmed/intentional triage, report-before-fix 기록
- 의존 unit 통과 여부·통합 영향 테스트·남은 위험·rollback
- 평가 항목별 검증 근거와 점수, 실제 API·모바일 기기 미검증 경계
