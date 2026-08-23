import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brush, Eraser, Pipette, PaintBucket, Undo2, Redo2, ZoomIn, ZoomOut, Move,
  Eye, EyeOff, Trash2, ArrowLeft, Check, Save, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PALETTE, type PixelDatum, type Weapon } from "@/lib/skincreator";
import { getSkinUser, saveSkinDraft } from "@/lib/skinauth";
import { useSkinT } from "@/lib/skin-i18n";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type Tool = "brush" | "eraser" | "fill" | "picker" | "pan";

const TOOLS: { id: Tool; labelKey: string; icon: typeof Brush }[] = [
  { id: "brush", labelKey: "toolBrush", icon: Brush },
  { id: "eraser", labelKey: "toolEraser", icon: Eraser },
  { id: "fill", labelKey: "toolFill", icon: PaintBucket },
  { id: "picker", labelKey: "toolPicker", icon: Pipette },
  { id: "pan", labelKey: "toolPan", icon: Move },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6) || "000000", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

/** Shift a hex colour's HSL lightness by `amount` percentage points (-50..50). */
function adjustBrightness(hex: string, amount: number): string {
  if (!amount) return hex;
  const [r0, g0, b0] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r0, g0, b0);
  const min = Math.min(r0, g0, b0);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r0) h = ((g0 - b0) / d) % 6;
    else if (max === g0) h = (b0 - r0) / d + 2;
    else h = (r0 - g0) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const nl = Math.max(0, Math.min(1, l + amount / 100));
  const c = (1 - Math.abs(2 * nl - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = nl - c / 2;
  let rgb: [number, number, number] = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgbToHex(...(rgb.map((v) => Math.round((v + m) * 255)) as [number, number, number]));
}


export function PixelEditor({
  weapon,
  onBack,
  onFinish,
  initialPixels,
  initialDraftId,
  initialDraftName,
}: {
  weapon: Weapon;
  onBack: () => void;
  onFinish: (result: { dataUrl: string; pixels: PixelDatum[] }) => void;
  initialPixels?: PixelDatum[] | null;
  initialDraftId?: string | null;
  initialDraftName?: string | null;
}) {

  const { t } = useSkinT();
  const W = Math.max(1, Math.min(512, weapon.canvas_width || 64));
  const H = Math.max(1, Math.min(512, weapon.canvas_height || 32));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufRef = useRef<Uint8ClampedArray>(new Uint8ClampedArray(W * H * 4));
  const undoRef = useRef<Uint8ClampedArray[]>([]);
  const redoRef = useRef<Uint8ClampedArray[]>([]);
  const drawingRef = useRef(false);
  /** Pixels already touched by the current stroke, so opacity never stacks twice. */
  const strokeRef = useRef<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const templateRef = useRef<HTMLImageElement | null>(null);
  /** 1 = paintable (template alpha > 0), 0 = outside the weapon shape. */
  const maskRef = useRef<Uint8Array>(new Uint8Array(W * H).fill(1));
  /** RGBA of the original template, used as colour region boundaries for the fill tool. */
  const tplDataRef = useRef<Uint8ClampedArray | null>(null);

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#ef7d57");
  const [hexInput, setHexInput] = useState("#ef7d57");
  const [alpha, setAlpha] = useState(100);
  const [brightness, setBrightness] = useState(0);
  const [scale, setScale] = useState(() => {
    const fit = Math.floor(720 / W);
    return Math.max(6, Math.min(24, fit || 14));
  });
  const [showTemplate, setShowTemplate] = useState(true);
  const [historyTick, setHistoryTick] = useState(0);
  const [maskReady, setMaskReady] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [draftName, setDraftName] = useState(initialDraftName ?? "");
  const [confirmClear, setConfirmClear] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const signedIn = !!getSkinUser();
  const paintColor = adjustBrightness(color, brightness);

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

  /** Restore a saved draft's paint layer into the working buffer. */
  useEffect(() => {
    if (!initialPixels?.length) return;
    const buf = new Uint8ClampedArray(W * H * 4);
    for (const p of initialPixels) {
      if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) continue;
      const i = (p.y * W + p.x) * 4;
      buf[i] = p.r; buf[i + 1] = p.g; buf[i + 2] = p.b; buf[i + 3] = p.a;
    }
    bufRef.current = buf;
    undoRef.current = [];
    redoRef.current = [];
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPixels, W, H]);


  /** Paint the "you can't draw here" overlay from the alpha mask. */
  const drawMaskOverlay = useCallback(() => {
    const cv = maskCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(W, H);
    const mask = maskRef.current;
    for (let i = 0; i < W * H; i++) {
      if (mask[i]) continue;
      const p = i * 4;
      img.data[p] = 8; img.data[p + 1] = 8; img.data[p + 2] = 10; img.data[p + 3] = 150;
    }
    ctx.clearRect(0, 0, W, H);
    ctx.putImageData(img, 0, 0);
  }, [W, H]);

  useEffect(() => {
    maskRef.current = new Uint8Array(W * H).fill(1);
    tplDataRef.current = null;
    setMaskReady(false);
    if (!weapon.template_image_url) { drawMaskOverlay(); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      templateRef.current = img;
      try {
        const off = document.createElement("canvas");
        off.width = W; off.height = H;
        const octx = off.getContext("2d")!;
        octx.imageSmoothingEnabled = false;
        octx.drawImage(img, 0, 0, W, H);
        const data = octx.getImageData(0, 0, W, H).data;
        tplDataRef.current = data;
        const mask = new Uint8Array(W * H);
        // Dark outline pixels of the template stay unpaintable, just like the
        // transparent area around the weapon.
        const OUTLINE_MAX = 45;
        for (let i = 0; i < W * H; i++) {
          const o = i * 4;
          const opaque = data[o + 3] > 0;
          const isOutline = data[o] <= OUTLINE_MAX && data[o + 1] <= OUTLINE_MAX && data[o + 2] <= OUTLINE_MAX;
          mask[i] = opaque && !isOutline ? 1 : 0;
        }
        // A fully transparent (or fully opaque) template gives no useful mask.
        let paintable = 0;
        for (let i = 0; i < mask.length; i++) paintable += mask[i];
        if (paintable > 0) { maskRef.current = mask; setMaskReady(true); }

      } catch { /* cross-origin template: keep the whole canvas paintable */ }
      drawMaskOverlay();
    };

    img.onerror = () => { if (!cancelled) drawMaskOverlay(); };
    img.src = weapon.template_image_url;
    return () => { cancelled = true; };
  }, [weapon.template_image_url, W, H, drawMaskOverlay]);

  const paintable = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && maskRef.current[y * W + x] === 1;

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
    if (!paintable(x, y)) return;
    const buf = bufRef.current;
    const key = y * W + x;
    const i = key * 4;
    if (erase) {
      buf[i] = buf[i + 1] = buf[i + 2] = buf[i + 3] = 0;
      strokeRef.current.add(key);
      return;
    }
    // Each pixel is painted at most once per stroke, so opacity stays as chosen.
    if (strokeRef.current.has(key)) return;
    strokeRef.current.add(key);
    const [r, g, b] = hexToRgb(paintColor);
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

  /** Tolerance (per channel, squared distance) for template colour regions. */
  const TPL_TOLERANCE = 32;

  /**
   * Flood fill bounded by: the painted layer's own colour edges, the weapon's
   * alpha mask, and the colour regions of the original template (barrel, grip,
   * stock, etc. stay separate fill areas).
   */
  const floodFill = (x: number, y: number, erase: boolean) => {
    if (!paintable(x, y)) return;
    const buf = bufRef.current;
    const tpl = tplDataRef.current;
    const at = (px: number, py: number) => (py * W + px) * 4;
    const start = at(x, y);
    const target = [buf[start], buf[start + 1], buf[start + 2], buf[start + 3]];
    const tplTarget = tpl ? [tpl[start], tpl[start + 1], tpl[start + 2]] : null;
    const sameTemplateRegion = (p: number) => {
      if (!tpl || !tplTarget) return true;
      const dr = tpl[p] - tplTarget[0];
      const dg = tpl[p + 1] - tplTarget[1];
      const db = tpl[p + 2] - tplTarget[2];
      return Math.sqrt(dr * dr + dg * dg + db * db) <= TPL_TOLERANCE;
    };
    const [r, g, b] = erase ? [0, 0, 0] : hexToRgb(paintColor);
    const a = erase ? 0 : Math.round((alpha / 100) * 255);
    if (target[0] === r && target[1] === g && target[2] === b && target[3] === a) return;
    const stack: [number, number][] = [[x, y]];
    const seen = new Uint8Array(W * H);
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (!paintable(cx, cy)) continue;
      const idx = cy * W + cx;
      if (seen[idx]) continue;
      const p = idx * 4;
      if (buf[p] !== target[0] || buf[p + 1] !== target[1] || buf[p + 2] !== target[2] || buf[p + 3] !== target[3]) continue;
      if (!sameTemplateRegion(p)) continue;
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
    setBrightness(0);
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
    if (!paintable(x, y)) return; // outside the weapon shape → ignore silently
    pushUndo();
    strokeRef.current = new Set();
    drawingRef.current = true;
    if (tool === "fill") floodFill(x, y, false);
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

  const clearAll = () => { pushUndo(); bufRef.current = new Uint8ClampedArray(W * H * 4); redraw(); setConfirmClear(false); };

  const exportSkin = () => {
    // Export ONLY the user's painted layer: fully transparent everywhere else.
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const buf = bufRef.current;
    const img = ctx.createImageData(W, H);
    const pixels: PixelDatum[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (buf[i + 3] === 0 || maskRef.current[y * W + x] === 0) continue;
        img.data[i] = buf[i]; img.data[i + 1] = buf[i + 1]; img.data[i + 2] = buf[i + 2]; img.data[i + 3] = buf[i + 3];
        pixels.push({ x, y, r: buf[i], g: buf[i + 1], b: buf[i + 2], a: buf[i + 3] });
      }
    }
    ctx.putImageData(img, 0, 0);
    const dataUrl = out.toDataURL("image/png");
    onFinish({ dataUrl, pixels });
  };

  /** Collects the masked paint layer as plain pixel data (draft storage format). */
  const collectPixels = (): PixelDatum[] => {
    const buf = bufRef.current;
    const pixels: PixelDatum[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (buf[i + 3] === 0 || maskRef.current[y * W + x] === 0) continue;
        pixels.push({ x, y, r: buf[i], g: buf[i + 1], b: buf[i + 2], a: buf[i + 3] });
      }
    }
    return pixels;
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const id = await saveSkinDraft({
        draft_id: draftId,
        weapon_template_id: weapon.id,
        canvas_data: collectPixels(),
        name: draftName.trim() || null,
      });
      setDraftId(id);
      toast.success(t("draftSaved"));
    } catch (e) {
      toast.error((e as Error).message || t("draftSaveFailed"));
    } finally {
      setSavingDraft(false);
    }
  };

  const cssW = W * scale;
  const cssH = H * scale;
  const painted = useMemo(() => historyTick, [historyTick]);
  void painted;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> {t("backToWeapons")}</Button>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{weapon.name}</span>: {W}×{H} px
        </div>
        <div className="flex items-center gap-2">
          {signedIn && (
            <Button size="sm" variant="outline" onClick={saveDraft} disabled={savingDraft}>
              {savingDraft
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Save className="mr-2 h-4 w-4" />}
              {draftId ? t("updateDraft") : t("saveDraft")}
            </Button>
          )}
          <Button size="sm" onClick={exportSkin}><Check className="mr-2 h-4 w-4" /> {t("doneSubmit")}</Button>
        </div>
      </div>


      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        {/* Canvas area */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {TOOLS.map((tl) => (
              <button
                key={tl.id}
                title={t(tl.labelKey)}
                onClick={() => setTool(tl.id)}
                className={`rounded-sm border p-2 transition-colors ${
                  tool === tl.id ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <tl.icon className="h-4 w-4" />
              </button>
            ))}
            <span className="mx-1 h-6 w-px bg-border" />
            <button title={t("undo")} onClick={undo} disabled={!undoRef.current.length} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"><Undo2 className="h-4 w-4" /></button>
            <button title={t("redo")} onClick={redo} disabled={!redoRef.current.length} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"><Redo2 className="h-4 w-4" /></button>
            <span className="mx-1 h-6 w-px bg-border" />
            <button title={t("zoomOut")} onClick={() => setScale((s) => Math.max(4, s - 2))} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-foreground"><ZoomOut className="h-4 w-4" /></button>
            <span className="min-w-10 text-center text-xs text-muted-foreground">{scale}×</span>
            <button title={t("zoomIn")} onClick={() => setScale((s) => Math.min(40, s + 2))} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-foreground"><ZoomIn className="h-4 w-4" /></button>
            <span className="mx-1 h-6 w-px bg-border" />
            <button
              title={t("toggleTemplate")}
              onClick={() => setShowTemplate((v) => !v)}
              className={`flex items-center gap-1.5 rounded-sm border px-2 py-2 text-xs ${showTemplate ? "border-primary/60 text-primary" : "border-border text-muted-foreground"}`}
            >
              {showTemplate ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} {t("template")}
            </button>
            <button title={t("clearCanvas")} onClick={() => setConfirmClear(true)} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
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
                ref={maskCanvasRef}
                width={W}
                height={H}
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full"
                style={{ imageRendering: "pixelated" }}
              />

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
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("palette")}</Label>
            <div className="mt-2 grid grid-cols-8 gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => { setColor(c); setHexInput(c); setBrightness(0); }}
                  className={`aspect-square rounded-sm border ${color.toLowerCase() === c.toLowerCase() ? "border-primary ring-1 ring-primary" : "border-black/40"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("colour")}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff"}
                onChange={(e) => { setColor(e.target.value); setHexInput(e.target.value); setBrightness(0); }}
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
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("brightness")}: {brightness > 0 ? `+${brightness}` : brightness}</Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={-50}
                max={50}
                step={1}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <span
                title={paintColor}
                className="h-7 w-7 shrink-0 rounded-sm border border-border"
                style={{ backgroundColor: paintColor }}
              />
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">{paintColor}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("brushOpacity")}: {alpha}%</Label>
            <input
              type="range"
              min={0}
              max={100}
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {signedIn && (
            <div className="space-y-2">
              <Label htmlFor="sc-draft-name" className="text-xs uppercase tracking-wider text-muted-foreground">{t("draftNameLabel")}</Label>
              <Input
                id="sc-draft-name"
                value={draftName}
                maxLength={80}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={t("draftNamePlaceholder")}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">{t("draftHelp")}</p>
            </div>
          )}


          <div className="rounded-sm border border-border bg-background/50 p-2 text-[11px] leading-relaxed text-muted-foreground">
            {maskReady ? t("helpMasked") : t("helpPlain")}{" "}
            {t("helpTail")}
          </div>

        </aside>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={(o) => { if (!o) setConfirmClear(false); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clearCanvasTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clearCanvasBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); clearAll(); }}>{t("deleteDraftConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
