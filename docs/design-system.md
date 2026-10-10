# GDG AIR 디자인 시스템

작성일: 2026-10-10 · 구현: `src/index.css`, `src/components/PaperTicket.tsx`, `src/styles/paper-ticket.css`, `src/styles/terminal-ui.css` 및 화면별 스타일 · 범위: 공통 시각 기준과 Tailwind v4 토큰

## 확정과 제안

**최신 사용자 승인:** `outputs/paper-ui-concept-v2.png`를 기준으로 입장·이메일·닉네임 화면은 **검정 외부 배경과 따뜻한 흰 종이 티켓 패널**을 사용한다. 큰 영문은 응축된 sans인 Anton으로 표시한다. 앞선 공항 사진 랜딩과 플립 문자 랜딩 초안은 이 승인안으로 대체되었다.

**유지하는 정책:** 기존 어두운 기계식 추첨 전광판·금속 발권기·실제 탑승권 표현과 승인된 출력·수령 연출을 유지한다. 상태는 색과 문자로 전달하고, 기본 무음·reduced-motion·스크롤 접근성을 유지한다. 입장·입력은 최대 500px 컨테이너를 중앙 정렬한다. 이 시각 정렬은 라우팅·명단 확인·배정·복원 정책이나 후속 화면의 승인된 레이아웃을 재정의하지 않는다.

정확한 토큰·대체 서체·세부 치수는 구현 기준이다. 테마 토글이나 아이콘 패키지는 추가하지 않았다. Anton은 원격 폰트 요청 대신 프로젝트에 저장한 공식 Google Fonts 자산을 사용한다.

## 현재 공통 콘셉트

| 화면          | 공통 기준의 적용                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 입장          | `PaperTicket`의 따뜻한 흰 종이 위에 큰 `HOME / COMING`, 작은 고정폭 일정, 검정 발권 버튼을 배치한다.                                                    |
| 이메일·닉네임 | 같은 `PaperTicket`에서 `CHECK-IN` 또는 `PASSENGER`를 Anton으로 표시한다. 한국어 제목·설명은 시스템 sans, 입력값은 고정폭 글꼴과 밑줄 입력란을 사용한다. |
| 추첨 전광판   | 기존 어두운 플립 패널·중앙 이음새·얕은 음영을 유지한다. 노란 사용자 결과 행과 해당 조작의 의미를 유지한다.                                              |
| 발권기        | 기존 그래파이트 금속 외장·슬롯·작은 상태등과 종이 출력 동작을 유지한다.                                                                                 |
| 탑승권·수령   | 실제 `BoardingPass`의 종이·고정폭 인쇄 정보·바코드·절취선과 뜯기 동작을 유지한다.                                                                       |
| 모달          | 기존 확인 모달의 차콜 표면과 초점 처리를 유지한다. 수령 모달은 검은 배경에서 종이를 강조하는 기존 표현을 유지한다.                                      |

`PaperTicket`은 `BoardingPass`에서 공유하는 `AirlineBrand`(Google 4색 마크와 `GDGoC DJU`)와 `HOMECOMING 2026`을 상단에 표시한다. 점선 절취선과 양옆 원형 홈으로 종이 티켓의 형태를 표현하고 하단 문의 링크를 공통 제공한다. 별도의 랜딩 `GDG AIR` 로고를 추가하지 않는다.

종이 화면의 큰 글씨는 Anton 400이며 serif·stencil 서체를 사용하지 않는다. 날짜·작은 영문 메타데이터·입력값은 `font-mono`, 한국어 내용은 `font-sans`를 유지한다. 플립 문자나 금속 기계 재질을 종이 화면 전체에 복제하지 않는다.

공유 `.terminal-button`은 최소 `3.25rem`(기본 52px)이다. 종이 안에서는 검정 잉크색 배경·흰 글자·오른쪽 화살표·1px 모서리로 표시하고 음영을 없앤다. 입력은 같은 최소 높이의 투명한 밑줄 형식이다. 기본 `rounded-control`·`rounded-panel` 토큰은 4px이며, 종이 버튼·기계·실제 티켓의 세부 모서리는 각 표현에 맞게 유지한다.

