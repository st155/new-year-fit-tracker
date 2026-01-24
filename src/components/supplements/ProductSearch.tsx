import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function ProductSearch() {
  const { t } = useTranslation('biostack');
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    brand: "",
    category: "",
    type: "",
  });

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["product-search", searchQuery, filters],
    queryFn: async () => {
      if (!searchQuery && !filters.brand && !filters.category && !filters.type) {
        return [];
      }

      const { data, error } = await supabase
        .from("supplement_products")
        .select("*")
        .or(searchQuery ? `name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%` : "")
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!(searchQuery || filters.brand || filters.category || filters.type),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('search.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('search.button')}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Select value={filters.brand} onValueChange={(value) => setFilters({ ...filters, brand: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('search.allBrands')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('search.allBrands')}</SelectItem>
                  <SelectItem value="NOW Foods">NOW Foods</SelectItem>
                  <SelectItem value="Thorne">Thorne</SelectItem>
                  <SelectItem value="Life Extension">Life Extension</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('search.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('search.allCategories')}</SelectItem>
                  <SelectItem value="vitamin">{t('categories.vitamin')}</SelectItem>
                  <SelectItem value="mineral">{t('categories.mineral')}</SelectItem>
                  <SelectItem value="protein">{t('categories.protein')}</SelectItem>
                  <SelectItem value="herbal">{t('categories.herbal')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('search.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('search.allTypes')}</SelectItem>
                  <SelectItem value="supplement">{t('types.supplement')}</SelectItem>
                  <SelectItem value="food">{t('types.food')}</SelectItem>
                  <SelectItem value="beverage">{t('types.beverage')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
      </Card>

      {searchResults && searchResults.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {searchResults.map((product: any) => (
            <Card key={product.id} className="glass-card hover:shadow-glow transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.brand} • {product.category}
                    </p>
                  </div>
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.recommended_dosage && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t('search.dosage')}:</span>{" "}
                    <span className="font-medium">{product.recommended_dosage}</span>
                  </p>
                )}
                {product.serving_size && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t('search.serving')}:</span>{" "}
                    <span className="font-medium">
                      {product.serving_size} {product.serving_unit}
                    </span>
                  </p>
                )}
                <Button variant="outline" className="w-full" size="sm">
                  {t('search.addToInventory')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchResults && searchResults.length === 0 && (searchQuery || filters.brand || filters.category) && (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('search.noResults')}
          </CardContent>
        </Card>
      )}
    </div>
  );
}