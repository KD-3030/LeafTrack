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

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, invitationToken: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}