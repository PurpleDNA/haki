import fs from 'node:fs';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { formatDate, formatDateTimeLagos } from '@/domain/dates';
import { naira } from '@/domain/money';
import { salePrice, type ScheduledInstalment, type Terms } from '@/domain/pricing';

const asset = (...p: string[]) => fs.readFileSync(path.join(process.cwd(), 'src/assets', ...p));
const MID = rgb(5 / 255, 50 / 255, 51 / 255);
const GREY = rgb(0.35, 0.42, 0.42);
const W = 595;
const H = 842;
const M = 56;

export interface AgreementPdf {
  reference: string;
  borrower: string;
  description: string;
  vendor: string;
  terms: Terms;
  schedule: ScheduledInstalment[];
  agreementText: string;
  acceptedName: string | null;
  acceptedAt: Date | null;
  acceptedIp: string | null;
}

export async function agreementPdf(a: AgreementPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // Manrope's contextual hyphen leaves a gap in references like MF-2026-0018, so that feature is off.
  const features = { case: false };
  const regular = await pdf.embedFont(asset('fonts', 'Manrope-500.ttf'), { subset: true, features });
  const bold = await pdf.embedFont(asset('fonts', 'Manrope-700.ttf'), { subset: true, features });
  const signs = new Map([
    [regular, await pdf.embedFont(asset('fonts', 'naira-500.woff'), { subset: true })],
    [bold, await pdf.embedFont(asset('fonts', 'naira-700.woff'), { subset: true })],
  ]);
  const logo = await pdf.embedPng(asset('haki-logo.png'));
  pdf.setTitle(`Haki agreement ${a.reference}`);

  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  /** Manrope has no ₦, so the sign is drawn separately in a font that does. */
  const runs = (text: string, font: PDFFont) =>
    text.split(/(₦)/).filter(Boolean).map((t) => ({ t, f: t === '₦' ? signs.get(font)! : font }));
  const widthOf = (text: string, font: PDFFont, size: number) =>
    runs(text, font).reduce((w, r) => w + r.f.widthOfTextAtSize(r.t, size), 0);
  const draw = (text: string, x: number, y0: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>) => {
    let cursor = x;
    for (const r of runs(text, font)) {
      page.drawText(r.t, { x: cursor, y: y0, size, font: r.f, color });
      cursor += r.f.widthOfTextAtSize(r.t, size);
    }
  };
  const room = (needed: number) => {
    if (y - needed < M) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };
  const lines = (text: string, font: PDFFont, size: number, width: number) => {
    const out: string[] = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (widthOf(next, font, size) > width && line) {
          out.push(line);
          line = word;
        } else line = next;
      }
      out.push(line);
    }
    return out;
  };
  const write = (text: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const { font = regular, size = 10.5, color = rgb(0.1, 0.15, 0.15), gap = 5 } = opts;
    for (const l of lines(text, font, size, W - M * 2)) {
      room(size + gap);
      draw(l, M, y - size, size, font, color);
      y -= size + gap;
    }
  };
  const row = (label: string, value: string, strong = false) => {
    room(20);
    draw(label, M, y - 11, 10.5, regular, GREY);
    const f = strong ? bold : regular;
    draw(value, W - M - widthOf(value, f, 10.5), y - 11, 10.5, f, MID);
    y -= 20;
  };
  const heading = (t: string) => {
    y -= 14;
    write(t, { font: bold, size: 13, color: MID, gap: 8 });
  };

  const logoH = 74;
  page.drawImage(logo, { x: M, y: y - logoH, height: logoH, width: (logoH * logo.width) / logo.height });
  y -= logoH + 22;
  write('Murabaha agreement', { font: bold, size: 22, color: MID, gap: 8 });
  write(`Reference ${a.reference}`, { color: GREY });

  heading('The parties and the item');
  row('Buyer', a.borrower);
  row('Item', a.description.length > 60 ? a.description.slice(0, 57) + '…' : a.description);
  row('Vendor', a.vendor);

  heading('The price');
  row('What we pay the vendor', naira(a.terms.costKobo));
  row('Our profit', naira(a.terms.profitKobo));
  row('Sale price (fixed)', naira(salePrice(a.terms)), true);
  row('Down payment', naira(a.terms.downKobo));

  heading('Payment schedule');
  for (const s of a.schedule) {
    row(s.number === 0 ? `Down payment, ${formatDate(s.dueOn)}` : `Instalment ${s.number}, ${formatDate(s.dueOn)}`, naira(s.amountKobo));
  }

  heading('Terms');
  write(a.agreementText, { gap: 5 });

  heading('Acceptance');
  if (a.acceptedAt) {
    row('Accepted by', a.acceptedName ?? '');
    row('Date and time (Lagos)', formatDateTimeLagos(a.acceptedAt));
    row('IP address', a.acceptedIp ?? '');
  } else {
    write('Not yet accepted.', { color: GREY });
  }
  return pdf.save();
}
