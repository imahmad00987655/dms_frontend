import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, AlertTriangle } from "lucide-react";
import { InventoryItemForm } from "@/components/forms/InventoryItemForm";
import { useState } from "react";

export interface InventoryItem {
  id?: number;
  item_code: string;
  item_name: string;
  description?: string;
  category?: string;
  quantity?: number;
  unit_price?: number;
  location?: string;
}

type LocationSummary = {
  totalValue: number;
  status: "Low Stock" | "In Stock";
};

type GroupedData = {
  [category: string]: {
    [location: string]: LocationSummary;
  };
};

export const InventoryDashboard = ({
  items,
  loading,
  error,
}: {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
}) => {
  const [showForm, setShowForm] = useState(false);

  // Group by category, then by location
  const grouped: GroupedData = {};
  items.forEach((item) => {
    const category = item.category || "Uncategorized";
    const location = item.location || "Unknown";
    const value = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const isLowStock = (Number(item.quantity) || 0) <= 10;

    if (!grouped[category]) grouped[category] = {};
    if (!grouped[category][location]) {
      grouped[category][location] = { totalValue: 0, status: "In Stock" };
    }
    grouped[category][location].totalValue += value;
    if (isLowStock) grouped[category][location].status = "Low Stock";
  });

  const totalValue = items.reduce(
    (sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)),
    0
  );
  const lowStockItems = items.filter(item => (Number(item.quantity) || 0) <= 10).length;

  if (showForm) {
  return (
      <div className="p-4">
        <InventoryItemForm
          onClose={() => setShowForm(false)}
          onSave={() => setShowForm(false)}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading inventory summary...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 text-center">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <Package className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(grouped).map(([category, locations]) => (
          <Card key={category} className="shadow-lg">
            <CardHeader>
              <CardTitle>
                <Badge variant="outline" className="text-base px-3 py-1">{category}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(locations).map(([location, data]) => (
                  <div
                    key={location}
                    className="flex items-center justify-between border-b last:border-b-0 pb-2 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">{location}</div>
                      <div className="text-xs text-gray-500">Total Value</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-blue-700 font-bold">
                        ${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <Badge
                        variant={data.status === "Low Stock" ? "destructive" : "default"}
                        className={data.status === "Low Stock" ? "bg-red-600 text-white" : "bg-green-600 text-white"}
                      >
                        {data.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
    </div>
  );
}; 