## 종이 화면의 의미색

전역 `--ui-canvas`는 `#000`이다. `PaperTicket`만 의미 변수를 아래와 같이 재정의해 밝은 표면 위의 텍스트·오류·비활성·초점 역할을 구분한다. 종이 밖의 기존 파란 주요 행동·노란 전광판 결과·완료 및 오류 색은 유지한다.

| 역할                           | PaperTicket 값                    |
| ------------------------------ | --------------------------------- |
| 종이 / 본문 / 보조 문자        | `#faf9f6` / `#20252a` / `#5d6267` |
| 높은 표면 / 조작 경계 / 구분선 | `#efeee9` / `#858982` / `#bcbeb8` |
| 주요 버튼 / hover / active     | `#20252a` / `#363e44` / `#111619` |
| 주요 버튼 문자                 | `#faf9f6`                         |
| 비활성 배경 / 문자             | `#deded7` / `#62666b`             |
| 링크 / 초점                    | `#20252a` / `#2459a8`             |
| 오류 / 완료 / 안내             | `#a52620` / `#236636` / `#795a0a` |

같은 `bg-primary`, `text-error`, `outline-focus` 클래스가 종이 안에서는 이 지역 변수를 읽는다. 밝은 종이 위에 어두운 화면용 연한 오류·보조 색을 직접 복사하지 않는다. 이 표는 구현값이며 별도의 실제 화면 대비 검증 결과는 아니다.

## 색상 구조

`:root`의 `--palette-*`가 원색이다. `--ui-*`는 역할을 원색에 연결하고, `@theme inline`의 `--color-*`가 해당 런타임 변수로 Tailwind 유틸리티를 만든다. 앱 코드는 원색 대신 의미 클래스(`bg-canvas`, `text-muted`)를 소비한다. 브랜드 장식에만 `brand-*`를 사용한다.

