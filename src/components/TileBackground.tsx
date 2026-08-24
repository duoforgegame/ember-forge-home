import { useEffect, useState, useMemo } from "react";

const TILE = 48; // px, square tile

/**
 * Fixed full-viewport grid of dark tiles that sits behind all content.
 * Each tile softly glows orange on hover. Landing page only.
 */
export function TileBackground() {
  const [size, setSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

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
    const c = Math.ceil(size.w / TILE) + 1;
    const r = Math.ceil(size.h / TILE) + 1;
    return { cols: c, rows: r };
  }, [size]);

  const count = cols * rows;

  return (
    <div
      aria-hidden
      className="tile-bg fixed inset-0 z-0 overflow-hidden"
      style={{
        display: "grid",
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
