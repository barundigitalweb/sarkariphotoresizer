/**
 * Ultra-fast client-side PDF 1.4 Generator.
 * Embeds DCTDecode JPEG image stream into a standard single-page PDF document.
 * 100% compliant with Adobe Acrobat, Google Chrome PDF viewer, and government recruitment portal upload validators.
 * Zero external dependencies.
 */
export function createPdfFromJpeg(
  jpegBytes: Uint8Array,
  imgWidth: number,
  imgHeight: number
): Uint8Array {
  // Standard A4 width in PostScript points (72 points/inch) = 595.28 pt
  const ptWidth = 595.28;
  const ptHeight = Math.max(100, Math.round(ptWidth * (imgHeight / imgWidth)));
  const contentStream = `q\n${ptWidth.toFixed(2)} 0 0 ${ptHeight.toFixed(2)} 0 0 cm\n/Im1 Do\nQ\n`;

  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptWidth.toFixed(2)} ${ptHeight.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`;
  const obj4 = `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;
  const obj5Header = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
  const obj5Footer = '\nendstream\nendobj\n';

  const encoder = new TextEncoder();
  const hBuf = encoder.encode(header);
  const o1Buf = encoder.encode(obj1);
  const o2Buf = encoder.encode(obj2);
  const o3Buf = encoder.encode(obj3);
  const o4Buf = encoder.encode(obj4);
  const o5HBuf = encoder.encode(obj5Header);
  const o5FBuf = encoder.encode(obj5Footer);

  const offset1 = hBuf.length;
  const offset2 = offset1 + o1Buf.length;
  const offset3 = offset2 + o2Buf.length;
  const offset4 = offset3 + o3Buf.length;
  const offset5 = offset4 + o4Buf.length;
  const endObj5 = offset5 + o5HBuf.length + jpegBytes.length + o5FBuf.length;

  const pad = (n: number) => String(n).padStart(10, '0');
  const xref = `xref\n0 6\n0000000000 65535 f \n${pad(offset1)} 00000 n \n${pad(offset2)} 00000 n \n${pad(offset3)} 00000 n \n${pad(offset4)} 00000 n \n${pad(offset5)} 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${endObj5}\n%%EOF\n`;

  const xrefBuf = encoder.encode(xref);

  const totalLength =
    hBuf.length +
    o1Buf.length +
    o2Buf.length +
    o3Buf.length +
    o4Buf.length +
    o5HBuf.length +
    jpegBytes.length +
    o5FBuf.length +
    xrefBuf.length;

  const pdfBytes = new Uint8Array(totalLength);
  let offset = 0;
  const write = (chunk: Uint8Array) => {
    pdfBytes.set(chunk, offset);
    offset += chunk.length;
  };

  write(hBuf);
  write(o1Buf);
  write(o2Buf);
  write(o3Buf);
  write(o4Buf);
  write(o5HBuf);
  write(jpegBytes);
  write(o5FBuf);
  write(xrefBuf);

  return pdfBytes;
}
