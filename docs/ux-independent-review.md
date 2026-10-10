# 독립 UX 검토 — 초기 소스 검토

검토일: 2026-10-10. 완료된 표현 컴포넌트의 읽기 전용 검토이며 통합·실제 화면 검증 완료를 뜻하지 않는다. 소스와 패키지는 수정하지 않았다.

## 검토 범위

- 기준: 사용자 제공 AGENTS 지침, `rfc-ui-completion.md`, `screen-spec.md`, `designer-ui-audit.md`.
- 적용 skill: ralphinho-rfc-pipeline의 unit review/의존성 검증, kill-ai-slop의 scanner → 파일별 triage → report.
- 소스: screens, BoardingPass, Modal, EnlargedTicketModal, ReissueConfirmModal, DepartureReveal, TicketIssuer, 관련 CSS와 orderedWheel/useDepartureReveal.
- App/서비스/이미지 저장은 통합 중이므로 부분 구현을 완성품 결함으로 평가하지 않았다.

## 확인된 P2 — 승객명 grapheme 분리

- 위치: `src/containers/ticket/utils/orderedWheel.ts:35`의 `Array.from(value)`.
- 재현 입력: `Jose\u0301 👩🏽‍💻` — 결합 악센트와 이모지 조합을 포함한 닉네임.
- 근거: 읽기 전용 Node 실행에서 해당 입력은 codepoint 10개로 분리되지만 grapheme은 6개다. 현재 슬롯은 결합 악센트, 피부색 modifier, ZWJ, 노트북을 각각 별도 판에 배치한다. 문자열 제한이 없는 승인된 입력에서 전광판의 이름 모양이 입력/탑승권과 달라진다.
- 권장 수정: `Intl.Segmenter`의 grapheme 단위로 슬롯을 만든다. A–Z/숫자 단일 grapheme만 휠을 사용하고 나머지 완전한 grapheme을 정적으로 보존한다. 대문자 강제나 임의 입력 제한으로 해결하지 않는다.
- 담당 배정: 부모가 frontend에 수정 배정. 수정·재검증 전까지 열린 항목이다.

## 잠재 P2 — 확대 티켓의 세부 글자 상한

- 위치: `src/containers/ticket/components/ReissueConfirmModal/modal.css:21`의 티켓 720px 너비와 `src/containers/ticket/styles/boarding-pass.css:54`, `:71`, `:76`, `:82`의 font-size 상한.
- 근거: 기본 root 16px에서 label/날짜 라벨/footer는 최대 .6rem(9.6px), 필드 값은 최대 .7rem(11.2px)이다. 확대 모달에서도 이 상한을 유지하므로 종이 너비는 커져도 세부 글자는 작을 수 있다.
- 권장 검토: 확대/내보내기 전용 글자 크기를 별도로 정의하거나 확대 시 실제 정보 크기가 증가하도록 상한을 조정한다. 모바일 기본 티켓 레이아웃은 함께 확인한다.
- 상태: 실제 화면 미확인. 확정 결함이나 시각 검증 완료로 기록하지 않는다. 부모가 designer 검토와 후속 Aside 검증을 수행할 예정이다.

## scanner와 대비

- `node /Users/junhyeok_work/.agents/skills/kill-ai-slop/scripts/scan.mjs src`: 36파일, 3그룹, 14hit.
- mono(34)는 합의된 공항·티켓 언어, SVG(24)는 회전 안내, Tokens story gap(32)는 같은 토큰 비교 목록으로 triage했다. confirmed slop 없음. hit 수는 결함 수가 아니다.
- 주요 CSS 토큰의 대비를 계산했다: 검정/primary 5.56, 검정/primary-active 4.55, ticket-muted/종이 5.56, muted/surface 8.95, error/canvas 9.19. 계산 대상은 4.5 이상이며 전체 화면의 모든 조합 검증으로 확대 해석하지 않는다.
- 입력 label/error 연결, 상태 문구, 기본 44px 이상 조작부, 티켓 이메일 제외, native dialog의 modal/close/focus-return 코드, 장식 플랩 aria-hidden과 확정 결과 status는 소스에서 확인했다. 브라우저 동작 통과를 주장하지 않는다.

