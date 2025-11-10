/**
 * Form Components Showcase
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FormShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Form Components</h2>
        <p className="text-muted-foreground">Form inputs, controls, and validation states</p>
      </div>

      {/* Input Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Input Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default">Default Input</Label>
            <Input id="default" placeholder="Enter text..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="disabled">Disabled Input</Label>
            <Input id="disabled" placeholder="Disabled..." disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="error">Error State</Label>
            <Input 
              id="error" 
              placeholder="Invalid value" 
              className="border-destructive focus-visible:ring-destructive"
            />
            <p className="text-sm text-destructive">This field is required</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="success">Success State</Label>
            <Input 
              id="success" 
              placeholder="Valid value" 
              className="border-success focus-visible:ring-success"
            />
            <p className="text-sm text-success">Looks good!</p>
          </div>
        </CardContent>
      </Card>

      {/* Textarea */}
      <Card>
        <CardHeader>
          <CardTitle>Textarea</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="textarea">Description</Label>
            <Textarea 
              id="textarea" 
              placeholder="Enter your description here..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Select */}
      <Card>
        <CardHeader>
          <CardTitle>Select Dropdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Choose an option</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
                <SelectItem value="option3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Checkbox Group */}
      <Card>
        <CardHeader>
          <CardTitle>Checkbox Group</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="check1" />
              <Label htmlFor="check1" className="cursor-pointer">
                Option 1
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="check2" />
              <Label htmlFor="check2" className="cursor-pointer">
                Option 2
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="check3" disabled />
              <Label htmlFor="check3" className="cursor-not-allowed opacity-50">
                Disabled Option
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radio Group */}
      <Card>
        <CardHeader>
          <CardTitle>Radio Group</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup defaultValue="option1" className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="option1" id="radio1" />
              <Label htmlFor="radio1" className="cursor-pointer">
                Option 1
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="option2" id="radio2" />
              <Label htmlFor="radio2" className="cursor-pointer">
                Option 2
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="option3" id="radio3" />
              <Label htmlFor="radio3" className="cursor-pointer">
                Option 3
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Switch */}
      <Card>
        <CardHeader>
          <CardTitle>Switch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="switch1" className="cursor-pointer">
              Enable notifications
            </Label>
            <Switch id="switch1" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="switch2" className="cursor-pointer">
              Enable dark mode
            </Label>
            <Switch id="switch2" />
          </div>
          <div className="flex items-center justify-between opacity-50">
            <Label htmlFor="switch3" className="cursor-not-allowed">
              Disabled option
            </Label>
            <Switch id="switch3" disabled />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Form Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button>Submit</Button>
            <Button variant="secondary">Save Draft</Button>
            <Button variant="outline">Cancel</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}