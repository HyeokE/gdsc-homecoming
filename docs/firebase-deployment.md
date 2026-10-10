# Firebase 자동 배포

Firebase 프로젝트 ID는 `gdsc-homecomming`으로 유지한다. 새 Hosting 사이트 ID는 `gdsc-homecoming`이며, 대표 주소는 [gdsc-homecoming.web.app](https://gdsc-homecoming.web.app)이다. `dist/`를 새 사이트에 배포하고 앱 경로는 SPA의 `index.html`로 연결한다. 프로젝트 ID와 Hosting 사이트 ID는 서로 다르므로 Firebase SDK·Firestore·Storage·OIDC의 프로젝트 설정을 새 도메인 철자로 바꾸지 않는다.

`firebase.json`은 같은 프로젝트의 Hosting 사이트 두 개를 함께 배포한다. 기존 `gdsc-homecomming` 사이트는 파일을 배포하지 않고 `source: "/:path*"`, `destination: "https://gdsc-homecoming.web.app/:path"`, `type: 301`로 경로를 유지해 새 사이트로 이동시킨다. `*`는 캡처하는 source에만 들어간다. 이 구문은 [Firebase 경로 캡처 문서](https://firebase.google.com/docs/hosting/full-config#capture_url_segments_for_redirects)를 따른다. 신규 사이트의 `no-cache` 및 `/assets/**` 장기 캐시 헤더와 SPA rewrite는 기존 동작을 유지한다.

도메인이 달라지면 브라우저 저장소도 분리된다. 기존 주소의 세션은 새 주소로 복사되지 않으므로 참가자는 이메일을 다시 입력해 Firestore의 기존 탑승권을 복원한다. 새 도메인 배포 검증은 `/`, `/user/result/<uuid>`, query가 있는 경로의 이전 주소 301 응답과 새 사이트 응답을 확인해야 한다. 아래 기록은 도메인 이전 전의 배포 증거이며, 설정 변경만으로 새 도메인 배포 완료를 의미하지 않는다.

Cloud Functions와 Apps Script는 이 Firebase 배포에 포함하지 않는다. 실시간 신청자 확인용 Apps Script 웹 앱은 별도로 배포하고 공개 `/exec` URL을 GitHub 저장소 변수 `VITE_ROSTER_LOOKUP_URL`에 설정해야 한다. 프런트 재빌드·배포 후 이메일 확인마다 시트를 읽는 [실시간 신청자 확인](firebase-setup.md#실시간-신청자-확인)을 사용한다. URL을 설정하지 않은 환경에서는 [수동 명단 가져오기](firebase-setup.md#명단-가져오기)를 대체 경로로 사용할 수 있다. 정기 동기화 트리거는 설치하지 않았다.

## 이전 도메인 배포 기록

2026-10-10 17:27 KST에 로컬 CLI로 Firebase Hosting·Firestore 규칙·인덱스를 운영 프로젝트 `gdsc-homecomming`에 배포했다. Firebase CLI의 Hosting release complete와 Deploy complete를 확인했다. [운영 사이트](https://gdsc-homecomming.web.app)의 `/`와 `/preview/departure`가 HTTP 200이며 배포한 `dist/index.html`과 일치한다. JS·CSS·폰트·이미지 네 파일의 응답 바이트도 로컬 빌드와 모두 일치했다.

배포 전 포맷·ESLint·타입 검사, 격리된 Firestore 에뮬레이터의 170 tests / 855 assertions, 프로덕션 빌드를 통과했다. 기존 개발용 에뮬레이터를 유지하기 위해 별도 포트 8181에서 테스트하고, 검증한 빌드를 `bun run deploy:firebase --prebuilt`로 배포했다. Aside Browser에서 랜딩 → 이메일 입력 → 미등록 테스트 이메일의 “신청 내역을 찾을 수 없어요” 응답까지 확인했다. 브라우저 기본 뷰포트에서 확인했으며 모바일 뷰포트 강제 설정은 Aside API 미지원으로 수행하지 못했다. 실제 참가자 발권·재발급은 실행하지 않았다. 배포 후 공개 이벤트 문서는 schemaVersion 2, 발급 합계 0으로 조회됐다.

GitHub Actions 자동 배포를 활성화했다. 기본 브랜치는 `main`이며, 저장소 변수 8개는 개인 계정 `HyeokE`로 등록하고 readback을 확인했다. 2026-10-10 첫 push 실행 [38039731507](https://github.com/HyeokE/gdsc-homecoming/actions/runs/38039731507)은 검사·테스트·빌드·OIDC 인증·Firebase 배포 모두 성공했다. 앞으로 `main` push마다 같은 파이프라인이 실행된다. Google Cloud OIDC provider(ACTIVE)·배포 서비스 계정·4개 프로젝트 역할·Workload Identity User 바인딩은 생성 후 readback을 확인했다. 경로별 GitHub CLI 래퍼로 기존 GCM 자격 증명을 사용한 개인·업무 API 계정 확인도 완료했다.

## 로컬 배포 CLI

Bun 1.4.0, Node.js 22.13 이상, Java 21 이상을 준비한다. 공개 Web SDK 설정은 `.env.example`을 참고해 Git에서 제외된 `.env.local`에 넣는다. 실제 프로젝트 ID는 `gdsc-homecomming`, 티켓 모드는 `firebase`, 에뮬레이터 모드는 `false`여야 한다.

```sh
bun install --frozen-lockfile
bunx firebase login
bun run deploy:firebase --dry-run
bun run deploy:firebase
```

기본 명령은 환경 변수·배포 설정 검증 → 포맷·lint·타입 검사 → Firestore 에뮬레이터 테스트 → 프로덕션 빌드 → 빌드 설정 검증 → 실제 배포 순서로 실행한다. 한 단계라도 실패하면 다음 단계로 진행하지 않는다. 테스트가 에뮬레이터를 직접 시작하므로 기존 개발용 에뮬레이터를 먼저 종료해 `127.0.0.1:8080`을 비워야 한다.

| 옵션 | 동작 |
| --- | --- |
| `--dry-run` | 설정을 검증하고 실행 예정 명령을 출력한다. 검사·테스트·빌드·배포 명령을 실행하지 않는다. |
| `--prebuilt` | 검사·테스트·빌드를 건너뛰고 기존 `dist/`를 검증해 배포한다. 같은 소스의 검사와 테스트를 이미 통과한 CI에서 사용한다. |
| `--prebuilt --dry-run` | 기존 빌드의 파일과 Firebase 설정까지 검증한 뒤 예정 배포 명령만 출력한다. |
| `--help` | 지원 옵션과 배포 대상을 출력한다. |

배포 CLI는 프로젝트 `gdsc-homecomming`과 범위를 다음과 같이 고정한다. Hosting 설정은 정확히 `gdsc-homecoming` 본 사이트와 `gdsc-homecomming` 이전 주소 리다이렉트 사이트로 제한한다. 누락·중복·다른 사이트, 잘못된 리다이렉트, 배포 hook은 CLI 실행 전에 거부한다. 다른 프로젝트 또는 Cloud Functions로 배포하는 옵션은 제공하지 않는다.

```sh
bunx firebase deploy --project gdsc-homecomming --only hosting,firestore:rules,firestore:indexes --non-interactive
```

로컬에서는 Firebase CLI 로그인 또는 Application Default Credentials를 사용할 수 있다. CI에서는 아래 OIDC가 만든 일시적인 ADC를 사용한다. 인증·부분 배포 동작은 [Firebase CLI 공식 문서](https://firebase.google.com/docs/cli)를 참고한다.

## GitHub Actions

워크플로: [`.github/workflows/firebase-deploy.yml`](../.github/workflows/firebase-deploy.yml).

- `main`으로 향하는 PR: 포맷·lint·타입 검사, 격리된 `demo-gdg-homecoming` 에뮬레이터 테스트, 프로덕션 빌드만 실행한다. Google Cloud 인증과 배포는 실행하지 않는다.
- `main`에 push: 위 검증을 통과한 `dist/`를 해당 실행의 아티팩트로 저장한 뒤 별도 배포 job에서 내려받아 배포한다.
- `workflow_dispatch`: `main`을 선택한 경우에만 실행한다. 다른 브랜치를 지정하면 job이 건너뛰어진다.
- 배포 job만 `id-token: write` 권한을 가진다. 패키지 설치와 아티팩트 검증 후 Google Cloud 인증을 수행한다.
- 실행 중인 배포는 새 push가 와도 취소하지 않는다. 배포 작업은 같은 concurrency 그룹에서 직렬 실행한다.

공식 액션은 전체 커밋 SHA로 고정하며, 실행 환경은 Bun 1.4.0·Node 22·Java 21이다. 워크플로와 관련 CLI·설정 파일을 평소 검토 절차에 따라 `main`에 반영하면 자동 배포가 시작된다. 자동 배포 기준 브랜치는 `main`이다. 기존 종이 티켓 디자인 커밋을 포함한 이력을 유지한 채 배포 설정을 통합한다. GitHub Actions 탭 또는 인증된 GitHub CLI에서 수동으로 실행할 수도 있다.

```sh
bun run deploy:ci
bun run deploy:ci:status
gh run watch RUN_ID --repo HyeokE/gdsc-homecoming --exit-status
```

`RUN_ID`는 두 번째 명령에서 확인한 실행 ID로 바꾼다. 로컬 테스트 성공이나 워크플로 파일 추가만으로 운영 배포 성공을 판단하지 않는다. Actions의 배포 단계 성공과 Hosting 실제 응답을 함께 확인한다.

## 로컬 GitHub 계정 분리

이 Mac에서는 `~/.local/bin/gh` 실행 파일이 현재 물리 경로를 확인해 계정과 설정 폴더를 선택한다. 심볼릭 링크를 통해 이동해도 실제 경로를 기준으로 구분한다.

| 현재 경로                 | GitHub 계정        | 설정 폴더                |
| ------------------------- | ------------------ | ------------------------ |
| `~/skin-seoul` 및 그 하위 | `skin-seoul-jason` | `~/.config/gh-skinseoul` |
| 그 외 경로                | `HyeokE`           | `~/.config/gh-personal`  |

래퍼는 상속된 `GH_TOKEN`, `GITHUB_TOKEN`, `GH_CONFIG_DIR` 대신 해당 경로의 프로필을 선택한다. 필요한 경우 기존 Git Credential Manager의 해당 계정 자격 증명을 메모리에서 사용하며 토큰을 새 파일에 저장하지 않는다. `.zshrc`의 대화형 함수만으로는 Bun에서 생성하는 `gh` 자식 프로세스에 적용되지 않으므로, `~/.local/bin`을 `PATH` 앞쪽에 두고 실제 실행 파일을 사용한다. 이전에 열린 터미널은 새 터미널을 열거나 셸 설정을 다시 읽어 적용한다.

이 프로젝트에서 `gh auth login`을 실행하면 개인 프로필을 사용한다. 로그인 자체는 이번 변경에서 실행하지 않았으며, 사용자가 요청한 대로 보류한다. 계정 선택을 확인하려면 프로젝트 경로에서 `command -v gh`와 `gh api user --jq .login`을 실행한다. 후자는 `HyeokE`여야 하며, 기존 자격 증명을 사용한 실제 응답을 확인했다. `gh --account-context`는 네트워크 요청 없이 선택된 계정·설정 폴더만 보여 준다. Bun 자식 프로세스에서도 개인 → 업무 → 개인 경로 전환과 잘못 상속된 토큰 무시를 실제 API로 확인했다. 라우팅 단위 테스트 10개와 Firebase 설정 CLI 테스트 20개가 통과했다.

로그인은 프로필별로 저장하며 전역 Git credential helper 설정을 바꾸는 HTTPS 확인 단계를 생략한다. 경로 선택과 충돌하는 `gh auth switch`·`setup-git`, 공유 자격 증명을 삭제하거나 갱신하는 `logout`·`refresh`는 래퍼에서 중단한다. 자격 증명 갱신은 해당 폴더에서 `gh auth login`으로 진행한다.

이 설정은 이 Mac의 GitHub CLI에 적용된다. Firebase CLI 로그인과 Git 커밋 작성자 설정은 별도다. GitHub Actions 러너는 워크플로에서 구성한 인증을 사용한다.

## 저장소 변수

GitHub 저장소 `Settings → Secrets and variables → Actions → Variables`에 설정한다. 아래 Web SDK 값은 브라우저 번들에 들어가는 공개 설정이다. 비공개 인증 정보는 `VITE_` 변수에 넣지 않는다.

| 변수 | 값의 출처 |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase Web 앱 SDK 설정의 `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `gdsc-homecomming.firebaseapp.com` |
| `VITE_FIREBASE_STORAGE_BUCKET` | SDK 설정의 `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | SDK 설정의 `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | SDK 설정의 `appId` |
| `VITE_FIREBASE_MEASUREMENT_ID` | 선택 사항. 설정만으로 Analytics를 활성화하지 않는다. |
| `VITE_ROSTER_LOOKUP_URL` | 선택 사항. 별도 배포한 공개 Apps Script 웹 앱의 정확한 `https://script.google.com/macros/s/<deployment>/exec` URL. |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | 아래 provider 전체 리소스 경로 |
| `GCP_SERVICE_ACCOUNT` | 아래 배포 서비스 계정 이메일 |

`VITE_FIREBASE_PROJECT_ID=gdsc-homecomming`, `VITE_TICKET_SERVICE=firebase`, `VITE_USE_FIREBASE_EMULATORS=false`는 워크플로에 고정되어 있다. 다음 CLI로 현재 로컬 공개 SDK 설정과 위 OIDC 식별자를 한 번에 등록할 수 있다. 기본 실행은 이름만 출력하는 dry-run이며 `--apply`만 저장소 변수를 변경한다. 등록 후 각 값을 재조회해 일치 여부를 확인한다.

```sh
cd ~/code/gdsc-homecomming
# 기존 자격 증명이 없을 때 개인 계정으로 로그인
gh auth login --hostname github.com --git-protocol https --web --scopes workflow
bun run setup:firebase-ci
bun run setup:firebase-ci --apply
```

설정 CLI는 `VITE_ROSTER_LOOKUP_URL`이 없거나 빈 값이면 생략한다. 값이 있으면 정확한 공개 Apps Script `/exec` 주소만 허용하며, 잘못된 호스트·경로·쿼리·인증 정보·공백은 GitHub 호출 전에 거부한다. 기존 저장소 변수 삭제는 수행하지 않는다. 시트 ID·비공개 시트 주소·자격 증명은 공개 설정에 넣지 않는다. 초기 서버 동기화는 4건 읽기·신규 2건·기존 2건 readback을 확인했다. 독립 Apps Script 웹 앱과 이를 사용하는 Hosting 빌드를 배포했으며, 2026-10-10 테스트 계정 분리 전 운영 UI에서 `test@gmail.com`의 실제 조회 요청 및 닉네임 단계 진입을 확인했다. 발권·재발급은 검증 범위에 포함하지 않았다.

이 설정 CLI는 실제 인증 계정이 `HyeokE`인지 먼저 확인하고, 다른 계정이면 변수를 쓰기 전에 중단한다. 이후 대상 저장소 관리자 권한을 확인하며 코드 push, Google Cloud 설정 변경, 배포 실행은 하지 않는다. 개별 변수는 `gh variable set 변수명 --repo HyeokE/gdsc-homecoming`으로 관리할 수도 있다.

## OIDC 인증 설정

GitHub OIDC를 Workload Identity Federation으로 교환해 배포 서비스 계정 권한을 사용한다. 서비스 계정 JSON 키와 `FIREBASE_TOKEN`은 저장하지 않는다. 인증 액션이 생성하는 `gha-creds-*.json`은 Git과 포맷 검사에서 제외한다. [Google GitHub Actions 인증 문서](https://github.com/google-github-actions/auth#workload-identity-federation-through-a-service-account)

설정 대상은 다음과 같다. 현재 상태 항목의 설정 검증 여부를 함께 확인한다.

| 리소스 | 설정 대상 |
| --- | --- |
| 프로젝트 번호 | `719021201597` |
| Workload Identity Pool | `gdg-github-actions` |
| OIDC Provider | `github-main` |
| Provider 전체 경로 | `projects/719021201597/locations/global/workloadIdentityPools/gdg-github-actions/providers/github-main` |
| 배포 서비스 계정 | `github-firebase-deploy@gdsc-homecomming.iam.gserviceaccount.com` |
| 허용 저장소 | `HyeokE/gdsc-homecoming` |
| 허용 ref | `refs/heads/main` |
| 허용 workflow ref | `HyeokE/gdsc-homecoming/.github/workflows/firebase-deploy.yml@refs/heads/main` |

Provider의 속성 조건은 저장소 ID `1412116288`, 소유자 ID `61281239`, `main`, 위 workflow ref, `push`/`workflow_dispatch` 이벤트로 제한한다. 이 조건을 충족한 GitHub 주체에만 배포 서비스 계정의 `roles/iam.workloadIdentityUser`를 부여한다. 워크플로 파일의 main 조건과 별개로 Google Cloud에서도 같은 경계를 적용한다.

배포 서비스 계정에 필요한 프로젝트 역할은 다음과 같다. 일반 Firestore 문서 읽기·쓰기 역할은 부여하지 않으며, 명단 가져오기는 이 서비스 계정의 작업이 아니다.

- `roles/firebasehosting.admin`
- `roles/firebaserules.admin`
- `roles/datastore.indexAdmin`
- `roles/serviceusage.serviceUsageConsumer`

OIDC 리소스와 변수는 설정 후 실제 GitHub 실행으로 검증해야 한다. 인증 오류는 provider 경로·속성 조건·서비스 계정의 Workload Identity User 바인딩을, 권한 오류는 배포 대상과 위 역할을 확인한다.

## 공개 저장소와 공유 이미지

게시 전 소스와 기존 Git 이력을 확인했으며 실제 비밀키·OAuth 토큰·참가자 명단은 포함하지 않았다. 운영 응답 시트 링크도 공개 문서에서 제거했다. `.env.local`, `.firebase/`, 로그, 임시 OIDC 인증 파일은 Git에서 제외한다. 저장소의 secret scanning과 push protection이 활성화된 것을 확인했다. Firebase Web SDK 설정과 프로젝트/OIDC 식별자는 공개 설정이며 서비스 계정 개인 키를 저장하지 않는다.

OG/Twitter 메타와 SVG·PNG favicon, Apple touch icon을 적용했다. OG 최종 이미지는 `public/og-image-v2.png`(1731×909, 약 2.4 MB)로, 이미지 캐시를 구분하기 위해 새 URL을 사용한다. 제작 방식과 프롬프트는 [공유 이미지 제작 기록](social-preview.md)에 남겼다.
