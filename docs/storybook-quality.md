> 현재 요구사항은 **세로 화면 유지·확인 즉시 출력·상단 슬롯에서 가로형 티켓을 아래로 출력**이다. 아래 이전 회전 정책의 검증 기록은 이력이며 최신 세로 출력 UI의 통과 증거로 재사용하지 않는다. 새 계약의 실제 QA 결과는 문서 끝에 추가한다.

# Storybook 검증 기록 — U5

2026-10-10. 실제 UI 표현35개와 App회귀1개, 총36개 stories를 구성했다. Storybook이 제품 라우팅·실제 서버·기기 검증을 대체하지 않는다.

## 실행

- `bun run storybook`: http://localhost:6006 (기존 앱 5173과 독립, 자동 브라우저 열기 없음).
- `bun run build-storybook`: `storybook-static/` 정적 산출. Git ignored.
- Storybook 10.6.1 / React Vite framework. 설치 시 npm registry 공식 패키지의 peerDependencies에서 Vite `^8.0.0`, React/React DOM `^19.0.0`, TypeScript `>=4.9.x` 지원을 확인했다. 기존 프레임워크 다운그레이드 없음.
- 참고: [공식 React Vite framework](https://storybook.js.org/docs/get-started/frameworks/react-vite/), [공식 Vite 8 지원 추적](https://github.com/storybookjs/storybook/issues/33789).
- Docs와 a11y addon만 추가. Play assertions는 `storybook/test` 사용. 별도 Playwright/Vitest 테스트 프레임워크 설치 없음.
- Preview는 실제 `src/index.css`, max500px, 375/500/844×390 viewport 및 MotionConfig 동작 줄이기 toolbar를 제공한다. 실제 hook을 사용하는 live story는 OS `prefers-reduced-motion`과 현재 iframe 방향을 감지한다. 명시적인 ReducedMotion story는 즉시 정착을 보여준다.
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

Rollback은 `.storybook`, `src/stories`, 이 문서, Storybook scripts/dependencies와 해당 ignore/TS/ESLint 범위만 되돌린다. 현재 package 파일은 설치 종료 후 frontend에게 쓰기권한 반환했고 추가 이미지 의존성을 보존한다. 커밋·푸시·배포 없음.

## 이전 회전 정책의 U6 검증 (세로 출력 변경으로 대체)

최신 enlarged BoardingPass/h1/onContinue 계약 이후 재확인했다. 320/390/500, 667×375/844×390 viewport를 추가했다. 초기 Storybook 메뉴 선택이 실제 iframe 크기를 변경하지 않던 상태에서는 same-origin `#storybook-preview-iframe` CSS width/height/min/max를 고정하고 innerWidth/innerHeight readback으로 확인했다. 이후 initialGlobals viewport 기본390을 명시하자 addon 폭이390으로 적용됐지만 높이는 사용 가능한 바깥 패널 높이778로 제한됐다. 정확한 요청 높이는 CSS iframe 방법으로 검증했다. 이는 데스크톱 브라우저의 CSS viewport이며 실제 휴대폰 증거가 아니다.

| 대표 상태           | CSS viewport                | 결과                                                                         |
| ------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| Landing             | 320×667 / 500×900           | body clientWidth=scrollWidth 305/485, CTA 높이50px, 행사 제목/정보 wrap 정상 |
| Email format error  | 320×667                     | body320=scroll320, error/label/CTA 보임, back44px/CTA50px                    |
| Nickname long       | 390×844                     | body390=scroll390, input value 전체 유지(입력 내 수평이동), back44px/CTA50px |
| Ticket long         | 320×667 / 390×844 / 500×900 | body305/375/485=scrollWidth, 이름 wrap, CTA≥44px                             |
| Expanded long modal | 320×667                     | body320=scroll320, modal286=scroll286, 닫기62×52px, label14.4px              |
| Expanded long modal | 667×375                     | body667=scroll667, main500, modal높이341, 내부 content341→705 세로scroll     |
| Issuer printing     | 667×375 / 844×390           | body667/844=scrollWidth, main500, 티켓과 발권기 가로화면에 표시              |
| Reduced motion      | 320×667                     | 확정 결과 즉시 표시, 확인 CTA265×48px 유지, body305=scroll305                |

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

| 최신 대표 상태    | CSS viewport | 실제 결과                                                                                                 |
| ----------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| 세로 출력 긴 이름 | 320×667      | 264×164.80px,가로비율1.602:1,body320=scroll320,이름전체표시                                               |
| 세로 출력 긴 이름 | 390×844      | 334×190.16px,가로비율1.756:1,body390=scroll390                                                            |
| 세로 출력 긴 이름 | 500×900      | 444×209.52px,가로비율2.119:1,body500=scroll500                                                            |
| 동작 줄이기 출력  | 390×844      | 단일티켓334×175.58px,paper transform none,즉시표시                                                        |
| 확대 긴 이름      | 320×667      | ticket720×354.64px,modal286=scroll286,body320=scroll320,의도된내부pan231→720,label14.36px,닫기61.7×52.4px |

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

현재실데이터의최장영문국가는UNITED KINGDOM13graphemes/최단USA3이다. LongCountryAndPassenger를영국/LONDON HEATHROW/LHR로교체하고ShortCountryAndPassenger를미국/NEW YORK JFK/JFK로맞췄다. 명단에없는UAE19를실데이터최악값으로오해하지않는다. App/service에승객길이상한이없어기존혼합긴승객32graphemes를유지한다. Unicode edgecase도유지했다. Story추가없이44개다. 신규scanner7파일3hit는Unicodegraphemefixture/스와치비교간격/항공mono샘플로intentional이다. 다음QA는국가의대형패널존재감·승객과공항/게이트의보조위계·읽기쉽고답답하지않은여백을직접시각확인하며칸수충족만으로통과시키지않는다.

### 재설계 이후 대표 시각·경계 QA

카탈로그는 AUSTRALIA 단일 긴 단어 경계 story를 추가해 **45개**다. 부모의 기본 ready 미학 검토와 motion 프레임 검토 이후, Aside6006에서 최신 ready/UK/AUSTRALIA/Unicode의 실제 CSS viewport320/390/500 대표 상태를 확인하고 screenshot을 직접 봤다. 이 대표 검증을45개 전체 interaction 또는 미학 완성의 증거로 확대하지 않는다.

기본390 ready에서는 큰 국가 JAPAN이 먼저 읽히고, 별도 승객명 행이 그 아래에 있으며 하단의 큰 NRT와 작은 A03이 목적지·게이트를 구분한다. 같은 작은14칸이 반복되던 평평한 위계와 과도한 행 박스 반복이 줄었다. 국가의 큰 판, 승객명의 보조 행, 하단 공항과 게이트의 크기 차이가 각각 읽혀 패널 존재감과 정보 구분이 개선됐다. 이는 직접 시각 평가이며 슬롯 개수 충족만으로 내린 판정이 아니다.

| 대표 상태       | 실제 결과                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| 기본 ready390   | 국가8·승객12·공항3/게이트3, body390=scroll390, board350=scroll350, CTA48px                              |
| 영국/긴 승객320 | UNITED / KINGDOM 두 행으로 단어 보존, 승객32graphemes 세 행 유지, body305=scroll305, board265=scroll265 |
| 영국/긴 승객500 | 국가·승객·공항·게이트가 모두 분리돼 읽히며 body500=scroll500, board460=scroll460                        |
| 호주320         | AUSTRALIA가10칸 한 행으로 유지되며 잘리지 않음, body305=scroll305                                       |
| Unicode320/500  | é·👩🏽‍✈️·👨‍👩‍👧‍👦가 각각 하나의 glyph slot이며12칸 다음 행에서도 분리/누락 없음                                   |

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
