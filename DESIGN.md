---
name: Pontos Fortes
description: Entrevista falada com a Lia; cada talento ancorado, com grifo amarelo, no que a pessoa disse.
colors:
  ink: "#14204a"
  ink-2: "#24336b"
  ink-soft: "#4a5480"
  ink-mute: "#5d6790"
  ground: "#f6f7fa"
  paper: "#ffffff"
  line: "#dfe3ee"
  line-strong: "#c4cadd"
  field-line: "#818baa"
  field-line-on-ink: "#8995bf"
  on-ink: "#f3f5fb"
  on-ink-mute: "#b9c1df"
  grifo: "#ffe14d"
  interviewer-red: "#c9321e"
  fazer: "#c9321e"
  mover: "#8e5500"
  cuidar: "#157a52"
  entender: "#2f5bea"
  ok: "#157a52"
  warn: "#9a5b00"
  danger: "#b3261e"
  danger-ground: "#fdeceb"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "clamp(2.5rem, 5.1vw, 4.75rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.036em"
    fontVariation: "'wdth' 75"
  headline:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "clamp(2.4rem, 5vw, 4.4rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "1.9rem"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 78"
  initial:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 75"
  body:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1"
  spoken:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "1.08rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  stamp:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "11.5px"
    fontWeight: 800
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 80"
rounded:
  stamp: "5px"
  tag: "6px"
  nav: "8px"
  md: "8px"
  lg: "16px"
  scene: "22px"
  pill: "99px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-8: "32px"
  space-10: "40px"
  space-16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.ink-2}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-on-ink:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "48px"
  input-on-ink:
    backgroundColor: "{colors.ink-2}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.md}"
  tag-fazer:
    backgroundColor: "{colors.fazer}"
    textColor: "{colors.paper}"
    rounded: "{rounded.tag}"
    padding: ".2rem .55rem"
  tag-mover:
    backgroundColor: "{colors.mover}"
    textColor: "{colors.paper}"
    rounded: "{rounded.tag}"
    padding: ".2rem .55rem"
  tag-cuidar:
    backgroundColor: "{colors.cuidar}"
    textColor: "{colors.paper}"
    rounded: "{rounded.tag}"
    padding: ".2rem .55rem"
  tag-entender:
    backgroundColor: "{colors.entender}"
    textColor: "{colors.paper}"
    rounded: "{rounded.tag}"
    padding: ".2rem .55rem"
  stamp:
    backgroundColor: "transparent"
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    padding: ".15rem .5rem"
  evidence-mark:
    backgroundColor: "{colors.grifo}"
    textColor: "{colors.ink}"
  nav-rail:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink-mute}"
    width: "240px"
  nav-item-active:
    backgroundColor: "{colors.ink-2}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.nav}"
    height: "44px"
  card-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  card-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.lg}"
---

# Design System: Pontos Fortes

## Overview

**Creative North Star: "O Pingue-Pongue Grifado"**

The system is a Brazilian magazine interview laid out as ping-pong: a red condensed **P** for the interviewer, an ink **R** for the person, and the person's own words set in a reading serif. Its signature is the yellow highlighter (grifo) that draws itself across a phrase the moment that phrase becomes evidence for a talent. Everything else stays quiet so that stroke reads as the conclusion.

Surfaces are a cool ground with white paper panels and deep ink-blue blocks. Ink carries authority: the navigation rail, the portal selector, the invite box, and the audio stage. The density is editorial rather than dashboard-like: large condensed headings, generous rows separated by hairlines, and four functional domain colors used like a metro map for labels and filters, never as decoration. States are stamped, not toasted. An invite that was sent, accepted, cancelled, or expired keeps a tilted outlined stamp so nothing disappears.

The world rejects the white-and-indigo HR SaaS dashboard: metric cards, score dials, and radar charts.

**Key Characteristics:**
- Ping-pong transcript: condensed P/R initials in a narrow column, the question in grotesque, the answer in Literata.
- The grifo yellow marks evidence and nothing else, plus the wordmark and text selection.
- Ink-blue as the voice of authority and of primary action; on ink, actions turn to paper.
- Four domain colors as functional wayfinding (tags, top strokes, rank numerals, ruler).
- Tilted outlined stamps for invite and interview states.
- One soft ambient shadow; depth mostly from paper-on-ground and ink blocks.

## Colors

A cool, ink-led palette where a single highlighter yellow is the only warm surprise and four darkened domain colors do functional work.

