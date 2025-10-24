import * as XLSX from "xlsx";

export const exportToExcel = (fileName, data) => {
  const sheet = XLSX.utils.json_to_sheet([data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Report");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
