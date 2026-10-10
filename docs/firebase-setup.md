# Firebase 연결

2026-10-10. 앱은 Firebase Web SDK로 Firestore를 직접 호출한다. Cloud Functions와 별도 발권 API는 사용하지 않는다. 운영 규칙 배포와 실제 명단 반영 상태는 아래 운영 상태에서 구분한다.

## 연결 구조

`App` → `firebaseTicketService` → Firestore Web SDK 트랜잭션 + Security Rules.

- 프로젝트: `gdsc-homecomming`, Firestore `(default)`, 서울 `asia-northeast3`.
- 공개 Web SDK 설정은 Git에서 제외된 `.env.local`에 있다. 서비스 계정 키와 OAuth 토큰은 브라우저 환경 변수에 넣지 않는다.
- `events/homecoming`: schemaVersion 2, 전체 발급 수, 20개 목적지별 인원, 마지막 작업 ID.
- `events/homecoming/roster/{emailHash}`: 운영자가 가져온 참가자 허용 여부.
- `events/homecoming/tickets/{emailHash}`: 참가자별 발급 결과와 재추첨 사용 여부.
- `events/homecoming/operations/{operationId}`: 티켓과 집계를 묶는 변경 불가능한 작업 기록. 클라이언트 조회를 차단하며 공개 집계에는 참가자 해시를 포함하지 않는다.
- 이메일은 앞뒤 공백 제거·소문자 변환 후 SHA-256으로 키를 만든다. Gmail 점·플러스 별칭은 합치지 않는다.
- 발급은 전체 60명·목적지별 4명 제한을 지킨다. 재추첨은 기존 목적지를 제외하고 이전 인원 감소·새 인원 증가·기회 소진을 같은 트랜잭션에서 처리한다.
- Security Rules가 티켓과 집계의 동시 변경, 정원, 재추첨 1회와 변경 가능한 필드를 검증한다. 규칙은 명단·티켓의 전체 목록 조회와 명단의 클라이언트 수정을 허용하지 않는다.
- 운영 기본값은 Firebase다. 연결 실패를 브라우저 저장 데모 성공으로 바꾸지 않는다. `VITE_TICKET_SERVICE=demo`를 지정했을 때만 데모 서비스를 사용한다.

## 개인정보와 추첨의 경계

기획대로 이메일 입력과 명단 포함 여부만 확인한다. **이메일 소유권 인증은 아니다.** 이메일을 아는 사람은 그 이메일로 티켓을 조회하거나 허용된 작업을 실행할 수 있다. 해시 문서 ID와 목록 차단은 이메일 본인 인증을 대체하지 않으며, 이메일 해시는 익명화된 데이터가 아니다.

목적지 추첨은 브라우저에서 실행한다. Rules가 정원과 재추첨 횟수를 강제하더라도, 사용자가 코드를 조작해 유효한 다른 목적지를 고르는 것까지 차단하지는 못한다. 조작 방지 추첨이나 참가자 본인 인증이 필요해지면 별도의 신뢰할 수 있는 추첨·인증 설계가 필요하다.

## 명단 가져오기

명단 원본은 운영자가 관리하는 비공개 응답 시트의 `설문지 응답 시트1`, B열 `이메일 주소`다. 브라우저 앱이 이 비공개 시트를 직접 조회하지 않는다.

운영자가 명단을 읽어 비공개 JSON 스냅샷으로 저장한 뒤 Admin SDK 스크립트로 가져온다. 스냅샷은 `.firebase/`처럼 Git에서 제외된 위치에 보관한다. 입력은 다음 중 하나이며 이메일이나 해시를 앱 소스·번들에 넣지 않는다.

```json
{ "emails": ["member@gdg.example"] }
```

또는 `{ "keys": ["64자리 소문자 SHA-256 키"] }` 형식을 사용한다. 중복은 제거하고 잘못된 입력은 거부한다. 출력은 건수만 기록한다.

먼저 쓰기 없는 검사를 실행한다.

```sh
bun run roster:import --file .firebase/roster-import.json --project gdsc-homecomming
```

실제 반영에는 Firestore 권한이 있는 운영자 ADC(Application Default Credentials)와 `--apply`가 필요하다. Firebase CLI 로그인과 Admin SDK ADC는 별도 인증 경로다.

```sh
gcloud auth application-default login
bun run roster:import --file .firebase/roster-import.json --project gdsc-homecomming --apply
```

스크립트는 요청한 문서를 다시 읽어 `eligible: true` 반영 건수를 확인한다. 이벤트 문서가 없고 기존 티켓도 없을 때만 schemaVersion 2의 빈 집계를 초기화한다. 기존 이벤트가 있으면 스키마·집계 유효성을 확인하고 **발급 수, 티켓, 재추첨 기록을 초기화하지 않는다.** 지원하지 않는 기존 스키마나 이벤트 없이 남아 있는 티켓이 있으면 작업을 중단한다.

