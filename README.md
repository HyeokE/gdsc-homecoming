# GDG Home Coming

공항 전광판 추첨과 기념 탑승권을 위한 모바일 웹 프로젝트입니다.
React + Vite + TypeScript로 참가자 흐름, 전광판, 탑승권을 포함한 데모 UI를 구성했습니다.

## 시작하기

- Bun 1.4.0 이상 (이 프로젝트의 기준 버전: `bun@1.4.0`)
- Node.js 22.13 이상 (도구의 Node shebang 실행용)

```sh
bun install
bun run dev
```

의존성은 Bun으로 관리하며 `bun.lock`을 커밋합니다. 재현 가능한 설치에는
`bun install --frozen-lockfile`을 사용하세요. 개발 서버 주소는 실행 후 터미널에 표시됩니다.

## Tailscale에서 접속하기

이 Mac과 같은 tailnet에 연결된 기기에서 아래 주소로 접속할 수 있습니다.

- 앱: <https://mac-black.taile6a871.ts.net:8443/>
- 출발 전광판: <https://mac-black.taile6a871.ts.net:8443/preview/departure>
- Storybook: <https://mac-black.taile6a871.ts.net:10000/>

개발 서버는 각각 별도 터미널에서 실행합니다.

```sh
bun run dev
```

```sh
bun run storybook
```

앱 개발 서버를 터미널·에이전트 세션 종료 후에도 유지하려면 프로젝트 폴더에서 아래처럼
실행합니다. 먼저 5173 포트에 기존 서버가 없는지 확인하세요.

```sh
lsof -nP -iTCP:5173 -sTCP:LISTEN
nohup bun run dev > /tmp/gdsc-homecomming-vite.log 2>&1 < /dev/null &
echo $! > /tmp/gdsc-homecomming-vite.pid
```

앱 로그는 `/tmp/gdsc-homecomming-vite.log`, 시작 프로세스 PID는
`/tmp/gdsc-homecomming-vite.pid`에서 확인합니다. 재부팅 후에는 다시 실행해야 합니다.

Tailscale Serve는 다음 명령으로 연결합니다. 기존 443 포트 서비스는 유지합니다.

```sh
tailscale serve --bg --https=8443 http://127.0.0.1:5173
tailscale serve --bg --https=10000 http://127.0.0.1:6006
tailscale serve status
```

`--bg` 설정은 Tailscale이 유지하지만 개발 서버를 자동으로 실행하지는 않습니다.
Mac이 깨어 있고 Tailscale에 로그인되어 있으며 두 개발 서버가 실행 중이어야 합니다.
재부팅하거나 서버를 종료했다면 위 Bun 명령을 다시 실행하세요. 서버 로그는 각 실행
터미널에 표시됩니다. 휴대폰도 같은 tailnet에 연결해야 하며 인터넷 공개용 Funnel은
사용하지 않습니다.

Vite와 Storybook은 `127.0.0.1`에서 고정 포트로 실행하고 정확한 Tailscale 호스트명만
추가 허용합니다. Mac의 Tailscale 이름이 바뀌면 `vite.config.ts`와 `.storybook/main.ts`의
`allowedHosts`를 새 호스트명으로 바꾸고 서버와 Serve 설정을 다시 실행하세요.
다른 Serve 서비스가 이미 8443 또는 10000을 사용한다면 해당 서비스를 덮어쓰지 말고
빈 포트를 선택하세요.

이 프로젝트의 프록시만 종료하려면 아래 명령을 사용합니다.

```sh
tailscale serve --https=8443 off
tailscale serve --https=10000 off
```

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

- **ESLint:** `eslint.config.js`의 flat config에 JavaScript/TypeScript recommended,
  React Hooks, React Fast Refresh 규칙을 적용합니다.
- **Tailwind CSS:** `@tailwindcss/vite`와 `src/index.css`의 CSS import를 사용하는 v4 구성입니다.
  `src/App.tsx`에 유틸리티 클래스가 적용되어 있습니다.
- **Prettier:** `prettier.config.js`에서 포맷과 Tailwind 클래스 정렬을 설정합니다.
  `eslint-config-prettier`로 ESLint 스타일 규칙 충돌을 방지합니다.
- **Husky:** `bun install`의 `prepare`가 Git 훅을 설치합니다. 커밋 시 staged JS/TS 파일에
  ESLint 자동 수정과 Prettier를 순서대로 적용하고 JSON/CSS/HTML/Markdown/YAML도 포맷합니다.
  이어서 전체 프로젝트 TypeScript 검사를 실행하며 실패하면 커밋을 중단합니다.
  Git 저장소가 아닌 ZIP 복사본은 먼저 `git init` 후 `bun run prepare`를 실행하세요.
  GUI에서 Git을 사용한다면 해당 앱의 PATH에서도 `bun`과 `node`를 찾을 수 있어야 합니다.

## 다음 구현 범위

실제 참가자 명단과 서버 데이터 연동이 남아 있습니다. Firebase SDK와 초기 설정은
존재하지만 실제 명단 서버에는 연결하지 않았습니다. `.env*`는 기본적으로 Git에서
제외하고 공유할 공개 변수 이름만 `.env.example`에 기록하세요.

공식 문서: [Vite](https://vite.dev/guide/),
[Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite),
[Husky](https://typicode.github.io/husky/get-started.html),
[Prettier](https://prettier.io/docs/install.html).
