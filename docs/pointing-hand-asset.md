# 3D pointing-hand asset

## Current version — clear index-finger side pose

- Built-in image_gen; original `/Users/junhyeok_work/.codex/generated_images/01a1216c-b92f-7181-8891-e2b50093a764/exec-fd03ae0e-9c11-4fe8-8051-5b83972a87a9.png`.
- Current product asset: `src/assets/pointing-hand-3d-v2.webp`, 240×253, 6,468 bytes, true alpha. Parent reviewed the separate thumb and three curled fingers before integration.
- Display 38×40, opacity0.65. Original index tip center x247/1222, y141/1287 anchors to the yellow row center. Never rotated upside down.
- Two short taps then fade and actual DOM removal at 1300ms; reduced motion is a short static cue removed at 900ms. The previous palm-front asset was rejected and is no longer consumed.

### Current generation prompt

Use case: stylized-concept. A tiny UI tapping-hand 3D cutout, genuine transparent alpha. Clearly the INDEX finger, not the middle finger. Show a small matte ivory hand in a three-quarter SIDE view, from the thumb side, index finger extends diagonally up-left in a natural touchscreen tap gesture, distinct thumb bent beside and below the index, all THREE remaining fingers curled together visibly on the right, clearly anatomically identifiable. Compact softly rounded stylized 3D, subtle neutral lighting, no long wrist, no forearm, no photoreal skin/nails, no background, no floor or external shadow. Index fingertip sits at upper-left of silhouette, rest of compact hand below-right. Important avoid palm-front view, avoid lone vertical central finger, avoid rude or middle-finger gesture, avoid realistic fist. Hand must read instantly as a friendly pointer at 40px tall. Tight framing with small transparent margin. No text or objects.

## Superseded first version

- Built-in image_gen, transparent-background generation. Source: `/Users/junhyeok_work/.codex/generated_images/01a1216c-b92f-7181-8891-e2b50093a764/exec-2ba78ee0-7dba-43f0-a856-62a76736f23f.png`.
- Product asset: `src/assets/pointing-hand-3d.webp`, 256×384, 10,980 bytes. Alpha range 0–255; corner alpha 0.
- Measured fingertip center: x128/256, y6/384. UI anchors this point to the selected row center, rather than anchoring the image bounding box.
- Display 56×84; 180° reversal near the bottom places the hand body above the target. Animation uses transform only, two short taps, then stops. Reduced motion is static.

## Final prompt

Use case: stylized-concept. Asset type: small 3D pointing/tapping hand cutout for mobile UI. One matte ivory neutral 3D hand, index finger pointing straight up with its fingertip exactly at the top center of the composition, remaining fingers curled naturally, palm visible with a slight 3D perspective. Soft neutral studio lighting and subtle self shadows, tactile smooth matte material, clear rounded fingertip. Hand/wrist extends below the fingertip, compact and recognizable at 80px display size. Centered vertically upright, no diagonal finger. Genuine transparent alpha background, no backdrop, no floor, no cast shadow outside the hand, no text, no symbols, no rings, no cuffs or extra objects. Minimal empty margin around silhouette; fingertip position easy to measure.
