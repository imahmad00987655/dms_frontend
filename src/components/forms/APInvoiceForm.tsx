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
import { X, Plus, ArrowLeft } from "lucide-react";
import apiService from "@/services/api";
import { toast } from "sonner";

interface APSupplier {
  supplier_id: number;
  supplier_number: string;
  supplier_name: string;
  supplier_type: 'VENDOR' | 'CONTRACTOR' | 'SERVICE_PROVIDER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface APSupplierSite {
  site_id: number;
  supplier_id: number;
  site_name: string;
  site_type: 'INVOICING' | 'PURCHASING' | 'BOTH';
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_primary: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

interface InvoiceLine {
  line_number: number;
  item_code?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  line_amount: number;
  tax_rate: number;
  tax_amount: number;
}

interface APInvoiceFormProps {
  onClose: () => void;
  onSuccess: () => void;
  suppliers: APSupplier[];
}

export const APInvoiceForm = ({ onClose, onSuccess, suppliers }: APInvoiceFormProps) => {
  const [formData, setFormData] = useState({
    supplier_id: "",
    bill_to_site_id: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: "",
    payment_terms_id: 30,
    currency_code: "USD",
    exchange_rate: 1.0,
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    approval_status: "PENDING" as const,
    status: "DRAFT" as const,
    notes: ""
  });

  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      line_number: 1,
      item_name: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      line_amount: 0,
      tax_rate: 0,
      tax_amount: 0
    }
  ]);

  const [supplierSites, setSupplierSites] = useState<APSupplierSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<APSupplier | null>(null);

  // Fetch supplier sites when supplier changes
  useEffect(() => {
    if (formData.supplier_id) {
      fetchSupplierSites(parseInt(formData.supplier_id));
    } else {
      setSupplierSites([]);
    }
  }, [formData.supplier_id]);

  // Calculate totals when lines change
  useEffect(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.line_amount, 0);
    const taxAmount = lines.reduce((sum, line) => sum + line.tax_amount, 0);
    const totalAmount = subtotal + taxAmount;

    setFormData(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    }));
  }, [lines]);

  const fetchSupplierSites = async (supplierId: number) => {
    try {
      const sites = await apiService.getAPSupplierSites(supplierId);
      setSupplierSites(sites);
      
      // Auto-select primary site if available
      const primarySite = sites.find(site => site.is_primary);
      if (primarySite) {
        setFormData(prev => ({ ...prev, bill_to_site_id: primarySite.site_id.toString() }));
      }
    } catch (error) {
      console.error('Error fetching supplier sites:', error);
      toast.error('Failed to fetch supplier sites');
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.supplier_id.toString() === supplierId);
    setSelectedSupplier(supplier || null);
    setFormData(prev => ({ 
      ...prev, 
      supplier_id: supplierId,
      bill_to_site_id: "" // Reset site selection
    }));
  };

  const addLine = () => {
    const newLineNumber = Math.max(...lines.map(l => l.line_number), 0) + 1;
    setLines([...lines, {
      line_number: newLineNumber,
      item_name: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      line_amount: 0,
      tax_rate: 0,
      tax_amount: 0
    }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      const newLines = lines.filter((_, i) => i !== index);
      // Renumber lines
      const renumberedLines = newLines.map((line, i) => ({
        ...line,
        line_number: i + 1
      }));
      setLines(renumberedLines);
    }
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Calculate line amount and tax
    const line = newLines[index];
    line.line_amount = line.quantity * line.unit_price;
    line.tax_amount = line.line_amount * (line.tax_rate / 100);
    
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id || !formData.bill_to_site_id) {
      toast.error('Please select a supplier and billing site');
      return;
    }

    if (lines.some(line => !line.item_name || line.quantity <= 0 || line.unit_price <= 0)) {
      toast.error('Please fill in all required line item fields');
      return;
    }

    setLoading(true);
    try {
      const invoiceData = {
        ...formData,
        supplier_id: parseInt(formData.supplier_id),
        bill_to_site_id: parseInt(formData.bill_to_site_id),
        payment_terms_id: parseInt(formData.payment_terms_id.toString()),
        lines: lines.map(line => ({
          ...line,
          line_number: line.line_number,
          item_code: line.item_code || null,
          description: line.description || null
        }))
      };

      await apiService.createAPInvoice(invoiceData);
      onSuccess();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold">Create AP Invoice</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Header</CardTitle>
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
                <Label htmlFor="bill_to_site">Billing Site *</Label>
                <Select value={formData.bill_to_site_id} onValueChange={(value) => setFormData(prev => ({ ...prev, bill_to_site_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing site" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierSites.filter(site => site.site_type === 'INVOICING' || site.site_type === 'BOTH').map(site => (
                      <SelectItem key={site.site_id} value={site.site_id.toString()}>
                        {site.site_name} {site.is_primary && '(Primary)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number *</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="Enter invoice number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_date">Invoice Date *</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms (Days)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  value={formData.payment_terms_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_terms_id: parseInt(e.target.value) }))}
                  placeholder="30"
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

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Line
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end border p-4 rounded-lg">
                    <div className="col-span-1">
                      <Label className="text-xs">Line</Label>
                      <Input
                        value={line.line_number}
                        disabled
                        className="text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Item Code</Label>
                      <Input
                        value={line.item_code || ""}
                        onChange={(e) => updateLine(index, 'item_code', e.target.value)}
                        placeholder="Optional"
                        className="text-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Item Name *</Label>
                      <Input
                        value={line.item_name}
                        onChange={(e) => updateLine(index, 'item_name', e.target.value)}
                        placeholder="Enter item name"
                        required
                        className="text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="1"
                        className="text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="text-xs"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Tax %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.tax_rate}
                        onChange={(e) => updateLine(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="text-xs"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="col-span-12 mt-2">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={line.description || ""}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        placeholder="Optional description"
                        className="text-xs"
                        rows={2}
                      />
                    </div>
                    
                    <div className="col-span-12 grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <Label className="text-xs">Line Amount</Label>
                        <Input
                          value={line.line_amount.toFixed(2)}
                          disabled
                          className="text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tax Amount</Label>
                        <Input
                          value={line.tax_amount.toFixed(2)}
                          disabled
                          className="text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Total</Label>
                        <Input
                          value={(line.line_amount + line.tax_amount).toFixed(2)}
                          disabled
                          className="text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Subtotal</Label>
                  <div className="text-lg font-mono">${formData.subtotal.toFixed(2)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tax Amount</Label>
                  <div className="text-lg font-mono">${formData.tax_amount.toFixed(2)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <div className="text-xl font-mono font-bold">${formData.total_amount.toFixed(2)}</div>
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
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 