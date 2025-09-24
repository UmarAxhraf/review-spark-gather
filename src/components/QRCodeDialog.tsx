import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface QRCodeDialogProps {
  qrCode: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

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

export function QRCodeDialog({ qrCode, isOpen, onClose, onUpdate }: QRCodeDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    is_active: true
  });

  useEffect(() => {
    if (qrCode && isOpen) {
      setFormData({
        name: qrCode.name || '',
        description: qrCode.description || '',
        category_id: qrCode.category_id || '',
        is_active: qrCode.is_active ?? true
      });
      
      // Load existing tags
      if (qrCode.qr_code_tags) {
        setSelectedTags(qrCode.qr_code_tags.map((qt: any) => qt.tag_id));
      }
    }
  }, [qrCode, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchTags();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color')
        .eq('company_id', user.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTags = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name, color')
        .eq('company_id', user.id)
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCode?.id) return;

    setLoading(true);
    try {
      // Update QR code
      const { error: updateError } = await supabase
        .from('qr_codes')
        .update({
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id || null,
          is_active: formData.is_active
        })
        .eq('id', qrCode.id);

      if (updateError) throw updateError;

      // Update tags
      // First, remove existing tags
      const { error: deleteError } = await supabase
        .from('qr_code_tags')
        .delete()
        .eq('qr_code_id', qrCode.id);

      if (deleteError) throw deleteError;

      // Then add new tags
      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map(tagId => ({
          qr_code_id: qrCode.id,
          tag_id: tagId
        }));

        const { error: insertError } = await supabase
          .from('qr_code_tags')
          .insert(tagInserts);

        if (insertError) throw insertError;
      }

      toast.success('QR code updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating QR code:', error);
      toast.error('Failed to update QR code');
    } finally {
      setLoading(false);
    }
  };

  const renderSelectedTags = () => {
    const selected = tags.filter(tag => selectedTags.includes(tag.id));
    
    if (selected.length === 0) {
      return <p className="text-sm text-muted-foreground">No tags selected</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {selected.map(tag => (
          <Badge 
            key={tag.id} 
            variant="secondary"
            style={{ backgroundColor: tag.color, color: 'white' }}
            className="cursor-pointer"
            onClick={() => handleTagToggle(tag.id)}
          >
            {tag.name}
            <X className="w-3 h-3 ml-1" />
          </Badge>
        ))}
      </div>
    );
  };

  const renderAvailableTags = () => {
    const available = tags.filter(tag => !selectedTags.includes(tag.id));
    
    if (available.length === 0) {
      return <p className="text-sm text-muted-foreground">All tags selected</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {available.map(tag => (
          <Badge 
            key={tag.id} 
            variant="outline"
            className="cursor-pointer hover:bg-gray-100"
            onClick={() => handleTagToggle(tag.id)}
          >
            {tag.name}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit QR Code</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="QR Code name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="QR Code description"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Tags</Label>
            
            <div>
              <Label className="text-sm font-medium">Selected Tags:</Label>
              {renderSelectedTags()}
            </div>
            
            <div>
              <Label className="text-sm font-medium">Available Tags:</Label>
              {renderAvailableTags()}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update QR Code'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
