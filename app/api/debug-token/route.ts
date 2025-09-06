import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('Debug - Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('Debug - Token extracted:', token?.substring(0, 20) + '...');
    console.log('Debug - Token length:', token?.length);
    
    const decoded = verifyToken(token);
    console.log('Debug - Decoded token:', decoded);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      decoded,
      tokenLength: token.length,
      tokenStart: token.substring(0, 20)
    });
  } catch (error) {
    console.error('Debug token error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 });
  }
}
