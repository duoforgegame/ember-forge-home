# Game Info Pages and Block Editor Redesign

## Goal
Rework `/games/:slug` and its editor to use the same flat black, grey, and orange visual system as the landing page while preserving every existing block, upload, route, and saved JSON value.

## Public game page
- Render the existing shared header in compact mode from the first frame so the uploaded small logo is always visible, followed by the existing shared footer.
- Wrap the page in the same centered 1380px landing shell and reuse its typography, colors, buttons, labels, and responsive breakpoints.
- Replace the old return link with `← ALL GAMES`, linking to `/#home` where the game slider lives.
- Load all visible games in `sort_order`, identify the next visible game cyclically, and render its key art and title as a bottom banner linking to its enabled info page. Hide this area when no other eligible game exists.
- Group adjacent visible blocks by their normalized background choice so matching backgrounds form one uninterrupted section.
- Preserve old `background_color` values by mapping black, dark grey, and orange values into the new preset system. Unknown legacy colors fall back safely without deleting their stored value.

## Reusable public block renderer
Extract the block page and renderer into reusable exports so the same real page can power the public route and admin preview.

- **Hero:** Full-width uploaded image, bottom-third dark gradient only, bottom-left title/subtitle, optional orange CTA, optional YouTube play button using the landing page lightbox behavior.
- **Steam Widget:** Existing Steam iframe, editable uppercase label with `GET IT ON STEAM` fallback, generous section spacing.
- **Store Bar:** New JSON block type using the landing page game info bar. It supports description, status, uploaded platform logos and links, main button, and bar color. A `use_game_data` flag reads live values from the Games tab while optional saved overrides remain available.
- **Text:** Headline, existing body content, optional uploaded side image, and Normal or Stacked Blocks headline mode. Stacked lines are stored as optional JSON while old headings remain valid.
- **Image Gallery:** Accept legacy string URLs and new `{ url, caption }` entries, render a 3/2/1-column grid, and add a caption-aware lightbox with arrows, Escape/arrow keys, and touch swipe.
- **Free Image:** Map existing size values into Contained or Full width without discarding old data, with optional uppercase caption.
- **Feature List:** Keep existing items and uploaded `icon_url`; when no image exists, show automatic orange numbers instead of generated icons.
- **Video / Trailer:** Keep existing YouTube/Vimeo URLs, add optional uploaded poster image, and defer iframe loading until the play button is clicked.
- **Quote / Testimonial:** Keep quote and attribution, add optional source and source URL, and render the requested bold italic treatment.
- Hide empty optional elements and invalid media safely.

## Full-page admin editor
- Replace the current centered modal with a full-viewport editor opened from the Games tab.
- Keep the main admin tab state and password session intact, returning to Games when the editor closes.
- Use a two-column desktop/tablet layout: sortable block list and inline editors on the left, sticky live preview of the real public game page on the right. Stack these areas at narrower widths.
- Update the preview immediately from unsaved block state and current game/platform data, without sending forms or opening destructive navigation.
- Add drag-and-drop sorting with the existing dnd-kit setup, while preserving up/down controls.
- Expand a clicked block inline. Add visibility, duplicate, move, and confirmed delete actions.
- Add the Store Bar to the block picker and extend each block editor with the requested optional fields, image uploads, captions, poster images, platform rows, and background preset.
- Use Black, Dark grey, and Orange controls on every block. Save the choice inside the existing `content` JSON, keeping `background_color` synchronized for backward compatibility.
- Track all edits, additions, duplication, deletion, visibility, and ordering as unsaved changes. Confirm before closing and on browser unload.
- Keep one Save action with clear success/error feedback and retain the external Preview page link.

## Data compatibility
- Keep `site_game_page_blocks` and its existing columns unchanged. New fields live inside the current JSONB `content` object, so no schema migration or function allowlist change is required.
- Never rewrite or remove unknown JSON properties when editing a block.
- Normalize only at render time, allowing existing Coinsweeper Hero, Steam Widget, and Image Gallery data to display immediately in the new design.
- Continue using the existing admin upload path and uploaded assets only. No generated graphics or placeholder artwork will be added.

## Validation
- Run the existing project checks after implementation.
- Verify `/games/coinsweeper` or another enabled game page at desktop and mobile widths, including compact header, old block compatibility, trailer/video lazy loading, gallery lightbox controls, merged backgrounds, and next-game navigation.
- Verify the authenticated admin flow: open editor, live-edit every existing block type, add and duplicate Store Bar, reorder by drag and arrows, cancel a confirmed delete, trigger the unsaved-close warning, save, reload, and confirm persisted rendering.
- Confirm reduced-motion behavior, empty-field handling, existing landing routes, and the main Games tab remain intact.
