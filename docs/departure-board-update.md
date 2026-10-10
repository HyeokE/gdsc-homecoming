# 레트로 플랩 공항 안내판

2026-10-10. 사용자가 제공한 실물 Solari 안내판 사진의 구조와 최신 열·목데이터 지시를 따른다. 앞선 분리 카드, 16열 7행 라벨 행렬, 승객·공항 열은 이 최종 요청으로 대체됐다. 기존 구조의 기능 QA와 부모 검토를 새 결과의 수용 근거로 쓰지 않는다.

참고 사진 `/Users/junhyeok_work/Library/Application Support/CleanShot/media/media_wD5HEHT4yB/CleanShot 2026-10-10 at 3.09.24 PM.png`를 직접 열어 확인했다. 실물의 짙은 프레임, 큰 DEPARTURES, 고정 열 제목과 얇은 행 레일, 중앙 힌지를 반영했다. 색은 기존 차콜·아이보리·Google 노랑을 사용한다. LED나 도트 표현은 없다.

## 안내판의 데이터

정적 열 제목 위, 값이 아래에 있는 6열 안내판이다. 최신 요청은 본문의 나라 이름·항공사 이름을 실제 IATA 코드로 대체한다. 시간5칸, 도착공항3칸, 항공사2칸, 편명 숫자3칸, 게이트3칸, 상태8칸으로 총24칸이며 카테고리 사이 다섯 간격을 포함한29트랙을 공유한다. 공통 출발국가는 DEPARTURES 옆 실제 국가 패널에 그대로 유지한다.

노란 사용자 행은 flow에서 한 번 캡처한 HH:mm / ICN / KE / 121 / 배정 gate / BOARDING이다. optional 표시 필드가 있으면 소비하고 기존 fixture에는 같은 기본값을 사용한다. 실제 공항·항공사 코드 사전으로 목데이터를 구성하지만 운항편이나 시각을 실시간 조회하거나 실제 직항을 보장하는 기능은 아니다. 탑승권 main/stub도 같은 항공사+편명 표시를 사용하며 브랜드 GDG AIR는 유지한다.

나머지 행은 기존 결정적 UI 목데이터와 주기 갱신 규칙을 유지한다. 접근성 결과와 완성 탑승권에는 귀국 방향의 출발 국가·도착 인천을 명확히 남긴다. 저장 schema·배정 id·서비스 발급 결과를 새 운항 기록으로 변경하지 않는다.

## 큰 안내판 생성 후 전체 축소

2026-10-10 최신 사용자 요청은 국가판 단독 이동을 대체한다. 처음에는 실제 국가 grapheme만 중앙에 놓고 정착시킨다. Hero는 최종 헤더 패널과 동일한 글자·판·힌지·간격 기하를 3배로 보여 주므로 보드가 처음 생길 때 국가 glyph/cell 크기를 바꾸지 않는다.

`details` 시작에는 같은 국가 중심을 기준으로 전체 장비·제목·내용이 3배 크기로 먼저 나타난다. 공유 elapsed 기반 900ms 전환의 앞 32%(288ms)는 큰 보드를 유지한다. 표면 0–90ms → 제목 27–126ms → 열 제목 54–153ms → 본문 90–189ms로 차분히 등장하고, 모든 내용이 보인 뒤 약99ms 더 유지한다. 이후 612ms에 보드 전체의 scale과 translate를 함께 최종 위치로 줄인다. 시작과 끝의 속도·가속도가 0인 quintic easing으로 출발·정착을 부드럽게 하며 반동은 없다. 국가 패널은 fade하지 않는다. 국가 노드의 개별 layoutId tween은 제거했다. 최종 헤더의 cap-height 정렬과 본문 플랩 기구는 유지한다.

확대 장면은 바깥 scene에서 clip하여 문서 가로 overflow를 막는다. 최종 행 수는 transform과 무관한 레이아웃 offset으로 계산한다. `data-transition-stage`는 country / board-hold / board-shrink / board-settled이며 `data-transition-progress`는 공유 reveal elapsed의 0~1 값이다. 별도 전환 타이머가 없어 portrait pause·run 재시작이 기존 reveal 시계와 일치하고 reduced motion에서는 즉시 최종 보드를 보여 준다. 공동 축소 612ms 동안만 reveal clock을 매 RAF 갱신하고, 나머지 플립과 정착 구간은 기존 30ms 샘플링을 유지한다.