## 남은 검증

- App 통합 완료 후 직접 URL/뒤로가기/새로고침/결과 보존/중복 제출/저장 실패/재발급 실패와 인원 재시도.
- 화면 전환 제목 focus와 scroll: 현재 읽은 App에 명시적 focus 처리가 없고 Departure/Issuer 제목에 tabIndex가 없다. 통합 완료 후 재확인할 체크 항목이며 현재 결함으로 단정하지 않는다.
- Aside 실제 320/390/500px, 짧은 가로, 넓은 화면 중앙정렬, 긴 이름, 텍스트 확대, 모달 keyboard/ESC/초점 복귀, 모달 중복, 출력 중 회전과 티켓 유지.
- 플랩 glyph 방향과 반부 정렬, 정착까지 실제 시간, reduced-motion, 다운로드 PNG의 크기·내용·클리핑.
- Storybook interaction/a11y 검증과 물리 기기 동작은 해당 담당/부모의 별도 증거가 필요하다. 독립 리뷰 점수 또는 100점 완료 선언은 하지 않았다.

## U6 후속 소스 검토 — 통합 후

브라우저는 부모의 5173/Storybook 담당의 6006 QA와 충돌하지 않도록 조작하지 않았다. 아래는 새 코드 readback에 근거하며 실제 화면·기기 검증을 대체하지 않는다.

### 이전 두 항목의 수정 확인

- grapheme P2: `orderedWheel.ts:36–40`에서 Intl.Segmenter grapheme 단위 슬롯 생성으로 수정됐다. lowercase는 별도 a–z 휠을 사용하고 결합문자·한글·emoji는 완전한 grapheme으로 정적 보존한다. 관련 회귀 test 소스를 읽었으며 독립 담당이 test 실행 결과를 새로 주장하지 않는다.
- 확대 글자 잠재 P2: EnlargedTicketModal이 `displayMode="expanded"`를 사용하고 `boarding-pass.css:125–132`는 label 최소 .875rem, field 최소 1.125rem의 별도 크기를 정의한다. 코드상 원인은 해결됐다. 실제 모바일 확대/텍스트 확대/긴 이름 시각 검증은 부모 QA 대기다.

### 신규 확인 P2 — 화면 전환 초점의 제목 우선순위

- 위치: `src/containers/ticket/TicketContainer.tsx:145–148`.
- 코드: `document.querySelector('main h1[tabindex], main')`.
- 재현 조건: 입장 → 이메일 또는 닉네임 → 전광판 같은 route 전환. querySelector는 selector 목록의 작성 순서가 아닌 DOM 문서 순서의 첫 일치 요소를 반환한다. 바깥 `main`이 항상 제목보다 먼저 일치해 제목의 tabIndex가 있어도 `main`에 초점이 간다.
- 영향: 승인된 화면 전환 후 제목 focus 기준을 충족하지 못하며 사용자가 새 화면의 제목을 바로 받지 못한다.
- 권장 수정: `document.querySelector('main h1[tabindex]') ?? document.querySelector('main')`처럼 제목과 fallback을 별도로 선택한다. 키보드 경로 전환 뒤 activeElement가 해당 화면 h1인지 확인한다.
- 부모에게 수정 배정 요청 전달. 독립 담당의 소스 수정 없음.

### 통합 readback의 확인 범위와 한계