### Primary
- **Tinta (Ink Blue)** (ink): the navigation rail, primary buttons, body text, the selected portal and invite box, the room scene, active filter segments, and the browser theme color. The deeper step **Tinta 2** (ink-2) is the hover and active state on ink, the fill of inputs on ink, and Lia's name disc.

### Secondary
- **Grifo (Highlighter Yellow)** (grifo): the `<mark>` evidence stroke (a band from 12% to 88% of line height, cloned across line breaks), the highlight-draw animation, and `::selection`. The wordmark's "Pontos" highlight is the single brand exception. Text on grifo is always ink.

### Tertiary
- **Vermelho P (Interviewer Red)** (interviewer-red): the interviewer's **P** initial and the "Ao vivo" pill in the room. It is the same value as Fazer.
- **Fazer** (fazer, id `realizar`), **Mover** (mover, id `mobilizar`), **Cuidar** (cuidar, id `conectar`), **Entender** (entender, id `pensar`): domain colors, darkened from the original direction so that white 12.5px bold tag text passes WCAG AA. A `data-domain` attribute exposes the active one as `--domain`, which drives tag fills, the 3px top stroke on domain cells, rank numerals, and the intensity ruler. Entender's blue also serves as the focus ring and the "Enviado"/"Pronta" stamp.
- **Status**: ok (shared with Cuidar) for accepted and analyzed stamps and success alerts; warn for live and finished stamps; danger on danger-ground for error alerts.

### Neutral
- **Chão Frio (Cool Ground)** (ground): the page background, and readonly inputs.
- **Papel (Paper)** (paper): panels, list rows, the transcript column, inputs, secondary buttons, and every button placed on ink.
- **Linha (Hairline)** (line) and **Linha Forte** (line-strong): row dividers and panel borders; line-strong for secondary buttons and the scrollbar thumb. Field borders use field-line or field-line-on-ink to make the input boundary visible.
- **Tinta Suave** (ink-soft) and **Tinta Muda** (ink-mute): secondary copy and hints/metadata, plus inert stamps (cancelled, expired, not started, failed).
- **Sobre Tinta** (on-ink) and **Sobre Tinta Mudo** (on-ink-mute): text on ink surfaces, primary and secondary.

### Named Rules
**The Grifo Is Evidence Rule.** Yellow appears only on words the person said that prove a theme (static `<mark>` or the drawing animation), on text selection, and on "Pontos" in the wordmark. It is never a button, badge, background, chart, or emphasis for interface copy.

**The Metro Map Rule.** Domain colors identify a domain and nothing else. Each appears only where that domain is named or measured: tag, cell stroke, rank numeral, ruler, filter.

