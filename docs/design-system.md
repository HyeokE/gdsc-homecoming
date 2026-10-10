# GDG AIR 디자인 시스템

작성일: 2026-10-10 · 구현: `src/index.css` · 범위: 현재 제품에 필요한 Tailwind v4 토큰

## 확정과 제안

**사용자 확정:** 야간 공항 차콜, 검은 플립패널과 아이보리 글자, Google 4색 포인트(파랑 주요 행동·초록 완료·노랑 안내·빨강 재발급 주의), 오프화이트 가로 탑승권, 상태를 색과 문자로 전달, 기본 무음, reduced-motion, 모바일 `width: 100% / max-width: 500px`. 넓은 화면에서도 동일 컨테이너를 중앙 정렬하며 회전을 강제하지 않는다.

**디자이너 제안:** 아래 정확한 색값·서체 대체 순서·크기·간격·반경·그림자·모션값은 이 방향을 코드로 소비하기 위한 초기 기준이다. 화면별 상세 디자인이나 사용자 미정 정책을 확정한 것은 아니다. 테마 토글·외부 폰트·아이콘 패키지는 추가하지 않았다.

## 색상 구조

`:root`의 `--palette-*`가 원색이다. `--ui-*`는 역할을 원색에 연결하고, `@theme inline`의 `--color-*`가 해당 런타임 변수로 Tailwind 유틸리티를 만든다. 앱 코드는 원색 대신 의미 클래스(`bg-canvas`, `text-muted`)를 소비한다. 브랜드 장식에만 `brand-*`를 사용한다.

