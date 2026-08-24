import { useEffect, useState, useMemo, useRef } from "react";

const TILE = 48; // px, square tile
const GAP = 4;
const STEP = TILE + GAP;

/**
 * Fixed full-viewport grid of dark tiles that sits behind all content.
 * Hover is tracked in JS (pointer-events stay off so content stays clickable).
 */
export function TileBackground() {
  const [size, setSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  const gridRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setSize({ w: window.innerWidth, h: window.innerHeight });
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const { cols, rows } = useMemo(() => {
    const c = Math.ceil((size.w + GAP) / STEP) + 1;
    const r = Math.ceil((size.h + GAP) / STEP) + 1;
    return { cols: c, rows: r };
  }, [size]);

  const count = cols * rows;

  useEffect(() => {
    let raf = 0;
    let lastIndex = -1;

    const setActive = (index: number) => {
      if (index === lastIndex) return;
      lastIndex = index;
      if (activeRef.current) activeRef.current.classList.remove("is-hot");
      const grid = gridRef.current;
      const next = index >= 0 && grid ? (grid.children[index] as HTMLElement | undefined) : undefined;
      if (next) {
        next.classList.add("is-hot");
        activeRef.current = next;
      } else {
        activeRef.current = null;
      }
    };

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      const x = e.clientX;
      const y = e.clientY;
      raf = requestAnimationFrame(() => {
        const col = Math.floor(x / STEP);
        const row = Math.floor(y / STEP);
        // Inside the gap between tiles: no active tile
        const inTileX = x - col * STEP <= TILE;
        const inTileY = y - row * STEP <= TILE;
        if (!inTileX || !inTileY || col < 0 || row < 0 || col >= cols || row >= rows) {
          setActive(-1);
          return;
        }
        setActive(row * cols + col);
      });
    };

    const onLeave = () => setActive(-1);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      setActive(-1);
    };
  }, [cols, rows, count]);

  return (
    <div
      aria-hidden
      ref={gridRef}
      className="tile-bg fixed inset-0 z-0 overflow-hidden"
      style={{
        display: "grid",
        gap: `${GAP}px`,
        gridTemplateColumns: `repeat(${cols}, ${TILE}px)`,
        gridTemplateRows: `repeat(${rows}, ${TILE}px)`,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="tile-bg-cell" />
      ))}
    </div>
  );
}
