import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface CategoryTagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'category' | 'tag';
  item?: Category | Tag | null;
  onSave: (name: string, description: string, color: string) => void;
  onUpdate?: (id: string, name: string, description: string, color: string) => void;
}

const defaultColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export function CategoryTagFormDialog({
  open,
  onOpenChange,
  type,
  item,
  onSave,
  onUpdate,
}: CategoryTagFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(defaultColors[0]);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setColor(item.color);
    } else {
      setName('');
      setDescription('');
      setColor(defaultColors[0]);
    }
  }, [item, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    if (item && onUpdate) {
      onUpdate(item.id, name.trim(), description.trim(), color);
    } else {
      onSave(name.trim(), description.trim(), color);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit' : 'Create'} {type === 'category' ? 'Category' : 'Tag'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${type} name`}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Enter ${type} description`}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {defaultColors.map(colorOption => (
                <button
                  key={colorOption}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === colorOption ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                />
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {item ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}