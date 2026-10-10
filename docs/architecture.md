# 도메인 구조와 삭제 경계

SkinSeoulFront `apps/webapp/src`의 `app → containers/<domain>` 구성, 명시적 공개 `index.ts`, `components/common` 분류를 적용한다. 실행 환경은 기존 React/Vite와 React Router를 유지한다. `app`은 여기서 파일 기반 Next.js 라우터가 아니라 앱 조립 계층이다.

```text
src/
  .scope.default.ts           # 기본 export 범위
  main.tsx
  app/                        # 라우팅·도메인 조립·통합 스토리
  containers/
    home/
      .scope.default.ts       # home 내부만 기본 접근 허용
      index.ts                # 외부에서 사용할 HomeContainer만 공개
      HomeContainer.tsx
      assets/, styles/, stories/
    ticket/
      .scope.default.ts       # ticket 내부만 기본 접근 허용
      index.ts                # 화면과 런타임 주입 계약
      TicketContainer.tsx
      components/
        DepartureReveal/      # 전광판 전용 hook·행/패널 계산·CSS·이미지·테스트
          .scope.default.ts
          index.ts            # DepartureReveal만 ticket에 공개
        TicketIssuer/
          .scope.default.ts
          index.ts
          TicketPresentation/ # 발급기에만 공개; mesh·절취 계산·테스트는 private
            .scope.default.ts
            index.ts
        CheckInForm/          # 이메일·닉네임 화면; InputScreen 구현은 private
          .scope.default.ts
          index.ts
        ReissueConfirmModal/  # 이 모달에서만 쓰는 Modal과 CSS 포함
          .scope.default.ts
          index.ts
        ...                   # 여러 ticket 화면이 함께 사용하는 UI
      services/
        .scope.default.ts     # Firebase·demo adapter와 초기화는 서비스 내부용
        index.ts              # 런타임 생성·에러 계약만 ticket에 공개
        saveTicketImage.ts    # 여러 화면에서 쓰는 명시적인 공개 leaf
        __tests__/
      hooks/, utils/          # 여러 소비자가 사용하는 발권 흐름·휠 계산
      types/, constants/      # UI에 의존하지 않는 계약·목적지 목록
      fixtures/, stories/, __tests__/
      styles/                 # 여러 ticket 화면이 공유하는 스타일
      preview/
        .scope.default.ts
        index.ts              # 미리보기 연결만 외부에 공개
        __tests__/
  components/
    common/buttonClasses.ts   # home과 ticket 공용 버튼; blanket barrel 없음
    brand/                    # home과 ticket 공용 브랜드·종이 표면·폰트
      .scope.default.ts
      index.ts
  styles/                     # 글로벌 토큰·Tailwind·토큰 스토리
tests/                        # 운영 도구와 실제 ESLint scope 회귀 테스트
```

## 의존성 규칙

- 외부에서는 `@/containers/home`, `@/containers/ticket`, `@/containers/ticket/preview` 공개 진입점만 import한다. 내부에서는 상대 경로를 쓴다.
- 서로 다른 컨테이너끼리는 import하지 않는다. `app/App.tsx`가 홈 화면을 발권 흐름의 `landing` 렌더 함수로 주입한다. 발권 상태 초기화와 이동은 티켓 컨테이너가 소유한다.
- `components`, `lib`, `styles`의 공통 코드는 `app`이나 `containers`를 참조하지 않는다. 컨테이너도 `app`을 참조하지 않는다.
- 전용 CSS·이미지·테스트·스토리는 같은 소유 폴더에 둔다. 두 독립 소유자가 실제로 사용하는 UI만 `components/common` 또는 `components/<domain>`으로 올린다.
- `types`는 컴포넌트에서 타입을 가져오지 않는다. 데이터 계약을 바꾸지 않고 화면 구현을 교체할 수 있도록 모델을 먼저 정의하고 화면이 가져다 쓴다.
- 폴더마다 barrel을 만들지 않는다. 소유 경계에서 필요한 이름만 명시적으로 export한다.

`eslint.config.js`에서 SkinSeoulFront와 동일한 `eslint-plugin-export-scope`의 `export-scope/no-imports-outside-export-scope`를 error로 적용한다. `.scope.default.ts`와 `.scope.ts`는 전용 processor로 처리하는 lint 설정 파일이며 런타임에서 import하지 않는다. `tsconfig.eslint.json`은 alias와 Bun 테스트까지 해석하므로 테스트에서 private 코드를 가져오기 위해 예외를 열지 않는다.

```ts
// components/DepartureReveal/.scope.default.ts
export default 'src/containers/ticket/components/DepartureReveal';

// components/DepartureReveal/index.ts
/** @scopeDefault src/containers/ticket */
export { DepartureReveal } from './DepartureReveal';
```

