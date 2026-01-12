/**
 * Button Showcase
 * Documentation and examples for Button component
 */

import { Button } from '@/components/ui/button';
import { Plus, Download, Trash2 } from 'lucide-react';
import { ComponentSection } from '../ComponentSection';
import { useTranslation } from 'react-i18next';

export function ButtonShowcase() {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-8">
      <ComponentSection
        title="Button Variants"
        description="Available button styles with different visual treatments"
        examples={[
          { label: 'Default', component: <Button>Default</Button> },
          { label: 'Fitness', component: <Button variant="fitness">Fitness</Button> },
          { label: 'Success', component: <Button variant="success">Success</Button> },
        ]}
        code={`<Button variant="default">Default</Button>
<Button variant="fitness">Fitness</Button>
<Button variant="success">Success</Button>`}
        bestPractices={[
          t('docs.buttonBestPractices.useFitness'),
          t('docs.buttonBestPractices.useSuccess'),
          t('docs.buttonBestPractices.useDestructive'),
        ]}
      />

      <ComponentSection
        title={t('docs.buttonVariantsContinued')}
        examples={[
          { label: 'Destructive', component: <Button variant="destructive">Delete</Button> },
          { label: 'Outline', component: <Button variant="outline">Outline</Button> },
          { label: 'Ghost', component: <Button variant="ghost">Ghost</Button> },
        ]}
        code={`<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>`}
      />

      <ComponentSection
        title="Button Sizes"
        description="Different button sizes for various contexts"
        examples={[
          { label: 'Small', component: <Button size="sm">Small</Button> },
          { label: 'Default', component: <Button>Default</Button> },
          { label: 'Large', component: <Button size="lg">Large</Button> },
        ]}
        code={`<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>`}
      />

      <ComponentSection
        title="Button with Icons"
        description="Buttons can include icons for better visual communication"
        examples={[
          { 
            label: 'Icon Left', 
            component: <Button><Plus className="mr-2 h-4 w-4" />Create</Button> 
          },
          { 
            label: 'Icon Right', 
            component: <Button>Download<Download className="ml-2 h-4 w-4" /></Button> 
          },
          { 
            label: 'Icon Only', 
            component: <Button size="icon"><Trash2 className="h-4 w-4" /></Button> 
          },
        ]}
        code={`<Button>
  <Plus className="mr-2 h-4 w-4" />
  Create
</Button>

<Button>
  Download
  <Download className="ml-2 h-4 w-4" />
</Button>

<Button size="icon">
  <Trash2 className="h-4 w-4" />
</Button>`}
        bestPractices={[
          t('docs.buttonBestPractices.iconsLeft'),
          t('docs.buttonBestPractices.iconsRight'),
          t('docs.buttonBestPractices.iconOnlyAria'),
        ]}
      />

      <ComponentSection
        title="Button States"
        description="Different states for user feedback"
        examples={[
          { label: 'Disabled', component: <Button disabled>Disabled</Button> },
          { label: 'Loading', component: <Button loading>Loading</Button> },
          { label: 'Normal', component: <Button>Normal</Button> },
        ]}
        code={`<Button disabled>Disabled</Button>
<Button loading>Loading</Button>
<Button>Normal</Button>`}
        bestPractices={[
          t('docs.buttonBestPractices.useLoadingState'),
          t('docs.buttonBestPractices.disabledTooltip'),
        ]}
      />
    </div>
  );
}
