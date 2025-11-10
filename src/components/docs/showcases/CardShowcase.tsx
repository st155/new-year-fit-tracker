/**
 * Card Showcase
 * Documentation and examples for Card component
 */

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ComponentSection } from '../ComponentSection';

export function CardShowcase() {
  return (
    <div className="space-y-8">
      <ComponentSection
        title="Basic Card"
        description="Standard card with header, content, and footer sections"
        examples={[
          {
            label: 'Simple Card',
            component: (
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>Card description</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Card content goes here</p>
                </CardContent>
                <CardFooter>
                  <Button size="sm">Action</Button>
                </CardFooter>
              </Card>
            ),
          },
        ]}
        code={`<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>`}
        bestPractices={[
          'Используйте CardHeader для заголовков',
          'CardFooter для действий (кнопки)',
          'Не забывайте CardDescription для пояснений',
        ]}
      />

      <ComponentSection
        title="Card Variants"
        description="Different card styles and treatments"
        examples={[
          {
            label: 'With Badge',
            component: (
              <Card className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Premium</CardTitle>
                    <Badge>New</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Special features</p>
                </CardContent>
              </Card>
            ),
          },
        ]}
        code={`<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Premium</CardTitle>
      <Badge>New</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
</Card>`}
      />
    </div>
  );
}
