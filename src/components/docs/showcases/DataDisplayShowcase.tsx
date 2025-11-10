/**
 * Data Display Components Showcase
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Info, TrendingUp, Users, Target, Flame } from 'lucide-react';

export function DataDisplayShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Data Display Components</h2>
        <p className="text-muted-foreground">Badges, avatars, tooltips, and data visualization</p>
      </div>

      {/* Badge Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Basic Variants</p>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Status Badges</p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-success">Success</Badge>
              <Badge className="bg-warning">Warning</Badge>
              <Badge className="bg-info">Info</Badge>
              <Badge className="bg-muted">Muted</Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">With Icons</p>
            <div className="flex flex-wrap gap-2">
              <Badge className="gap-1">
                <Flame className="h-3 w-3" />
                5 day streak
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Target className="h-3 w-3" />
                Goal achieved
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                Team
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avatar Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Avatar Sizes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback>SM</AvatarFallback>
            </Avatar>
            <Avatar className="h-10 w-10">
              <AvatarFallback>MD</AvatarFallback>
            </Avatar>
            <Avatar className="h-12 w-12">
              <AvatarFallback>LG</AvatarFallback>
            </Avatar>
            <Avatar className="h-16 w-16">
              <AvatarFallback>XL</AvatarFallback>
            </Avatar>
          </div>
        </CardContent>
      </Card>

      {/* Tooltip Positioning */}
      <Card>
        <CardHeader>
          <CardTitle>Tooltip Positioning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center justify-center py-8">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help">
                    <Info className="h-3 w-3 mr-1" />
                    Hover me (top)
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>This is a top tooltip</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help">
                    <Info className="h-3 w-3 mr-1" />
                    Hover me (right)
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>This is a right tooltip</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help">
                    <Info className="h-3 w-3 mr-1" />
                    Hover me (bottom)
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>This is a bottom tooltip</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help">
                    <Info className="h-3 w-3 mr-1" />
                    Hover me (left)
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>This is a left tooltip</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Stats Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Habits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">24</div>
                  <Badge className="bg-success gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +12%
                  </Badge>
                </div>
                <Progress value={75} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">87%</div>
                  <Badge className="bg-success gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +5%
                  </Badge>
                </div>
                <Progress value={87} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">14 days</div>
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Best: 28 days
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Card Variations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Card with Description</CardTitle>
            <CardDescription>
              This is a card description that provides additional context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Card content goes here
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-primary text-primary-foreground">
          <CardHeader>
            <CardTitle>Highlighted Card</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Special card with gradient background
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Important information or featured content
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}