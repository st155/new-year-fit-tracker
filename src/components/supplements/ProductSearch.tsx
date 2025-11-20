import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function ProductSearch() {
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
          <CardTitle>Search Products</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search supplements by name or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Search
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Select value={filters.brand} onValueChange={(value) => setFilters({ ...filters, brand: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Brands</SelectItem>
                  <SelectItem value="NOW Foods">NOW Foods</SelectItem>
                  <SelectItem value="Thorne">Thorne</SelectItem>
                  <SelectItem value="Life Extension">Life Extension</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="vitamin">Vitamins</SelectItem>
                  <SelectItem value="mineral">Minerals</SelectItem>
                  <SelectItem value="protein">Protein</SelectItem>
                  <SelectItem value="herbal">Herbal</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="supplement">Supplement</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="beverage">Beverage</SelectItem>
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
                    <span className="text-muted-foreground">Dosage:</span>{" "}
                    <span className="font-medium">{product.recommended_dosage}</span>
                  </p>
                )}
                {product.serving_size && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Serving:</span>{" "}
                    <span className="font-medium">
                      {product.serving_size} {product.serving_unit}
                    </span>
                  </p>
                )}
                <Button variant="outline" className="w-full" size="sm">
                  Add to Inventory
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchResults && searchResults.length === 0 && (searchQuery || filters.brand || filters.category) && (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            No products found matching your criteria
          </CardContent>
        </Card>
      )}
    </div>
  );
}
