import { CompanyContract, contractStatusLabel, paymentMethodLabel } from "./contract";
import { formatDateTime, formatRupiah } from "./format";

async function buildContractPdf(doc: CompanyContract) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const pdf = new jsPDF();
  const contractId = `KTR-${doc.id.toString().padStart(4, "0")}`;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const marginX = 14;

  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("SURAT KONTRAK KERJA SAMA", pageWidth / 2, 20, { align: "center" });

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100);
  pdf.text("Sistem Approval Kontrak Kerja Sama - Diamankan dengan Blockchain", pageWidth / 2, 26, {
    align: "center",
  });
  pdf.setTextColor(0);

  pdf.setDrawColor(220);
  pdf.line(marginX, 32, pageWidth - marginX, 32);

  let y = 42;
  const labelX = marginX;
  const valueX = marginX + 32;
  const rightLabelX = pageWidth / 2 + 10;
  const rightValueX = rightLabelX + 28;

  pdf.setFont("helvetica", "bold");
  pdf.text("No. Kontrak", labelX, y);
  pdf.text("Status", rightLabelX, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(contractId, valueX, y);
  pdf.text(contractStatusLabel(doc.status), rightValueX, y);

  y += 7;
  pdf.setFont("helvetica", "bold");
  pdf.text("Tanggal", labelX, y);
  pdf.text("Pihak Kedua", rightLabelX, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(formatDateTime(doc.contractDate), valueX, y);
  pdf.text(doc.counterpartyName, rightValueX, y, { maxWidth: pageWidth - rightValueX - marginX });

  y += 7;
  pdf.setFont("helvetica", "bold");
  pdf.text("Masa Berlaku", labelX, y);
  pdf.text("Metode Bayar", rightLabelX, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${formatDateTime(doc.validFrom)} s/d ${formatDateTime(doc.validUntil)}`, valueX, y, {
    maxWidth: rightLabelX - valueX - 4,
  });
  pdf.text(paymentMethodLabel(doc.paymentMethod), rightValueX, y);

  if (doc.keterangan) {
    y += 7;
    pdf.setFont("helvetica", "bold");
    pdf.text("Keterangan", labelX, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(doc.keterangan, valueX, y, { maxWidth: pageWidth - valueX - marginX });
  }

  y += 12;

  autoTable(pdf, {
    startY: y,
    head: [["Pasal / Klausul", "Nilai"]],
    body: doc.clauses.map((clause) => [clause.name, formatRupiah(clause.value)]),
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      1: { halign: "right" },
    },
  });

  const finalY = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  const totalsX = pageWidth - marginX;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Total Nilai Kontrak", totalsX - 60, finalY, { align: "left" });
  pdf.text(formatRupiah(doc.contractValue), totalsX, finalY, { align: "right" });
  pdf.setFont("helvetica", "normal");

  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text(
    `Dibuat otomatis dari data on-chain pada ${formatDateTime(BigInt(Math.floor(Date.now() / 1000)))}`,
    marginX,
    pdf.internal.pageSize.getHeight() - 10
  );

  return { doc: pdf, contractId };
}

/** Opens the contract PDF in a new tab using the browser's built-in PDF viewer, so the
 * user can look at it first - they can download it themselves from within that viewer. */
export async function previewContractPdf(doc: CompanyContract) {
  const { doc: pdf } = await buildContractPdf(doc);
  const blobUrl = pdf.output("bloburl");
  window.open(blobUrl, "_blank");
}

/** Triggers an immediate file download, bypassing preview. */
export async function downloadContractPdf(doc: CompanyContract) {
  const { doc: pdf, contractId } = await buildContractPdf(doc);
  pdf.save(`${contractId}.pdf`);
}
