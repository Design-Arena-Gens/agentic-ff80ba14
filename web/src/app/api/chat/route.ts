import { NextResponse, type NextRequest } from 'next/server';
import { findAnswer } from '@/lib/qa';
import { translateFromEnglish, translateToEnglish } from '@/lib/translation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = String(body?.message ?? '').trim();
  const scope = body?.scope === 'book' ? 'book' : 'library';
  const bookId = typeof body?.bookId === 'string' ? body.bookId : undefined;
  const targetLanguage =
    typeof body?.targetLanguage === 'string' ? body.targetLanguage : 'en';

  if (!message) {
    return NextResponse.json(
      { error: 'Message must not be empty.' },
      { status: 400 },
    );
  }

  const { text: englishQuestion, detected } = await translateToEnglish(message);

  const answer = findAnswer(englishQuestion || message, {
    scope,
    bookId,
  });

  const fallbackAnswer =
    'I could not find a precise passage in the library. Try refining your question with more context, such as a topic or chapter.';

  const baseAnswer = answer
    ? [
        answer.answer,
        `Source: ${answer.book.title} — ${answer.section}`,
        answer.supporting.length
          ? `Related context: ${answer.supporting.join(' / ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n')
    : fallbackAnswer;

  const localizedAnswer = await translateFromEnglish(
    baseAnswer,
    targetLanguage,
  );

  return NextResponse.json({
    answer: localizedAnswer,
    baseAnswer,
    targetLanguage,
    detectedLanguage: detected,
    found: Boolean(answer),
    source: answer
      ? {
          id: answer.book.id,
          title: answer.book.title,
          section: answer.section,
        }
      : null,
  });
}
