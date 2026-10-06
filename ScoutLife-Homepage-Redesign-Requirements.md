# Scout Life Homepage Redesign — Requirements & Plan

**Project:** scoutlife.org homepage redesign
**Owner:** Bryan Wursten
**Version:** 2.0 (draft for approval)
**Date:** October 5, 2026
**Status:** Awaiting approval. 3D prototype begins after sign-off.

| Version | Changes |
|---|---|
| 1.0 | First draft from discovery Q&A |
| 1.1 | Contests removed from top menu; YouTube-only social; logo and Maileagle assets added; Boredom Buster redesigned to avoid casino cues; Easter eggs refocused on mini interactions, animations and games; mockups to use real images and links |
| 2.0 | **3D Camp hybrid concept.** 2D hero replaced by an explorable voxel summer-camp hero (§6) above the v1.1 homepage; "Today at Camp" promo strip; Trail Map chosen as the 2D direction; four Phase 1 camp buildings with content panels; selected widgets also appear in building panels; 3D Easter eggs and minigames; vanilla Three.js; lite-3D and static-map fallbacks; 3D performance budget; phased roadmap; single prototype replaces three mockups |

---

## 1. Summary

Redesign the scoutlife.org homepage as a **hybrid**: an explorable, voxel-style 3D summer camp at the top of the page, sitting above a fast, conventional homepage that keeps today's content mix. Kids can look around the camp, tap buildings (tents, huts, cabins) to find content and widgets, and discover hidden critters, secret spots and quick minigames. Below the camp, the page keeps the v1.1 plan: colorful Trail Map styling, large slab type, swappable interactive widgets, ads and subscription promotion.

The 3D camp is a **layer on top of** the v1.1 page, not a replacement. Anyone who just wants to read can scroll straight past it. It must work well on desktop, tablet and phone, stay fast on school Chromebooks and older phones, and fall back gracefully when 3D isn't possible.

### 1.1 Goals

1. **Easy navigation** to section fronts and individual articles, with or without the 3D camp.
2. **Highlight a changing mix** of timely, new or interesting articles.
3. **Give kids something to do** on the homepage: explore the camp and play with interactive widgets.
4. **Reward curiosity** with surprising Easter eggs, secret spots and minigames.
5. **Work everywhere:** desktop, tablet and mobile, including low-power devices.
6. **Make Scout Life feel like camp:** a memorable, brand-defining first impression that brings kids back.

### 1.2 Success metrics

| Metric | What we measure | Direction |
|---|---|---|
| Pages per visit | Homepage → article/section click-through; pages per session from homepage entry | Up |
| Camp engagement | % of visits that interact with the camp; building opens; panel click-through; egg/minigame plays | Up; used to decide what to build in Phase 2 |
| Widget engagement | Interactions per widget (spins, votes, joke ratings, cabinet flips, carves), click-through to linked content, split by placement (building panel vs. widget zone) | Up; used to decide widget swaps |
| Return visits | Share of homepage visitors returning within 7 / 30 days | Up |
| Subscriptions | Clicks on every Subscribe CTA (header, promo band, footer), tracked by placement | Up |

**Launch approach:** Full launch to all visitors (no A/B test). Metrics are compared against a pre-launch baseline of the current homepage (at least 4 weeks of data captured before launch).

Ad performance is not a success metric for this project, but the redesign must not reduce ad visibility or break Google Ad Manager delivery (see §9).

### 1.3 Out of scope

- Article pages, section fronts and subdomains (jokes, fishing, fiction, eagleprojects, headsup). These get links from the homepage but are not being redesigned now.
- Changing the content mix or editorial strategy.
- User accounts or logins.
- **Full-screen "Enter Camp" mode** (walkable world, avatars, building interiors). Planned for Phase 3 (§16); Phase 1 assets must be built so they can be reused.
- Choosing the final build platform (requirements are platform-agnostic, with WordPress notes). The 3D layer uses vanilla Three.js so it can drop into a WordPress theme without a React/headless rebuild.

---

## 2. Audience

**Primary:** Kids **8–13**. The design should be fun for younger Cub Scouts without feeling "babyish" to middle schoolers.

**Secondary:** Younger Cub Scouts (6–7, often reading with a parent), older Scouts BSA (14–17), and parents/leaders looking for requirement help.

Design implications:

- Big tap targets (minimum 44×44 px; 48 px preferred for primary actions).
- Short labels and headlines; images do much of the work.
- Reading level for UI copy around grade 3–4.
- Humor is punny and goofy, never mean or scary-scary (the Halloween content is "spooky-fun").
- Assume many visits come from shared or school devices: no personal data, nothing that "remembers" a kid beyond simple, anonymous browser storage.

---

## 3. Design direction

### 3.1 Shared design principles

- **Colorful and loud, but organized.** Strong color blocks and big type, sitting on a clear grid so kids can scan quickly.
- **Large slab fonts.** Headlines are big, heavy slab serifs. Body text uses a highly legible sans for young readers.
- **Movement with a purpose.** Things wiggle, bounce and react to clicks to show they can be touched, and ambient motion gives the page life.
- **Playful logo.** The Scout Life logo stays recognizable but can animate, react to clicks and take part in Easter eggs (Google Doodle-style). The logo already exists in 10 color versions (red, orange, yellow, green, light blue, dark blue, purple, black, white, white-blue inline), so the Trail Map design can pick its main color and Easter eggs can cycle through the others.
- **Minimal mascots.** Content, color and motion carry the personality. **Scout the Maileagle** may appear *sparingly* (e.g., one Easter egg and the "no results" state). No other mascots.
- **No gambling cues.** This is a youth audience. No coins, tokens, credits, jackpots, betting language, slot symbols (7s, cherries, bars, bells), casino lights or "win" sounds anywhere on the page, including the Boredom Buster and Arcade widgets.
- **Clear ads.** Every ad is labeled "Advertisement" and visually separated from content. Easter eggs never sit next to or imitate ads.

### 3.2 2D style direction: Trail Map / Field Guide (chosen)

