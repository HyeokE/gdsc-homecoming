> 현재 요구사항은 **세로 화면 유지·확인 즉시 출력·상단 슬롯에서 가로형 티켓을 아래로 출력**이다. 아래 이전 회전 정책의 검증 기록은 이력이며 최신 세로 출력 UI의 통과 증거로 재사용하지 않는다. 새 계약의 실제 QA 결과는 문서 끝에 추가한다.

# Storybook 검증 기록 — U5

2026-10-10. 실제 UI 표현35개와 App회귀1개, 총36개 stories를 구성했다. Storybook이 제품 라우팅·실제 서버·기기 검증을 대체하지 않는다.

## 실행

- `bun run storybook`: http://localhost:6006 (기존 앱 5173과 독립, 자동 브라우저 열기 없음).
- `bun run build-storybook`: `storybook-static/` 정적 산출. Git ignored.
- Storybook 10.6.1 / React Vite framework. 설치 시 npm registry 공식 패키지의 peerDependencies에서 Vite `^8.0.0`, React/React DOM `^19.0.0`, TypeScript `>=4.9.x` 지원을 확인했다. 기존 프레임워크 다운그레이드 없음.
- 참고: [공식 React Vite framework](https://storybook.js.org/docs/get-started/frameworks/react-vite/), [공식 Vite 8 지원 추적](https://github.com/storybookjs/storybook/issues/33789).
- Docs와 a11y addon만 추가. Play assertions는 `storybook/test` 사용. 별도 Playwright/Vitest 테스트 프레임워크 설치 없음.
- Preview는 실제 `src/styles/globals.css`, max500px, 375/500/844×390 viewport 및 MotionConfig 동작 줄이기 toolbar를 제공한다. 실제 hook을 사용하는 live story는 OS `prefers-reduced-motion`과 현재 iframe 방향을 감지한다. 명시적인 ReducedMotion story는 즉시 정착을 보여준다.
- stories는 표현 컴포넌트, fixtures, 목적지 데이터 및 순차 휠 hook만 import한다. Firebase 또는 Sheets API import/호출 없음.

## 상태 카탈로그

| 파일      | 상태                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| Landing   | 행사 입장, 주요 발권 CTA, 행사 날짜/장소/문의 링크                                                     |
| Inputs    | 이메일 초기·형식 오류·미등록·연결 실패·loading·결과 복원 확인, 닉네임 초기·빈 값 오류·긴 값·loading    |
| Departure | 실제 A→Z 순차 휠·확인 대기·reduced-motion·세로 printing·reduced-motion printing·complete               |
| Ticket    | 재발급 가능·긴 이름·저장 중·저장 실패·본인만 1명·동행 조회 실패·재발급 소진·대안 없음·재발급 결과 확인 |
| Modals    | 재발급 확인·loading·대안 없음·실패·결과 확인·확대·열기/닫기/초점 복귀                                  |
| Tokens    | 제품 팔레트와 항공 모노 타입                                                                           |

개별 상태 stories는 외부 업무 성공을 가장하지 않는 props 주입이다. 제품 입력 유효성 검사와 데모 저장/원자성은 U1/U4 tests 및 실제 앱 검증의 담당이다. NoCompanions는 본인 포함 1명으로 표현한다.

## 실행 증거

- Storybook 정적 build와 Storybook 파일 ESLint 통과. 초기 통합 중 TicketIssuer onContinue prop 계약 불일치는 U4에 전달해 교정됐으며 이후 프로젝트 전체 `bun run check`가 통과했다.
- `http://localhost:6006/` HTTP 200 확인, 서버 유지.
- Aside Browser 별도 Storybook 탭에서 실제 play 실행 결과 확인. 앱 5173 탭은 조작하지 않았다.
- Landing: click / onStart 호출 / 문의 링크 URL 3 steps Pass.
- Email Initial: type / 정확한 값 `demo@gdg.example` / 확인 CTA / onSubmit 호출 4 steps Pass. HMR 중 중복 play와 args 갱신 경쟁으로 입력값이 어긋난 초기 시도는 통과로 계산하지 않았다. 로컬 편집 state 및 값 assertion 추가 후 새 story 선택으로 재검증했다.
- Ticket ReissueAvailable: 이미지 저장 CTA / onSave 호출 2 steps Pass. 이미지 파일 생성·사진첩 저장 검증은 이 assertion의 범위가 아니다.
- Modal OpenAndClose: 열기 / visible / 닫기 CTA / onClose 호출 / trigger focus 복귀 5 steps Pass.
- native `<dialog>`에 synthetic userEvent Escape는 cancel 이벤트를 발생시키지 않았다. 대신 실제 Aside에서 집중된 닫기 버튼 `.press('Escape')`를 수행하고 fresh snapshot에서 dialog가 사라지며 trigger가 다시 focused인 것을 확인했다.
- Email a11y: 0 violations / 26 passes / 0 inconclusive.
- 열린 재발급 모달 a11y: 0 violations / 14 passes / 0 inconclusive.
- Ticket 기본 및 긴 이름 a11y: 0 violations / 28 passes / 1 inconclusive. 항목은 `.boarding-pass__arrow`, `aria-hidden=true`, 문자 `→`만 포함하여 axe가 non-text contrast를 자동 판별하지 못한 경우다. CSS `--ui-ticket-muted #5d6267` / paper `#f7f3e9` 수동 WCAG 계산 5.56:1. 본문 route 코드가 별도로 제공되며 이 장식은 접근성 트리에서 제외한다. 검사 룰을 억제하지 않았다.
- 긴 이름 screenshot 직접 확인: 완전한 혼합문자 승객명이 티켓 본문에 표시되며 현재 max500px canvas에서 잘림 없음. 증거: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_sGFAItNaTism1Prx/tmp/gdg-storybook-long-name.png`.

## Slop triage

stories 변경 후 scanner 실행: 6 files / 2 groups / 2 hits.

- `Tokens.stories.tsx:19` grid gap4: 동일 스와치 비교 목록의 일정 행 간격이므로 intentional.
- `Tokens.stories.tsx:36` mono: 승인된 항공 타입 샘플이므로 intentional.
- confirmed slop 없음. Docs UI 자체는 Storybook 패키지 제공이며 제품 디자인 개선 판정에서 제외한다. 생성된 `storybook-static`은 source scan 대상이 아니다.

## 검증 범위와 후속

38 stories와 실제 실행 가능한 대표 interactions를 제공하며 모든 story의 개별 a11y 실행, 모든 viewport 시각검증 또는 물리 기기 검증이 끝났다고 주장하지 않는다. 부모 U6에서 제품 320/390/500 및 가로 화면·모션·이미지 저장을 확인한다. 정적 build의 Docs/axe chunk 경고는 개발 카탈로그의 패키지 chunk이며 제품 번들 경고가 아니다.

Rollback은 `.storybook`, `src/**/*.stories.tsx`, 이 문서, Storybook scripts/dependencies와 해당 ignore/TS/ESLint 범위만 되돌린다. 현재 package 파일은 설치 종료 후 frontend에게 쓰기권한 반환했고 추가 이미지 의존성을 보존한다. 커밋·푸시·배포 없음.

## 이전 회전 정책의 U6 검증 (세로 출력 변경으로 대체)

최신 enlarged BoardingPass/h1/onContinue 계약 이후 재확인했다. 320/390/500, 667×375/844×390 viewport를 추가했다. 초기 Storybook 메뉴 선택이 실제 iframe 크기를 변경하지 않던 상태에서는 same-origin `#storybook-preview-iframe` CSS width/height/min/max를 고정하고 innerWidth/innerHeight readback으로 확인했다. 이후 initialGlobals viewport 기본390을 명시하자 addon 폭이390으로 적용됐지만 높이는 사용 가능한 바깥 패널 높이778로 제한됐다. 정확한 요청 높이는 CSS iframe 방법으로 검증했다. 이는 데스크톱 브라우저의 CSS viewport이며 실제 휴대폰 증거가 아니다.

| 대표 상태 | CSS viewport | 결과 |
| --- | --- | --- |
| Landing | 320×667 / 500×900 | body clientWidth=scrollWidth 305/485, CTA 높이50px, 행사 제목/정보 wrap 정상 |
| Email format error | 320×667 | body320=scroll320, error/label/CTA 보임, back44px/CTA50px |
| Nickname long | 390×844 | body390=scroll390, input value 전체 유지(입력 내 수평이동), back44px/CTA50px |
| Ticket long | 320×667 / 390×844 / 500×900 | body305/375/485=scrollWidth, 이름 wrap, CTA≥44px |
| Expanded long modal | 320×667 | body320=scroll320, modal286=scroll286, 닫기62×52px, label14.4px |
| Expanded long modal | 667×375 | body667=scroll667, main500, modal높이341, 내부 content341→705 세로scroll |
| Issuer printing | 667×375 / 844×390 | body667/844=scrollWidth, main500, 티켓과 발권기 가로화면에 표시 |
| Reduced motion | 320×667 | 확정 결과 즉시 표시, 확인 CTA265×48px 유지, body305=scroll305 |

확대 modal의 티켓 내부 pan만 width231→scroll720으로 의도된 수평 스크롤이다. scrollLeft489 끝까지 이동해 NRT/A03 및 승객명 끝이 보이는 screenshot을 확인했다. modal 본체는 가로 overflow가 없고 아래 정보는 modal 내부 세로 scroll로 접근한다.

텍스트 확대 대체 검증은 Ticket long 390×844에서 iframe root font-size를16→32px로 변경한 **CSS 200% reflow**다. body375=scroll375, 본문 wrap과 CTA 높이 증가(저장154px/재발급156px)를 확인하고16px로 원복했다. 이것은 브라우저 zoom 또는 OS 글자크기 설정 검증이 아니다. cqi 기반 축약 티켓 활자는 root rem 확대와 동일하게 확대되지 않으며 읽기 확대는 전용 enlarged modal로 제공된다.

스크린샷을 직접 확인한 증거 디렉터리: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_FlWiDdT3v7YE8IEB/artifacts/` (`landing-320`, `email-error-320`, `nickname-long-390`, `ticket-long-320`, `ticket-text-200`, `modal-expanded-320`, `modal-expanded-pan-right`, `modal-expanded-landscape`, `issuer-667`, `issuer-844`, `reduced-320`).

새 enlarged long story를 추가하고 ReducedMotion toolbar가 제품 props까지 전달되도록 수정했다. 총38개 stories(표현36 + 실제App회귀1 + 실제App수동세로출력1). 변경 후 전체 `bun run check`와 Storybook 정적 build 통과. 최신 scanner7파일 2hit는 기존 토큰 간격/mono 샘플만이며 모두 intentional. Safe-area 확인: index.html은 viewport-fit=cover를 선언하지 않아 기본 auto 안전 viewport를 사용한다. 현재 env() 부재를 확정 결함으로 판정하지 않았다. 향후 cover/standalone 도입 시 main/modal/issuer inset padding 보완이 필요하다. 실제 기기의 cutout/inset은 이번 CSS viewport 증거로 확인할 수 없다.

### App 라우팅 회귀 검사 추가와 발견

`AppFlow.stories.tsx`는 실제 App+MemoryRouter를 마운트하고 명단 확인→발급→`/departure` 유지→확인 전 issuer 없음→새 마운트 기존ticket 복원을 검증한다. 입력은 RAF focus 및 background iframe 타이밍과 분리하기 위해 `fireEvent.change` 후 정확한 value를 확인하며, CTA는 userEvent.click을 사용한다. 문자별 타이핑/실제키보드 입력 검증과 같다고 주장하지 않는다. 데모 origin의 local `gdg-homecoming-demo-v1`과 session `gdg-demo-participant` 두 키만 snapshot/초기화하고 play finally 및 story cleanup에서 해당 snapshot을 복원한다. 개인정보/타 origin/다른 저장키를 조작하지 않는다.

최초 실행에서 정확한 이메일/이름·확인/발권CTA가 통과한 뒤 `/departure` 기대값이 `/ticket`으로 나타나 회귀 play가 실패했다. 최신 bootstrap guard가 포함된 코드였다. MemoryRouter의 setTicket→navigate 사이 `/nickname`+hasTicket guard race 후보를 U4에 전달했으며 BrowserRouter 실앱 증거와 별개로 추적한다. 실패를 통과나 단순 테스트 한계로 숨기지 않는다.

U4가 정상발급 및 불확실결과 복원 시 `setTicket`과 `navigate('/departure')`를 동일 `startTransition`으로 묶어 urgent ticket commit과 router transition 사이 guard 경쟁을 교정했다. 교정 후 같은 AppFlow를 새 실행한 결과 Aside에서 **Interactions 21 / Pass**를 확인했다. 발권 직후 departure, 확인 CTA가 활성화된 이후에도 departure 유지, 확인 이전 issuer 없음, 새 mount ticket 복원이 모두 통과했다. `app-regression-pass.png`에 패널 및 결과 증거를 저장했다. 입력의 문자별 typing은 이 회귀 검사 범위에 포함하지 않으며 실제 App 입력은 부모 U6의 브라우저 검증과 분리한다. 저장 snapshot은 play finally에서 복원되며 이후 boolean 존재 상태를 readback했다.

### 이전 회전 정책의 실제 App 출력 검증

`ManualOrientationJourney`는 실제 App과 useDepartureReveal을 사용하며 props로 출력 상태를 강제하지 않는다. Aside의 실제 입력/CTA로 새 데모 발급 후 확인 버튼까지 진행했다. 390×844에서 확인 클릭 직후 `/issuer`, `rotate`, 티켓0장과 회전 안내를 확인했다. iframe CSS viewport를 바꿔 실제 matchMedia/resize 경로를 실행하고 출력 도중 가로/세로를 반복했다.

| 시작 이후 | 실제 iframe viewport | 제품 phase | 티켓 수 / DOM | 경로    |
| --------- | -------------------- | ---------- | ------------- | ------- |
| 202ms     | 667×375              | printing   | 1 / 동일      | /issuer |
| 405ms     | 390×844              | printing   | 1 / 동일      | /issuer |
| 606ms     | 844×390              | printing   | 1 / 동일      | /issuer |
| 807ms     | 375×667              | printing   | 1 / 동일      | /issuer |
| 1062ms    | 667×375              | printing   | 1 / 동일      | /issuer |
| 1712ms    | 667×375              | complete   | 1 / 동일      | /issuer |
| 2113ms    | 667×375              | complete   | 1 / 동일      | /issuer |

최초 가로 전환부터 약1600ms 완료 타이머가 유지됐고 회전 때마다 새 출력이나 재시작이 나타나지 않았다. 완료 후 `탑승권 보기`를 실제 클릭해 `/ticket` 및 같은 JASON JEONG / 프랑스 / CDG / A03 결과를 확인했다. `live-app-repeat-orientation-complete.png`가 같은 Aside evidence 디렉터리에 있다. 이전 정적 Issuer stories 검증과 구별되는 실제 hook·라우팅 증거다. 테스트 종료 시 Landing Docs로 전환하여 두 데모 저장키 snapshot cleanup을 실행했다. 이 검증 역시 CSS iframe viewport이며 물리 기기 회전/센서 증거는 아니다.

## 세로 출력 정책 변경

`PortraitRotate`와 `LandscapePrinting`을 `PortraitPrinting` 및 `ReducedMotionPrinting`으로 교체하고 모든 TicketIssuer 소비에서 isLandscape를 제거했다. 실제 App 수동 story는 `ManualPortraitPrinting`으로 이름을 바꿨다. LiveJourney는 확인 즉시 출력하는 실제 hook을 계속 사용한다. 외부 Tailscale allowedHosts는 유지했다. 변경 후 kill-ai-slop scan7파일2hit는 Tokens.stories.tsx19 gap4 및36 mono로, 각각 스와치 비교 간격과 승인 항공 타입 샘플이므로 intentional. 제품 소스 안정 후 최신320/390/500 및 실제 세로 발권 QA 예정이며 이전 회전 검사로 이를 대신하지 않는다.

### 최신 세로 출력 실제 QA 결과

Aside Browser의6006 전용 탭에서 최신 소스 안정 후 확인했다. 실제 App에 이메일/닉네임을 입력하고 확정 결과에서 확인 CTA를 누른 즉시 세로390×844에서 `/issuer`와 printing이 나타났다. DOM MutationObserver 기록은 printing89ms→complete1678ms로 실제 간격1589ms였다. 출력 중667×375→390×844→844×390→390×844로 바꾸어도 모든 샘플에서 동일 DOM 티켓1장과 `/issuer`가 유지됐고 완료가 지연되거나 추가 출력되지 않았다. 최종 탑승권 보기 CTA 클릭 후 `/ticket` 및 같은 JASON JEONG / 독일 / BER / A03 결과가 표시됐다. 내부 printingStartedAt은 노출하거나 임의 변경하지 않았으며, 방향 변화에 따른 타이머 유지 판정은 완료 시각과 단일 DOM 관찰에 근거한다.

| 최신 대표 상태 | CSS viewport | 실제 결과 |
| --- | --- | --- |
| 세로 출력 긴 이름 | 320×667 | 264×164.80px,가로비율1.602:1,body320=scroll320,이름전체표시 |
| 세로 출력 긴 이름 | 390×844 | 334×190.16px,가로비율1.756:1,body390=scroll390 |
| 세로 출력 긴 이름 | 500×900 | 444×209.52px,가로비율2.119:1,body500=scroll500 |
| 동작 줄이기 출력 | 390×844 | 단일티켓334×175.58px,paper transform none,즉시표시 |
| 확대 긴 이름 | 320×667 | ticket720×354.64px,modal286=scroll286,body320=scroll320,의도된내부pan231→720,label14.36px,닫기61.7×52.4px |

320 긴이름의 최초1.23:1 비율은 designer에게 증거를 보내 여백을 교정했고 최종1.602:1을 다시 측정했다. 글자 크기를 줄여 해결하지 않았다. 출력창 overflow hidden과 출력 중 음수 paper translate를 실제 DOM으로 확인했다. 확정 후 screenshot에서 종이가 슬롯 아래에 전부 표시되고 긴 이름이 빠짐없이 줄바꿈하는 모습을 직접 확인했다. 확대 label 회귀는 designer가 하한을 복구한 이후 다시 확인했다. props ReducedMotionPrinting은 표현의 즉시 표시 검사이며 OS prefers-reduced-motion 설정을 새로 변경한 증거는 아니다.

AppFlow의 issuer 부재 assertion은 제품 h1 변경에 따라 정확한 region `GDG AIR`로 갱신했다. CSS HMR중 panel Bail은 통과로 보고하지 않았고 안정 후 story를 새로 선택해 **Interactions21 Pass**를 확인했다. beforeEach snapshot/cleanup 보존 규칙은 그대로다. 최신 scanner7파일2hit는 Tokens19 gap4/36 mono만으로 intentional, confirmed0이다.

최신 screenshot evidence: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_H732VXJdIwfKgElB/artifacts/`의 `portrait-long-320-settled.png`, `portrait-long-500-final.png`, `portrait-reduced-390.png`, `expanded-long-320-final.png`, `live-portrait-complete.png`. 현재 총38개 stories다. 실제 기기 notch/센서,실브라우저zoom 및 모든38story개별axe 실행을 완료했다고 주장하지 않는다.

기존6006 서버가 종료돼 연결거부였으므로 정확한6006 Storybook 프로세스만 복구했다. 최종QA후 실행세션 종료와 분리된 detached process로 같은 `bun run storybook` 명령을 유지했다. host127.0.0.1/exact-port6006/Tailscale allowedHosts는 보존하고 launchd는 설치하지 않았다. 최종프로젝트check/build 및 Storybook정적build는 부모 통합검사로 수행한다.

최종 통합 결과(부모 readback): 전체 `bun run check`,20 tests/246 assertions,제품 build 및38개 Storybook 정적 build 모두 통과(exit0). Docs/axe의 기존 chunk 경고만 남았다. detached 부모 PID80513 / node리스너80514에서127.0.0.1:6006 HTTP200을 확인했다.

## 이전 14칸 반복 구조의 검사 이력 (디자인 거절로 대체됨)

최신 요청에 따라 출발 안내의 행 전체 고정 격자와 빈 패널을 확인할 상태6개를 추가했다. `InitialBlankPanel`은 기존 rolling cell 구조를 유지한 pre-roll 공백 frame이다. `CountrySettledPanel`과 `InformationRevealingPanel`은 실제 rolling plan의 countryEnd 및 details timeline을 사용한다. `ShortCountryAndPassenger`, `LongCountryAndPassenger`, `UnicodePassenger`로 짧은 값/긴 나라·승객명/combining mark·skin modifier·ZWJ emoji의 grapheme 경계를 확인한다. 기존 A→Z 타이밍과 plan implementation은 변경하지 않는다. 이 추가 이후 최신 카탈로그는44개 stories다.

변경후 scanner7파일3hit: Tokens19 gap4/36 mono는 기존 intentional, Departure Unicode emoji는 grapheme 분리 회귀를 찾기 위한 테스트 데이터이므로 intentional이다. 제품 문구에 emoji를 더하지 않았다. UI 소스 안정 후 whole-board320/390/500/공백과 padding/overflow 및 실제 확인후 세로발권 회귀를 검증한다. 이전 티켓 QA 기록을 이번 패널 변경의 통과 증거로 대신하지 않는다.

### 이전 14칸 구조의 기능 검사

Aside6006 전용 탭에서 UI 안정 이후 실제 CSS iframe viewport320×667 /390×844 /500×900을 확인했다. LongCountryAndPassenger는 나라2행·승객3행·공항1행·게이트1행이며 모든행14슬롯이었다. 320은 body305=scroll305 /board265=scroll265 /slot14.5px,390은 body390=scroll390 /board350=scroll350 /slot20.5625~20.578125px,500은 body500=scroll500 /board460=scroll460 /slot28.421875~28.4375px이었다. 차이는 subpixel grid 반올림이며 공백과 문자 슬롯은 같은 규격이다. 모든 공개 행 opacity1이고 확인 CTA48px를 유지했다. 긴 도시도 wrap하여 정보나 확인버튼에 접근할 수 있다. screenshot 직접 확인에서 긴 나라·혼합문자 이름이 추가행으로 이어지며 누락되지 않았다.

초기 blank story는 나라의14빈판이 그대로 보이고 details는 기존 phase 규칙에 따라 아직 hidden이다. ShortCountryAndPassenger는 UK 양끝6빈판씩과 A B의 내부공백을 같은판으로 표시했다. CountrySettledPanel은 나라정착/정보준비 안내, InformationRevealingPanel은 나라·승객·목적지·게이트가 모두공개되는 상태, ReducedMotion은320에서확정4행·확인CTA가즉시표시됨을확인했다. UnicodePassenger390의 실제각glyph textContent를읽어 `é`, `👩🏽‍✈️`, `👨‍👩‍👧‍👦`가각각하나의슬롯으로유지되고split되지않음을확인했다. 해당emoji는실제Unicodeedgecase fixture이며제품copy가아니다.

실제 App 수동회귀는 새이메일/닉네임입력→`/departure` ready→390×844세로상태의 확인버튼→`/issuer` printing1장→complete1장→탑승권보기→`/ticket` 같은 JASON JEONG /한국 /JEJU /CJU /A03결과가모두확인됐다. Storybook HMR로처음시도중 iframe fullreload가발생한시도는통과증거에서제외했다. 쓰기를중단한fresh flow를끝까지검증하고InitialBlankPanel로전환해두저장키의snapshot cleanup을수행했다. 이번패널수정에따른발권회귀가없음을확인한것이며이전타이머상세측정을새로실행했다고주장하지않는다.

신규 screenshot 증거디렉터리: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_lUaJIQZEqTh3NV2C/artifacts/`의 `whole-panel-long-320.png`, `whole-panel-long-390.png`, `whole-panel-long-500.png`, `whole-panel-blank-320.png`, `whole-panel-short-390.png`, `whole-panel-unicode-390.png`. 모두데스크톱CSSviewport증거이며물리폰검증은아니다. 최신카탈로그44개전체각각axe를재실행했다고주장하지않는다. 부모전체check및26tests/279assertions통과보고를받았고최종build는QA종료통보이후부모통합검사로진행한다. detached6006/Tailscale설정은변경하지않았다.

최신패널변경의최종통합결과(부모readback): `bun run check`, `bun test`26개/279 assertions,제품build및44개Storybook정적build모두통과했다. QA종료후6006 HTTP200도다시확인했다.

## 정보 위계 재설계 검증 준비

사용자가 행마다 작은14타일을반복하는디자인을거절했다. 위14칸기록은overflow/데이터보존의기능검사이력이며미학통과를뜻하지않는다. 최신표현은국가8대형칸·승객12칸·하단공항3칸과게이트3칸으로위계를나누며부모가기본ready미학을먼저검토한다. 브라우저QA는그승인뒤수행한다.

현재실데이터의최장영문국가는UNITED KINGDOM14graphemes/최단USA3이다. LongCountryAndPassenger를영국/LONDON HEATHROW/LHR로교체하고ShortCountryAndPassenger를미국/NEW YORK JFK/JFK로맞췄다. 명단에없는UAE19를실데이터최악값으로오해하지않는다. App/service에승객길이상한이없어기존혼합긴승객32graphemes를유지한다. Unicode edgecase도유지했다. Story추가없이44개다. 신규scanner7파일3hit는Unicodegraphemefixture/스와치비교간격/항공mono샘플로intentional이다. 다음QA는국가의대형패널존재감·승객과공항/게이트의보조위계·읽기쉽고답답하지않은여백을직접시각확인하며칸수충족만으로통과시키지않는다.

### 재설계 이후 대표 시각·경계 QA

카탈로그는 AUSTRALIA 단일 긴 단어 경계 story를 추가해 **45개**다. 부모의 기본 ready 미학 검토와 motion 프레임 검토 이후, Aside6006에서 최신 ready/UK/AUSTRALIA/Unicode의 실제 CSS viewport320/390/500 대표 상태를 확인하고 screenshot을 직접 봤다. 이 대표 검증을45개 전체 interaction 또는 미학 완성의 증거로 확대하지 않는다.

기본390 ready에서는 큰 국가 JAPAN이 먼저 읽히고, 별도 승객명 행이 그 아래에 있으며 하단의 큰 NRT와 작은 A03이 목적지·게이트를 구분한다. 같은 작은14칸이 반복되던 평평한 위계와 과도한 행 박스 반복이 줄었다. 국가의 큰 판, 승객명의 보조 행, 하단 공항과 게이트의 크기 차이가 각각 읽혀 패널 존재감과 정보 구분이 개선됐다. 이는 직접 시각 평가이며 슬롯 개수 충족만으로 내린 판정이 아니다.

| 대표 상태 | 실제 결과 |
| --- | --- |
| 기본 ready390 | 국가8·승객12·공항3/게이트3, body390=scroll390, board350=scroll350, CTA48px |
| 영국/긴 승객320 | UNITED / KINGDOM 두 행으로 단어 보존, 승객32graphemes 세 행 유지, body305=scroll305, board265=scroll265 |
| 영국/긴 승객500 | 국가·승객·공항·게이트가 모두 분리돼 읽히며 body500=scroll500, board460=scroll460 |
| 호주320 | AUSTRALIA가10칸 한 행으로 유지되며 잘리지 않음, body305=scroll305 |
| Unicode320/500 | é·👩🏽‍✈️·👨‍👩‍👧‍👦가 각각 하나의 glyph slot이며12칸 다음 행에서도 분리/누락 없음 |

320 실제 CSS font/판 높이는 국가24px/56px, 승객16px/36px, 공항32px/60px, 게이트24px/60px였다. 긴 값은 세로 스크롤을 사용하며 이름이나 확인 버튼을 숨기지 않는다. 500에서는 더 넓어진 판과 여백으로 긴 값도 읽기 쉬웠다. 초기 blank는 동일한 국가 판을 유지하며 기존 phase 공개 규칙을 따른다.

증거는 같은 Aside 디렉터리의 `hierarchy-ready-390-whole.png`, `hierarchy-uk-320.png`, `hierarchy-uk-500.png`, `hierarchy-australia-320.png`, `hierarchy-unicode-320.png`, `hierarchy-unicode-500.png`다. 바깥 Storybook 화면에 전체 구조를 표시하려고 iframe 외부 transform scale0.58을 사용한 캡처가 있으며, 실제 CSS viewport와 내부 computed font는 변경하지 않았다. 검증 후 외부 scale을 원복했다. 물리 휴대폰 또는 실제 브라우저 zoom 증거가 아니다.

신규 story scanner7파일3hit는 Unicode fixture/토큰 비교 간격/항공 mono 샘플로 intentional이다. 부모 제품 scanner10hits의 기존 항공 mono/티켓 tracking은 intentional이며, 이번 확정 디자인 결함인 평평한 위계와 반복 박스의 교정은 직접 시각검토로 평가했다. 최종 부모 readback: 전체 check,26 tests/279 assertions,제품 build와45개 Storybook 정적 build 모두 통과. detached6006/Tailscale 설정은 변경하지 않았다. 이번 요청의 정적 표현 변경과 무관한 과거 App 전체 흐름을 새로 재검사했다고 주장하지 않는다.

## 가로 보드와 90도 출력 재구성 검증 준비

최신 요청은 국가 단독 중앙 공개→650ms 배치 이동→가로 보드의 국가 좌46%·공항/게이트 우54%·아래 얕은 전체폭 승객행이다. 출력기는 긴 변이 위아래로 놓이도록 티켓을90도 회전해 상단 슬롯에서 아래로 출력한다. 기존 초기 blank/국가 정착/정보 공개/ready/긴 영국·호주/Unicode/printing/complete stories를 재사용하며 fixture는 유지한다. 이전 위계 재설계 QA는 이 변경 이전의 이력이고 신규 표현의 통과 증거로 대신하지 않는다. 구현 안정 및 부모 모션 QA 해제 뒤320/390/500 대표 상태, 회전된 티켓의 midprint·complete·슬롯 가림과 페이지 overflow를 확인한다.

### 90도 출력 대표 QA와 보드 변경 보류

90도 issuer 변경은 안정 소스에서 Aside6006 대표 검증을 완료했다. ResizeObserver 측정이 반영된 뒤320 긴 이름의 회전 종이는164.80×264px,슬롯169px,body320=scroll320였다. 500 complete는209.52×444px,슬롯214px,body500=scroll500이며 종이1장이다. 실제 transform matrix(0,1,-1,0)는90도 회전을 나타내며 이름·NRT/A03 정보가 모두 유지된다. screenshot을 직접 확인해 긴 변이 위아래로 놓이며 슬롯 아래로 출력된 모습을 확인했다.

PortraitPrinting390의 실제 Motion animation에서 paperY는−153.85→−82.57→−23.63→0으로 진행했다. 같은 관찰 구간에서 machineTop174px 고정,동일 DOM 티켓1장,출력창 overflow hidden을 유지했다. midprint screenshot은 종이가 슬롯 뒤에 가려지고 밖으로 나온 부분만 보였다. 이 story는 phase printing props를 유지하는 표현 검사이므로 실제 App의 phase 완료/타이머 통과 증거로 확대하지 않는다. 급지 중/완료 screenshot은 `rotated-issuer-midprint-390.png`, `rotated-issuer-long-320-settled.png`, `rotated-issuer-complete-500-settled.png`이며 같은 Aside evidence 디렉터리에 있다.

이후 사용자가 데이터별 분리 영역의 가로 보드도 거절하고 전체 표면 하나의 동일 cell2D matrix를 요청했다. 보드 QA는 이 요구 변경 시점에 중지했으며 나라 좌46%/공항 우54% 구조를 새 디자인의 통과 상태로 기록하지 않는다. 90도 issuer 검증은 유효한 완료 결과로 보존하고, matrix 소스가 안정된 이후 출발 안내의 viewport 검증을 새로 수행한다.

부모의 별도 실제 preview/hook 발권 검증: Enter 확인 후 printing의5개 sample 중 마지막 sample에서1600ms complete를 확인했다. 모든sample에서 같은 종이 DOM1장,90도 matrix(0,1,-1,0,175,0),paperY−201→−101→−4.8→85→123 하향 진행,viewport395=overflow395를 유지했다. 부모가 issuer4 screenshot을 직접 열어 회전된 종이 전체 표시를 확인했다. 이는 부모가 확보한 실제 phase 증거이며 위 Storybook 고정 printing 표현 검증과 별개다. App의 이메일 시작부터 전체 발급 경로를 이번 변경에서 재검사했다고 주장하지 않는다.

## 공항 열 제목·연속 데이터 행과 가로 안내 정책 준비

최신 요구는 상단 column labels와 한 줄 연속 flight data plane이다. 이전 7행 matrix 또는 데이터별 분리 영역의 결과를 이 구조의 통과 근거로 사용하지 않는다. 국가의 실제 글자수 패널을 단독 공개한 후 열 위치로 옮기며, 국가 공개 시작부터 세로 화면에서는 회전 안내와 함께 타임라인을 일시 정지한다. 가로 전환 후 같은 실행을 재개하며 issuer는 세로 발권 정책을 유지한다.

Departure stories에 `canvasMaxWidth:960`과 가로844×390 기본 viewport를 적용했다. 다른 stories의500px 캔버스 제한은 유지한다. `LivePortraitOrientation`은 실제 hook의 `needsOrientation`과 공용 OrientationPrompt를 사용하며 새 static 상태 대신 portrait→landscape 흐름을 제공한다. LiveJourney 발권 분기는500px로 제한한다. static 국가/긴 값/Unicode stories는 표현 경계를 위해 방향을 강제하지 않으며 실제 orientation 정책 증거는 live flow와 분리한다. 카탈로그는 이 신규 live story를 포함해46개다. 부모 실제 흐름 검증 뒤667×375/844×390 대표 정적 검증을 진행한다.

## 최신 가로 발권: 왼쪽 슬롯에서 오른쪽 출력

사용자가 발권도 가로 화면을 유지하도록 변경해 이전90도 회전 발권 QA는 이력으로만 보존한다. TicketIssuer의 ResizeObserver/회전/scale 계산을 제거하고 왼쪽 발권기·세로 슬롯과 정방향 BoardingPass 한 장을 배치했다. 종이는 `x:calc(-100% - 8px)`에서0으로 이동한다. 독립 read-only 리뷰에서 padding8px 때문에 초기 종이 가장자리가 노출될 가능성을 발견해 시작 변위에 그 간격을 포함했다. 기존 hook1600ms와 완료/onContinue 계약은 변경하지 않았다. App은 departure/issuer만960px,입력과 최종 TicketScreen은500px 제한을 유지한다. Preview의 요청된 미리보기 문구를 제거했다.

Aside6006 CSS viewport667×375 긴 이름은 정방향 종이510×238.22px,body652=scroll652(세로 scrollbar15px),승객 이름32graphemes 전체를 유지했다. screenshot에서 좌 발권기·세로 슬롯·우 탑승권과 이름을 직접 확인했다. 실제 Motion 프레임의 X는−505.38→−414.59→−316.46→−219.87→−129.43→−52.08→−2.65→0으로 증가했고 machineX26px 고정,같은 paper DOM/티켓1장을 유지했다. 이 printing story는 phase를 고정하므로 실제 App의1600ms phase 완료 증거로 주장하지 않는다.

844×390 complete에서는 종이487.48×228.38px,body844=scroll844,caption18px,버튼251.98×50.39px/하단352.38px로 안내와 CTA가 viewport 안에 함께 보인다. 짧은 가로 화면은 출력 영역600px 이하로 제한하고 완료 안내와 CTA를 같은 하단 행에 배치했다. ReducedMotionPrinting은 data-reduced-motion=true,transform none,티켓1장으로 즉시 표시했다. 대표 evidence는 `horizontal-issuer-long-667-final.png`, `horizontal-issuer-complete-844-final.png`이며 같은 Aside evidence 디렉터리에 있다. 물리 휴대폰 검증이 아니다.

전체 check 통과 후 scanner는42파일13hits였다. 기존 항공 mono/티켓 tracking/Unicode grapheme fixture/토큰 비교 간격은 intentional이며 새 issuer의 mono 브랜드는 같은 항공 표현이다. 확정된 신규 slop은 없다. 제품의 가로 발권은 부모 actual App/Preview phase 검증을 별도로 수행한다. 이 대표 표현 검증을46개 전체 interaction QA로 확대하지 않는다.

## 사용자 행 선택·높이 채우기 검증 준비

최신 요청은 별도 확인 CTA를 없애고 공개 모션이 끝난 최상단 사용자 항공편 행만 발권 대상으로 만드는 것이다. 배경 mock 행은 viewport 높이를 채우며 일부 행은 순차 플립을 보여주지만 상호작용 대상이 아니다. 기존 props/fixture를 재사용해 live 설명을 사용자 행 선택으로 갱신하고, 960×600 정착 표현 story를 추가했다. 현재6006 index readback의 catalog는53개이며, 다른 작업에서 추가한 stories도 포함한다. 이 숫자는 전체 interaction 통과를 뜻하지 않는다.

구현 안정 후844×390/667×375/960×600에서 높이 채우기·가로 overflow·사용자 행 ready/disabled·Tab focus와 Enter/Space·배경 행 비대화형·mock ordered flips를 대표 검증한다. ReducedMotion은 즉시 정착하지만 실제 live의 portrait orientation gate는 유지해야 한다. 고정 props story의 ready 상태와 실제 hook 타임라인 완료 검증은 구분한다. 이전 CTA·고정 mock 개수에 관한 기록은 이번 요청 이전 이력이다.

### 사용자 행 선택 최종 대표 QA

최신 사용자는 누르라는 화면 안내도 제거하고 모션으로 선택 가능성을 보여달라고 요청했다. visible hint를 제거했고 최종 CSS는 판38px/행간6px/행 터치44px다. ready에서만 실제 노란판이280ms 동안0→−2px→0 한 번 움직이고 얇은 outline이 나타난다. country는 내부 그룹만 움직여 중첩 transform을 피한다. CSS를 읽어1회/reduced 차단을 확인했고, 짧은 최종 관찰 시 이미 정착해 transform none이었다. transition 순간의−2px 프레임을 실제로 캡처했다고 주장하지 않는다.

Aside live에서 portrait390×844 회전 안내→landscape844×390 실제 재개를 확인했다. details3250ms에서 사용자 행 disabled,4000ms에 배경 행6개 moving leaves와 숫자 순차 변화(15:12→15:15,편명 끝9→2,다른 행15:42→15:43→15:45)를 관측했다.7250ms ready부터 행 enabled와 배경 정착을 확인했다. 초기 국가 moving은 primary class가 없으므로 mock 카운트로 해석하지 않으며 details 구간만 배경 플립 증거다. 최종 geometry 변경 시점에 source HMR이 있었으므로 이 타이밍은 별도 기능 관측값이다.

최종 live ready에서 실제 Tab 키로 일본 발권하기 버튼에 focus/solid outline,실제 Enter 키로 hook의 발권 중 화면 전환을 확인했다. 공개 영역의 semantic button은 사용자 행1개이고 링크0개로 mock 행은 비대화형이다. Space 활성화는 별도 실행하지 않았다. ReducedMotion 고정 story는 ready/enabled·노란 outline·animation none·moving0을 확인했다. 실제 OS reduce 환경과 live portrait gate를 동시에 재검증했다고 주장하지 않는다.

Storybook 최종 CSS viewport667×375/844×390은 mock4개,판38px,터치44px,body 폭과 scrollWidth가 동일했다. 아래 여백은 각각42.11px/46.53px로 가로 overflow가 없다.960×600은 mock8개/body960=scroll960이며 아래61.61px 여백이 남았다. Storybook decorator의 중앙 정렬/상하32px padding을 실제 App 기하와 구분했다. 초기 ResizeObserver 재측정과650ms country 배치 이동 중에는 잠시 어긋날 수 있어 정착 이후 country transform none을 다시 확인했다. 최종 전체폭 Storybook evidence는 `row-action-settled-844.png`다.

부모 추가 요청으로 실제5173 preview의 전용 same-origin iframe844×390을 만들고 root는 숨기지 않았다. 정착 geometry는 사용자1+mock5=6행/38px판/44px터치/국가transform none,body844=scroll844,last row bottom366.66px,아래23.34px(<1행)였다. main height392.66px/body scrollHeight393으로 수직2.66px 초과를 발견해 부모에게 보고했다. 화면 폭은 넘지 않는다. 이 프레임의 screenshot은 외부 브라우저 폭 때문에 우측이 잘려 전체 시각 증거로 사용하지 않는다. 만든 `storybook-quality-final-frame`만 삭제한 뒤 원래 portrait 안내 상태를 readback했다.

부모 집계 check/typecheck/앱 build/Storybook build 최종 통과를 수신했다. 이번 대표 QA는53개 전체 interaction 검증이나 실물 폰 검증이 아니다. scanner stories8파일3hits는 Unicode grapheme fixture/토큰 간격/항공 mono 샘플로 intentional이며 신규 확정 slop은 없다.

최종 소형 판37px 교정 후 실제844×390 preview를 한 번 재검증했다: ready/사용자1+mock5=6행 유지,터치44px,body[844,844,390]/main height390으로 기존 수직2.66px 초과가 해결됐다. 마지막 판 bottom360.66px/아래29.34px(<1행)를 확인하고 전용 iframe만 삭제해 원래 portrait 안내 상태로 복귀했다. 이전38px 수치는 교정 전 이력이다.

## 여러 항공사·ready 이후 배경 지속 갱신 준비

최신 계약은 사용자 행이 공개 완료 후 고정되고 하단 mock 행만 여러 항공사의 운항 정보를 계속 플립 갱신하는 것이다. 이전 ready에서 배경이 정착한다는 관측은 이 변경 전 이력으로 보존한다. 국가 열 너비는 실제 catalog의 최장 grapheme 수에서 계산한다. 기존 static fixtures를 유지하고 live 설명을 새 계약으로 갱신했다.

소스 안정 뒤667 또는844 대표 화면에서 최소2주기 연속 관측으로 사용자 행 target 불변·복수 항공사·mock target 변화·3D leaf를 검증한다. ready 사용자 행 선택은 기존 발권으로 이어져야 한다. 동작 줄이기는 정착 상태와 ongoing RAF 중단을 확인하고,portrait로 일시 정지했다가 돌아와도 사용자 정보가 유지돼야 한다. 모든 viewport 검증을 반복하지 않고 최장 국가14graphemes/자동 열 너비 계산은 별도 한 번 확인한다.

Catalog readback에서 wheelLabel을 Intl.Segmenter로 측정해 최장 UNITED KINGDOM14graphemes,NEW ZEALAND11,AUSTRALIA9를 확인했다. 과거 문서의 영국13 표기는14로 바로잡았다.

최신 표기 정책은 영국 wheelLabel을 UK로 줄이고,이에 따라 최장 국가는 NEW ZEALAND11graphemes다. LongCountryAndPassenger fixture는 뉴질랜드/AUCKLAND/AKL로 교체하고 ShortCountryAndPassenger는 UK/영국/LHR로 맞췄다. 이전14graphemes 확인은 변경 전 catalog의 측정 이력이다. 배경 갱신은 한 행(최대2행) burst를 끝낸 뒤8~12초 전역 idle을 유지하는 정책으로 다시 바뀌었으며,최종2주기 검증은 idle 구간을 포함해25~35초 관측한다. idle에는 moving leaf가 없어야 하고 사용자 행은 계속 고정돼야 한다.

최신 추가 요구로 사용자 행은 항상 맨 위가 아닌 화면 안 임의 행에 배치되며 한 실행 동안 payload와 위치를 유지한다. 공개 후 손가락 안내가 노란 사용자 행을 가리키고 visible 지시 문장은 없다. 기존 top 불변 기준을 사용자 식별 노란 행의 payload/position 불변으로 바꾼다. 최종 통합 관측은 인접 mock burst에서도 사용자 행이 유지되는지,guide가 행에 붙어 있고 pointer-events none인지,reduce에서 정적이며 임의 위치가 viewport 안인지와 클릭/키보드 발권을 포함한다. 새 소스 안정까지 브라우저 검증은 보류했다.

### 여러 항공사·랜덤 행·성능 최종 마감

최종 보드는 TIME/DESTINATION/AIRLINE/FLIGHT/GATE/STATUS6열,30glyph다. 항공사에서 AIR를 제외하고 편명은 숫자3자리이며 상태는 한글2글자다. catalog 최장 NEW ZEALAND11graphemes를 현재 소스로 다시 확인했다. 랜덤 사용자 행은 실행별 위치를 선택하며 동적 배경에는 GDG/KOREAN/ASIANA/ANA/JAL 등 여러 항공사와 운항 값을 사용한다. 초기 배경 갱신은 details+12000ms 이후이고,한 행 burst 뒤11.6초 idle/14초 주기를 사용한다.

844×390에서 한글 상태 clip을 실제 발견했다: inner glyph26.89px>plate22.20px였다. status-only wide 교정 후 glyph17.28px<plate22.20px/font19.97px로 해결됐고 최종 screenshot을 직접 확인했다. 영문 크기는 유지됐다. 보드 padding8px가 상하좌우 같고 body844=scroll844였다. 3D hand는 natural256×384/표시56×84,로드 완료/pointer-events none이며 뒤집힌 하단 안내의 손끝[422,322.97]가 노란 행 중심[422,322.97]와 정확히 일치하고 화면 안에 있다. 최종 evidence는 같은 Aside 디렉터리의 `final-six-columns-wide-status-844.png`다.

소스 변경 중 긴 관측에서 iframe document identity가 바뀐 구간은 동일 실행의 사용자 행 이동으로 판정하지 않았다. 안정된 문서를 유지한 마지막31.05초 관측은 document 교체 없음/data-user-row5/payload1종류 불변,배경11가지 표시 상태와 여러 항공사·운항 값 변화,최대 한 행의3D matrix leaf 및 긴 idle을 확인했다. 타이머 표본이 후반에 줄어 두 번째 burst의 leaf를 별도로 잡지 못했으므로 실제2주기3D 검증 완료로 과장하지 않는다.14초 주기/idle 계약의 자동검증과 이 대표 브라우저 관측을 구분한다. portrait 안내→landscape 복귀 후에도 사용자 행5/같은 payload/enabled를 유지했다.

최신 실행에서 노란 사용자 버튼의 실제 Enter 키 입력으로 발권 중 상태 전환을 확인했다. 실제 Tab focus도 확인했다. Space 키 입력 직후 전환을 확정하지 못해 Space 통과로 기록하지 않는다. ReducedMotion story는 ready/enabled·moving0·guide animation none이며,정착 후1.5초 requestAnimationFrame 요청0을 직접 계수했다. 임시 브라우저 observer와 RAF wrapper를 모두 정리했다.

성능 관측은 같은844×390/visible/focused=false의 burst 진입 직후3초 구간이었다. 변경 전180 RAF frames/p95 17.6ms/max17.7ms/DOM mutation928/longtask0,변경 후180 frames/p95 17.4ms/max17.7ms/DOM711/longtask0이었다. 브라우저에서는60fps 유지와 긴 작업 미관측을 확인했으며,5열→6열/3D guide로 내용도 바뀌어 DOM 감소를 순수 React CPU 개선률로 해석하지 않는다. 구현 담당의 별도 동일5열 workload150frames×12mockrows bench는66.87→3.96ms(94.1% 감소)였으며 브라우저 CPU 측정과 분리한 소스 helper benchmark다.

부모 최종 집계: 전체 검사와 앱/Storybook 재빌드 통과,78 tests pass/6 skip/0 fail/456 assertions. 이번 대표 관측을 전체 Storybook interaction 통과나 물리 휴대폰 검증으로 확대하지 않는다. source 추가 변경 없이 문서만 마감했다.

### 손가락 안내 v2 교정 검증

이전 56×84 손 이미지는 사용자 거절로 현재 수용 근거에서 제외한다. 새 pointing-hand-3d-v2.webp(240×253)는 실제844×390 Storybook에서38×40/.65opacity로 로드됐다. 실제 작은 render를 캡처해 직접 확인했고 작은 비스듬한 검지 포인터로 읽히며 큰 데이터 가림이나 투명 잔픽셀 노이즈가 보이지 않았다. 부모도 같은 캡처를 직접 확인해 수용했다. 캡처는 Aside artifacts의 `hand-v2-ready-cue-844.png`이며 CSS animation을 정지하거나 조작하지 않은 실제 cue다.

cue 당시 guide bottom272.59px<viewport390px,body844=scroll844였다. 일반 ready cue가 DOM에서 사라진 뒤에도 사용자 버튼은 enabled였고, ReducedMotion story도1.1초 뒤 guide DOM missing/enabled를 확인했다. 실제 live 실행에서 cue가 사라진 노란 사용자 행을 클릭해 `탑승권 발권` region과 `발권 중입니다.` 상태로 전환했다.1300ms 일반/900ms reduced 제거 타이머는 소스 계약이며 브라우저 관측은 이후 DOM 제거를 확인한 범위다. 이번 검증은 손 안내 교정 범위이고 전체 성능·2주기 플립 검증을 반복하지 않았다.

### 실제 플랩 기구 검사

SingleFlapInspection은 제품에서 export한 실제 FlapCell을 재사용한다. wrapper를 display:grid로 두어 제품처럼 griditem blockification을 유지했고100×100 bounds를 직접 확인했다.2초 느린 A→B 검사에서 Web Animations currentTime을0/450/900/1500/2000ms로 고정한5장 캡처를 직접 확인했다. A 전체→접히는 A 상부/기존 A 하부→새 B 상부/기존 A 하부→앞으로 돌출한 B 하부→B 전체 순서로 읽히며 glyph masks와 hinge 순서가 유지됐다. 이들은 정지 단면 검사이며 제품 속도의 연속 영상으로 간주하지 않는다. evidence는 같은 Aside artifacts의 flap-v2-start/fold/edge/fall/settled.png다. scene computed transform-style preserve-3d/opacity1이며 셀 bounds는100×100으로 고정됐다.

아래판92%의-2deg는 housing 안쪽 반발이라는 검토 후+2deg로 교정됐다. 신규 source에서2초 검사1912ms 단면인 flap-v2-landing92-positive.png를 직접 확인해 B 정착/과한 bounce나 old A 겹침 없음으로 판정했다. 기본110ms 실제 재실행은 mutation 관측 뒤 RAF samples로 상부0→-90,하부+90→0 진행을 확인했다(상부13~62ms/하부79~130ms, 시작 관측 지연 포함). 짧은110ms의 연속 육안/영상 인상은 별도 확보하지 못했으므로 느린 단면과 수치만으로 정상 속도 미학을 완전 검증했다고 주장하지 않는다. 실제 live hook도 ready 이후 노란 행을 클릭해 발권 중 상태로 전환됐다. 임시 observer는 모두 제거했다.

stories scanner8파일3hits는 Unicode grapheme fixture·토큰 비교 gap·airport mono sample로 intentional이며 신규 confirmed slop은 없었다. 부모 집계는 최종 check/앱·Storybook build 통과,88 tests pass/42 skip/0 fail/642 assertions다. 이 자동 집계와 이번 대표 단면·클릭 관측은 분리한다.

### 컨테이너 이동·영문 상태·귀국 최종 계약

소스가 src/containers/ticket으로 이동한 경로를 유지했다. 기존6006 devserver의 alias import 실패는 현재 vite.config를 재독입하는 정확 해당 서버 재시작으로 해결됐고 별도alias설정/옛경로복원은 하지 않았다. 현재 detached bun41328/node41329/127.0.0.1:6006/HTTP200이며 Tailscale설정은 보존됐다.

NZ 표기 선택으로 catalog 최장 AUSTRALIA9,국가9열/상태8열이다. 긴 국가+승객 fixture는 AUSTRALIA/호주/SYDNEY/SYD로 갱신했다. English DELAYED/BOARDING/DEPARTED를667/844 실CSS iframe에서 직접 캡처해 읽기·잘림·열정렬을 확인했다. 중간 ORIGIN 캡처는 최종 header/KOREA 요구 전 이력이며 최종 수용 근거로 사용하지 않는다. 최신 live는 details 중 국가JAPAN5glyph wrapper만 이동하는 캡처와 DEPARTURES옆5glyph 정착을 확인했고 추가 빈판은 없었다. 실제 사용자 destination은 KOREA였다. 기기18:06과 사용자TIME18:06이 일치하며 이후 mock rerender·667resize 뒤에도18:06을 유지했다. 844body844=scroll844,667×375는 Storybook decorator세로padding 때문에 세로scrollbar가 생겨body652=scroll652였으며 가로overflow는 없었다. 이 결과는 실앱의 세로핏과 구분한다.

귀국 공통 saveRegion의main/stub은 FROM NRT TOKYO/NARITA→TO ICN SEOUL/INCHEON/단일article임을 확인했다. 동일 live 사용자 행 선택 후 발권완료main/stub도 BOARDING18:06과같은귀국방향을 유지했다. 이번scope는 saveDOM방향이며 새PNG다운로드 성공으로 주장하지 않는다. evidence는 Aside2026-10-10_YL3Am9EesJsCSsfy/artifacts의 final-country-header-844.png,final-country-header-ready-844.png,final-country-header-ready-667.png,return-ticket-save-region.png다.

이동된 ticket stories scanner5파일1hit는 Unicode grapheme 이름fixture로 intentional이다. 새confirmed slop은 없었다. 부모 최신집계는143 pass/42 skip/0 fail/922 assertions,앱·Storybook build 성공이다. 전체 motion/performance 검증을 재실행하지 않고 새 header/localclock/KOREA/귀국 route 계약만 대표 확인했다.

### 실제 앱 헤더 잉크·주변 mock 시각 교정

최신 사용자 지적은 나라헤더가제목보다커보이고시각이사용자18시대와mock15시대로멀다는 것이었다. 첫26px 박스교정만으로 통과처리하지 않고 h1의 cap trim 적용/출발안내DOM삭제와 시간helper교정을 합쳐 실제5173 preview same-origin iframe에서 확인했다. CSS.supports(text-box:trim-both cap alphabetic)=true였다.844×390에서 title ink box19.84px/나라glyph17.52px,중심41.00/40.99px로 정렬됐고body844=scroll844/height390였다. 사용자18:11 주변mock17:23/17:35/17:47/17:59/18:23으로 가까운시각이배치됐다.844 전체캡처는 outer창395폭에서잘려 수치와부분기록으로만 분리한다.

667×375 실제iframe은 outer395에맞춰CSS scale.55로전체촬영했으며 실제 내부viewport는667×375 그대로다. titlecap15.66px/나라cap17.38px,중심둘다41.00px로 기존상하어긋남은 사라졌다. 작은폭에서나라잉크가약11%더높다는 실제비율을남기며 box중심만으로 미학통과를 단정하지 않는다. 전체캡처를직접확인해큰국가판불균형이해소됐음을확인했고부모시각검토용 `final-header-ink-time-667-scaled.png`를전달했다. 사용자18:13/mock17:37/17:49/18:01/18:25였고body667=scroll667이었다. 캡처경로는 Aside2026-10-10_YL3Am9EesJsCSsfy/artifacts다.

동시refactor/HMR로owniframe이몇차례사라진것은제품기하실패로분류하지 않았다. 최신bundle대안build시common/index 중간import6건TS2307로막혀옛경로복구나임의수정을하지않았다. 이후부모가동시refactor import정리와최신앱/Storybook build재성공을확인했다.4173서버는추가하지않았고최종actual5173대표관측으로마감했다. owniframe은최종존재0개를확인했고원래landing/root는수정하지않았다. 기존모션/배포/backend검증은반복하지않았다.

최종 header 인수는 높이도 동일하게 맞추는 것으로 강화됐다. expanded header에공통font-size+font-size-adjust:cap-height0.7을 적용한 최신 actual5173 preview에서두viewport를한frame으로측정했다.844 titlecap/glyphcap둘다19.50px/center둘다41.00px,667둘다15.390625px/center둘다40.9921875px였다. computedfont-size-adjust도양쪽cap-height0.7이며가로bodywidth=scrollwidth였다. 이전66711%차이는이최종정규화로대체됐다. header-cap-normalized-667.png(actual667×375/outer395대응scale.44)를직접확인해같은잉크높이·중심으로읽힘을확인하고부모/디자이너에게전달했다. Compacthero/body는새CSSselector밖이며이번관측은expandedheader만이다. ownframe최종0개cleanup완료.

### 최종 900ms 공동 축소·HOME/GDG121·본문 가독성

이전650ms 국가 단독 이동/KOREA 계약은 이번 사용자 요구로 대체됐다. 최신 actual5173 preview를 같은 origin의844×390/667×375 CSS viewport iframe에서 확인했다. fullPage 캡처는 outer395창을 늘리지 않고 iframe 전체 실제 픽셀을 담았으며 물리 휴대폰 검증은 아니다. 두 settled 화면을 직접 열어 확인했고 부모도 두 이미지를 직접 검토했다. HOME/GDG/121 노란 행과 일반 항공사2문자/공항3문자, English 상태가 잘리지 않고 읽힌다. 본문 plain0·작은 glyph·넓어진 categorygap·완화된 seam은 글자 주변 여백과 열 구분을 개선했다.

844는 body width/scrollWidth844/844,height390,제목/나라 capheight19.5/19.5px다.667은667/667,height375,capheight15.390625/15.390625px, matrixbottom317px로 넘침이 없다.844의0판은24.20×37px/glyph12.13×19.05px로 가로·세로 여백을 유지했다. 모션 대표 관측은 hold progress.2466에서 board scale3/국가glyph58.5px, shrink progress.5799에서 scale2.42571/glyph47.30px, settled에서 scale1/glyph19.5px였다. country와 board가 같은 비율로 축소됨을 확인했다.900ms는 source 계약이며 실제 샘플로 정확한 wall-clock900ms나60fps CPU 성능을 주장하지 않는다.

최종 이미지: `/Users/junhyeok_work/.aside/u/0/sessions/2026-10-10_OteKNq1Jpc6wWKMT/artifacts/final-readable-home-844.png`, `final-readable-home-667.png`. 대표 모션은 같은 경로의 `polish-844-formed-hold.png`, `polish-844-shrink-middle.png`, `polish-844-settled.png`다. 부모는 최신 앱 build exit0 및 실제 HOME/GDG121/티켓GDG121 source readback을 보고했다. 현재 변경만 대표 확인했으며 기존 모션/클릭/reduced/portrait 전체 회귀는 반복하지 않았다. 최종 사용자 요청으로 추가 클릭은 생략했다. own iframe quality-final-polish는 cleanup readback에서0개이며 원래 landing/root는 보존했다.

최종 설명 갱신 뒤 kill-ai-slop은 DepartureReveal 범위10파일/2groups/8hits였다. Departure.stories.tsx의 Unicode emoji는 grapheme 보존 fixture, departureBoardRows/panelSlots tests의5hits도 Unicode 단위 검증으로 intentional이다. departure-reveal.css의 DIN/mono2hits는 승인된 공항 플랩 폰트로 intentional이다. 이 범위 신규 confirmed slop은 없으며 다른 담당 소스는 수정하지 않았다.
