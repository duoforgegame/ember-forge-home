import { useEffect, useState, type CSSProperties } from "react";
import anvilIcon from "@/assets/dfg-anvil-icon.png";
import "./loading-screen.css";

const BLOCKS = 12;
const DURATION = 1350; // ms until the bar is full

/**
 * Boot screen in the style of the site: the anvil drops in and takes three hammer strikes while a
 * pixel bar fills up, then an orange curtain wipes up to reveal the page.
 */
export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 300 : DURATION;
    let raf = 0;
    let t1 = 0;
    let t2 = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(Math.round((1 - Math.pow(1 - t, 1.8)) * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else
        t1 = window.setTimeout(() => {
          setLeaving(true);
          t2 = window.setTimeout(() => onDone?.(), reduced ? 150 : 650);
        }, 160);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onDone]);

  const lit = Math.round((progress / 100) * BLOCKS);

  return (
    <div
      role="status"
      aria-label="Loading Duo Forge Games"
      className={`ls-root ${leaving ? "is-leaving" : ""}`}
      style={{ "--ls-duration": `${DURATION}ms` } as CSSProperties}
    >
      <div className="ls-stage">
        <div className="ls-anvil-wrap">
          <img src={anvilIcon} alt="" className="ls-anvil" draggable={false} />
          <span className="ls-floor" aria-hidden="true" />
        </div>

        <div className="ls-bar" aria-hidden="true">
          {Array.from({ length: BLOCKS }, (_, i) => (
            <i key={i} className={i < lit ? "is-lit" : ""} />
          ))}
        </div>
        <div className="ls-label">
          <span>Forging</span>
          <span className="ls-pct">{progress}%</span>
        </div>
      </div>
      <span className="ls-curtain" aria-hidden="true" />
    </div>
  );
}
