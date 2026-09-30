import ExcelJS from "exceljs";

export interface ColumnDef {
  header: string;
  key: string;
  width?: number;
}

export type Row = Record<string, string | number | boolean>;

export interface SheetOptions {
  name: string;
  columns: ColumnDef[];
  rows: Row[];
  isSummary?: boolean;
  autoFilter?: { from: string; to: string };
  mergeColumns?: string[];
  mergeRowRanges?: { rowNumber: number; fromCol: number; toCol: number }[];
}

const FONT = "맑은 고딕";
const solid = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

export const createReportWorkbook = () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "360 Feedback System";
  wb.created = new Date();
  return wb;
};

export const addReportSheet = (workbook: ExcelJS.Workbook, options: SheetOptions) => {
  const { name, columns, rows, isSummary, autoFilter, mergeColumns, mergeRowRanges } = options;
  const ws = workbook.addWorksheet(name);
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 18 }));

  const line = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
  const borderThin: Partial<ExcelJS.Borders> = { top: line, bottom: line, left: line, right: line };

  const headerRow = ws.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.fill = solid(isSummary ? "FF0F172A" : "FF1E293B");
    cell.font = { name: FONT, size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderThin;
  });

  rows.forEach((rowData, idx) => {
    const row = ws.addRow(rowData);
    const isGroupSummary = !!rowData._isGroupSummary;
    const baseBg = isGroupSummary ? "FFEFF6FF" : idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
    let maxLines = 1;

    columns.forEach((col) => {
      const cell = row.getCell(col.key);
      const val = cell.value !== undefined && cell.value !== null ? String(cell.value) : "";
      maxLines = Math.max(maxLines, val.split("\n").length);

      const isLong = ["좋은점", "바라는점", "내용", "인사이트"].some((k) => col.header.includes(k));
      const isRehire = ["재협업", "협업", "소통"].some((k) => col.header.includes(k));
      const isRateOrCount = ["희망률", "참여 인원", "피드백 수"].some((k) => col.header.includes(k));

      let font: Partial<ExcelJS.Font> = {
        name: FONT,
        size: 10,
        bold: isGroupSummary,
        color: { argb: isGroupSummary ? "FF0F172A" : "FF1E293B" },
      };
      let bg = baseBg;

      if (isGroupSummary) {
        if (col.key === "피드백 번호") font = { name: FONT, size: 10, bold: true, color: { argb: "FF2563EB" } };
        else if (isRehire) {
          font = { name: FONT, size: 10, bold: true, color: { argb: "FF0F172A" } };
          bg = "FFDBEAFE";
        }
      } else if (isRehire) {
        if (val.includes("좋아요") && !val.includes("싫어요")) {
          font = { name: FONT, size: 10, bold: true, color: { argb: "FF15803D" } };
          bg = "FFECFDF5";
        } else if (val.includes("싫어요") && !val.includes("좋아요")) {
          font = { name: FONT, size: 10, bold: true, color: { argb: "FFB91C1C" } };
          bg = "FFFEF2F2";
        } else if (val.includes("그저그래요")) {
          font = { name: FONT, size: 10, color: { argb: "FF475569" } };
          bg = "FFF1F5F9";
        }
      } else if (isRateOrCount) {
        font = { name: FONT, size: 10, bold: true, color: { argb: "FF0F172A" } };
      }

      cell.fill = solid(bg);
      cell.font = font;
      cell.alignment = {
        horizontal: isLong ? (isGroupSummary ? "center" : "left") : "center",
        vertical: "middle",
        wrapText: isLong,
      };
      cell.border = isGroupSummary
        ? {
            top: { style: "thin", color: { argb: "FF94A3B8" } },
            bottom: { style: "medium", color: { argb: "FF64748B" } },
            left: line,
            right: line,
          }
        : borderThin;
    });

    row.height = isGroupSummary ? Math.max(36, maxLines * 20 + 8) : Math.max(26, Math.min(180, maxLines * 18 + 10));
  });

  if (mergeColumns?.length && rows.length > 1) {
    mergeColumns.forEach((key) => {
      const idx = columns.findIndex((c) => c.key === key);
      if (idx === -1) return;
      ws.mergeCells(2, idx + 1, 1 + rows.length, idx + 1);
      const cell = ws.getCell(2, idx + 1);
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.font = { name: FONT, size: 10.5, bold: true, color: { argb: "FF0F172A" } };
      cell.fill = solid("FFF8FAFC");
    });
  }

  mergeRowRanges?.forEach(({ rowNumber, fromCol, toCol }) => {
    ws.mergeCells(rowNumber, fromCol, rowNumber, toCol);
    const cell = ws.getCell(rowNumber, fromCol);
    cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true, indent: 1 };
    cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: "FF1E3A8A" } };
    cell.fill = solid("FFDBEAFE");
  });

  if (autoFilter) ws.autoFilter = autoFilter;
  return ws;
};

export const downloadWorkbook = async (workbook: ExcelJS.Workbook, fileName: string) => {
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      window.URL.revokeObjectURL(url);
    }, 2000);
  } catch (e) {
    console.error("엑셀 다운로드 오류:", e);
    alert("파일 다운로드 중 오류가 발생했습니다.");
  }
};
