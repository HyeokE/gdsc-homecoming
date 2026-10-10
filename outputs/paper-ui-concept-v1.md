# 밝은 종이 UI 시안

사용자가 선택한 방향: 밝은 종이·인쇄물 느낌, 기존 승인 탑승권 디자인 확장.

내장 imagegen 도구로 생성한 **디자인 검토용 시안**이다. 실제 구현 화면이 아니다. 기존 아날로그 문자판 랜딩과 어두운 입력 화면은 사용자에게 거절되었으며, 다음 구현의 기준으로 사용하지 않는다.

- 참고: `outputs/gdgoc-dju-boarding-pass-v3.png`
- 시안: `outputs/paper-ui-concept-v1.png`
- 방향: 밝은 종이와 검은 잉크, 고정폭 행사명·정보, 한국어 sans 본문, 얇은 구분선, 검은 주요 버튼. 첫 화면·이메일·닉네임은 같은 문구·재질·조작부를 사용한다. 전광판은 추첨 단계의 어두운 기계 연출로 남긴다.
- 지도: 장소명에 사용자 제공 `https://naver.me/GMmLF6Ap` 연결 유지.
- 이 이미지의 영문 글꼴·미세 질감과 그림자는 생성 모델의 표현이며, 실제 구현에서는 서체·대비·모바일 크기를 다시 확인한다.

## 생성 프롬프트

```text
Create a high-fidelity UI DESIGN PROPOSAL, not code, showing TWO mobile website screens side by side at equal scale on a plain medium-light gray presentation canvas. Each screen is 390x844 ratio, perfectly straight front view, flat rectangular edge, no phone hardware, no perspective. Left is event landing, right is email check-in. Use the attached approved boarding pass ONLY as visual-language reference: almost-white paper #faf9f6, charcoal printed ink #20252a, restrained monospaced typography, fine gray rules, natural alignment of fields, tiny existing four-color GDGoC mark. Extend that printed ticket aesthetic into an elegant, modern usable mobile site. No dark background anywhere inside screens, no blue buttons, no mechanical split-flap cells, no photographic image, no decorative stickers, no fake stamps or fake serial numbers, no glossy gradients, no floating cards, no massive barcode graphic. Two screens should look like the SAME product, same margins, font sizes, typography and button design. Plenty of deliberate whitespace but compact enough to show primary action without scroll. Page padding 28px. Sharp 2px corners, understated thin line rules. Brand at top is small existing four-color developer mark plus 'GDGoC DJU', far right '2026'. Main headings set in well-kerned dark monospace, Korean explanatory body in neutral legible Korean sans-serif. LEFT: headline exactly 'GDG HOME' then 'COMING' on next line, around 38px bold monospaced, not distressed; below, two-line Korean introduction '다시 만나는 우리,' / '이번엔 어디로 떠날까요?' and secondary '나만의 여행지를 뽑고, 홈커밍 탑승권을 받아보세요.' A well-spaced printed itinerary area with thin top/bottom lines: label '일시' beside '2026.11.21 15:00' and next line '~ 11.22 04:00'; label '장소' beside underlined '성수 그린힐드 ↗'. After generous 28px gap place full-width solid charcoal rectangular button with ivory label '발권하기' and very small right arrow. Under button small gray helper '참가 신청에 사용한 이메일을 준비해주세요.' / '발급받은 탑승권도 다시 확인할 수 있어요.' Lower footer understated underlined '문의하기'. RIGHT: same small brand header. Small functional back link '← 뒤로 가기'; section title Korean '신청한 이메일을' / '입력해주세요' in charcoal Korean sans 28px semibold, subtitle '참가 신청에 사용한 이메일로 발권할 수 있어요.' Below thin divider, input label '신청한 이메일', then outlined paper-white 52px-high input with monospace placeholder 'name@example.com'. Full-width charcoal button below labeled '확인하기' with ivory lettering. Everything intentionally designed as printed airline stationery; refinement should come from typography, alignment, whitespace and excellent Korean legibility, not extra decoration. Screens may have a very subtle paper surface but avoid dirty textures. Produce a polished persuasive paired design mockup with accurate Korean text. Outside the screens above each place simple captions '입장' and '참가 확인'.
```
