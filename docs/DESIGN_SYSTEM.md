# TitanApt Design System

## 1. Direction

TitanApt uses an editorial study-studio visual language rather than a generic dashboard template:

- Warm paper surfaces and deep teal structure.
- Amber highlights for attention and progress.
- Serif display headings paired with a compact sans-serif interface face.
- Restrained borders, soft layered shadows, and generous spacing.
- Company marks rendered as typographic initials because official logos were not supplied.
- Motion used for orientation and feedback, never as a barrier to use.

All visual implementation lives in `apps/web/src/styles.css`.

## 2. Color tokens

Core tokens are defined on `:root`:

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f4f0e6` | Page background |
| `--paper-deep` | `#ebe5d6` | Secondary background |
| `--surface` | `#fffdf8` | Cards and panels |
| `--surface-soft` | `#faf6ec` | Subtle nested surfaces |
| `--ink` | `#17211e` | Primary text |
| `--ink-soft` | `#33443f` | Body copy |
| `--muted` | `#708079` | Secondary text |
| `--line` | `#d8d2c2` | Default borders |
| `--line-strong` | `#c5bda8` | Emphasized borders |
| `--teal` | `#135f56` | Primary action |
| `--teal-dark` | `#083d38` | Deep structure |
| `--teal-deep` | `#062c29` | Dark panels |
| `--teal-soft` | `#dcece6` | Teal tint |
| `--amber` | `#d59432` | Attention and progress |
| `--amber-soft` | `#f7e7c8` | Warm highlight |
| `--rust` | `#b05234` | Warm accent |
| `--danger` | `#a33b2b` | Errors and destructive intent |
| `--green` | `#277c5d` | Success |
| `--blue` | `#356785` | Informational state |
| `--violet` | `#65548b` | Distinct subject accent |

Semantic soft variants are provided for green, blue, violet, danger, rust, and amber states.

## 3. Typography

| Role | Family | Behavior |
|---|---|---|
| Display | `--serif`: Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia | Large headings, editorial tone |
| Interface | `--sans`: Aptos, Segoe UI, Trebuchet MS, Arial | Body, navigation, forms, data |
| Mono | System monospace where needed | Keys, codes, numeric details |

- Base body size: 15 px, line-height 1.6.
- Headings use tight negative tracking and compressed line height.
- Large page headings use `clamp()` for fluid sizing.
- Labels are short, high-contrast, and sentence case.
- Numeric statistics use larger display sizes without sacrificing tabular readability.

## 4. Shape and elevation

| Token | Value |
|---|---|
| `--radius-sm` | 10 px |
| `--radius` | 18 px |
| `--radius-lg` | 28 px |
| `--shadow-sm` | Soft card elevation |
| `--shadow-md` | Raised panels and focus states |
| `--shadow-lg` | Hero and modal-level hierarchy |

Cards use a single outer border and restrained shadow. Dense data tables use separators instead of nested cards.

## 5. Layout

- Public landing and auth screens use a centered editorial composition with generous negative space.
- The authenticated app uses a fixed sidebar plus a fluid content column.
- Desktop content is capped for readable line length while still allowing wide data views.
- Two-column forms collapse to one column below the mobile breakpoint.
- Stat and summary grids reduce columns stepwise.
- Tables use horizontal scrolling or responsive column reduction where needed.
- The mobile sidebar becomes an overlay drawer with a scrim and explicit close control.

Breakpoints:

| Width | Intent |
|---|---|
| `1180px` | Compress wide dashboard compositions |
| `960px` | Shift major two-column layouts |
| `760px` | Mobile navigation and stacked content |
| `520px` | Single-column cards, forms, and compact controls |

## 6. Components

### Navigation

- Sidebar with grouped sections, active route indicator, icon plus label, and keyboard-visible focus.
- Mobile top bar with menu button and context label.
- User chip links to settings and shows display name plus role.

### Page structure

- `PageHeader`: eyebrow, title, subtitle, optional actions.
- `SectionHead`: section title plus action.
- `Panel`: bordered surface for grouped content.
- `StatCard`: label, value, note, optional trend or icon.
- `EmptyState` and `ErrorState`: clear explanation plus a recovery action.
- `Loader`: accessible loading status.

### Forms and feedback

- `.field` labels wrap inputs and helper text.
- Inputs have consistent 44 px minimum height.
- Focus ring uses a teal border plus soft teal halo.
- Inline error text uses danger color and a role alert where interactive.
- Success messages use green or teal with adequate contrast.
- Buttons have primary, secondary, ghost, and small variants.
- Disabled buttons visually recede and block pointer interaction.

### Learning and questions

- Lesson layouts combine narrative, callouts, worked examples, and checkpoint cards.
- Practice session uses a focused single-question reading column with option rows and persistent progress context.
- Option rows support selected, correct, incorrect, and review states without relying on color alone.
- Explanations appear after an answer and include steps, shortcuts, and source checks where available.
- Mock attempts emphasize a visible timer, question map, save state, and explicit submit confirmation.

### Company marks

- Initials are rendered in a typographic badge.
- No company logos are imitated.
- The UI states that official logo artwork was not supplied.
- Profile pages present overview, business, technology, culture notes, and mapped learning topics without inventing verified facts.

### Admin desk

- Dense tables with status chips and filters.
- Question review exposes correct option, explanation, source key, source page, and warnings.
- Bounded import runner uses a two-field form: chapter and limit.
- Imported content is visually marked pending and is not represented as approved.
- Audit log uses a readable action/target/summary format.

## 7. Motion

- Motion is short and functional: panel entry, drawer transition, progress changes, and focus feedback.
- The design avoids continuous decorative animation in learning paths.
- `@media (prefers-reduced-motion: reduce)` disables or shortens transitions and smooth scrolling.
- No content depends on animation to become visible or usable.

## 8. Accessibility

Implemented:

- Skip-to-content link in the app shell.
- Semantic landmarks for navigation and main content.
- Visible `:focus-visible` styling.
- Keyboard-operable navigation, menus, forms, and answer controls.
- ARIA labels for icon-only controls.
- Status and error messaging with live-region behavior where required.
- Color contrast designed around dark ink on warm paper and white on deep teal.
- Responsive layout down to a 320 px minimum width.
- No hover-only essential information.
- Company initials are decorative but always paired with the company name in text.

Not independently audited:

- Full screen-reader walkthrough.
- Automated axe/Lighthouse accessibility pass.
- Zoom and high-contrast OS mode verification.
- Cross-browser focus-order verification.

These remain release follow-ups; see [TEST_REPORT.md](TEST_REPORT.md).

## 9. Content tone

- Direct, practical, and encouraging.
- No exaggerated placement or salary promises.
- No implication that sample questions are official company papers.
- Review status and provenance are stated plainly.
- Error copy explains what happened and what to try next.
- Empty states distinguish “no data yet” from “no matching verified content.”

## 10. Design constraints

- Official company logos are not available and must not be recreated.
- Reference images and videos are inspiration only; they are not official brand assets.
- The app must remain usable without external fonts, icon CDNs, or remote images.
- Icons come from Lucide React and are rendered locally.
- No remote analytics, tracking, or third-party embeds are included.