회귀 검사는 hero 정착과 첫 보드 프레임의 국가판 크기 연속성, 큰 shell hold 후 전체 공동 축소, 최종 667/844 헤더 cap 정렬·가로 overflow·행 채움, portrait pause 및 reduced motion을 분리한다. 코드 검사는 시각 인수를 대신하지 않으며 실제 연속 프레임 판정은 독립 QA가 담당한다.

## 치수와 흐름

전체 판은 화면 높이에 맞춘 여러 운항 행이며 모든 셀 높이는 37px로 동일하고 행 간격은 6px이다. 발권 버튼의 투명 hit area는 상하로 확장하고 최소 44px을 확보한다. 기존 셀 폭의 0.9배 em 크기는 좁은 서체의 실제 잉크 폭을 지나치게 작게 만든다는 추가 피드백을 받았다. 타이포그래피 담당자가 간격을 반영한 실제 셀 폭과 판 높이에 맞춰 mono 글리프 크기와 잉크 중심을 교정했다. 얇은 셀 rim, 판 상하 edge와 중앙 힌지만 두고 장식 나사나 새 아이콘을 넣지 않았다.

별도 확인 버튼은 제거하고 노란색 사용자 운항 행에서 발권한다. 기존 문자 회전 일정, 650ms 국가 이동과 확인 조건을 유지하며 모션 감소에서는 최종 결과로 바로 이동한다. 국가 공개부터 휴대폰 가로 안내를 제공하는 요구는 프론트 방향 흐름에서 처리한다. 가로 전광판의 최대 폭은 960px이고 다른 입력 폼의 기존 최대 500px과 구분한다. 발권기의 가로 티켓 출력 변경은 별도 구현이다.

## 검사

표현 소유 파일은 `src/containers/ticket/components/DepartureReveal/DepartureReveal.tsx`, `src/containers/ticket/components/DepartureReveal/departure-reveal.css`이다. 6열·가변 행 구현 후 Prettier, 해당 컴포넌트 ESLint와 전체 TypeScript 검사를 통과했다. 변경마다 kill-ai-slop 스캔·코드 판독을 수행했다. 실물 플랩의 서체와 물리적 회전 명암은 의도된 표현이며 분위기 그라데이션이나 글로우를 추가하지 않았다.

카테고리 간격과 footer 삭제 후 컴포넌트 Prettier·ESLint·전체 TypeScript 검사를 다시 통과했다. kill-ai-slop 스캔에서 새 표현 문제는 발견되지 않았다. 실제 viewport 수치와 시각 검증 근거는 별도 `docs/storybook-quality.md`에서 관리한다.

부모·담당자 검토는 사용자의 최종 디자인 수용을 대신하지 않는다.

## 노란색 사용자 운항 행에서 발권

사용자의 후속 요청으로 별도 `확인했어요` CTA를 제거했다. 실제 사용자 운항 행 전체를 하나의 semantic button으로 연결했다. 모션이 끝나기 전에는 disabled와 클릭 guard로 막고, 완료되면 나라 이름과 `발권하기` 접근성 이름을 제공한다. Enter·Space의 기본 버튼 동작과 키보드 초점은 유지한다. 실제 판은 접근성에서 숨기고 버튼을 노출하므로 matrix 전체를 aria-hidden으로 막지 않는다. 나머지 예시 행에는 클릭 동작이 없다.

화면 높이에 맞춘 예시 행은 matrix의 실제 top과 computed 판 높이·행 간격(현재 37px·6px)에서 온전하게 들어가는 행 수를 계산한다. 마지막 행이 잘리지 않도록 바닥에 20px 여유를 둔다. 부족한 공간에서는 예시 행을 줄이고 높은 가로 화면에서는 늘린다. 시간·나라·편명·게이트 fixture는 인덱스로 결정되며 무작위 재추첨은 없다.

