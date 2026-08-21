---
name: dynamic-branding-pipeline
description: >-
  Generates Google Review Showcase landing pages themed around cosmic space aesthetics and Color Psychology niches, and renders a smooth Playwright video walk-through.
---

# Dynamic Branding Pipeline

## Overview
This skill allows agentic models (Gemini, DeepSeek V4, etc.) to trigger the dynamic website branding and demo recording pipeline. Itnormalizes Maps categories into niche-specific Color Psychology profiles, styles the website container using Gemini cosmic space branding, and records a smooth video walkthrough.

## Dependencies
- `brand-color-psychology`: Used for resolving brand color harmonies and emotional profiles based on category.
- `ui-ux-pro-max`: Provides modern styling design guidelines (frosted glass, dark space wrappers).

## Quick Start
To trigger a landing page generation and WebM walkthrough video for a lead:
```bash
npx tsx scratch/run_pipeline.ts --name "Let's Meet Cafe" --category "Café"
```

## Utility Scripts
The CLI script exposes the following command format:
```bash
npx tsx scratch/run_pipeline.ts --name "<Business Name>" --category "<Category>" [--rating <Rating>] [--reviews <ReviewsCount>]
```

### Arguments:
- `--name`: **Required**. The business name.
- `--category`: **Required**. The primary business category (e.g. Café, Dental Clinic, Gym).
- `--rating`: Optional. The Google Maps rating value (defaults to `4.9`).
- `--reviews`: Optional. The total review count (defaults to `150`).

### Success Output:
```text
[Pipeline CLI] SUCCESS!
- HTML Site Path:  public/temp-websites/let-s-meet-cafe.html
- Demo Video Path: public/videos/let-s-meet-cafe.webm
```

## Common Mistakes
1. **Dev Server Offline**: Make sure `npm run dev` is running before calling the CLI pipeline.
2. **Missing Quotes**: Wrap business names or categories containing spaces in double quotes (e.g. `--name "Apex Auto Garage"`).
