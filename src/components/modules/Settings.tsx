import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Users, 
  Key, 
  Mail, 
  Phone,
  Building,
  Globe,
  Download,
  Upload,
  Trash2,
  Save,
  Eye,
  EyeOff,
  UserPlus,
  Settings as SettingsIcon,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState({
    // Profile settings
    firstName: "John",
    lastName: "Doe", 
    email: "john.doe@company.com",
    phone: "+1 (555) 123-4567",
    company: "AccuFlow Distribution",
    
    // Notification settings
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    weeklyReports: true,
    
    // Security settings
    twoFactorAuth: false,
    sessionTimeout: "30",
    
    // System settings
    darkMode: false,
    language: "English",
    timezone: "UTC-5",
    dateFormat: "MM/DD/YYYY",
    currency: "USD"
  });

  const [users] = useState([
    { id: 1, name: "John Doe", email: "john.doe@company.com", role: "Admin", status: "Active" },
    { id: 2, name: "Jane Smith", email: "jane.smith@company.com", role: "Manager", status: "Active" },
    { id: 3, name: "Mike Johnson", email: "mike.johnson@company.com", role: "User", status: "Inactive" },
    { id: 4, name: "Sarah Wilson", email: "sarah.wilson@company.com", role: "User", status: "Active" },
  ]);

  const handleSave = (section: string) => {
    toast({
      title: "Settings Saved",
      description: `${section} settings have been updated successfully.`,
    });
  };

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-gray-600 mt-1">Manage your account and application preferences</p>
          </div>
          <Badge variant="outline" className="w-fit">
            Last updated: Today
          </Badge>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-white/70 backdrop-blur-sm">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {settings.firstName[0]}{settings.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                    <p className="text-sm text-gray-500">JPG, PNG up to 2MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={settings.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={settings.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10"
                        value={settings.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        className="pl-10"
                        value={settings.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="company">Company</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="company"
                        className="pl-10"
                        value={settings.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleSave('Profile')} className="w-full md:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-green-600" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-500">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-gray-500">Receive browser push notifications</p>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => handleInputChange('pushNotifications', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={settings.smsNotifications}
                      onCheckedChange={(checked) => handleInputChange('smsNotifications', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Reports</Label>
                      <p className="text-sm text-gray-500">Receive weekly summary reports</p>
                    </div>
                    <Switch
                      checked={settings.weeklyReports}
                      onCheckedChange={(checked) => handleInputChange('weeklyReports', checked)}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('Notification')} className="w-full md:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your account security and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                    <Switch
                      checked={settings.twoFactorAuth}
                      onCheckedChange={(checked) => handleInputChange('twoFactorAuth', checked)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => handleSave('Security')} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Update Security
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Key className="w-4 h-4 mr-2" />
                    Generate API Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-600" />
                  System Preferences
                </CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select 
                      id="language"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={settings.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select 
                      id="timezone"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={settings.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                    >
                      <option value="UTC-5">UTC-5 (Eastern)</option>
                      <option value="UTC-6">UTC-6 (Central)</option>
                      <option value="UTC-7">UTC-7 (Mountain)</option>
                      <option value="UTC-8">UTC-8 (Pacific)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <select 
                      id="dateFormat"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={settings.dateFormat}
                      onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select 
                      id="currency"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={settings.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                    </select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Data Management</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button variant="outline" className="flex items-center justify-center">
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline" className="flex items-center justify-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Data
                    </Button>
                    <Button variant="destructive" className="flex items-center justify-center">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                </div>

                <Button onClick={() => handleSave('System')} className="w-full md:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save System Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users & Privileges Settings */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Team Members</h4>
                    <p className="text-sm text-gray-500">Manage access and permissions for your team</p>
                  </div>
                  <Button className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add User
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2">User</th>
                        <th className="text-left py-2 px-2">Role</th>
                        <th className="text-left py-2 px-2">Status</th>
                        <th className="text-left py-2 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'} className="text-xs">
                              {user.role === 'Admin' && <Crown className="w-3 h-3 mr-1" />}
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                              {user.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <SettingsIcon className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  Role Permissions
                </CardTitle>
                <CardDescription>
                  Configure permissions for different user roles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      Admin
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Full System Access</span>
                        <Switch checked={true} disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>User Management</span>
                        <Switch checked={true} disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Financial Data</span>
                        <Switch checked={true} disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Reports</span>
                        <Switch checked={true} disabled />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      Manager
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Dashboard Access</span>
                        <Switch checked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Team Management</span>
                        <Switch checked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Financial Data</span>
                        <Switch checked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Reports</span>
                        <Switch checked={false} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      User
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Dashboard Access</span>
                        <Switch checked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Basic Operations</span>
                        <Switch checked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Financial Data</span>
                        <Switch checked={false} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Reports</span>
                        <Switch checked={false} />
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleSave('Users & Privileges')} className="w-full md:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save Permissions
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;