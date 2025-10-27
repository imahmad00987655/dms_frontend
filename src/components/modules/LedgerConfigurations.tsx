import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Ledger {
  id: number;
  name: string;
  type: 'Primary' | 'Secondary' | 'Subsidiary';
  currency: string;
  coa: string;
  method: 'Accrual' | 'Cash';
  arApEnabled: boolean;
  status: 'Active' | 'Inactive';
  created_at: string;
}


const LedgerConfigurations = () => {
  const { toast } = useToast();
  
  const [ledgers, setLedgers] = useState<Ledger[]>([
    {
      id: 1,
      name: "Primary Distribution Ledger",
      type: "Primary",
      currency: "USD",
      coa: "Distribution CoA",
      method: "Accrual",
      arApEnabled: true,
      status: "Active",
      created_at: "2024-01-01T00:00:00Z"
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [ledgerForm, setLedgerForm] = useState({
    name: "Primary Distribution Ledger",
    type: "Primary" as 'Primary' | 'Secondary' | 'Subsidiary',
    currency: "USD",
    coa: "Distribution CoA",
    method: "Accrual" as 'Accrual' | 'Cash'
  });

  const handleCreateLedger = async () => {
    if (!ledgerForm.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const newLedger: Ledger = {
        id: Date.now(),
        ...ledgerForm,
        arApEnabled: true,
        status: "Active",
        created_at: new Date().toISOString()
      };
      
      setLedgers([...ledgers, newLedger]);
      setShowCreateModal(false);
      resetLedgerForm();
      
      toast({
        title: "Success",
        description: "Ledger created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ledger. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetLedgerForm = () => {
    setLedgerForm({
      name: "",
      type: "Primary",
      currency: "USD",
      coa: "Distribution CoA",
      method: "Accrual"
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Primary':
        return 'bg-green-100 text-green-800';
      case 'Secondary':
        return 'bg-blue-100 text-blue-800';
      case 'Subsidiary':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ledger Configurations</h1>
          <p className="text-gray-600 mt-2">Manage accounting ledgers and transaction flows</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Ledger
        </Button>
      </div>

      <Card className="bg-white shadow-lg">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Ledger Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Currency</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">CoA</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Method</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">AR/AP Enabled</th>
                </tr>
              </thead>
              <tbody>
                {ledgers.map((ledger) => (
                  <tr key={ledger.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{ledger.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className={getTypeColor(ledger.type)}>
                        {ledger.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{ledger.currency}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{ledger.coa}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{ledger.method}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Enabled
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create New Ledger Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Ledger</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              <CardDescription>Configure a new accounting ledger</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ledger-name">Ledger Name *</Label>
                <Input
                  id="ledger-name"
                  value={ledgerForm.name}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, name: e.target.value })}
                  placeholder="Primary Distribution Ledger"
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={ledgerForm.type} onValueChange={(value: 'Primary' | 'Secondary' | 'Subsidiary') => setLedgerForm({ ...ledgerForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                    <SelectItem value="Subsidiary">Subsidiary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={ledgerForm.currency} onValueChange={(value) => setLedgerForm({ ...ledgerForm, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="coa">Chart of Accounts</Label>
                <Select value={ledgerForm.coa} onValueChange={(value) => setLedgerForm({ ...ledgerForm, coa: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Distribution CoA">Distribution CoA</SelectItem>
                    <SelectItem value="Standard CoA">Standard CoA</SelectItem>
                    <SelectItem value="Custom CoA">Custom CoA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="method">Accounting Method</Label>
                <Select value={ledgerForm.method} onValueChange={(value: 'Accrual' | 'Cash') => setLedgerForm({ ...ledgerForm, method: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Accrual">Accrual</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateLedger}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Ledger'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
};

export default LedgerConfigurations;
