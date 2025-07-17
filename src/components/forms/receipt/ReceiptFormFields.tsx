import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface ReceiptFormData {
  receiptNumber: string;
  receiptDate: string;
  customer: string;
  invoiceNumber: string;
  amount: string;
  paymentMethod: string;
  bankAccount: string;
  checkNumber: string;
  reference: string;
  description: string;
  currency: string;
  status: string;
}

interface ReceiptFormFieldsProps {
  formData: ReceiptFormData;
  setFormData: (updater: (prev: ReceiptFormData) => ReceiptFormData) => void;
}

export const ReceiptFormFields = ({ formData, setFormData }: ReceiptFormFieldsProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="receiptNumber">Receipt Number</Label>
          <Input
            id="receiptNumber"
            value={formData.receiptNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="receiptDate">Receipt Date</Label>
          <Input
            id="receiptDate"
            type="date"
            value={formData.receiptDate}
            onChange={(e) => setFormData(prev => ({ ...prev, receiptDate: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customer">Customer</Label>
          <Input
            id="customer"
            value={formData.customer}
            onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
            placeholder="Enter customer name"
            required
          />
        </div>

        <div>
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input
            id="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
            placeholder="INV-2024-001"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount Received</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
            <SelectTrigger>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
              <SelectItem value="credit-card">Credit Card</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="ach">ACH</SelectItem>
              <SelectItem value="wire">Wire Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="bankAccount">Deposit Account</Label>
          <Select value={formData.bankAccount} onValueChange={(value) => setFormData(prev => ({ ...prev, bankAccount: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select deposit account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checking-main">Main Checking (****1234)</SelectItem>
              <SelectItem value="savings">Savings Account (****5678)</SelectItem>
              <SelectItem value="merchant">Merchant Account (****9012)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.paymentMethod === "check" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="checkNumber">Check Number</Label>
            <Input
              id="checkNumber"
              value={formData.checkNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, checkNumber: e.target.value }))}
              placeholder="Check number"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="reference">Reference Number</Label>
          <Input
            id="reference"
            value={formData.reference}
            onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
            placeholder="Payment reference"
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Payment description or notes..."
          rows={3}
        />
      </div>
    </div>
  );
};
