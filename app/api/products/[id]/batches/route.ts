// This API endpoint has been deprecated
// Products now use direct assignment without batches

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint has been deprecated. Use /api/assignments instead.' },
    { status: 410 }
  );
}