최초 공개 중 일부 숫자판을 순차 회전한 뒤 details 시작 후 12초까지 정착 시간을 둔다. 초기 숫자 정착 후 약 10.6초, 사용자 ready 후에도 충분한 읽기 시간이 확보된다. 이후에도 나머지 예시 운항 일정만 계속 갱신한다. 15초 cycle마다 한 행만 최대 3.4초 동안 정해진 문자 wheel을 따라 새 나라·시간·항공사·편명·게이트로 갱신한 뒤 모든 행이 11.6초 정착한다. 다음 cycle은 다음 예시 행으로 순환하며 실제 사용자 행은 바꾸지 않는다. 숫자끼리는 0–9 전용 wheel, 영문·공백끼리는 공백과 A–Z wheel을 사용한다. 랜덤 글자 점프는 없다.

정착 sleep에서는 RAF를 돌리지 않고 다음 cycle까지 timer로 대기한다. 문서가 숨겨지거나 휴대폰이 세로가 되거나 컴포넌트가 사라지면 예약 작업을 취소한다. 가시성 복귀에서는 활성 시간만 이어가며 모션 감소에서는 목데이터도 움직이지 않는다. 목데이터 변경을 live status로 읽어 주지 않는다.

항공사 표시명은 GDG·KOREAN·ASIANA·ANA·JAL·QANTAS로 AIR를 제외하고 최대 6칸에 유지한다. 보드 편명은 숫자 마지막 세 자리만 표시한다. 실제 티켓의 항공사·전체 편명과 발급 데이터는 유지한다. 상태는 DELAYED·BOARDING·DEPARTED이며 가장 긴 label의 grapheme 길이로 8칸을 계산한다. 사용자 일정은 BOARDING이다. 영어 상태 변화는 기존 A–Z 순차 physical wheel을 사용하며 다른 입력의 한글 직접 회전 분기는 보존한다. 국가 열은 하드코딩 대신 목적지 catalog wheelLabel의 grapheme 최장 길이로 계산한다. 사용자 지시에 따라 영국 표기는 UK, 뉴질랜드 표기는 NZ로 바꿨으며 현재 최장 AUSTRALIA는 9칸이다. 뉴질랜드의 국가명과 도시·공항 데이터는 유지한다. 저장된 배정·도시·서비스 로직은 바꾸지 않았다.

행 수와 마지막 행 경계, 결정적 fixture, 순차 숫자 회전 및 grapheme 보존을 확인하는 행·기구 focused 테스트 두 파일 20개·409개 assertion을 추가했다. 컴포넌트·새 helper/hook의 Prettier·ESLint·전체 TypeScript가 통과했고 kill-ai-slop 스캔에서 새 표현 문제는 없었다. 실제 667×375·844×390 및 높은 가로 viewport의 행 수·하단 경계·발권 버튼 검증은 `docs/storybook-quality.md`에 기록하며 실제 휴대폰 실물 검증과 구분한다.

사용자가 글자로 클릭을 안내하지 말라고 명시해 ready·pending 시각 안내 문구를 모두 제거했다. 접근성 발권 설명은 유지한다. 완료 시 사용자 판만 한 번 2px 들어올랐다 정착하고 얇은 outline 및 hover·pressed 변화로 클릭 가능성을 표현한다. 모션 감소에서는 이 강조 회전·이동 없이 즉시 정착한 outline을 제공한다.

사용자 행은 항상 맨 위에 두지 않는다. useDepartureReveal이 한 번 만든 seed와 run별 선택 index를 보관하며 matrix의 실제 viewport 수용 행 수를 측정한 뒤 처음 한 번 위치를 고른다. 초기 기본 mockCount에서는 위치를 확정하지 않는다. 같은 flow의 resize·방향 전환·목데이터 갱신은 저장 위치를 다시 뽑지 않고 화면 밖으로 나갈 때만 범위에 맞춰 clamp한다. 새 run에서는 다른 seed 위치를 사용할 수 있다. Storybook은 고정 userRowIndex나 hook의 seed 인자로 재현할 수 있다.

실제 국가판, 노란색 시간·항공사·편명·게이트, 발권 버튼과 손가락 안내는 같은 data-user-row 좌표를 사용한다. 안내 글자를 추가하는 대신 투명 배경의 3D 손가락 이미지가 해당 행을 두 번 가리킨 뒤 멈춘다. 모션 감소에서는 손가락도 고정된다. 손끝을 사용자 행에 맞추고 하단 행에서는 몸통을 위로 돌리며 접근성 상태 설명은 '노란색 내 일정'을 가리킨다.

