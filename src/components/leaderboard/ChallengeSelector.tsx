import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface ChallengeSelectorProps {
  currentChallengeId: string | null;
  challenges: Array<{ id: string; title: string; isParticipant: boolean }>;
  onChallengeChange: (challengeId: string) => void;
  isLoading?: boolean;
}

export function ChallengeSelector({
  currentChallengeId,
  challenges,
  onChallengeChange,
  isLoading = false
}: ChallengeSelectorProps) {
  const { t } = useTranslation('challenges');
  const userChallenges = challenges.filter(c => c.isParticipant);
  
  if (userChallenges.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {t('notParticipating')}
      </div>
    );
  }

  return (
    <Select
      value={currentChallengeId || undefined}
      onValueChange={onChallengeChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full sm:w-[280px] bg-background/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <SelectValue placeholder={t('selectChallenge')} />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-background/95 backdrop-blur-sm">
        {userChallenges.map((challenge) => (
          <SelectItem key={challenge.id} value={challenge.id}>
            {challenge.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
