import { getBookSummaries } from '@/lib/books';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET(_request: NextRequest) {
  const books = getBookSummaries();
  return NextResponse.json({ books });
}
