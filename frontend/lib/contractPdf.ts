import { CompanyContract, Counterparty, nationalityLabel } from "./contract";
import { formatDateLong, formatRupiah } from "./format";

export type PdfPartyInfo = {
  /** Pihak Pertama - representasi wallet Legal yang mengajukan kontrak ini. */
  legalUsername: string;
  legalWallet: string;
  /** Pihak Kedua - data mitra lengkap, kalau ditemukan di CounterpartyRegistry. */
  counterparty?: Counterparty;
};

const PAGE_BOTTOM = 280;
const MARGIN_X = 20;

function ensureSpace(pdf: import("jspdf").jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_BOTTOM) {
    pdf.addPage();
    return 20;
  }
  return y;
}

async function buildContractPdf(doc: CompanyContract, party: PdfPartyInfo) {
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF();
  const contractId = `KTR-${doc.id.toString().padStart(4, "0")}`;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN_X * 2;

  let y = 22;

  // Title, centered, bold, underlined.
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  const title = "SURAT PERJANJIAN KERJASAMA";
  pdf.text(title, pageWidth / 2, y, { align: "center" });
  const titleWidth = pdf.getTextWidth(title);
  pdf.setDrawColor(0);
  pdf.line(pageWidth / 2 - titleWidth / 2, y + 1.5, pageWidth / 2 + titleWidth / 2, y + 1.5);
  y += 6;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120);
  pdf.text(`${contractId} - Diamankan dengan Blockchain`, pageWidth / 2, y, { align: "center" });
  pdf.setTextColor(0);
  y += 12;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Pada hari ini, ${formatDateLong(doc.contractDate)}, kami yang bertanda tangan di bawah ini:`,
    MARGIN_X,
    y
  );
  y += 8;

  function identityRow(label: string, value: string) {
    pdf.text(label, MARGIN_X + 4, y);
    pdf.text(":", MARGIN_X + 42, y);
    const lines = pdf.splitTextToSize(value, contentWidth - 48);
    pdf.text(lines, MARGIN_X + 46, y);
    y += 6 * lines.length;
  }

  identityRow("Nama", party.legalUsername);
  identityRow("Wallet", party.legalWallet);
  y += 1;
  pdf.text("Yang selanjutnya disebut sebagai PIHAK PERTAMA.", MARGIN_X, y);
  y += 9;

  if (party.counterparty) {
    const cp = party.counterparty;
    identityRow("Nama Perusahaan", cp.name);
    identityRow("Nama Penandatangan", cp.signatoryName);
    identityRow("Tempat, Tgl Lahir", `${cp.birthPlace}, ${formatDateLong(cp.birthDate)}`);
    identityRow("Alamat", cp.alamat);
    identityRow("No. KTP/SIM", cp.idNumber);
    identityRow("Kewarganegaraan", nationalityLabel(cp.nationality));
  } else {
    identityRow("Nama Perusahaan", doc.counterpartyName);
  }
  y += 1;
  pdf.text("Selanjutnya akan disebut dengan PIHAK KEDUA.", MARGIN_X, y);
  y += 10;

  pdf.text(
    "Kedua belah pihak telah sepakat untuk mengadakan kerjasama usaha dengan",
    MARGIN_X,
    y
  );
  y += 5;
  pdf.text("ketentuan-ketentuan yang diatur sebagai berikut:", MARGIN_X, y);
  y += 10;

  // Ringkasan kontrak (data praktis di luar format surat klasik). Box height is derived
  // from the actual line count so the text never overflows the border, regardless of how
  // long the keterangan wraps.
  pdf.setFontSize(9);
  const rowHeight = 6;
  const ketRowHeight = 5;
  const ketLines = doc.keterangan
    ? pdf.splitTextToSize(`Keterangan: ${doc.keterangan}`, contentWidth - 8)
    : [];
  const boxTopPad = 5;
  const boxBottomPad = 4;
  const boxHeight = boxTopPad + rowHeight * 2 + ketLines.length * ketRowHeight + boxBottomPad;

  y = ensureSpace(pdf, y, boxHeight + 4);
  pdf.setDrawColor(220);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(MARGIN_X, y - boxTopPad, contentWidth, boxHeight, 2, 2, "FD");
  pdf.text(`Nilai Kerja Sama: ${formatRupiah(doc.contractValue)}`, MARGIN_X + 4, y);
  pdf.text(
    `Masa Berlaku: ${formatDateLong(doc.validFrom)} s/d ${formatDateLong(doc.validUntil)}`,
    MARGIN_X + 4,
    y + rowHeight
  );
  let ketY = y + rowHeight * 2;
  for (const line of ketLines) {
    pdf.text(line, MARGIN_X + 4, ketY);
    ketY += ketRowHeight;
  }
  y += boxHeight + 4;
  pdf.setFontSize(10);

  // Pasal-pasal.
  doc.clauses.forEach((clause, idx) => {
    y = ensureSpace(pdf, y, 16);
    pdf.setFont("helvetica", "bold");
    pdf.text(`PASAL ${idx + 1}`, pageWidth / 2, y, { align: "center" });
    y += 6;
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(clause.content, contentWidth);
    for (const line of lines) {
      y = ensureSpace(pdf, y, 6);
      pdf.text(line, MARGIN_X, y, { align: "left", maxWidth: contentWidth });
      y += 5.5;
    }
    y += 4;
  });

  y = ensureSpace(pdf, y, 20);
  const closing = pdf.splitTextToSize(
    "Demikian surat perjanjian ini kami buat sebenar-benarnya dalam rangkap dua yang mana " +
      "masing-masing rangkap mempunyai kekuatan hukum yang sama. Dan dalam pembuatan " +
      "perjanjian kerjasama ini tidak ada paksaan dari pihak manapun.",
    contentWidth
  );
  pdf.text(closing, MARGIN_X, y);
  y += 5.5 * closing.length + 6;

  y = ensureSpace(pdf, y, 45);
  pdf.text(formatDateLong(doc.contractDate), pageWidth - MARGIN_X, y, { align: "right" });
  y += 10;

  const colLeftX = MARGIN_X + contentWidth * 0.2;
  const colRightX = MARGIN_X + contentWidth * 0.8;
  pdf.text("PIHAK PERTAMA,", colLeftX, y, { align: "center" });
  pdf.text("PIHAK KEDUA,", colRightX, y, { align: "center" });
  y += 20;
  pdf.setFontSize(8);
  pdf.setTextColor(140);
  pdf.text("(Materai)", pageWidth / 2, y - 8, { align: "center" });
  pdf.setTextColor(0);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(party.legalUsername, colLeftX, y, { align: "center" });
  pdf.text(party.counterparty?.signatoryName ?? doc.counterpartyName, colRightX, y, { align: "center" });
  pdf.setFont("helvetica", "normal");

  return { doc: pdf, contractId };
}

/** Opens the contract PDF in a new tab using the browser's built-in PDF viewer, so the
 * user can look at it first - they can download it themselves from within that viewer. */
export async function previewContractPdf(doc: CompanyContract, party: PdfPartyInfo) {
  const { doc: pdf } = await buildContractPdf(doc, party);
  const blobUrl = pdf.output("bloburl");
  window.open(blobUrl, "_blank");
}

/** Triggers an immediate file download, bypassing preview. */
export async function downloadContractPdf(doc: CompanyContract, party: PdfPartyInfo) {
  const { doc: pdf, contractId } = await buildContractPdf(doc, party);
  pdf.save(`${contractId}.pdf`);
}