[공식 Tailwind 문서](https://tailwindcss.com/docs/theme#referencing-other-variables)의 변수 참조 방식에 따라 `inline`을 사용한다. 별도 JS 설정이나 CSS 변수만으로 유틸리티 생성을 가정하지 않는다. 런타임 값을 변경해야 한다면 `--ui-*`를 변경하며, 클래스 이름을 문자열로 조합하지 않고 완전한 이름으로 작성한다.

### 원색

| Palette                            | 값                                            | 용도                                     |
| ---------------------------------- | --------------------------------------------- | ---------------------------------------- |
| charcoal-950 / 900 / 800           | `#101214` / `#191D21` / `#252B31`             | 앱 배경 / 표면 / 높은 표면               |
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
| canvas / surface / surface-raised        | charcoal-950 / 900 / 800               | 화면 / 입력·패널 / 모달 등 높은 표면             |
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

`success/info/error`는 어두운 표면 위 문자색이다. 밝은 티켓 위에는 `ticket-ink`를 사용한다. 새 상태 배경색을 임의로 추론하거나 상태색 위에 흰 글자를 놓지 않는다. 플립 분할선은 장식이며 조작부 경계의 대비 기준과 다르다.

## 서체·치수

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
| spacing-control / min-h-control         | 48px                                                                                   | 입력·주요 버튼 최소 높이                                                          |
| spacing-touch / min-h-touch·min-w-touch | 44px                                                                                   | 아이콘 버튼 등 최소 터치 영역                                                     |
| container-mobile / max-w-mobile         | 500px                                                                                  | 화면·모달 최대 너비; `w-full mx-auto`와 함께 사용                                 |
| rounded-control / panel / ticket        | 10px / 12px / 4px                                                                      | 조작부 / 패널 / 종이 모서리                                                       |
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

`duration-*`는 **transition-duration** 유틸리티이며 애니메이션에는 `animation-duration: var(--motion-reveal)` 등으로 연결한다. 전체 플립 순서·총 길이는 아직 확정하지 않았다. `prefers-reduced-motion: reduce`에서 세 런타임 duration은 0ms가 된다. 이를 쓰지 않는 별도 CSS 애니메이션은 `motion-reduce:animate-none` 등으로 처리해야 한다. 출력 컴포넌트는 reduced-motion에서 완성 결과를 즉시 표시한다.

발급 성공·다음 화면 이동은 transitionend/animationend만으로 결정하지 않는다(0ms에서는 이벤트가 없을 수 있다). 프론트 상태가 결과를 보장하고, 모션은 표현만 담당한다. 소리 토글 상태는 프론트가 전달하며 CSS는 소리를 재생하지 않는다.

### 소비 예시

```tsx
<main className="mx-auto min-h-svh w-full max-w-mobile bg-canvas px-page text-foreground">
  {/* 화면 내용 */}
</main>

<button
  type="button"
  disabled={disabled || loading}
  aria-busy={loading}
  className="min-h-control rounded-control bg-primary px-6 text-body font-semibold text-on-primary transition-colors duration-feedback ease-ui hover:bg-primary-hover active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:bg-disabled disabled:text-on-disabled disabled:hover:bg-disabled disabled:active:bg-disabled"
>
  {loading ? '확인 중…' : '참가 확인'}
</button>

<input
  aria-invalid={invalid}
  aria-describedby={invalid ? 'email-error' : 'email-help'}
  className="min-h-control w-full rounded-control border border-border bg-surface px-4 text-body text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-error"
/>

<article className="rounded-ticket bg-ticket font-mono text-ticket-ink shadow-ticket">
  <p className="text-ticket-muted">PASSENGER</p>
  {/* 저장 이미지에 포함할 티켓 정보만 */}
</article>
```

포커스는 `outline-offset-2`로 주변 표면과 간격을 둔다. `focus`와 파란 버튼 배경 자체의 대비는 1.93:1이므로 버튼 안쪽 ring으로 대체하지 않는다. 밝은 표면의 조작부에는 `outline-ticket-focus`를 쓴다. 버튼·입력은 라벨·오류 연결을 제공하며, 상태는 색 외에 문자로 전달한다. 오류 border와 안내 문구는 함께 사용한다. `disabled`는 실제 HTML 속성으로 전달한다.

## 디자이너와 프론트엔드 계약

- 디자이너: 표현 컴포넌트 마크업, 의미 클래스 선택, 반응형 배치, 시각 상태, 플립·출력 모션을 소유한다. 다섯 화면 구현은 이번 토큰 작업에 포함하지 않는다.
- 프론트엔드: 라우팅, 상태, 검증, API, 결과 저장·복원·재발급, 이미지 생성·다운로드를 소유한다. 완성된 데이터와 의미 상태를 props로 주고 사용자 행동을 events로 받는다.
- 표현 props 예시: `loading`, `disabled`, `invalid`, `errorMessage`, `soundEnabled`, `reissueAvailable`, `ticket`. 이벤트 예시: `onSubmit`, `onSoundToggle`, `onSave`, `onEnlarge`, `onReissueRequest`, `onClose`. 확정 컴포넌트 API가 아닌 향후 분리 기준이다.
- 소비자가 색·클래스·애니메이션 완료 여부로 업무 상태를 추론하지 않는다. 성공 여부·기회 차감은 API와 상태의 책임이다. reduced-motion에서도 동일한 결과와 행동이 제공되어야 한다.
- 티켓 저장 영역은 명시적으로 분리하며 버튼·패션 힌트·이메일은 포함하지 않는다. 확대·재발급 모달의 초점 진입·복귀·배경 제한은 통합 때 검증한다.

## 대비 검증

sRGB 상대 휘도식으로 두 색의 `(L높음 + 0.05) / (L낮음 + 0.05)`를 실제 계산했다. 아래는 불투명 토큰 조합 기준이며 opacity·사진·그라데이션 위 조합은 재검증해야 한다. 일반 문자 4.5:1, 조작부 경계·포커스 3:1을 기준으로 삼았다.

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

현재 시작 화면에 의미 토큰만 적용했다. 위 컴포넌트 예시는 구현 완료나 전체 화면 접근성 검증을 의미하지 않는다. OS별 대체 폰트·실제 티켓 저장 이미지·입력과 모달의 상태 및 기기 동작은 화면 구현 뒤 검증한다.

### 이번 작업의 실행 검증

- `bun run check`(Prettier·ESLint·TypeScript) 및 `bun run build` 통과.
- Tailwind 컴파일러에서 의미색, `max-w-mobile`, `min-h-control`, 오류·hover variant, duration·easing 등 대표 11개 유틸리티 생성 확인.
- Aside 실제 1149×1280 화면 스크린샷과 computed style에서 시작 화면의 500px 중앙 정렬, 가로 넘침 없음, canvas/foreground 적용 확인.
- Aside의 `page.setViewportSize`가 지원되지 않아 좁은 모바일·가로 viewport 및 reduced-motion의 브라우저 상태 확인은 이번 검증에 포함하지 못했다. 별도 브라우저로 우회하지 않았으며 해당 검증은 화면 통합 단계에서 남겨둔다.
