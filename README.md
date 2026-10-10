# GDG Home Coming

공항 전광판 추첨과 기념 탑승권을 위한 모바일 웹 프로젝트입니다. React + Vite + TypeScript와 Firebase Web SDK의 직접 Firestore 연결로 참가자 확인, 전광판, 탑승권 발급·복원·재발급을 구성했습니다.

## 폴더 구조

`app → containers/<domain>` 구조를 사용합니다. `home`은 입장 화면, `ticket`은 참가자 확인·발급·전광판·결과·재발급을 소유합니다. 전용 스타일·assets·테스트·스토리도 각 도메인 안에 두고, 외부에서는 공개 `index.ts`만 사용합니다. 공통 UI는 `components/common`, 공유 브랜드는 `components/brand`에 둡니다. `.scope.default.ts`와 export-scope lint로 컴포넌트·서비스 내부 구현도 사용처에 격리합니다.

[의존성 규칙과 기능 삭제 방법](docs/architecture.md)을 확인하세요.

## 시작하기

- Bun 1.4.0 이상 (이 프로젝트의 기준 버전: `bun@1.4.0`)
- Node.js 22.13 이상 (도구의 Node shebang 실행용)

```sh
bun install
bun run dev
```

앱은 기본적으로 Firestore를 직접 호출합니다. Cloud Functions는 사용하지 않습니다. 로컬 Firebase 테스트는 `bun run emulators`를 실행한 뒤 다른 터미널에서 `bun run emulators:seed`와 `bun run dev:emulator`를 실행하세요(Java 21 이상 필요, 테스트 앱 5174). 기존 브라우저 저장 데모만 실행하려면 `VITE_TICKET_SERVICE=demo bun run dev`를 사용합니다. 실행 설정과 검증·운영 상태는 [Firebase 연결 문서](docs/firebase-setup.md)를 참조하세요.

의존성은 Bun으로 관리하며 `bun.lock`을 커밋합니다. 재현 가능한 설치에는 `bun install --frozen-lockfile`을 사용하세요. 개발 서버 주소는 실행 후 터미널에 표시됩니다.

## 명령어

| 명령어                 | 역할                                       |
| ---------------------- | ------------------------------------------ |
| `bun run dev`          | Vite 개발 서버                             |
| `bun run build`        | TypeScript 검사 후 프로덕션 빌드 (`dist/`) |
| `bun run preview`      | 빌드 결과 로컬 확인                        |
| `bun run lint`         | ESLint 검사 (경고도 실패 처리)             |
| `bun run lint:fix`     | ESLint 자동 수정                           |
| `bun run typecheck`    | 앱과 Vite 설정 TypeScript 검사             |
| `bun run format`       | Prettier 포맷 및 Tailwind 클래스 정렬      |
| `bun run format:check` | 포맷 검사                                  |
| `bun run check`        | 포맷, ESLint, TypeScript 검사              |

## 도구 설정

- **ESLint:** `eslint.config.js`의 flat config에 JavaScript/TypeScript recommended, React Hooks, React Fast Refresh 규칙을 적용합니다.
- **Tailwind CSS:** `@tailwindcss/vite`와 `src/styles/globals.css`의 CSS import를 사용하는 v4 구성입니다. `src/containers/ticket/TicketContainer.tsx`에 유틸리티 클래스가 적용되어 있습니다.
- **Prettier:** `prettier.config.js`에서 포맷과 Tailwind 클래스 정렬을 설정합니다. `eslint-config-prettier`로 ESLint 스타일 규칙 충돌을 방지합니다.
- **Husky:** `bun install`의 `prepare`가 Git 훅을 설치합니다. 커밋 시 staged JS/TS 파일에 ESLint 자동 수정과 Prettier를 순서대로 적용하고 JSON/CSS/HTML/Markdown/YAML도 포맷합니다. 이어서 전체 프로젝트 TypeScript 검사를 실행하며 실패하면 커밋을 중단합니다. Git 저장소가 아닌 ZIP 복사본은 먼저 `git init` 후 `bun run prepare`를 실행하세요. GUI에서 Git을 사용한다면 해당 앱의 PATH에서도 `bun`과 `node`를 찾을 수 있어야 합니다.

## Firebase 배포

`bun run deploy:firebase --dry-run`으로 배포 설정과 예정 명령을 확인하고, `bun run deploy:firebase`로 검사·에뮬레이터 테스트·빌드 후 Hosting과 Firestore 규칙·인덱스를 배포합니다. Java 21 이상과 Firebase CLI 인증이 필요하며, 기본 배포 전에 개발용 에뮬레이터를 종료하세요.

GitHub Actions는 `main` push 또는 `main` 대상 수동 실행 시 OIDC 인증으로 배포하고, PR에서는 검사·테스트·빌드만 실행합니다. 저장소 변수와 OIDC 설정, 현재 적용 상태는 [Firebase 배포 문서](docs/firebase-deployment.md)를 확인하세요. 명단 가져오기는 배포와 별도입니다.

## Firebase 운영 연결 상태

Firestore 직접 연결·트랜잭션·Security Rules와 비공개 명단 가져오기 스크립트를 제공합니다. 이메일 확인 시 비공개 Google Sheets 명단을 실시간으로 조회하고, 새 참가자는 Firebase 명단에 자동 반영합니다. 조회 URL이 없는 환경에서는 수동 스냅샷 가져오기를 사용할 수 있습니다. 이메일 입력은 본인 인증이 아니고 브라우저 추첨은 목적지 선택 조작을 막지 않습니다. 2026-10-10 운영 Firestore 규칙·인덱스 배포와 명단 2건 반영·조회 검증을 완료했습니다. 실제 티켓 발급은 아직 0건이며, 발급·재추첨 검증은 에뮬레이터에서 수행했습니다. 상세 증거는 [Firebase 연결 문서](docs/firebase-setup.md)의 운영 상태를 확인하세요. `.env*`와 명단 파일은 Git에서 제외하고 공유할 공개 변수 이름만 `.env.example`에 기록하세요.

공식 문서: [Vite](https://vite.dev/guide/), [Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite), [Husky](https://typicode.github.io/husky/get-started.html), [Prettier](https://prettier.io/docs/install.html).
