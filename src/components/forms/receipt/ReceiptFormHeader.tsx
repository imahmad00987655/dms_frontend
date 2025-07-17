
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, X } from "lucide-react";

interface ReceiptFormHeaderProps {
  onClose: () => void;
}

export const ReceiptFormHeader = ({ onClose }: ReceiptFormHeaderProps) => {
  return (
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="flex items-center gap-2">
        <Receipt className="w-5 h-5" />
        Create Receipt
      </CardTitle>
      <Button variant="ghost" size="sm" onClick={onClose}>
        <X className="w-4 h-4" />
      </Button>
    </CardHeader>
  );
};
