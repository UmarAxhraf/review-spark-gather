import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Employee {
  id: string;
  name: string;
  category_id?: string;
  employee_tags?: { tag_id: string }[];
}

interface AssignCategoryTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  categories: Category[];
  tags: Tag[];
  onAssignCategory: (employeeId: string, categoryId: string | null) => void;
  onAssignTags: (employeeId: string, tagIds: string[]) => void;
}

export function AssignCategoryTagDialog({
  open,
  onOpenChange,
  employee,
  categories,
  tags,
  onAssignCategory,
  onAssignTags,
}: AssignCategoryTagDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (employee) {
      setSelectedCategoryId(employee.category_id || null);
      setSelectedTagIds(employee.employee_tags?.map(et => et.tag_id) || []);
    }
  }, [employee]);

  const handleSave = () => {
    if (!employee) return;
    
    onAssignCategory(employee.id, selectedCategoryId);
    onAssignTags(employee.id, selectedTagIds);
    onOpenChange(false);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const removeTag = (tagId: string) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Assign Category & Tags to {employee?.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select 
              value={selectedCategoryId || "none"} 
              onValueChange={(value) => setSelectedCategoryId(value === "none" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tag Selection */}
          <div className="space-y-2">
            <Label>Tags</Label>
            
            {/* Selected Tags */}
            {selectedTagIds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border rounded">
                {selectedTagIds.map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  
                  return (
                    <Badge 
                      key={tagId} 
                      style={{ backgroundColor: tag.color }}
                      className="text-white"
                    >
                      {tag.name}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 ml-1 hover:bg-white/20"
                        onClick={() => removeTag(tagId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}
            
            {/* Available Tags */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Available Tags</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {tags.filter(tag => !selectedTagIds.includes(tag.id)).map(tag => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    style={{ borderColor: tag.color, color: tag.color }}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}