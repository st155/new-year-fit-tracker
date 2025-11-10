/**
 * Component Library
 * Development-only page for component documentation and showcase
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Box, 
  Square, 
  Circle, 
  Type,
  Palette,
  Zap,
  Layout
} from 'lucide-react';
import { ButtonShowcase } from '@/components/docs/showcases/ButtonShowcase';
import { CardShowcase } from '@/components/docs/showcases/CardShowcase';
import { FormShowcase } from '@/components/docs/showcases/FormShowcase';
import { FeedbackShowcase } from '@/components/docs/showcases/FeedbackShowcase';
import { DataDisplayShowcase } from '@/components/docs/showcases/DataDisplayShowcase';
import { AnimationShowcase } from '@/components/docs/showcases/AnimationShowcase';

interface Category {
  id: string;
  label: string;
  icon: typeof Box;
}

const categories: Category[] = [
  { id: 'buttons', label: 'Buttons', icon: Square },
  { id: 'cards', label: 'Cards', icon: Box },
  { id: 'forms', label: 'Forms', icon: Type },
  { id: 'feedback', label: 'Feedback', icon: Circle },
  { id: 'data', label: 'Data Display', icon: Palette },
  { id: 'animations', label: 'Animations', icon: Zap },
  { id: 'layout', label: 'Layout', icon: Layout },
];

export default function ComponentLibrary() {
  const [selectedCategory, setSelectedCategory] = useState('buttons');

  const renderShowcase = () => {
    switch (selectedCategory) {
      case 'buttons':
        return <ButtonShowcase />;
      case 'cards':
        return <CardShowcase />;
      case 'forms':
        return <FormShowcase />;
      case 'feedback':
        return <FeedbackShowcase />;
      case 'data':
        return <DataDisplayShowcase />;
      case 'animations':
        return <AnimationShowcase />;
      default:
        return (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            Showcase в разработке...
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Component Library</h1>
          <p className="text-muted-foreground text-lg">
            Elite10 Design System & Component Documentation
          </p>
          <Badge variant="outline" className="mt-3">
            Development Only
          </Badge>
        </header>

        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <aside className="col-span-3">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <nav className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {category.label}
                    </Button>
                  );
                })}
              </nav>
            </ScrollArea>
          </aside>

          {/* Component Showcase */}
          <main className="col-span-9">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {renderShowcase()}
            </ScrollArea>
          </main>
        </div>
      </div>
    </div>
  );
}
