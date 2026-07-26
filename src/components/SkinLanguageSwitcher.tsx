import { useEffect, useState } from "react";

export type SkinLang = "en" | "de" | "zh" | "ja";

const LANGS: { code: SkinLang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
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
          className={`rounded-sm border px-2 py-1 text-base leading-none transition-colors ${
            lang === l.code
              ? "border-primary/60 bg-primary/10 opacity-100"
              : "border-border opacity-50 hover:opacity-100 hover:border-primary/40"
          }`}
        >
          <span aria-hidden>{l.flag}</span>
        </button>
      ))}
    </div>
  );
}
