import { getBookById } from '@/lib/books';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const book = getBookById(id);
  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const { keywords: _omitKeywords, ...rest } = book;
  void _omitKeywords;

  return NextResponse.json({
    book: rest,
  });
}