## 렌더링 성능

기존 mock clock은 회전 중 매 RAF마다 모든 행의 문자를 다시 분할하고 모든 글자 컴포넌트를 렌더했다. 단일 Intl.Segmenter와 최대 128개의 문자·정착 행 캐시를 사용하고, MockFlapRow를 DOM wrapper 없는 memo fragment로 분리했다. 정착한 행은 같은 snapshot을 재사용하며 실제로 바뀌는 행 안에서도 같은 문자 step은 FlapCell memo로 건너뛴다. elapsedMs는 keyed FlapLeaves가 처음 나타날 때 이미 latch하므로 같은 step 안에서 무시해도 회전 offset은 유지한다. 새 step에서는 현재 elapsedMs로 새 leaf를 mount한다.

회전 상태 샘플은 최대 30ms마다 갱신하며 120ms 목업 문자 회전 자체는 CSS가 계속 수행한다. 초기 실제 사용자 rolling clock도 React state를 최소 30ms 간격으로 갱신한다. sleep에서는 기존 timer만 사용하고 가시성·방향·모션 감소 중단 계약을 유지한다.

6열 내용 변경 이전에 동일한 5열 helper workload(150 frame sample × 12행)를 Bun에서 4회씩 비교했다. warm 3회 평균은 66.87ms → 3.96ms로 약 94.1% 줄었으며 회전 중인 cell 집계는 두 경우 모두 920이었다. 이는 계산 경로의 로컬 CPU microbenchmark이며 브라우저 CPU나 실제 기기 FPS 결과가 아니다. 브라우저 before는 5열, after는 최신 6열·새 손 이미지로 내용이 달라 DOM mutation 수만으로 성능 감소를 단정하지 않는다. 브라우저 별도 근거는 quality 문서에서 관리한다.

한글 상태는 영문보다 넓은 전각 잉크이므로 current·next 중 비 ASCII glyph가 있는 판에만 wide class를 준다. 해당 판의 font는 실제 셀 폭의 0.9배 이내로 제한하고 영문 판 크기는 유지한다. 고정 반부와 회전 반부는 같은 부모 font를 상속해 힌지에서 정렬이 이어진다.

## 아래로 떨어지는 반판 기구

기존 55–60ms 회전은 반판당 27–30ms로 매우 짧아 30ms 상태 샘플에서 상판 움직임이 거의 보이지 않았다. .flap-moving 중간 wrapper의 3D context가 명시되지 않았고 하판은 단순 닫힘만 표현했다. 상판·하판의 회전 방향 부호 자체는 유지한다.

고정 상판은 다음 글자, 고정 하판은 이전 글자를 보여 주고 이전 상판이 중앙 힌지를 축으로 -90°까지 내려온다. 45% 시점에서 다음 글자의 하판이 +90°에서 내려와 55% 구간 동안 닫힌다. 하판 fall의 82%에서 판이 닫히고 92%에서 -2°의 작은 착지 후 마지막에 0°로 정착한다. scene은 preserve-3d, perspective는 140px이다. 낙하판의 상하 면 명암과 고정 하판에 드리우는 그림자는 같은 keyed step·elapsed 시각에 동기화한다. 판 전체나 행 위치를 회전하지 않는다.

초기 문자는 빈 판에서 A–Z 또는 숫자 순서로 target까지 한 번 진행하며 불필요한 완전 한 바퀴를 제거했다. 일반 step은 110ms, 마지막 세 step은 180ms로 읽히는 감속을 둔다. 공개 완료는 실제로 보이는 국가·게이트만 기다리며 숨겨진 승객·공항 wheel은 완료 시 최종값을 제공한다. catalog 20개 국가와 A03 게이트를 계산했을 때 countryEnd는 1780–3190ms, readyAt은 모두 기존 최소 공개 시간에 따른 6240ms였다.

목업 step은 120ms, 한글 상태 직접 회전은 180ms이다. 가장 긴 실제 fixture 경로가 3.4초 budget 안에 정착하는 테스트를 추가했고 11.6초 전체 sleep은 유지했다. 첫 업데이트는 details 시작 후 12초, 이후 cycle은 15초이다. FlapCell을 export해 Storybook이 제품과 동일한 기구를 느린 검사 장면에서 재사용하며 별도 복제 모션을 만들지 않는다. 초기 blank/ordered continuity/late-offset/hidden-row readiness/fixture settlement/reduced motion을 focused 테스트에서 확인했다.

