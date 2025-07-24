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
import { APPaymentForm } from "@/components/forms/APPaymentForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText } from "lucide-react";
import { APInvoiceForm } from "@/components/forms/APInvoiceForm";
import apiService from "@/services/api";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface APInvoiceLine {
  line_id: number;
  invoice_id: number;
  line_number: number;
  item_code?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  line_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_line_amount: number;
}

interface APInvoice {
  invoice_id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name: string;
  bill_to_site_id: number;
  bill_to_site_name: string;
  invoice_date: string;
  due_date: string;
  payment_terms_id: number;
  currency_code: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'CANCELLED' | 'VOID';
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  lines?: APInvoiceLine[];
}

interface APPayment {
  payment_id: number;
  payment_number: string;
  supplier_id: number;
  supplier_name: string;
  payment_date: string;
  currency_code: string;
  exchange_rate: number;
  payment_amount: number;
  amount_applied: number;
  unapplied_amount: number;
  payment_method?: string;
  bank_account?: string;
  reference_number?: string;
  status: 'DRAFT' | 'APPROVED' | 'PROCESSED' | 'CANCELLED' | 'VOID';
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface APSupplier {
  supplier_id: number;
  supplier_number: string;
  supplier_name: string;
  supplier_type: 'VENDOR' | 'CONTRACTOR' | 'SERVICE_PROVIDER';
  tax_id?: string;
  payment_terms_id: number;
  currency_code: string;
  credit_limit: number;
  hold_flag: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export const Payables = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<APInvoice | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoices, setInvoices] = useState<APInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<APPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [suppliers, setSuppliers] = useState<APSupplier[]>([]);

