'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Settings,
  Save,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CompanySettings {
  _id?: string;
  company_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  gstin: string;
  pan: string;
  cin?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  invoice_prefix: string;
  invoice_counter: number;
  invoice_terms: string;
  financial_year_start: string;
  default_credit_days: number;
  currency: string;
}

const initialSettings: CompanySettings = {
  company_name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  phone: '',
  email: '',
  website: '',
  gstin: '',
  pan: '',
  cin: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  account_holder_name: '',
  invoice_prefix: 'INV',
  invoice_counter: 1,
  invoice_terms: 'Payment is due within 30 days from the date of invoice.',
  financial_year_start: new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0],
  default_credit_days: 30,
  currency: 'INR',
};

export default function CompanySettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/settings/company', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        const settingsData = data.settings;
        setSettings({
          ...settingsData,
          financial_year_start: new Date(settingsData.financial_year_start).toISOString().split('T')[0],
        });
      } else {
        toast.error('Failed to load company settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load company settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('leaftrack_token');
      
      const settingsToSave = {
        ...settings,
        financial_year_start: new Date(settings.financial_year_start),
      };

      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settingsToSave),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Company settings saved successfully');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof CompanySettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
            <p className="text-gray-600 mt-1">Configure your business information and invoice settings</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadSettings}
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className={`h-4 w-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-blue-600" />
              <span>Company Information</span>
            </CardTitle>
            <CardDescription>
              Basic company details that will appear on invoices and reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={settings.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={settings.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={settings.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={settings.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={settings.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={settings.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <span>Tax Information</span>
            </CardTitle>
            <CardDescription>
              GST and tax-related information for compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN *</Label>
                <Input
                  id="gstin"
                  value={settings.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value)}
                  placeholder="15 digit GST number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN *</Label>
                <Input
                  id="pan"
                  value={settings.pan}
                  onChange={(e) => handleInputChange('pan', e.target.value)}
                  placeholder="10 digit PAN number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cin">CIN</Label>
                <Input
                  id="cin"
                  value={settings.cin}
                  onChange={(e) => handleInputChange('cin', e.target.value)}
                  placeholder="Corporate Identification Number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banking Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <span>Banking Information</span>
            </CardTitle>
            <CardDescription>
              Bank account details for invoice payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={settings.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Account Holder Name</Label>
                <Input
                  id="account_holder_name"
                  value={settings.account_holder_name}
                  onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={settings.account_number}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  value={settings.ifsc_code}
                  onChange={(e) => handleInputChange('ifsc_code', e.target.value)}
                  placeholder="e.g., SBIN0001234"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-orange-600" />
              <span>Invoice Settings</span>
            </CardTitle>
            <CardDescription>
              Configure invoice numbering and default terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                <Input
                  id="invoice_prefix"
                  value={settings.invoice_prefix}
                  onChange={(e) => handleInputChange('invoice_prefix', e.target.value)}
                  placeholder="INV"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_counter">Next Invoice Number</Label>
                <Input
                  id="invoice_counter"
                  type="number"
                  value={settings.invoice_counter}
                  onChange={(e) => handleInputChange('invoice_counter', parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="financial_year_start">Financial Year Start</Label>
                <Input
                  id="financial_year_start"
                  type="date"
                  value={settings.financial_year_start}
                  onChange={(e) => handleInputChange('financial_year_start', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_credit_days">Default Credit Days</Label>
                <Input
                  id="default_credit_days"
                  type="number"
                  value={settings.default_credit_days}
                  onChange={(e) => handleInputChange('default_credit_days', parseInt(e.target.value) || 30)}
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_terms">Invoice Terms & Conditions</Label>
              <Textarea
                id="invoice_terms"
                value={settings.invoice_terms}
                onChange={(e) => handleInputChange('invoice_terms', e.target.value)}
                rows={4}
                placeholder="Enter default terms and conditions for invoices..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 min-w-32"
          >
            <Save className={`h-4 w-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
