import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const btnRef = useRef<HTMLButtonElement>(null);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    console.log("LanguageToggle: changeLanguage", lng);
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
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={btnRef}
          type="button"
          aria-label="Toggle language"
          variant="ghost"
          size="icon"
          className="relative z-[9999] pointer-events-auto"
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[10000] pointer-events-auto">
        <DropdownMenuItem onClick={() => changeLanguage('en')}>
          🇺🇸 English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('ru')}>
          🇷🇺 Русский
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('bg')}>
          🇧🇬 Български
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}