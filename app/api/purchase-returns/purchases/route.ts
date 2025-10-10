import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Purchase from '@/models/Purchase';
import { verifyToken } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/purchase-returns/purchases - Get all purchases for dropdown
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get all purchases sorted by date (most recent first)
    const purchases = await Purchase.find()
      .select('_id purchase_number purchase_date product_name quantity unit batch_number supplier_name unit_price total_amount tax_amount tax_percentage discount_amount final_amount product_category product_description manufacturing_date expiry_date supplier_contact supplier_address supplier_gstin supplier_email')
      .sort({ purchase_date: -1 })
      .limit(1000); // Limit to 1000 most recent purchases

    return NextResponse.json({
      success: true,
      purchases,
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}
