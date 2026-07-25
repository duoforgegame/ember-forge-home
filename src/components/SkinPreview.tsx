import { useEffect, useRef } from "react";
import { pixelsToCanvas, type PixelDatum, type Weapon } from "@/lib/skincreator";

/**
 * Renders the finished skin exactly like the editor does: the weapon template
 * underneath, the painted pixels on top, at the weapon's canvas dimensions.
 */
export function SkinPreview({
  weapon,
  pixels,
  scale = 6,
  showTemplate = true,
}: {
  weapon: Pick<Weapon, "template_image_url" | "canvas_width" | "canvas_height" | "name">;
  pixels: PixelDatum[];
  scale?: number;
  showTemplate?: boolean;
}) {
  const W = Math.max(1, weapon.canvas_width || 64);
  const H = Math.max(1, weapon.canvas_height || 32);
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(pixelsToCanvas(pixels, W, H), 0, 0);
  }, [pixels, W, H]);

  return (
    <div
      className="relative"
      style={{
        width: W * scale,
        height: "auto",
        maxWidth: "100%",
        maxHeight: "100%",
        aspectRatio: `${W} / ${H}`,
      }}
    >
      {showTemplate && weapon.template_image_url && (
        <img
          src={weapon.template_image_url}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          style={{ imageRendering: "pixelated" }}
        />
      )}
      <canvas
        ref={ref}
        width={W}
        height={H}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
