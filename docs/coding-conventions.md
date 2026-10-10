# Coding conventions

SkinSeoul의 루트·웹앱 가이드와 공용 base/React/Prettier 설정에서 이 React/Vite 프로젝트에 적용할 수 있는 규칙을 가져왔다. 해당 프로젝트의 비즈니스 코드나 사내 패키지를 의존성으로 추가하지 않는다. 에이전트 지침은 루트 `AGENTS.md`와 `CLAUDE.md`에 동일하게 유지한다.

## 실제 검사로 강제하는 규칙

| 항목 | 이 저장소의 적용 |
| --- | --- |
| 엄격한 타입 | 명시적 `any` 금지, 불필요한 명시 타입 금지, `as const` 권장, 사용하지 않는 코드 검사 유지 |
| React 함수 컴포넌트 | 직접 props를 받는 함수 사용. `React.FC`, `FunctionComponent`, named/namespace 별칭 및 `import('react').FC` 금지 |
| 이름 | 변수 camelCase/UPPER_CASE/PascalCase, 함수 camelCase/PascalCase, 인터페이스·타입 PascalCase |
| 제어 흐름 | 모든 분기·루프에 중괄호, 엄격한 동등 비교, 암묵적 형변환·`var` 금지 |
| 타입 표기 | 타입 전용 import, 단순 요소의 `T[]`, 복잡한 요소의 `Array<T>` |
| 로깅 | 앱의 `console.log` 금지. warn/error/info/debug/table/group/groupEnd 허용 |
| React | Hooks 규칙 유지, 새 탭 링크 보호, 잘못된 DOM 속성 금지, 불필요한 JSX 문자열 중괄호 제거 |
| 접근성 | jsx-a11y recommended 규칙. 레이블·이미지 대체 텍스트·키보드 상호작용·포커스 검사 |
| 소유권 | 기존 domain-boundaries와 export-scope 유지. private 구현의 외부 직접 import 금지 |
| 포맷 | 세미콜론, 120자 폭, 공백 2칸, 작은따옴표, trailing commas, Tailwind 클래스 정렬 |

Prettier는 `bun run format:check`, ESLint는 `bun run lint`로 검사하며 `bun run check`가 타입 검사까지 묶어 실행한다. Prettier가 충돌 회피용으로 끄는 중괄호 규칙은 설정 마지막에서 명시적으로 다시 켰다.

`tests/codingConventions.test.ts`는 실제 ESLint 설정과 실제 TypeScript 파일로 허용·거부 사례를 검사한다. 실제 프로젝트 lint 실행은 일반 ESLint CLI와 같은 Node 자식 프로세스에서 수행한다. Bun 테스트 프로세스에서 ESLint 실행 후 Vite를 읽을 때 발생하는 런타임 충돌을 격리하며, 검사 규칙과 성공·실패 assertions는 그대로 유지한다. React/a11y 플러그인은 현재 ESLint 10 API를 지원하도록 `@eslint/compat`으로 연결했으며, 실제 컴포넌트 검사와 회귀 테스트로 실행 호환성을 확인한다.

## 프로젝트에 맞춘 예외

- `scripts/**/*.mjs`는 명령행 사용자 메시지·구조화된 stdout 출력을 위해 `console.log`를 허용한다. 앱 코드에는 예외를 적용하지 않는다.
- 테스트와 Storybook의 의도적인 no-op 콜백은 빈 함수 규칙에서 제외한다. 런타임의 no-op에는 필요한 이유를 코드에 남긴다.
- `== null` / `!= null`은 null과 undefined를 함께 검사하는 명시적 관용구로 허용한다. 다른 느슨한 비교는 금지한다.
- 네이티브 dialog의 backdrop 클릭은 Escape의 `onCancel`과 닫기 버튼을 제공하므로 해당 JSX 요소에서만 클릭 접근성 규칙을 설명과 함께 예외 처리한다. 모달의 `autoFocus` 대신 열릴 때 포커스를 명시적으로 이동한다.
- 3D 티켓의 두 축 키보드 조작 영역은 `role="application"`이며 방향키·Home·설명·포커스를 제공한다. 일반 비상호작용 요소 규칙의 예외는 해당 요소로 제한한다.
- SkinSeoul의 non-null assertion 경고와 선언 순서 경고는 이번에 추가하지 않았다. 타입 검사와 기존 규칙을 유지하며 외부 응답은 `unknown`으로 검증한다.

## 코드 리뷰에서 지킬 관례

새 코드는 객체 계약에 interface를 우선하고 const map·`satisfies`·이름 있는 상수를 활용한다. 컴포넌트는 named export, 이벤트 핸들러는 `handle...`, boolean은 `is...`/`has...`처럼 의도가 보이는 이름을 우선한다. 기존 공개 props 이름을 일괄 변경하거나 동작을 바꾸지는 않는다.

Next.js 전용 `SafeLink`/`useSafeRouter`, SkinSeoul 디자인 시스템·Lucide wrapper·analytics·결제 규칙, overlay-kit/shadcn modal 구조, 모바일 및 배포 정책은 이 프로젝트에 가져오지 않는다. React Router, 프로젝트 토큰, 네이티브 dialog와 기존 발권 서비스 경계는 유지한다.
