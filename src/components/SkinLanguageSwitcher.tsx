import { useEffect, useState } from "react";
import flagUs from "@/assets/flag-us.png.asset.json";
import flagDe from "@/assets/flag-de.png.asset.json";
import flagCn from "@/assets/flag-cn.png.asset.json";
import flagJp from "@/assets/flag-jp.png.asset.json";

export type SkinLang = "en" | "de" | "zh" | "ja";

const LANGS: { code: SkinLang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: flagUs.url },
  { code: "de", label: "Deutsch", flag: flagDe.url },
  { code: "zh", label: "中文", flag: flagCn.url },
  { code: "ja", label: "日本語", flag: flagJp.url },
];


const STORAGE_KEY = "skincreator_lang";

export function getSkinLang(): SkinLang {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  return (LANGS.some((l) => l.code === v) ? (v as SkinLang) : "en");
}

export function SkinLanguageSwitcher({ className = "" }: { className?: string }) {
  const [lang, setLang] = useState<SkinLang>("en");

  useEffect(() => setLang(getSkinLang()), []);

  const pick = (code: SkinLang) => {
    setLang(code);
    localStorage.setItem(STORAGE_KEY, code);
    window.dispatchEvent(new CustomEvent("skinlangchange", { detail: code }));
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => pick(l.code)}
          title={l.label}
          aria-label={l.label}
          aria-pressed={lang === l.code}
          className={`flex items-center justify-center rounded-sm border p-1 transition-colors ${
            lang === l.code
              ? "border-primary/60 bg-primary/10 opacity-100"
              : "border-border opacity-50 hover:opacity-100 hover:border-primary/40"
          }`}
        >
          <img src={l.flag} alt="" aria-hidden className="h-4 w-6 object-cover" />
        </button>

      ))}
    </div>
  );
}