- 직접 접근 guard는 미확인 참가자의 /nickname·/departure·/issuer·/ticket 접근을 이메일로 안내하며, 참가 확인 후 기존 티켓은 닉네임/추첨을 건너뛴다. session 복원은 저장된 티켓 또는 이름 입력으로 안내한다.
- 최초 발급은 서비스 write 후 결과를 반환하며 App은 반환된 티켓을 저장한 뒤 전광판으로 이동한다. uncertain은 restore를 우선하고 같은 operation id를 유지한다.
- 로컬 재발급 모델은 직전 국가를 select에서 제외하고 동일 record의 destination을 한 번 write하므로 기존 자리 반환·새 자리 점유·기회 사용이 동일 저장으로 반영된다. 확정 실패와 대안 없음에서는 write 전 throw하며 기존 저장 결과가 유지된다. 서버 동시성 보장은 아니다.
- 이미지 실패는 saveStatus만 error로 바꾸고 ticket을 지우지 않는다. 저장 ref는 BoardingPass 영역이며 이메일·버튼·소개·키워드는 바깥에 있다. PNG clipping/실물 크기/브라우저 다운로드 성공은 읽기 검토로 확인할 수 없어 부모 검증에 남긴다.
- 모달은 native dialog showModal/close 및 이전 연결된 요소 focus 복귀를 유지한다. ESC·backdrop은 busy 동안 차단한다. 실제 keyboard trap/닫기/route 전환과 초점 복귀는 브라우저 검증에 남긴다.
- 추가 P1은 이번 readback에서 확인하지 못했다. 신규 P2 하나 외의 통합 확인 범위를 자동 검증·시각 QA 완료로 승격하지 않는다.

## 최종 후속 readback — bootstrap와 제목 초점

- 부모가 실제 흐름에서 발견한 bootstrap P1은 `App.tsx:156`의 `if (!booting) return`과 `:179`의 `[booting, navigate]`로 수정된 것을 확인했다. booting은 최초 저장 session 복원에서만 true이고 복원 성공/실패 모두 false가 된다. 이후 신규 발급·재발급의 route 변경은 restore를 실행하지 않아 /departure를 /ticket으로 덮지 않는다. 독립 검토는 원래 결함 발견이나 브라우저 회귀 통과를 주장하지 않는다.
- 앞선 제목 초점 P2는 `App.tsx:145–148`에서 h1 조회 후 별도 main fallback으로 수정됐음을 확인했다. 제목을 가진 현재 화면에서는 h1이 우선된다. 실제 activeElement 검증은 부모/Storybook QA 영역이다.
- 추가 확인 P2: 참가자 변경 때 이전 재발급 UI 상태가 남는다. `App.tsx:209–218`의 이메일 확인 성공은 verified/ticket/operation/uncertain만 바꾸고 reissueStatus/reissueError/saveStatus를 초기화하지 않는다. `:353`은 새 티켓의 reissueUsed가 false면 이전 reissueStatus를 그대로 전달하고 `TicketScreen.tsx:43`은 status가 used인 것만으로 재발급 소진으로 판단한다.
- 재현 조건: demo@gdg.example 발급 → 재발급 1회 사용 → 브라우저 뒤로 이전 이메일 화면으로 이동 → member@gdg.example 신규 발급 또는 미사용 기존 티켓 복원 → 탑승권 화면. 실제 새 티켓은 reissueUsed=false지만 이전 used 상태로 인해 `TicketScreen.tsx:162–164`의 “재발급 기회를 사용했어요”가 표시되고 1회 재발급 버튼이 사라진다. 이전 unavailable/error와 저장 성공/실패 문구도 참가자 변경 시 남을 수 있다.
- 권장 수정: 참가자 확인 성공/티켓 identity 교체 때 재발급·저장 UI 상태와 오류를 새 티켓 기준으로 초기화한다. 사용 횟수의 진실값은 현재 ticket.reissueUsed로 유지한다. 두 참가자 전환 후 각 티켓의 미사용/사용 상태가 독립적인지 App regression에서 확인한다.
- 부모에게 새 P2를 즉시 전달했다. 이번 독립 작업은 이 문서만 수정했고 브라우저·구현·패키지는 조작하지 않았다. fullflow/PNG 실물/Storybook play/물리 기기 결과는 각 검증 담당의 증거를 기다린다.
