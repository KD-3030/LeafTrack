/**
 * Supabase response helpers for backward compatibility with MongoDB-style _id fields.
 * Used by API routes during and after the MongoDB → Supabase migration.
 */

// Add _id field (alias for id) to a single row for frontend compatibility
export function withId<T extends { id: string }>(row: T): T & { _id: string } {
  return { ...row, _id: row.id };
}

// Add _id field to an array of rows
export function withIds<T extends { id: string }>(rows: T[]): (T & { _id: string })[] {
  return rows.map(withId);
}

// Map Supabase product fields to frontend camelCase format
export function mapProductToFrontend(row: {
  id: string;
  name: string;
  manufacturing_cost: number;
  total_stock: number;
  hsn_code: string;
  gst_rate: number;
  created_at: string;
  updated_at: string;
  mongo_id?: string | null;
}) {
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    manufacturingCost: row.manufacturing_cost,
    totalStock: row.total_stock,
    hsn_code: row.hsn_code,
    gst_rate: row.gst_rate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Map frontend camelCase product fields to Supabase snake_case
export function mapProductToDb(data: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};
  if (data.name !== undefined) mapped.name = data.name;
  if (data.manufacturingCost !== undefined) mapped.manufacturing_cost = parseFloat(String(data.manufacturingCost));
  if (data.manufacturing_cost !== undefined) mapped.manufacturing_cost = parseFloat(String(data.manufacturing_cost));
  if (data.totalStock !== undefined) mapped.total_stock = parseInt(String(data.totalStock));
  if (data.total_stock !== undefined) mapped.total_stock = parseInt(String(data.total_stock));
  if (data.hsn_code !== undefined) mapped.hsn_code = data.hsn_code;
  if (data.gst_rate !== undefined) mapped.gst_rate = parseFloat(String(data.gst_rate));
  return mapped;
}
