# Student App

An Expo (SDK 58) study companion built around a single design system: **mint
gradients, near-black cards, pill controls and Poppins typography** — modelled on
the supplied Figma reference (Login → Student → Lectures → Focus Mode → Subject
Selecting). Everything runs in **Expo Go**, no custom native build required.

## Requirements

- **Node.js 20+** (verified on Node 24)
- **Expo Go** on your phone — [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) · [iOS](https://apps.apple.com/app/expo-go/id982107779)
- Phone and computer on the **same Wi-Fi / LAN**

## Run it

```bash
npm install      # once
npm start        # Metro on http://localhost:8081 + QR code
```

- **Android:** Expo Go → "Scan QR code".
- **iOS:** Camera app → tap the banner.
- Allow Node.js through the firewall if Windows asks.

## Screens

| Screen | What it does |
| --- | --- |
| **Login** | Mint gradient hero, floating welcome card, "Login with Google" pill |
| **Student** | Greeting + mint welcome card, three dark paper cards (score, duration, MCQ/Structured/Essay breakdown) |
| **Lectures** | "What are you going to study today?" with horizontal lecture carousels per topic |
| **Focus** | Focus Forest: pick a duration, subject and optional mission, then plant a tree. Leave the screen or app for more than 10 seconds and it withers. Shows your level, forest and DAY/WEEK/MONTH stats |
| **Activity** | GitHub-style progress: contribution heatmap, level and XP, streaks, repos (effort per subject), achievements and a commit feed. Opened from Home or Focus |
| **Subjects** | Streak card (from your activity) + selectable subject list with coloured icon tiles and weekly focus time |
| **Toolbox** | Searchable tool hub + offline print studio (collage, grid-cut poster, ID photo sheet) and the roadmap of planned tools |

Navigation is state-driven (`src/components/BottomNav.tsx`), so there is no
navigation library to configure — swap in `expo-router` or React Navigation when
the app outgrows five tabs.

## Activity ledger (progress, XP and focus)

Every feature writes one event to a local ledger (`src/lib/activity/`). Each
event is a "commit" with a message, XP and an optional subject. The Activity
screen, the Home card, the Focus stats and the Subjects streak are all
calculated from this single list, so no screen keeps its own numbers.

| Source | Event | XP |
| --- | --- | --- |
| Focus session finished | `Focused 25 min · Biology` | 2 per minute, +10 when a mission is completed |
| Focus session withered | `Tree withered` (0 XP, logged) | 0 |
| MCQ attempt finished | `Scored 80% on Biology quiz` | 2 per correct answer, +10 at 80% or more |
| Formula added | `Added Ohm's law · Physics` (once per subject per day) | 8 |
| Toolbox tool opened | `Opened Collage in Toolbox` (once per tool per day) | 5 |
| Flashcards, notes, papers | Event kinds reserved; those tools are still on the roadmap | — |

- **Levels** follow a cumulative curve: 100, 300, 600, 1000 … XP.
- **Streaks** count consecutive days with XP. Withered sessions do not count.
- **Achievements** unlock from the ledger (first commit, 7-day streak, deep worker, night owl, toolsmith …).
- **Demo history.** On first launch the ledger is seeded with about 3 months of
  sample activity, marked as demo. Clear it from the Activity screen with
  "Start fresh".
- Storage uses AsyncStorage under `studentapp.v1.activity`. Move it to a
  database when sync is added.

## Toolbox (offline print studio)

The **Tools** tab adds a searchable hub, three print tools and two study tools.
Everything runs on the phone: photos are picked, cropped and composed locally,
and nothing is uploaded.

The study tools are **filled in by the student**, not shipped with content:
questions and formulas are typed in from their own notes, papers and classes,
and organised per subject.

| Tool | What it does |
| --- | --- |
| **Collage** | Grid 1–9 photos into an A4/A4L/4R sheet (gutter, margin, rounded corners, background, cut guides, caption), then print, share a PNG, share a PDF or save to Photos |
| **Grid Cut & Poster** | Slice one photo into a 2×2 … 6×6 grid; print one tile per A4 page with `R1C1` labels and cut marks, or a single contact sheet; optional overlap for pasting |
| **ID Photo Sheet** | Crop to common ID sizes (35 × 50, 35 × 45, 25 × 35 mm, 2 × 2 in) with eye/chin guides, then print N copies on 4R or A4 with cut lines |

### Design Studio (paused)

The Canva-style page editor is finished but currently **closed** in the toolbox
(`closed: true` in `src/tools/registry.ts`). The screen is still wired in
`ToolHost`, so reopening it is a one-line change. Its section below describes
what is sitting behind that flag.

The editor is built on a millimetre document model (`src/tools/design/model.ts`),
so the same numbers drive the on-screen canvas and the printed output: what you
see is what prints.

- **Pages:** A4 portrait, A4 landscape, 120 mm square, phone 9:16, 3 × 5 card.
- **Layers:** text (size, weight, alignment, colour), boxes, circles, lines,
  photos (`cover`/`contain`), and emoji stickers. Per layer: drag to move, the
  corner dot to resize, opacity, ±15° rotation, z-order, duplicate, delete.
- **Templates:** blank A4, blank square, assignment cover, weekly plan,
  revision card, focus wallpaper and daily target poster.
- **Export:** a 1600 px PNG saved to Photos, the system print dialog, or a
  shareable PDF. Image layers are inlined as base64, the same way the print
  studio does it.
- The current draft autosaves on the phone (`studentapp.v1.designDraft`).

### Printing from Expo Go

Expo Go cannot print silently to a printer. The **Print** action opens the
system print dialog, where a configured Wi-Fi printer can be chosen or
**Save as PDF** can be used. The **Share PDF** action opens the native share
sheet, which is the "send it to a print shop" flow (WhatsApp, Drive, email…).

Print output is authored in millimetres, and each sheet includes an optional
0–100 mm ruler so a print can be checked at "Actual size" in the print dialog.

### Study tools (student-authored)

Both study tools are empty until the student adds their own material, and both
write XP to the activity ledger so study feeds the progress screen. Each screen
also offers a one-tap **starter set** (bundled examples) for anyone who wants
something to practise with immediately — imported items become their own records
and can be edited or deleted like anything else.

| Tool | What it does |
| --- | --- |
| **MCQ Practice** | Two modes. *My questions*: write your own MCQs per subject (question, four answers, which one is correct, an explanation) and edit or delete them. *Practice*: answer them one at a time with instant marking and an explanation, then get a scored review of what you missed. 2 XP per correct answer plus a 10 XP bonus at 80% or more |
| **Formula Sheet** | Type in your own formulas per subject (name, formula, optional note). Search across your own sheet, filter by subject, pin the ones you need — pins are remembered between sessions. Adding a formula earns 8 XP per subject per day |

Stored on the phone under `studentapp.v1.myQuestions` and
`studentapp.v1.myFormulas`, with pins in `studentapp.v1.formulaPins`.

### Home shortcuts

Home shows a compact **Quick tools** row with up to five tools. Tap **Edit** to
choose which ones — the list is stored in `studentapp.v1.homeShortcuts` and is
always sanitised on load, so a tool that is closed later is dropped
automatically (`src/tools/shortcuts.ts`).

### Planned tools

The roadmap (Tools → *All tools*) lists the catalogue planned for later phases:
scan-to-PDF, printable paper, flashcards, grades and target marks, deadlines,
notes, past-paper tracking, a calculator, periodic table, QR codes, PDF tools
and more. OCR, AI feedback, cloud sync and push notifications need a custom
development build rather than Expo Go.

## Toolbox source layout

```
src/tools/registry.ts               # ready + planned tool catalogue
src/tools/ToolHost.tsx              # maps a tool id to its screen
src/tools/collage/                  # print studio: model (pure), html (pure), screens
src/tools/collage/__tests__/        # layout + print-HTML unit tests
src/tools/quiz/                     # question model (pure) + authored practice screen
src/tools/formula/                  # formula model (pure) + authored sheet screen
src/tools/shortcuts.ts              # Home quick-tool rules (max five, sanitised)
src/tools/design/                   # Design Studio (paused): model, templates, editor
src/tools/design/__tests__/         # document maths + print HTML tests
src/lib/print/                      # paper sizes, print CSS, HTML helpers, expo-print
src/lib/media/                      # picker, normalization, crop math, base64, gallery
src/lib/{share,storage,settings,errors}.ts
src/components/tool-kit/            # shared tool UI (scaffold, chips, sliders, sheets)
src/lib/activity/                   # ledger: types, pure derive maths, seed, provider
src/lib/activity/__tests__/         # XP, streak, heatmap, focus and achievement tests
src/lib/subjects.ts                 # shared subject list (Focus, Subjects, Activity)
src/components/activity/            # Heatmap grid and the Focus Forest tree
src/components/HomeShortcuts.tsx    # compact Home quick-tool row + picker
src/screens/ActivityScreen.tsx
```


## Design system

`src/theme.ts` holds every token: the mint palette, dark-card gradients, Poppins
weights, radii, shadows and per-subject tints. Screens and shared components use
tokens only, so restyling means editing one file.

```
App.tsx                     # font loading, screen state, bottom nav
src/theme.ts                # colors, gradients, fonts, radii, shadows
src/components/Icons.tsx    # inline SVG icon set (no icon font to load)
src/components/BottomNav.tsx
src/components/ui.tsx       # ScreenTitle, SectionHeader, Pill, ProgressRing
src/screens/LoginScreen.tsx
src/screens/HomeScreen.tsx
src/screens/LecturesScreen.tsx
src/screens/FocusScreen.tsx
src/screens/SubjectsScreen.tsx
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Expo dev server (LAN mode) + QR code |
| `npm run start:lan` | Same, explicitly LAN |
| `npm run start:tunnel` | Tunnel mode (needs a one-time `npx expo login`) |
| `npm run android` | Open on a connected Android device/emulator |
| `npm run web` | Run the same UI in the browser (web deps already installed) |
| `npm run typecheck` | TypeScript check, no emit |
| `npm test` | Unit tests for print geometry, paper layout and HTML builders (Vitest) |

## Troubleshooting

- **Phone can't connect** — allow Node.js inbound when the Windows firewall
  prompt appears, and confirm both devices share a network. Check the PC address
  with `ipconfig`; the QR uses `exp://192.168.0.105:8081`.
- **"Project is incompatible with this version of Expo Go"** — update Expo Go
  from the store; it only supports the latest SDK (this project is SDK 58).
- **Blank screen after a dependency change** — reload the app in Expo Go
  (shake → Reload) or restart Metro with `npx expo start --clear`.
- **Port already in use** — `npx expo start --port 8082`.
- **"Expo Go can no longer provide full access to the media library"** — an
  Expo Go Android limitation, not an app error. The warning is printed only when
  "Save to Photos" is used (the module is loaded lazily), and saving may be
  refused. Use the **Share** action instead — WhatsApp, Files, Drive and email
  all work — or make a development build for full gallery access.

## Authoring app artwork

The assets in `assets/` and any poster artwork should be exported as **PNG or
JPG**. Canva occasionally shows “Image could not be shown” in its editor for
large, HEIC/WebP or still-processing images; the fix is on Canva's side —
re-upload as PNG/JPG, reload the design, or export the file (download still
works when the canvas preview fails). This does not affect the app bundle.
