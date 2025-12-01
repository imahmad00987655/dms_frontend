import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, Send, FileText, Eye } from "lucide-react";
import apiService from '@/services/api';
import { generateNextInvoiceNumber } from "@/utils/numberGenerator";

interface InvoiceLineItem {
  id: string;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_line_amount: number;
}

interface Customer {
  customer_id: number;
  customer_number: string;
  customer_name: string;
  customer_type: string;
}

interface Invoice {
  invoice_id: number;
  invoice_number: string;
  customer_name: string;
  customer_number: string;
  total_amount: string | number;
  amount_paid: string | number;
  amount_due: string | number;
  due_date: string;
  status: string;
  invoice_date: string;
  notes?: string;
  payment_terms_id: number;
  line_items?: InvoiceLineItem[];
}

interface InvoiceFormProps {
  onClose: () => void;
  invoiceToView?: Invoice | null;
  mode?: 'create' | 'view';
}

export const InvoiceForm = ({ onClose, invoiceToView, mode = 'create' }: InvoiceFormProps) => {
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: "",
    customerName: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    paymentTerms: "30",
    notes: "",
    status: "DRAFT"
  });

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { 
      id: "1", 
      item_name: "", 
      description: "", 
      quantity: 1, 
      unit_price: 0, 
      line_amount: 0,
      tax_rate: 8.0,
      tax_amount: 0,
      total_line_amount: 0
    }
  ]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const invoiceNumberGenerated = useRef(false);

  // Load invoice data if in view mode
  useEffect(() => {
    if (mode === 'view' && invoiceToView) {
      try {
        console.log('Invoice data for view:', invoiceToView);
        console.log('Invoice date:', invoiceToView.invoice_date);
        console.log('Due date:', invoiceToView.due_date);
        
        // Format dates properly for display
        const formatDateForDisplay = (dateString: string) => {
          if (!dateString) return '';
          try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // Return original if invalid
            return date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD for input
          } catch (error) {
            console.error('Error formatting date:', dateString, error);
            return dateString;
          }
        };

        setInvoiceData({
          invoiceNumber: invoiceToView.invoice_number || '',
          customerName: invoiceToView.customer_name || '',
          invoiceDate: formatDateForDisplay(invoiceToView.invoice_date),
          dueDate: formatDateForDisplay(invoiceToView.due_date),
          paymentTerms: String(invoiceToView.payment_terms_id || 30),
          notes: invoiceToView.notes || "",
          status: invoiceToView.status || 'DRAFT'
        });

        if (invoiceToView.line_items && invoiceToView.line_items.length > 0) {
          const transformedLineItems = invoiceToView.line_items.map((item, index) => ({
            id: String(index + 1),
            item_name: item.item_name || '',
            description: item.description || '',
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
            line_amount: Number(item.line_amount || 0),
            tax_rate: Number(item.tax_rate || 0),
            tax_amount: Number(item.tax_amount || 0),
            total_line_amount: Number(item.total_line_amount || 0)
          }));
          setLineItems(transformedLineItems);
        } else {
          // Set default line item if none exist
          setLineItems([{
            id: "1",
            item_name: '',
            description: '',
            quantity: 0,
            unit_price: 0,
            line_amount: 0,
            tax_rate: 0,
            tax_amount: 0,
            total_line_amount: 0
          }]);
        }
      } catch (error) {
        console.error('Error loading invoice data:', error);
        // Set default data if there's an error
        setInvoiceData({
          invoiceNumber: 'Error loading invoice',
          customerName: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          paymentTerms: "30",
          notes: "Error loading invoice data",
          status: "DRAFT"
        });
        setLineItems([{
          id: "1",
          item_name: 'Error loading line items',
          description: '',
          quantity: 0,
          unit_price: 0,
          line_amount: 0,
          tax_rate: 0,
          tax_amount: 0,
          total_line_amount: 0
        }]);
      }
    }
  }, [mode, invoiceToView]);

  // Fetch customers for dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // For now, we'll create customers on-the-fly, but in a real app you'd fetch from /customers endpoint
        setCustomers([]);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };
    fetchCustomers();
  }, []);

  // Auto-generate invoice number when creating a new invoice
  useEffect(() => {
    if (mode === 'create' && !invoiceToView && !invoiceNumberGenerated.current) {
      invoiceNumberGenerated.current = true;
      generateNextInvoiceNumber().then((nextNumber) => {
        setInvoiceData(prev => {
          // Only update if still empty (user hasn't manually entered one)
          if (!prev.invoiceNumber) {
            return { ...prev, invoiceNumber: nextNumber };
          }
          return prev;
        });
      }).catch((error) => {
        console.error('Failed to generate invoice number:', error);
        invoiceNumberGenerated.current = false; // Reset on error so it can retry
      });
    }
  }, [mode, invoiceToView]);

  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      item_name: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      line_amount: 0,
      tax_rate: 8.0,
      tax_amount: 0,
      total_line_amount: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === "quantity" || field === "unit_price") {
          updatedItem.line_amount = Number(updatedItem.quantity) * Number(updatedItem.unit_price);
          updatedItem.tax_amount = updatedItem.line_amount * (updatedItem.tax_rate / 100);
          updatedItem.total_line_amount = updatedItem.line_amount + updatedItem.tax_amount;
        }
        if (field === "tax_rate") {
          updatedItem.tax_amount = updatedItem.line_amount * (Number(value) / 100);
          updatedItem.total_line_amount = updatedItem.line_amount + updatedItem.tax_amount;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.line_amount, 0);
  const taxAmount = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
  const total = subtotal + taxAmount;

  const handleSave = async (status: string) => {
    setLoading(true);
    try {
      // Transform line items to match backend expectations
      const transformedLineItems = lineItems.map(item => ({
        item_name: item.item_name || 'Item',
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_amount: item.line_amount,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount
      }));

      const invoice = {
        invoice_number: invoiceData.invoiceNumber,
        customer_name: invoiceData.customerName,
        invoice_date: invoiceData.invoiceDate,
        due_date: invoiceData.dueDate,
        payment_terms: Number(invoiceData.paymentTerms),
        notes: invoiceData.notes,
        status: status.toUpperCase(),
        subtotal,
        tax_amount: taxAmount,
        total,
        line_items: transformedLineItems
      };

      await apiService.createInvoice(invoice);
      onClose();
    } catch (err) {
      console.error('Failed to save invoice:', err);
      alert('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {mode === 'view' ? <Eye className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          {mode === 'view' ? 'View Invoice' : 'Create Invoice'}
          <Badge variant="outline" className="ml-auto">
            {invoiceData.status.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              value={invoiceData.invoiceNumber}
              onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})}
              readOnly={mode === 'view'}
              className={mode === 'view' ? 'bg-gray-50' : ''}
            />
          </div>
          <div>
            <Label htmlFor="customerName">Customer</Label>
            <Input
              id="customerName"
              placeholder="Enter customer name"
              value={invoiceData.customerName}
              onChange={(e) => setInvoiceData({ ...invoiceData, customerName: e.target.value })}
              readOnly={mode === 'view'}
              className={mode === 'view' ? 'bg-gray-50' : ''}
            />
          </div>
          <div>
            <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
            <Select
              value={invoiceData.paymentTerms}
              onValueChange={(value) => setInvoiceData({...invoiceData, paymentTerms: value})}
              disabled={mode === 'view'}
            >
              <SelectTrigger className={mode === 'view' ? 'bg-gray-50' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Net 15</SelectItem>
                <SelectItem value="30">Net 30</SelectItem>
                <SelectItem value="45">Net 45</SelectItem>
                <SelectItem value="60">Net 60</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="invoiceDate">Invoice Date</Label>
            {mode === 'view' ? (
              <div className="py-2 px-3 bg-gray-50 rounded border">
                {invoiceData.invoiceDate ? (() => {
                  try {
                    const date = new Date(invoiceData.invoiceDate);
                    return isNaN(date.getTime()) ? invoiceData.invoiceDate : date.toLocaleDateString();
                  } catch (error) {
                    return invoiceData.invoiceDate || 'N/A';
                  }
                })() : 'N/A'}
              </div>
            ) : (
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceData.invoiceDate}
              onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
            />
            )}
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            {mode === 'view' ? (
              <div className="py-2 px-3 bg-gray-50 rounded border">
                {invoiceData.dueDate ? (() => {
                  try {
                    const date = new Date(invoiceData.dueDate);
                    return isNaN(date.getTime()) ? invoiceData.dueDate : date.toLocaleDateString();
                  } catch (error) {
                    return invoiceData.dueDate || 'N/A';
                  }
                })() : 'N/A'}
              </div>
            ) : (
            <Input
              id="dueDate"
              type="date"
              value={invoiceData.dueDate}
              onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
            />
            )}
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Line Items</h3>
            {mode !== 'view' && (
            <Button onClick={addLineItem} size="sm" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
            )}
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium">Item Name</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-center p-3 font-medium w-20">Qty</th>
                  <th className="text-right p-3 font-medium w-28">Unit Price</th>
                  <th className="text-right p-3 font-medium w-20">Tax %</th>
                  <th className="text-right p-3 font-medium w-32">Line Total</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">
                      {mode === 'view' ? (
                        <div className="py-2 px-3 bg-gray-50 rounded border">
                          {item.item_name || 'N/A'}
                        </div>
                      ) : (
                      <Input
                        placeholder="Item name"
                        value={item.item_name}
                        onChange={(e) => updateLineItem(item.id, "item_name", e.target.value)}
                      />
                      )}
                    </td>
                    <td className="p-3">
                      {mode === 'view' ? (
                        <div className="py-2 px-3 bg-gray-50 rounded border">
                          {item.description || 'N/A'}
                        </div>
                      ) : (
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      />
                      )}
                    </td>
                    <td className="p-3">
                      {mode === 'view' ? (
                        <div className="py-2 px-3 bg-gray-50 rounded border text-center">
                          {item.quantity}
                        </div>
                      ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="text-center"
                      />
                      )}
                    </td>
                    <td className="p-3">
                      {mode === 'view' ? (
                        <div className="py-2 px-3 bg-gray-50 rounded border text-right">
                          ${Number(item.unit_price || 0).toFixed(2)}
                        </div>
                      ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                        className="text-right"
                      />
                      )}
                    </td>
                    <td className="p-3">
                      {mode === 'view' ? (
                        <div className="py-2 px-3 bg-gray-50 rounded border text-right">
                          {item.tax_rate}%
                        </div>
                      ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.tax_rate}
                        onChange={(e) => updateLineItem(item.id, "tax_rate", parseFloat(e.target.value) || 0)}
                        className="text-right"
                      />
                      )}
                    </td>
                    <td className="p-3 text-right font-medium">
                      ${Number(item.total_line_amount || 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      {mode !== 'view' && lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes</Label>
          {mode === 'view' ? (
            <div className="py-3 px-4 bg-gray-50 rounded border min-h-[80px]">
              {invoiceData.notes || 'No notes available'}
            </div>
          ) : (
          <Textarea
            id="notes"
            placeholder="Additional notes..."
            value={invoiceData.notes}
            onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
            rows={3}
          />
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {mode === 'view' ? (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
          <Button 
            onClick={() => handleSave('DRAFT')} 
            variant="outline"
            disabled={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            Save as Draft
          </Button>
          <Button 
            onClick={() => handleSave('OPEN')} 
            disabled={loading}
          >
            <Send className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
