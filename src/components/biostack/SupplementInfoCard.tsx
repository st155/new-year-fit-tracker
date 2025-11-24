import { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Users, TrendingUp } from "lucide-react";
import { useSupplementPopularity } from "@/hooks/biostack/useSupplementPopularity";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SupplementInfoCardProps {
  product: {
    id: string;
    name: string;
    brand: string;
    form?: string;
    image_url?: string;
    description?: string;
    benefits?: string[];
    research_summary?: string;
    manufacturer_info?: {
      country?: string;
      founded_year?: number;
      description?: string;
      website?: string;
    };
    avg_rating?: number;
    serving_size?: string;
    serving_unit?: string;
    recommended_dosage?: string;
  };
  onAddToStack?: () => void;
  onSaveToLibraryOnly?: () => void;
  onRate?: () => void;
}

export function SupplementInfoCard({ product, onAddToStack, onSaveToLibraryOnly, onRate }: SupplementInfoCardProps) {
  const { data: popularity } = useSupplementPopularity(product.id);

  // Check if product is in user's library
  const { data: libraryEntry } = useQuery({
    queryKey: ['library-check', product.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('user_supplement_library')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();
      
      return data;
    }
  });

  // Check if product is in user's active stack
  const { data: stackEntry } = useQuery({
    queryKey: ['stack-check', product.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('user_stack')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .eq('is_active', true)
        .maybeSingle();
      
      return data;
    }
  });

  return (
    <Card className="bg-neutral-950 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
      <CardHeader className="space-y-4">
        {/* Header Section */}
        <div className="flex gap-4">
          {product.image_url && (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-24 h-24 object-contain rounded-lg bg-neutral-900"
            />
          )}
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold text-white">{product.name}</h3>
            <p className="text-sm text-neutral-400">{product.brand} • {product.form || 'Capsule'}</p>
            
            <div className="flex items-center gap-4 mt-2">
              {/* Rating */}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${
                      i < Math.floor(product.avg_rating || 0) 
                        ? 'fill-yellow-500 text-yellow-500' 
                        : 'text-neutral-600'
                    }`}
                  />
                ))}
                <span className="text-sm text-neutral-400 ml-1">
                  {product.avg_rating?.toFixed(1) || '0.0'}
                </span>
              </div>

              {/* Popularity Badge */}
              {popularity && popularity.userCount > 0 && (
                <Badge variant="outline" className="border-green-500/50 text-green-400">
                  <Users className="w-3 h-3 mr-1" />
                  {popularity.userCount} принимают
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Library and Stack Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {libraryEntry && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
              📚 В библиотеке • сканировано {libraryEntry.scan_count}x
            </Badge>
          )}
          
          {stackEntry && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
              ✅ В стеке
            </Badge>
          )}
          
          {libraryEntry?.custom_rating && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
              ⭐ Ваша оценка: {libraryEntry.custom_rating}/5
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Tabs Navigation */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full bg-neutral-900 border border-neutral-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              Overview
            </TabsTrigger>
            <TabsTrigger value="benefits" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              Benefits
            </TabsTrigger>
            <TabsTrigger value="research" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              Research
            </TabsTrigger>
            <TabsTrigger value="manufacturer" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              Manufacturer
            </TabsTrigger>
            <TabsTrigger value="community" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              Community
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
              <p className="text-neutral-300 leading-relaxed">
                {product.description || 'No description available.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-900 rounded-lg p-3 border border-neutral-800">
                <p className="text-xs text-neutral-500 mb-1">Serving Size</p>
                <p className="text-sm text-white font-medium">
                  {product.serving_size || 'N/A'} {product.serving_unit || ''}
                </p>
              </div>
              <div className="bg-neutral-900 rounded-lg p-3 border border-neutral-800">
                <p className="text-xs text-neutral-500 mb-1">Recommended</p>
                <p className="text-sm text-white font-medium">
                  {product.recommended_dosage || 'See label'}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Benefits Tab */}
          <TabsContent value="benefits" className="space-y-3 mt-4">
            {product.benefits && product.benefits.length > 0 ? (
              product.benefits.map((benefit, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 bg-neutral-900 rounded-lg p-3 border border-neutral-800"
                >
                  <span className="text-green-400 mt-0.5">✓</span>
                  <p className="text-sm text-neutral-300 flex-1">{benefit}</p>
                </div>
              ))
            ) : (
              <p className="text-neutral-500 text-sm">No benefits information available.</p>
            )}
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research" className="space-y-4 mt-4">
            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
              <p className="text-sm text-neutral-300 leading-relaxed">
                {product.research_summary || 'No research summary available.'}
              </p>
            </div>
          </TabsContent>

          {/* Manufacturer Tab */}
          <TabsContent value="manufacturer" className="space-y-4 mt-4">
            {product.manufacturer_info ? (
              <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 space-y-3">
                {product.manufacturer_info.description && (
                  <p className="text-sm text-neutral-300">
                    {product.manufacturer_info.description}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-800">
                  {product.manufacturer_info.country && (
                    <div>
                      <p className="text-xs text-neutral-500">Country</p>
                      <p className="text-sm text-white">{product.manufacturer_info.country}</p>
                    </div>
                  )}
                  {product.manufacturer_info.founded_year && (
                    <div>
                      <p className="text-xs text-neutral-500">Founded</p>
                      <p className="text-sm text-white">{product.manufacturer_info.founded_year}</p>
                    </div>
                  )}
                </div>

                {product.manufacturer_info.website && (
                  <a 
                    href={product.manufacturer_info.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-400 hover:text-green-300 inline-flex items-center gap-1"
                  >
                    Visit Website →
                  </a>
                )}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm">No manufacturer information available.</p>
            )}
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-green-400" />
                  <p className="text-xs text-neutral-500">Active Users</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {popularity?.userCount || 0}
                </p>
              </div>

              <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <p className="text-xs text-neutral-500">Avg Effectiveness</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {popularity?.avgEffectiveness?.toFixed(1) || '0.0'}/10
                </p>
              </div>
            </div>

            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
              <p className="text-sm text-neutral-400">
                This supplement is being tracked by {popularity?.userCount || 0} user{popularity?.userCount !== 1 ? 's' : ''} in the community.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        {(onAddToStack || onSaveToLibraryOnly || onRate) && (
          <div className="flex gap-3 mt-6">
            {onAddToStack && (
              <Button
                onClick={onAddToStack}
                disabled={!!stackEntry}
                className={`flex-1 ${
                  stackEntry 
                    ? 'bg-neutral-700 cursor-not-allowed' 
                    : 'bg-green-500 hover:bg-green-600 text-black'
                }`}
              >
                {stackEntry ? '✅ Уже в стеке' : '➕ Add to Stack'}
              </Button>
            )}
            {onSaveToLibraryOnly && !stackEntry && (
              <Button
                onClick={onSaveToLibraryOnly}
                variant="outline"
                className="flex-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                📚 Только в библиотеку
              </Button>
            )}
            {onRate && (
              <Button
                variant="outline"
                onClick={onRate}
                className="flex-1 border-neutral-700 hover:border-yellow-500/50 hover:text-yellow-400"
              >
                <Star className="w-4 h-4 mr-2" />
                Rate
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}