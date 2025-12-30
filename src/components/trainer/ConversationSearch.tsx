import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

interface ConversationSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const ConversationSearch = ({ 
  onSearch, 
  placeholder 
}: ConversationSearchProps) => {
  const { t } = useTranslation('trainer');
  const [query, setQuery] = useState("");
  const actualPlaceholder = placeholder || t('chat.searchPlaceholder');

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={actualPlaceholder}
        className="pl-9 pr-9"
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};