[공식 Tailwind 문서](https://tailwindcss.com/docs/theme#referencing-other-variables)의 변수 참조 방식에 따라 `inline`을 사용한다. 별도 JS 설정이나 CSS 변수만으로 유틸리티 생성을 가정하지 않는다. 런타임 값을 변경해야 한다면 `--ui-*`를 변경하며, 클래스 이름을 문자열로 조합하지 않고 완전한 이름으로 작성한다.

### 원색

| Palette                            | 값                                            | 용도                                     |
| ---------------------------------- | --------------------------------------------- | ---------------------------------------- |
| charcoal-950 / 900 / 800           | `#101214` / `#191D21` / `#252B31`             | 기존 차콜 / 표면 / 높은 표면             |
| charcoal-600                       | `#727C86`                                     | 조작부 경계                              |
| black / ivory                      | `#080A0C` / `#F4F0E6`                         | 플립패널 / 주요 문자                     |
| paper / ink / ink-muted            | `#F7F3E9` / `#20252A` / `#5D6267`             | 티켓 종이 / 잉크 / 보조 잉크             |
| stone / paper-line                 | `#B7BDC4` / `#858078`                         | 앱 보조 문자 / 티켓 경계                 |
| google-blue / green / yellow / red | `#4285F4` / `#34A853` / `#FBBC05` / `#EA4335` | 브랜드 포인트                            |
| blue-hover / blue-active           | `#639BFA` / `#3676DF`                         | 주요 행동 상호작용                       |
| blue-soft / green-soft / red-soft  | `#9AC0FF` / `#81CF96` / `#FF9A91`             | 링크·포커스 / 완료 문자 / 오류·주의 문자 |

### 의미색과 사용 계약

| Tailwind 색 이름                         | 값 또는 연결                           | 의미                                             |
| ---------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| canvas / surface / surface-raised        | `#000` / charcoal-900 / charcoal-800   | 외부 배경 / 어두운 표면 / 높은 표면              |
| foreground / muted                       | ivory / stone                          | 제목·본문 / 도움말·라벨                          |
| border                                   | charcoal-600                           | 입력·조작부의 식별 가능한 경계                   |
| primary / primary-hover / primary-active | google-blue / blue-hover / blue-active | 주요 버튼 배경                                   |
| on-primary                               | black                                  | 파란 버튼 글자; 아이보리 글자 대신 대비 확보     |
| disabled / on-disabled                   | charcoal-800 / stone                   | 비활성 배경·글자; 전체 opacity로 흐리지 않음     |
| link                                     | blue-soft                              | 어두운 화면의 텍스트 링크; 밑줄로 링크도 식별    |
| success / info / error                   | green-soft / google-yellow / red-soft  | 완료 / 안내 / 오류·재발급 주의 **문자와 아이콘** |
| focus                                    | blue-soft                              | 어두운 표면의 포커스 외곽선                      |
| ticket / ticket-ink / ticket-muted       | paper / ink / ink-muted                | 티켓 표면과 문자                                 |
| ticket-border / ticket-focus             | paper-line / `#2459A8`                 | 밝은 티켓 경계 / 밝은 표면 포커스                |
| board / board-ink / board-seam           | black / ivory / charcoal-800           | 전광판 표면 / 결과 / 장식 분할선                 |
| brand-blue / green / yellow / red        | Google 원색                            | 로고·띠·점 등 포인트; 작은 본문에 사용하지 않음  |

위 표는 종이 영역 밖의 전역 의미색이다. 전역 `success/info/error`는 어두운 표면 위 문자색이다. 밝은 티켓 위에는 `ticket-ink`를 사용한다. 새 상태 배경색을 임의로 추론하거나 상태색 위에 흰 글자를 놓지 않는다. 플립 분할선은 장식이며 조작부 경계의 대비 기준과 다르다.

## 서체·치수

Anton은 `src/assets/fonts/anton-latin.woff2`에서 자체 호스팅하며 `font-display: swap`, normal, weight 400을 사용한다. Google Fonts 공식 Latin WOFF2(12,004 bytes)이며 [출처 기록](licenses/anton.md)과 [SIL OFL 1.1 원문](licenses/anton-OFL.txt)을 보관한다. 한국어는 포함하지 않아 시스템 sans가 담당한다. 종이 큰 제목의 대체 순서는 `Anton → Impact → Arial Narrow → sans-serif`이며 합성 굵기를 추가하지 않는다.

| 토큰 / 클래스                           | 값                                                                                     | 사용                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| font-sans                               | 시스템 UI → Segoe UI → Noto Sans KR → Apple SD Gothic Neo → Malgun Gothic → sans-serif | 한영 본문; 설치된 폰트만 사용                                                     |
| font-mono                               | SFMono-Regular → Consolas → Liberation Mono → Menlo → monospace                        | 플립·티켓 영문·숫자. 한글은 시스템 대체 서체이며 고정폭을 보장하지 않음           |
| text-caption                            | 14px / 행간 1.5                                                                        | 라벨·보조문자                                                                     |
| text-body                               | 16px / 행간 1.65                                                                       | 본문·입력                                                                         |
| text-title                              | 32px / 행간 1.2                                                                        | 화면 제목                                                                         |
| text-display                            | 40px / 행간 1.1                                                                        | 첫 제목·큰 코드; 짧은 영문에 제한                                                 |
| tracking-label                          | 0.12em                                                                                 | 짧은 영문 라벨; 한글 본문에는 적용하지 않음                                       |
| spacing 기준                            | 4px                                                                                    | `gap-2` 8px, `gap-3` 12px, `gap-4` 16px, `gap-6` 24px, `gap-8` 32px, `py-12` 48px |
| spacing-page / px-page                  | 24px                                                                                   | 기본 좌우 여백                                                                    |
| spacing-control / min-h-control         | 48px                                                                                   | 기본 조작부 최소 높이; 공통 주요 버튼·종이 입력은 52px                            |
| spacing-touch / min-h-touch·min-w-touch | 44px                                                                                   | 아이콘 버튼 등 최소 터치 영역                                                     |
| container-mobile / max-w-mobile         | 500px                                                                                  | 화면·모달 최대 너비; `w-full mx-auto`와 함께 사용                                 |
| rounded-control / panel / ticket        | 4px / 4px / 4px                                                                        | 조작부 / 패널 / 종이 모서리                                                       |
| shadow-panel / ticket                   | 검정 20%, 8px·24px / 검정 28%, 12px·28px                                               | 표면 / 출력된 종이의 깊이                                                         |

글자 크기·간격은 rem 기반으로 브라우저 기본 글자 크기를 따른다(500px 컨테이너는 사용자 지시의 고정 상한). 긴 이름은 생략하지 않으며 줄바꿈·축소의 상세 규칙은 티켓 구현 때 정한다. 축소 티켓 밖에도 목적지·승객명 텍스트와 크게 보기를 제공한다. 가로 화면·키보드·텍스트 확대에서는 스크롤을 허용하고 높이를 고정하지 않는다. 화면·하단 조작부를 구현할 때 safe-area inset을 별도로 고려한다.

## 상호작용과 모션

| 토큰 / 유틸리티                           | 초기 제안값                    | 용도                         |
| ----------------------------------------- | ------------------------------ | ---------------------------- |
| --motion-feedback / duration-feedback     | 140ms                          | hover·active 색 반응         |
| --motion-transition / duration-transition | 240ms                          | 짧은 표면 전환               |
| --motion-reveal / duration-reveal         | 420ms                          | 단일 결과·종이 움직임의 기준 |
| ease-ui                                   | cubic-bezier(0.2, 0, 0, 1)     | 일반 반응                    |
| ease-output                               | cubic-bezier(0.22, 1, 0.36, 1) | 종이 출력                    |

`duration-*`는 **transition-duration** 유틸리티이며 애니메이션에는 `animation-duration: var(--motion-reveal)` 등으로 연결한다. 기존 추첨·출력·수령의 구체적인 순서와 길이는 해당 화면 구현과 승인 기록을 따른다. `prefers-reduced-motion: reduce`에서 세 런타임 duration은 0ms가 된다. 이를 쓰지 않는 별도 CSS 애니메이션은 `motion-reduce:animate-none` 등으로 처리해야 한다. 출력 컴포넌트는 reduced-motion에서 완성 결과를 즉시 표시한다.

발급 성공·다음 화면 이동은 transitionend/animationend만으로 결정하지 않는다(0ms에서는 이벤트가 없을 수 있다). 프론트 상태가 결과를 보장하고, 모션은 표현만 담당한다. 소리 토글 상태는 프론트가 전달하며 CSS는 소리를 재생하지 않는다.

### 소비 예시

주요 버튼은 위치한 표면의 의미 변수를 소비한다. 아래 밑줄 입력은 `PaperTicket` 안에서 사용한다. 실제 종이 마크업은 `PaperTicket`과 `BoardingPass`를 사용한다.

```tsx
<main className="mx-auto min-h-svh w-full max-w-mobile bg-canvas px-page text-foreground">
  {/* 화면 내용 */}
</main>

<button
  type="button"
  disabled={disabled || loading}
  aria-busy={loading}
  className="terminal-button min-h-control rounded-control bg-primary px-6 text-body font-semibold text-on-primary transition-colors duration-feedback ease-ui hover:bg-primary-hover active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:bg-disabled disabled:text-on-disabled disabled:hover:bg-disabled disabled:active:bg-disabled"
>
  {loading ? '확인 중…' : '참가 확인'}
</button>

<input
  aria-invalid={invalid}
  aria-describedby={invalid ? 'email-error' : 'email-help'}
  className="terminal-form__input min-h-control w-full text-body text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-error"
/>

<article className="rounded-ticket bg-ticket font-mono text-ticket-ink shadow-ticket">
  <p className="text-ticket-muted">PASSENGER</p>
  {/* 저장 이미지에 포함할 티켓 정보만 */}
</article>
```

포커스는 `outline-offset-2`로 주변 표면과 간격을 둔다. `focus`와 파란 버튼 배경 자체의 대비는 1.93:1이므로 버튼 안쪽 ring으로 대체하지 않는다. 밝은 표면의 조작부에는 `outline-ticket-focus`를 쓰거나 `PaperTicket`의 지역 `--ui-focus`를 소비한다. 버튼·입력은 라벨·오류 연결을 제공하며, 상태는 색 외에 문자로 전달한다. 오류 border와 안내 문구는 함께 사용한다. `disabled`는 실제 HTML 속성으로 전달한다.

## 디자이너와 프론트엔드 계약

- 디자이너: 표현 컴포넌트 마크업, 의미 클래스 선택, 반응형 배치, 시각 상태, 플립·출력 모션을 소유한다. 화면의 데이터·상태 정책은 시각 표현과 분리한다.
- 프론트엔드: 라우팅, 상태, 검증, API, 결과 저장·복원·재발급, 이미지 생성·다운로드를 소유한다. 완성된 데이터와 의미 상태를 props로 주고 사용자 행동을 events로 받는다.
- 표현 props 예시: `loading`, `disabled`, `invalid`, `errorMessage`, `soundEnabled`, `reissueAvailable`, `ticket`. 이벤트 예시: `onSubmit`, `onSoundToggle`, `onSave`, `onEnlarge`, `onReissueRequest`, `onClose`. 확정 컴포넌트 API가 아닌 향후 분리 기준이다.
- 소비자가 색·클래스·애니메이션 완료 여부로 업무 상태를 추론하지 않는다. 성공 여부·기회 차감은 API와 상태의 책임이다. reduced-motion에서도 동일한 결과와 행동이 제공되어야 한다.
- 티켓 저장 영역은 명시적으로 분리하며 버튼·패션 힌트·이메일은 포함하지 않는다. 확대·재발급 모달의 초점 진입·복귀·배경 제한은 통합 때 검증한다.

## 초기 토큰 도입 시점의 대비 기록

이 표는 기존 차콜 배경과 전역 토큰으로 계산했던 이전 기록이다. 현재 검정 배경·종이 지역 토큰의 검증 결과가 아니다. sRGB 상대 휘도식으로 두 색의 `(L높음 + 0.05) / (L낮음 + 0.05)`를 실제 계산했다. 아래는 불투명 토큰 조합 기준이며 opacity·사진·그라데이션 위 조합은 재검증해야 한다. 일반 문자 4.5:1, 조작부 경계·포커스 3:1을 기준으로 삼았다.

| 조합                              | 대비                     |
| --------------------------------- | ------------------------ |
| foreground / canvas               | 16.50:1                  |
| muted / surface-raised            | 7.55:1                   |
| on-primary / primary·hover·active | 5.56:1 / 7.18:1 / 4.55:1 |
| success / surface-raised          | 7.69:1                   |
| info / surface-raised             | 8.37:1                   |
| error / surface-raised            | 7.00:1                   |
| link·focus / surface-raised       | 7.73:1                   |
| ticket-ink / ticket               | 13.94:1                  |
| ticket-muted / ticket             | 5.56:1                   |
| border / surface-raised           | 3.37:1                   |
| ticket-border / ticket            | 3.54:1                   |
| ticket-focus / ticket             | 6.17:1                   |

아래 실행 검증은 초기 토큰 도입 시점의 기록이다. 현재 종이 콘셉트 정렬의 검증 결과와 구분하며, 위 컴포넌트 예시는 전체 화면 접근성 검증을 의미하지 않는다. OS별 대체 폰트·실제 티켓 저장 이미지·입력과 모달의 상태 및 기기 동작은 화면 구현 뒤 검증한다.

### 초기 토큰 도입 시점의 실행 검증

- `bun run check`(Prettier·ESLint·TypeScript) 및 `bun run build` 통과.
- Tailwind 컴파일러에서 의미색, `max-w-mobile`, `min-h-control`, 오류·hover variant, duration·easing 등 대표 11개 유틸리티 생성 확인.
- Aside 실제 1149×1280 화면 스크린샷과 computed style에서 시작 화면의 500px 중앙 정렬, 가로 넘침 없음, canvas/foreground 적용 확인.
- Aside의 `page.setViewportSize`가 지원되지 않아 좁은 모바일·가로 viewport 및 reduced-motion의 브라우저 상태 확인은 이번 검증에 포함하지 못했다. 별도 브라우저로 우회하지 않았으며 해당 검증은 화면 통합 단계에서 남겨둔다.
