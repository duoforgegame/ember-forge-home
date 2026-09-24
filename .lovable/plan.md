# Stable game slider info bar

## Changes
- Give the game info bar a consistent desktop height and a separate consistent mobile height sized for the longest expected content.
- Add measured title fitting that starts at the current size, scales down to 60%, and uses ellipsis only if it still cannot fit on one line.
- Limit descriptions to three lines with responsive text sizing and hidden overflow.
- Move Press Kit and More Info into a shared right-side action row before the main game button.
- On mobile, place the full-width main button first, followed by More Info and Press Kit.
- Preserve all existing colors, fonts, game data, links, and conditional visibility.

## Technical details
- Use a small reusable title-fit hook based on element width and `ResizeObserver` so slide changes and viewport resizing remain stable.
- Keep desktop actions aligned in one row with matching heights and secondary styling for Press Kit and More Info.
- Verify slide switching and button ordering at desktop and mobile widths.
