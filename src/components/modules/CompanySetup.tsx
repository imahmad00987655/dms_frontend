import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  MapPin, 
  Users, 
  DollarSign,
  Calendar,
  Globe,
  FileText,
  Activity,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LocationForm from "@/components/forms/LocationForm";
import ChartOfAccountSetup from "@/components/modules/ChartOfAccountSetup";
import LedgerConfigurations from "@/components/modules/LedgerConfigurations";

interface Company {
  id: number;
  name: string;
  legal_name: string;
  registration_number: string;
  country: string;
  currency: string;
  fiscal_year_start: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  created_at: string;
}

interface CompanyLocation {
  id: number;
  company_id: number;
  location_code: string;
  location_name: string;
  location_type: 'WAREHOUSE' | 'OFFICE' | 'RETAIL_STORE' | 'DISTRIBUTION_CENTER' | 'MANUFACTURING_PLANT' | 'OTHER';
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  is_primary: boolean;
  is_active: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
  company_name?: string;
}

const API_BASE_URL = 'http://localhost:5000/api';

const CompanySetup = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Location management states
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [selectedCompanyForLocation, setSelectedCompanyForLocation] = useState<Company | null>(null);
  const [editingLocation, setEditingLocation] = useState<CompanyLocation | null>(null);
  const [companyLocations, setCompanyLocations] = useState<CompanyLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    legal_name: "",
    registration_number: "",
    country: "",
    currency: "",
    fiscal_year_start: "",
    status: "Active" as 'Active' | 'Inactive' | 'Suspended'
  });

  // Fetch companies on component mount
  useEffect(() => {
    fetchCompanies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/companies`);
      const result = await response.json();
      
      if (result.data) {
        setCompanies(result.data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch companies. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    if (!formData.name || !formData.legal_name || !formData.registration_number) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      ...formData,
          created_by: 1 // Default user ID, should be from auth context
        }),
      });

      const result = await response.json();
    
      if (response.ok && result.success) {
    toast({
      title: "Company Created",
      description: `${formData.name} has been created successfully.`,
    });
        setShowCreateModal(false);
        resetForm();
        fetchCompanies(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to create company');
      }
    } catch (error: unknown) {
      console.error('Error creating company:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create company. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return "";
    
    // If it's already in YYYY-MM-DD format, use it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Handle ISO timestamp format (e.g., "2025-10-09T19:00:00.000Z")
    if (dateString.includes('T')) {
      const datePart = dateString.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return datePart;
      }
    }
    
    // Try to parse and format other date formats
    try {
      // Create a Date object from the string
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) return "";
      
      // Format to YYYY-MM-DD using local date components
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return "";
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name: "",
      legal_name: "",
      registration_number: "",
      country: "",
      currency: "",
      fiscal_year_start: "",
      status: "Active" as 'Active' | 'Inactive' | 'Suspended'
    });
  };

  const handleEditCompany = (company: Company) => {
    console.log('Editing company:', company);
    console.log('fiscal_year_start from backend:', company.fiscal_year_start);
    console.log('formatted fiscal_year_start:', formatDateForInput(company.fiscal_year_start));
    
    setEditingCompany(company);
    setFormData({
      name: company.name,
      legal_name: company.legal_name,
      registration_number: company.registration_number,
      country: company.country || "",
      currency: company.currency || "",
      fiscal_year_start: formatDateForInput(company.fiscal_year_start),
      status: company.status
    });
    setShowCreateModal(true);
  };

  const handleViewCompany = (company: Company) => {
    setViewingCompany(company);
    setShowViewModal(true);
    fetchCompanyLocations(company.id);
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/companies/${editingCompany.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          updated_by: 1 // Default user ID, should be from auth context
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
    toast({
      title: "Company Updated",
      description: `${formData.name} has been updated successfully.`,
    });
        setShowCreateModal(false);
        setEditingCompany(null);
        resetForm();
        fetchCompanies(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to update company');
      }
    } catch (error: unknown) {
      console.error('Error updating company:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update company. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (id: number) => {
    const company = companies.find(c => c.id === id);
    
    if (!confirm(`Are you sure you want to delete ${company?.name}?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/companies/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deleted_by: 1 // Default user ID, should be from auth context
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
    toast({
      title: "Company Deleted",
      description: `${company?.name} has been deleted successfully.`,
    });
        fetchCompanies(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to delete company');
      }
    } catch (error: unknown) {
      console.error('Error deleting company:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete company. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Location management functions
  const fetchCompanyLocations = async (companyId: number) => {
    try {
      setLoadingLocations(true);
      const response = await fetch(`${API_BASE_URL}/company-locations/company/${companyId}`);
      const result = await response.json();
      
      if (result.data) {
        setCompanyLocations(result.data);
      }
    } catch (error) {
      console.error('Error fetching company locations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch locations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleAddLocation = (company: Company) => {
    setSelectedCompanyForLocation(company);
    setEditingLocation(null);
    setShowViewModal(false); // Close view modal so location form appears on top
    setShowLocationForm(true);
  };

  const handleEditLocation = (location: CompanyLocation) => {
    setEditingLocation(location);
    setSelectedCompanyForLocation(companies.find(c => c.id === location.company_id) || null);
    setShowViewModal(false); // Close view modal so location form appears on top
    setShowLocationForm(true);
  };

  const handleDeleteLocation = async (locationId: number) => {
    const location = companyLocations.find(l => l.id === locationId);
    
    if (!confirm(`Are you sure you want to delete ${location?.location_name}?`)) {
      return;
    }

    try {
      setLoadingLocations(true);
      const response = await fetch(`${API_BASE_URL}/company-locations/${locationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deleted_by: 1 // Default user ID, should be from auth context
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Location Deleted",
          description: `${location?.location_name} has been deleted successfully.`,
        });
        // Refresh locations for the current company
        if (selectedCompanyForLocation) {
          fetchCompanyLocations(selectedCompanyForLocation.id);
        }
      } else {
        throw new Error(result.error || 'Failed to delete location');
      }
    } catch (error: unknown) {
      console.error('Error deleting location:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete location. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleLocationFormSuccess = () => {
    const companyId = selectedCompanyForLocation?.id;
    setShowLocationForm(false);
    setEditingLocation(null);
    
    // If there was a viewing company, refresh locations and potentially reopen view modal
    if (companyId) {
      fetchCompanyLocations(companyId);
      // Optionally reopen the view modal to show updated locations
      if (viewingCompany && viewingCompany.id === companyId) {
        // Refresh locations in the view modal
        fetchCompanyLocations(companyId);
      }
    }
    
    setSelectedCompanyForLocation(null);
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.registration_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || company.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCompanies = companies.filter(c => c.status === 'Active').length;
  const totalCompanies = companies.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Company Setup
            </h1>
            <p className="text-gray-600 mt-1">Manage distributor companies and legal entities</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-white/70">
              {activeCompanies} Active Companies
            </Badge>
            <Button 
              onClick={() => {
                setEditingCompany(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Company
            </Button>
          </div>
        </div>

        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Companies</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCompanies}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Companies</p>
                  <p className="text-2xl font-bold text-green-600">{activeCompanies}</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Countries</p>
                  <p className="text-2xl font-bold text-purple-600">{new Set(companies.map(c => c.country)).size}</p>
                </div>
                <Globe className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Currencies</p>
                  <p className="text-2xl font-bold text-orange-600">{new Set(companies.map(c => c.currency)).size}</p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Setup Tabs */}
        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 bg-white/70 backdrop-blur-sm">
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Companies</span>
            </TabsTrigger>
            <TabsTrigger value="chart-of-account" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Chart of Account</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Ledger Configurations</span>
            </TabsTrigger>
          </TabsList>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Company Directory
                    </CardTitle>
                    <CardDescription>
                      Manage all distributor companies and their information
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Status</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading companies...</span>
                  </div>
                ) : filteredCompanies.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Companies Found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm || statusFilter !== "All" 
                        ? "No companies match your search criteria." 
                        : "Get started by creating your first company."}
                    </p>
                    <Button 
                      onClick={() => {
                        setEditingCompany(null);
                        resetForm();
                        setShowCreateModal(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Company
                    </Button>
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Company ID</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Legal Entity</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Country</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Currency</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompanies.map((company) => (
                        <tr key={company.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="py-3 px-4 text-sm text-gray-900">{company.id}</td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{company.name}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{company.legal_name}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{company.country || '-'}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{company.currency || '-'}</td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={company.status === 'Active' ? 'default' : 'secondary'}
                              className={company.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                            >
                              {company.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewCompany(company)}
                                className="h-8 w-8 p-0 hover:bg-green-100"
                                disabled={loading}
                                title="View Company Details"
                              >
                                <Eye className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCompany(company)}
                                className="h-8 w-8 p-0 hover:bg-blue-100"
                                  disabled={loading}
                                  title="Edit Company"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCompany(company.id)}
                                className="h-8 w-8 p-0 hover:bg-red-100"
                                  disabled={loading}
                                  title="Delete Company"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
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

          {/* Chart of Account Tab */}
          <TabsContent value="chart-of-account" className="space-y-6">
            <ChartOfAccountSetup />
          </TabsContent>

          {/* Ledger Configurations Tab */}
          <TabsContent value="users" className="space-y-6">
            <LedgerConfigurations />
          </TabsContent>
        </Tabs>

        {/* Create/Edit Company Modal */}
        <Dialog open={showCreateModal} onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingCompany(null);
            resetForm();
          } else {
            setShowCreateModal(true);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                {editingCompany ? 'Edit Company' : 'Create New Company'}
              </DialogTitle>
              <DialogDescription>
                {editingCompany ? 'Update company information' : 'Enter the distributor company information'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter company name"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Legal Name *</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    placeholder="Enter legal entity name"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Registration Number *</Label>
                  <Input
                    id="registration_number"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="Enter registration number"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select 
                    value={formData.country} 
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="Germany">Germany</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Japan">Japan</SelectItem>
                      <SelectItem value="China">China</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiscal_year_start">Fiscal Year Start</Label>
                  <Input
                    id="fiscal_year_start"
                    type="date"
                    value={formData.fiscal_year_start}
                    onChange={(e) => setFormData({ ...formData, fiscal_year_start: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value as 'Active' | 'Inactive' | 'Suspended' })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCompany(null);
                  resetForm();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={editingCompany ? handleUpdateCompany : handleCreateCompany}
                className="bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingCompany ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>{editingCompany ? 'Update Company' : 'Create Company'}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Company Modal */}
        <Dialog open={showViewModal} onOpenChange={(open) => {
          if (!open) {
            setShowViewModal(false);
          } else {
            setShowViewModal(true);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-600" />
                Company Details
              </DialogTitle>
              <DialogDescription>
                View company information
              </DialogDescription>
            </DialogHeader>
            {viewingCompany && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Information */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Company Name</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                        <span className="text-gray-900">{viewingCompany.name}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Legal Name</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                        <span className="text-gray-900">{viewingCompany.legal_name}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600">Registration Number</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                        <span className="text-gray-900">{viewingCompany.registration_number}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600">Status</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                        <Badge 
                          variant={viewingCompany.status === 'Active' ? 'default' : 'secondary'}
                          className={viewingCompany.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {viewingCompany.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Country</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                        <span className="text-gray-900 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          {viewingCompany.country || 'Not specified'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600">Currency</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                        <span className="text-gray-900 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {viewingCompany.currency || 'USD'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600">Fiscal Year Start</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                        <span className="text-gray-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {viewingCompany.fiscal_year_start || 'Not specified'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600">Created At</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                        <span className="text-gray-900">
                          {new Date(viewingCompany.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Locations Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Locations & Sites</h3>
                    <Button
                      size="sm"
                      onClick={() => handleAddLocation(viewingCompany)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Location
                    </Button>
                  </div>
                  
                  {loadingLocations ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                      <span className="text-gray-600">Loading locations...</span>
                    </div>
                  ) : companyLocations.length > 0 ? (
                    <div className="space-y-4">
                      {companyLocations.map((location) => (
                        <div key={location.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">{location.location_name}</h4>
                                {location.is_primary && (
                                  <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                                    Primary
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {location.location_type.replace('_', ' ')}
                                </Badge>
                                <Badge 
                                  variant={location.status === 'ACTIVE' ? 'default' : 'secondary'}
                                  className={location.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                >
                                  {location.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{location.location_code}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLocation(location)}
                              className="h-8 w-8 p-0 hover:bg-blue-100"
                              disabled={loadingLocations}
                              title="Edit Location"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            {location.address_line1 && (
                              <p className="flex items-center gap-2">
                                <MapPin className="w-3 h-3" />
                                {location.address_line1}
                              </p>
                            )}
                            {location.city && location.state && (
                              <p>{location.city}, {location.state}</p>
                            )}
                            {location.country && (
                              <p>{location.country}</p>
                            )}
                            {location.phone && (
                              <p className="flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                {location.phone}
                              </p>
                            )}
                          </div>
                          
                          {location.contact_person && (
                            <div className="mt-3 text-xs text-gray-500">
                              Contact: {location.contact_person}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Locations Found</h4>
                      <p className="text-gray-600 mb-4">This company doesn't have any locations yet.</p>
                      <Button
                        onClick={() => handleAddLocation(viewingCompany)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Location
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => setShowViewModal(false)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Location Form Modal */}
        <Dialog open={showLocationForm} onOpenChange={(open) => {
          if (!open) {
            setShowLocationForm(false);
            setEditingLocation(null);
            setSelectedCompanyForLocation(null);
          } else {
            setShowLocationForm(true);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </DialogTitle>
              <DialogDescription>
                {editingLocation ? 'Update location information' : selectedCompanyForLocation ? `Add a new location for ${selectedCompanyForLocation.name}` : 'Add a new location'}
              </DialogDescription>
            </DialogHeader>
            {selectedCompanyForLocation && (
              <LocationForm
                companyId={selectedCompanyForLocation.id}
                onClose={() => {
                  setShowLocationForm(false);
                  setEditingLocation(null);
                  setSelectedCompanyForLocation(null);
                }}
                onSuccess={handleLocationFormSuccess}
                locationToEdit={editingLocation}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CompanySetup;
