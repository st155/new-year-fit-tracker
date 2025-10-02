import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const btnRef = useRef<HTMLButtonElement>(null);

  const changeLanguage = async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
      localStorage.setItem('i18nextLng', lng);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lng;
      }
      console.log("LanguageToggle: changeLanguage", lng);
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          ref={btnRef}
          type="button"
          aria-label="Toggle language"
          variant="ghost"
          size="icon"
          className="relative z-[9999] pointer-events-auto touch-auto"
          onPointerDown={(e) => {
            console.log("LanguageToggle: pointerdown", { target: (e.target as HTMLElement)?.tagName });
          }}
          onClick={(e) => {
            console.log("LanguageToggle: click", { target: (e.target as HTMLElement)?.tagName });
          }}
        >
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="z-[10000] pointer-events-auto p-1 w-44">
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
      </PopoverContent>
    </Popover>
  );
}