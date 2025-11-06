import PDFDocument from 'pdfkit';
import { NextResponse, type NextRequest } from 'next/server';
import { getBookById } from '@/lib/books';

export const runtime = 'nodejs';

const buildPdf = (book: ReturnType<typeof getBookById>) =>
  new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 54, right: 54 },
    });
    const chunks: Uint8Array[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      resolve(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
    });

    doc.font('Helvetica-Bold').fontSize(20).text(book!.title, {
      align: 'center',
    });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(12).text(
      `${book!.author} • ${book!.year} • ${book!.tags.join(', ')}`,
      {
        align: 'center',
      },
    );
    doc.moveDown(1.5);

    doc
      .font('Helvetica')
      .fontSize(12)
      .text(book!.description, {
        align: 'left',
        lineGap: 4,
      });

    doc.addPage();

    book!.sections.forEach((section) => {
      doc.font('Helvetica-Bold').fontSize(16).text(section.heading);
      doc.moveDown(0.5);
      section.paragraphs.forEach((paragraph) => {
        doc
          .font('Helvetica')
          .fontSize(12)
          .text(paragraph, {
            lineGap: 4,
          })
          .moveDown(0.5);
      });
      doc.moveDown(0.75);
    });

    doc.end();
  });

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const book = getBookById(id);
  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const pdf = await buildPdf(book);
  const pdfBytes = new Uint8Array(pdf);

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${book.slug}.pdf"`,
    },
  });
}
