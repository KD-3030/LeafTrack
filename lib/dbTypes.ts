import mongoose, { Model } from 'mongoose';
import { IPayment } from '@/models/Payment';
import { IInvoice } from '@/models/Invoice';
import { ISale } from '@/models/Sale';
import { ICustomer } from '@/models/Customer';
import { IAssignment } from '@/models/Assignment';
import { IProduct } from '@/models/Product';
import { IUser } from '@/models/User';

// Type-safe model getters to avoid union type issues
export function getPaymentModel(): Model<IPayment> {
  const PaymentModel = mongoose.models.Payment;
  if (!PaymentModel) {
    throw new Error('Payment model not initialized');
  }
  return PaymentModel as Model<IPayment>;
}

export function getInvoiceModel(): Model<IInvoice> {
  const InvoiceModel = mongoose.models.Invoice;
  if (!InvoiceModel) {
    throw new Error('Invoice model not initialized');
  }
  return InvoiceModel as Model<IInvoice>;
}

export function getSaleModel(): Model<ISale> {
  const SaleModel = mongoose.models.Sale;
  if (!SaleModel) {
    throw new Error('Sale model not initialized');
  }
  return SaleModel as Model<ISale>;
}

export function getCustomerModel(): Model<ICustomer> {
  const CustomerModel = mongoose.models.Customer;
  if (!CustomerModel) {
    throw new Error('Customer model not initialized');
  }
  return CustomerModel as Model<ICustomer>;
}

export function getAssignmentModel(): Model<IAssignment> {
  const AssignmentModel = mongoose.models.Assignment;
  if (!AssignmentModel) {
    throw new Error('Assignment model not initialized');
  }
  return AssignmentModel as Model<IAssignment>;
}

export function getProductModel(): Model<IProduct> {
  const ProductModel = mongoose.models.Product;
  if (!ProductModel) {
    throw new Error('Product model not initialized');
  }
  return ProductModel as Model<IProduct>;
}

export function getUserModel(): Model<IUser> {
  const UserModel = mongoose.models.User;
  if (!UserModel) {
    throw new Error('User model not initialized');
  }
  return UserModel as Model<IUser>;
}