상태 영문화 집중 검사는 영어 label 전체 보존·동적 최장 8칸·A–Z 순서·burst 내 정착을 추가로 확인했다. 새 containers 경로의 두 테스트 파일 21개·416 assertions, 해당 컴포넌트와 utility ESLint 및 TypeScript·Vite build가 통과했다. 기존 다른 범위 리팩터를 복원하거나 되돌리지 않았다.

귀국 안내판의 공통 출발국가는 `DEPARTURES` 옆의 실제 국가 글자 패널로 표시한다. 최초 중앙 공개와 헤더 정착은 동일한 country wrapper와 실제 glyph key를 사용하며 빈판은 이동하지 않는다. 표의 도착국가 / DESTINATION 열은 유지하고 노란 사용자 행은 KOREA, 나머지는 각 목업 도착지다. 사용자 행 높이는 헤더 국가 길이와 무관하며 게이트 값만 필요한 행 수에 반영한다.

사용자 행의 시간은 첫 가로 공개 시 사용자 기기의 로컬 HH:mm을 run당 한 번 캡처한다. 화면 회전·정지·목업 업데이트 동안 고정하고 새 공개 run에서만 갱신한다. optional boardingTime은 표시 객체에만 추가하여 발권기·완성 티켓으로 전달하며 서비스 schema와 저장값은 변경하지 않는다. Preview 결과는 route state의 검증된 시간으로 표시하고 정적 fixture는 기존 15:00을 유지한다. 이번 소스 연결의 ESLint·TypeScript 및 기존 focused 21개/416 assertions는 통과했다. 실제 가로 화면의 헤더 이동·시간 일치 근거는 별도 시각 QA에서 확인한다.

## 실제 공항·항공사 식별 코드

배정 국가는 출발국 헤더에 유지하고 운항표 본문은 도착공항 IATA 3자리와 항공사 IATA 2자리로 표시한다. 사용자 표시 객체는 ICN / KE / 121을 사용하고 탑승권 운항편도 KE121로 맞춘다. GDG 행사 브랜드와 발급 서비스 저장 schema는 유지한다. 국가 헤더 길이와 별개로 destination capacity는 공항 fixture에서 3, airline capacity는 항공사 fixture에서 2를 파생한다.

항공사 fixture는 코드와 표시 이름을 함께 보유한다: KE 대한항공, OZ 아시아나항공, NH ANA, JL 일본항공, SQ 싱가포르항공, AM 아에로멕시코. [인천공항 공식 항공사 목록](https://www.airport.kr/ap_en/1408/subview.do) 및 [IATA 아시아나항공 정보](https://www.iata.org/en/about/members/airline-list/asiana-airlines/329/)에서 식별 코드를 확인했다. 공항 fixture는 NRT/HND/SIN/BKK/TPE/HKG/LHR/CDG/SYD와 이름을 함께 보유하며 ICN은 인천이다. [대한항공 공식 공항 코드 안내](https://news.koreanair.com/%ED%95%AD%EA%B3%B5%EC%83%81%EC%8B%9Dqa-%EB%8B%B9%EC%8B%A0%EC%9D%98-%EB%AA%A9%EC%A0%81%EC%A7%80%EA%B9%8C%EC%A7%80-%EA%B3%B5%ED%95%AD-%EC%BD%94%EB%93%9C%EA%B0%80-%ED%95%A8%EA%BB%98%ED%95%A9/) 및 [대한항공 공식 지점 목록](https://cargo.koreanair.com/ko/Branch-Information)을 참조했다. 실제 항공사·공항 식별 코드를 사용하지만 시각·편명·게이트는 행사 연출용 목업이며 실시간 운항표가 아니다.

기존 캡처 시각 기준 offset/자정 wrap/캐시 격리/한 행 ordered flip/전체 sleep/모션 감소 동작은 유지한다. focused 테스트 24개·584 assertions에서 코드 fixture/동적 capacity/문자 정착과 기존 공개 동작을 검증했다.
