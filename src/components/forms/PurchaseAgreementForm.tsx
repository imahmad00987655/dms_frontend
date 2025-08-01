import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiService from '../../services/api.js';

interface Party {
  party_id: number;
  party_name: string;
  party_type: string;
}

interface Supplier {
  profile_id: number;
  supplier_id: number;
  party_id: number;
  party_name: string;
  supplier_name?: string;
  supplier_number: string;
}

interface PurchaseAgreement {
  agreement_id?: number;
  agreement_number?: string;
  agreement_type?: string;
  supplier_id?: number;
  buyer_id?: number;
  agreement_date?: string;
  effective_start_date?: string;
  effective_end_date?: string;
  currency_code?: string;
  exchange_rate?: number;
  total_amount?: number;
  amount_remaining?: number;
  description?: string;
  status?: string;
  approval_status?: string;
  lines?: AgreementLine[];
}

interface PurchaseAgreementFormProps {
  agreement?: PurchaseAgreement | null;
  suppliers: Supplier[];
  users: Party[];
  onSave: () => void;
  onCancel: () => void;
}

interface AgreementLine {
  line_number: number;
  item_id?: number;
  item_name: string;
  item_code?: string;
  description: string;
  category?: string;
  quantity: number;
  uom: string;
  unit_price: number;
  line_amount: number;
  max_quantity?: number;
  min_quantity?: number;
  need_by_date?: string;
  suggested_supplier?: string;
  suggested_supplier_id?: number;
  notes?: string;
}

