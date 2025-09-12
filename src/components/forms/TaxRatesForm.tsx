import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Plus, Save, Edit, Trash2, Eye } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import apiService from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface TaxRate {
  id: number;
  code: string;
  percentage: number;
  taxType: string;
  effectiveDate: string;
  endDate: string | null;
  recoverable: boolean;
  inclusive: boolean;
  selfAssessable: boolean;
  status: string;
}

interface TaxType {
  id: number;
  tax_type_code: string;
  tax_type_name: string;
  regime_id: number;
  operating_unit: string;
  ledger: string;
  liability_account: string;
  rounding_account: string;
  is_withholding_tax: boolean;
  is_self_assessed: boolean;
  is_recoverable: boolean;
  status: string;
}

const TaxRatesForm = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // State for tax rates data - will be populated from API
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);

  const loadTaxRates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getTaxRates();
      if (response.success) {
        // Transform the data to match frontend expectations
        const transformedData = response.data.map((rate: {
          id: number;
          rate_code: string;
          tax_percentage: number;
          tax_type_id: number;
          tax_type_name: string;
          effective_date: string;
          end_date: string | null;
          is_recoverable: boolean;
          is_inclusive: boolean;
          is_self_assessable: boolean;
          status: string;
        }) => ({
          id: rate.id,
          code: rate.rate_code,
          percentage: rate.tax_percentage,
          taxType: rate.tax_type_name,
          effectiveDate: rate.effective_date,
          endDate: rate.end_date,
          recoverable: !!rate.is_recoverable,
          inclusive: !!rate.is_inclusive,
          selfAssessable: !!rate.is_self_assessable,
          status: rate.status
        }));
        setTaxRates(transformedData);
      }
    } catch (error) {
      console.error('Error loading tax rates:', error);
      toast({
        title: "Error",
        description: "Failed to load tax rates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadTaxTypes = useCallback(async () => {
    try {
      const response = await apiService.getTaxTypes();
      if (response.success) {
        setTaxTypes(response.data);
      }
    } catch (error) {
      console.error('Error loading tax types:', error);
    }
  }, []);

  // Load tax rates and types on component mount
  useEffect(() => {
    loadTaxRates();
    loadTaxTypes();
  }, [loadTaxRates, loadTaxTypes]);

  const handleEdit = (taxRate: TaxRate) => {
    setEditingTaxRate(taxRate);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingTaxRate(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tax rate?')) {
      return;
    }

    try {
      const response = await apiService.deleteTaxRate(id);
      if (response.success) {
        toast({
          title: "Success",
          description: "Tax rate deleted successfully",
        });
        loadTaxRates();
      }
    } catch (error) {
      console.error('Error deleting tax rate:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete tax rate",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Tax Rates Configuration</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              New Tax Rate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTaxRate ? 'Edit Tax Rate' : 'Create New Tax Rate'}
              </DialogTitle>
            </DialogHeader>
            <TaxRateFormModal
              taxRate={editingTaxRate}
              taxTypes={taxTypes}
              onClose={() => {
                setIsDialogOpen(false);
                setEditingTaxRate(null);
              }}
              onSave={() => {
                setIsDialogOpen(false);
                setEditingTaxRate(null);
                loadTaxRates();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Tax Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Code</th>
                  <th className="text-left py-2 px-2">Percentage</th>
                  <th className="text-left py-2 px-2">Tax Type</th>
                  <th className="text-left py-2 px-2">Effective Date</th>
                  <th className="text-left py-2 px-2">End Date</th>
                  <th className="text-left py-2 px-2">Flags</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {taxRates.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 px-4 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-4xl">💰</div>
                        <p>No tax rates found</p>
                        <p className="text-sm">Click "New Tax Rate" to create your first tax rate</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  taxRates.map((rate) => (
                    <tr key={rate.id} className="border-b">
                      <td className="py-3 px-2 font-medium">{rate.code}</td>
                      <td className="py-3 px-2">{rate.percentage}%</td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary">{rate.taxType}</Badge>
                      </td>
                      <td className="py-3 px-2">{rate.effectiveDate}</td>
                      <td className="py-3 px-2">{rate.endDate || "N/A"}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-1">
                          {rate.recoverable && (
                            <Badge variant="secondary" className="text-xs">Recoverable</Badge>
                          )}
                          {rate.inclusive && (
                            <Badge variant="secondary" className="text-xs">Inclusive</Badge>
                          )}
                          {rate.selfAssessable && (
                            <Badge variant="secondary" className="text-xs">Self Assessable</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={rate.status === 'Active' ? 'default' : 'secondary'}>
                          {rate.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(rate)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(rate.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Separate form component for the modal
const TaxRateFormModal = ({ taxRate, taxTypes, onClose, onSave }: { taxRate: TaxRate | null, taxTypes: TaxType[], onClose: () => void, onSave: () => void }) => {
  const [effectiveDate, setEffectiveDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    code: taxRate?.code || '',
    percentage: taxRate?.percentage || '',
    taxType: taxRate?.taxType || '',
    recoverable: taxRate?.recoverable || false,
    inclusive: taxRate?.inclusive || false,
    selfAssessable: taxRate?.selfAssessable || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submitData = {
        rate_code: formData.code,
        tax_percentage: parseFloat(formData.percentage.toString()),
        tax_type_id: parseInt(formData.taxType),
        effective_date: effectiveDate ? format(effectiveDate, 'yyyy-MM-dd') : '',
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        is_recoverable: formData.recoverable,
        is_inclusive: formData.inclusive,
        is_self_assessable: formData.selfAssessable,
        status: 'ACTIVE'
      };

      if (taxRate) {
        // Update existing tax rate
        const response = await apiService.updateTaxRate(taxRate.id, submitData);
        if (response.success) {
          toast({
            title: "Success",
            description: "Tax rate updated successfully",
          });
          onSave();
        }
      } else {
        // Create new tax rate
        const response = await apiService.createTaxRate(submitData);
        if (response.success) {
          toast({
            title: "Success",
            description: "Tax rate created successfully",
          });
          onSave();
        }
      }
    } catch (error) {
      console.error('Error saving tax rate:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save tax rate",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="rateCode">Rate Code *</Label>
          <Input 
            id="rateCode" 
            placeholder="e.g., GST_18, GST_5, GST_0"
            value={formData.code}
            onChange={(e) => setFormData({...formData, code: e.target.value})}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="percentage">Tax Percentage *</Label>
          <div className="relative">
            <Input 
              id="percentage" 
              type="number" 
              step="0.01" 
              placeholder="18.00" 
              className="pr-8"
              value={formData.percentage}
              onChange={(e) => setFormData({...formData, percentage: e.target.value})}
              required
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
          </div>
        </div>
        
        
        <div className="space-y-2">
          <Label htmlFor="taxType">Tax Type *</Label>
          <Select value={formData.taxType} onValueChange={(value) => setFormData({...formData, taxType: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select tax type" />
            </SelectTrigger>
            <SelectContent>
              {taxTypes.map((taxType) => (
                <SelectItem key={taxType.id} value={taxType.id.toString()}>
                  {taxType.tax_type_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Effective Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !effectiveDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {effectiveDate ? format(effectiveDate, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={effectiveDate}
                onSelect={setEffectiveDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "Select date (optional)"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="recoverable" 
            checked={formData.recoverable}
            onCheckedChange={(checked) => setFormData({...formData, recoverable: !!checked})}
          />
          <Label htmlFor="recoverable">Recoverable (Input Tax Credit)</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="inclusive" 
            checked={formData.inclusive}
            onCheckedChange={(checked) => setFormData({...formData, inclusive: !!checked})}
          />
          <Label htmlFor="inclusive">Tax Inclusive</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="selfAssessable" 
            checked={formData.selfAssessable}
            onCheckedChange={(checked) => setFormData({...formData, selfAssessable: !!checked})}
          />
          <Label htmlFor="selfAssessable">Self Assessable (Reverse Charge)</Label>
        </div>
      </div>
      
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button type="submit" className="gap-2" disabled={submitting}>
          <Save className="h-4 w-4" />
          {submitting ? 'Saving...' : (taxRate ? 'Update Tax Rate' : 'Save Tax Rate')}
        </Button>
      </div>
    </form>
  );
};

export default TaxRatesForm;