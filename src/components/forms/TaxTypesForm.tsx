import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Edit, Eye } from "lucide-react";
import apiService from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface TaxType {
  id: number;
  code: string;
  name: string;
  regime: string; // regime_id as string
  regimeName: string; // regime_name for display
  operatingUnit: string;
  ledger: string;
  liabilityAccount: string;
  roundingAccount: string;
  withholdingTax: boolean;
  selfAssessed: boolean;
  recoverable: boolean;
  status: string;
}

interface TaxRegime {
  id: number;
  regime_code: string;
  regime_name: string;
  regime_type: string;
  tax_authority: string;
  effective_date: string;
  end_date: string | null;
  status: string;
}

const TaxTypesForm = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingTaxType, setEditingTaxType] = useState<TaxType | null>(null);
  const [viewingTaxType, setViewingTaxType] = useState<TaxType | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // State for tax types data - will be populated from API
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [taxRegimes, setTaxRegimes] = useState<TaxRegime[]>([]);

  const loadTaxTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getTaxTypes();
      if (response.success) {
        // Transform the data to match frontend expectations
        const transformedData = response.data.map((taxType: {
          id: number;
          tax_type_code: string;
          tax_type_name: string;
          regime_id: number;
          regime_name: string;
          operating_unit: string;
          ledger: string;
          liability_account: string;
          rounding_account: string;
          is_withholding_tax: boolean;
          is_self_assessed: boolean;
          is_recoverable: boolean;
          status: string;
        }) => ({
          id: taxType.id,
          code: taxType.tax_type_code,
          name: taxType.tax_type_name,
          regime: taxType.regime_id.toString(), // Store regime_id as string for Select component
          regimeName: taxType.regime_name, // Keep regime name for display
          operatingUnit: taxType.operating_unit,
          ledger: taxType.ledger,
          liabilityAccount: taxType.liability_account,
          roundingAccount: taxType.rounding_account,
          withholdingTax: !!taxType.is_withholding_tax,
          selfAssessed: !!taxType.is_self_assessed,
          recoverable: !!taxType.is_recoverable,
          status: taxType.status
        }));
        setTaxTypes(transformedData);
      }
    } catch (error) {
      console.error('Error loading tax types:', error);
      toast({
        title: "Error",
        description: "Failed to load tax types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadTaxRegimes = useCallback(async () => {
    try {
      const response = await apiService.getTaxRegimes();
      if (response.success) {
        setTaxRegimes(response.data);
      }
    } catch (error) {
      console.error('Error loading tax regimes:', error);
    }
  }, []);

  // Load tax types and regimes on component mount
  useEffect(() => {
    loadTaxTypes();
    loadTaxRegimes();
  }, [loadTaxTypes, loadTaxRegimes]);

  const handleEdit = (taxType: TaxType) => {
    setEditingTaxType(taxType);
    setIsDialogOpen(true);
  };

  const handleView = (taxType: TaxType) => {
    setViewingTaxType(taxType);
    setIsViewDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingTaxType(null);
    setIsDialogOpen(true);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Tax Types Configuration</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New Tax Type
        </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTaxType ? 'Edit Tax Type' : 'Create New Tax Type'}
              </DialogTitle>
            </DialogHeader>
            <TaxTypeForm
              taxType={editingTaxType}
              taxRegimes={taxRegimes}
              onClose={() => {
                setIsDialogOpen(false);
                setEditingTaxType(null);
              }}
              onSave={() => {
                setIsDialogOpen(false);
                setEditingTaxType(null);
                loadTaxTypes();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tax Type Details</DialogTitle>
          </DialogHeader>
          {viewingTaxType && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Code</Label>
                  <p className="text-sm font-medium">{viewingTaxType.code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-sm font-medium">{viewingTaxType.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Regime</Label>
                  <p className="text-sm font-medium">{viewingTaxType.regimeName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Operating Unit</Label>
                  <p className="text-sm font-medium">{viewingTaxType.operatingUnit}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Liability Account</Label>
                  <p className="text-sm font-medium">{viewingTaxType.liabilityAccount}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Rounding Account</Label>
                  <p className="text-sm font-medium">{viewingTaxType.roundingAccount}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={viewingTaxType.status === 'Active' ? 'default' : 'secondary'}>
                    {viewingTaxType.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Flags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewingTaxType.withholdingTax && (
                    <Badge variant="secondary">Withholding Tax</Badge>
                  )}
                  {viewingTaxType.selfAssessed && (
                    <Badge variant="secondary">Self Assessed</Badge>
                  )}
                  {viewingTaxType.recoverable && (
                    <Badge variant="secondary">Recoverable</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Tax Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Code</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Regime</th>
                  <th className="text-left py-2 px-2">Operating Unit</th>
                  <th className="text-left py-2 px-2">Liability Account</th>
                  <th className="text-left py-2 px-2">Flags</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {taxTypes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 px-4 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-4xl">📋</div>
                        <p>No tax types found</p>
                        <p className="text-sm">Click "New Tax Type" to create your first tax type</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  taxTypes.map((taxType) => (
                    <tr key={taxType.id} className="border-b">
                      <td className="py-3 px-2 font-medium">{taxType.code}</td>
                      <td className="py-3 px-2">{taxType.name}</td>
                      <td className="py-3 px-2">{taxType.regimeName}</td>
                      <td className="py-3 px-2">{taxType.operatingUnit}</td>
                      <td className="py-3 px-2">{taxType.liabilityAccount}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-1">
                          {taxType.withholdingTax && (
                            <Badge variant="secondary" className="text-xs">Withholding</Badge>
                          )}
                          {taxType.selfAssessed && (
                            <Badge variant="secondary" className="text-xs">Self Assessed</Badge>
                          )}
                          {taxType.recoverable && (
                            <Badge variant="secondary" className="text-xs">Recoverable</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={taxType.status === 'Active' ? 'default' : 'secondary'}>
                          {taxType.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleView(taxType)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(taxType)}>
                            <Edit className="h-4 w-4" />
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
const TaxTypeForm = ({ taxType, taxRegimes, onClose, onSave }: { taxType: TaxType | null, taxRegimes: TaxRegime[], onClose: () => void, onSave: () => void }) => {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    code: taxType?.code || '',
    name: taxType?.name || '',
    regime: taxType?.regime || '',
    operatingUnit: taxType?.operatingUnit || '',
    ledger: taxType?.ledger || '',
    liabilityAccount: taxType?.liabilityAccount || '',
    roundingAccount: taxType?.roundingAccount || '',
    withholdingTax: taxType?.withholdingTax || false,
    selfAssessed: taxType?.selfAssessed || false,
    recoverable: taxType?.recoverable || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submitData = {
        tax_type_code: formData.code,
        tax_type_name: formData.name,
        regime_id: parseInt(formData.regime), // Convert string back to number
        operating_unit: formData.operatingUnit,
        ledger: formData.ledger,
        liability_account: formData.liabilityAccount,
        rounding_account: formData.roundingAccount,
        is_withholding_tax: formData.withholdingTax,
        is_self_assessed: formData.selfAssessed,
        is_recoverable: formData.recoverable,
        status: 'ACTIVE'
      };

      if (taxType) {
        // Update existing tax type
        const response = await apiService.updateTaxType(taxType.id, submitData);
        if (response.success) {
          toast({
            title: "Success",
            description: "Tax type updated successfully",
          });
          onSave();
        }
      } else {
        // Create new tax type
        const response = await apiService.createTaxType(submitData);
        if (response.success) {
          toast({
            title: "Success",
            description: "Tax type created successfully",
          });
          onSave();
        }
      }
    } catch (error) {
      console.error('Error saving tax type:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save tax type",
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
              <Label htmlFor="taxTypeCode">Tax Type Code *</Label>
          <Input 
            id="taxTypeCode" 
            placeholder="e.g., CGST, SGST, IGST"
            value={formData.code}
            onChange={(e) => setFormData({...formData, code: e.target.value})}
            required
          />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taxTypeName">Tax Type Name *</Label>
          <Input 
            id="taxTypeName" 
            placeholder="e.g., Central Goods and Services Tax"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="regime">Tax Regime *</Label>
          <Select value={formData.regime} onValueChange={(value) => setFormData({...formData, regime: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tax regime" />
                </SelectTrigger>
                <SelectContent>
                  {taxRegimes.map((regime) => (
                    <SelectItem key={regime.id} value={regime.id.toString()}>
                      {regime.regime_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="operatingUnit">Operating Unit</Label>
          <Select value={formData.operatingUnit} onValueChange={(value) => setFormData({...formData, operatingUnit: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select operating unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HO">Head Office</SelectItem>
                  <SelectItem value="BR1">Branch 1</SelectItem>
                  <SelectItem value="BR2">Branch 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ledger">Ledger</Label>
          <Input 
            id="ledger" 
            placeholder="e.g., Primary Ledger"
            value={formData.ledger}
            onChange={(e) => setFormData({...formData, ledger: e.target.value})}
          />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="liabilityAccount">Liability Account</Label>
          <Input 
            id="liabilityAccount" 
            placeholder="e.g., CGST Payable"
            value={formData.liabilityAccount}
            onChange={(e) => setFormData({...formData, liabilityAccount: e.target.value})}
          />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="roundingAccount">Rounding Account</Label>
          <Input 
            id="roundingAccount" 
            placeholder="e.g., Tax Rounding Gain/Loss"
            value={formData.roundingAccount}
            onChange={(e) => setFormData({...formData, roundingAccount: e.target.value})}
          />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
          <Checkbox 
            id="withholdingTax" 
            checked={formData.withholdingTax}
            onCheckedChange={(checked) => setFormData({...formData, withholdingTax: !!checked})}
          />
              <Label htmlFor="withholdingTax">Withholding Tax</Label>
            </div>
            
            <div className="flex items-center space-x-2">
          <Checkbox 
            id="selfAssessed" 
            checked={formData.selfAssessed}
            onCheckedChange={(checked) => setFormData({...formData, selfAssessed: !!checked})}
          />
              <Label htmlFor="selfAssessed">Self Assessed</Label>
            </div>
            
            <div className="flex items-center space-x-2">
          <Checkbox 
            id="recoverable" 
            checked={formData.recoverable}
            onCheckedChange={(checked) => setFormData({...formData, recoverable: !!checked})}
          />
              <Label htmlFor="recoverable">Recoverable (Input Tax Credit)</Label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button type="submit" className="gap-2" disabled={submitting}>
              <Save className="h-4 w-4" />
          {submitting ? 'Saving...' : (taxType ? 'Update Tax Type' : 'Save Tax Type')}
            </Button>
          </div>
    </form>
  );
};

export default TaxTypesForm;