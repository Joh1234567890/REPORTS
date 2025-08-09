// src/index.js

const { generateFullReport } = require("./utils/fullReport");

const insurances = require("../data/sampleInsuranceData.json");
const quotations = require("../data/sampleQuotationData.json");
const claims = require("../data/sampleClaimData.json");

/**
 * (Commented Out) Allows user to provide date range as command-line arguments or via prompt.
 * Usage: node src/index.js 2025-08-01 2025-08-31
 * If no arguments are provided, prompts for start and end date.
 *
 * Uncomment to enable interactive/argument-based date selection.
 */
// const [,, argStart, argEnd] = process.argv;
// const readline = require('readline');
// /**
//  * Prompts the user for a date range and calls the callback with the dates.
//  * @param {(start: string, end: string) => void} callback
//  */
// function askDateRange(callback) {
//   const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
//   rl.question('Enter start date (YYYY-MM-DD): ', (start) => {
//     rl.question('Enter end date (YYYY-MM-DD): ', (end) => {
//       rl.close();
//       callback(start, end);
//     });
//   });
// }
// /**
//  * Runs the report with the provided date range.
//  * @param {string} startDate
//  * @param {string} endDate
//  */
// function runWithDates(startDate, endDate) {
//   const startISO = new Date(startDate).toISOString();
//   const endObj = new Date(endDate);
//   endObj.setHours(23,59,59,999);
//   const endISO = endObj.toISOString();
//   const reportData = generateFullReport(
//     insurances,
//     quotations,
//     claims,
//     startISO,
//     endISO
//   );
//   console.log("\nRaw report data:", JSON.stringify(reportData, null, 2));
// }
// if (argStart && argEnd) {
//   runWithDates(argStart, argEnd);
// } else {
//   askDateRange(runWithDates);
// }

// --- Default: Use hardcoded date range ---
const startDate = "2025-08-01T00:00:00.000Z";
const endDate = "2025-08-31T23:59:59.999Z";

const reportData = generateFullReport(
  insurances,
  quotations,
  claims,
  startDate,
  endDate
);
console.log("\nRaw report data:", JSON.stringify(reportData, null, 2));
