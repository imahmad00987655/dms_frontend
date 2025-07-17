import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Save } from "lucide-react";
import apiService from '@/services/api';
import type { InventoryItem } from "@/components/dashboard/InventoryDashboard";

export const InventoryItemForm = ({ onClose, onSave }: { onClose: () => void, onSave?: (item: InventoryItem) => void }) => {
  const [itemData, setItemData] = useState<InventoryItem>({
    item_code: "",
    item_name: "",
    description: "",
    category: "",
    quantity: 0,
    unit_price: 0,
    location: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = [
    "Electronics",
    "Furniture", 
    "Accessories",
    "Office Supplies",
    "Equipment",
    "Software"
  ];

  const locations = [
    "Warehouse A",
    "Warehouse B", 
    "Warehouse C",
    "Main Store",
    "Storage Room"
  ];

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    const newItem: InventoryItem = {
      ...itemData,
    };
    try {
      await apiService.createInventoryItem(newItem);
      setSuccess("Item saved successfully!");
      if (onSave) {
        onSave(newItem);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save item";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Add New Inventory Item
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              placeholder="Enter item name"
              value={itemData.item_name}
              onChange={(e) => setItemData({...itemData, item_name: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              placeholder="Enter SKU"
              value={itemData.item_code}
              onChange={(e) => setItemData({...itemData, item_code: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <Select
              value={itemData.category}
              onValueChange={(value) => setItemData({...itemData, category: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <Select
              value={itemData.location}
              onValueChange={(value) => setItemData({...itemData, location: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={itemData.quantity}
              onChange={(e) => setItemData({...itemData, quantity: parseInt(e.target.value) || 0})}
            />
          </div>
          <div>
            <Label htmlFor="unitCost">Unit Cost ($)</Label>
            <Input
              id="unitCost"
              type="number"
              min="0"
              step="0.01"
              value={itemData.unit_price}
              onChange={(e) => setItemData({...itemData, unit_price: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter item description"
            value={itemData.description}
            onChange={(e) => setItemData({...itemData, description: e.target.value})}
            rows={3}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2" disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Item"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
