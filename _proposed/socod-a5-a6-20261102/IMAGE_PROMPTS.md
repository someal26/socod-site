# Socod A5/A6 — proposed sample images

Generated 2026-11-02 with the built-in image_gen tool, one call per asset in A5 then A6 order; no input images. Model identifier not exposed by tool. Fictional imagery, not real customers or product screenshots. No live placement or design change.

Required adjacent label for every future approved placement: **Sample image / Sawir tusaale**. Add it in page/post layout code, never burn it into the image. Placement requires separate review and approval; no integration is included here.

## Exact generation prompts

### A5
```text
Use case: photorealistic-natural
Asset type: Socod website hero and promotion background, portrait 4:5 (target 2160x2700).
Primary request: A fictional adult person (back view, no face) walking on a quiet path in a Somali coastal setting at first light, phone in a pocket, soft pink-gold sky, one distant mosque silhouette; calm, realistic photo, nothing religious in close-up, no text.
Style: true-to-life everyday natural light, modest plain clothing, ordinary dusty path, realistic textures; not glossy stock, cartoon or 3D.
Constraints: only a fictional adult, no visible face or recognizable real person, no children, no religious figures, no readable text, invented religious text, logos, brands or watermark. Mosque only a small distant silhouette. No health claims or before/after framing. Leave natural sky space suitable for later layout; render no words.
```

### A6
```text
Use case: photorealistic-natural
Asset type: Socod second promotion background, square 1:1 (target 2048x2048); 'unlocked after the walk' mood only.
Primary request: Close-up of a fictional adult's hand holding a plain unbranded smartphone with iPhone-like proportions, screen completely blank, at sunrise after a walk in a Somali setting, modest trouser legs, plain unbranded sneakers and dusty path in the background. Realistic photo, natural sunrise light and everyday textures.
Constraints: no visible face or recognizable real person, no children, no religious figures, no text, readable app UI, numbers, logos, brands or watermark. No health promises, before/after framing or body transformation. Phone screen must be blank, not a representation of the real app. No words inside the image.
```

## Planned uses and export policy

Native A5: 1122×1402 PNG. Native A6: 1254×1254 PNG. Both base JPEGs and both 2x JPEGs are upscaled. 400/800 WebP files are downscaled.

A5: website hero and promotion post only. A6: second promotion image, after-walk mood only; blank screen is not real app UI. Neither is store screenshot evidence.

Native PNGs are preserved byte-for-byte. JPEG base sizes: A5 2160×2700; A6 2048×2048. JPEG 2x sizes: A5 4320×5400; A6 4096×4096. WebP widths 400 and 800 preserve requested ratios. All derivatives use Pillow Lanczos resampling (JPEG quality 92; WebP quality 85). Larger exports are upscaled, not extra native detail. A5's tiny native aspect-ratio discrepancy is center-cropped during export. See inventory.json for actual dimensions, byte lengths and SHA-256 hashes.

Visual inspection: adult back view/no face, pocket phone and distant mosque only in A5; hand, blank screen, sneakers and dusty path in A6. No visible words, logos, recognizable real people, religious figures or health claims observed. Final editorial review remains required.

## Publication and checks

Files are isolated under `_proposed/socod-a5-a6-20261102/`, outside existing assets and page paths; no live code references them. Current base has no .github workflows, package manifest or automated test runner. No CI invented. Asset decoding, dimensions, hashes and unchanged existing tracked files checked locally. Publishing safety could not be independently verified via Pages settings; **branch not pushed and no PR created**. User requested stopping push if publication cannot be verified. Existing release, app PR #1 and website privacy PR #5 untouched.
