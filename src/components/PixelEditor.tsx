import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brush, Eraser, Pipette, PaintBucket, Undo2, Redo2, ZoomIn, ZoomOut, Move,
  Eye, EyeOff, Trash2, ArrowLeft, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PALETTE, type PixelDatum, type Weapon } from "@/lib/skincreator";

type Tool = "brush" | "eraser" | "fill" | "picker" | "pan";

const TOOLS: { id: Tool; label: string; icon: typeof Brush }[] = [
  { id: "brush", label: "Brush (1px)", icon: Brush },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "fill", label: "Fill", icon: PaintBucket },
  { id: "picker", label: "Pick colour", icon: Pipette },
  { id: "pan", label: "Pan", icon: Move },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6) || "000000", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

export function PixelEditor({
  weapon,
  onBack,
  onFinish,
}: {
  weapon: Weapon;
  onBack: () => void;
  onFinish: (result: { dataUrl: string; pixels: PixelDatum[] }) => void;
}) {
  const W = Math.max(1, Math.min(512, weapon.canvas_width || 64));
  const H = Math.max(1, Math.min(512, weapon.canvas_height || 32));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufRef = useRef<Uint8ClampedArray>(new Uint8ClampedArray(W * H * 4));
  const undoRef = useRef<Uint8ClampedArray[]>([]);
  const redoRef = useRef<Uint8ClampedArray[]>([]);
  const drawingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const templateRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#ef7d57");
  const [hexInput, setHexInput] = useState("#ef7d57");
  const [alpha, setAlpha] = useState(100);
  const [scale, setScale] = useState(() => {
    const fit = Math.floor(720 / W);
    return Math.max(6, Math.min(24, fit || 14));
  });
  const [showTemplate, setShowTemplate] = useState(true);
  const [historyTick, setHistoryTick] = useState(0);

  const redraw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(bufRef.current), W, H), 0, 0);
  }, [W, H]);

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    if (!weapon.template_image_url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = weapon.template_image_url;
    img.onload = () => { templateRef.current = img; };
  }, [weapon.template_image_url]);

  const pushUndo = () => {
    undoRef.current.push(new Uint8ClampedArray(bufRef.current));
    if (undoRef.current.length > 60) undoRef.current.shift();
    redoRef.current = [];
    setHistoryTick((t) => t + 1);
  };

  const undo = () => {
    const prev = undoRef.current.pop();
    if (!prev) return;
    redoRef.current.push(new Uint8ClampedArray(bufRef.current));
    bufRef.current = prev;
    redraw();
    setHistoryTick((t) => t + 1);
  };
  const redo = () => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current.push(new Uint8ClampedArray(bufRef.current));
    bufRef.current = next;
    redraw();
    setHistoryTick((t) => t + 1);
  };

  const setPixel = (x: number, y: number, erase: boolean) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const buf = bufRef.current;
    const i = (y * W + x) * 4;
    if (erase) {
      buf[i] = buf[i + 1] = buf[i + 2] = buf[i + 3] = 0;
      return;
    }
    const [r, g, b] = hexToRgb(color);
    const a = Math.round((alpha / 100) * 255);
    // alpha-composite over existing pixel so partial transparency stacks predictably
    const sa = a / 255;
    const da = buf[i + 3] / 255;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) {
      buf[i] = buf[i + 1] = buf[i + 2] = buf[i + 3] = 0;
      return;
    }
    buf[i] = Math.round((r * sa + buf[i] * da * (1 - sa)) / outA);
    buf[i + 1] = Math.round((g * sa + buf[i + 1] * da * (1 - sa)) / outA);
    buf[i + 2] = Math.round((b * sa + buf[i + 2] * da * (1 - sa)) / outA);
    buf[i + 3] = Math.round(outA * 255);
  };

  const floodFill = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const buf = bufRef.current;
    const at = (px: number, py: number) => (py * W + px) * 4;
    const start = at(x, y);
    const target = [buf[start], buf[start + 1], buf[start + 2], buf[start + 3]];
    const [r, g, b] = hexToRgb(color);
    const a = Math.round((alpha / 100) * 255);
    if (target[0] === r && target[1] === g && target[2] === b && target[3] === a) return;
    const stack: [number, number][] = [[x, y]];
    const seen = new Uint8Array(W * H);
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
      const idx = cy * W + cx;
      if (seen[idx]) continue;
      const p = idx * 4;
      if (buf[p] !== target[0] || buf[p + 1] !== target[1] || buf[p + 2] !== target[2] || buf[p + 3] !== target[3]) continue;
      seen[idx] = 1;
      buf[p] = r; buf[p + 1] = g; buf[p + 2] = b; buf[p + 3] = a;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  };

  const pick = (x: number, y: number) => {
    const buf = bufRef.current;
    const i = (y * W + x) * 4;
    if (buf[i + 3] === 0) return;
    const hex = rgbToHex(buf[i], buf[i + 1], buf[i + 2]);
    setColor(hex);
    setHexInput(hex);
  };

  const posFromEvent = (e: React.PointerEvent) => {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - rect.left) / rect.width) * W),
      y: Math.floor(((e.clientY - rect.top) / rect.height) * H),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (tool === "pan" || e.button === 1) {
      const sc = scrollRef.current;
      if (sc) panRef.current = { x: e.clientX, y: e.clientY, sl: sc.scrollLeft, st: sc.scrollTop };
      return;
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const { x, y } = posFromEvent(e);
    if (tool === "picker") { pick(x, y); return; }
    pushUndo();
    drawingRef.current = true;
    if (tool === "fill") floodFill(x, y);
    else setPixel(x, y, tool === "eraser");
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panRef.current) {
      const sc = scrollRef.current;
      if (sc) {
        sc.scrollLeft = panRef.current.sl - (e.clientX - panRef.current.x);
        sc.scrollTop = panRef.current.st - (e.clientY - panRef.current.y);
      }
      return;
    }
    if (!drawingRef.current || tool === "fill" || tool === "picker") return;
    const { x, y } = posFromEvent(e);
    setPixel(x, y, tool === "eraser");
    redraw();
  };

  const onPointerUp = () => { drawingRef.current = false; panRef.current = null; };

  const clearAll = () => { pushUndo(); bufRef.current = new Uint8ClampedArray(W * H * 4); redraw(); };

  const exportSkin = () => {
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    if (templateRef.current) {
      try { ctx.drawImage(templateRef.current, 0, 0, W, H); } catch { /* tainted / not loaded */ }
    }
    if (canvasRef.current) ctx.drawImage(canvasRef.current, 0, 0);
    let dataUrl = "";
    try { dataUrl = out.toDataURL("image/png"); }
    catch { dataUrl = canvasRef.current?.toDataURL("image/png") ?? ""; }

    const buf = bufRef.current;
    const pixels: PixelDatum[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (buf[i + 3] === 0) continue;
        pixels.push({ x, y, r: buf[i], g: buf[i + 1], b: buf[i + 2], a: buf[i + 3] });
      }
    }
    onFinish({ dataUrl, pixels });
  };

  const cssW = W * scale;
  const cssH = H * scale;
  const painted = useMemo(() => historyTick, [historyTick]);
  void painted;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to weapons</Button>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{weapon.name}</span> — {W}×{H} px
        </div>
        <Button size="sm" onClick={exportSkin}><Check className="mr-2 h-4 w-4" /> Done / Submit</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        {/* Canvas area */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                title={t.label}
                onClick={() => setTool(t.id)}
                className={`rounded-sm border p-2 transition-colors ${
                  tool === t.id ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" />
              </button>
            ))}
            <span className="mx-1 h-6 w-px bg-border" />
            <button title="Undo" onClick={undo} disabled={!undoRef.current.length} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"><Undo2 className="h-4 w-4" /></button>
            <button title="Redo" onClick={redo} disabled={!redoRef.current.length} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"><Redo2 className="h-4 w-4" /></button>
            <span className="mx-1 h-6 w-px bg-border" />
            <button title="Zoom out" onClick={() => setScale((s) => Math.max(4, s - 2))} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-foreground"><ZoomOut className="h-4 w-4" /></button>
            <span className="min-w-10 text-center text-xs text-muted-foreground">{scale}×</span>
            <button title="Zoom in" onClick={() => setScale((s) => Math.min(40, s + 2))} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-foreground"><ZoomIn className="h-4 w-4" /></button>
            <span className="mx-1 h-6 w-px bg-border" />
            <button
              title="Toggle template"
              onClick={() => setShowTemplate((v) => !v)}
              className={`flex items-center gap-1.5 rounded-sm border px-2 py-2 text-xs ${showTemplate ? "border-primary/60 text-primary" : "border-border text-muted-foreground"}`}
            >
              {showTemplate ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} Template
            </button>
            <button title="Clear canvas" onClick={clearAll} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>

          <div ref={scrollRef} className="max-h-[70vh] overflow-auto rounded-sm bg-[#111] p-6">
            <div
              className="relative mx-auto"
              style={{
                width: cssW,
                height: cssH,
                backgroundImage:
                  "linear-gradient(45deg,#232323 25%,transparent 25%),linear-gradient(-45deg,#232323 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#232323 75%),linear-gradient(-45deg,transparent 75%,#232323 75%)",
                backgroundSize: `${scale * 2}px ${scale * 2}px`,
                backgroundPosition: `0 0, 0 ${scale}px, ${scale}px -${scale}px, -${scale}px 0`,
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
                ref={canvasRef}
                width={W}
                height={H}
                className="absolute inset-0 h-full w-full touch-none"
                style={{ imageRendering: "pixelated", cursor: tool === "pan" ? "grab" : "crosshair" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              <div
                className="pointer-events-none absolute inset-0 border border-primary/30"
                style={{
                  backgroundImage: scale >= 10
                    ? "linear-gradient(to right,rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.06) 1px,transparent 1px)"
                    : undefined,
                  backgroundSize: `${scale}px ${scale}px`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Palette panel */}
        <aside className="space-y-4 rounded-lg border border-border bg-card p-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Palette</Label>
            <div className="mt-2 grid grid-cols-8 gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => { setColor(c); setHexInput(c); }}
                  className={`aspect-square rounded-sm border ${color.toLowerCase() === c.toLowerCase() ? "border-primary ring-1 ring-primary" : "border-black/40"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Colour</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff"}
                onChange={(e) => { setColor(e.target.value); setHexInput(e.target.value); }}
                className="h-9 w-12 cursor-pointer rounded-sm border border-border bg-transparent"
              />
              <Input
                value={hexInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setHexInput(v);
                  if (/^#?[0-9a-f]{6}$/i.test(v)) setColor(v.startsWith("#") ? v : `#${v}`);
                }}
                placeholder="#ef7d57"
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Brush opacity — {alpha}%</Label>
            <input
              type="range"
              min={0}
              max={100}
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="rounded-sm border border-border bg-background/50 p-2 text-[11px] leading-relaxed text-muted-foreground">
            Brush paints single pixels. Fill floods matching pixels. Pipette picks a colour from your layer.
            Touch/stylus painting is supported — use the Pan tool to move the canvas.
          </div>
        </aside>
      </div>
    </div>
  );
}
