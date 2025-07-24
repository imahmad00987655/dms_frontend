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
import { X, ArrowLeft, Check } from "lucide-react";
import apiService from "@/services/api";
import { toast } from "sonner";

interface APInvoice {
  invoice_id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'CANCELLED' | 'VOID';
}

interface APSupplier {
  supplier_id: number;
  supplier_number: string;
  supplier_name: string;
  supplier_type: 'VENDOR' | 'CONTRACTOR' | 'SERVICE_PROVIDER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface PaymentApplication {
  invoice_id: number;
  invoice_number: string;
  amount_due: number;
  application_amount: number;
}

interface APPaymentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  selectedInvoice?: APInvoice | null;
}

export const APPaymentForm = ({ onClose, onSuccess, selectedInvoice }: APPaymentFormProps) => {
  const [formData, setFormData] = useState({
    supplier_id: selectedInvoice?.supplier_id.toString() || "",
    payment_number: "",
    payment_date: new Date().toISOString().split('T')[0],
    currency_code: "USD",
    exchange_rate: 1.0,
    payment_amount: 0,
    payment_method: "",
    bank_account: "",
    reference_number: "",
    status: "DRAFT" as const,
    notes: ""
  });

  const [suppliers, setSuppliers] = useState<APSupplier[]>([]);
  const [invoices, setInvoices] = useState<APInvoice[]>([]);
  const [applications, setApplications] = useState<PaymentApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Set payment amount when applications change
  useEffect(() => {
    const totalApplied = applications.reduce((sum, app) => sum + app.application_amount, 0);
    setFormData(prev => ({ ...prev, payment_amount: totalApplied }));
  }, [applications]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      
      // Load suppliers
      const suppliersData = await apiService.getAPSuppliers();
      setSuppliers(suppliersData);

      // If we have a selected invoice, load its data
      if (selectedInvoice) {
        setFormData(prev => ({
          ...prev,
          supplier_id: selectedInvoice.supplier_id.toString(),
          payment_amount: selectedInvoice.amount_due
        }));
        
        // Load invoices for this supplier
        await loadSupplierInvoices(selectedInvoice.supplier_id);
        
        // Pre-select the invoice for payment
        setApplications([{
          invoice_id: selectedInvoice.invoice_id,
          invoice_number: selectedInvoice.invoice_number,
          amount_due: selectedInvoice.amount_due,
          application_amount: selectedInvoice.amount_due
        }]);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const loadSupplierInvoices = async (supplierId: number) => {
    try {
      const invoicesData = await apiService.getAPInvoices({ supplier_id: supplierId });
      // Filter for open invoices with amounts due
      const openInvoices = invoicesData.filter(inv => 
        inv.status === 'OPEN' && inv.amount_due > 0
      );
      setInvoices(openInvoices);
    } catch (error) {
      console.error('Error loading supplier invoices:', error);
      toast.error('Failed to load supplier invoices');
    }
  };

  const handleSupplierChange = async (supplierId: string) => {
    setFormData(prev => ({ ...prev, supplier_id: supplierId }));
    setApplications([]);
    
    if (supplierId) {
      await loadSupplierInvoices(parseInt(supplierId));
    } else {
      setInvoices([]);
    }
  };

  const addInvoiceApplication = (invoice: APInvoice) => {
    const existingApp = applications.find(app => app.invoice_id === invoice.invoice_id);
    if (existingApp) {
      toast.error('This invoice is already selected for payment');
      return;
    }

    setApplications([...applications, {
      invoice_id: invoice.invoice_id,
      invoice_number: invoice.invoice_number,
      amount_due: invoice.amount_due,
      application_amount: invoice.amount_due
    }]);
  };

  const removeApplication = (invoiceId: number) => {
    setApplications(applications.filter(app => app.invoice_id !== invoiceId));
  };

  const updateApplicationAmount = (invoiceId: number, amount: number) => {
    setApplications(applications.map(app => 
      app.invoice_id === invoiceId 
        ? { ...app, application_amount: amount }
        : app
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }

    if (applications.length === 0) {
      toast.error('Please select at least one invoice for payment');
      return;
    }

    if (applications.some(app => app.application_amount <= 0)) {
      toast.error('All application amounts must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        ...formData,
        supplier_id: parseInt(formData.supplier_id),
        applications: applications.map(app => ({
          invoice_id: app.invoice_id,
          application_amount: app.application_amount,
          application_date: formData.payment_date
        }))
      };

      await apiService.createAPPayment(paymentData);
      onSuccess();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const totalApplied = applications.reduce((sum, app) => sum + app.application_amount, 0);
  const unappliedAmount = formData.payment_amount - totalApplied;

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">Loading payment form...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold">Create AP Payment</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Payment Header */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Header</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Select value={formData.supplier_id} onValueChange={handleSupplierChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.filter(s => s.status === 'ACTIVE').map(supplier => (
                      <SelectItem key={supplier.supplier_id} value={supplier.supplier_id.toString()}>
                        {supplier.supplier_name} ({supplier.supplier_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_number">Payment Number *</Label>
                <Input
                  id="payment_number"
                  value={formData.payment_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_number: e.target.value }))}
                  placeholder="Enter payment number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency_code} onValueChange={(value) => setFormData(prev => ({ ...prev, currency_code: value }))}>
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

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Input
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  placeholder="e.g., Bank Transfer, Check"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_account">Bank Account</Label>
                <Input
                  id="bank_account"
                  value={formData.bank_account}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_account: e.target.value }))}
                  placeholder="Bank account details"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="Transaction reference"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exchange_rate">Exchange Rate</Label>
                <Input
                  id="exchange_rate"
                  type="number"
                  step="0.000001"
                  value={formData.exchange_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, exchange_rate: parseFloat(e.target.value) }))}
                  placeholder="1.000000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Selection and Applications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Invoices */}
            <Card>
              <CardHeader>
                <CardTitle>Available Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No open invoices found for this supplier
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {invoices.map((invoice) => (
                      <div key={invoice.invoice_id} className="border p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{invoice.invoice_number}</div>
                            <div className="text-sm text-gray-500">
                              Due: {new Date(invoice.due_date).toLocaleDateString()}
                            </div>
                            <div className="text-sm font-mono">
                              Amount Due: ${invoice.amount_due.toFixed(2)}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addInvoiceApplication(invoice)}
                            disabled={applications.some(app => app.invoice_id === invoice.invoice_id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Applications */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No invoices selected for payment
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <div key={app.invoice_id} className="border p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{app.invoice_number}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeApplication(app.invoice_id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <Label className="text-xs">Amount Due</Label>
                            <div className="font-mono">${app.amount_due.toFixed(2)}</div>
                          </div>
                          <div>
                            <Label className="text-xs">Apply Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={app.application_amount}
                              onChange={(e) => updateApplicationAmount(app.invoice_id, parseFloat(e.target.value) || 0)}
                              className="text-xs"
                              max={app.amount_due}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Total Applied</Label>
                  <div className="text-lg font-mono">${totalApplied.toFixed(2)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Amount</Label>
                  <div className="text-lg font-mono">${formData.payment_amount.toFixed(2)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Unapplied Amount</Label>
                  <div className={`text-lg font-mono ${unappliedAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${unappliedAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter any additional notes..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || applications.length === 0}>
              {loading ? "Creating..." : "Create Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 