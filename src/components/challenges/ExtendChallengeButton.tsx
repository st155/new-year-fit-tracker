import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { addDays, format } from "date-fns";
import { ru, enUS } from "date-fns/locale";

interface ExtendChallengeButtonProps {
  challengeId: string;
  currentEndDate: string;
  onExtend: (newEndDate: string) => void;
  isPending?: boolean;
  days?: number;
}

export function ExtendChallengeButton({
  challengeId,
  currentEndDate,
  onExtend,
  isPending = false,
  days = 10,
}: ExtendChallengeButtonProps) {
  const { t, i18n } = useTranslation("challengeDetail");
  const [open, setOpen] = useState(false);

  const dateLocale = i18n.language === "ru" ? ru : enUS;
  const currentDate = new Date(currentEndDate);
  const newDate = addDays(currentDate, days);

  const handleConfirm = () => {
    onExtend(format(newDate, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="bg-white/10 text-white border-white/20 hover:bg-white/20 shrink-0"
          disabled={isPending}
        >
          <CalendarPlus className="h-4 w-4 mr-2" />
          {t("extend.button")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("extend.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("extend.description", {
              currentDate: format(currentDate, "d MMMM yyyy", { locale: dateLocale }),
              newDate: format(newDate, "d MMMM yyyy", { locale: dateLocale }),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("extend.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? t("extend.extending") : t("extend.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
