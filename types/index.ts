export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'Admin' | 'Salesman';
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
  price: number;
  stock_quantity: number;
  created_at: string;
  updated_at?: string;
}

export interface Assignment {
  id: string;
  _id?: string;
  salesman_id: string;
  product_id: string;
  quantity: number;
  salesman?: User;
  product?: Product;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
}