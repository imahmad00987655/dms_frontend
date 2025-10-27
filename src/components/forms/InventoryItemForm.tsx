import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Save } from "lucide-react";
import apiService from '@/services/api';
import type { InventoryItem } from "@/components/dashboard/InventoryDashboard";

interface Supplier {
  supplier_id: number;
  supplier_name: string;
  supplier_number: string;
  supplier_type: string;
}

export const InventoryItemForm = ({ onClose, onSave }: { onClose: () => void, onSave?: (item: InventoryItem) => void }) => {
  const [itemData, setItemData] = useState<InventoryItem>({
    item_code: "",
    item_name: "",
    description: "",
    category: "",
    location: "",
    brand: "",
    supplier_id: undefined,
    barcode: "",
    item_purchase_rate: 0,
    item_sell_price: 0,
    tax_status: "",
    uom_type: "",
    box_quantity: 0,
    uom_type_detail: 0
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
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

  const taxStatuses = [
    "Taxable",
    "Non-Taxable",
    "Exempt"
  ];

  // Fetch suppliers on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const suppliersData = await apiService.getSuppliers();
        // Filter suppliers to only show those with type "Vendor"
        const vendorSuppliers = suppliersData.filter(supplier => 
          supplier.supplier_type && supplier.supplier_type.toLowerCase() === 'vendor'
        );
        setSuppliers(vendorSuppliers);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        setError('Failed to load suppliers');
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    
    // Prepare the item data, sending supplier_id as brand
    const newItem: InventoryItem = {
      ...itemData,
      brand: itemData.supplier_id?.toString() || '', // Store supplier_id as brand
      supplier_id: undefined // Remove supplier_id from the payload
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
    <div className="space-y-4">
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}
        
        {/* Basic Information */}
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
            <Label htmlFor="supplier">Brand (Company Name)</Label>
            <Select
              value={itemData.supplier_id?.toString() || ""}
              onValueChange={(value) => setItemData({...itemData, supplier_id: value ? parseInt(value) : undefined})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Brand" />
              </SelectTrigger>
              <SelectContent>
                {loadingSuppliers ? (
                  <SelectItem value="loading" disabled>
                    Loading suppliers...
                  </SelectItem>
                ) : suppliers.length > 0 ? (
                  suppliers.map(supplier => (
                    <SelectItem key={supplier.supplier_id} value={supplier.supplier_id.toString()}>
                      {supplier.supplier_name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-suppliers" disabled>
                    No Brands available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="itemCode">SKU</Label>
            <Input
              id="itemCode"
              placeholder="Enter SKU"
              value={itemData.item_code}
              onChange={(e) => setItemData({...itemData, item_code: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="barcode">Barcode (Company Product Code)</Label>
            <Input
              id="barcode"
              placeholder="Enter barcode"
              value={itemData.barcode}
              onChange={(e) => setItemData({...itemData, barcode: e.target.value})}
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

        {/* Pricing Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="purchaseRate">Item Purchase Rate ($)</Label>
            <Input
              id="purchaseRate"
              type="number"
              min="0"
              step="0.01"
              value={itemData.item_purchase_rate}
              onChange={(e) => setItemData({...itemData, item_purchase_rate: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <Label htmlFor="sellPrice">Item Sell Price ($)</Label>
            <Input
              id="sellPrice"
              type="number"
              min="0"
              step="0.01"
              value={itemData.item_sell_price}
              onChange={(e) => setItemData({...itemData, item_sell_price: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <Label>Tax Status</Label>
            <Select
              value={itemData.tax_status}
              onValueChange={(value) => setItemData({...itemData, tax_status: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tax status" />
              </SelectTrigger>
              <SelectContent>
                {taxStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* UOM Section */}
        <div className="space-y-4">
          <Label>UOM (Unit of Measurement)</Label>
          
          {/* Boxes Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="boxes">Number of Boxes</Label>
              <Input
                id="boxes"
                type="number"
                min="0"
                step="1"
                placeholder="Enter number of boxes"
                value={itemData.box_quantity}
                onChange={(e) => setItemData({...itemData, box_quantity: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>UOM Type</Label>
              <Select
                value={itemData.uom_type}
                onValueChange={(value) => setItemData({...itemData, uom_type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select UOM type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PCS">PCS</SelectItem>
                  <SelectItem value="Bottles">Bottles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Conditional Input for UOM Type Detail */}
          {itemData.uom_type && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="uomTypeDetail">
                  Value ({itemData.uom_type === "PCS" ? "Kilograms" : "Liters"})
                </Label>
                <Input
                  id="uomTypeDetail"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Enter ${itemData.uom_type === "PCS" ? "kilograms" : "liters"}`}
                  value={itemData.uom_type_detail || 0}
                  onChange={(e) => setItemData({...itemData, uom_type_detail: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          )}
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
      </div>
    );
};
