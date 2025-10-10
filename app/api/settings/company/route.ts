import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CompanySettings, { ICompanySettings } from '@/models/CompanySettings';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

export const dynamic = 'force-dynamic';

// GET - Get company settings
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const CompanySettingsModel = CompanySettings as Model<ICompanySettings>;
    let settings = await CompanySettingsModel.findOne();

    // Create default settings if none exist
    if (!settings) {
      settings = await CompanySettingsModel.create({
        company_name: 'Sohagtea Trading Company',
        address: 'Tea Estate Road, Bagdogra',
        city: 'Siliguri',
        state: 'West Bengal',
        pincode: '734421',
        phone: '+91 98765 43210',
        email: 'info@sohagtea.com',
        gstin: '19ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT - Update company settings
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const updates = await request.json();
    const CompanySettingsModel = CompanySettings as Model<ICompanySettings>;

    let settings = await CompanySettingsModel.findOne();
    
    if (!settings) {
      // Create new settings if none exist
      settings = new CompanySettingsModel(updates);
    } else {
      // Update existing settings
      Object.assign(settings, updates);
    }

    await settings.save();

    return NextResponse.json({
      success: true,
      message: 'Company settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Error updating company settings:', error);

    if ((error as any).name === 'ValidationError') {
      return NextResponse.json({
        error: 'Validation failed',
        details: (error as any).message
      }, { status: 400 });
    }    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
