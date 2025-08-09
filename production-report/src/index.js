/**
 * Main entry point for the insurance data export project.
 * Loads configuration, data, and utilities, then exports data to Excel.
 * Designed for extensibility and easy integration with other data sources.
 */
const path = require("path");
const mapping = require("./config/mappingConfig");
const { exportToExcel } = require("./utils/excelExporter");

const insuranceRecords = require("./data/sampleInsuranceData.json");
const { getValueByPath } = require("./utils/dataExtractor");

/**
 * Filters insurance records to include only those whose startDate falls within the specified month and year.
 * This is used to generate a monthly report.
 *
 * @param {Array<Object>} records - The insurance records array.
 * @param {number} month - The month (1-12).
 * @param {number} year - The year (e.g., 2025).
 * @returns {Array<Object>} Filtered records for the given month/year.
 */
function filterRecordsByMonth(records, month, year) {
  return records.filter((record) => {
    // Extract the start date string using the utility for nested fields
    const dateStr = getValueByPath(record, "startDate.$date");
    if (!dateStr) return false; // Skip if no date
    const date = new Date(dateStr);
    // Check if the record's start date matches the desired month and year
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  });
}

/**
 * Runs the export process for insurance records.
 * Handles errors and sets the output file name.
 */

/**
 * Runs the export process for insurance records for a specific month and year.
 * Filters the records, generates the output filename, and exports to Excel.
 * Handles errors and logs the export summary.
 */
async function runExport() {
  try {
    // Set the desired month and year for the report (default: current month/year)
    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-based, so add 1
    const year = now.getFullYear();

    // Filter records for the selected month/year
    const filteredRecords = filterRecordsByMonth(insuranceRecords, month, year);

    // Build the output filename to include the year and month for clarity
    const fileName = path.join(
      __dirname,
      `InsuranceReport_${year}_${month}.xlsx`
    );

    // Export the filtered records to Excel using the mapping configuration
    exportToExcel(filteredRecords, mapping, fileName);
    console.log(
      `Exported ${filteredRecords.length} records for ${year}-${month}`
    );
  } catch (error) {
    // Log any errors that occur during the export process
    console.error("Error during export:", error);
  }
}

// Run the export on startup
runExport();
