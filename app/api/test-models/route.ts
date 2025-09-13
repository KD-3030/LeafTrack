import { NextResponse } from 'next/server';
import testModels from '@/lib/testModels';

export async function GET() {
  try {
    await testModels();
    return NextResponse.json({ 
      success: true, 
      message: 'All models working correctly' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
