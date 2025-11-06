import { User } from '../types';

// Simple RBAC helpers for the app. Keep logic centralized so UI components
// can query permissions consistently. Policy (sensible defaults):
// - role === 'admin' -> full access
// - role === 'empleado' -> limited: can view inventory, view products/suppliers,
//   and register inventory movements, but cannot create/edit/delete products,
//   suppliers, categories or manage users.
// - any other role -> minimal read-only access

export const isAdmin = (user?: User | null) => {
  if (!user) return false;
  return String(user.role || '').toLowerCase() === 'admin' || String(user.role || '').toLowerCase() === 'administrador';
};

export const isEmployee = (user?: User | null) => {
  if (!user) return false;
  return String(user.role || '').toLowerCase() === 'empleado' || String(user.role || '').toLowerCase() === 'employee';
};

export const canCreateMovement = (user?: User | null) => {
  // Employees and admins can register inventory movements
  return isAdmin(user) || isEmployee(user);
};

export const canEditProduct = (user?: User | null) => {
  // Only admins may create/edit products in this policy
  return isAdmin(user);
};

export const canDeleteProduct = (user?: User | null) => {
  return isAdmin(user);
};

export const canManageSuppliers = (user?: User | null) => {
  return isAdmin(user);
};

export const canManageCategories = (user?: User | null) => {
  return isAdmin(user);
};

export const canManageUsers = (user?: User | null) => {
  return isAdmin(user);
};

export const canViewReports = (user?: User | null) => {
  // Allow admins and employees to view reports; fine tune later
  return isAdmin(user) || isEmployee(user);
};

export default {
  isAdmin,
  isEmployee,
  canCreateMovement,
  canEditProduct,
  canDeleteProduct,
  canManageSuppliers,
  canManageCategories,
  canManageUsers,
  canViewReports,
};
