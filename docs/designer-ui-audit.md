# U2 디자이너 실행·검토 기록

## 첫 3화면 — 2026-10-10

- 소유 파일: `src/components/screens/{LandingScreen,EmailScreen,NicknameScreen,InputScreen}.tsx`.
- 계획/구현: 입장 행사정보→발권하기 단일 CTA→문의 링크, controlled 이메일/닉네임 입력, 오류·로딩·결과 확인 필요 상태. 검증·라우팅·서비스는 props 소비자 담당.
- 첫 3화면 props 계약은 프론트와 합의했다. Email의 `demoEmail?`은 테스트 안내를 소비자가 공급한다. 입력 문자열 변경·실명 요구·영문 제한은 추가하지 않았다.
- 검사: 소유 파일 Prettier 완료. 통합 check/build 및 실제 모바일/키보드 화면은 통합 후 검증 대기.
- 단위 후 kill-ai-slop scan: 31파일, 2그룹, 16 hit. 신규 hit `LandingScreen.tsx:19` mono 행사제목은 사용자 확정 항공 시각 언어로 intentional. 기존 TicketIssuer 회전안내 phone icon, Departure/Issuer mono, hinge 그림자도 intentional 보존. 실제 소스 triage 결과 신규 confirmed slop 없음.
- scan/triage 결과를 부모에게 먼저 보고했다. 별도 slop fix는 없으며 의도된 디자인을 기계적으로 제거하지 않았다. 시각 triage는 통합 화면 후 추가한다.
- rollback: 위 표현 파일만 제거/되돌리고 기존 wheel·App·services를 유지한다. commit/push/branch cleanup 없음.

## U3 ordered wheel 표현

- `DepartureReveal.tsx`, `departure-reveal.css`: 프론트 RollingState current/next/stepId/duration/elapsed를 소비. 외곽 슬롯 고정, 상단 현재판 접힘/하단 다음판 펼침. 알파벳/숫자 순환 일정·결과 정착은 컨트롤러 책임.
- 국가 라벨/도시명은 각각 countrySettled/airportSettled 뒤 공개. 레이아웃 시간도 공통 prop 사용. 타이머/임의 문자 생성 없음.
- 프론트 check/build 및 13 tests·213 assertions 통과 보고 수신. 부모 actual Aside ordered-wheel 프레임 검토 인수 보고 수신. 부모 증거: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_m1ssm1lRMpV85DWu/artifacts/wheel-review/`.
- scanner mono hit와 물리 힌지 그림자 intentional 보존. 자동 검사 통과와 부모 지각 품질 확인을 별도 증거로 기록한다.

## 티켓·모달 — U2 표현 준비

- 추가 파일: `BoardingPass.tsx`, `Modal.tsx`, `EnlargedTicketModal.tsx`, `ReissueConfirmModal.tsx`, `screens/TicketScreen.tsx`, `styles/boarding-pass.css`, `styles/modal.css`.
- 기존 `TicketIssuer.tsx`/`ticket-issuer.css`는 티켓 중복 마크업 대신 공통 BoardingPass 소비. 출력 컨트롤러/1600ms 계약 유지.
- 동일 티켓 시각에는 ICN/도시/공항코드/승객명/편명/날짜/시간/게이트/행사/장소만 포함. 이메일·조작부·키워드·데모 안내는 저장 ref 밖. 가짜 QR은 만들지 않았고 stub 여백만 예약.
- 모달은 native dialog로 배경 inert/초점 제한/초점 복귀, 명시적 닫기/ESC 지원. 재발급 처리 중 취소는 차단하며 결과 조회 상태를 별도 표시.
- 화면은 저장/인원/재발급 의미 상태와 events 소비. 서버 결과 성공을 모션 완료로 추론하지 않는다.
- 소유 파일 Prettier 완료. 전체 check/build와 실제 화면·다운로드 이미지·모달 키보드 검증은 통합 담당과 공동 QA 대기.
- 단위 후 scanner 첫 실행에 `storybook-static` 생성물이 포함돼 범위 외로 제외 후 재실행: 48파일/3그룹/14hit. mono(34)·회전안내 아이콘(24)은 의도적, Tokens story 균일 gap(32)은 동일 토큰 비교 목록으로 의도적. 신규 confirmed slop 없음. 부모에게 report-before-fix 결과 전달. slop fix 없음, 재scan은 소스 범위 정정 확인. 실제 시각 triage는 통합 이후 추가.
- rollback: 해당 표현 파일과 issuer 공통뷰 연결만 되돌린다. hooks/App/service/package/스토리는 소유자 담당이며 수정하지 않는다.

## U2 후속 교정 — 완료 CTA·확대·route focus

- 선행 보고: 독립 UX 검토의 확대 티켓 9.6px label/11.2px field cap 문제는 사용자에게 전달된 수정 범위다. compact 비율을 유지하며 expanded에서만 읽기 크기를 교정했다.
- `TicketIssuer`는 `onContinue?`를 받아 출력 완료 시 **탑승권 보기** CTA 제공. 이벤트 미제공 프리뷰는 기존 상태 유지. 자동 이동 없음.
- Departure/Issuer h1에 `tabIndex=-1` 추가해 소비자 RouteFocus 지원. 입력 자동 focus/키보드 강제 없음.
- `BoardingPass` 공통 마크업은 그대로이며 `displayMode=compact|expanded` 추가. 확대 모달은 expanded 사용. 확대의 label 14–16px/field 18–22px/승객명 20–28px 기준(cqi). 720px 카드에서 CSS 계산상 label14.4px·field20.16px이며 실제 브라우저 측정은 QA 대기. 기존 compact typography/출력 비율은 유지했다.
- 가로 확대는 modal 내부 scroll 영역만 사용하며 모든 값·긴 이름 wrap 보존. native dialog 초점 제한/복귀 계약은 변경하지 않았다.
- 소유 파일 Prettier 완료, 프론트 check/build 요청. scanner(`--exclude=storybook-static`): 58파일/4그룹/17hit. 추가 emoji3hit는 독립검토/테스트의 grapheme 입력 사례로 intentional. mono·힌지·회전안내·토큰목록 균일 비교는 intentional 유지. 신규 confirmed slop 없음, 부모에게 먼저 보고 후 기록. 불필요한 디자인 제거 없음.
- Storybook 담당에게 쓰기 시작/안정 완료를 전달했다. 실제 확대 읽기·모달 keyboard/본문 overflow·완료 CTA QA는 통합 검토에서 남아 있다.