v1.1 explored three skins (Trail Map, Sticker-Bomb Scrapbook, Arcade). **v2.0 selects Trail Map** for the 2D page because it pairs naturally with the 3D camp. Sticker-Bomb and Arcade are retired (Arcade styling survives only inside the Arcade widget's cabinet).

#### Trail Map / Field Guide

The outdoors and Scouting as the theme.

- **Look:** Topo-map contour lines as background texture, dotted trail lines that connect sections, merit-badge-style patches for section labels, passport-style stamps for "NEW" and "HOT," compass rose details.
- **Motion:** The trail line "draws" itself as you scroll; patches flip on hover; the compass needle in the header follows the cursor.
- **Palette (starting point):** Forest green `#1F5C3A`, trail orange `#F26B21`, sky blue `#3FA9F5`, sunshine yellow `#FFC629`, topo cream `#F6EEDC`, ink `#1B1B1B`.
- **Type:** Alfa Slab One (headlines), Zilla Slab (subheads), Atkinson Hyperlegible (body).
- **Link to the camp:** The dotted trail line starts at the bottom edge of the 3D camp and leads down the page, so the camp and the 2D page read as one map.

The palette is a starting point. Final color pairs must pass WCAG 2.2 AA contrast (§11).

### 3.3 3D camp art direction

- **Style:** An **original voxel style**: chunky blocks with Scout Life's own palette, textures, props and critters. It should feel blocky and buildable, but **must not imitate Minecraft** (no Minecraft textures, block patterns, creatures, UI, fonts or names). Final art gets a trademark/likeness review before launch (§15).
- **Palette:** Derived from Trail Map colors: forest greens, trail orange, sky blue, sunshine yellow, warm wood browns, canvas creams.
- **Camera:** Fixed **isometric diorama** view (see §6.3). No player avatar in Phase 1. The camp is populated by small generic voxel Scouts and animals.
- **Signage:** Each building has a chunky wooden sign with its name and the section's signature color, legible at mobile size.
- **Lighting:** Baked lighting plus a single sun/moon light that follows the day/night cycle (§6.6). Soft, friendly shadows; nothing scary at night (warm campfire glow, fireflies, stars).
- **Mascots:** Same rule as v1.1. No player avatar; Scout the Maileagle may appear sparingly (e.g., one egg).

### 3.4 Typography

- **Licensing:** Free/open fonts only (SIL Open Font License or Apache, e.g., Google Fonts). Self-host the font files; don't load them from a third-party CDN (better speed, privacy and school-filter reliability).
- **Scale:** Big promo headline 48–72 px desktop / 32–40 px mobile; section headers 32–40 px / 24–28 px; body 18 px minimum (16 px minimum on mobile).
- **Limits:** At most 3 font families; subset fonts to Latin; use `font-display: swap`.

### 3.5 Motion system

**Level:** Lively but respectful.

- **Ambient motion:** In the header and a few select spots only, e.g., drifting clouds or a twinkling icon. Never behind body text.
- **Interaction motion:** Hover/tap wiggles, bouncy buttons, card lifts, reveals as content scrolls into view.
- **Celebration motion:** Short bursts (confetti, pops) for widget wins and Easter egg discoveries, 1.5 seconds or less.
- **Reduced motion:** When the device's `prefers-reduced-motion` setting is on, ambient motion and parallax turn off; transitions become simple fades; Easter eggs still work but without big movement. **The 3D camp shows the static illustrated map instead** (§6.8).
- **Pause control:** A visible "Pause animations" toggle (in the header utility area or footer) that's remembered in browser storage. In the camp it freezes ambient life, weather and the render loop (the scene renders only on interaction).
- **Camera motion:** Camera moves are short (≤ 600 ms), eased and never automatic. No camera shake, no auto-fly-throughs, no head-bob.
- **Safety:** Nothing flashes more than 3 times per second (this includes lightning in the weather system; see §6.6). No auto-playing audio.

### 3.6 Sound

- **Off by default.** A speaker toggle in the corner of the camp turns sound on; the choice is remembered in browser storage.
- **Ambient:** Birds and breeze by day, crickets and crackling campfire at night, gentle rain during weather events.
- **Interaction:** Soft wooden "clunk" on building tap, critter chirps, minigame sounds. No casino-style "win" sounds (§3.1).
- All audio is self-hosted, compressed (Opus/AAC, ≤ 300 KB total for Phase 1) and lazy-loaded only after sound is turned on.

---

## 4. Page structure

### 4.1 Order of sections (top to bottom)

| # | Section | Notes |
|---|---|---|
| 1 | Leaderboard ad | 728×90 desktop/tablet; 320×50 mobile. Labeled. |
| 2 | Header | Logo, mega-menu nav, search, Subscribe. Becomes a compact sticky bar on scroll. |
| 3 | **3D Camp hero** | Isometric voxel camp, ~70% of viewport height on desktop. Four Phase 1 buildings open content panels. See §6. |
| 4 | **"Today at Camp" strip** | 1 big + 4 secondary hand-picked promos, directly under the camp (replaces the v1.1 hero layout). See §6.4. |
| 5 | Widget Zone 1 | 3 widget slots + 300×250 ad. |
| 6 | Feature band | Video of the Week + Subscription promo (side by side on desktop, stacked on mobile). |
| 7 | Widget Zone 2 | 4 widget slots + 300×600 ad. |
| 8 | Widget Zone 3 (section shelves) | Section Shelf widgets so every section stays visible on the homepage. Includes one more 300×250 ad. |
| 9 | Footer | Links, contact, social, Join Scouting, Advertise, Privacy, campfire Easter egg. |

Sections 4–9 follow the v1.1 plan unless noted. The camp never pushes the leaderboard ad, header or "Today at Camp" strip out of the page structure; it only adds to it.

### 4.2 Grid and breakpoints

| Breakpoint | Width | Columns | Container |
|---|---|---|---|
| Mobile | < 640 px | 4 | Full width, 16 px gutters |
| Tablet | 640–1023 px | 8 | Full width, 24 px gutters |
| Desktop | 1024–1279 px | 12 | 1024 px max |
| Wide | ≥ 1280 px | 12 | 1240 px max |

### 4.3 Widget slot sizes (fixed slots)

Widgets plug into fixed, standard-sized slots so any widget can swap into any slot of a matching size.

| Slot size | Desktop | Tablet | Mobile |
|---|---|---|---|
| **S (Standard)** | 4 of 12 columns, ~ 400×420 px | 4 of 8 columns | Full width |
| **W (Wide)** | 8 of 12 columns, ~ 820×420 px | Full width | Full width |

- Every widget must support **S**. Widgets that benefit from more space (Arcade, Seasonal, Gear carousel) also provide a **W** layout.
- Fixed heights prevent layout shift when widgets load or swap.
- On mobile, widgets stack in a single column. The editor-set order is kept, and ads are placed between widgets (never two ads in a row).

---

## 5. Header

### 5.1 Contents

- **Leaderboard ad** above the header (see §9).
- **Logo:** Large, left-aligned, animated and interactive (see Easter eggs §8).
- **Primary nav:** Games · Jokes · Outdoors & Gear · Hobbies & Projects · Scouts · Contact Us. (**Contests** is removed from the top menu. It stays in the footer and as a homepage widget.)
- **Search:** Icon button that opens a large search panel.
- **Subscribe:** The most visible button in the header (biggest contrast, sticker/button treatment, a gentle wiggle every so often, which stops after 3 times per visit).

### 5.2 Mega menus

Hover (desktop) or tap (tablet/mobile) opens a big, colorful panel for each section:

| Nav item | Subsection links (from current site) | Featured slot |
|---|---|---|
| Games | Play Games (Arcade), Quizzes | 1–2 editor-picked games/quizzes with images |
| Jokes | Joke of the Day, Write a Funny Caption, Wacky Adventures comic, Pee Wee Harris comic | Today's Joke of the Day |
| Outdoors & Gear | Outdoors, Gear Buying Guides, Ask the Gear Guy, Animals and Nature, Fishing | 1–2 featured articles |
| Hobbies & Projects | How To Do It, Fun Stuff to Do, 10 Under 10 Crafts, Pinewood Derby HQ, Heads Up, Fiction | 1–2 featured articles |
| Scouts | Scouting Around, Eagle Project Showcase, Scouts in Action comics | 1–2 featured articles |
| Contact Us | Contact, Subscriber Services, Send Us Your Jokes, Advertise | none |

- Panels open on hover with a short delay (~150 ms) and close on mouse-out with a ~300 ms grace period. They're fully keyboard-operable (Enter/Space opens, Esc closes, arrow keys move).
- Each section has a signature color used in its panel, its section-shelf widget and its article labels, so kids learn the color coding.
- **Without JavaScript,** top-level items link straight to section fronts.

### 5.3 Search

- Opens as a large panel or overlay with a big input ("What are you looking for?").
- Shows **popular search chips** (editor-set), e.g., Jokes, Pinewood Derby, Knots, Games, Halloween.
- Supports **search-word Easter eggs** (§8). The gag plays first (≤ 1.5 s), then normal results load.
- Works as a plain form submit without JS.

### 5.4 Sticky behavior

- After scrolling past the full header, a compact bar slides in with a small logo, a menu button, search and Subscribe.
- The leaderboard ad is **not** sticky.

### 5.5 Mobile header

- Logo + search icon + Subscribe button + menu button.
- The menu opens a full-screen, colorful drawer: search at top, then section accordions (the mega-menu content in list form), then Subscribe and Contact.

### 5.6 Header animation (ambient)

Trail Map style: clouds drift behind the logo and the compass needle follows the cursor. Nav items bounce slightly on hover. Ambient motion respects reduced-motion and the pause toggle. Header sky color may subtly follow the camp's time of day.

---

## 6. 3D Camp hero

### 6.1 Concept

The top of the homepage is a small, explorable **voxel summer camp** seen from above like a diorama. Kids can rotate and pan it a little, tap buildings to see what's inside, and poke around for critters, secret spots and minigames. Everything the camp links to is also reachable from the regular page below, so the camp is a delight, never a gate.

### 6.2 Size and placement

| Breakpoint | Camp height | Notes |
|---|---|---|
| Desktop / Wide | ~70% of viewport height (min 480 px, max 760 px) | The top of the "Today at Camp" strip peeks in below to signal "scroll for more." |
| Tablet | ~60% of viewport height | Same scene, lite quality tier if needed. |
| Mobile | ~55–60% of viewport height | Lite 3D scene (§6.8); vertical page scroll is never trapped by the canvas. |

- Sits below the header and leaderboard ad. Never sticky.
- A small **"Camp Map"** button (top-left of the camp) opens an accessible list of every building and its links (§6.9).
- A **sound toggle** (§3.6) and a **pause button** sit in the camp's top-right corner.

### 6.3 Camera and controls

- **Isometric diorama** with a fixed default angle that shows the whole camp.
- **Desktop:** Drag to rotate (limited to about ±45° around the camp), scroll-wheel zoom only while the pointer is over the camp **and** the camp has been clicked/focused (so page scrolling is never hijacked). Click a building to zoom to it and open its panel.
- **Touch:** One-finger vertical swipes always scroll the page. One-finger horizontal drag rotates; pinch zooms; tap selects.
- **Keyboard:** Tab moves between buildings and interactive objects (each has a visible focus ring drawn in the scene and a matching hidden DOM button); Enter opens; Esc closes the panel and returns the camera; arrow keys rotate.
- A **"Reset view"** button returns to the default angle.
- Zoom and pan are clamped so kids can't get lost or see the edge of the world.
- No player avatar in Phase 1.

### 6.4 "Today at Camp" promo strip

Replaces the v1.1 hero layout. It sits directly under the camp and is always visible without interacting with the 3D.

- **1 big + 4 secondary promos,** all **hand-picked by editors** (same rules as v1.1).
- **Desktop:** Big promo about 1/2 width, 4 secondary promos in a row or 2×2 grid beside it. Styled as Trail Map "trail stops."
- **Tablet:** Big promo full width; secondary promos in a 2×2 grid.
- **Mobile:** Big promo full width; secondary promos in a horizontally swipeable row with peeking cards and visible arrows/dots.
- **Card content:** Image, section label in the section's color, headline, optional dek (big promo only), optional "NEW" / "HOT" / "SEASONAL" flag.
- **Behavior:** Cards lift on hover; whole card is one link; **no auto-rotating carousel.** One slot may hold a game or quiz with a "Play" button.
- **Linked to the camp:** If a promo's section maps to a camp building, that building shows a **glowing marker** (a floating lantern/flag in the section color). Hovering or focusing a promo card makes its building's marker bounce; tapping the marker in the camp opens that building's panel with the promo pinned at the top.
- **Editorial controls:** Editors choose all 5 slots, crop focus points and flags; schedule start/end; keep a backup list so an unpublished item never leaves a hole.

### 6.5 Phase 1 buildings

Four buildings, one per major content area. Each building's content comes from the CMS automatically (§6.7).

| Building | Section(s) / content | Widget in panel (§7) | Ambient detail |
|---|---|---|---|
| **Campfire Ring** | Jokes, Joke of the Day, comics (Wacky Adventures, Pee Wee Harris, Scouts in Action), Write a Funny Caption | **Joke widget** | Crackling fire, log benches, rising sparks; glows brightest at night |
| **Game Tent** | Games, Play Games (Arcade), Quizzes | **Arcade widget** | Striped tent with a flag on top; little pixel lights blink inside |
| **Craft Hut** | Hobbies & Projects: How To Do It, Fun Stuff to Do, 10 Under 10 Crafts, Pinewood Derby HQ | **Idea Machine (Boredom Buster)** | Sawdust puffs, a workbench, a half-built birdhouse; the Idea Machine is visible through the window |
| **Quartermaster Cabin** | Outdoors & Gear: Gear Buying Guides, Ask the Gear Guy, Stuff We Like, Outdoors, Animals and Nature | **Gear Guide widget** | Log cabin with a supply shelf, lanterns and a canoe paddle by the door |

**Not in the camp in Phase 1:** Scouts (Scouting Around, Eagle Projects, Requirements Finder), Subscribe/magazine, Fishing, Fiction, Contests. These stay on the 2D page (nav, widgets, promo band, footer). Phase 2 candidates: Flagpole/Bulletin Board, Trading Post, Waterfront, Dining Hall, Story Tent (§16).

**Camp layout:** Buildings sit around a central path loop with the Campfire Ring near the center. The rest of the diorama is scenery: trees, rocks, a small pond/creek, a flagpole (decorative only), a camp entrance sign reading "Camp Scout Life," and the secret spots in §8.

### 6.6 Living world (Phase 1)

| Feature | Behavior |
|---|---|
| **Day/night by local time** | Uses the visitor's device clock. Four looks: morning (sunrise colors), day, dusk (campfire lit, lanterns on) and night (stars, moon, fireflies). Transitions are gradual and computed on load (no live sunset animation needed). Night must stay friendly and well lit enough to see every building and sign. |
| **Ambient life** | Birds hopping and flying over, squirrels, fish jumping in the pond, smoke from the campfire, the flag waving, small generic voxel Scouts walking the paths and sitting at the campfire. Max ~12 animated agents at once (fewer on lite tier). |
| **Weather** | Occasional light weather picked at random per visit: clear (most visits), clouds, light rain (puddles, ripples on the pond) and a rainbow after rain. No thunder sounds; any lightning is a soft, single, slow glow that never flashes more than 3 times per second, and is off under reduced motion. Editors can force clear weather. |

All living-world motion pauses with the pause toggle and is replaced by a still scene under reduced motion.

**Seasonal camp skins** (fall leaves, snow, etc.) are **not** in Phase 1; the Seasonal widget stays in the 2D widget zones. See §16.

### 6.7 Building panels

Tapping a building zooms the camera toward it (≤ 600 ms) and opens a **2D panel** over the scene. Content is real HTML (crawlable, accessible), not drawn in WebGL.

- **Desktop/tablet:** Side panel on the right, about 40% of the camp width. The scene stays visible and dimmed on the left.
- **Mobile:** Bottom sheet that covers up to ~85% of the camp height, with a drag handle and a close button.
- **Panel anatomy:**
  1. Building name in slab type + section color + small building icon.
  2. **Pinned items** (0–2, editor-chosen), shown first with a "Camp Pick" stamp.
  3. **Latest articles** (auto): the 4–6 newest items from the building's mapped CMS categories, as compact cards (image, title).
  4. **The building's widget** (§7) in its S layout.
  5. Footer links: "Go to [Section] →" (section front) and "Jump to [Section] below ↓" (scrolls to the matching shelf/widget on the page).
- **Closing:** Close button, Esc, tapping outside the panel, or tapping another building (which switches panels).
- **Deep links:** Opening a panel updates the URL hash (e.g., `#camp-craft-hut`) so a panel can be linked and the browser Back button closes it.
- **Without JS / no 3D:** Each panel's contents exist as a section in the Camp Map list (§6.9).

### 6.8 Quality tiers and fallbacks

The camp chooses a tier on load from device capability (WebGL2 support, GPU info, memory, screen size, a short frame-rate probe) and the visitor's settings.

| Tier | Who gets it | What they see |
|---|---|---|
| **Full 3D** | Desktop, recent tablets | Full scene: shadows, weather particles, all ambient life, post-effects (if any) within budget |
| **Lite 3D** | Phones, Chromebooks, older tablets, any device that drops below 30 fps in the probe | Same camp and buildings, fewer props and agents, no real-time shadows, simpler water, lower resolution rendering |
| **Static map** | No WebGL, reduced motion on, Save-Data on, very low memory, JS off, or the 3D failed to load | A **static illustrated camp map** (pre-rendered from the 3D scene, per time of day) with tappable hotspots for each building that open the same 2D panels (or link to section fronts without JS) |

- The **static map image is also the first paint for every tier** (it's the LCP element). The 3D scene loads afterward and cross-fades in when ready, so kids never stare at a loading spinner.
- If the frame rate drops below ~24 fps for several seconds, the camp steps down a tier automatically.
- A small "Switch to simple map" link is always available for anyone who prefers it.

### 6.9 Camp Map (accessible equivalent)

- A **"Camp Map"** button opens a plain list of every building, its description and all panel links, plus a short "Things to find" hint list (no spoilers).
- The same content is in the DOM for screen readers and search engines, so nothing is reachable only through WebGL.
- The canvas itself has `role="img"` with a short description, and every interactive 3D object has a matching, focusable DOM button positioned over it.

### 6.10 Editorial controls (camp)

- Map each building to one or more CMS categories.
- Pin 0–2 items per building, with optional start/end dates.
- Choose which widget appears in each building's panel (from the widgets that support panel placement).
- Turn ambient life, weather and individual 3D Easter eggs on or off; force clear weather.
- Turn the whole 3D camp off (falls back to the static map) for emergencies or campaigns.
- Building names, sign text and panel intros are editable text.

---

## 7. Interactive widgets

### 7.1 Widget framework (applies to every widget)

**Modular:** Each widget is a self-contained module with its own markup, styles, script, data source and analytics. Widgets don't depend on each other.

**Editor controls (CMS):**
- Turn each widget on or off.
- Assign it to a slot, and reorder slots in each zone.
- Pick S or W size where supported.
- Set optional start/end dates (useful for seasonal widgets, even though turning them on by hand is the main workflow).
- Edit the widget's title, intro line and the links it shows.

**Two placements (new in v2.0):** Four widgets appear **both** in a camp building panel (§6.7) and in the widget zones below:

| Widget | Building panel | Widget zone |
|---|---|---|
| Joke | Campfire Ring | Yes |
| Arcade | Game Tent | Yes |
| Boredom Buster (Idea Machine) | Craft Hut | Yes |
| Gear Guide | Quartermaster Cabin | Yes |

- The same widget module renders in both places using its **S** layout in the panel. It must work at panel width (~360–420 px) and in a mobile bottom sheet.
- Both instances share state within a visit (e.g., a joke rated in the panel shows as rated in the zone).
- Analytics record which placement was used (§13).
- Only one instance runs its animation loop at a time; the zone instance pauses while a panel is open.

**Interaction model — "mini-play, then link":** Kids can *do something* right on the homepage (spin, vote, flip, carve), and every widget then offers a clear link to go deeper into the full content.

**Standard widget anatomy:**
1. Header: title in slab type + small icon.
2. Play area: the interactive bit.
3. Result/content area.
4. Footer link: "More jokes →", "See all games →", etc.

**Requirements for every widget:**
- Fixed height per slot size (no layout shift).
- Keyboard and screen-reader accessible. Any interaction done by drag or gesture also works by button.
- Works without JS: shows a static fallback (e.g., the current joke, a list of links).
- Lazy-loads its script when it's near the viewport.
- Fires standard analytics events (§13).
- Includes at least one small Easter egg hook (optional per widget).
- Collects **no personal information** and has **no free-text input that gets stored or published.**

### 7.2 Core widgets

#### Joke widget

- **Joke of the Day:** Shows the **full joke** (names and lines, as formatted on jokes.scoutlife.org), with the contributor credit ("Joke by Teddy W., Lambertville, New Jersey").
- **Find a joke — topic buttons:** 5–6 chunky buttons (editor-configurable; e.g., Animals, Food, Knock-Knock, Camping/Scouting, Monsters, School). Tapping one swaps in a random joke from that topic with a flip/bounce animation.
- **Rate it:** A "Laugh-o-Meter" with 3–5 emoji-style faces (Groan → LOL) that maps to the existing 5-star rating on jokes.scoutlife.org where possible. Anonymous; one rating per joke per browser.
- **Links:** "More jokes →" (jokes.scoutlife.org), "Send us your joke →" (contact page).
- **Data:** Joke of the Day and topic jokes are pulled from jokes.scoutlife.org (WordPress REST API or a cached feed). *Dependency: confirm a feed/API exists or can be added.*
- **Easter egg:** Tapping "Groan" 5 times in a row makes the whole widget sag and melt down like a puddle, then boing back into shape.

#### Requirements Finder

Helps Scouts (and parents/leaders) find Scout Life content that supports specific advancement requirements.

- **Step 1:** Program: **Cub Scouts** or **Scouts BSA** (two big toggle buttons).
- **Step 2:** Dropdown of ranks/categories:
  - Cub Scouts: Lion, Tiger, Wolf, Bear, Webelos, Arrow of Light
  - Scouts BSA: Scout, Tenderfoot, Second Class, First Class, Star, Life, Eagle, **Merit Badges**
- **Step 3:** Dropdown of adventures / requirements / merit badges (only options that have tagged content are shown).
- **Result:** 3–5 matching articles as compact cards, plus "See all →" to a filtered results page.
- **Data:** Uses the existing **Requirements taxonomy** (built but not fully populated). Dropdowns only show terms with at least one tagged article, so kids never land on empty results.
- **Fallback:** If nothing matches, show related content (same rank or category) and a friendly "We're still adding stuff for this one!" note. This is where Scout the Maileagle may appear.
- **Without JS:** A standard form that submits to the results page.
- **Dependency:** A tagging plan to fill out the taxonomy (see §15).

#### Boredom Buster (the Idea Machine)

Works like a slot machine (crank it, windows spin, an idea pops out), but it should look and feel like a **silly homemade contraption**, not a casino game. Think gumball machine crossed with a mad-scientist invention: gears, pipes, a crank, a little smokestack.

- **Interaction:** Kids turn a big crank (or tap a big "CRANK IT!" button). Gears turn, the machine shakes and puffs steam, and three windows spin before landing on a **random project or how-to** from Hobbies & Projects / Fun Stuff to Do / How To Do It.
- **Window icons** show content types: scissors = craft, flask = science, tent = outdoors, paintbrush = art, chef hat = recipe, hammer = build.
- **Result:** The idea pops out of a chute on a ticket or capsule that unrolls into a card: image + title + a "time needed" tag (if available) + "Let's do it →" link. "Try another!" button.
- **Language:** "Crank it!", "Try another!", "Here's an idea!" **Never** "spin to win," "jackpot," "lucky," "bet" or "prize."
- **Banned visuals/sounds:** Coins, tokens, credits, 7s, cherries, bars, bells, flashing marquee lights, casino payout sounds.
- **Easter egg:** If all three windows show the same icon, the machine does a happy dance: it hops, its smokestack toots a bubble ring, and gears pop out and spin back in.
- **Data:** Draws from an editor-maintained pool (or category feed) of projects. Optional metadata for time/indoor/outdoor if we want to filter later.
- **Reduced motion:** The windows fade to the result instead of spinning; the machine doesn't shake.

#### Arcade widget (arcade cabinet)

- **Look:** An illustrated arcade cabinet (styled to fit the Trail Map page, with its own retro arcade look inside the cabinet). The "screen" shows an animated preview of the featured game (short looping WebP or muted video, lazy-loaded).
- **Controls:** Joystick / ◀ ▶ arrows flip through 4–6 editor-picked games; a marquee at the top shows the game name; a **"PRESS START"** button links to the game. (No coin slot or "insert coin," in line with the no-gambling-cues rule.)
- **Links:** "See all games →" (Play Games section).
- **Easter egg:** Wiggle the joystick in a full circle and the cabinet's screen turns into a **10-second mini-game** (e.g., catch falling acorns in a basket), with a pixel "Nice!" at the end.
- **Sizes:** S and W (W shows the cabinet plus a short game description).

#### Seasonal widget (Halloween is the first skin)

A **reusable seasonal widget shell** that editors can re-skin for different times of year.

- **Shell parts:**
  1. **Countdown banner:** "17 days until Halloween!" (auto-calculated; switches to a "Happy Halloween!" message on the day).
  2. **Activity area:** Tabs for 1–2 mini-activities.
  3. **Picks:** 3–4 editor-picked seasonal links (crafts, costumes, jokes, stories).
- **Halloween activities:**
  - **Pumpkin Carver:** Tap to pick eyes, nose and mouth shapes for a jack-o'-lantern; a candle flickers when you finish. A "Carve it for real →" link goes to pumpkin projects. *Easter egg:* a secret face combination brings the pumpkin to life: it hops, rolls its eyes, and its candle flame dances.
  - **Trick-or-Treat Door:** Knock on a spooky door. You get a **treat** (a Halloween project or article) or a **trick** (a Halloween joke or a harmless gag, like a rubber spider dropping down). *Easter egg:* knocking the "shave and a haircut" rhythm swings the door open and a conga line of little ghosts dances out across the widget.
- **Camp tie-in:** In Phase 1 the Seasonal widget stays in the 2D zones only. A future phase may re-skin the whole camp for the season (§16).
- **Future skins (examples):** Winter holidays (decorate a tree / build a snowman), Pinewood Derby season (pick a car, race), Thanksgiving (turkey joke disguise), Summer camp (pack the bag / roast s'mores), Back to school.
- **Sizes:** S and W.

#### Gear Guide widget (carousel)

- **Content:** Swipeable cards mixing **Gear Buying Guides**, **Ask the Gear Guy** Q&As and **Stuff We Like** reviews.
- **Card:** Image, type label ("Buying Guide" / "Ask the Gear Guy" / "Stuff We Like"), title, and for Q&As a short question teaser.
- **Controls:** Arrows + swipe + dots; no auto-advance.
- **Links:** "All gear guides →".
- **Easter egg:** Swipe past the last card and a backpack bursts open, spilling gear icons.
- **Sizes:** S and W.
- **Camp placement:** Quartermaster Cabin panel. Styled as the quartermaster's supply shelf ("Check out gear").

### 7.3 Additional widgets (current homepage blocks folded into the widget system)

These keep today's homepage content visible in the new widget format.

| Widget | Mini-play | Links to |
|---|---|---|
| **Poll** | Vote on today's poll; animated results bar. Anonymous, one vote per browser. | Polls page |
| **Quiz Teaser** | Answer one question from a featured quiz; get instant "Correct!" / "Nope!" feedback. | Full quiz, Quizzes section |
| **Pinewood Derby** | Pick 1 of 3 cars and watch a 3-second race down the track. | Pinewood Derby HQ |
| **Fishing** | "Cast a line" and reel in a random fishing article, fish fact or fish joke. | fishing.scoutlife.org |
| **Fiction** | "Story starter": the first line of a featured story in big type, with "Keep reading →". | fiction.scoutlife.org |
| **Eagle Projects** | Flip-card carousel of featured Eagle projects. | eagleprojects.scoutlife.org |
| **Comic of the Day** | Comic panel(s) from Wacky Adventures, Pee Wee Harris or Scouts in Action, or a joke-site comic. | Comic section |
| **Write a Funny Caption** | Shows the current photo; tap to see a sample caption. *No caption entry on the homepage (COPPA).* | Caption contest page |
| **Contests & Giveaways** | Flip card that reveals the current prize. | Contests page |
| **Section Shelf** (generic) | A shelf of 3–4 latest articles from any chosen section in that section's color (e.g., Fun Stuff to Do, How To Do It, Scouting Around, Outdoors & Gear, Animals and Nature). | Section front |

**Note:** "This Month's Issue" and "Subscriber Services" move into the Subscription promo (§10).

---

## 8. Easter eggs

### 8.1 Philosophy

Easter eggs are **experiences, not destinations.** Each one is a small, self-contained **mini interaction, animation or game** that's fun in its own right and lasts about 3–30 seconds. The reward is the moment itself: something moves, reacts, can be played with or turns into a quick challenge.

- **Do:** Physics toys (things you can flick, drag, toss or pop), surprise animations, quick skill games, playful page transformations.
- **Don't:** Make the payoff a link to hidden content, a bonus joke, a secret page or a text message.

### 8.2 Rules

1. **Never block content or navigation.** Eggs are bonuses, not barriers.
2. **Never next to, inside or imitating ads.**
3. **No personal data.** Discoveries can be counted anonymously for analytics; nothing else is stored.
4. **Accessible:** Every egg has a keyboard/tap trigger; egg animations respect reduced-motion and the pause toggle; any surprise that changes the page can be undone with one click or Esc.
5. **Lightweight:** The Easter egg script loads after the page is idle and never delays main content.
6. **Editor control:** A master switch plus per-egg toggles in the CMS.
7. **Mobile parity:** Every egg triggered by keyboard has a touch alternative.
8. **No gambling cues** (see §3.1).

### 8.3 Egg catalog

| # | Category | Egg | Trigger | The mini interaction / game |
|---|---|---|---|---|
| 1 | Logo | **Jelly logo** | Hover/tap the logo | Letters jiggle like jelly. Drag any letter and it stretches, then springs back with a boing. |
| 2 | Logo | **Color pop** | Tap the logo repeatedly | Each tap pops it into the next of its 10 official colors with a paint-splat burst. Ten taps in a row and it does a full rainbow spin. |
| 3 | Logo | **Maileagle flyby** | Click/tap the logo 5 times fast | Scout the Maileagle swoops across the header. Tap him mid-flight and he does a loop-de-loop; a feather floats down that kids can blow around with the cursor. (One of the few Maileagle appearances.) |
| 4 | Secret code | **Retro Mode** | Konami code (↑↑↓↓←→←→BA); on touch, swipe that pattern on the header | The page turns into an 8-bit pixel skin and a little pixel hiker walks along the header. Press Space or tap to make him jump over pixel rocks. Esc or "Exit Retro Mode" restores. |
| 5 | Secret code | **Be Prepared** | Type `BEPREPARED` anywhere | A burst of knots, compasses and flashlights rains down and piles up at the bottom of the screen. Kids can flick and toss them around (simple physics) until they fade. |
| 6 | Secret code | **Flashlight hunt** | Tap the logo in Morse SOS (··· − − − ···) | The page goes dark and the cursor/finger becomes a flashlight beam. Find all 5 glowing critters hiding on the page; a counter tracks "3 of 5 found." Lights come back on when you finish or press Esc. |
| 7 | Hidden critter | **Ladybug chase** | Ladybug appears on a random edge | Tap it and it flies to a new spot. Catch it 3 times and it does a victory spiral and flies off the screen. |
| 8 | Hidden critter | **Squirrel stash** | Squirrel peeks out behind a nav item | Tap it and it grabs an acorn and dashes off. Tap the acorns it drops to toss them back, and it catches each one with a little flip. |
| 9 | Hidden critter | **Jumping fish** | Ripples in the Fishing or Gear widget | A fish leaps from the water now and then. Tap it mid-jump to "catch" it; it does a spin and splashes back in. |
| 10 | Hidden critter | **Bat** (seasonal) | Hangs on the Halloween widget | Tap it and it wakes up and follows your cursor around the widget for a few seconds before flapping back to its perch. |
| 11 | Search secret | **Pizza** | Search "pizza" | Pizza slices rain down; tap them to take a bite out of each one. Then results load. |
| 12 | Search secret | **Pinewood** | Search "pinewood" | A derby car zooms down a track that draws itself across the search bar, then crosses a checkered finish line. |
| 13 | Search secret | **Barrel roll** | Search "do a barrel roll" | The page spins once (a wiggle under reduced-motion). |
| 14 | Search secret | **Bigfoot** | Search "bigfoot" | Giant footprints stomp across the page, shaking the cards as they pass. |
| 15 | Search secret | **Knot** | Search "knot" | The search bar ties itself in a square knot; tap to untie it. |
| 16 | Footer | **S'mores toaster** | Scroll to the very bottom | A campfire crackles. Press and hold to toast a marshmallow: let go at golden-brown for a "Perfect!" happy-marshmallow dance; hold too long and it catches fire, so blow it out (tap fast). |
| 17 | Footer | **Constellation builder** | Tap the stars above the campfire | Connect stars to draw constellations; a finished one lights up and animates (e.g., the Big Dipper pours out sparkles). Fireflies blink and drift toward the cursor. |
| 18 | Hidden object | **Paper airplane** | A tiny folded airplane tucked in the corner of the "Today at Camp" strip | Drag and release to throw it; it glides, loops and lands somewhere else on the page. Throw it again from there. |
| 19 | Hidden object | ~~Stone skipping~~ | *Moved to the 3D camp pond (§8.4, M2).* | — |
| 20 | Widget | Joke melt, Idea Machine dance, Arcade mini-game, Pumpkin comes alive, Ghost conga, Backpack burst | See §7 | See §7 |

**Critter limits (2D page):** At most 2 critters visible at once; positions are randomized per visit so kids keep looking. 3D camp critters (§8.4) don't count toward this limit.

**Hint system:** A subtle line near the footer campfire: "Psst… there are secrets hidden on this page." The Camp Map shows "Things to find" hints (e.g., "Something is rummaging in the trash…") without revealing triggers. No full list is ever shown on the site.

### 8.4 3D camp Easter eggs and minigames (Phase 1)

Same philosophy and rules as §8.1–8.2. In addition: eggs never cover a building sign or block opening a building panel, and every 3D egg has a focusable DOM trigger for keyboard users.

**Critter interactions**

| # | Egg | Trigger | What happens |
|---|---|---|---|
| C1 | **Raccoon raid** | Raccoon rummaging in a camp trash can (more often at dusk/night) | Tap it and it pops out holding a hot dog, does a guilty freeze, then scurries into the woods. Tap the trash can lid shut before it comes back for a little "click-clunk" win. |
| C2 | **Squirrel relay** | Squirrel on a tree branch | Tap and it races down the trunk, across the path and up another tree, dropping an acorn. Tap the acorn to toss it back. |
| C3 | **Leaping fish** | Ripples on the pond | A fish jumps now and then; tap it mid-air and it does a flip and a big splash. |
| C4 | **Night owl** | Owl in a tree, night only | Tap and its head swivels to follow your cursor/finger; tap again for a soft "hoo-hoo" (if sound is on) and a wing stretch. |
| C5 | **Firefly catch** | Fireflies, dusk/night | Tap fireflies to gather them into a glowing jar near the campfire; 10 makes the jar glow and light up the path. |

**Quick minigames** (each ≤ 30–60 seconds, playable with mouse, touch or keyboard; open in a small overlay so the camp stays visible)

| # | Minigame | Where | How it plays |
|---|---|---|---|
| M1 | **Archery range** | Small target range at the edge of camp | Tap and hold to draw, release to shoot; wind flag hints at drift. 5 arrows, simple score ("3 bullseyes!"). |
| M2 | **Stone skipping** | Pond | Flick/swipe across the water (or press-and-release button); count skips. (3D version of v1.1 egg #19, which is removed from the 2D page.) |
| M3 | **S'mores toaster** | Campfire Ring | Press and hold to toast a marshmallow; let go at golden-brown for a happy-marshmallow dance; too long and you must blow it out (tap fast). (3D version of v1.1 egg #16; the footer version stays.) |

**Secret spots**

| # | Spot | How to find it | Reward |
|---|---|---|---|
| S1 | **Hidden cave** | Rotate the camp to the back side and find a dark gap in the rocks | Tap to peek in: glowing crystals, a sleepy bat, and voxel cave paintings of camp scenes. |
| S2 | **Bigfoot sighting** | Rare (about 1 in 20 visits), at the treeline | A shy Bigfoot peeks out; tap fast enough and he waves before vanishing. Footprints stay behind for the visit. |
| S3 | **Treehouse** | A rope ladder hidden behind the Quartermaster Cabin | Tap the ladder and the camera lifts to a tiny treehouse lookout with a spyglass that zooms in on a funny detail somewhere in camp. |
| S4 | **Night constellation** | Night only; tap stars above camp | Connect stars to draw a constellation (e.g., Big Dipper); a finished one animates and sparkles. |

**Discovery tracking:** Anonymous only (`egg_found` analytics). No "collect them all" tracker in Phase 1.

### 8.5 Parked ideas (not in scope now; revisit later)

- Collectible hidden patches with a "patch vest" tracker (natural fit for the camp in Phase 2).
- Calendar surprises (full moons, Friday the 13th, Scout Sunday).
- Seasonal camp skins and holiday events.

## 9. Advertising

- **Ad server:** Google Ad Manager (as now).
- **Labels:** Every unit has a visible "Advertisement" label above it, in a consistent style that's clearly separate from widget styles.
- **Child-directed / COPPA:** All ad requests flagged as child-directed (`tagForChildDirectedTreatment`), with no personalized/behavioral targeting. No Easter eggs, critters or mascots near ads.
- **No ads inside the 3D camp.** No in-world billboards, sponsored buildings or ads in building panels in Phase 1. Any future sponsorship in the camp needs a separate review and clear "Sponsored" labeling.
- **Leaderboard viewability:** The camp sits below the leaderboard and must not push it off-screen or cover it.
- **House-ad fallback:** Unfilled slots show Scout Life house promos (Subscribe, Contests, Send Us Your Jokes, Join Scouting).
- **Layout stability:** Reserve each slot's size up front so the page doesn't jump when ads load.
- **Lazy loading:** Units below the first screen lazy-load (standard GAM lazy load).

### 9.1 Placements and sizes

| Slot | Desktop | Tablet | Mobile |
|---|---|---|---|
| Leaderboard (top) | 728×90 | 728×90 | 320×50 (or 320×100) |
| In-zone 1 (Widget Zone 1) | 300×250 in the zone grid | 300×250 | 300×250, between widgets |
| Tall (Widget Zone 2) | 300×600 next to widgets | 300×250 (swap) | 300×250, between widgets |
| In-zone 3 (Section shelves) | 300×250 | 300×250 | 300×250, between widgets |

- On mobile, never place two ad units back to back, and keep at least one widget between ads.
- Final ad count and order to be confirmed with ad ops (§15).

---

## 10. Subscription promo and Video of the Week

### 10.1 Subscription promo (feature band)

- **Content:** The current magazine cover (large, slightly tilted, lifts on hover), headline ("Get Scout Life delivered to your house!"), a short benefit line, a big **Subscribe** button, and secondary links to **This Month's Issue** and **Subscriber Services**.
- **Motion:** The cover gently "breathes"; on hover a corner peels up to tease an inside page.
- **Tracking:** UTM tags per placement (`utm_campaign=header`, `=promo-band`, `=footer`) so we can compare Subscribe CTAs.
- **Subscribe CTAs in total:** Header (always visible), feature band, footer.

### 10.2 Video of the Week

- **Display:** Custom poster image (hosted on scoutlife.org) + big play button + title + 1-line description.
- **Playback:** Click to play. The YouTube player (`youtube-nocookie.com`, privacy-enhanced mode) loads **only** after the click.
- **Fallback:** If YouTube is blocked (common on school networks) or JS is off, the poster links to the video on YouTube and shows a "Watch on YouTube" label.
- **Links:** "More videos on our YouTube channel →".
- **Editor controls:** Video URL, poster image, title, description.

---

## 11. Accessibility, performance and resilience

### 11.1 Accessibility: WCAG 2.2 AA

- Color contrast: 4.5:1 for body text, 3:1 for large text and UI parts. Big slab headlines on bright colors must be checked.
- Full keyboard support; visible focus states (styled to match the Trail Map design, never removed).
- Semantic headings, landmarks and labeled controls; widgets announce result changes to screen readers (`aria-live`).
- Minimum target size 24×24 px (WCAG 2.2), with 44–48 px as our standard.
- No content conveyed only by color or motion.
- Reduced motion and the pause toggle (§3.5).
- **3D camp:** Everything in the camp is reachable through the Camp Map and DOM buttons (§6.9); focus is trapped inside an open panel and returned to the building button on close; panel changes are announced via `aria-live`; no information is conveyed only by 3D position or animation; minigames have a keyboard/button alternative to every drag or hold gesture.
- **Motion sickness:** No auto camera motion, limited rotation, short eased transitions, no camera shake (§3.5).

### 11.2 Performance: Core Web Vitals budget

| Metric | Target (75th percentile, mobile) |
|---|---|
| Largest Contentful Paint | ≤ 2.5 s |
| Interaction to Next Paint | ≤ 200 ms |
| Cumulative Layout Shift | ≤ 0.1 |
| Initial JS (excluding ads) | ≤ 100 KB gzipped |
| Camp static map (LCP image) | Responsive `srcset`, AVIF/WebP, ≤ 150 KB on mobile |

- Test target: a mid-range Android phone and a low-end school Chromebook on a throttled 4G connection.
- Widget and Easter egg code loads only when needed (lazy/idle).
- Prefer CSS animations; use JS/Lottie only where needed; no heavy animation libraries on the critical path.

### 11.2.1 3D camp budget (on top of the page budget above)

| Item | Target |
|---|---|
| Load timing | 3D code and assets start loading **only after the page is interactive** (after `load` + idle); never block LCP, INP or the rest of the page |
| Total 3D download (code + models + textures, excluding audio) | **≤ 3 MB compressed** for Full tier; ≤ 1.5 MB for Lite tier |
| Three.js + camp code | ≤ 250 KB gzipped (tree-shaken modules) |
| Frame rate | **≥ 30 fps** on a low-end school Chromebook (Lite tier); ≥ 60 fps target on desktop (Full tier) |
| Draw calls | ≤ 150 (Full), ≤ 75 (Lite); instanced meshes for blocks, trees and props |
| GPU memory | ≤ 150 MB (Full), ≤ 80 MB (Lite) |
| Off-screen behavior | Render loop stops when the camp is scrolled out of view or the tab is hidden; resumes on return |
| Battery | Frame rate capped at 30 fps on Lite tier; render-on-demand when nothing is moving |

- Models are compressed GLB (Meshopt or Draco) with KTX2/Basis textures and a shared texture atlas.
- Buildings, critters and minigames load progressively: the camp shell first, then ambient life, then minigame assets on first use.

### 11.3 Works without JavaScript

- All content and navigation are reachable with JS off.
- The camp shows the static map with hotspots linking straight to section fronts, plus the Camp Map list.
- Each widget shows a static fallback (links/lists).
- Search and Requirements Finder work as normal form submits.

### 11.4 School-filter friendly

- Self-host fonts, icons and poster images.
- Load YouTube only on click, with a link fallback.
- Avoid third-party embeds (social feeds, etc.) on the homepage.
- Make sure the page still works if ad and analytics domains are blocked.
- Self-host Three.js, models, textures, decoders (Draco/Basis WASM) and audio on scoutlife.org; no third-party CDN for 3D assets. If WebGL is disabled by school device policy, the static map appears with no error message.

---

## 12. Footer

- **Section links:** Games, Jokes, Outdoors & Gear, Hobbies & Projects, Scouts, Contests & Giveaways.
- **Magazine:** Current cover + Subscribe; Subscriber Services; This Month's Issue.
- **Contact:** Online (scoutlife.org/contact-us), phone (866) 584-6589, mail: 1325 W. Walnut Hill Lane, P.O. Box 152401, Irving, TX 75015-2401.
- **Social:** **YouTube only** (channel link with subscribe prompt). No other social icons or promotions anywhere on the homepage.
- **Join Scouting promo:** Scouting America logo + "Find out how you can get involved" → beascout.org (with UTM).
- **Business/legal:** Advertise (media kit), Give, Privacy Policy, © Boy Scouts of America.
- **Fun:** Campfire + s'mores and fireflies/constellation Easter eggs (§8); the "Pause animations" toggle.

---

## 13. Analytics

Uses the existing Google Tag Manager / GA4 setup, configured for a child-directed audience: Google signals and ad personalization off, and IP truncation on.

| Event | Fired when | Key parameters |
|---|---|---|
| `hero_click` | A "Today at Camp" promo is clicked | slot (big, sec1–sec4), article ID |
| `camp_ready` | The camp finishes loading | tier (full, lite, static), load time |
| `camp_interact` | First interaction with the camp per visit (rotate, zoom, tap) | action |
| `building_open` | A building panel opens | building ID, source (tap, marker, promo hover, camp map, deep link) |
| `panel_click` | A link in a building panel is clicked | building ID, item type (pinned, latest, section link), article ID |
| `minigame_play` | A minigame starts / finishes | game ID, completed (y/n), score bucket |
| `camp_setting` | Sound, pause, "simple map" or reset view is toggled | setting, value |
| `camp_tier_change` | The camp steps down a quality tier at runtime | from, to |
| `nav_click` | A nav or mega-menu link is clicked | menu, item, featured (y/n) |
| `widget_view` | A widget is 50% in view for 1 s | widget ID, slot, size, placement (zone, panel) |
| `widget_interact` | First and subsequent plays (spin, vote, flip, carve, rate) | widget ID, action, placement |
| `widget_clickthrough` | A link out of a widget is clicked | widget ID, destination, placement |
| `egg_found` | An Easter egg is triggered | egg ID, location (page, camp) |
| `subscribe_click` | Any Subscribe CTA is clicked | placement |
| `video_play` | Video of the Week is played | video ID |
| `search_submit` | A search is submitted | (query not tied to any identifier) |

A simple dashboard showing widget engagement and click-through per widget/slot will support swap decisions.

---

## 14. CMS and editorial operations

Platform-agnostic. If staying on WordPress, these map to a custom theme with a Homepage settings screen (or blocks/ACF).

| Area | Editors can… |
|---|---|
| "Today at Camp" strip | Pick 5 items, set crop focus and flag, schedule start/end, keep a backup list |
| 3D camp | Map buildings to categories, pin 0–2 items per building, choose panel widgets, edit sign/intro text, toggle ambient life, weather and 3D eggs, force clear weather, turn the 3D camp off (static map) — see §6.10 |
| Widget zones | Turn widgets on/off, assign to slots, reorder, choose S/W size, set dates |
| Widget content | Edit titles, intro lines, link lists, item pools (Arcade games, Boredom Buster projects, Gear cards, Seasonal picks, Poll question, Quiz question) |
| Video of the Week | Set URL, poster, title, description |
| Subscription promo | Swap cover image, headline, button text |
| Mega menus | Choose featured articles per section |
| Search | Edit popular search chips |
| Easter eggs | Master switch + per-egg toggles |
| Ads | Slot on/off and house-ad creative (in coordination with ad ops) |

**Content feed for the camp:** Building panels read from a lightweight, cached JSON endpoint (e.g., a custom WordPress REST route) that returns pinned + latest items per building. It's rendered server-side into the page HTML as well, so panels work and are crawlable before the 3D loads.

### 14.1 3D technical approach

| Area | Requirement |
|---|---|
| **Engine** | **Vanilla Three.js** (ES modules, tree-shaken, version pinned). No React/R3F, so the camp drops into a WordPress theme as a self-contained module. |
| **Mounting** | The camp is a progressive enhancement: server-rendered HTML (static map image + hotspots + Camp Map + panel content) is the base; the 3D script enhances it in place. |
| **Assets** | Buildings, props and critters modeled in **MagicaVoxel or Blockbench**, exported to **glTF/GLB**, optimized (merged meshes, shared atlas, Meshopt/Draco, KTX2). |
| **World layout** | Camp layout (building positions, scenery, critter paths, egg locations) defined in a JSON file so designers can adjust without code changes and Phase 2/3 can extend it. |
| **Interaction** | Raycasting for taps/clicks; DOM buttons mirror every interactive object for keyboard and screen readers. |
| **Animation** | Simple keyframe/vertex animations baked into GLB or done with lightweight tweening; no physics engine in Phase 1 (minigames use simple custom math). |
| **Audio** | Web Audio API (or Howler.js if needed), loaded only after sound is turned on. |
| **Static map generation** | Static map images (per time of day, per breakpoint) are rendered from the same 3D scene at build time, so they always match the live camp. |
| **Reuse for Phase 3** | Assets, layout JSON and interaction code are structured so a future full-screen "Enter Camp" mode can reuse them. |
| **Browser support** | Latest two versions of Chrome, Edge, Safari (macOS/iOS), Firefox, and ChromeOS. WebGL2 preferred; WebGL1 gets Lite tier or static map. |

---

## 15. Dependencies and open questions

| # | Item | Owner | Needed by |
|---|---|---|---|
| 1 | **Vector logo for production:** PNGs (10 colors, 2193×464) are fine for mockups. Production should use an SVG exported from `ScoutLifeLogo_lgTagRed.ai` for crisp scaling and animation. | Design | Build |
| 2 | **Maileagle web art:** Source files are PSD/TIF (CMYK) plus one PNG head. For mockups I'll use the PNG head and flattened PSD exports. Production needs web-ready transparent PNG/SVG poses (flying pose for the flyby egg) and the usage rules from the reference sheet. | Design | Build |
| 3 | Easter egg review and approval process (animations, mini-games). | Editorial | Build |
| 4 | **Requirements taxonomy:** export of current terms and a plan/owner to finish tagging. | Editorial | Build |
| 5 | **Joke feed/API** from jokes.scoutlife.org (Joke of the Day, by topic, ratings). | Dev | Build |
| 6 | Poll system: keep the current polls plugin or replace? | Dev | Build |
| 7 | Ad ops: GAM ad unit names, final slot count, refresh policy, house-ad creative. | Ad ops | Build |
| 8 | Platform decision (custom WordPress theme vs. headless). | Bryan / dev | Build |
| 9 | Launch timing (e.g., before a seasonal moment such as Pinewood Derby season or summer). | Bryan | Planning |
| 10 | **Voxel art production:** voxel artist (in-house or contract) for 4 buildings, scenery, ~8 critters, minigame props; art style guide. | Design | Build |
| 11 | **Trademark/likeness review** of the voxel art and camp to confirm it doesn't read as Minecraft (or any other game). | Legal / Brand | Before launch |
| 12 | **Camp content feed:** custom REST endpoint returning pinned + latest items per building; category mapping for the four buildings. | Dev / Editorial | Build |
| 13 | **Device test lab:** at least one low-end school Chromebook, a mid-range Android phone, an older iPad and an iPhone for frame-rate and tier testing. | Dev | Build |
| 14 | **Baseline metrics:** capture ≥ 4 weeks of current-homepage data (pages/visit, click-through, return visits, Subscribe clicks) before launch, since there's no A/B test. | Analytics | Before launch |
| 15 | **Sound design:** source or license ambient and interaction sounds (royalty-free / owned). | Design | Build |

---

## 16. Prototype plan and roadmap

### 16.1 Next deliverable: one interactive 3D prototype (after approval)

A single interactive HTML prototype saved in the project folder:

```
sl-prototype/
  index.html        (camp hero + Trail Map homepage)
  assets/           (voxel models, textures, static map images)
```

It replaces the v1.1 plan for three 2D mockups.

### 16.2 What the prototype includes

- **3D Camp hero** in the original voxel style: isometric diorama, drag-rotate, zoom, tap-to-open, Reset view, Camp Map, sound and pause toggles.
- **Four buildings** (Campfire Ring, Game Tent, Craft Hut, Quartermaster Cabin) with working 2D panels: pinned items, latest real Scout Life articles, and the matching widget (Joke, Arcade, Idea Machine, Gear Guide) at mini-play level.
- **Living world:** day/night from the device clock (plus a hidden preview switch to show all four times), ambient life, and at least one weather state (light rain + rainbow).
- **3D eggs:** at least 2 critters (Raccoon raid, Leaping fish), 1 minigame (S'mores toaster or Archery), 1 secret spot (Hidden cave or Bigfoot).
- **Quality tiers:** Lite 3D on phones and the static-map fallback (forced via a preview switch for review).
- **"Today at Camp" strip** with building markers linked to promos.
- **Trail Map homepage below:** header with leaderboard placeholder, mega menus, search, Subscribe; Widget Zone 1 with the same widgets in zone placement; feature band; a shortened Zone 2/3; footer with s'mores egg. Labeled ad placeholders.
- Real content and links wherever possible (§16.3); placeholder voxel art is acceptable where final models don't exist yet.

### 16.3 Content in the prototype

Use real current article titles, real images and real links to live scoutlife.org pages and subdomains. Real logo PNGs from `scout life logo/` and Maileagle art from `maileagle illustrations/` where used. Ads are gray labeled boxes.

### 16.4 Review process

1. Review the prototype on desktop, a school Chromebook and a phone.
2. Optional quick playtest with a handful of kids in the 8–13 range (watch, don't explain).
3. Revise camp layout, panel design and egg set.
4. Hand off build specs, art style guide and asset list to developers and the voxel artist.

### 16.5 Phased roadmap

| Phase | Scope |
|---|---|
| **Phase 1 — Camp hero (this document)** | 3D camp hero with 4 buildings and panels, "Today at Camp" strip, day/night, ambient life, weather, Phase 1 eggs and minigames, quality tiers and static fallback, full Trail Map homepage below. Full launch to all visitors. |
| **Phase 2 — Bigger camp** | More buildings: Flagpole/Bulletin Board (Scouts, Eagle Projects, Requirements Finder), Trading Post (Subscribe, magazine, contests), Waterfront (Fishing), Dining Hall (recipes), Story Tent (Fiction, Heads Up). Seasonal camp skins (fall, winter, spring, summer) that work with the Seasonal widget. Collectible patches / patch vest. More minigames (fishing, canoe race). |
| **Phase 3 — "Enter Camp" mode** | Full-screen explorable camp: walkable paths, optional simple Scout avatar, building interiors, reusing Phase 1–2 assets. The classic homepage stays the default. |

---

## 17. Decision log

| Topic | Decision |
|---|---|
| Primary audience | Ages 8–13 |
| Brand freedom | Logo stays recognizable but can be playful/animated |
| Visual direction | ~~Explore 3~~ → **Trail Map** for the 2D page (v2.0) |
| Platform | Undecided; requirements platform-agnostic |
| Easter egg types | Secret codes, hidden critters, logo reactions, search secrets, footer surprises; ad-free zones rule |
| Easter egg style | Mini interactions, animations and games; not links to hidden content or bonus jokes |
| Motion | Lively but respectful (reduced-motion + pause toggle) |
| Mascots | Minimal; Scout the Maileagle sparingly |
| Hero curation | Fully hand-picked (now the "Today at Camp" strip) |
| Other homepage blocks | Folded into the widget system |
| Widget operations | Editor toggles in CMS; fixed slots |
| Requirements Finder | Uses existing Requirements taxonomy (partially populated) |
| Widget depth | Mini-play, then link |
| Boredom Buster | Slot-machine mechanic, styled as a playful "Idea Machine" contraption; no casino cues |
| Ads | Google Ad Manager; COPPA/kid-safe; mobile size swaps; house-ad fallback |
| Joke widget | Show full Joke of the Day (matches jokes site format); topic buttons; rate it |
| Gear widget | Carousel |
| Navigation | Mega menus |
| Standards | WCAG 2.2 AA; Core Web Vitals budget; works without JS; school-filter friendly |
| Seasonal widget | Reusable template; Halloween with Pumpkin Carver, Trick-or-Treat Door, Countdown + picks |
| Arcade widget | Arcade cabinet |
| Video of the Week | Poster image, click-to-play (privacy-enhanced YouTube) |
| Mockups | ~~Interactive HTML, 3 directions~~ → one interactive 3D prototype (v2.0) |
| Fonts | Free/open licenses only |
| Success metrics | Pages per visit, widget engagement, subscriptions |
| Document format | Word + Markdown |
| Top menu | Contests removed (kept in footer and as a widget) |
| Social | YouTube only |
| Brand assets | Logo PNGs (10 colors) and Maileagle art provided in project folder |
| Mockup content | Real images and links whenever possible |
| **v2.0 — 3D concept** | Hybrid: 3D camp layered on top of the v1.1 page |
| Hybrid model | Hero diorama now; full-screen "Enter Camp" mode in a later phase |
| Camera | Isometric diorama; no player avatar |
| Building tap | Zoom + 2D panel over the scene |
| Hero promos | "Today at Camp" strip below the camp **and** glowing markers on matching buildings |
| Art style | Original voxel style (not Minecraft) |
| Phase 1 buildings | Campfire Ring, Game Tent, Craft Hut, Quartermaster Cabin |
| Missing sections in camp | Scouts, Subscribe, Fishing, etc. stay on the 2D page in Phase 1 |
| Widgets in camp | Joke, Arcade, Idea Machine, Gear Guide appear in building panels **and** widget zones |
| Living world | Day/night by local time, ambient life, weather (no seasonal skins in Phase 1) |
| 3D eggs | Critter interactions, quick minigames, secret spots (no collectible patches yet) |
| Tech stack | Vanilla Three.js; MagicaVoxel/Blockbench → glTF |
| Hero height | ~70% of viewport on desktop |
| Mobile / low power | Lite 3D tier + static illustrated map fallback |
| Sound | Off by default, toggle |
| Panel content | Auto from CMS categories + 0–2 editor pins |
| 3D budget | ≤ 3 MB, loads after page is interactive, ≥ 30 fps on school Chromebook |
| Next deliverable | Single 3D prototype |
| Rollout | Full launch (compare to pre-launch baseline) |
