import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, AlertTriangle, Search, Filter, Download } from "lucide-react";
import { PaymentForm } from "@/components/forms/PaymentForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText } from "lucide-react";
import { VendorInvoiceForm } from "@/components/forms/VendorInvoiceForm";
import apiService from "@/services/api";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface VendorInvoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  vendor_id?: string;
  invoice_date: string;
  due_date?: string;
  payment_terms: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  line_items: LineItem[];
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: number;
  payment_number: string;
  payment_date: string;
  vendor_name: string;
  vendor_id?: string;
  invoice_number?: string;
  amount_paid: number;
  currency: string;
  payment_method?: string;
  bank_account?: string;
  reference_number?: string;
  status: 'pending' | 'processed' | 'failed' | 'cancelled';
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const Payables = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<VendorInvoice | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Fetch vendor invoices from backend
  const fetchVendorInvoices = async () => {
    try {
      setLoading(true);
      const data = await apiService.getVendorInvoices();
      setVendorInvoices(data);
    } catch (error) {
      console.error('Error fetching vendor invoices:', error);
      toast.error('Failed to fetch vendor invoices');
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments from backend
  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const data = await apiService.getPayments();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchVendorInvoices();
    fetchPayments();
  }, []);

  const handleCreatePayment = (payable: VendorInvoice) => {
    setSelectedPayable(payable);
    setShowPaymentForm(true);
  };

  const closePaymentForm = () => {
    setShowPaymentForm(false);
    setSelectedPayable(null);
  };

  const handleInvoiceCreated = () => {
    setShowInvoiceForm(false);
    fetchVendorInvoices(); // Refresh the list
    toast.success('Vendor invoice created successfully');
  };

  const handlePaymentCreated = () => {
    setShowPaymentForm(false);
    fetchPayments(); // Refresh the payments list
    toast.success('Payment created successfully');
  };

  const handleExportVendorInvoices = () => {
    // Prepare vendor invoice data for export
    const exportData = vendorInvoices.map(inv => ({
      'Invoice Number': inv.invoice_number,
      'Vendor Name': inv.vendor_name,
      'Vendor ID': inv.vendor_id || '',
      'Invoice Date': inv.invoice_date,
      'Due Date': inv.due_date || '',
      'Payment Terms': inv.payment_terms,
      'Subtotal': inv.subtotal,
      'Tax Amount': inv.tax_amount,
      'Total': inv.total,
      'Currency': inv.currency,
      'Status': inv.status,
      'Notes': inv.notes || '',
      'Line Items Count': inv.line_items.length,
      'Created At': inv.created_at,
      'Updated At': inv.updated_at
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendor Invoices');
    XLSX.writeFile(workbook, 'vendor-invoices.xlsx');
    
    toast.success('Vendor invoices exported successfully');
  };

  const handleExportPayments = () => {
    // Prepare payment data for export
    const exportData = payments.map(payment => ({
      'Payment Number': payment.payment_number,
      'Payment Date': payment.payment_date,
      'Vendor Name': payment.vendor_name,
      'Vendor ID': payment.vendor_id || '',
      'Invoice Number': payment.invoice_number || '',
      'Amount Paid': payment.amount_paid,
      'Currency': payment.currency,
      'Payment Method': payment.payment_method || '',
      'Bank Account': payment.bank_account || '',
      'Reference Number': payment.reference_number || '',
      'Status': payment.status,
      'Description': payment.description || '',
      'Notes': payment.notes || '',
      'Created At': payment.created_at,
      'Updated At': payment.updated_at
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
    XLSX.writeFile(workbook, 'payments.xlsx');
    
    toast.success('Payments exported successfully');
  };

  const filteredVendorInvoices = vendorInvoices.filter(item => {
    const matchesSearch = (item.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPayables = vendorInvoices.filter(p => p.status !== "paid").reduce((sum, p) => sum + p.total, 0);
  const overduePayables = vendorInvoices.filter(p => p.status === "overdue").reduce((sum, p) => sum + p.total, 0);
  const pendingCount = vendorInvoices.filter(p => p.status === "pending").length;

  if (showPaymentForm) {
    return <PaymentForm onClose={closePaymentForm} selectedPayable={selectedPayable} onSuccess={handlePaymentCreated} />;
  }
  if (showInvoiceForm) {
    return <VendorInvoiceForm onClose={() => setShowInvoiceForm(false)} onSuccess={handleInvoiceCreated} />;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts Payable</h1>
          <p className="text-gray-500 mt-1">Manage invoices and payments to vendors</p>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPayables.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Across {filteredVendorInvoices.filter(p => p.status !== "paid").length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertTriangle className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${overduePayables.toLocaleString()}</div>
            <p className="text-xs text-red-500 mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Days to Payment</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">30</div>
            <p className="text-xs text-green-500 mt-1">On track</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoice" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoice" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Invoice
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Payment
          </TabsTrigger>
        </TabsList>
        <TabsContent value="invoice">
          <div className="flex justify-end mb-4 gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportVendorInvoices}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button onClick={() => setShowInvoiceForm(true)} className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Create Invoice
            </Button>
          </div>
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search invoices or vendors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Vendor Invoices</h3>
                <p className="text-sm text-gray-500">
                  Showing {filteredVendorInvoices.length} of {vendorInvoices.length} invoices
                </p>
              </div>
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading vendor invoices...</div>
                </div>
              ) : vendorInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No vendor invoices found</div>
                  <Button 
                    onClick={() => setShowInvoiceForm(true)} 
                    className="mt-4"
                    variant="outline"
                  >
                    Create your first invoice
                  </Button>
                </div>
              ) : filteredVendorInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No invoices match your search criteria</div>
                  <Button 
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }} 
                    className="mt-4"
                    variant="outline"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Invoice #</th>
                        <th className="text-left py-3 px-4 font-semibold">Vendor</th>
                        <th className="text-left py-3 px-4 font-semibold">Invoice Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Due Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendorInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{invoice.invoice_number}</td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{invoice.vendor_name}</div>
                              {invoice.notes && (
                                <div className="text-sm text-gray-500">{invoice.notes}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            ${invoice.total.toLocaleString()} {invoice.currency}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              invoice.status === "paid" ? "default" :
                              invoice.status === "overdue" ? "destructive" :
                              invoice.status === "pending" ? "secondary" :
                              invoice.status === "draft" ? "outline" : "secondary"
                            }>
                              {invoice.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payment">
          <div className="flex justify-end mb-4 gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportPayments}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button 
              onClick={() => setShowPaymentForm(true)}
              className="flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Create Payment
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading payments...</div>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No payments found</div>
                  <Button 
                    onClick={() => setShowPaymentForm(true)} 
                    className="mt-4"
                    variant="outline"
                  >
                    Create your first payment
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Payment #</th>
                        <th className="text-left py-3 px-4 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Vendor</th>
                        <th className="text-left py-3 px-4 font-semibold">Invoice #</th>
                        <th className="text-right py-3 px-4 font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold">Currency</th>
                        <th className="text-left py-3 px-4 font-semibold">Payment Method</th>
                        <th className="text-left py-3 px-4 font-semibold">Bank Account</th>
                        <th className="text-left py-3 px-4 font-semibold">Reference</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{payment.payment_number}</td>
                          <td className="py-3 px-4">{new Date(payment.payment_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">{payment.vendor_name}</td>
                          <td className="py-3 px-4">{payment.invoice_number || '-'}</td>
                          <td className="py-3 px-4 text-right font-semibold">
                            ${payment.amount_paid.toLocaleString()} {payment.currency}
                          </td>
                          <td className="py-3 px-4">{payment.currency}</td>
                          <td className="py-3 px-4">{payment.payment_method || '-'}</td>
                          <td className="py-3 px-4">{payment.bank_account || '-'}</td>
                          <td className="py-3 px-4">{payment.reference_number || '-'}</td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              payment.status === "processed" ? "default" :
                              payment.status === "pending" ? "secondary" :
                              payment.status === "failed" ? "destructive" :
                              payment.status === "cancelled" ? "outline" : "secondary"
                            }>
                              {payment.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">{payment.description || '-'}</td>
                        </tr>
                      ))}
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