가져오기는 추가 방식이다. 이번 스냅샷에 없는 기존 참가자를 삭제하지 않는다. **시트와 자동 동기화하지 않으므로 신규 신청자는 새 스냅샷을 다시 가져와야 한다.** 명단 제외·취소는 별도 운영 작업이다.

## 로컬 실행

Bun, Node 22, Firestore 에뮬레이터용 Java 21 이상이 필요하다. 이 Mac의 설치된 Java 25를 선택하는 예시:

```sh
bun install
PATH="/opt/homebrew/opt/openjdk@25/bin:$PATH" bun run emulators
```

다른 터미널에서 에뮬레이터 준비 후 명단을 넣고 앱을 실행한다.

```sh
bun run emulators:seed
bun run dev:emulator
```

- 앱: <http://127.0.0.1:5174/>
- 에뮬레이터 UI: <http://127.0.0.1:4000/>
- 테스트 참가자: `demo@gdg.example`, `member@gdg.example`, `guest@gdg.example`.
- 격리된 프로젝트 `demo-gdg-homecoming`과 Firestore `127.0.0.1:8080`을 사용한다. 운영 데이터로 자동 복사하지 않는다.
- 반복 seed는 기존 티켓과 집계를 보존한다. seed/import는 에뮬레이터 모드에서 실제 프로젝트 ID나 외부 호스트를 거부한다.
- 테스트 앱은 기존 앱 서버와 충돌하지 않게 5174 포트를 사용한다.

## 검사

에뮬레이터가 꺼져 있을 때:

```sh
PATH="/opt/homebrew/opt/openjdk@25/bin:$PATH" bun run test:firebase
bun run build
bun run lint
```

이미 실행 중인 에뮬레이터에서:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 bun test tests
```

테스트에는 입력·명단 가져오기 보호 장치, Firestore Security Rules의 허용·거부, 클라이언트 트랜잭션의 동시 요청과 재추첨 시나리오가 포함된다. 에뮬레이터 통과와 빌드 성공은 운영 배포 증거가 아니다.

## 운영 상태

2026-10-10 실제 프로젝트 `gdsc-homecomming`에 다음 작업을 완료했다.

- Firebase CLI 인증과 Firestore 규칙·인덱스 배포 성공. 배포 대상은 Firestore만이다.
- 제공된 시트의 B열 이메일 응답 2건을 중복 검사 후 해시 키로 가져오고, Admin SDK readback 2건을 확인했다. 이메일 원문은 앱 번들에 포함하지 않았다.
- 로그인 없는 Web SDK로 운영 DB를 다시 읽어 schemaVersion 2, 참가 가능 2명, 기존 티켓 0건, 전체 발급 수 0을 확인했다. 명단 목록 조회는 `permission-denied`로 차단됐다.
- 명단 가져오기에 사용한 일시적인 인증 파일은 처리 후 삭제했다. 저장소에는 인증 파일과 명단 스냅샷이 포함되지 않는다.
- 실제 참가자의 발급·재추첨 기회는 소비하지 않았다. 쓰기 동작과 동시성 검증은 격리된 에뮬레이터에서 수행했다.

검증 결과: 전체 124개 테스트 / 515 assertions 통과. 이 중 보안 규칙 36개는 정원 초과, 부분 쓰기, 집계 위조, 여러 티켓을 한 작업으로 변경, 두 번째 재추첨과 기록 변조를 거부한다. 직접 SDK 통합 검사는 중복 동시 발급·재추첨 및 전체 60명·목적지별 4명 제한을 확인했다. 빌드·타입 검사·ESLint·포맷 검사도 통과했다. 빌드에는 큰 JavaScript 번들 경고가 남아 있다.

Aside 브라우저에서도 에뮬레이터 참가 확인 → 최초 발급(SYDNEY) → 재추첨(MEXICO CITY) → 새로고침 복원을 확인했다. 같은 티켓 ID와 revision 2·재추첨 소진 표시가 유지됐고, DB readback은 전체 1명·이전 목적지 0명·새 목적지 1명이었다.

프런트 호스팅의 신규 배포는 이 기록에 포함하지 않는다. 현재 작업 폴더의 기본 개발 앱은 운영 Firestore를 직접 호출한다.

Cloud Functions 배포나 이를 위한 Blaze 전환은 이 구조의 필수 단계가 아니다.

공식 문서: [Firestore 트랜잭션](https://firebase.google.com/docs/firestore/manage-data/transactions), [Security Rules 조건과 getAfter](https://firebase.google.com/docs/firestore/security/rules-conditions), [Admin SDK 설정](https://firebase.google.com/docs/admin/setup).
