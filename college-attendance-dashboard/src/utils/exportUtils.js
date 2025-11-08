import * as XLSX from "xlsx";

export const exportToExcel = (fileName, data) => {
  const sheet = XLSX.utils.json_to_sheet([data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Report");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// export multiple sheets: sheets = [{ name: 'A', data: [{...}, {...}] }, ...]
export const exportSheetsToExcel = (fileName, sheets = []) => {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(s => {
    // ensure data is an array
    const rows = Array.isArray(s.data) ? s.data : [];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, s.name ? String(s.name).slice(0,31) : 'Sheet');
  });
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
