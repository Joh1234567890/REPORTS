/**
 * Utility for exporting structured data to Excel files.
 * Uses mapping configuration and data extraction helpers for flexible output.
 */
// excelExporter.js
const xlsx = require("xlsx");
const { getValueByPath } = require("./dataExtractor");

/**
 * Export JSON data to Excel using the mapping config.
 * @param {Array<Object>} records - Array of JSON records.
 * @param {Array<{label: string, key: string}>} mapping - Mapping config.
 * @param {string} fileName - Output Excel filename.
 */
function exportToExcel(records, mapping, fileName = "Export.xlsx") {
  if (!Array.isArray(records) || !Array.isArray(mapping)) {
    throw new Error("Invalid parameters: records and mapping must be arrays.");
  }

  // Create header row from labels
  const headers = mapping.map((m) => m.label);

  // Map records to rows of cell values using keys and extraction helper
  const rows = records.map((record) =>
    mapping.map((m) => getValueByPath(record, m.key))
  );

  // Combine headers and rows for the worksheet data (array of arrays)
  const worksheetData = [headers, ...rows];

  // Create worksheet object from 2D array
  const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

  // Create new workbook and append worksheet
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Insurance Report");

  // Write the Excel file (blocking call; consider async for large files)
  xlsx.writeFile(workbook, fileName);

  console.log(`Excel file "${fileName}" has been created.`);
}

module.exports = { exportToExcel };
