import { useEffect, useState } from "react";
import anvilIcon from "@/assets/dfg-anvil-icon.png";

/**
 * Full-screen loader shown on initial app boot.
 * - Matches the dark / orange forge theme.
 * - Anvil icon with floating ember particles + pulse glow.
 * - Determinate-looking loading bar that fills to 100% then fades out.
 */
export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 1100; // fast

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 2.2);
      setProgress(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // small hold, then fade
        setTimeout(() => {
          setHidden(true);
          setTimeout(() => onDone?.(), 450);
        }, 180);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  // 14 ember particles with pre-computed random offsets
  const particles = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const radius = 60 + (i % 3) * 18;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const delay = (i * 0.13) % 1.8;
    const dur = 1.8 + (i % 5) * 0.25;
    const size = 4 + (i % 3) * 2;
    return { x, y, delay, dur, size, i };
  });

  return (
    <div
      aria-hidden={hidden}
      role="status"
      aria-label="Loading Duo Forge Games"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* radial forge glow backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.68 0.17 45 / 0.18), transparent 55%)",
        }}
      />

      <div className="relative flex h-56 w-56 items-center justify-center">
        {/* pulsing halo */}
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-ls-pulse" />

        {/* particles */}
        {particles.map((p) => (
          <span
            key={p.i}
            className="absolute left-1/2 top-1/2 rounded-full bg-primary shadow-[0_0_10px_oklch(0.68_0.17_45)]"
            style={{
              width: p.size,
              height: p.size,
              transform: `translate(-50%, -50%)`,
              animation: `ls-ember ${p.dur}s ease-in-out ${p.delay}s infinite`,
              // pass endpoint as CSS vars
              ["--tx" as string]: `${p.x}px`,
              ["--ty" as string]: `${p.y}px`,
            }}
          />
        ))}

        {/* icon */}
        <img
          src={anvilIcon}
          alt=""
          className="relative z-10 h-32 w-32 select-none drop-shadow-[0_0_25px_oklch(0.68_0.17_45_/_0.6)] animate-ls-float"
          draggable={false}
        />
      </div>

      {/* Loading bar */}
      <div className="mt-10 w-64 max-w-[70vw]">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40 ring-1 ring-primary/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 shadow-[0_0_12px_oklch(0.68_0.17_45_/_0.8)] transition-[width] duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <span>Forging</span>
          <span className="tabular-nums text-primary/80">{progress}%</span>
        </div>
      </div>

      <style>{`
        @keyframes ls-float {
          0%,100% { transform: translateY(0) rotate(-1deg); }
          50%     { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes ls-pulse {
          0%,100% { opacity: .35; transform: scale(1); }
          50%     { opacity: .75; transform: scale(1.15); }
        }
        @keyframes ls-ember {
          0%   { transform: translate(-50%, -50%) scale(.6); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
        .animate-ls-float { animation: ls-float 2.4s ease-in-out infinite; }
        .animate-ls-pulse { animation: ls-pulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
