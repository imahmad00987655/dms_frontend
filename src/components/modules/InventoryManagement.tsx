import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Package, BarChart3, Filter } from "lucide-react";
import { InventoryItemForm } from "@/components/forms/InventoryItemForm";
import { BinCardForm } from "@/components/forms/BinCardForm";
import { InventoryDashboard } from "@/components/dashboard/InventoryDashboard";
import apiService from "@/services/api";

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

export const InventoryManagement = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBinCardForm, setShowBinCardForm] = useState(false);

  // Fetch inventory from backend
  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getInventoryItems();
      setInventory(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filtering logic
  const categories = Array.from(new Set(inventory.map(item => item.category).filter(Boolean)));
  const filteredInventory = inventory.filter(item => {
    const matchesSearch =
      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Summary calculations
  const totalValue = inventory.reduce(
    (sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)),
    0
  );
  const lowStockItems = inventory.filter(item => (Number(item.quantity) || 0) <= 10).length;

  if (showAddForm) {
    return (
      <InventoryItemForm
        onClose={() => setShowAddForm(false)}
        onSave={() => {
          setShowAddForm(false);
          fetchInventory();
        }}
      />
    );
  }
  if (showBinCardForm) {
    return <BinCardForm onClose={() => setShowBinCardForm(false)} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Manage and track your inventory items with tiered pricing</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowBinCardForm(true)} variant="outline" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Bin Card
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <InventoryDashboard items={inventory} loading={loading} error={error} />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
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
                <div className="text-2xl font-bold">{filteredInventory.length}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {categoryFilter !== "all" ? `in ${categoryFilter}` : "total items"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <Package className="w-4 h-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{lowStockItems}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading...</div>
              ) : error ? (
                <div className="text-red-600">{error}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Item</th>
                        <th className="text-left py-3 px-4 font-semibold">SKU</th>
                        <th className="text-left py-3 px-4 font-semibold">Category</th>
                        <th className="text-left py-3 px-4 font-semibold">Quantity</th>
                        <th className="text-left py-3 px-4 font-semibold">Unit Price</th>
                        <th className="text-left py-3 px-4 font-semibold">Total Value</th>
                        <th className="text-left py-3 px-4 font-semibold">Location</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item) => {
                        const totalValue = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                        const isLowStock = (Number(item.quantity) || 0) <= 10;
                        return (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium">{item.item_name}</div>
                                <div className="text-sm text-gray-500">{item.item_code}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">{item.item_code}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{item.category}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{item.quantity}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-blue-600">${Number(item.unit_price).toFixed(2)}</div>
                            </td>
                            <td className="py-3 px-4">${totalValue.toLocaleString()}</td>
                            <td className="py-3 px-4">{item.location}</td>
                            <td className="py-3 px-4">
                              <Badge variant={isLowStock ? "destructive" : "default"}>
                                {isLowStock ? "Low Stock" : "In Stock"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
