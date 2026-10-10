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

## 플랩 중심·가독성·독립 판 디테일 교정

- 사용자 사진의 GDG 글자가 위쪽에 치우친 원인: DIN narrow glyph의 잉크 폭보다 em 기준을 작은 셀폭×0.9로 잡았고, line box의 ascender/descender 여백까지 grid center에 포함했다.
- glyph만 기존 mono fallback/700으로 고정하고 크기는 min(판높이×0.92, 실제 셀폭×1.4). 헤더의 DIN 스타일은 유지했다. static/moving 네 반부 모두 동일 inner span의 `text-box: trim-both cap alphabetic`을 사용하며 y magic offset 없음. 지원하지 않는 엔진은 기존 line-box center fallback 유지.
- 개별 판 column gap 2–3px/row rail5px, 각 판 outline/면색/개별 hinge seam. category gap은 별도 유지. header/matrix/nested country 모두 같은 gap을 사용하고 실제36개 셀폭 계산에서40트랙의39gap과 category gap4개를 뺀다. 실제 국가 글자만 이동하고 padding plate는 고정.
- 소유 CSS/TSX Prettier·ESLint 및 프로젝트 typecheck 통과. 부모가 aggregate check/build와 실제 flow 확인을 담당한다.
- Aside same-origin iframe CSS viewport 844×390: trim 지원true/font loaded, 셀18.203×31.828px, cap box15.344×18.594px, center 오차≤0.008px, 양 반부 좌표차0~0.016px, plategap2.388px/rowgap5px, body xoverflow없음, 확인 버튼 bottom324.97px. 실제 active upper/lower 원점은 (셀너비/2, 반판높이)/(셀너비/2,0), 상하 full-glyph canvas 높이동일78px 확인. 실제 모션 sample matrix3d에서 X 회전 확인.
- 667×375/844×390 iframe 전체 보드·확인 버튼 시각 확인. Aside root395px 물리 화면으로 iframe 외곽 fit scale한 증거이며, 내부 viewport geometry는 원본 크기다. 실물폰/iOS/Android 폰트·미지원 trim 엔진 검증은 아님. 내 임시 iframe은 모두 제거했고 다른 담당 iframe은 변경하지 않았다.
- screenshot: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_mhkwE3Z3wKW9rHLB/artifacts/board-844-fit.png`, 같은 디렉터리 `board-667-fit.png`.
- 단위 후 scanner68파일/5그룹/19hit. 이번 glyph mono는 사용자 항공패널 의도, 물리 hinge/outline/rail은 사진 요청의 기능 표현이며 신규 confirmed slop 없음. emoji 검증 사례/token 비교 hit는 기존 intentional. BoardingPass 새 letter-spacing hit는 이번 소유 수정 밖이므로 해당 디자인 소유자 triage 필요. 부모 보고 후 기록, 기계적 제거 없음.

## 일정 행 발권 — CSS 단위

- 사용자 요청대로 별도 확인 CTA 공간을 제거하고, ready 상태의 실제 노란 일정 행 전체를 발권 버튼으로 표현한다. Component 담당이 의미 상태·가용 높이·mock 행 수·ordered flip을 소유한다.
- 동일 기계판 높이를 44px로 맞춰 행 버튼의 터치 크기를 확보했다. 독립 판 gap·category gap·회색 backing·중앙 glyph 구조는 보존했다.
- 안내는 데이터 위에 겹치지 않는 26px 고정 공간. 노란 1px 행 테두리, blue focus outline, 절제된 hover/pressed tint만 사용하며 glow/pulse 없음.
- focused scanner(06/19/20/34, 생성 Storybook 제외) 수정 전후 3그룹/9hit. 이 단위 CSS mono는 사용자 항공판 의도로 intentional. 다른 소유 파일 issuer 원형 부품·ticket presentation shadow hit는 부모에게 보고하고 보존했다. 신규 confirmed slop 없음.
- CSS Prettier 완료. Component 통합과 부모 실제 viewport/keyboard QA는 별도 인수 단계다.

### 최신 사용자 교정 — 문구 없이 일정 행 선택 유도

- 앞선 visible 안내와 무효 available-height 규칙을 삭제했다. Component 담당은 sr-only 설명과 ready class를 유지한다.
- 판은 38px, row gap은 6px로 조정했다. 행 버튼의 상하 3px 확장은 빈 간격 안에서 44px hit area를 확보하며 인접 판을 덮지 않는다.
- ready 순간 실제 노란 판만 280ms에 0→-2px→0으로 한 번 움직이고 얇은 노란 행 테두리가 나타난다. 국가의 nested 판에는 중복 transform을 적용하지 않는다. reduced-motion에서는 즉시 테두리만 표시한다.
- focused scan 전후 3그룹/9hit 유지, 이 단위 신규 confirmed slop 없음. typecheck 통과, 실제 모션·행 수·keyboard QA는 Storybook 담당에게 소스 안정 시점과 함께 전달했다.

### 데이터 기준 열 너비

- 국가·항공사·시간·편명·게이트 capacity와 전체 track gap 수를 component가 전달하고 CSS grid 및 glyph 크기 계산이 같은 값을 소비한다. 국가 catalog의 최장 `UNITED KINGDOM`은 공백 포함 14graphemes이며 짧은 항공사 표시명은 7칸을 유지한다.
- 37px 판·6px 행 간격·회색 backing·44px 행 선택·ready 1회 모션은 보존했다. focused scanner 결과 4그룹/13hit 중 이 CSS의 mono는 기존 intentional이며 새 confirmed slop 없음. 다른 소유 파일 issuer 표면·원형 부품 등 신규 hit는 소유자 triage 대상으로 부모에게 보고했다.
- CSS Prettier 확인 완료. 최종 동적 capacity 계산과 실제 viewport 검증은 component 통합 후 별도 인수한다.

### 최신 교정 — UK 표시·임의 위치 일정 행·손가락 안내

- 사용자 확정으로 영국 표시가 UK가 되어 최장 국가 NEW ZEALAND 11칸을 소비한다. 항공사 7칸·전체 33칸·track gap 36의 CSS fallback을 맞췄다.
- 사용자의 실제 일정 행 위치는 component가 결정·유지하며 안내는 같은 행 버튼에 앵커한다. 숫자를 가리지 않는 우측 28px rail에 native 손가락 아이콘을 배치하고 glyph 너비 계산에도 rail을 차감한다.
- 손가락은 440ms 탭 두 번 후 정지하며 텍스트 안내 없음. 사용자 명시 요청의 기능적 아이콘으로 intentional이며 reduced-motion에서는 정지한 안내만 제공한다.
- Prettier/typecheck 통과, focused scan 4그룹/13hit 유지. 실제 랜덤 행 위치·가로 넘침·모션 인수는 component 안정 후 QA 담당이 수행한다.

### 사용자 확정 — 3D 손가락 중앙 지시

- 윤곽선 SVG 대신 built-in image_gen으로 만든 matte ivory 3D 손을 투명 WebP로 사용한다. 생성 prompt·alpha·손끝 좌표 근거는 `pointing-hand-asset.md`에 기록했다.
- asset은 256×384/10,980bytes, 표시 56×84/opacity0.8이며 filter·blur·drop-shadow 없음. 측정한 손끝을 노란 행 버튼 중앙에 맞추고 하단 두 행에서는 반전해 몸통을 위로 배치한다. side rail 제거로 보드 폭을 복구했다.
- 사용자 명시 손가락 요청에 따른 기능 안내이며 2tap/reduced static/aria-hidden을 보존했다. SVG focused scanner rule24는 0hit, source typecheck 통과. 실제 이미지 로드·손끝 geometry·최종 screenshot은 afterperf 브라우저 슬롯의 QA 담당에게 요청했다.

### 상태 한글 잘림 교정

- 실제 844px QA에서 상태 glyph width26.89px가 판22.20px를 넘어 좌우 잘림을 확인했다. 일반 영문 셀 크기는 보존하고 wide 상태 셀만 실제 판너비×0.9로 줄인다.
- static/moving 반판 모두 같은 cell font를 상속하며 glyph cap-center 구조를 유지한다. 공통 셀 너비 계산을 변수로 추출해 열 capacity 변경에도 상태 크기가 함께 맞춰진다.
- QA 담당에게 재측정을 요청하며 실물 기기 폰트 검증과 동일시하지 않는다.

### 손가락 오검수 교정

- 기존 정면 3D 손은 가운데손가락으로 오해되는 형태와 56×84 크기로 사용자가 거부했다. 먼저 숨긴 뒤 별도 thumb/세 curled fingers가 명확한 index side pose를 생성하고 부모 시각 검토 후 채택했다.
- 현재 이미지 38×40/opacity0.65, 2tap 후 fade 및 실제 DOM 제거. Reduced-motion은 정적 안내 900ms 뒤 제거되며 180도 반전은 삭제했다. 기존 행 클릭은 보존한다.
- 새 alpha WebP는 6,468bytes이며 이미지 필터/blur 없음. Prettier·ESLint·typecheck 통과, 최종 작은 렌더·사라짐·하단행 QA를 전달했다. 생성 prompt/원본/제품 경로는 asset 문서에 기록했다.

### 플랩 낙하 기구 디테일 교정

- 최초 원인 보고: 반판당 27~30ms로 1~2frame뿐인 속도, 중간 moving span의 기본 flattening, 균일 면색/ease-out 닫힘으로 낙하·착지 차이 부족.
- 중간 moving scene을 absolute/preserve-3d로 연결하고 판 perspective를 140px로 조정했다. Scene의 opacity/filter/overflow/isolation은 추가하지 않았다. 고정 판과 centered glyph crop은 유지한다.
- 윗면 -90도/아랫면 +90→0의 앞쪽 낙하 방향을 보존하고 fold45%/fall55% 계약을 소비한다. 면의 경첩 쪽 명암, old 하단에 드리우는 그림자, 마지막 2도 이내 닫힘을 추가한다. 물리 그림자는 사용자 요청의 회전 깊이·판 가림을 위한 표현이며 분위기 장식이 아니다.
- CSS Prettier 확인 통과. Focused scanner06/20은 다른 소유 issuer hit만 있고 이 단위 신규 confirmed slop 없음. 코드 검사와 실제 단면/속도 지각 QA는 분리한다.
