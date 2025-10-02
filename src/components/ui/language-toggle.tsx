import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const changeLanguage = async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
      localStorage.setItem('i18nextLng', lng);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lng;
      }
      console.log("LanguageToggle: changeLanguage", lng);
      setOpen(false);
    } catch (e) {
      console.error('LanguageToggle: changeLanguage failed', e);
    }
  };

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2);
    const cy = Math.round(rect.top + rect.height / 2);
    const topEl = document.elementFromPoint(cx, cy);
    console.log("LanguageToggle: mounted", { rect, topElTag: topEl?.tagName, topElClass: (topEl as HTMLElement)?.className });
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!menuRef.current || !btnRef.current) return;
      if (menuRef.current.contains(t) || btnRef.current.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, []);

  return (
    <div className="relative">
      <Button
        ref={btnRef}
        type="button"
        aria-label="Toggle language"
        variant="ghost"
        size="icon"
        className="relative isolate z-[100000] pointer-events-auto touch-auto"
        style={{ pointerEvents: 'auto' }}
        onPointerDown={(e) => {
          console.log("LanguageToggle: pointerdown", { target: (e.target as HTMLElement)?.tagName });
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("LanguageToggle: click", { target: (e.target as HTMLElement)?.tagName });
          setOpen((v) => !v);
        }}
      >
        <Globe className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle language</span>
      </Button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-44 rounded-md border bg-popover/95 backdrop-blur-sm p-1 text-popover-foreground shadow-lg z-[80]"
        >
          <button
            className="block w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              console.log('LanguageToggle: select en');
              changeLanguage('en');
            }}
          >
            🇺🇸 English
          </button>
          <button
            className="block w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              console.log('LanguageToggle: select ru');
              changeLanguage('ru');
            }}
          >
            🇷🇺 Русский
          </button>
          <button
            className="block w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              console.log('LanguageToggle: select bg');
              changeLanguage('bg');
            }}
          >
            🇧🇬 Български
          </button>
        </div>
      )}
    </div>
  );
}