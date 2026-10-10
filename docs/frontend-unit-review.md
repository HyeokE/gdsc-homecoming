# 프론트 단위 검토

## U1 데모 서비스

기획/RFC의 데모 경계를 읽고 check/restore/issue/reissue/count 계약과 별도 표시 모델을 작성했다. 20개국 자료는 기획 표를 소비한다. 이메일은 티켓 표시 모델 밖이다.

서비스 검증: 지정 테스트 명단, 중복 발급 복원, 재발급 1회/직전국가 제외/gate 유지, 실패 기회 보존, commit 후 불확실 결과 복원, 국가4/행사60 상한, 손상 자료 자동삭제 없음. 서비스 단위 5 tests 통과. 정상 로컬 저장만 모델링하고 실제 Sheets/API/서버 트랜잭션은 미구현이다.

## U4 통합

App과 route guard가 첫 3화면, 저장 결과 전광판, 확인/방향 발권기, 티켓 및 모달을 연결한다. 업무 결과는 서비스로만 변경하며 모션 단계는 결과 발급을 결정하지 않는다. 발권기 확인 gate는 `IssuingFlow` 내 기존 reducer가 소유하고 URL 자체를 확인 증거로 사용하지 않는다.

닉네임 원문 보존 회귀검증을 추가했다. Intl.Segmenter로 결합문자/ZWJ를 슬롯 하나로 유지하고, 소문자는 대소문자를 보존한 a–z 휠로 회전한다. 전체 상태+서비스+휠+route guard tests를 실행한다. 실제 DOM/PNG/모바일 다운로드 검증은 브라우저 인수 항목으로 남긴다.

롤백은 새 App 통합/서비스/저장 및 관련 owned 파일만 이전 프리뷰로 복원하는 방식이며, designer/Storybook/Firebase 파일과 브라우저 저장은 자동 삭제하지 않는다.

## U4 kill-ai-slop scan/triage

`node …/kill-ai-slop/scripts/scan.mjs src --json` 실행: 36 files, 3 groups, 14 hits. App 신규 마크업 추가 hit 없음.

| tell                  | hits | 판정        | 이유                                                                                                         |
| --------------------- | ---: | ----------- | ------------------------------------------------------------------------------------------------------------ |
| 24 SVG icon           |    1 | intentional | 발권기의 회전 안내 도식이며 사용자가 요청한 orientation 안내다. 그림자/장식 아이콘으로 교체하지 않는다.      |
| 32 one gap everywhere |    1 | intentional | Storybook 토큰 카탈로그의 반복 정의 목록이다. 제품 화면의 정보 위계를 평탄화한 구조가 아니다.                |
| 34 tasteful-terminal  |   12 | intentional | 사용자가 정한 공항 전광판/탑승권·행사 브랜드와 그 토큰/Storybook 샘플이다. 확정 영문 mono 스타일을 유지한다. |

confirmed fix 없음. 서비스 소개 초안은 승인된 문구와 분리해 docs/demo-service.md에 창작 제안으로 명시했다. 초기 프리뷰의 WELCOME ABOARD/모호한 여행 카피는 U2 승인된 LandingScreen으로 대체됐다. source scan은 수동 시각 인수나 접근성 통과를 대신하지 않는다.

## U6 회귀 수정

- 제목 조회와 main fallback을 별도로 수행해 route 전환 초점 대상을 바로잡았다.
- 부트 복원은 초기 booting 상태에서만 실행한다. BrowserRouter navigate의 pathname 의존성이 바뀌어도 명시적인 발급 흐름을 복원으로 가로채지 않는다.
- BrowserRouter가 위치 상태를 transition으로 갱신하므로 정상/불확실 발급 성공의 ticket commit과 departure navigation을 동일 startTransition으로 정렬했다. Storybook AppFlow 실제 interaction 21 steps에서 departure 유지/확인 전 issuer 없음/새 mount 복원 회귀 통과를 담당자가 보고했다.
- 참가자 확인 성공 시 저장·재발급·모달 안내를 초기화하고 재발급 소진은 현재 ticket.reissueUsed에서만 파생한다. 다른 참가자 전환 회귀 test 통과.
- 기존 preview 링크는 App 부트 복원이 실행되지 않는 별도 PreviewApp 트리에서 보존한다. 최종 pure tests 21개/244 assertions 통과. 실제 제품 흐름 및 회전/PNG는 별도 브라우저 증거로 구분한다.
- 마지막 preview UI scanner: 39 files, 3 groups, 14 hits. 새 PreviewApp hit 없음. 기존 SVG회전안내1/token카탈로그spacing1/공항mono12는 앞선 intentional 판정을 유지한다. confirmed fix 추가 없음.
