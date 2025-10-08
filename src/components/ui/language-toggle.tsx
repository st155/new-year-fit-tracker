import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  const changeLanguage = async (lng: string) => {
    try {
      console.log('LanguageToggle: changing language from', currentLang, 'to', lng);
      await i18n.changeLanguage(lng);
      setCurrentLang(lng);
      localStorage.setItem('i18nextLng', lng);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lng;
      }
      console.log("LanguageToggle: language changed to", lng);
      setOpen(false);
    } catch (e) {
      console.error('LanguageToggle: changeLanguage failed', e);
    }
  };

  // Update current language when i18n language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      console.log('LanguageToggle: i18n language changed event:', lng);
      setCurrentLang(lng);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2);
    const cy = Math.round(rect.top + rect.height / 2);
    const topEl = document.elementFromPoint(cx, cy);
    console.log("LanguageToggle: mounted", { 
      rect, 
      topElTag: topEl?.tagName, 
      topElClass: (topEl as HTMLElement)?.className,
      currentLanguage: i18n.language 
    });
  }, [i18n.language]);

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

  const languages = [
    { code: 'en', label: '🇺🇸 English' },
    { code: 'ru', label: '🇷🇺 Русский' },
    { code: 'bg', label: '🇧🇬 Български' },
  ];

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
          console.log("LanguageToggle: click", { 
            target: (e.target as HTMLElement)?.tagName,
            currentLanguage: currentLang 
          });
          setOpen((v) => !v);
        }}
      >
        <Globe className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle language</span>
      </Button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-44 rounded-md border bg-popover/95 backdrop-blur-sm p-1 text-popover-foreground shadow-lg z-[100001]"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              className="flex items-center justify-between w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                console.log('LanguageToggle: select', lang.code);
                changeLanguage(lang.code);
              }}
            >
              <span>{lang.label}</span>
              {currentLang === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}