  // Fetch invoices from backend
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAPInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments from backend
  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const data = await apiService.getAPPayments();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoadingPayments(false);
    }
  };

  // Fetch suppliers from backend
  const fetchSuppliers = async () => {
    try {
      const data = await apiService.getAPSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to fetch suppliers');
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchPayments();
    fetchSuppliers();
  }, []);

  const handleCreatePayment = (invoice: APInvoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentForm(true);
  };

  const closePaymentForm = () => {
    setShowPaymentForm(false);
    setSelectedInvoice(null);
  };

  const handleInvoiceCreated = () => {
    setShowInvoiceForm(false);
    fetchInvoices(); // Refresh the list
    toast.success('Invoice created successfully');
  };

  const handlePaymentCreated = () => {
    setShowPaymentForm(false);
    fetchPayments(); // Refresh the payments list
    fetchInvoices(); // Refresh invoices to update amounts
    toast.success('Payment created successfully');
  };

  const handleExportInvoices = () => {
    // Prepare invoice data for export
    const exportData = invoices.map(inv => ({
      'Invoice Number': inv.invoice_number,
      'Supplier Name': inv.supplier_name,
      'Invoice Date': inv.invoice_date,
      'Due Date': inv.due_date,
      'Payment Terms': inv.payment_terms_id,
      'Subtotal': inv.subtotal,
      'Tax Amount': inv.tax_amount,
      'Total Amount': inv.total_amount,
      'Amount Paid': inv.amount_paid,
      'Amount Due': inv.amount_due,
      'Currency': inv.currency_code,
      'Approval Status': inv.approval_status,
      'Status': inv.status,
      'Notes': inv.notes || '',
      'Created At': inv.created_at,
      'Updated At': inv.updated_at
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AP Invoices');
    XLSX.writeFile(workbook, 'ap-invoices.xlsx');
    
    toast.success('Invoices exported successfully');
  };

  const handleExportPayments = () => {
    // Prepare payment data for export
    const exportData = payments.map(payment => ({
      'Payment Number': payment.payment_number,
      'Payment Date': payment.payment_date,
      'Supplier Name': payment.supplier_name,
      'Payment Amount': payment.payment_amount,
      'Amount Applied': payment.amount_applied,
      'Unapplied Amount': payment.unapplied_amount,
      'Currency': payment.currency_code,
      'Payment Method': payment.payment_method || '',
      'Bank Account': payment.bank_account || '',
      'Reference Number': payment.reference_number || '',
      'Status': payment.status,
      'Notes': payment.notes || '',
      'Created At': payment.created_at,
      'Updated At': payment.updated_at
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AP Payments');
    XLSX.writeFile(workbook, 'ap-payments.xlsx');
    
    toast.success('Payments exported successfully');
  };

  const filteredInvoices = invoices.filter(item => {
    const matchesSearch = (item.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || item.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPayables = invoices.filter(p => p.status !== "PAID").reduce((sum, p) => sum + p.amount_due, 0);
  const overduePayables = invoices.filter(p => p.status === "OPEN" && new Date(p.due_date) < new Date()).reduce((sum, p) => sum + p.amount_due, 0);
  const pendingCount = invoices.filter(p => p.status === "OPEN").length;

  if (showPaymentForm) {
    return <APPaymentForm onClose={closePaymentForm} selectedInvoice={selectedInvoice} onSuccess={handlePaymentCreated} />;
  }
  if (showInvoiceForm) {
    return <APInvoiceForm onClose={() => setShowInvoiceForm(false)} onSuccess={handleInvoiceCreated} suppliers={suppliers} />;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts Payable</h1>
          <p className="text-gray-500 mt-1">Manage invoices and payments to suppliers</p>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPayables.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Across {filteredInvoices.filter(p => p.status !== "PAID").length} invoices</p>
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
            <CardTitle className="text-sm font-medium">Open Invoices</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{payments.length}</div>
            <p className="text-xs text-green-500 mt-1">Processed this period</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoice" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoice" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Payments
          </TabsTrigger>
        </TabsList>
        <TabsContent value="invoice">
          <div className="flex justify-end mb-4 gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportInvoices}
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
                    placeholder="Search invoices or suppliers..."
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
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="void">Void</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">AP Invoices</h3>
                <p className="text-sm text-gray-500">
                  Showing {filteredInvoices.length} of {invoices.length} invoices
                </p>
              </div>
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading invoices...</div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No invoices found</div>
                  <Button 
                    onClick={() => setShowInvoiceForm(true)} 
                    className="mt-4"
                    variant="outline"
                  >
                    Create your first invoice
                  </Button>
                </div>
              ) : filteredInvoices.length === 0 ? (
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
                        <th className="text-left py-3 px-4 font-semibold">Supplier</th>
                        <th className="text-left py-3 px-4 font-semibold">Invoice Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Due Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Total Amount</th>
                        <th className="text-left py-3 px-4 font-semibold">Amount Due</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.invoice_id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{invoice.invoice_number}</td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{invoice.supplier_name}</div>
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
                            ${invoice.total_amount.toLocaleString()} {invoice.currency_code}
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            ${invoice.amount_due.toLocaleString()} {invoice.currency_code}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              invoice.status === "PAID" ? "default" :
                              invoice.status === "OPEN" && new Date(invoice.due_date) < new Date() ? "destructive" :
                              invoice.status === "OPEN" ? "secondary" :
                              invoice.status === "DRAFT" ? "outline" : "secondary"
                            }>
                              {invoice.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {invoice.status === "OPEN" && invoice.amount_due > 0 && (
                              <Button
                                size="sm"
                                onClick={() => handleCreatePayment(invoice)}
                                className="mr-2"
                              >
                                Pay
                              </Button>
                            )}
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
              <CardTitle>AP Payments</CardTitle>
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
                        <th className="text-left py-3 px-4 font-semibold">Supplier</th>
                        <th className="text-right py-3 px-4 font-semibold">Payment Amount</th>
                        <th className="text-right py-3 px-4 font-semibold">Applied</th>
                        <th className="text-right py-3 px-4 font-semibold">Unapplied</th>
                        <th className="text-left py-3 px-4 font-semibold">Currency</th>
                        <th className="text-left py-3 px-4 font-semibold">Payment Method</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.payment_id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{payment.payment_number}</td>
                          <td className="py-3 px-4">{new Date(payment.payment_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">{payment.supplier_name}</td>
                          <td className="py-3 px-4 text-right font-semibold">
                            ${payment.payment_amount.toLocaleString()} {payment.currency_code}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            ${payment.amount_applied.toLocaleString()} {payment.currency_code}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            ${payment.unapplied_amount.toLocaleString()} {payment.currency_code}
                          </td>
                          <td className="py-3 px-4">{payment.currency_code}</td>
                          <td className="py-3 px-4">{payment.payment_method || '-'}</td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              payment.status === "PROCESSED" ? "default" :
                              payment.status === "APPROVED" ? "secondary" :
                              payment.status === "DRAFT" ? "outline" :
                              payment.status === "CANCELLED" ? "destructive" : "secondary"
                            }>
                              {payment.status}
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
      </Tabs>
    </div>
  );
};
