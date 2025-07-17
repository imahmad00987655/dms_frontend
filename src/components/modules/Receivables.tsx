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

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  total: number;
  due_date: string;
  status: string;
  invoice_date: string;
  notes?: string;
  payment_terms: number;
}

interface Receipt {
  id: number;
  receipt_number: string;
  receipt_date: string;
  customer_name: string;
  invoice_number: string;
  amount_received: number;
  currency: string;
  payment_method: string;
  deposit_account: string;
  reference_number: string;
  status: string;
  description: string;
}

export const Receivables = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true);
      const data = await apiService.getInvoices();
      setInvoices(data);
      setLoading(false);
    }
    fetchInvoices();
  }, []);

  useEffect(() => {
    async function fetchReceipts() {
      setLoadingReceipts(true);
      const data = await apiService.getReceipts();
      setReceipts(data);
      setLoadingReceipts(false);
    }
    fetchReceipts();
  }, []);

  const filteredReceivables = invoices.filter(item => {
    const matchesSearch = (item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalOutstanding = invoices.filter(r => r.status !== "paid").reduce((sum, r) => sum + Number(r.total), 0);
  const overdueAmount = invoices.filter(r => r.status === "overdue").reduce((sum, r) => sum + Number(r.total), 0);
  const overdueCount = invoices.filter(r => r.status === "overdue").length;
  const avgDaysToPayment = 23; // Placeholder, can be calculated from data if available

  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      await apiService.updateInvoiceStatus(invoice.id, 'paid');
      // Refresh invoices
      const data = await apiService.getInvoices();
      setInvoices(data);
    } catch (err) {
      alert('Failed to mark as paid');
    }
  };

  const getStatusBadge = (invoice: Invoice) => {
    const now = new Date();
    const due = invoice.due_date ? new Date(invoice.due_date) : null;
    if (invoice.status === 'paid') {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    }
    if (due && due < now && invoice.status !== 'paid') {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    }
    if (invoice.status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
    return <Badge>Unknown</Badge>;
  };

  const handleSendReminder = (invoice: Invoice) => {
    console.log(`Sending reminder for ${invoice.invoice_number} to ${invoice.customer_email}`);
    // Simulate sending email reminder
  };

  const handleExportData = () => {
    // Prepare data for export
    const exportData = invoices.map(inv => ({
      'Invoice Number': inv.invoice_number,
      'Customer Name': inv.customer_name,
      'Amount': inv.total,
      'Due Date': inv.due_date,
      'Status': inv.status,
      'Invoice Date': inv.invoice_date,
      'Notes': inv.notes,
      'Payment Terms': inv.payment_terms
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
      'Invoice Number': rec.invoice_number,
      'Amount': rec.amount_received,
      'Currency': rec.currency,
      'Payment Method': rec.payment_method,
      'Deposit Account': rec.deposit_account,
      'Reference': rec.reference_number,
      'Status': rec.status,
      'Description': rec.description
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
      deposit_account: receiptData.bankAccount,
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

  if (showReceiptForm) {
    return <ReceiptForm onClose={closeReceiptForm} selectedReceivable={selectedReceivable} onSubmit={handleCreateReceiptSubmit} />;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts Receivable</h1>
          <p className="text-gray-500 mt-1">Manage billing, accounts receivable, and revenue tracking</p>
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
            <p className="text-xs text-gray-500 mt-1">Across {filteredReceivables.filter(r => r.status !== "paid").length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <CreditCard className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${overdueAmount.toLocaleString()}</div>
            <p className="text-xs text-red-500 mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <CreditCard className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-gray-500 mt-1">Past due date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Days to Payment</CardTitle>
            <CreditCard className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{avgDaysToPayment}</div>
            <p className="text-xs text-green-500 mt-1">3 days improvement</p>
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
              <Plus className="w-4 h-4" />
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {loading ? (
                  <div>Loading...</div>
                ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Invoice</th>
                      <th className="text-left py-3 px-4 font-semibold">Customer</th>
                      <th className="text-right py-3 px-4 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold">Due Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-center py-3 px-4 font-semibold">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceivables.map((item) => {
                      // Enhanced overdue logic
                      let daysOverdue = 0;
                      const now = new Date();
                      const due = item.due_date ? new Date(item.due_date) : null;
                      const isOverdue = due && due < now && item.status !== 'paid';
                      if (isOverdue && due) {
                        daysOverdue = Math.max(0, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
                      }
                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{item.invoice_number}</div>
                              <div className="text-sm text-gray-500">{item.notes || "-"}</div>
                              <div className="text-xs text-gray-400">Issued: {item.invoice_date}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{item.customer_name}</div>
                              {/* Add email or terms if available */}
                              <div className="text-xs text-gray-400">Net {item.payment_terms}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-lg">
                            ${Number(item.total).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className={item.status === "overdue" ? "text-red-600 font-medium" : ""}>
                              {item.due_date}
                            </div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(item)}</td>
                          <td className="py-3 px-4 text-center">
                            {isOverdue && daysOverdue > 0 ? (
                              <span className="text-red-600 font-medium">{daysOverdue} days</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                )}
              </div>
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
              <CardTitle>Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {loadingReceipts ? (
                  <div>Loading...</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Receipt #</th>
                        <th className="text-left py-3 px-4 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Customer</th>
                        <th className="text-left py-3 px-4 font-semibold">Invoice #</th>
                        <th className="text-right py-3 px-4 font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold">Currency</th>
                        <th className="text-left py-3 px-4 font-semibold">Payment Method</th>
                        <th className="text-left py-3 px-4 font-semibold">Deposit Account</th>
                        <th className="text-left py-3 px-4 font-semibold">Reference</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.map((receipt) => (
                        <tr key={receipt.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{receipt.receipt_number}</td>
                          <td className="py-3 px-4">{receipt.receipt_date}</td>
                          <td className="py-3 px-4">{receipt.customer_name}</td>
                          <td className="py-3 px-4">{receipt.invoice_number}</td>
                          <td className="py-3 px-4 text-right">{receipt.amount_received}</td>
                          <td className="py-3 px-4">{receipt.currency}</td>
                          <td className="py-3 px-4">{receipt.payment_method}</td>
                          <td className="py-3 px-4">{receipt.deposit_account}</td>
                          <td className="py-3 px-4">{receipt.reference_number}</td>
                          <td className="py-3 px-4">{receipt.status}</td>
                          <td className="py-3 px-4">{receipt.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
