import React, { useState, useEffect } from "react";
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
  ledger_name: string;
  ledger_type: 'PRIMARY' | 'SECONDARY' | 'SUBSIDIARY';
  currency: string;
  coa_instance_id: number;
  coa_code?: string;
  coa_name?: string;
  accounting_method: 'ACCRUAL' | 'CASH';
  ar_ap_enabled: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

interface CoAInstance {
  id: number;
  coa_code: string;
  coa_name: string;
}

const API_BASE_URL = 'http://localhost:5000/api';

const LedgerConfigurations = () => {
  const { toast } = useToast();
  
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [coaInstances, setCoaInstances] = useState<CoAInstance[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const [ledgerForm, setLedgerForm] = useState({
    name: "",
    type: "PRIMARY" as 'PRIMARY' | 'SECONDARY' | 'SUBSIDIARY',
    currency: "USD",
    coa_instance_id: "",
    method: "ACCRUAL" as 'ACCRUAL' | 'CASH',
    ar_ap_enabled: true
  });

  // Fetch ledgers from API
  const fetchLedgers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chart-of-accounts/ledgers`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setLedgers(result.data);
      }
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ledgers",
        variant: "destructive"
      });
    } finally {
      setFetchingData(false);
    }
  };

  // Fetch CoA instances from API
  const fetchCoAInstances = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chart-of-accounts/instances`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setCoaInstances(result.data);
      }
    } catch (error) {
      console.error('Error fetching CoA instances:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      await fetchLedgers();
      await fetchCoAInstances();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateLedger = async () => {
    if (!ledgerForm.name || !ledgerForm.coa_instance_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chart-of-accounts/ledgers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ledger_name: ledgerForm.name,
          ledger_type: ledgerForm.type,
          currency: ledgerForm.currency,
          coa_instance_id: parseInt(ledgerForm.coa_instance_id),
          accounting_method: ledgerForm.method,
          ar_ap_enabled: ledgerForm.ar_ap_enabled,
          created_by: 1
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchLedgers(); // Refresh the list
        setShowCreateModal(false);
        resetLedgerForm();
        
        toast({
          title: "Success",
          description: "Ledger created successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to create ledger');
      }
    } catch (error) {
      console.error('Error creating ledger:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ledger. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetLedgerForm = () => {
    setLedgerForm({
      name: "",
      type: "PRIMARY",
      currency: "USD",
      coa_instance_id: "",
      method: "ACCRUAL",
      ar_ap_enabled: true
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PRIMARY':
      case 'Primary':
        return 'bg-green-100 text-green-800';
      case 'SECONDARY':
      case 'Secondary':
        return 'bg-blue-100 text-blue-800';
      case 'SUBSIDIARY':
      case 'Subsidiary':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTypeDisplay = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
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
                {fetchingData ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      <p className="text-gray-500 mt-2">Loading ledgers...</p>
                    </td>
                  </tr>
                ) : ledgers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No ledgers found. Create your first ledger to get started.
                    </td>
                  </tr>
                ) : (
                  ledgers.map((ledger) => (
                    <tr key={ledger.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{ledger.ledger_name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className={getTypeColor(ledger.ledger_type)}>
                          {formatTypeDisplay(ledger.ledger_type)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{ledger.currency}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {ledger.coa_name || ledger.coa_code || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatTypeDisplay(ledger.accounting_method)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant="secondary" 
                          className={ledger.ar_ap_enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                        >
                          {ledger.ar_ap_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
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
                  placeholder="Enter ledger name"
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={ledgerForm.type} onValueChange={(value: 'PRIMARY' | 'SECONDARY' | 'SUBSIDIARY') => setLedgerForm({ ...ledgerForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIMARY">Primary</SelectItem>
                    <SelectItem value="SECONDARY">Secondary</SelectItem>
                    <SelectItem value="SUBSIDIARY">Subsidiary</SelectItem>
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
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="coa">Chart of Accounts *</Label>
                <Select value={ledgerForm.coa_instance_id} onValueChange={(value) => setLedgerForm({ ...ledgerForm, coa_instance_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select CoA Instance" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaInstances.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500 text-center">
                        No CoA instances available. Please create one first.
                      </div>
                    ) : (
                      coaInstances.map((coa) => (
                        <SelectItem key={coa.id} value={coa.id.toString()}>
                          {coa.coa_name} ({coa.coa_code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="method">Accounting Method</Label>
                <Select value={ledgerForm.method} onValueChange={(value: 'ACCRUAL' | 'CASH') => setLedgerForm({ ...ledgerForm, method: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCRUAL">Accrual</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
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
