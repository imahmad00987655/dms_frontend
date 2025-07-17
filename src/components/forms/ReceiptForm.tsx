import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { ReceiptFormHeader } from "./receipt/ReceiptFormHeader";
import { ReceiptFormFields } from "./receipt/ReceiptFormFields";
import type { ReceiptFormData } from "./receipt/ReceiptFormFields";

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

interface ReceiptFormProps {
  onClose: () => void;
  selectedReceivable?: Invoice | null;
  onSubmit?: (data: ReceiptFormData) => void;
}

export const ReceiptForm = ({ onClose, selectedReceivable, onSubmit }: ReceiptFormProps) => {
  const [formData, setFormData] = useState({
    receiptNumber: `RCP-${Date.now()}`,
    receiptDate: new Date().toISOString().split('T')[0],
    customer: selectedReceivable?.customer_name || "",
    invoiceNumber: selectedReceivable?.invoice_number || selectedReceivable?.id?.toString() || "",
    amount: selectedReceivable?.total ? String(selectedReceivable.total) : "",
    paymentMethod: "",
    bankAccount: "",
    checkNumber: "",
    reference: "",
    description: `Payment received for ${selectedReceivable?.invoice_number || selectedReceivable?.id || 'invoice'}`,
    currency: "USD",
    status: "processed"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      const data: ReceiptFormData = {
        receiptNumber: formData.receiptNumber,
        receiptDate: formData.receiptDate,
        customer: formData.customer,
        invoiceNumber: formData.invoiceNumber,
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        bankAccount: formData.bankAccount,
        checkNumber: formData.checkNumber,
        reference: formData.reference,
        description: formData.description,
        currency: formData.currency,
        status: formData.status
      };
      console.log('ReceiptForm submitting:', data);
      onSubmit(data);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <ReceiptFormHeader onClose={onClose} />
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ReceiptFormFields formData={formData} setFormData={setFormData} />
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                <DollarSign className="w-4 h-4 mr-2" />
                Record Receipt
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
