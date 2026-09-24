# Editable landing page admin center

## Goal
Rework `/admin` into the content editor for the current public landing page while preserving the existing password login, current data, Press Kit and Game Page editors, Messages behavior, Skin Creator admin, contact form behavior, legal pages, announcement banner, and backend security.

## Data and migration
- Extend `site_projects` with visibility, trailer URL, info-bar color, and slider key-art support while retaining `cover_url`, `button_label`, `button_url`, `sort_order`, Press Kit, and Game Page fields. Backfill key art from `cover_url` and keep existing button values.
- Add a public-read `site_game_platforms` table for repeatable platform tiles with name, uploaded logo URL, store URL, and `sort_order`.
- Add singleton landing settings for slider autoplay and interval, header banner/sticky logos and text, Discord label/URL, mission copy/sign-off/visibility, About heading, Contact heading/direct-contact copy and email, plus footer logo/copyright.
- Extend header links and social networks with visibility fields. Keep existing URLs and rows, default existing entries to visible.
- Extend team entries with gamer tag and real name. Backfill existing names by splitting on the first ` - ` separator while preserving the original `name` column.
- Migrate the enabled Featured Game project to `sort_order = 0` so it becomes the first game slide. Keep the old featured table and data intact for compatibility.
- Add all required grants and public-read policies for new public tables. Update the checked-in schema and deployment instructions without touching Skin Creator schema or views.

## Shared public components and previews
- Extract the current landing sections into reusable display components for Games, Header, Mission, About, Contact framing, Socials, Footer, Legal, Banner, and status colors.
- Use those same components in the admin preview pane so previews match the public site rather than duplicating their markup.
- Update public loading to read the new fields, sort and filter visible records, hide empty optional elements, support trailer lightbox, platform tiles, custom info-bar colors, and slider autoplay with reduced-motion support.
- Keep the contact form fields, inquiry options, validation, submit operation, and Messages data unchanged.
- Keep uploaded images only. Empty image fields render no image rather than generated artwork or broken placeholders.

## Admin structure and editing
- Replace the existing tab set with: Games, Header, Mission, About, Contact, Socials, Footer, Status colors, Legal, Banner, Messages.
- Keep the top tab navigation and restyle the admin with flat black/dark-grey surfaces, orange accents, uppercase letter-spaced labels, and orange focus borders. Add a desktop/tablet editor-and-preview layout.
- Give every content tab one primary Save action with clear success/error feedback. Track dirty state, warn on tab changes, browser navigation, refresh, or close, and clear the warning after successful save.
- Create a reusable image uploader supporting drag-and-drop or click, format/size validation, recommended dimensions, thumbnail preview, replace, and remove. Continue using the existing storage upload path.

## Games tab
- Merge Projects and Featured into Games. Show compact draggable game rows with thumbnail, title, status, and visibility toggle; update `sort_order` after drag-and-drop.
- Add confirmed game deletion and add-game flow.
- Edit title, status, 16:9 key art, optional YouTube trailer, 350-character description, preset/custom info-bar color, reorderable platform tiles, main button, Press Kit toggle/editor, and Game Page toggle/editor.
- Put autoplay and interval controls at the top and show the real game hero as the live preview.

## Header, Mission, About, Contact, Socials, Footer
- Header: edit both uploaded logos, banner text, reorderable visible navigation, and Discord label/URL, defaulting the URL from Socials when absent.
- Mission: edit reorderable headline blocks and their two styles, mission text, sign-off, and section visibility.
- About: edit heading and existing HTML intro, plus reorderable team members with gamer tag, real name, role, and bio.
- Contact: edit heading and direct-contact line/email while preserving the form exactly.
- Socials: keep X, TikTok, Instagram, Discord, and YouTube URLs, each with an independent visibility toggle.
- Footer: edit uploaded logo and copyright while retaining the existing Imprint and Privacy Policy links.

## Existing tabs
- Preserve Status colors, Legal, Banner, and Messages behavior, applying only the new admin visual system and shared live preview treatment where applicable.
- Preserve the nested Press Kit and Game Page editors and their existing data and save paths.

## Validation
- Verify schema compatibility and admin-write allowlists, including image uploads and delete operations.
- Test password login, all final tabs, dirty-state warnings, saves, drag reordering, image previews/removal, game deletion confirmation, and nested Press Kit/Game Page editors.
- Test the public landing page on desktop and mobile for slider controls/autoplay, visible filtering, optional hidden content, trailer lightbox, platform links, header behavior, mission/about/contact/footer rendering, and unchanged contact submission behavior.
- Confirm `/skincreator`, `/skincreator/my-skins`, `/skincreator/admin`, legal pages, press pages, and game pages remain intact.
