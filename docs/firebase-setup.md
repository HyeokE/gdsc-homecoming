# Firebase 연결 설정

확인일: 2026-10-10. 로그인된 Aside Firebase 콘솔에서 실제 프로젝트와 생성 후 상태를 확인했다.

## 실제 클라우드 상태

| 항목                    | 확인한 값                                      |
| ----------------------- | ---------------------------------------------- |
| 프로젝트 ID             | `gdsc-homecomming`                             |
| 프로젝트 번호           | `719021201597`                                 |
| 요금제                  | Spark, 무료 요금제 유지                        |
| 등록 Web 앱             | `GDG Home Coming Web`                          |
| Web 앱 ID               | `1:719021201597:web:1a0f272e853a5f32097fd4`    |
| Firestore DB            | `(default)`                                    |
| Firestore 에디션 / 모드 | Standard / Native                              |
| Firestore 위치          | `asia-northeast3` (Seoul), 사용자 선택 후 생성 |
| 초기 보안 모드          | Production, 모든 클라이언트 읽기·쓰기 차단     |

생성 후 콘솔 규칙 화면에서 다음 초기 규칙을 읽어 확인했다. 공개 테스트 모드를 사용하거나 규칙을 추가 수정하지 않았다.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

DB는 비어 있으며 참가자·추첨 데이터나 컬렉션을 만들지 않았다. 이번 작업에서 Authentication, Hosting, Storage, Functions를 활성화하거나 배포하지 않았다. Web 앱은 Hosting과 연결하지 않았고 콘솔에 Google Analytics 스트림 미연결 상태가 표시된다. SDK 구성에 `measurementId`가 있지만 Analytics SDK를 초기화하지 않는다. `storageBucket` 값도 실제 Storage 버킷 생성 증거가 아니다.

콘솔 확인 위치:

- [프로젝트 일반 설정](https://console.firebase.google.com/u/0/project/gdsc-homecomming/settings/general?hl=ko)
- [Firestore 데이터](https://console.firebase.google.com/u/0/project/gdsc-homecomming/firestore/databases/-default-/data?hl=ko)
- [Firestore 규칙](https://console.firebase.google.com/u/0/project/gdsc-homecomming/firestore/databases/-default-/security/rules?hl=ko)

## 로컬 설정과 사용

- `.firebaserc`: 향후 Firebase CLI의 기본 프로젝트를 정확한 프로젝트 ID로 지정한다. CLI 로그인·배포 구성은 포함하지 않는다.
- `.env.example`: 필요한 공개 Web 설정 변수 목록. 값을 채우지 않은 템플릿이며 `.env.local`에 콘솔의 실제 SDK 구성 값을 설정했다.
- `.env.local`: 기존 다른 키를 보존하고 `VITE_FIREBASE_*` 공개 설정만 추가·갱신했다. 기존 `.gitignore`가 이 파일을 제외하며 `.env.example`만 추적 가능하게 허용한다.
- `src/lib/firebase.ts`: 공식 모듈형 SDK `firebase/app`의 `initializeApp`을 사용한다. 의존성은 `firebase@13.0.0`이다.

```ts
import { initializeFirebaseClient } from './lib/firebase'

const firebase = initializeFirebaseClient()
if (firebase.status === 'not-configured') {
  // missingVariables에 누락된 환경변수 이름이 담긴다.
} else {
  // firebase.app은 SDK 초기화 결과다. 원격 저장 성공 상태가 아니다.
}
```

초기화 함수는 설정 누락을 `not-configured`로 돌려주고 다른 프로젝트 ID는 오류로 거부한다. 같은 설정으로 반복 호출하면 같은 이름의 앱을 재사용한다. SDK 오류는 호출자에게 그대로 전달하며 샘플 발급 성공으로 치환하지 않는다. 실제 API 키·서비스의 원격 유효성은 `initializeApp`만으로 확인되지 않는다. 후속 API 호출의 오류는 별도로 처리해야 한다.

이 모듈은 호출형이며 기존 샘플 화면의 `App.tsx`나 앱 진입 코드를 변경하지 않았다. 프론트의 실제 서비스 통합 시 초기화 함수를 호출한다. 현재 5173 개발 서버를 재시작하지 않았다. Vite는 시작 시 환경변수를 읽으므로 실제 프론트 통합 후 환경 설정을 읽으려면 개발 서버를 새로 시작해야 한다.

Firebase Web SDK 구성은 API 키를 포함해 공개 클라이언트 설정이다. `VITE_*`는 브라우저 번들에 포함된다. Sheets 접근 자격, 개인 OAuth 토큰, 서비스 계정 키를 이 변수에 넣으면 안 된다. Firebase 데이터 권한은 공개 설정의 비밀 유지가 아니라 서버 검증과 보안 규칙으로 제어한다. 이번 작업에서는 개인 토큰·서비스 계정 자격증명을 조회하지 않았다.

## 검증 범위와 남은 구현

검증 완료:

- 콘솔의 실제 Web 앱 등록 및 SDK 구성 조회.
- DB 생성 후 `(default)` / `asia-northeast3` / Production deny-all 규칙 / Spark 표시 확인.
- 실제 공개 설정으로 SDK 앱 초기화, 같은 앱 재사용.
- 설정 없음·부분 누락 상태, 다른 프로젝트 차단, SDK 오류 전달 확인.
- Firebase 모듈 단독 TypeScript 검사 및 ESLint 검사 통과.
- 프론트 통합 후 전체 `bun run check`와 `bun run build` 통과. 기존 샘플 화면은 SDK 초기화 호출·실제 발권 API 연결을 포함하지 않는다.
- `.env.local` Git 제외, `.env.example` 추적 가능 확인.

실제 참가 명단 조회, 최초 발급·재발급 트랜잭션, 이메일 기반 기존 티켓 복원, 동행 인원 집계 API, 개인정보 정책은 아직 구현되지 않았다. DB 읽기·쓰기 요청과 실제 발권은 수행하지 않았다. 현재 샘플 전광판 결과를 Firebase 저장 결과로 표시하면 안 된다. 이메일 소유권 인증이나 로그인을 추가하지 않았다.

Firestore 클라이언트는 현재 규칙상 읽기·쓰기가 차단된다. 실제 서비스는 원래 기획대로 서버에서 Sheets 명단·국가 정원·재발급 기회를 검증해야 한다. 서버 실행 환경과 후속 연결은 별도 결정이며 이번 작업에서 결제나 배포를 시작하지 않았다.

CLI 상태: 로컬 Firebase CLI는 설치되어 있지 않았고 기존 `gcloud` 인증은 재인증 오류가 발생했다. 인증을 변경하지 않고 Aside 콘솔로 작업했다.

## 공식 근거

- [Firebase Web 설정](https://firebase.google.com/docs/web/setup): Web 앱 등록 후 SDK 구성으로 모듈형 SDK를 초기화한다.
- [Firebase 구성의 공개성](https://firebase.google.com/docs/projects/learn-more#config-files-objects): Web 구성은 공개 정보이며 데이터는 Security Rules로 보호한다.
- [Firestore 위치](https://firebase.google.com/docs/firestore/locations): 서울은 `asia-northeast3`이며 생성 후 기존 DB의 위치 설정은 변경할 수 없다.