**The Ink Speaks First Rule.** The primary action is ink with on-ink text. On an ink surface, the primary action inverts to paper with ink text (hover #e7eaf4). Never place an ink button on ink.

## Typography

**Display Font:** Bricolage Grotesque, variable width and optical size (with Arial Narrow, sans-serif)
**Body Font:** Bricolage Grotesque at normal width for UI and questions
**Reading Font:** Literata, roman and italic (with Georgia, serif)

**Character:** A condensed, slightly quirky grotesque gives the magazine headline and the P/R initials their punch. Literata is reserved for the human voice, so the reader can tell at a glance which words came from the person.

### Hierarchy
- **Display** (800, clamp(2.5rem, 5.1vw, 4.75rem), 1.02, width 75%, -0.036em): the entry page headline.
- **Headline** (800, fluid clamps spanning 2.2–4.4rem, 1.02, width 75%): page titles in the app (profile, company, home, invite).
- **Title** (800, 1.5–2.3rem, 1.02, width 78% from the global heading rule): section headings, theme names, door titles (2.6rem).
- **Initial** (800, 1.15–1.5rem in transcripts, up to 4rem on Lia's disc, width 75%): P and R, and the rank numerals (3rem, domain color).
- **Body** (400, 16px, 1.5, tabular numerals): interface copy and the interviewer's questions (650 weight in the ping-pong).
- **Spoken** (Literata 400, 1.05–1.25rem, 1.55–1.65, 60–66ch): the person's answers, evidence quotes, the profile summary, empty states.
- **Label** (600–650, 14–15px): field labels, buttons (650, 15px), nav items, filters. Hints and metadata 13–14px in ink-mute.
- **Stamp** (800, 11.5–12px, 0.08–0.1em, uppercase, width 80%): state stamps and the room's live/idle pill only.

### Named Rules
**The Two Voices Rule.** Literata means "the person said this." Use it for the person's words and reflective empty-state copy; never for buttons, labels, or the interviewer's questions.

**The Condensed Heading Rule.** Every h1–h3 is condensed (75–78% width), weight 800, tight tracking, balanced wrap. Uppercase is reserved for stamps and the live pill.

## Layout

The authenticated app is a two-column shell: a 240px sticky ink rail and a fluid main column padded clamp(1.25rem, 3vw, 2.5rem). Content columns cap at 1120px (home, company) or 980px (profile); invite pages center at 640px. The entry page uses a 1280px shell and a 1.35/1 split. Story and transcript sit on the left, with one access panel on the right. The header connects directly to plans. The access panel offers Individual and Empresa, then sign-in and account creation. The interview room drops main padding and splits into the audio stage and a 340–460px paper transcript column that stays sticky. The transcript shows the dialogue as it happens.

The shared spacing scale follows 4px increments. Use 4px between labels and inputs, 12px between fields, 16–24px inside groups and 32–40px between page blocks. Theme rows use 24px of vertical padding and hairline dividers. Reading measures are bounded (46–66ch).

Breakpoints, as shipped:
- **760px**: entry page stacks in reading order, with the access panel before the example. **1100px**: plans reflow to two columns.
- **1000px**: room stacks; scene becomes 56vh, transcript moves below with a top hairline.
- **860px**: the rail becomes a top bar (horizontal, wrapping, user name hidden); home hero stacks.
- **760 / 720 / 600px**: invite form and lists reflow, domain strip goes to 2 columns, tables become stacked cards.
- **480px**: nav items and logout become 44px icon-only targets with visually hidden labels.

## Elevation & Depth

Mostly flat. Depth comes from paper panels on the cool ground and from solid ink blocks. One ambient shadow lifts the few standalone panels that hold a primary decision (home hero, the access panel, the share box, the invite form); ink panels never carry it. Translucent ink with backdrop blur appears only inside the audio stage, for the entry gate.

### Shadow Vocabulary
- **Ambient lift** (`box-shadow: 0 1px 2px rgb(20 21 25 / 6%), 0 8px 24px -12px rgb(20 21 25 / 18%)`): standalone paper decision panels.
- **Domain stroke** (`box-shadow: inset 0 3px 0 var(--domain)`): a top color edge on domain cells. This is a stroke, not elevation.
- **Active rail marker** (`box-shadow: inset 3px 0 0 var(--on-ink)`): the current page in the rail.

### Named Rules
**The Paper Or Ink Rule.** A surface is either paper on ground (optionally with the ambient lift) or solid ink (never shadowed). There are no gray cards and no stacked shadows.

## Shapes

Softly rounded and consistent: 8px for controls, inputs, alerts, and list rows; 16px for panels; 22px for the audio stage; 6px for domain tags; 5px for stamps; 8px for rail items; full pills only for the live/idle pill. The ruler uses 2px-rounded 14×8px ticks. Lia's voice indicator sits beneath her name in a circle. Borders are 1px hairlines; stamps use a 1.5px currentColor outline tilted -2deg.

## Components

### Buttons
Confident and tactile: a firm 48px target with a 1px press.
- **Shape:** gently rounded (8px), min-height 48px, padding 0 20px, 650 weight at 15px, optional 18px stroke icon with 0.5rem gap.
- **Primary:** ink fill, on-ink text. Hover ink-2. Copy is verb-first: "Começar entrevista", "Gerar convite", "Aceitar convite".
- **Secondary:** paper fill, line-strong border; hover darkens the border to ink-soft. Used for "Ver perfil", "Copiar link", and the microphone control with `aria-pressed`.
- **On ink:** paper fill with ink text (hover #e7eaf4), e.g. "Ligar microfone e entrar" in the room gate and the primary action in the invite box.
- **Ghost:** transparent; hover a 6% ink wash. Low-stakes actions such as "Cancelar".
- **Focus / Disabled:** 3px Entender-blue outline at 2px offset (on-ink outline on ink surfaces); disabled at 55% opacity. Busy state swaps the icon for an 18px spinner.

### Domain Tags
- **Style:** solid domain fill, white 12.5px bold text, 6px radius, padding .2rem .55rem. Text is the display name (Fazer, Mover, Cuidar, Entender), optionally "Entender · Estrategista de rotas".

### State Stamps (signature)
- **Style:** transparent, 1.5px currentColor outline, 5px radius, uppercase condensed 800 at 11.5px, rotated -2deg, no wrap.
- **States:** Enviado/Pronta in Entender blue; Aceito/Perfil pronto in ok green; Em andamento/Encerrada in warn; Cancelado/Expirado/Não iniciada/Falhou in ink-mute. A stamp persists in its row; state is never conveyed by removing an item.

### Intensity Ruler (signature)
- **Style:** five 14×8px ticks, 3px gap, filled ticks in the theme's domain color, empty ticks in line. Exposed as an image with "Presença N de 5".
- **Behavior:** the level is relative to the person's strongest theme (the strongest is 5), not an absolute score. The ruler is hidden when every theme has the same level, because then it would not differentiate.

### Evidence Mark (signature)
- **Style:** grifo band behind ink text from 12% to 88% of the line, 0.12em padding, cloned across line breaks.
- **Motion:** `grifo-draw` sweeps the band left to right over 0.9s on the expo-out ease when a phrase becomes evidence (live transcript, entry sample). Reduced motion makes it instant.

### Ping-Pong Transcript (signature)
- **Structure:** a 1.75–2rem initial column and the text. P in interviewer red, R in ink, both condensed 800. The question is display 600–650; the answer is Literata 1.6 line-height. Interim lines sit at 60% opacity until final; evidence spans are marked inline with a domain tag after them.

### Cards / Containers
- **Corner Style:** 16px panels, 8px rows.
- **Background:** paper on ground, or solid ink for authority surfaces (invite box, interview stage). Inner ink panels use ink-2.
- **Shadow Strategy:** ambient lift only on standalone paper decision panels (see Elevation & Depth).
- **Border:** 1px line on rows, tables, and the sample; none on lifted panels.
- **Internal Padding:** 1.25–1.75rem panels; .6–1rem rows.

### Inputs / Fields
- **Style:** 48px, paper fill, 1px field-line border, 8px radius; label 14px 600 above, hint 13px ink-mute below.
- **Focus:** border becomes Entender blue. Keyboard focus uses a 3px outline with a 2px offset. On ink surfaces, the border and outline use on-ink.
- **Error:** alert block in danger on danger-ground with `role="alert"`.

### Segmented Filter
- **Style:** paper track with line border and 4px inner padding; 36px segments, 600 14px ink-soft; the pressed segment is ink with on-ink text.

### Navigation
- **Style:** 240px sticky ink rail with the wordmark, 44px items in on-ink-mute 600 with 18px stroke icons, and the user block at the bottom above a translucent hairline.
- **States:** hover and current both ink-2 with on-ink text; current adds a 3px left inset bar in on-ink and `aria-current="page"`.
- **Mobile:** below 860px a horizontal top bar; below 480px icon-only 44px targets with visually hidden labels as accessible names.

### Wordmark
- **Style:** "Pontos Fortes", 800, width 75%, 1.6rem; "Pontos" sits on a grifo block with ink text.

### Icons
- **Style:** custom 24-grid stroke icons, 1.75 stroke, round caps and joins, currentColor, aria-hidden.

## Do's and Don'ts

### Do:
- **Do** reserve grifo (#ffe14d) for the person's evidence, text selection, and the wordmark's "Pontos".
- **Do** set the person's words in Literata and everything else in Bricolage Grotesque.
- **Do** make the primary action ink with on-ink text, and invert it to paper with ink text on ink surfaces.
- **Do** use the darkened domain values (Fazer #c9321e, Mover #8e5500, Cuidar #157a52, Entender #2f5bea) with white text, and name domains by display name, never by id.
- **Do** mark persistent states with a tilted outlined stamp in the state's color.
- **Do** compute the intensity ruler relative to the strongest theme and hide it when all levels match.
- **Do** keep touch targets at 44px or more (48px for buttons and inputs) and keep icon-only items labeled.

### Don't:
- **Don't** use yellow for buttons, badges, backgrounds, highlights of interface copy, or emphasis of names and titles.
- **Don't** use domain colors as decoration or as general accents outside the domain they name.
- **Don't** build metric-card dashboards, score dials, or radar charts.
- **Don't** shadow ink surfaces or stack shadows; use the single ambient lift on paper or nothing.
- **Don't** add uppercase labels above headings; uppercase belongs to stamps and the live pill.
- **Don't** show the ruler as an absolute score, or when it cannot differentiate.
