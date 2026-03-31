export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'Admin' | 'PrimaryExecutive' | 'SecondaryExecutive' | 'Customer';
  managerId?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  _id?: string;
  name: string;
  manufacturingCost: number;
  totalStock: number;
  hsn_code: string;
  gst_rate: number;
  created_at: string;
  updated_at?: string;
}

export interface Assignment {
  id: string;
  _id?: string;
  salesman_id: string | User;
  productId: string | Product; // Changed from product_id to productId
  quantity: number;
  sellingPricePerUnit: number; // Added selling price
  salesman?: User;
  product?: Product;
  created_at: string;
  createdAt?: string;
}

export interface Distributor {
  id: string;
  _id?: string;
  name: string;
  email?: string | null;
  phone: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  business_name?: string | null;
  business_type?: string;
  credit_limit?: number;
  credit_days?: number;
  outstanding_balance?: number;
  status: 'Active' | 'Inactive';
  approval_status: 'pending' | 'approved' | 'rejected';
  tags?: string[];
  notes?: string | null;
  documents?: Record<string, unknown>[];
  pe_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Retailer {
  id: string;
  _id?: string;
  name: string;
  phone?: string | null;
  shop_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  distributor_id: string;
  created_by_se_id?: string | null;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at?: string;
}

export interface DistributorInventory {
  id: string;
  distributor_id: string;
  product_id: string;
  current_stock: number;
  last_restocked_at?: string | null;
  created_at: string;
  updated_at?: string;
  distributor?: Distributor;
  product?: Product;
}

export interface DailySale {
  id: string;
  _id?: string;
  se_id: string;
  distributor_id: string;
  retailer_id?: string | null;
  product_id: string;
  quantity_sold: number;
  unit: string;
  sale_amount: number;
  payment_type: 'cash' | 'credit' | 'upi' | 'cheque';
  location_lat?: number | null;
  location_lng?: number | null;
  notes?: string | null;
  sale_date: string;
  created_at: string;
  updated_at?: string;
  distributor?: Distributor;
  retailer?: Retailer;
  product?: Product;
  se?: User;
}

export interface SEDistributorAssignment {
  id: string;
  se_id: string;
  distributor_id: string;
  assigned_by?: string | null;
  assigned_at: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  se?: User;
  distributor?: Distributor;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, invitationToken: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}