위 설정에서 다른 ticket 컴포넌트는 `./DepartureReveal`을 사용할 수 있지만 `DepartureReveal/hooks/useDepartureBoard`와 `DepartureReveal/utils/panelSlots`를 직접 가져올 수 없다. 전용 테스트와 스토리도 소유 폴더 안에 두므로 private 범위를 넓히지 않고 검증한다. 상속된 범위만으로 충분한 leaf에는 scope나 barrel을 추가하지 않는다. `components/common/Modal`은 실제로 재발급 확인에서만 쓰이므로 해당 소유 폴더로 내렸다.

기존 `domains/domain-boundaries` 규칙은 컨테이너 간 직접 의존과 공통 계층의 역방향 의존을 계속 차단한다. export-scope는 그 안의 컴포넌트·서비스별 세부 가시성을 담당한다. 실제 ESLint 설정으로 공개 API 허용, alias·상대 경로·type import의 private 접근 실패, 같은 도메인의 형제 컴포넌트 접근 실패를 회귀 테스트한다.

플러그인 3.1.0은 TypeScript peer 범위를 `<6`으로 선언한다. 현재 프로젝트의 TypeScript 6에서 실제 scope 테스트와 전체 lint 동작을 확인했으며 TypeScript 버전을 변경하지 않았다.

## 기능을 제거할 때

1. `app`의 해당 공개 import와 라우트/주입 지점을 제거하거나 대체한다.
2. 소유 폴더를 삭제한다. 전용 스타일·assets·스토리·단위 테스트가 함께 제거된다.
3. 해당 기능을 사용한 `app/stories` 통합 시나리오를 제거하거나 수정한다.
4. `bun run check`, `bun run test`, `bun run build`, `bun run build-storybook`으로 확인한다.

예를 들어 홈을 제거하려면 `containers/home`을 지우고 `app/App.tsx`의 landing 주입과 홈을 기대하는 통합 스토리를 수정한다. 티켓 구현 안에 홈 import는 없다. 미리보기만 제거하려면 `ticket/preview` 폴더와 `app/router.tsx`의 두 미리보기 Route 및 공개 import를 지운다. 실제 발급 흐름은 미리보기 파일을 참조하지 않는다.

티켓 전체를 제거할 때는 `containers/ticket`, 앱의 티켓·미리보기 연결, 발권 통합 스토리가 대상이다. 루트의 Firestore 규칙·인덱스, 명단/배포 스크립트와 `functions`는 서버·운영 자산이므로 프런트엔드 폴더 삭제로 자동 제거하지 않는다. 남은 사용처를 확인한 뒤 별도 변경으로 다룬다. 공통 브랜드와 버튼도 남은 사용처를 확인한 후 정리한다.

## 검사와 테스트 탐색

`bun run test`는 `src`와 루트 `tests`를 모두 수집한다. `bun run test:firebase` 역시 같은 명령을 Firestore 에뮬레이터 안에서 실행한다. 에뮬레이터 없이 실행하면 해당 통합 테스트는 skip된다. 브라우저용 TypeScript 검사에서는 Bun 전용 `__tests__`를 제외한다. Storybook은 기존 `src/**/*.stories.tsx` 패턴으로 소유 도메인의 스토리를 자동 수집한다.

## 구조 변경 검증 (2026-10-10)

- 포맷·ESLint·TypeScript, 앱 빌드, Storybook 빌드 통과.
- 로컬 Firestore 에뮬레이터를 포함한 181개 테스트 통과.
- 임시 복사본에서 home, preview, ticket을 각각 삭제하고 위에 명시한 app 연결부를 제거/대체한 세 시나리오 모두 TypeScript 검사 통과. 실제 프로젝트 파일은 유지했다.
- Aside Browser의 별도 데모 서버에서 홈 → 이메일 → 닉네임 → 전광판 → 발권 → 절취 → 결과 화면을 확인했다.

## 사용처 격리 강화

전광판·발급기·절취 UI·입력 폼·재발급 확인·서비스는 사용처별 scope를 갖는다. 부모에서 사용할 컴포넌트/타입만 각 `index.ts`에 노출한다. 제거할 때는 부모의 공개 import와 렌더 지점을 먼저 정리하고 소유 폴더를 삭제한다. 소유 폴더 밖의 공용 계약과 서비스를 함께 삭제하지 않는다.

적용 후 검증: Firestore 에뮬레이터를 포함한 184개 테스트 통과. 실제 소스의 private export 7개에 대해 owner 접근 허용, 형제·부모·app 접근 차단을 확인했고 공개 진입점 6개는 정상 허용됐다. 전체 lint·TypeScript·앱 빌드·Storybook 빌드도 통과했다.
