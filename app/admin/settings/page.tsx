'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Building, Settings, Save, RefreshCw, CreditCard, ImageIcon, Upload, X } from 'lucide-react';
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
  logo_url?: string;
  signature_url?: string;
  qr_code_url?: string;
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
  logo_url: '',
  signature_url: '',
  qr_code_url: '',
  invoice_prefix: 'INV',
  invoice_counter: 1,
  invoice_terms: 'Payment is due within 30 days from the date of invoice.',
  financial_year_start: new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0],
  default_credit_days: 30,
  currency: 'INR',
};

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (field: 'logo' | 'signature' | 'qr_code', file: File) => {
    try {
      setUploading(field);
      const token = localStorage.getItem('leaftrack_token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', field);

      const res = await fetch('/api/settings/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const urlField = `${field}_url` as keyof CompanySettings;
        setSettings(prev => ({ ...prev, [urlField]: data.url }));
        toast.success(`${field.replace('_', ' ')} uploaded successfully`);
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
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
              className=""
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
                  value={settings.website || ''}
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
                  value={settings.cin || ''}
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
                  value={settings.bank_name || ''}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  placeholder="e.g., Axis Bank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Account Holder Name</Label>
                <Input
                  id="account_holder_name"
                  value={settings.account_holder_name || ''}
                  onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                  placeholder="Account holder name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={settings.account_number || ''}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                  placeholder="e.g., 923020024498640"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  value={settings.ifsc_code || ''}
                  onChange={(e) => handleInputChange('ifsc_code', e.target.value)}
                  placeholder="e.g., UTIB0002083"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5 text-pink-600" />
              <span>Branding</span>
            </CardTitle>
            <CardDescription>
              Upload logo, authorized signature, and payment QR code for invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              {/* Logo */}
              <div className="space-y-2 text-center">
                <Label>Company Logo</Label>
                <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[140px]">
                  {settings.logo_url ? (
                    <div className="relative">
                      <Image src={settings.logo_url} alt="Logo" width={120} height={80} className="object-contain" unoptimized />
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, logo_url: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">No logo uploaded</div>
                  )}
                </div>
                <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('logo', f); e.target.value = ''; }} />
                <Button variant="outline" size="sm" disabled={uploading === 'logo'} onClick={() => logoRef.current?.click()}>
                  <Upload className="h-3 w-3 mr-1" />{uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
                </Button>
              </div>

              {/* Signature */}
              <div className="space-y-2 text-center">
                <Label>Authorized Signature</Label>
                <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[140px]">
                  {settings.signature_url ? (
                    <div className="relative">
                      <Image src={settings.signature_url} alt="Signature" width={120} height={60} className="object-contain" unoptimized />
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, signature_url: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">No signature uploaded</div>
                  )}
                </div>
                <input ref={signatureRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('signature', f); e.target.value = ''; }} />
                <Button variant="outline" size="sm" disabled={uploading === 'signature'} onClick={() => signatureRef.current?.click()}>
                  <Upload className="h-3 w-3 mr-1" />{uploading === 'signature' ? 'Uploading...' : 'Upload Signature'}
                </Button>
              </div>

              {/* QR Code */}
              <div className="space-y-2 text-center">
                <Label>Payment QR Code</Label>
                <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[140px]">
                  {settings.qr_code_url ? (
                    <div className="relative">
                      <Image src={settings.qr_code_url} alt="QR Code" width={100} height={100} className="object-contain" unoptimized />
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, qr_code_url: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">No QR code uploaded</div>
                  )}
                </div>
                <input ref={qrRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('qr_code', f); e.target.value = ''; }} />
                <Button variant="outline" size="sm" disabled={uploading === 'qr_code'} onClick={() => qrRef.current?.click()}>
                  <Upload className="h-3 w-3 mr-1" />{uploading === 'qr_code' ? 'Uploading...' : 'Upload QR Code'}
                </Button>
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
            className="min-w-32"
          >
            <Save className={`h-4 w-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
