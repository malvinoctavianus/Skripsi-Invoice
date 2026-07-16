import { Invoice, invoiceStatusLabel } from "./contract";
import { formatDateTime, formatRupiah } from "./format";

async function buildInvoicePdf(invoice: Invoice) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  const invoiceId = `INV-${invoice.id.toString().padStart(4, "0")}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Sistem Approval Invoice - Diamankan dengan Blockchain", pageWidth / 2, 26, {
    align: "center",
  });
  doc.setTextColor(0);

  doc.setDrawColor(220);
  doc.line(marginX, 32, pageWidth - marginX, 32);

  let y = 42;
  const labelX = marginX;
  const valueX = marginX + 32;
  const rightLabelX = pageWidth / 2 + 10;
  const rightValueX = rightLabelX + 28;

  doc.setFont("helvetica", "bold");
  doc.text("No. Invoice", labelX, y);
  doc.text("Status", rightLabelX, y);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceId, valueX, y);
  doc.text(invoiceStatusLabel(invoice.status), rightValueX, y);

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Tanggal", labelX, y);
  doc.text("Pemasok", rightLabelX, y);
  doc.setFont("helvetica", "normal");
  doc.text(formatDateTime(invoice.invoiceDate), valueX, y);
  doc.text(invoice.supplierName, rightValueX, y, { maxWidth: pageWidth - rightValueX - marginX });

  if (invoice.keterangan) {
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Keterangan", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.keterangan, valueX, y, { maxWidth: pageWidth - valueX - marginX });
  }

  y += 12;

  autoTable(doc, {
    startY: y,
    head: [["Deskripsi", "Qty", "Harga Satuan", "Subtotal"]],
    body: invoice.items.map((item) => [
      item.name,
      item.qty.toString(),
      formatRupiah(item.unitPrice),
      formatRupiah(item.qty * item.unitPrice),
    ]),
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  const totalsX = pageWidth - marginX;

  doc.setFontSize(10);
  doc.text("Subtotal", totalsX - 60, finalY, { align: "left" });
  doc.text(formatRupiah(invoice.totalAmount), totalsX, finalY, { align: "right" });

  doc.text("DP", totalsX - 60, finalY + 6, { align: "left" });
  doc.text(formatRupiah(invoice.dpAmount), totalsX, finalY + 6, { align: "right" });

  doc.setDrawColor(220);
  doc.line(totalsX - 60, finalY + 9, totalsX, finalY + 9);

  doc.setFont("helvetica", "bold");
  doc.text("Sisa Pembayaran", totalsX - 60, finalY + 15, { align: "left" });
  doc.text(formatRupiah(invoice.totalAmount - invoice.dpAmount), totalsX, finalY + 15, { align: "right" });
  doc.setFont("helvetica", "normal");

  let sigY = finalY + 30;
  const approvals = invoice.history.filter((r) => r.approved);
  if (approvals.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Riwayat Persetujuan", marginX, sigY);
    doc.setFont("helvetica", "normal");
    sigY += 6;
    for (const record of approvals) {
      doc.text(
        `- ${record.roleLabel} (${record.wallet}) - ${formatDateTime(record.timestamp)}`,
        marginX,
        sigY
      );
      sigY += 6;
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Dibuat otomatis dari data on-chain pada ${formatDateTime(BigInt(Math.floor(Date.now() / 1000)))}`,
    marginX,
    doc.internal.pageSize.getHeight() - 10
  );

  return { doc, invoiceId };
}

/** Opens the invoice PDF in a new tab using the browser's built-in PDF viewer, so the
 * user can look at it first - they can download it themselves from within that viewer. */
export async function previewInvoicePdf(invoice: Invoice) {
  const { doc } = await buildInvoicePdf(invoice);
  const blobUrl = doc.output("bloburl");
  window.open(blobUrl, "_blank");
}

/** Triggers an immediate file download, bypassing preview. */
export async function downloadInvoicePdf(invoice: Invoice) {
  const { doc, invoiceId } = await buildInvoicePdf(invoice);
  doc.save(`${invoiceId}.pdf`);
}