export const PurchaseAgreementForm: React.FC<PurchaseAgreementFormProps> = ({
  agreement,
  suppliers,
  users,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    agreement_number: '',
    agreement_type: '',
    supplier_id: '',
    buyer_id: '',
    agreement_date: '',
    effective_start_date: '',
    effective_end_date: '',
    currency_code: 'USD',
    exchange_rate: '1.0',
    total_amount: '0',
    amount_remaining: '0',
    description: '',
    status: '',
    approval_status: ''
  });
  const [lines, setLines] = useState<AgreementLine[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Mock inventory items - in a real app, this would come from props or API
  const inventoryItems = [
    { item_id: 1, item_code: 'ITEM001', item_name: 'Laptop Computer', uom: 'EA' },
    { item_id: 2, item_code: 'ITEM002', item_name: 'Office Chair', uom: 'EA' },
    { item_id: 3, item_code: 'ITEM003', item_name: 'Printer Paper', uom: 'BOX' },
    { item_id: 4, item_code: 'ITEM004', item_name: 'Ink Cartridges', uom: 'EA' },
    { item_id: 5, item_code: 'ITEM005', item_name: 'Desk Lamp', uom: 'EA' },
  ];

  const uomOptions = ['EA', 'BOX', 'KG', 'L', 'M', 'PCS', 'SET', 'ROLL', 'BAG', 'CAN'];

  // Auto-generate agreement number when component mounts
  useEffect(() => {
    if (!agreement?.agreement_number) {
      const timestamp = Date.now();
      const generatedNumber = `PA${timestamp}`;
      setFormData(prev => ({
        ...prev,
        agreement_number: generatedNumber
      }));
    }
  }, [agreement?.agreement_number]);

  // Calculate total amount from line items
  const calculateTotalAmount = () => {
    return lines.reduce((total, line) => total + (line.line_amount || 0), 0);
  };

  // Update total amount when lines change
  useEffect(() => {
    const total = calculateTotalAmount();
    setFormData(prev => ({
      ...prev,
      total_amount: total.toString(),
      amount_remaining: total.toString() // Initially, amount remaining equals total
    }));
  }, [lines]);

  // Initialize form data when agreement prop changes
  useEffect(() => {
    if (agreement) {
      console.log('Setting form data for agreement:', agreement);
      setFormData({
        agreement_number: agreement.agreement_number || '',
        agreement_type: agreement.agreement_type || '',
        supplier_id: agreement.supplier_id?.toString() || '',
        buyer_id: agreement.buyer_id?.toString() || '',
        agreement_date: agreement.agreement_date || '',
        effective_start_date: agreement.effective_start_date || '',
        effective_end_date: agreement.effective_end_date || '',
        currency_code: agreement.currency_code || '',
        exchange_rate: agreement.exchange_rate?.toString() || '',
        total_amount: agreement.total_amount?.toString() || '0',
        amount_remaining: agreement.amount_remaining?.toString() || '0',
        description: agreement.description || '',
        status: agreement.status || '',
        approval_status: agreement.approval_status || ''
      });
      console.log('Setting lines:', agreement.lines);
      setLines(agreement.lines || []);
    } else {
      // Reset form for new agreement
      const timestamp = Date.now();
      const generatedNumber = `PA${timestamp}`;
      setFormData({
        agreement_number: generatedNumber,
        agreement_type: '',
        supplier_id: '',
        buyer_id: '',
        agreement_date: '',
        effective_start_date: '',
        effective_end_date: '',
        currency_code: '',
        exchange_rate: '',
        total_amount: '0',
        amount_remaining: '0',
        description: '',
        status: '',
        approval_status: ''
      });
      setLines([]);
    }
  }, [agreement]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addLine = () => {
    const newLine: AgreementLine = {
      line_number: lines.length + 1,
      item_id: undefined,
      item_name: '',
      item_code: `ITEM${String(lines.length + 1).padStart(3, '0')}`,
      description: '',
      quantity: 1,
      uom: 'EA',
      unit_price: 0,
      line_amount: 0,
      max_quantity: 1,
      min_quantity: 1,
      need_by_date: ''
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (index: number) => {
    const newLines = lines.filter((_, i) => i !== index);
    // Renumber lines
    const renumberedLines = newLines.map((line, i) => ({
      ...line,
      line_number: i + 1
    }));
    setLines(renumberedLines);
  };

  const updateLine = (index: number, field: keyof AgreementLine, value: string | number) => {
    const newLines = [...lines];
    
    // Handle different field types
    if (field === 'quantity' || field === 'unit_price' || field === 'line_amount' || 
        field === 'max_quantity' || field === 'min_quantity') {
      newLines[index] = { ...newLines[index], [field]: Number(value) };
    } else {
      newLines[index] = { ...newLines[index], [field]: value };
    }
    
    // Calculate line amount
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : newLines[index].quantity;
      const unitPrice = field === 'unit_price' ? Number(value) : newLines[index].unit_price;
      newLines[index].line_amount = quantity * unitPrice;
    }
    
    setLines(newLines);
    
    // Calculate total amount and remaining amount
    const total = newLines.reduce((sum, line) => sum + (Number(line.line_amount) || 0), 0);
    const remaining = total; // For agreements, remaining is typically the same as total initially
    
    setFormData(prev => ({
      ...prev,
      total_amount: total.toString(),
      amount_remaining: remaining.toString()
    }));
  };

  const validateForm = () => {
    if (!formData.agreement_number.trim()) {
      toast({
        title: "Validation Error",
        description: "Agreement number is required",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.agreement_type) {
      toast({
        title: "Validation Error",
        description: "Agreement type is required",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.supplier_id) {
      toast({
        title: "Validation Error",
        description: "Supplier is required",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.buyer_id) {
      toast({
        title: "Validation Error",
        description: "Buyer is required",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.agreement_date) {
      toast({
        title: "Validation Error",
        description: "Agreement date is required",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.effective_start_date) {
      toast({
        title: "Validation Error",
        description: "Effective start date is required",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.effective_end_date) {
      toast({
        title: "Validation Error",
        description: "Effective end date is required",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.status) {
      toast({
        title: "Validation Error",
        description: "Status is required",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.approval_status) {
      toast({
        title: "Validation Error",
        description: "Approval status is required",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.currency_code) {
      toast({
        title: "Validation Error",
        description: "Currency is required",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.exchange_rate) {
      toast({
        title: "Validation Error",
        description: "Exchange rate is required",
        variant: "destructive"
      });
      return false;
    }
    if (lines.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one line item is required",
        variant: "destructive"
      });
      return false;
    }
    
    // Validate line items
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.item_name.trim()) {
        toast({
          title: "Validation Error",
          description: `Item name is required for line ${i + 1}`,
          variant: "destructive"
        });
        return false;
      }
      if (Number(line.quantity) <= 0) {
        toast({
          title: "Validation Error",
          description: `Quantity must be greater than 0 for line ${i + 1}`,
          variant: "destructive"
        });
        return false;
      }
      if (Number(line.unit_price) < 0) {
        toast({
          title: "Validation Error",
          description: `Unit price cannot be negative for line ${i + 1}`,
          variant: "destructive"
        });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        total_amount: parseFloat(formData.total_amount),
        amount_remaining: parseFloat(formData.amount_remaining),
        exchange_rate: parseFloat(formData.exchange_rate),
        supplier_id: parseInt(formData.supplier_id), // This is actually profile_id from the dropdown
        buyer_id: parseInt(formData.buyer_id),
        lines: lines.map(line => ({
          ...line,
          quantity: parseFloat(line.quantity.toString()),
          unit_price: parseFloat(line.unit_price.toString()),
          line_amount: parseFloat(line.line_amount.toString()),
          max_quantity: line.max_quantity ? parseFloat(line.max_quantity.toString()) : undefined,
          min_quantity: line.min_quantity ? parseFloat(line.min_quantity.toString()) : undefined
        }))
      };

      if (agreement) {
        await apiService.updatePurchaseAgreement(agreement.agreement_id, payload);
        toast({
          title: "Success",
          description: "Purchase agreement updated successfully"
        });
      } else {
        // Use the regular method for creating agreements
        await apiService.createPurchaseAgreement({
          agreement_number: formData.agreement_number,
          agreement_type: formData.agreement_type,
          supplier_id: parseInt(formData.supplier_id),
          description: formData.description || 'New Purchase Agreement',
          status: formData.status,
          approval_status: formData.approval_status,
          currency_code: formData.currency_code,
          exchange_rate: parseFloat(formData.exchange_rate),
          total_amount: parseFloat(formData.total_amount),
          agreement_date: formData.agreement_date,
          effective_start_date: formData.effective_start_date,
          effective_end_date: formData.effective_end_date,
          lines: lines.map((line, index) => ({
            line_number: index + 1,
            item_code: line.item_code || '',
            item_name: line.item_name || '',
            description: line.description || '',
            category: line.category || '',
            uom: line.uom || 'EACH',
            quantity: String(line.quantity || 1),
            unit_price: String(line.unit_price || 0),
            line_amount: String(line.line_amount || 0),
            min_quantity: line.min_quantity ? String(line.min_quantity) : null,
            max_quantity: line.max_quantity ? String(line.max_quantity) : null,
            need_by_date: line.need_by_date || null,
            suggested_supplier: line.suggested_supplier || '',
            suggested_supplier_id: line.suggested_supplier_id || null,
            notes: line.notes || ''
          }))
        });
        toast({
          title: "Success",
          description: "Purchase agreement created successfully"
        });
      }
      
      onSave();
    } catch (error: unknown) {
      console.error('Error saving agreement:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save agreement";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Basic Information */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="agreement_number" className="text-sm">Agreement Number *</Label>
              <Input
                id="agreement_number"
                value={formData.agreement_number}
                placeholder="Auto-generated"
                required
                className="h-9 bg-gray-50 text-gray-600"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated agreement number</p>
            </div>

            <div>
              <Label htmlFor="agreement_type" className="text-sm">Agreement Type *</Label>
              <Select value={formData.agreement_type} onValueChange={(value) => handleInputChange('agreement_type', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select agreement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLANKET">Blanket Agreement</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="MASTER">Master Agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agreement_date" className="text-sm">Agreement Date *</Label>
              <Input
                id="agreement_date"
                type="date"
                value={formData.agreement_date}
                onChange={(e) => handleInputChange('agreement_date', e.target.value)}
                required
                className="h-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="supplier_id" className="text-sm">Supplier *</Label>
              <Select value={formData.supplier_id} onValueChange={(value) => handleInputChange('supplier_id', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers && suppliers.length > 0 ? (
                    suppliers.map((supplier) => (
                      <SelectItem key={supplier.supplier_id} value={supplier.supplier_id.toString()}>
                        {supplier.supplier_name || supplier.party_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-suppliers" disabled>No suppliers available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="buyer_id" className="text-sm">Buyer *</Label>
              <Select value={formData.buyer_id} onValueChange={(value) => handleInputChange('buyer_id', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select buyer" />
                </SelectTrigger>
                <SelectContent>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.party_id} value={user.party_id.toString()}>
                        {user.party_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-users" disabled>No users available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="currency_code" className="text-sm">Currency</Label>
                <Select value={formData.currency_code} onValueChange={(value) => handleInputChange('currency_code', value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select currency" />
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
                <Label htmlFor="exchange_rate" className="text-sm">Exchange Rate</Label>
                <Input
                  id="exchange_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.exchange_rate}
                  onChange={(e) => handleInputChange('exchange_rate', e.target.value)}
                  placeholder="Enter exchange rate"
                  className="h-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="total_amount" className="text-sm">Total Amount</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                onChange={(e) => handleInputChange('total_amount', e.target.value)}
                placeholder="0.00"
                readOnly
                className="h-9 bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="amount_remaining" className="text-sm">Amount Remaining</Label>
              <Input
                id="amount_remaining"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount_remaining}
                onChange={(e) => handleInputChange('amount_remaining', e.target.value)}
                placeholder="0.00"
                readOnly
                className="h-9 bg-gray-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dates and Status */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dates & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="effective_start_date" className="text-sm">Effective Start Date *</Label>
              <Input
                id="effective_start_date"
                type="date"
                value={formData.effective_start_date}
                onChange={(e) => handleInputChange('effective_start_date', e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="effective_end_date" className="text-sm">Effective End Date *</Label>
              <Input
                id="effective_end_date"
                type="date"
                value={formData.effective_end_date}
                onChange={(e) => handleInputChange('effective_end_date', e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="status" className="text-sm">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="approval_status" className="text-sm">Approval Status</Label>
              <Select value={formData.approval_status} onValueChange={(value) => handleInputChange('approval_status', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select approval status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter agreement description"
              rows={3}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Line Items</CardTitle>
          <CardDescription className="text-sm">
            Add items to be covered by this agreement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button type="button" variant="outline" onClick={addLine} className="w-full h-9">
              <Plus className="h-4 w-4 mr-2" />
              Add Line Item
            </Button>

            {lines.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-xs">Line</TableHead>
                        <TableHead className="w-48 text-xs">Item *</TableHead>
                        <TableHead className="w-48 text-xs">Description</TableHead>
                        <TableHead className="w-20 text-xs">Qty *</TableHead>
                        <TableHead className="w-20 text-xs">UOM</TableHead>
                        <TableHead className="w-32 text-xs">Unit Price</TableHead>
                        <TableHead className="w-32 text-xs">Amount</TableHead>
                        <TableHead className="w-24 text-xs">Min Qty</TableHead>
                        <TableHead className="w-24 text-xs">Max Qty</TableHead>
                        <TableHead className="w-32 text-xs">Need By</TableHead>
                        <TableHead className="w-16 text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-xs">{line.line_number}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                value={line.item_code || `ITEM${String(index + 1).padStart(3, '0')}`}
                                placeholder="Item Code"
                                className="h-9 text-sm min-w-[100px]"
                                readOnly
                              />
                              <Input
                                value={line.item_name}
                                onChange={(e) => updateLine(index, 'item_name', e.target.value)}
                                placeholder="Enter item name"
                                className="h-9 text-sm min-w-[180px]"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(index, 'description', e.target.value)}
                              placeholder="Description"
                              className="h-9 text-sm min-w-[180px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateLine(index, 'quantity', parseInt(e.target.value) || 0)}
                              required
                              className="h-9 text-sm min-w-[80px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={line.uom} 
                              onValueChange={(value) => updateLine(index, 'uom', value)}
                            >
                              <SelectTrigger className="h-9 text-sm min-w-[80px]">
                                <SelectValue placeholder="UOM" />
                              </SelectTrigger>
                              <SelectContent>
                                {uomOptions.map((uom) => (
                                  <SelectItem key={uom} value={uom}>
                                    {uom}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.unit_price}
                              onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="h-9 text-sm min-w-[100px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.line_amount}
                              readOnly
                              className="h-9 text-sm min-w-[100px] bg-gray-50"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={line.min_quantity}
                              onChange={(e) => updateLine(index, 'min_quantity', parseInt(e.target.value) || 0)}
                              className="h-9 text-sm min-w-[80px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={line.max_quantity}
                              onChange={(e) => updateLine(index, 'max_quantity', parseInt(e.target.value) || 0)}
                              className="h-9 text-sm min-w-[80px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={line.need_by_date}
                              onChange={(e) => updateLine(index, 'need_by_date', e.target.value)}
                              className="h-9 text-sm min-w-[120px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeLine(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
        <Button type="button" variant="outline" onClick={onCancel} className="h-9">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="h-9">
          {loading ? 'Saving...' : (agreement ? 'Update Agreement' : 'Create Agreement')}
        </Button>
      </div>
    </form>
  );
}; 