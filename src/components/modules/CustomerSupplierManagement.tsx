import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Eye, Users, Building2, UserCheck, Truck, X, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import apiService from '@/services/api';

// Types
interface Party {
  party_id: number;
  party_number: string;
  party_name: string;
  party_type: 'PERSON' | 'ORGANIZATION' | 'GROUP';
  tax_id?: string;
  website?: string;
  industry?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  site_count: number;
  customer_profile_count: number;
  supplier_profile_count: number;
  created_at: string;
}

interface PartySite {
  site_id: number;
  party_id: number;
  site_name: string;
  site_type: 'BILL_TO' | 'SHIP_TO' | 'PAYMENT' | 'PURCHASING' | 'BOTH';
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  country_code?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  contact_person?: string;
  contact_title?: string;
  contact_phone?: string;
  contact_email?: string;
  is_primary: boolean;
  is_active: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

interface CustomerProfile {
  profile_id: number;
  party_id: number;
  customer_number: string;
  customer_type: 'INDIVIDUAL' | 'CORPORATE' | 'GOVERNMENT' | 'NON_PROFIT';
  customer_class?: string;
  customer_category?: string;
  credit_limit: number;
  credit_hold_flag: boolean;
  payment_terms_id: number;
  currency_code: string;
  discount_percent: number;
  tax_exempt_flag: boolean;
  tax_exemption_number?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  party_name: string;
  party_type: string;
  tax_id?: string;
  website?: string;
  industry?: string;
}

interface SupplierProfile {
  profile_id: number;
  party_id: number;
  supplier_number: string;
  supplier_type: 'VENDOR' | 'CONTRACTOR' | 'SERVICE_PROVIDER' | 'GOVERNMENT';
  supplier_class?: string;
  supplier_category?: string;
  credit_limit: number;
  hold_flag: boolean;
  payment_terms_id: number;
  currency_code: string;
  payment_method?: string;
  bank_account?: string;
  tax_exempt_flag: boolean;
  tax_exemption_number?: string;
  minority_owned_flag: boolean;
  women_owned_flag: boolean;
  veteran_owned_flag: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  party_name: string;
  party_type: string;
  tax_id?: string;
  website?: string;
  industry?: string;
}

interface ContactPoint {
  contact_point_id: number;
  party_id: number;
  contact_point_type: 'PHONE' | 'EMAIL' | 'FAX' | 'WEB' | 'MOBILE';
  contact_point_value: string;
  contact_point_purpose?: string;
  is_primary: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export const CustomerSupplierManagement: React.FC = () => {
  // State
  const [parties, setParties] = useState<Party[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierProfile | null>(null);
  const [partySites, setPartySites] = useState<PartySite[]>([]);
  const [contactPoints, setContactPoints] = useState<ContactPoint[]>([]);
  
  // Form states
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [partyToEdit, setPartyToEdit] = useState<Party | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerProfile | null>(null);
  const [supplierToEdit, setSupplierToEdit] = useState<SupplierProfile | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Load data
  useEffect(() => {
    loadParties();
    loadCustomers();
    loadSuppliers();
  }, []);

  const loadParties = async () => {
    try {
      setLoading(true);
      const data = await apiService.getParties();
      setParties(data);
    } catch (error) {
      console.error('Error loading parties:', error);
      toast.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await apiService.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await apiService.getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

  const loadPartySites = async (partyId: number) => {
    try {
      setLoadingSites(true);
      const data = await apiService.getPartySites(partyId);
      setPartySites(data);
    } catch (error) {
      console.error('Error loading party sites:', error);
      toast.error('Failed to load party sites');
    } finally {
      setLoadingSites(false);
    }
  };

  const loadContactPoints = async (partyId: number) => {
    try {
      setLoadingContacts(true);
      const data = await apiService.getPartyContacts(partyId);
      setContactPoints(data);
    } catch (error) {
      console.error('Error loading contact points:', error);
      toast.error('Failed to load contact points');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleEditParty = (party: Party) => {
    setPartyToEdit(party);
    setShowPartyForm(true);
  };

  const handleDeleteParty = async (party: Party) => {
    try {
      await apiService.deleteParty(party.party_id);
      toast.success('Party deleted successfully');
      
      // Refresh all lists to reflect the deletion
      loadParties();
      loadCustomers();
      loadSuppliers();
    } catch (error) {
      console.error('Error deleting party:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete party';
      toast.error(errorMessage);
    }
  };

  const handleEditCustomer = (customer: CustomerProfile) => {
    setCustomerToEdit(customer);
    setShowCustomerForm(true);
  };

  const handleDeleteCustomer = async (customer: CustomerProfile) => {
    try {
      await apiService.deleteCustomer(customer.profile_id);
      toast.success('Customer profile deleted successfully');
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete customer';
      toast.error(errorMessage);
    }
  };

  const handleEditSupplier = (supplier: SupplierProfile) => {
    setSupplierToEdit(supplier);
    setShowSupplierForm(true);
  };

  const handleDeleteSupplier = async (supplier: SupplierProfile) => {
    try {
      await apiService.deleteSupplier(supplier.profile_id);
      toast.success('Supplier profile deleted successfully');
      loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete supplier';
      toast.error(errorMessage);
    }
  };

  // Filter functions
  const filteredParties = parties.filter(party => {
    const matchesSearch = party.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         party.party_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (party.tax_id && party.tax_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || party.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || party.party_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.customer_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.supplier_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || supplier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Status badge component
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      INACTIVE: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800' },
      SUSPENDED: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
      PENDING: { variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.INACTIVE;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  // Type badge component
  const getTypeBadge = (type: string) => {
    const typeConfig = {
      ORGANIZATION: { className: 'bg-blue-100 text-blue-800' },
      PERSON: { className: 'bg-purple-100 text-purple-800' },
      GROUP: { className: 'bg-orange-100 text-orange-800' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.ORGANIZATION;
    
    return (
      <Badge variant="outline" className={config.className}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer & Supplier Management</h1>
          <p className="text-muted-foreground">
            Manage customers and suppliers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowPartyForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Party
          </Button>
          <Button onClick={() => setShowCustomerForm(true)} variant="outline">
            <UserCheck className="w-4 h-4 mr-2" />
            New Customer
          </Button>
          <Button onClick={() => setShowSupplierForm(true)} variant="outline">
            <Truck className="w-4 h-4 mr-2" />
            New Supplier
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, number, or tax ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
                      <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(value: string) => setTypeFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="ORGANIZATION">Organization</SelectItem>
              <SelectItem value="PERSON">Person</SelectItem>
              <SelectItem value="GROUP">Group</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="parties" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="parties" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Parties
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Suppliers
          </TabsTrigger>
        </TabsList>

        {/* Parties Tab */}
        <TabsContent value="parties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                All Parties
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading parties...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Party Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tax ID</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Profiles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParties.map((party) => (
                      <TableRow key={party.party_id}>
                        <TableCell className="font-medium">{party.party_number}</TableCell>
                        <TableCell>{party.party_name}</TableCell>
                        <TableCell>{getTypeBadge(party.party_type)}</TableCell>
                        <TableCell>{party.tax_id || '-'}</TableCell>
                        <TableCell>{party.industry || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {party.customer_profile_count > 0 && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                C: {party.customer_profile_count}
                              </Badge>
                            )}
                            {party.supplier_profile_count > 0 && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                S: {party.supplier_profile_count}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(party.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedParty(party);
                                loadPartySites(party.party_id);
                                loadContactPoints(party.party_id);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditParty(party)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  title="Delete party"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Party</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{party.party_name}"? This action cannot be undone.
                                    {party.customer_profile_count > 0 || party.supplier_profile_count > 0 ? (
                                      <span className="block mt-2 text-red-600 font-medium">
                                        ⚠️ <strong>WARNING:</strong> This party has {party.customer_profile_count} customer profile(s) and {party.supplier_profile_count} supplier profile(s) that will be <strong>PERMANENTLY DELETED</strong> along with all associated sites and contacts.
                                      </span>
                                    ) : (
                                      <span className="block mt-2 text-gray-600">
                                        This will also delete all associated sites and contacts.
                                      </span>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteParty(party)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Customer Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.profile_id}>
                      <TableCell className="font-medium">{customer.customer_number}</TableCell>
                      <TableCell>{customer.party_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {customer.customer_type}
                        </Badge>
                      </TableCell>
                      <TableCell>${customer.credit_limit.toLocaleString()}</TableCell>
                      <TableCell>{customer.payment_terms_id} days</TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Customer Profile</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the customer profile for "{customer.party_name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteCustomer(customer)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Supplier Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.profile_id}>
                      <TableCell className="font-medium">{supplier.supplier_number}</TableCell>
                      <TableCell>{supplier.party_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {supplier.supplier_type}
                        </Badge>
                      </TableCell>
                      <TableCell>${supplier.credit_limit.toLocaleString()}</TableCell>
                      <TableCell>{supplier.payment_method || '-'}</TableCell>
                      <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedSupplier(supplier)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditSupplier(supplier)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Supplier Profile</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the supplier profile for "{supplier.party_name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteSupplier(supplier)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Party Details Dialog */}
      {selectedParty && (
        <Dialog open={!!selectedParty} onOpenChange={() => setSelectedParty(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Party Details: {selectedParty.party_name}</DialogTitle>
              <p className="text-sm text-gray-600">
                View and manage details for {selectedParty.party_name} including sites and contact information.
              </p>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Party Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Party Number</label>
                    <p className="text-sm text-gray-600">{selectedParty.party_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <p className="text-sm text-gray-600">{selectedParty.party_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tax ID</label>
                    <p className="text-sm text-gray-600">{selectedParty.tax_id || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <p className="text-sm text-gray-600">{selectedParty.industry || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <p className="text-sm text-gray-600">{selectedParty.website || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="text-sm text-gray-600">{getStatusBadge(selectedParty.status)}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Party Sites */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Addresses & Sites
                    <Button size="sm" onClick={() => setShowSiteForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Site
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSites ? (
                    <div className="text-center py-4">Loading sites...</div>
                  ) : partySites.length > 0 ? (
                    <div className="space-y-4">
                      {partySites.map((site) => (
                        <div key={site.site_id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{site.site_name}</h4>
                            <div className="flex items-center gap-2">
                              {site.is_primary && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                  Primary
                                </Badge>
                              )}
                              <Badge variant="outline">{site.site_type}</Badge>
                              {getStatusBadge(site.status)}
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // TODO: Implement edit site functionality
                                    toast.info('Edit site functionality coming soon');
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Site</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this site? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={async () => {
                                        try {
                                          await apiService.deletePartySite(site.site_id);
                                          loadPartySites(selectedParty.party_id);
                                          toast.success('Site deleted successfully');
                                        } catch (error) {
                                          console.error('Error deleting site:', error);
                                          toast.error('Failed to delete site');
                                        }
                                      }}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {site.address_line1 && <p>{site.address_line1}</p>}
                            {site.address_line2 && <p>{site.address_line2}</p>}
                            {site.city && site.state && (
                              <p>{site.city}, {site.state} {site.postal_code}</p>
                            )}
                            {site.country && <p>{site.country}</p>}
                            {site.phone && <p>Phone: {site.phone}</p>}
                            {site.email && <p>Email: {site.email}</p>}
                            {site.contact_person && <p>Contact: {site.contact_person}</p>}
                            {site.contact_title && <p>Title: {site.contact_title}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">No sites found</div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Contact Information
                    <Button size="sm" onClick={() => setShowContactForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Contact
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingContacts ? (
                    <div className="text-center py-4">Loading contacts...</div>
                  ) : contactPoints.length > 0 ? (
                    <div className="space-y-2">
                      {contactPoints.map((contact) => (
                        <div key={contact.contact_point_id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <span className="font-medium">{contact.contact_point_type}:</span>
                            <span className="ml-2">{contact.contact_point_value}</span>
                            {contact.contact_point_purpose && (
                              <span className="ml-2 text-sm text-gray-500">({contact.contact_point_purpose})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {contact.is_primary && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                Primary
                              </Badge>
                            )}
                            {getStatusBadge(contact.status)}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // TODO: Implement edit contact functionality
                                  toast.info('Edit contact functionality coming soon');
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this contact? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={async () => {
                                      try {
                                        await apiService.deleteContactPoint(contact.contact_point_id);
                                        loadContactPoints(selectedParty.party_id);
                                        toast.success('Contact deleted successfully');
                                      } catch (error) {
                                        console.error('Error deleting contact:', error);
                                        toast.error('Failed to delete contact');
                                      }
                                    }}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">No contact points found</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Customer Details Dialog */}
      {selectedCustomer && (
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customer Details: {selectedCustomer.party_name}</DialogTitle>
              <p className="text-sm text-gray-600">
                View customer profile details for {selectedCustomer.party_name}.
              </p>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Customer Number</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.customer_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Customer Type</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.customer_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Customer Class</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.customer_class || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Customer Category</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.customer_category || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Credit Limit</label>
                    <p className="text-sm text-gray-600">${selectedCustomer.credit_limit.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Credit Hold</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.credit_hold_flag ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Payment Terms</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.payment_terms_id} days</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Currency</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.currency_code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Discount %</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.discount_percent}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tax Exempt</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.tax_exempt_flag ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tax Exemption Number</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.tax_exemption_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-gray-600">{getStatusBadge(selectedCustomer.status)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Party Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Party Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Party Name</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.party_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Party Type</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.party_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tax ID</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.tax_id || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.website || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <p className="text-sm text-gray-600">{selectedCustomer.industry || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Supplier Details Dialog */}
      {selectedSupplier && (
        <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Supplier Details: {selectedSupplier.party_name}</DialogTitle>
              <p className="text-sm text-gray-600">
                View supplier profile details for {selectedSupplier.party_name}.
              </p>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Supplier Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Supplier Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Supplier Number</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.supplier_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Supplier Type</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.supplier_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Supplier Class</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.supplier_class || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Supplier Category</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.supplier_category || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Credit Limit</label>
                    <p className="text-sm text-gray-600">${selectedSupplier.credit_limit.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Hold Flag</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.hold_flag ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Payment Terms</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.payment_terms_id} days</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Currency</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.currency_code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Payment Method</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.payment_method || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bank Account</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.bank_account || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tax Exempt</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.tax_exempt_flag ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tax Exemption Number</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.tax_exemption_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Minority Owned</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.minority_owned_flag ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Women Owned</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.women_owned_flag ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Veteran Owned</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.veteran_owned_flag ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-gray-600">{getStatusBadge(selectedSupplier.status)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Party Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Party Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Party Name</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.party_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Party Type</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.party_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tax ID</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.tax_id || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.website || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <p className="text-sm text-gray-600">{selectedSupplier.industry || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Party Form Dialog */}
      <Dialog open={showPartyForm} onOpenChange={(open) => {
        setShowPartyForm(open);
        if (!open) {
          setPartyToEdit(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{partyToEdit ? 'Edit Party' : 'Create New Party'}</DialogTitle>
          </DialogHeader>
          <PartyForm 
            onClose={() => {
              setShowPartyForm(false);
              setPartyToEdit(null);
            }} 
            onSuccess={() => {
              setShowPartyForm(false);
              setPartyToEdit(null);
              loadParties();
              toast.success(partyToEdit ? 'Party updated successfully' : 'Party created successfully');
            }}
            partyToEdit={partyToEdit}
          />
        </DialogContent>
      </Dialog>

      {/* Customer Form Dialog */}
      <Dialog open={showCustomerForm} onOpenChange={(open) => {
        setShowCustomerForm(open);
        if (!open) {
          setCustomerToEdit(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{customerToEdit ? 'Edit Customer Profile' : 'Create Customer Profile'}</DialogTitle>
          </DialogHeader>
          <CustomerForm 
            onClose={() => {
              setShowCustomerForm(false);
              setCustomerToEdit(null);
            }} 
            onSuccess={() => {
              setShowCustomerForm(false);
              setCustomerToEdit(null);
              loadCustomers();
              toast.success(customerToEdit ? 'Customer profile updated successfully' : 'Customer profile created successfully');
            }}
            customerToEdit={customerToEdit}
          />
        </DialogContent>
      </Dialog>

      {/* Supplier Form Dialog */}
      <Dialog open={showSupplierForm} onOpenChange={(open) => {
        setShowSupplierForm(open);
        if (!open) {
          setSupplierToEdit(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{supplierToEdit ? 'Edit Supplier Profile' : 'Create Supplier Profile'}</DialogTitle>
          </DialogHeader>
          <SupplierForm 
            onClose={() => {
              setShowSupplierForm(false);
              setSupplierToEdit(null);
            }} 
            onSuccess={() => {
              setShowSupplierForm(false);
              setSupplierToEdit(null);
              loadSuppliers();
              toast.success(supplierToEdit ? 'Supplier profile updated successfully' : 'Supplier profile created successfully');
            }}
            supplierToEdit={supplierToEdit}
          />
        </DialogContent>
      </Dialog>

      {/* Site Form Dialog */}
      <Dialog open={showSiteForm} onOpenChange={setShowSiteForm}>
        <DialogContent className="max-w-3xl" aria-describedby="site-form-description">
          <DialogHeader>
            <DialogTitle>Add New Site</DialogTitle>
            <p id="site-form-description" className="text-sm text-gray-600">Add a new address or location for this party</p>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <SiteForm 
              partyId={selectedParty?.party_id} 
              onClose={() => setShowSiteForm(false)} 
              onSuccess={() => {
                setShowSiteForm(false);
                if (selectedParty) {
                  loadPartySites(selectedParty.party_id);
                }
                toast.success('Site added successfully');
              }} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-2xl" aria-describedby="contact-form-description">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <p id="contact-form-description" className="text-sm text-gray-600">Add a new contact point for this party</p>
          </DialogHeader>
          <ContactForm 
            partyId={selectedParty?.party_id} 
            onClose={() => setShowContactForm(false)} 
            onSuccess={() => {
              setShowContactForm(false);
              if (selectedParty) {
                loadContactPoints(selectedParty.party_id);
              }
              toast.success('Contact added successfully');
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Party Form Component
interface PartyFormProps {
  onClose: () => void;
  onSuccess: () => void;
  partyToEdit?: Party | null;
}

const PartyForm: React.FC<PartyFormProps> = ({ onClose, onSuccess, partyToEdit }) => {
  const [formData, setFormData] = useState({
    party_name: partyToEdit?.party_name || '',
    party_type: partyToEdit?.party_type || 'ORGANIZATION',
    tax_id: partyToEdit?.tax_id || '',
    website: partyToEdit?.website || '',
    industry: partyToEdit?.industry || '',
    status: partyToEdit?.status || 'ACTIVE'
  });

  const [loading, setLoading] = useState(false);

  // Update form data when partyToEdit changes
  useEffect(() => {
    if (partyToEdit) {
      setFormData({
        party_name: partyToEdit.party_name,
        party_type: partyToEdit.party_type,
        tax_id: partyToEdit.tax_id || '',
        website: partyToEdit.website || '',
        industry: partyToEdit.industry || '',
        status: partyToEdit.status
      });
    } else {
      setFormData({
        party_name: '',
        party_type: 'ORGANIZATION',
        tax_id: '',
        website: '',
        industry: '',
        status: 'ACTIVE'
      });
    }
  }, [partyToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (partyToEdit) {
        await apiService.updateParty(partyToEdit.party_id, formData);
        toast.success('Party updated successfully');
      } else {
        await apiService.createParty(formData);
        toast.success('Party created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving party:', error);
      toast.error('Failed to save party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Party Name *</label>
          <Input
            value={formData.party_name}
            onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Party Type</label>
          <Select value={formData.party_type} onValueChange={(value: 'ORGANIZATION' | 'PERSON' | 'GROUP') => setFormData({ ...formData, party_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ORGANIZATION">Organization</SelectItem>
              <SelectItem value="PERSON">Person</SelectItem>
              <SelectItem value="GROUP">Group</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Tax ID</label>
          <Input
            value={formData.tax_id}
            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Website</label>
          <Input
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            type="url"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Industry</label>
          <Input
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <Select value={formData.status} onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING') => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (partyToEdit ? 'Update Party' : 'Create Party')}
        </Button>
      </div>
    </form>
  );
};

// Customer Form Component
interface CustomerFormProps {
  onClose: () => void;
  onSuccess: () => void;
  customerToEdit?: CustomerProfile | null;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onClose, onSuccess, customerToEdit }) => {
  const [formData, setFormData] = useState({
    party_id: customerToEdit?.party_id || 0,
    customer_type: customerToEdit?.customer_type || 'CORPORATE',
    customer_class: customerToEdit?.customer_class || '',
    customer_category: customerToEdit?.customer_category || '',
    credit_limit: customerToEdit?.credit_limit || 0,
    credit_hold_flag: customerToEdit?.credit_hold_flag || false,
    payment_terms_id: customerToEdit?.payment_terms_id || 30,
    currency_code: customerToEdit?.currency_code || 'USD',
    discount_percent: customerToEdit?.discount_percent || 0,
    tax_exempt_flag: customerToEdit?.tax_exempt_flag || false,
    tax_exemption_number: customerToEdit?.tax_exemption_number || '',
    status: customerToEdit?.status || 'ACTIVE'
  });

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    loadParties();
  }, []);

  // Update form data when customerToEdit changes
  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        party_id: customerToEdit.party_id,
        customer_type: customerToEdit.customer_type,
        customer_class: customerToEdit.customer_class || '',
        customer_category: customerToEdit.customer_category || '',
        credit_limit: customerToEdit.credit_limit,
        credit_hold_flag: customerToEdit.credit_hold_flag,
        payment_terms_id: customerToEdit.payment_terms_id,
        currency_code: customerToEdit.currency_code,
        discount_percent: customerToEdit.discount_percent,
        tax_exempt_flag: customerToEdit.tax_exempt_flag,
        tax_exemption_number: customerToEdit.tax_exemption_number || '',
        status: customerToEdit.status
      });
    } else {
      setFormData({
        party_id: 0,
        customer_type: 'CORPORATE',
        customer_class: '',
        customer_category: '',
        credit_limit: 0,
        credit_hold_flag: false,
        payment_terms_id: 30,
        currency_code: 'USD',
        discount_percent: 0,
        tax_exempt_flag: false,
        tax_exemption_number: '',
        status: 'ACTIVE'
      });
    }
  }, [customerToEdit]);

  const loadParties = async () => {
    try {
      const data = await apiService.getParties();
      setParties(data);
    } catch (error) {
      console.error('Error loading parties:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (customerToEdit) {
        await apiService.updateCustomer(customerToEdit.profile_id, formData);
        toast.success('Customer profile updated successfully');
      } else {
        await apiService.createCustomer(formData);
        toast.success('Customer profile created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Party *</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {formData.party_id
                  ? parties.find((party) => party.party_id === formData.party_id)?.party_name + 
                    ` (${parties.find((party) => party.party_id === formData.party_id)?.party_number})`
                  : "Select a party..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search parties..." 
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandEmpty>No party found.</CommandEmpty>
                <CommandGroup>
                  {searchValue && parties
                    .filter((party) => 
                      party.party_name.toLowerCase().includes(searchValue.toLowerCase()) ||
                      party.party_number.toLowerCase().includes(searchValue.toLowerCase())
                    )
                    .map((party) => (
                      <CommandItem
                        key={party.party_id}
                        value={`${party.party_name} ${party.party_number}`}
                        onSelect={() => {
                          setFormData({ ...formData, party_id: party.party_id });
                          setOpen(false);
                          setSearchValue('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.party_id === party.party_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {party.party_name} ({party.party_number})
                      </CommandItem>
                    ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-sm font-medium">Customer Type</label>
          <Select value={formData.customer_type} onValueChange={(value: 'CORPORATE' | 'INDIVIDUAL' | 'GOVERNMENT' | 'NON_PROFIT') => setFormData({ ...formData, customer_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CORPORATE">Corporate</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="GOVERNMENT">Government</SelectItem>
              <SelectItem value="NON_PROFIT">Non-Profit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Customer Class</label>
          <Input
            value={formData.customer_class}
            onChange={(e) => setFormData({ ...formData, customer_class: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Customer Category</label>
          <Input
            value={formData.customer_category}
            onChange={(e) => setFormData({ ...formData, customer_category: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Credit Limit</label>
          <Input
            value={formData.credit_limit}
            onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
            type="number"
            step="0.01"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Payment Terms (days)</label>
          <Input
            value={formData.payment_terms_id}
            onChange={(e) => setFormData({ ...formData, payment_terms_id: parseInt(e.target.value) || 30 })}
            type="number"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Currency</label>
          <Select value={formData.currency_code} onValueChange={(value) => setFormData({ ...formData, currency_code: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Discount %</label>
          <Input
            value={formData.discount_percent}
            onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
            type="number"
            step="0.01"
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (customerToEdit ? 'Update Customer' : 'Create Customer')}
        </Button>
      </div>
    </form>
  );
};

// Supplier Form Component
interface SupplierFormProps {
  onClose: () => void;
  onSuccess: () => void;
  supplierToEdit?: SupplierProfile | null;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ onClose, onSuccess, supplierToEdit }) => {
  const [formData, setFormData] = useState({
    party_id: supplierToEdit?.party_id || 0,
    supplier_type: supplierToEdit?.supplier_type || 'VENDOR',
    supplier_class: supplierToEdit?.supplier_class || '',
    supplier_category: supplierToEdit?.supplier_category || '',
    credit_limit: supplierToEdit?.credit_limit || 0,
    hold_flag: supplierToEdit?.hold_flag || false,
    payment_terms_id: supplierToEdit?.payment_terms_id || 30,
    currency_code: supplierToEdit?.currency_code || 'USD',
    payment_method: supplierToEdit?.payment_method || '',
    bank_account: supplierToEdit?.bank_account || '',
    tax_exempt_flag: supplierToEdit?.tax_exempt_flag || false,
    tax_exemption_number: supplierToEdit?.tax_exemption_number || '',
    minority_owned_flag: supplierToEdit?.minority_owned_flag || false,
    women_owned_flag: supplierToEdit?.women_owned_flag || false,
    veteran_owned_flag: supplierToEdit?.veteran_owned_flag || false,
    status: supplierToEdit?.status || 'ACTIVE'
  });

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    loadParties();
  }, []);

  // Update form data when supplierToEdit changes
  useEffect(() => {
    if (supplierToEdit) {
      setFormData({
        party_id: supplierToEdit.party_id,
        supplier_type: supplierToEdit.supplier_type,
        supplier_class: supplierToEdit.supplier_class || '',
        supplier_category: supplierToEdit.supplier_category || '',
        credit_limit: supplierToEdit.credit_limit,
        hold_flag: supplierToEdit.hold_flag,
        payment_terms_id: supplierToEdit.payment_terms_id,
        currency_code: supplierToEdit.currency_code,
        payment_method: supplierToEdit.payment_method || '',
        bank_account: supplierToEdit.bank_account || '',
        tax_exempt_flag: supplierToEdit.tax_exempt_flag,
        tax_exemption_number: supplierToEdit.tax_exemption_number || '',
        minority_owned_flag: supplierToEdit.minority_owned_flag,
        women_owned_flag: supplierToEdit.women_owned_flag,
        veteran_owned_flag: supplierToEdit.veteran_owned_flag,
        status: supplierToEdit.status
      });
    } else {
      setFormData({
        party_id: 0,
        supplier_type: 'VENDOR',
        supplier_class: '',
        supplier_category: '',
        credit_limit: 0,
        hold_flag: false,
        payment_terms_id: 30,
        currency_code: 'USD',
        payment_method: '',
        bank_account: '',
        tax_exempt_flag: false,
        tax_exemption_number: '',
        minority_owned_flag: false,
        women_owned_flag: false,
        veteran_owned_flag: false,
        status: 'ACTIVE'
      });
    }
  }, [supplierToEdit]);

  const loadParties = async () => {
    try {
      const data = await apiService.getParties();
      setParties(data);
    } catch (error) {
      console.error('Error loading parties:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (supplierToEdit) {
        await apiService.updateSupplier(supplierToEdit.profile_id, formData);
        toast.success('Supplier profile updated successfully');
      } else {
        await apiService.createSupplier(formData);
        toast.success('Supplier profile created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Party *</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {formData.party_id
                  ? parties.find((party) => party.party_id === formData.party_id)?.party_name + 
                    ` (${parties.find((party) => party.party_id === formData.party_id)?.party_number})`
                  : "Select a party..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search parties..." 
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandEmpty>No party found.</CommandEmpty>
                <CommandGroup>
                  {searchValue && parties
                    .filter((party) => 
                      party.party_name.toLowerCase().includes(searchValue.toLowerCase()) ||
                      party.party_number.toLowerCase().includes(searchValue.toLowerCase())
                    )
                    .map((party) => (
                      <CommandItem
                        key={party.party_id}
                        value={`${party.party_name} ${party.party_number}`}
                        onSelect={() => {
                          setFormData({ ...formData, party_id: party.party_id });
                          setOpen(false);
                          setSearchValue('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.party_id === party.party_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {party.party_name} ({party.party_number})
                      </CommandItem>
                    ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-sm font-medium">Supplier Type</label>
          <Select value={formData.supplier_type} onValueChange={(value: 'VENDOR' | 'CONTRACTOR' | 'SERVICE_PROVIDER' | 'GOVERNMENT') => setFormData({ ...formData, supplier_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VENDOR">Vendor</SelectItem>
              <SelectItem value="CONTRACTOR">Contractor</SelectItem>
              <SelectItem value="SERVICE_PROVIDER">Service Provider</SelectItem>
              <SelectItem value="GOVERNMENT">Government</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Supplier Class</label>
          <Input
            value={formData.supplier_class}
            onChange={(e) => setFormData({ ...formData, supplier_class: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Supplier Category</label>
          <Input
            value={formData.supplier_category}
            onChange={(e) => setFormData({ ...formData, supplier_category: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Credit Limit</label>
          <Input
            value={formData.credit_limit}
            onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
            type="number"
            step="0.01"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Payment Terms (days)</label>
          <Input
            value={formData.payment_terms_id}
            onChange={(e) => setFormData({ ...formData, payment_terms_id: parseInt(e.target.value) || 30 })}
            type="number"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Currency</label>
          <Select value={formData.currency_code} onValueChange={(value) => setFormData({ ...formData, currency_code: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Payment Method</label>
          <Input
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Bank Account</label>
          <Input
            value={formData.bank_account}
            onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Tax Exemption Number</label>
          <Input
            value={formData.tax_exemption_number}
            onChange={(e) => setFormData({ ...formData, tax_exemption_number: e.target.value })}
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (supplierToEdit ? 'Update Supplier' : 'Create Supplier')}
        </Button>
      </div>
    </form>
  );
};

// Site Form Component
interface SiteFormProps {
  partyId?: number;
  onClose: () => void;
  onSuccess: () => void;
  siteToEdit?: PartySite | null;
}

const SiteForm: React.FC<SiteFormProps> = ({ partyId, onClose, onSuccess, siteToEdit }) => {
  const [formData, setFormData] = useState({
    site_name: siteToEdit?.site_name || '',
    site_type: siteToEdit?.site_type || 'BOTH',
    address_line1: siteToEdit?.address_line1 || '',
    address_line2: siteToEdit?.address_line2 || '',
    city: siteToEdit?.city || '',
    state: siteToEdit?.state || '',
    postal_code: siteToEdit?.postal_code || '',
    country: siteToEdit?.country || '',
    is_primary: siteToEdit?.is_primary || false,
    status: siteToEdit?.status || 'ACTIVE'
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      toast.error('Party ID is required');
      return;
    }

    if (!formData.site_name.trim()) {
      toast.error('Site Name is required');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔍 Submitting site form with data:', formData);
      console.log('🔍 Party ID:', partyId);
      
      if (siteToEdit) {
        await apiService.updatePartySite(siteToEdit.site_id, formData);
        toast.success('Site updated successfully');
      } else {
        await apiService.createPartySite(partyId, formData);
        toast.success('Site created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving site:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save site';
      toast.error(`Failed to save site: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-4">
      {/* Site Information Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Site Information</h3>
          <p className="text-sm text-gray-600">Basic details about the site</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Site Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.site_name}
              onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
              required
              placeholder="Enter site name"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Site Type</label>
            <Select value={formData.site_type} onValueChange={(value: 'BILL_TO' | 'SHIP_TO' | 'PAYMENT' | 'PURCHASING' | 'BOTH') => setFormData({ ...formData, site_type: value })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BILL_TO">Bill To</SelectItem>
                <SelectItem value="SHIP_TO">Ship To</SelectItem>
                <SelectItem value="PAYMENT">Payment</SelectItem>
                <SelectItem value="PURCHASING">Purchasing</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Address Information Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
          <p className="text-sm text-gray-600">Physical location details</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Address Line 1</label>
            <Input
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              placeholder="Street address, P.O. box, company name"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Address Line 2</label>
            <Input
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              placeholder="Apartment, suite, unit, building, floor, etc."
              className="w-full"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">City</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">State/Province</label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State or province"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Postal Code</label>
              <Input
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="ZIP or postal code"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Country</label>
            <Input
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="Country"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
          <p className="text-sm text-gray-600">Site configuration options</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Select value={formData.status} onValueChange={(value: 'ACTIVE' | 'INACTIVE') => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-3 pt-6">
              <input
                type="checkbox"
                id="is_primary"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_primary" className="text-sm font-medium text-gray-700">
                Set as Primary Site
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-7">
              Primary sites are used as default for billing and shipping
            </p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t mt-6">
        <Button type="button" variant="outline" onClick={onClose} className="px-6 py-2">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="px-6 py-2">
          {loading ? 'Saving...' : (siteToEdit ? 'Update Site' : 'Create Site')}
        </Button>
      </div>
    </form>
  );
};

// Contact Form Component
interface ContactFormProps {
  partyId?: number;
  onClose: () => void;
  onSuccess: () => void;
  contactToEdit?: ContactPoint | null;
}

const ContactForm: React.FC<ContactFormProps> = ({ partyId, onClose, onSuccess, contactToEdit }) => {
  const [formData, setFormData] = useState({
    contact_point_type: contactToEdit?.contact_point_type || 'PHONE',
    contact_point_value: contactToEdit?.contact_point_value || '',
    contact_point_purpose: contactToEdit?.contact_point_purpose || '',
    is_primary: contactToEdit?.is_primary || false,
    status: contactToEdit?.status || 'ACTIVE'
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      toast.error('Party ID is required');
      return;
    }

    if (!formData.contact_point_type) {
      toast.error('Contact Type is required');
      return;
    }

    if (!formData.contact_point_value.trim()) {
      toast.error('Contact Value is required');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔍 Submitting contact form with data:', formData);
      console.log('🔍 Party ID:', partyId);
      
      if (contactToEdit) {
        await apiService.updateContactPoint(contactToEdit.contact_point_id, formData);
        toast.success('Contact updated successfully');
      } else {
        await apiService.createContactPoint(partyId, formData);
        toast.success('Contact created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving contact:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save contact';
      toast.error(`Failed to save contact: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact Information Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
          <p className="text-sm text-gray-600">Add a new contact point for this party</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Contact Type <span className="text-red-500">*</span>
            </label>
            <Select value={formData.contact_point_type} onValueChange={(value: 'PHONE' | 'EMAIL' | 'FAX' | 'WEB' | 'MOBILE') => setFormData({ ...formData, contact_point_type: value })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PHONE">Phone</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="FAX">Fax</SelectItem>
                <SelectItem value="WEB">Website</SelectItem>
                <SelectItem value="MOBILE">Mobile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Contact Value <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.contact_point_value}
              onChange={(e) => setFormData({ ...formData, contact_point_value: e.target.value })}
              required
              type={formData.contact_point_type === 'EMAIL' ? 'email' : formData.contact_point_type === 'WEB' ? 'url' : 'text'}
              placeholder={
                formData.contact_point_type === 'PHONE' || formData.contact_point_type === 'MOBILE' 
                  ? '+1-555-0123' 
                  : formData.contact_point_type === 'EMAIL' 
                  ? 'contact@example.com' 
                  : formData.contact_point_type === 'WEB' 
                  ? 'https://www.example.com' 
                  : 'Contact value'
              }
              className="w-full"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Purpose</label>
          <Input
            value={formData.contact_point_purpose}
            onChange={(e) => setFormData({ ...formData, contact_point_purpose: e.target.value })}
            placeholder="e.g., General, Billing, Support, Sales"
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Optional: Describe the purpose of this contact point
          </p>
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
          <p className="text-sm text-gray-600">Contact configuration options</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Select value={formData.status} onValueChange={(value: 'ACTIVE' | 'INACTIVE') => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-3 pt-6">
              <input
                type="checkbox"
                id="is_primary_contact"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_primary_contact" className="text-sm font-medium text-gray-700">
                Set as Primary Contact
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-7">
              Primary contacts are used as default for communications
            </p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} className="px-6">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="px-6">
          {loading ? 'Saving...' : (contactToEdit ? 'Update Contact' : 'Create Contact')}
        </Button>
      </div>
    </form>
  );
};
