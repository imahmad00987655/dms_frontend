import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  X, 
  Eye,
  FileText,
  Settings as SettingsIcon,
  Building2,
  DollarSign,
  Users,
  Trash2,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Segment {
  id: string;
  name: string;
  length: number;
  valueSet: string;
}

interface ValueSet {
  id: string;
  name: string;
  type: 'Independent' | 'Table';
  valuesCount: number;
  values: Value[];
}

interface Value {
  id: string;
  code: string;
  description: string;
}

interface CoAInstance {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  segments: Segment[];
  formatPreview: string;
  assignedLedgers: string[];
  usedBy: string[];
}

interface HeaderAssignment {
  id: string;
  headerId: string;
  coaInstance: string;
  assignedLedgers: string[];
  financialModules: string[];
  validationRules: string[];
}

interface NewSegment {
  name: string;
  length: string | number;
  valueSet: string;
}

const API_BASE_URL = 'http://localhost:5000/api';

const ChartOfAccountSetup = () => {
  const { toast } = useToast();
  
  // State for Structure Definition
  const [coaName, setCoaName] = useState("Distribution CoA");
  const [description, setDescription] = useState("Standard chart of accounts for distribution operations");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for new segment
  const [newSegment, setNewSegment] = useState<NewSegment>({
    name: "",
    length: "",
    valueSet: ""
  });

  // Fetch segments from API
  useEffect(() => {
    const loadData = async () => {
      await fetchSegments();
      await fetchValueSets();
    };
    loadData();
  }, []);
  
  const fetchSegments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/chart-of-accounts/segments`);
      const result = await response.json();
      
      if (result.success) {
        const formattedSegments = result.data.map((seg: any) => ({
          id: seg.id.toString(),
          name: seg.segment_name,
          length: seg.segment_length,
          valueSet: seg.value_set_name || ""
        }));
        setSegments(formattedSegments);
      }
    } catch (error) {
      console.error('Error fetching segments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch segments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchValueSets = async () => {
    try {
      console.log('Fetching value sets from:', `${API_BASE_URL}/chart-of-accounts/value-sets`);
      const response = await fetch(`${API_BASE_URL}/chart-of-accounts/value-sets`);
      const result = await response.json();
      console.log('Value sets API response:', result);
      
      if (result.success && result.data) {
        // Format value sets to match the component's interface
        const formatted = await Promise.all(result.data.map(async (vs: any) => {
          try {
            const valuesRes = await fetch(`${API_BASE_URL}/chart-of-accounts/value-sets/${vs.id}`);
            const valuesData = await valuesRes.json();
            return {
              id: vs.id.toString(),
              name: vs.value_set_name,
              type: vs.value_set_type === 'INDEPENDENT' ? 'Independent' : 'Table',
              valuesCount: valuesData.success && valuesData.data.values ? valuesData.data.values.length : 0,
              values: valuesData.success && valuesData.data.values ? valuesData.data.values.map((val: any) => ({
                id: val.id.toString(),
                code: val.value_code,
                description: val.value_description
              })) : []
            };
          } catch (error) {
            console.error(`Error fetching values for value set ${vs.id}:`, error);
            return {
              id: vs.id.toString(),
              name: vs.value_set_name,
              type: vs.value_set_type === 'INDEPENDENT' ? 'Independent' : 'Table',
              valuesCount: 0,
              values: []
            };
          }
        }));
        console.log('Formatted value sets:', formatted);
        setValueSets(formatted);
        console.log('Value Sets loaded:', formatted.length);
      } else {
        console.warn('No value sets found or API returned:', result);
      }
    } catch (error) {
      console.error('Error fetching value sets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch value sets",
        variant: "destructive"
      });
    }
  };

  // State for Value Sets  
  const [valueSets, setValueSets] = useState<ValueSet[]>([]);

  // State for modals
  const [showValueSetModal, setShowValueSetModal] = useState(false);
  const [showValuesModal, setShowValuesModal] = useState(false);
  const [selectedValueSet, setSelectedValueSet] = useState<ValueSet | null>(null);
  const [newValueSet, setNewValueSet] = useState({
    name: "",
    type: "Independent" as 'Independent' | 'Table'
  });
  const [newValue, setNewValue] = useState({
    code: "",
    description: ""
  });

  // State for CoA Instances
  const [coaInstances] = useState<CoAInstance[]>([]);

  // State for Header Assignments
  const [headerAssignments, setHeaderAssignments] = useState<HeaderAssignment[]>([]);
  const [newHeaderAssignment, setNewHeaderAssignment] = useState({
    headerId: "HDR-001",
    coaInstance: "",
    assignedLedgers: [] as string[],
    financialModules: [] as string[],
    validationRules: [] as string[]
  });

  const handleAddSegment = async () => {
    const lengthValue = typeof newSegment.length === 'string' ? parseInt(newSegment.length) : newSegment.length;
    if (newSegment.name && lengthValue > 0) {
      try {
        const response = await fetch(`${API_BASE_URL}/chart-of-accounts/segments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segment_name: newSegment.name,
            segment_length: lengthValue,
            value_set_name: newSegment.valueSet || null,
            display_order: segments.length + 1
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          await fetchSegments(); // Refresh segments
          setNewSegment({ name: "", length: "", valueSet: "" });
      toast({
        title: "Success",
        description: "Segment added successfully",
      });
        }
      } catch (error) {
        console.error('Error creating segment:', error);
        toast({
          title: "Error",
          description: "Failed to add segment",
          variant: "destructive"
        });
      }
    }
  };

  const handleRemoveSegment = (id: string) => {
    setSegments(segments.filter(segment => segment.id !== id));
    toast({
      title: "Success",
      description: "Segment removed successfully",
    });
  };

  const handleCreateValueSet = () => {
    if (newValueSet.name) {
      const valueSet: ValueSet = {
        id: Date.now().toString(),
        name: newValueSet.name,
        type: newValueSet.type,
        valuesCount: 0,
        values: []
      };
      setValueSets([...valueSets, valueSet]);
      setNewValueSet({ name: "", type: "Independent" });
      setShowValueSetModal(false);
      toast({
        title: "Success",
        description: "Value set created successfully",
      });
    }
  };

  const handleAddValue = () => {
    if (newValue.code && newValue.description && selectedValueSet) {
      const value: Value = {
        id: Date.now().toString(),
        code: newValue.code,
        description: newValue.description
      };
      
      const updatedValueSets = valueSets.map(vs => 
        vs.id === selectedValueSet.id 
          ? { ...vs, values: [...vs.values, value], valuesCount: vs.valuesCount + 1 }
          : vs
      );
      setValueSets(updatedValueSets);
      setNewValue({ code: "", description: "" });
      toast({
        title: "Success",
        description: "Value added successfully",
      });
    }
  };

  const handleCreateCoA = () => {
    toast({
      title: "Success",
      description: "Chart of Accounts created successfully",
    });
  };

  const handleCreateHeaderAssignment = () => {
    if (newHeaderAssignment.headerId && newHeaderAssignment.coaInstance) {
      const assignment: HeaderAssignment = {
        id: Date.now().toString(),
        ...newHeaderAssignment
      };
      setHeaderAssignments([...headerAssignments, assignment]);
      setNewHeaderAssignment({
        headerId: "",
        coaInstance: "",
        assignedLedgers: [],
        financialModules: [],
        validationRules: []
      });
      toast({
        title: "Success",
        description: "Header assignment created successfully",
      });
    }
  };

  const formatPreview = segments.map(s => s.name.substring(0, 3).toUpperCase()).join("-");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts Setup</h1>
        <p className="text-gray-600 mt-2">Configure account structures for distribution operations</p>
      </div>

      <Card className="bg-white shadow-lg">
        <CardContent className="p-6">
          <Tabs defaultValue="structure-definition" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="structure-definition">Structure Definition</TabsTrigger>
              <TabsTrigger value="value-sets">Value Sets</TabsTrigger>
              <TabsTrigger value="instances-assignments">Instances & Assignments</TabsTrigger>
              <TabsTrigger value="header-assignments">Header Assignments</TabsTrigger>
            </TabsList>

            {/* Structure Definition Tab */}
            <TabsContent value="structure-definition" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="coa-name">CoA Name *</Label>
                  <Input
                    id="coa-name"
                    value={coaName}
                    onChange={(e) => setCoaName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Segments</h3>
                  
                  {/* Current Segments */}
                  <div className="space-y-2 mb-4">
                    {segments.map((segment) => (
                      <div key={segment.id} className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {segment.name} ({segment.length}{segment.valueSet ? `, ${segment.valueSet}` : ""})
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSegment(segment.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {segments.length > 0 && (
                      <p className="text-sm text-gray-600">Preview: {formatPreview}</p>
                    )}
                  </div>

                  {/* Add New Segment */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium">Add New Segment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="segment-name">Segment Name</Label>
                        <Input
                          id="segment-name"
                          value={newSegment.name}
                          onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
                          placeholder="Company"
                        />
                      </div>
                      <div>
                        <Label htmlFor="length">Length</Label>
                        <Input
                          id="length"
                          type="number"
                          value={newSegment.length}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow values between 1 and 99999 (5 digits max)
                            if (value === '' || (value.length <= 5 && /^\d+$/.test(value))) {
                              setNewSegment({ ...newSegment, length: value });
                            }
                          }}
                          maxLength={5}
                          min={1}
                          max={99999}
                          placeholder="Enter five digits"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div>
                        <Label htmlFor="value-set">Value Set</Label>
                        <Select value={newSegment.valueSet || undefined} onValueChange={(value) => setNewSegment({ ...newSegment, valueSet: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select value set" />
                          </SelectTrigger>
                          <SelectContent>
                            {valueSets && valueSets.length > 0 ? (
                              valueSets.map((vs) => (
                                <SelectItem key={vs.id} value={vs.name}>{vs.name}</SelectItem>
                              ))
                            ) : (
                              <div className="px-2 py-6 text-center text-sm text-gray-500">
                                No value sets available. Please import the database schema.
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleAddSegment} className="bg-green-600 hover:bg-green-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleCreateCoA} className="bg-green-600 hover:bg-green-700">
                    Create Chart of Accounts
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Value Sets Tab */}
            <TabsContent value="value-sets" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Value Sets</h3>
                <Button 
                  onClick={() => setShowValueSetModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Value Set
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Set Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Values Count</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valueSets.map((valueSet) => (
                      <tr key={valueSet.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{valueSet.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                            {valueSet.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{valueSet.valuesCount}</td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedValueSet(valueSet);
                              setShowValuesModal(true);
                            }}
                            className="h-8 px-3 hover:bg-blue-100"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Values
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Instances & Assignments Tab */}
            <TabsContent value="instances-assignments" className="space-y-6">
              <h3 className="text-lg font-semibold">CoA Instances & Assignments</h3>
              
              {coaInstances.map((instance) => (
                <Card key={instance.id} className="bg-gray-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{instance.name}</CardTitle>
                        <CardDescription>{instance.description}</CardDescription>
                      </div>
                      <Badge className="bg-green-100 text-green-800">{instance.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Segment Structure:</h4>
                      <div className="flex flex-wrap gap-2">
                        {instance.segments.map((segment) => (
                          <Badge key={segment.id} variant="secondary" className="bg-green-100 text-green-800">
                            {segment.name} ({segment.length}{segment.valueSet ? `, ${segment.valueSet}` : ""})
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium">Format Preview: </span>
                      <span className="text-gray-600">{instance.formatPreview}</span>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Assigned Ledgers</p>
                        <p className="font-medium">{instance.assignedLedgers.join(", ")}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Used By</p>
                        <p className="font-medium">{instance.usedBy.join(", ")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Header Assignments Tab */}
            <TabsContent value="header-assignments" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Header Assignments</h3>
                <p className="text-gray-600 mb-6">Assign Chart of Accounts headers to ledgers and financial modules.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="header-id">Header ID *</Label>
                  <Input
                    id="header-id"
                    value={newHeaderAssignment.headerId}
                    onChange={(e) => setNewHeaderAssignment({ ...newHeaderAssignment, headerId: e.target.value })}
                    placeholder="HDR-001"
                  />
                </div>

                <div>
                  <Label htmlFor="coa-instance">CoA Instance *</Label>
                  <Select value={newHeaderAssignment.coaInstance} onValueChange={(value) => setNewHeaderAssignment({ ...newHeaderAssignment, coaInstance: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select CoA Instance" />
                    </SelectTrigger>
                    <SelectContent>
                      {coaInstances.map((instance) => (
                        <SelectItem key={instance.id} value={instance.name}>{instance.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Assign to Ledgers</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="primary-ledger"
                        checked={newHeaderAssignment.assignedLedgers.includes("Primary Distribution Ledger")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewHeaderAssignment({
                              ...newHeaderAssignment,
                              assignedLedgers: [...newHeaderAssignment.assignedLedgers, "Primary Distribution Ledger"]
                            });
                          } else {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  assignedLedgers: newHeaderAssignment.assignedLedgers.filter(l => l !== "Primary Distribution Ledger")
                                });
                              }
                            }}
                          />
                          <Label htmlFor="primary-ledger">Primary Distribution Ledger</Label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Financial Modules</h4>
                      <div className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="receivables"
                            checked={newHeaderAssignment.financialModules.includes("Receivables (AR)")}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  financialModules: [...newHeaderAssignment.financialModules, "Receivables (AR)"]
                                });
                              } else {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  financialModules: newHeaderAssignment.financialModules.filter(m => m !== "Receivables (AR)")
                                });
                              }
                            }}
                          />
                          <Label htmlFor="receivables">Receivables (AR)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="payables"
                            checked={newHeaderAssignment.financialModules.includes("Payables (AP)")}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  financialModules: [...newHeaderAssignment.financialModules, "Payables (AP)"]
                                });
                              } else {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  financialModules: newHeaderAssignment.financialModules.filter(m => m !== "Payables (AP)")
                                });
                              }
                            }}
                          />
                          <Label htmlFor="payables">Payables (AP)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="journal"
                            checked={newHeaderAssignment.financialModules.includes("Journal Vouchers (JV)")}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  financialModules: [...newHeaderAssignment.financialModules, "Journal Vouchers (JV)"]
                                });
                              } else {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  financialModules: newHeaderAssignment.financialModules.filter(m => m !== "Journal Vouchers (JV)")
                                });
                              }
                            }}
                          />
                          <Label htmlFor="journal">Journal Vouchers (JV)</Label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Validation Rules</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="enforce-qualifiers"
                            checked={newHeaderAssignment.validationRules.includes("Enforce Segment Qualifiers")}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  validationRules: [...newHeaderAssignment.validationRules, "Enforce Segment Qualifiers"]
                                });
                              } else {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  validationRules: newHeaderAssignment.validationRules.filter(r => r !== "Enforce Segment Qualifiers")
                                });
                              }
                            }}
                          />
                          <Label htmlFor="enforce-qualifiers">Enforce Segment Qualifiers</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="dynamic-inserts"
                            checked={newHeaderAssignment.validationRules.includes("Allow Dynamic Inserts")}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  validationRules: [...newHeaderAssignment.validationRules, "Allow Dynamic Inserts"]
                                });
                              } else {
                                setNewHeaderAssignment({
                                  ...newHeaderAssignment,
                                  validationRules: newHeaderAssignment.validationRules.filter(r => r !== "Allow Dynamic Inserts")
                                });
                              }
                            }}
                          />
                          <Label htmlFor="dynamic-inserts">Allow Dynamic Inserts</Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleCreateHeaderAssignment} className="bg-green-600 hover:bg-green-700">
                        Create Header Assignment
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Value Set Modal */}
          {showValueSetModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md bg-white shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Create New Value Set</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowValueSetModal(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="value-set-name">Value Set Name *</Label>
                    <Input
                      id="value-set-name"
                      value={newValueSet.name}
                      onChange={(e) => setNewValueSet({ ...newValueSet, name: e.target.value })}
                      placeholder="AR Accounts"
                    />
                  </div>
                  <div>
                    <Label htmlFor="value-set-type">Type *</Label>
                    <Select value={newValueSet.type} onValueChange={(value: 'Independent' | 'Table') => setNewValueSet({ ...newValueSet, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Independent">Independent</SelectItem>
                        <SelectItem value="Table">Table</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowValueSetModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateValueSet} className="bg-green-600 hover:bg-green-700">
                      Create Value Set
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Values Modal */}
          {showValuesModal && selectedValueSet && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-2xl bg-white shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Add New Value</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowValuesModal(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="value-code">Code</Label>
                      <Input
                        id="value-code"
                        value={newValue.code}
                        onChange={(e) => setNewValue({ ...newValue, code: e.target.value })}
                        placeholder="AR-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="value-description">Description</Label>
                      <Input
                        id="value-description"
                        value={newValue.description}
                        onChange={(e) => setNewValue({ ...newValue, description: e.target.value })}
                        placeholder="Customer Receivables"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleAddValue} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  
                  {/* Existing Values */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Existing Values</h4>
                    <div className="space-y-2">
                      {selectedValueSet.values.map((value) => (
                        <div key={value.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{value.code}</span>
                            <span className="text-gray-600 ml-2">{value.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      );
    };

    export default ChartOfAccountSetup;
