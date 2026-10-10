# Home Coming 공유 이미지

최종 자산은 `public/og-image-v2.png`(1731×909)다. 내장 `image_gen` 도구로 기존 OG 이미지를 편집했으며 CLI/API fallback은 사용하지 않았다. 원본 생성 결과를 프로젝트에 복사했고 크기나 픽셀을 별도 후처리하지 않았다. SVG favicon, 32px PNG favicon, 180px Apple touch icon은 기존 GDGoC 마크를 사용한다.

로고·행사명·날짜·탑승 정보를 남기고 지도, 도장, 작은 장식 문구를 제거했다. 질감과 절취선, 인쇄 표현으로 종이 탑승권 느낌을 유지한다. 원본 이미지와 최종 이미지의 내용·가독성을 직접 확인했다.

## 최종 편집 프롬프트

```text
Precise design edit of the supplied image for an Open Graph social card. The user says the current design has too many distracting details. Reduce clutter decisively while preserving its premium tactile boarding-pass craftsmanship. Output a finished wide horizontal social card at 1200x630, ratio 1.90476:1, not a photo of a screen.
KEEP: warm ivory paper, very subtle fine fibers and letterpress ink impression, charcoal type, oversized condensed HOME / COMING in two lines on the left, the accurate multicolor GDG logo and exact brand 'GDGoC DJU' once at top left, a clean small 'BOARDING PASS' label at top right, one vertical die-cut perforation dividing a narrow right stub, tiny paper edge shadow, the exact Korean subtitle '우리를 다시 만나게 할 여행' below the main headline, one neat barcode at the bottom of the right stub. Preserve sophisticated print/material detail, but reduce the paper noise by half for crisp small-screen reading.
REMOVE COMPLETELY: all world maps, airplane graphics, flight path, passport stamp, mini slogans, microprinting bands, serial numbers, website-like explanatory text, bottom colored stripes, hatch marks, globe icon, repeated DJU text, destination field, gate field, class field, and all extra decorative filler. Do not replace removed things with new decoration.
Clean hierarchy: top brand masthead separated by a single thin rule. Main headline bold, spacious, calm. Korean subtitle below. The right stub has exactly THREE generously spaced fields, with small restrained mono labels and clear values: 'DATE' / '2026.11.21', 'FLIGHT' / 'GDG1121', 'BOARDING' / '15:00'. Small barcode beneath. No other words or information anywhere. The logo is the only saturated color. Maintain the brand and generous outer safe margins. The quality should come from precise typography, subtle real paper texture, cut edges and careful alignment, not ornament. Make this noticeably quieter, less crowded, and more intentional.
```
