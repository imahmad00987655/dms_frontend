import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceForm } from "../forms/InvoiceForm";
import { ReceiptForm } from "../forms/ReceiptForm";
import { Search, Plus, CreditCard, Filter, Download, Mail, Receipt } from "lucide-react";
import apiService from "@/services/api";
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText } from "lucide-react";
import type { ReceiptFormData } from "../forms/receipt/ReceiptFormFields";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InvoiceLine {
  line_id: number;
  line_number: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  line_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_line_amount: number;
}

// Interface for form handling - matches InvoiceForm expectations
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

interface ReceiptApplication {
  application_id: number;
  invoice_id: number;
  invoice_number: string;
  applied_amount: number;
  applied_date: string;
  status: string;
  notes?: string;
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
  line_items?: InvoiceLine[];
}

// Interface for form handling - matches InvoiceForm expectations
interface InvoiceForForm {
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

interface Receipt {
  receipt_id: number;
  receipt_number: string;
  receipt_date: string;
  customer_name: string;
  customer_number: string;
  total_amount: string | number;
  amount_applied: string | number;
  amount_unapplied: string | number;
  currency_code: string;
  payment_method: string;
  bank_account: string;
  reference_number: string;
  status: string;
  notes: string;
  applications?: ReceiptApplication[];
}

export const Receivables = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Invoice | null>(null);
  const [invoiceToView, setInvoiceToView] = useState<InvoiceForForm | null>(null);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [receiptToView, setReceiptToView] = useState<ReceiptFormData | null>(null);
  const [showReceiptView, setShowReceiptView] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<number | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [invoiceToMarkAsPaid, setInvoiceToMarkAsPaid] = useState<Invoice | null>(null);

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true);
      try {
        const data = await apiService.getInvoices();
        setInvoices(data);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  useEffect(() => {
    async function fetchReceipts() {
      setLoadingReceipts(true);
      try {
        const data = await apiService.getReceipts();
        setReceipts(data);
      } catch (error) {
        console.error('Error fetching receipts:', error);
      } finally {
        setLoadingReceipts(false);
      }
    }
    fetchReceipts();
  }, []);

  const filteredReceivables = invoices.filter(item => {
    const matchesSearch = (item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Debug logging to understand the data
  console.log('Invoices data:', invoices);
  
  const totalOutstanding = invoices.filter(r => {
    const isOutstanding = r.status !== "PAID" && Number(r.amount_due || 0) > 0;
    console.log(`Invoice ${r.invoice_number}: status=${r.status}, amount_due=${r.amount_due}, isOutstanding=${isOutstanding}`);
    return isOutstanding;
  }).reduce((sum, r) => {
    const amountDue = Number(r.amount_due || 0);
    return sum + amountDue;
  }, 0);
  
  const overdueAmount = invoices.filter(r => {
    const dueDate = new Date(r.due_date);
    const now = new Date();
    const isOverdue = dueDate < now;
    console.log(`Invoice ${r.invoice_number}: due_date=${r.due_date}, parsed_due_date=${dueDate}, now=${now}, isOverdue=${isOverdue}`);
    return isOverdue;
  }).reduce((sum, r) => {
    // For overdue invoices, use total_amount if amount_due is 0 (paid late)
    const amount = r.status === "PAID" ? Number(r.total_amount || 0) : Number(r.amount_due || 0);
    console.log(`Overdue invoice ${r.invoice_number}: status=${r.status}, total_amount=${r.total_amount}, amount_due=${r.amount_due}, calculated_amount=${amount}`);
    return sum + amount;
  }, 0);
  
  const overdueCount = invoices.filter(r => {
    const dueDate = new Date(r.due_date);
    const now = new Date();
    return dueDate < now;
  }).length;
  const avgDaysToPayment = 23; // Placeholder, can be calculated from data if available

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (updatingInvoiceId === invoice.invoice_id) return; // Prevent double-clicking
    
    setUpdatingInvoiceId(invoice.invoice_id);
    try {
      console.log(`Marking invoice ${invoice.invoice_number} as paid...`);
      
      // Update the invoice status to PAID
      await apiService.updateInvoiceStatus(invoice.invoice_id, 'PAID');
      
      // Update the local state immediately for better UX
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => 
          inv.invoice_id === invoice.invoice_id 
            ? { 
                ...inv, 
                status: 'PAID',
                amount_paid: inv.total_amount,
                amount_due: 0
              }
            : inv
        )
      );
      
      console.log(`Invoice ${invoice.invoice_number} marked as paid successfully`);
      
      // Show success message
      toast.success(`Invoice ${invoice.invoice_number} marked as paid successfully`);
      
    } catch (err) {
      console.error('Failed to mark invoice as paid:', err);
      toast.error(`Failed to mark invoice ${invoice.invoice_number} as paid. Please try again.`);
      
      // Refresh the data to ensure consistency
      try {
        const data = await apiService.getInvoices();
        setInvoices(data);
      } catch (refreshErr) {
        console.error('Failed to refresh invoices after error:', refreshErr);
      }
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const getStatusBadge = (invoice: Invoice) => {
    const now = new Date();
    const due = invoice.due_date ? new Date(invoice.due_date) : null;
    if (invoice.status === 'PAID') {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    }
    if (due && due < now && invoice.status !== 'PAID') {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    }
    if (invoice.status === 'OPEN') {
      return <Badge className="bg-yellow-100 text-yellow-800">Open</Badge>;
    }
    if (invoice.status === 'DRAFT') {
      return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    }
    return <Badge>{invoice.status}</Badge>;
  };

  const handleSendReminder = (invoice: Invoice) => {
    console.log(`Sending reminder for ${invoice.invoice_number} to ${invoice.customer_name}`);
    // Simulate sending email reminder
  };

  const handleExportData = () => {
    // Prepare data for export
    const exportData = invoices.map(inv => ({
      'Invoice Number': inv.invoice_number,
      'Customer Name': inv.customer_name,
      'Customer Number': inv.customer_number,
      'Total Amount': Number(inv.total_amount || 0),
      'Amount Paid': Number(inv.amount_paid || 0),
      'Amount Due': Number(inv.amount_due || 0),
      'Due Date': inv.due_date,
      'Status': inv.status,
      'Invoice Date': inv.invoice_date,
      'Notes': inv.notes,
      'Payment Terms': inv.payment_terms_id
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');
    XLSX.writeFile(workbook, 'invoices.xlsx');
  };

  const handleExportReceiptsData = () => {
    // Prepare receipt data for export
    const exportData = receipts.map(rec => ({
      'Receipt Number': rec.receipt_number,
      'Date': rec.receipt_date,
      'Customer Name': rec.customer_name,
      'Customer Number': rec.customer_number,
      'Total Amount': Number(rec.total_amount || 0),
      'Amount Applied': Number(rec.amount_applied || 0),
      'Amount Unapplied': Number(rec.amount_unapplied || 0),
      'Currency': rec.currency_code,
      'Payment Method': rec.payment_method,
      'Bank Account': rec.bank_account,
      'Reference': rec.reference_number,
      'Status': rec.status,
      'Notes': rec.notes
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Receipts');
    XLSX.writeFile(workbook, 'receipts.xlsx');
  };

  const handleCreateReceipt = (receivable: Invoice) => {
    setSelectedReceivable(receivable);
    setShowReceiptForm(true);
  };

  const closeReceiptForm = () => {
    setShowReceiptForm(false);
    setSelectedReceivable(null);
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      // Fetch detailed invoice data including line items
      const detailedInvoice = await apiService.getInvoice(invoice.invoice_id);
      
      // Transform the invoice data to match form expectations
      const transformedInvoice: InvoiceForForm = {
        ...detailedInvoice,
        line_items: detailedInvoice.line_items?.map((item, index) => ({
          id: String(index + 1),
          item_name: item.item_name || '',
          description: item.description || '',
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unit_price || 0),
          line_amount: Number(item.line_amount || 0),
          tax_rate: Number(item.tax_rate || 0),
          tax_amount: Number(item.tax_amount || 0),
          total_line_amount: Number(item.total_line_amount || 0)
        }))
      };
      
      setInvoiceToView(transformedInvoice);
      setShowInvoiceView(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      // Fallback to using the basic invoice data with transformation
      const transformedInvoice: InvoiceForForm = {
        ...invoice,
        line_items: invoice.line_items?.map((item, index) => ({
          id: String(index + 1),
          item_name: item.item_name || '',
          description: item.description || '',
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unit_price || 0),
          line_amount: Number(item.line_amount || 0),
          tax_rate: Number(item.tax_rate || 0),
          tax_amount: Number(item.tax_amount || 0),
          total_line_amount: Number(item.total_line_amount || 0)
        }))
      };
      setInvoiceToView(transformedInvoice);
      setShowInvoiceView(true);
    }
  };

  const closeInvoiceView = () => {
    setShowInvoiceView(false);
    setInvoiceToView(null);
  };

  const handleViewReceipt = (receipt: Receipt) => {
    // Transform receipt data to match form expectations
    const transformedReceipt: ReceiptFormData = {
      receiptNumber: receipt.receipt_number,
      receiptDate: receipt.receipt_date,
      customer: receipt.customer_name,
      invoiceNumber: receipt.applications?.[0]?.invoice_number || '',
      amount: String(receipt.total_amount || 0),
      paymentMethod: receipt.payment_method || '',
      bankAccount: receipt.bank_account || '',
      checkNumber: '',
      reference: receipt.reference_number || '',
      description: receipt.notes || '',
      currency: receipt.currency_code || 'USD',
      status: receipt.status || 'CONFIRMED'
    };
    
    setReceiptToView(transformedReceipt);
    setShowReceiptView(true);
  };

  const closeReceiptView = () => {
    setShowReceiptView(false);
    setReceiptToView(null);
  };

  const handleCreateReceiptSubmit = async (receiptData: ReceiptFormData) => {
    // Map frontend fields to backend fields
    const backendData = {
      receipt_number: receiptData.receiptNumber,
      receipt_date: receiptData.receiptDate,
      customer_name: receiptData.customer,
      invoice_number: receiptData.invoiceNumber,
      amount_received: Number(receiptData.amount),
      currency: receiptData.currency,
      payment_method: receiptData.paymentMethod,
      bank_account: receiptData.bankAccount,
      reference_number: receiptData.reference,
      status: receiptData.status,
      description: receiptData.description,
    };
    await apiService.createReceipt(backendData);
    const data = await apiService.getReceipts();
    setReceipts(data);
    setShowReceiptForm(false);
  };

  if (showInvoiceForm) {
    return <InvoiceForm onClose={() => setShowInvoiceForm(false)} />;
  }

  if (showInvoiceView && invoiceToView) {
    return <InvoiceForm onClose={closeInvoiceView} invoiceToView={invoiceToView} mode="view" />;
  }

  if (showReceiptForm) {
    return <ReceiptForm onClose={closeReceiptForm} selectedReceivable={selectedReceivable} onSubmit={handleCreateReceiptSubmit} />;
  }

  if (showReceiptView && receiptToView) {
    return <ReceiptForm onClose={closeReceiptView} receiptToView={receiptToView} mode="view" />;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts Receivable</h1>
          <p className="text-gray-500 mt-1">Manage customer invoices and payments</p>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <CreditCard className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Across {invoices.filter(r => r.status !== "PAID" && Number(r.amount_due || 0) > 0).length} unpaid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <Mail className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${overdueAmount.toLocaleString()}</div>
            <p className="text-xs text-red-500 mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Count</CardTitle>
            <Receipt className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{overdueCount}</div>
            <p className="text-xs text-gray-500 mt-1">Invoices overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Days to Payment</CardTitle>
            <BarChart3 className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{avgDaysToPayment}</div>
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
          <TabsTrigger value="receipt" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Receipt
          </TabsTrigger>
        </TabsList>
        <TabsContent value="invoice">
          <div className="flex justify-end mb-4 gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportData}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button 
              onClick={() => setShowInvoiceForm(true)}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Create Invoice
            </Button>
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search invoices or customers..."
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
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Customer Invoices</h3>
                <p className="text-sm text-gray-500">
                  Showing {filteredReceivables.length} of {invoices.length} invoices
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
              ) : filteredReceivables.length === 0 ? (
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
                        <th className="text-left py-3 px-4 font-semibold">Customer</th>
                        <th className="text-right py-3 px-4 font-semibold">Amount</th>
                        <th className="text-center py-3 px-4 font-semibold">Due Date</th>
                        <th className="text-center py-3 px-4 font-semibold">Status</th>
                        <th className="text-center py-3 px-4 font-semibold">Days Overdue</th>
                        <th className="text-center py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceivables.map((item) => {
                        const isOverdue = new Date(item.due_date) < new Date();
                        const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                        return (
                          <tr key={item.invoice_id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{item.invoice_number}</td>
                            <td className="py-3 px-4">{item.customer_name}</td>
                            <td className="py-3 px-4 text-right font-semibold">${Number(item.total_amount || 0).toFixed(2)}</td>
                            <td className="py-3 px-4 text-center">
                              {item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-3 px-4 text-center">{getStatusBadge(item)}</td>
                            <td className="py-3 px-4 text-center">
                              {isOverdue && daysOverdue > 0 ? (
                                <span className="text-red-600 font-medium">{daysOverdue} days</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewInvoice(item)}
                                >
                                  View
                                </Button>
                                {item.status === 'OPEN' && Number(item.amount_due || 0) > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCreateReceipt(item)}
                                  >
                                    Record Payment
                                  </Button>
                                )}
                                {item.status !== 'PAID' && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                        disabled={updatingInvoiceId === item.invoice_id}
                                        onClick={() => setInvoiceToMarkAsPaid(item)}
                                      >
                                        {updatingInvoiceId === item.invoice_id ? 'Updating...' : 'Mark as Paid'}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Mark Invoice as Paid</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to mark invoice <strong>{item.invoice_number}</strong> as paid? 
                                          This action will update the invoice status to "PAID" and cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setInvoiceToMarkAsPaid(null)}>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => {
                                            if (invoiceToMarkAsPaid) {
                                              handleMarkAsPaid(invoiceToMarkAsPaid);
                                              setInvoiceToMarkAsPaid(null);
                                            }
                                          }}
                                          className="bg-green-600 hover:bg-green-700"
                                  >
                                    Mark as Paid
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSendReminder(item)}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </div>
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
        <TabsContent value="receipt">
          <div className="flex justify-end mb-4 gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportReceiptsData}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button 
              onClick={() => setShowReceiptForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Receipt
            </Button>
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search receipts or customers..."
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="CLEARED">Cleared</SelectItem>
                      <SelectItem value="REVERSED">Reversed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Customer Receipts</h3>
                <p className="text-sm text-gray-500">
                  Showing {receipts.length} of {receipts.length} receipts
                </p>
              </div>
              {loadingReceipts ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading receipts...</div>
                </div>
              ) : receipts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No receipts found</div>
                  <Button 
                    onClick={() => setShowReceiptForm(true)} 
                    className="mt-4"
                    variant="outline"
                  >
                    Create your first receipt
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Receipt #</th>
                        <th className="text-left py-3 px-4 font-semibold">Customer</th>
                        <th className="text-right py-3 px-4 font-semibold">Amount</th>
                        <th className="text-right py-3 px-4 font-semibold">Applied</th>
                        <th className="text-right py-3 px-4 font-semibold">Unapplied</th>
                        <th className="text-center py-3 px-4 font-semibold">Date</th>
                        <th className="text-center py-3 px-4 font-semibold">Status</th>
                        <th className="text-center py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((item) => (
                        <tr key={item.receipt_id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{item.receipt_number}</td>
                        <td className="py-3 px-4">{item.customer_name}</td>
                          <td className="py-3 px-4 text-right font-semibold">${Number(item.total_amount || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-semibold">${Number(item.amount_applied || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-semibold">${Number(item.amount_unapplied || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-center">
                            {item.receipt_date ? new Date(item.receipt_date).toLocaleDateString() : '-'}
                          </td>
                                                      <td className="py-3 px-4 text-center">
                              <Badge className={item.status === 'CLEARED' ? 'bg-green-100 text-green-800' : 
                                               item.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' : 
                                               item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                                               item.status === 'REVERSED' ? 'bg-red-100 text-red-800' : 
                                               item.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' : 
                                               'bg-gray-100 text-gray-800'}>
                                {item.status}
                              </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewReceipt(item)}
                              >
                                View
                              </Button>
                              {Number(item.amount_unapplied || 0) > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Logic to apply unapplied amount to an invoice
                                  // This would typically open a modal to select an invoice
                                  alert(`Apply unapplied amount $${Number(item.amount_unapplied || 0).toFixed(2)} from receipt ${item.receipt_number}`);
                                }}
                              >
                                Apply
                              </Button>
                            )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Reverse receipt
                                  console.log(`Reverse receipt ${item.receipt_number}`);
                                }}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                          </div>
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
}