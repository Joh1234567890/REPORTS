/**
 * Ensures there is enough vertical space on the current PDF page, adds a new page if needed.
 * @param {PDFDocument} doc - The PDF document instance.
 * @param {number} [neededHeight=80] - The vertical space required.
 */
function ensureSpace(doc, neededHeight = 80) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  // Add a new page if not enough space below current position
  if (doc.y + neededHeight > bottom) {
    if (doc.y > doc.page.margins.top + 1) {
      doc.addPage();
    }
    // Prevents blank pages if already at top
  }
}
// Main PDF business report generator utilities
// ---------- Imports ----------
const dayjs = require("dayjs");
const isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(isBetween);
const chalk = require("chalk");
const Table = require("cli-table3");
const PDFDocument = require("pdfkit");
/**
 * Registers Lato font variants for PDFKit.
 */
PDFDocument.prototype._registerLatoFonts = function () {
  this.registerFont("Lato", __dirname + "/../fonts/Lato.ttf");
  this.registerFont("Lato-Bold", __dirname + "/../fonts/Lato-Bold.ttf");
  this.registerFont("Lato-Light", __dirname + "/../fonts/Lato-Light.ttf");
};
const fs = require("fs");
const { leftMargin, rightMargin, blockSpacing } = require("../constants");
const {
  drawPageBorder,
  addHeritageLogo,
  addFooter,
  generateHeader,
  insideWidth,
  drawWideLeftTable,
} = require("./pdfLayoutUtils");

// ---------- General Utility Functions ----------
/**
 * Safely gets a nested property from an object using a dot-separated path.
 * @param {Object} obj - The object to query.
 * @param {string} path - The dot-separated path string.
 * @returns {*} The value at the given path, or undefined if not found.
 */
function getPath(obj, path) {
  return path.split(".").reduce((acc, cur) => acc && acc[cur], obj);
}

/**
 * Filters an array of records by a date range.
 * @param {Array} records - The records to filter.
 * @param {string|Date} start - Start date (inclusive).
 * @param {string|Date} end - End date (inclusive).
 * @param {string} [dateField="createdAt.$date"] - The field path for the date.
 * @returns {Array} Filtered records.
 */
function filterByDateRange(records, start, end, dateField = "createdAt.$date") {
  if (!Array.isArray(records)) {
    console.error(
      `❌ Expected an array for filterByDateRange, got: ${typeof records}`
    );
    return [];
  }
  return records.filter((rec) => {
    const dateStr = getPath(rec, dateField);
    return dateStr && dayjs(dateStr).isBetween(start, end, null, "[]");
  });
}

/**
 * Counts occurrences of values for a given field in an array of records.
 * @param {Array} records - The records to count.
 * @param {string} fieldPath - The field path to count by.
 * @returns {Object} An object mapping field values to their counts.
 */
function countByField(records, fieldPath) {
  const counts = {};
  records.forEach((r) => {
    const key = getPath(r, fieldPath);
    if (key) counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

/**
 * Sums the values of a field in an array of records.
 * @param {Array} records - The records to sum.
 * @param {string} fieldPath - The field path to sum by.
 * @returns {number} The sum of the field values.
 */
function sumByField(records, fieldPath) {
  return records.reduce((total, r) => {
    const val = getPath(r, fieldPath);
    return total + (typeof val === "number" ? val : 0);
  }, 0);
}

/**
 * Prints a table to the console using cli-table3.
 * @param {string} title - The table title.
 * @param {Object} obj - The data object to display.
 */
function printTable(title, obj) {
  const table = new Table({
    head: [chalk.cyan(title), chalk.cyan("Count")],
    style: { head: [] },
  });
  for (const key in obj) table.push([key, obj[key]]);
  console.log(table.toString());
}

// ---------- Insurance Policy Metrics Section ----------
/**
 * Generates insurance policy metrics and prints or returns them.
 * @param {Array} insurances - Insurance records.
 * @param {string|Date} startDate - Start date.
 * @param {string|Date} endDate - End date.
 * @param {boolean} [isRaw=false] - If true, returns raw data instead of printing.
 * @returns {Object|undefined} Metrics object if isRaw is true, otherwise undefined.
 */
function generateInsuranceSection(
  insurances,
  startDate,
  endDate,
  isRaw = false
) {
  const filtered = filterByDateRange(insurances, startDate, endDate);
  const totalPolicies = filtered.length;
  const insuranceTypeCounts = countByField(filtered, "insuranceLabel");
  const totalPremium = sumByField(filtered, "premium");
  const totalVAT = sumByField(filtered, "vat");
  const policyStatusCounts = countByField(filtered, "status");
  const compCount = filtered.filter((i) => i.isComprehensive).length;
  const thirdCount = totalPolicies - compCount;
  const platformCounts = countByField(filtered, "platform");
  const paymentMethodCounts = countByField(filtered, "paymentMethod");
  const vehicles = {};
  filtered.forEach((r) => {
    const make = getPath(r, "vehicleInfo.make") || "Unknown";
    const model = getPath(r, "vehicleInfo.model") || "Unknown";
    const year = getPath(r, "vehicleInfo.manufactureYear") || "Unknown";
    const reg = getPath(r, "vehicleInfo.registrationNumber") || "Unknown";
    const key = `${make} ${model} (${year}) [${reg}]`;
    vehicles[key] = (vehicles[key] || 0) + 1;
  });
  const customerTypeCounts = countByField(filtered, "customerType");
  const insurerNameCounts = countByField(filtered, "insurerName");
  const hourCount = {},
    dayCount = {};
  filtered.forEach((r) => {
    const date = getPath(r, "createdAt.$date");
    if (date) {
      const d = dayjs(date);
      hourCount[d.format("HH") + ":00"] =
        (hourCount[d.format("HH") + ":00"] || 0) + 1;
      dayCount[d.format("dddd")] = (dayCount[d.format("dddd")] || 0) + 1;
    }
  });
  const totalPaid = sumByField(filtered, "total");
  const totalDue = sumByField(filtered, "dueNow");

  if (isRaw) {
    return {
      totalPolicies,
      insuranceTypeCounts,
      totalPremium,
      totalVAT,
      policyStatusCounts,
      compCount,
      thirdCount,
      platformCounts,
      paymentMethodCounts,
      vehicles,
      customerTypeCounts,
      insurerNameCounts,
      hourCount,
      dayCount,
      totalPaid,
      totalDue,
    };
  }

  // CLI output
  console.log(chalk.yellow("\n=== INSURANCE POLICY METRICS ==="));
  console.log(`Date Range: ${startDate} → ${endDate}\n`);
  console.log(chalk.green("Total Policies Issued:"), totalPolicies);
  printTable("Insurance Types", insuranceTypeCounts);
  console.log(
    chalk.green("Total Premiums Collected:"),
    totalPremium.toLocaleString()
  );
  console.log(chalk.green("Total VAT Collected:"), totalVAT.toLocaleString());
  printTable("Policy Status", policyStatusCounts);
  console.log(
    chalk.magenta(
      `Comprehensive: ${compCount} (${(
        (compCount / totalPolicies) * 100 || 0
      ).toFixed(2)}%)`
    )
  );
  console.log(
    chalk.magenta(
      `Third-Party: ${thirdCount} (${(
        (thirdCount / totalPolicies) * 100 || 0
      ).toFixed(2)}%)`
    )
  );
  printTable("Platforms", platformCounts);
  printTable("Payment Methods", paymentMethodCounts);
  printTable("Top Vehicles", vehicles);
  printTable("Customer Types", customerTypeCounts);
  printTable("Insurer Names", insurerNameCounts);
  printTable("Peak Hours", hourCount);
  printTable("Peak Days", dayCount);
  console.log(chalk.green("Total Amount Paid:"), totalPaid.toLocaleString());
  console.log(chalk.green("Total Amount Due:"), totalDue.toLocaleString());
}

// ---------- Quotation Metrics ----------
/**
 * Generates quotation metrics and prints or returns them.
 * @param {Array} quotations - Quotation records.
 * @param {Array} policies - Policy records (for conversion rate).
 * @param {string|Date} startDate - Start date.
 * @param {string|Date} endDate - End date.
 * @param {boolean} [isRaw=false] - If true, returns raw data instead of printing.
 * @returns {Object|undefined} Metrics object if isRaw is true, otherwise undefined.
 */
function generateQuotationSection(
  quotations,
  policies,
  startDate,
  endDate,
  isRaw = false
) {
  const filtered = filterByDateRange(quotations, startDate, endDate);
  const totalQuotations = filtered.length;
  const totalValue = sumByField(filtered, "total");
  const avgValue = filtered.length > 0 ? totalValue / filtered.length : 0;
  const sourceCounts = countByField(filtered, "via");
  const platformCounts = countByField(filtered, "platform");
  const customerTypeCounts = countByField(filtered, "customerType");
  const statusCounts = countByField(filtered, "status");

  const quotedNums = new Set(
    filtered.map((q) => getPath(q, "quotationNumber")).filter(Boolean)
  );
  const convertedNums = new Set(
    policies
      .map((p) => getPath(p, "quotationNumber"))
      .filter((qn) => qn && quotedNums.has(qn))
  );
  const conversionRate =
    filtered.length > 0 ? (convertedNums.size / filtered.length) * 100 : 0;

  const quoteMap = {};
  filtered.forEach((q) => {
    const qNum = getPath(q, "quotationNumber");
    const qDate = getPath(q, "createdAt.$date");
    if (qNum && qDate) quoteMap[qNum] = dayjs(qDate);
  });

  let totalDays = 0,
    convCount = 0;
  policies.forEach((p) => {
    const qNum = getPath(p, "quotationNumber");
    const pDate = getPath(p, "createdAt.$date");
    if (qNum && quoteMap[qNum] && pDate) {
      const days = dayjs(pDate).diff(quoteMap[qNum], "day");
      if (days >= 0) {
        totalDays += days;
        convCount++;
      }
    }
  });
  const avgTimeToConversion = convCount > 0 ? totalDays / convCount : null;

  // Top vehicles in quotations
  const reqVehicles = {};
  filtered.forEach((q) => {
    (q.items || []).forEach((item) => {
      const make = getPath(item, "vehicleInfo.make") || "Unknown";
      const model = getPath(item, "vehicleInfo.model") || "Unknown";
      const year = getPath(item, "vehicleInfo.manufactureYear") || "Unknown";
      const key = `${make} ${model} (${year})`;
      reqVehicles[key] = (reqVehicles[key] || 0) + 1;
    });
  });

  // Insurance types requested in quotations
  const reqTypes = {};
  filtered.forEach((q) => {
    (q.items || []).forEach((item) => {
      const label = getPath(item, "insuranceLabel");
      if (label) reqTypes[label] = (reqTypes[label] || 0) + 1;
    });
  });

  // Trends
  const daily = {},
    monthly = {};
  filtered.forEach((q) => {
    const d = getPath(q, "createdAt.$date");
    if (d) {
      const dt = dayjs(d);
      daily[dt.format("YYYY-MM-DD")] =
        (daily[dt.format("YYYY-MM-DD")] || 0) + 1;
      monthly[dt.format("YYYY-MM")] = (monthly[dt.format("YYYY-MM")] || 0) + 1;
    }
  });

  if (isRaw) {
    return {
      totalQuotations,
      totalValue,
      avgValue,
      sourceCounts,
      platformCounts,
      customerTypeCounts,
      statusCounts,
      conversionRate,
      avgTimeToConversion,
      reqVehicles,
      reqTypes,
      daily,
      monthly,
    };
  }

  // CLI printing
  console.log(chalk.yellow("\n=== QUOTATION METRICS ==="));
  console.log(`Date Range: ${startDate} → ${endDate}\n`);
  console.log(chalk.green("Total Quotations Generated:"), totalQuotations);
  console.log(
    chalk.green("Total Quotation Amount:"),
    totalValue.toLocaleString()
  );
  printTable("Quotation Sources", sourceCounts);
  printTable("Quotation Platforms", platformCounts);
  printTable("Quotations by Customer Type", customerTypeCounts);
  printTable("Quotation Status", statusCounts);
  console.log(chalk.green(`Conversion Rate: ${conversionRate.toFixed(2)}%`));
  if (avgTimeToConversion !== null) {
    console.log(
      chalk.green("Average Time to Conversion (days):"),
      avgTimeToConversion.toFixed(2)
    );
  } else {
    console.log(
      chalk.green("Average Time to Conversion (days): Not Available")
    );
  }
  printTable("Top Requested Vehicles", reqVehicles);
  printTable("Insurance Types Requested", reqTypes);
  console.log(
    chalk.green("Average Quotation Value:"),
    avgValue.toLocaleString()
  );
  printTable("Quotations Per Day", daily);
  printTable("Quotations Per Month", monthly);
}
// ---------- Claims Metrics ----------
/**
 * Generates claims metrics and prints or returns them.
 * @param {Array} claims - Claim records.
 * @param {Array} policies - Policy records (for conversion rate).
 * @param {string|Date} startDate - Start date.
 * @param {string|Date} endDate - End date.
 * @param {boolean} [isRaw=false] - If true, returns raw data instead of printing.
 * @returns {Object|undefined} Metrics object if isRaw is true, otherwise undefined.
 */
function generateClaimsSection(
  claims,
  policies,
  startDate,
  endDate,
  isRaw = false
) {
  const filtered = filterByDateRange(claims, startDate, endDate);

  const totalClaims = filtered.length;
  const statusCounts = countByField(filtered, "status");
  const insuranceTypeCounts = countByField(filtered, "insuranceLabel");

  const vehicleCounts = {};
  filtered.forEach((c) => {
    const make = getPath(c, "vehicleInfo.make") || "Unknown";
    const model = getPath(c, "vehicleInfo.model") || "Unknown";
    const year = getPath(c, "vehicleInfo.manufactureYear") || "Unknown";
    const key = `${make} ${model} (${year})`;
    vehicleCounts[key] = (vehicleCounts[key] || 0) + 1;
  });

  const insurerNameCounts = countByField(filtered, "insurerName");

  const docFields = [
    "claimForm",
    "accidentSketch",
    "repairEstimate",
    "driversLicense",
    "registrationCard",
    "photographsDamagedVehicle",
    "vehicleInspectionReport",
    "preliminaryPoliceReport",
    "finalPoliceReport",
    "tPartyInfo",
  ];

  let totalFiles = 0;
  filtered.forEach((c) => {
    docFields.forEach((f) => {
      totalFiles += Array.isArray(c[f]) ? c[f].length : 0;
    });
  });
  const avgFilesPerClaim =
    filtered.length > 0 ? totalFiles / filtered.length : 0;

  const fileTypeCounts = {};
  filtered.forEach((c) => {
    docFields.forEach((f) => {
      (c[f] || []).forEach((file) => {
        if (file.type) {
          fileTypeCounts[file.type] = (fileTypeCounts[file.type] || 0) + 1;
        }
      });
    });
  });

  // Average resolve time
  let totalResolveDays = 0,
    resolvedCount = 0;
  filtered.forEach((c) => {
    const start = getPath(c, "createdAt.$date");
    const end = getPath(c, "processedAt.$date");
    if (start && end) {
      const days = dayjs(end).diff(dayjs(start), "day");
      if (days >= 0) {
        totalResolveDays += days;
        resolvedCount++;
      }
    }
  });
  const avgResolveDays =
    resolvedCount > 0 ? totalResolveDays / resolvedCount : null;

  // Conversion rate: claims to policies
  const policyIdsWithClaims = new Set(
    filtered.map((c) => getPath(c, "policyID.$oid")).filter(Boolean)
  );
  const conversionRate =
    policies.length > 0
      ? (policyIdsWithClaims.size / policies.length) * 100
      : 0;

  const reasonCounts = countByField(filtered, "claimReason");
  const claimsPerCustomer = countByField(filtered, "clientID.$oid");
  const claimsPerPolicy = countByField(filtered, "policyID.$oid");
  const accidentTypeCounts = countByField(filtered, "accidentType");

  const dailyTrend = {},
    monthlyTrend = {};
  filtered.forEach((c) => {
    const d = getPath(c, "createdAt.$date");
    if (d) {
      const dt = dayjs(d);
      dailyTrend[dt.format("YYYY-MM-DD")] =
        (dailyTrend[dt.format("YYYY-MM-DD")] || 0) + 1;
      monthlyTrend[dt.format("YYYY-MM")] =
        (monthlyTrend[dt.format("YYYY-MM")] || 0) + 1;
    }
  });

  const totalClaimed = sumByField(filtered, "amountClaimed");
  const totalPaid = sumByField(filtered, "amountPaid");
  const claimsWithMissingDocs = filtered.filter((c) =>
    docFields.some((f) => !Array.isArray(c[f]) || c[f].length === 0)
  ).length;

  if (isRaw) {
    return {
      totalClaims,
      statusCounts,
      insuranceTypeCounts,
      vehicleCounts,
      insurerNameCounts,
      avgFilesPerClaim,
      fileTypeCounts,
      avgResolveDays,
      conversionRate,
      reasonCounts,
      claimsPerCustomer,
      claimsPerPolicy,
      accidentTypeCounts,
      dailyTrend,
      monthlyTrend,
      totalClaimed,
      totalPaid,
      claimsWithMissingDocs,
    };
  }

  // CLI output
  console.log(chalk.yellow("\n=== CLAIMS METRICS ==="));
  console.log(`Date Range: ${startDate} → ${endDate}\n`);
  console.log(chalk.green("Total Claims Submitted:"), totalClaims);
  printTable("Claims by Status", statusCounts);
  printTable("Claims by Insurance Type", insuranceTypeCounts);
  printTable("Claims by Vehicle Make/Model/Year", vehicleCounts);
  printTable("Claims by Insurer Name", insurerNameCounts);
  console.log(
    chalk.green("Average Files/Documents per Claim:"),
    avgFilesPerClaim.toFixed(2)
  );
  printTable("File Types Distribution", fileTypeCounts);
  if (avgResolveDays !== null) {
    console.log(
      chalk.green("Average Time to Resolve (days):"),
      avgResolveDays.toFixed(2)
    );
  } else {
    console.log(chalk.green("Average Time to Resolve (days): Not Available"));
  }
  console.log(
    chalk.green(
      `Claims Conversion Rate (per policy): ${conversionRate.toFixed(2)}%`
    )
  );
  printTable("Claims by Reason", reasonCounts);
  printTable("Claims per Customer", claimsPerCustomer);
  printTable("Claims per Policy", claimsPerPolicy);
  printTable("Claims by Accident Type", accidentTypeCounts);
  printTable("Claims Per Day", dailyTrend);
  printTable("Claims Per Month", monthlyTrend);
  console.log(
    chalk.green("Total Amount Claimed:"),
    totalClaimed.toLocaleString()
  );
  console.log(chalk.green("Total Amount Paid:"), totalPaid.toLocaleString());
  console.log(
    chalk.green("Claims Missing One or More Required Docs:"),
    claimsWithMissingDocs
  );
}

/**
 * Exports the full business report to a PDF file, including header, sections, and layout.
 * @param {Object} reportData - The aggregated report data.
 * @param {string} filePath - The output PDF file path.
 */
function exportReportToPDF(reportData, filePath) {
  const doc = new PDFDocument({
    size: "A4",
    margins: {
      left: leftMargin,
      right: rightMargin,
      top: leftMargin,
      bottom: 40,
    },
    bufferPages: true,
  });
  doc._registerLatoFonts();
  doc.pipe(fs.createWriteStream(filePath));

  // --- Report Header: Logo left, address block right ---
  const {
    logoPath,
    coverNoteLogoLeftOffset,
    coverNoteLogoTopOffset,
    coverNoteLogoSize,
    companyAddress,
    companyBox,
    companyEmail,
    companyPhoneNumber,
  } = require("../constants");
  const { drawLine } = require("./pdfLayoutUtils"); // drawLine is fine, insideWidth is now top-level
  let y = 25;
  // Draw company logo on the left
  try {
    doc.image(
      logoPath,
      leftMargin + coverNoteLogoLeftOffset,
      y + coverNoteLogoTopOffset,
      { width: coverNoteLogoSize }
    );
  } catch {}
  // Draw address and contact info on the right
  y += 10;
  doc
    .fontSize(9)
    .font("Lato")
    .text(companyAddress, leftMargin + 220, y, {
      align: "right",
      width: insideWidth(doc) - 220,
    })
    .text(companyBox, leftMargin + 220, (y += 15), {
      align: "right",
      width: insideWidth(doc) - 220,
    })
    .text(
      `${companyEmail} / ${companyPhoneNumber}`,
      leftMargin + 220,
      (y += 15),
      {
        align: "right",
        width: insideWidth(doc) - 220,
      }
    );
  // Draw separator line and report title
  drawLine(doc, (y += 25));
  // Move FULL BUSINESS REPORT up by 5 units
  y += 3;
  doc
    .font("Lato-Bold")
    .fontSize(16)
    .fillColor("#003366")
    .text("FULL BUSINESS REPORT", leftMargin, y, {
      align: "center",
      width: insideWidth(doc),
    })
    .fillColor("black");
  // Only one division line below the main title
  drawLine(doc, doc.y + 2);
  doc.moveDown(1.2);

  // Draw page border for consistent style
  drawPageBorder(doc);

  // Draw border on every new page and reset doc.y to top margin
  doc.on("pageAdded", () => {
    drawPageBorder(doc);
    doc.y = doc.page.margins.top;
  });
  // ...existing code...
  // No logo at the bottom or footer as per requirements

  /**
   * Renders a section title with division lines and color styling.
   * @param {string} title - The section title text.
   */
  let sectionCount = 0;
  function printSectionTitle(title) {
    ensureSpace(doc, 60);
    // Always draw a single division line above the section title
    if (sectionCount > 0) {
      drawLine(doc, doc.y);
      // Minimal space after the line for tight grouping
      doc.moveDown(0.2);
    }
    // Move Insurance Policy Metrics down by 5 units
    if (title === "Insurance Policy Metrics") {
      doc.moveDown(0.5);
    }
    // Draw the title close to the line
    const titleFontSize = 13;
    const yTitle = doc.y;
    doc
      .fontSize(titleFontSize)
      .font("Lato-Bold")
      .fillColor("black")
      .text(title, leftMargin, yTitle, {
        align: "center",
        width: insideWidth(doc),
      });
    // Add a bit more space after the title for visual balance
    doc.moveDown(0.7);
    doc.fillColor("black").font("Lato");
    sectionCount++;
  }

  /**
   * Renders a two-column key-value table with aligned columns. Dynamic options for usability.
   * @param {Object} data - The key-value data to display.
   * @param {string} [col1Label="Category"] - The label for the first column.
   * @param {number} [maxRows=20] - Maximum number of rows to display.
   * @param {Object} [options] - Optional table options.
   * @param {string} [options.col2Label="Count"] - The label for the second column.
   * @param {number} [options.col1Width] - Width of the first column (px).
   * @param {number} [options.col2Width] - Width of the second column (px).
   * @param {number} [options.gap=18] - Gap between columns (px).
   * @param {string} [options.align1="left"] - Alignment for first column.
   * @param {string} [options.align2="right"] - Alignment for second column.
   */
  function printKeyValueTable(
    data,
    col1Label = "Category",
    maxRows = 20,
    options = {}
  ) {
    const entries = Object.entries(data).slice(0, maxRows);
    // Find max key length for padding
    const maxKeyLen = Math.max(
      ...entries.map(([key]) => key.length),
      col1Label.length
    );
    // Estimate height needed for table
    const neededHeight = 24 + entries.length * 14;
    ensureSpace(doc, neededHeight);
    // Dynamic table options
    const gap = options.gap !== undefined ? options.gap : 18;
    const col1Width = options.col1Width || Math.max(80, maxKeyLen * 7 + 10);
    const col2Width = options.col2Width || 38;
    const col2Label = options.col2Label || "Count";
    const align1 = options.align1 || "left";
    const align2 = options.align2 || "right";
    // Header row
    doc.font("Lato-Bold").fontSize(11);
    const headerY = doc.y;
    doc.text(col1Label, leftMargin + 20, headerY, {
      width: col1Width,
      align: align1,
    });
    doc.text(col2Label, leftMargin + 20 + col1Width + gap, headerY, {
      width: col2Width,
      align: align2,
    });
    doc.moveDown(0.1);
    // Data rows
    doc.font("Lato").fontSize(10);
    entries.forEach(([key, val]) => {
      ensureSpace(doc, 14);
      const rowY = doc.y;
      doc.text(key, leftMargin + 20, rowY, { width: col1Width, align: align1 });
      doc.text(val.toString(), leftMargin + 20 + col1Width + gap, rowY, {
        width: col2Width,
        align: align2,
      });
    });
    doc.moveDown(0.5);
  }

  // --- Insurance Section ---
  doc.moveDown(-0.9);
  ensureSpace(doc, 100);
  printSectionTitle("Insurance Policy Metrics");
  // Render summary metrics as a wide-left table
  const insuranceSummaryRows = [
    {
      label: "Total Policies Issued",
      value: reportData.insurance.totalPolicies,
    },
    {
      label: "Total Premiums Collected",
      value: reportData.insurance.totalPremium.toLocaleString(),
    },
    {
      label: "Total VAT Collected",
      value: reportData.insurance.totalVAT.toLocaleString(),
    },
  ];
  drawWideLeftTable(doc, insuranceSummaryRows, "Metric", "Value");
  doc.moveDown(1.2); // Increased spacing after summary table

  // Render type/count tables using wide-left table style
  const typeTables = [
    {
      data: reportData.insurance.insuranceTypeCounts,
      label: "Type Count",
      col1: "Type",
      col2: "Count",
    },
    {
      data: reportData.insurance.policyStatusCounts,
      label: "Status Count",
      col1: "Status",
      col2: "Count",
    },
    {
      data: reportData.insurance.platformCounts,
      label: "Platform Count",
      col1: "Platform",
      col2: "Count",
    },
    {
      data: reportData.insurance.paymentMethodCounts,
      label: "Payment Method Count",
      col1: "Payment Method",
      col2: "Count",
    },
    {
      data: reportData.insurance.customerTypeCounts,
      label: "Customer Type Count",
      col1: "Customer Type",
      col2: "Count",
    },
    {
      data: reportData.insurance.insurerNameCounts,
      label: "Insurer Name Count",
      col1: "Insurer Name",
      col2: "Count",
    },
  ];
  typeTables.forEach(({ data, label, col1, col2 }) => {
    if (data && Object.keys(data).length > 0) {
      doc.moveDown(1.0); // More space before each table group
      doc
        .font("Lato-Bold")
        .fontSize(11)
        .text(label, leftMargin, doc.y, {
          width: insideWidth(doc),
          align: "center",
        });
      doc.moveDown(0.3);
      const rows = Object.entries(data).map(([k, v]) => ({
        label: k,
        value: v,
      }));
      drawWideLeftTable(doc, rows, col1, col2);
      doc.moveDown(0.7); // More space after each table
    }
  });

  // --- Quotation Section ---
  ensureSpace(doc, 100);
  printSectionTitle("Quotation Metrics");
  // Render summary metrics as a wide-left table
  const quotationSummaryRows = [
    {
      label: "Total Quotations Generated",
      value: reportData.quotation.totalQuotations,
    },
    {
      label: "Total Quotation Amount",
      value: reportData.quotation.totalValue.toLocaleString(),
    },
    {
      label: "Average Quotation Value",
      value: Math.round(reportData.quotation.avgValue).toLocaleString(),
    },
    {
      label: "Conversion Rate",
      value: reportData.quotation.conversionRate.toFixed(2) + "%",
    },
    {
      label: "Average Time to Conversion (days)",
      value:
        reportData.quotation.avgTimeToConversion !== null
          ? reportData.quotation.avgTimeToConversion.toFixed(2)
          : "Not Available",
    },
  ];
  drawWideLeftTable(doc, quotationSummaryRows, "Metric", "Value");
  doc.moveDown(1.2);

  // Render type/count tables using wide-left table style
  const quotationTypeTables = [
    {
      data: reportData.quotation.sourceCounts,
      label: "Source Count",
      col1: "Source",
      col2: "Count",
    },
    {
      data: reportData.quotation.platformCounts,
      label: "Platform Count",
      col1: "Platform",
      col2: "Count",
    },
    {
      data: reportData.quotation.customerTypeCounts,
      label: "Customer Type Count",
      col1: "Customer Type",
      col2: "Count",
    },
    {
      data: reportData.quotation.statusCounts,
      label: "Status Count",
      col1: "Status",
      col2: "Count",
    },
    {
      data: reportData.quotation.reqVehicles,
      label: "Vehicle Count",
      col1: "Vehicle",
      col2: "Count",
    },
    {
      data: reportData.quotation.reqTypes,
      label: "Type Count",
      col1: "Type",
      col2: "Count",
    },
  ];
  quotationTypeTables.forEach(({ data, label, col1, col2 }) => {
    if (data && Object.keys(data).length > 0) {
      doc.moveDown(1.0);
      doc
        .font("Lato-Bold")
        .fontSize(11)
        .text(label, leftMargin, doc.y, {
          width: insideWidth(doc),
          align: "center",
        });
      doc.moveDown(0.3);
      const rows = Object.entries(data).map(([k, v]) => ({
        label: k,
        value: v,
      }));
      drawWideLeftTable(doc, rows, col1, col2);
      doc.moveDown(0.7);
    }
  });

  // --- Claims Section ---
  ensureSpace(doc, 100);
  printSectionTitle("Claims Metrics");
  // Render summary metrics as a wide-left table
  const claimsSummaryRows = [
    { label: "Total Claims Submitted", value: reportData.claims.totalClaims },
    {
      label: "Average Time to Resolve (days)",
      value:
        reportData.claims.avgResolveDays !== null
          ? reportData.claims.avgResolveDays.toFixed(2)
          : "Not Available",
    },
    {
      label: "Claims Conversion Rate (per policy)",
      value: reportData.claims.conversionRate.toFixed(2) + "%",
    },
    {
      label: "Average Files/Documents per Claim",
      value: reportData.claims.avgFilesPerClaim.toFixed(2),
    },
    {
      label: "Claims Missing Required Docs",
      value: reportData.claims.claimsWithMissingDocs,
    },
  ];
  drawWideLeftTable(doc, claimsSummaryRows, "Metric", "Value");
  doc.moveDown(1.2);

  // Render type/count tables using wide-left table style
  const claimsTypeTables = [
    {
      data: reportData.claims.statusCounts,
      label: "Status Count",
      col1: "Status",
      col2: "Count",
    },
    {
      data: reportData.claims.insuranceTypeCounts,
      label: "Type Count",
      col1: "Type",
      col2: "Count",
    },
    {
      data: reportData.claims.vehicleCounts,
      label: "Vehicle Count",
      col1: "Vehicle",
      col2: "Count",
    },
    {
      data: reportData.claims.insurerNameCounts,
      label: "Insurer Name Count",
      col1: "Insurer Name",
      col2: "Count",
    },
    {
      data: reportData.claims.reasonCounts,
      label: "Reason Count",
      col1: "Reason",
      col2: "Count",
    },
    {
      data: reportData.claims.claimsPerCustomer,
      label: "Claims Per Customer",
      col1: "Customer",
      col2: "Count",
    },
    {
      data: reportData.claims.claimsPerPolicy,
      label: "Claims Per Policy",
      col1: "Policy",
      col2: "Count",
    },
    {
      data: reportData.claims.accidentTypeCounts,
      label: "Accident Type Count",
      col1: "Accident Type",
      col2: "Count",
    },
  ];
  claimsTypeTables.forEach(({ data, label, col1, col2 }) => {
    if (data && Object.keys(data).length > 0) {
      doc.moveDown(1.0);
      doc
        .font("Lato-Bold")
        .fontSize(11)
        .text(label, leftMargin, doc.y, {
          width: insideWidth(doc),
          align: "center",
        });
      doc.moveDown(0.3);
      const rows = Object.entries(data).map(([k, v]) => ({
        label: k,
        value: v,
      }));
      drawWideLeftTable(doc, rows, col1, col2);
      doc.moveDown(0.7);
    }
  });

  // Raw Data (Summary) section removed as requested.

  /**
   * Recursively prints a nested key-value list for summary data.
   * @param {Object} data - The data object to print.
   * @param {number} [indent=0] - Indentation level for nested objects.
   */
  function printKeyValueList(data, indent = 0) {
    const indentStr = " ".repeat(indent * 2);
    const entries = Object.entries(data);
    const isFlat = entries.every(
      ([_, v]) => typeof v !== "object" || v === null
    );
    if (isFlat) {
      // Find max key length for padding
      const maxKeyLen = Math.max(...entries.map(([key]) => key.length));
      doc.font("Lato-Bold").fontSize(11);
      entries.forEach(([key, value]) => {
        const line = indentStr + key.padEnd(maxKeyLen + 2, " ") + String(value);
        doc.text(line, leftMargin + 20, doc.y, { width: insideWidth(doc) });
      });
      doc.moveDown(0.5);
    } else {
      for (const [key, value] of entries) {
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          key.match(/Counts?$/i) &&
          Object.values(value).every((v) => typeof v === "number")
        ) {
          // Print label in one line, then aligned table below
          doc.font("Lato-Bold").fontSize(11).text(`${indentStr}${key}:`);
          // Table header
          const subEntries = Object.entries(value);
          const maxKeyLen = Math.max(...subEntries.map(([k]) => k.length), 8);
          const header =
            indentStr + "  " + "Name".padEnd(maxKeyLen + 2, " ") + "Count";
          doc
            .font("Lato-Bold")
            .fontSize(10)
            .text(header, leftMargin + 20, doc.y, { width: insideWidth(doc) });
          // Table rows
          doc.font("Lato").fontSize(10);
          subEntries.forEach(([k, v]) => {
            const line = indentStr + "  " + k.padEnd(maxKeyLen + 2, " ") + v;
            doc.text(line, leftMargin + 20, doc.y, { width: insideWidth(doc) });
          });
          doc.moveDown(0.5);
        } else if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          doc.font("Lato-Bold").fontSize(11).text(`${indentStr}${key}:`);
          printKeyValueList(value, indent + 1);
        } else if (Array.isArray(value)) {
          doc.font("Helvetica-Bold").fontSize(11).text(`${indentStr}${key}:`);
          value.slice(0, 10).forEach((item, idx) => {
            if (typeof item === "object" && item !== null) {
              doc.font("Lato").fontSize(10).text(`${indentStr}  -`);
              printKeyValueList(item, indent + 2);
            } else {
              doc.font("Lato").fontSize(10).text(`${indentStr}  - ${item}`);
            }
          });
          if (value.length > 10) {
            doc
              .font("Lato-Light")
              .fontSize(10)
              .text(`${indentStr}  ...and ${value.length - 10} more`);
          }
        } else {
          doc.font("Lato").fontSize(10).text(`${indentStr}${key}: ${value}`);
        }
      }
      doc.moveDown(0.5);
    }
  }

  /**
   * Prints a section summary with a title and key-value list, styled and centered.
   * @param {string} title - The summary section title.
   * @param {Object} data - The summary data object.
   */
  function printSectionSummary(title, data) {
    // Draw upper division line
    drawLine(doc, doc.y);
    doc.moveDown(0.1);
    doc
      .fontSize(11)
      .font("Lato-Bold")
      .fillColor("#003366")
      .text(title, leftMargin + 20, doc.y, {
        align: "center",
        width: insideWidth(doc) - 20,
      });
    // Draw lower division line
    drawLine(doc, doc.y + 2);
    doc.moveDown(0.2);
    doc.fontSize(9).font("Lato").fillColor("black");
    printKeyValueList(data);
    doc.moveDown(0.8);
  }

  // Footer with page numbers and date/time (fix: use correct buffered page range)
  // Removed page number/footer rendering as requested

  doc.end();
}

// ---------- Unified Full Report Entry Point ----------
/**
 * Generates the full business report, prints to CLI, and exports to PDF.
 * @param {Array} insurances - Insurance records.
 * @param {Array} quotations - Quotation records.
 * @param {Array} claims - Claim records.
 * @param {string|Date} startDate - Start date.
 * @param {string|Date} endDate - End date.
 * @returns {Object} The aggregated report data.
 */
function generateFullReport(
  insurances,
  quotations,
  claims,
  startDate,
  endDate
) {
  console.clear();
  console.log(chalk.bold("\n===== FULL BUSINESS REPORT =====\n"));

  // Aggregate raw data from all sections
  const insuranceData = generateInsuranceSection(
    insurances,
    startDate,
    endDate,
    true
  );
  const quotationData = generateQuotationSection(
    quotations,
    insurances,
    startDate,
    endDate,
    true
  );
  const claimsData = generateClaimsSection(
    claims,
    insurances,
    startDate,
    endDate,
    true
  );

  // For CLI output, if needed
  generateInsuranceSection(insurances, startDate, endDate);
  generateQuotationSection(quotations, insurances, startDate, endDate);
  generateClaimsSection(claims, insurances, startDate, endDate);

  // Aggregate report object
  const reportData = {
    insurance: insuranceData,
    quotation: quotationData,
    claims: claimsData,
  };

  // Export to PDF
  exportReportToPDF(reportData, "Full_Report.pdf");

  console.log(chalk.bold("\n===== END OF REPORT =====\n"));

  return reportData;
}

// ---------- Module Exports ----------

/**
 * Generates the full business report, prints to CLI, and exports to PDF.
 * This is the main entry point for generating the business report.
 *
 * @function generateFullReport
 * @param {Array<Object>} insurances - Array of insurance policy records.
 * @param {Array<Object>} quotations - Array of quotation records.
 * @param {Array<Object>} claims - Array of claim records.
 * @param {string|Date} startDate - Start date for the report (inclusive).
 * @param {string|Date} endDate - End date for the report (inclusive).
 * @returns {Object} Aggregated report data for all sections.
 *
 * @example
 * const { generateFullReport } = require('./fullReport');
 * generateFullReport(insurances, quotations, claims, '2024-01-01', '2024-12-31');
 */

/**
 * Exports the full business report to a PDF file, including header, sections, and layout.
 *
 * @function exportReportToPDF
 * @param {Object} reportData - The aggregated report data (from generateFullReport).
 * @param {string} filePath - The output PDF file path.
 *
 * @example
 * const { exportReportToPDF } = require('./fullReport');
 * exportReportToPDF(reportData, 'Full_Report.pdf');
 */

/**
 * Generates insurance policy metrics and prints or returns them.
 *
 * @function generateInsuranceSection
 * @param {Array<Object>} insurances - Array of insurance policy records.
 * @param {string|Date} startDate - Start date for filtering (inclusive).
 * @param {string|Date} endDate - End date for filtering (inclusive).
 * @param {boolean} [isRaw=false] - If true, returns raw data instead of printing.
 * @returns {Object|undefined} Metrics object if isRaw is true, otherwise undefined.
 */

/**
 * Generates quotation metrics and prints or returns them.
 *
 * @function generateQuotationSection
 * @param {Array<Object>} quotations - Array of quotation records.
 * @param {Array<Object>} policies - Array of policy records (for conversion rate).
 * @param {string|Date} startDate - Start date for filtering (inclusive).
 * @param {string|Date} endDate - End date for filtering (inclusive).
 * @param {boolean} [isRaw=false] - If true, returns raw data instead of printing.
 * @returns {Object|undefined} Metrics object if isRaw is true, otherwise undefined.
 */

/**
 * Generates claims metrics and prints or returns them.
 *
 * @function generateClaimsSection
 * @param {Array<Object>} claims - Array of claim records.
 * @param {Array<Object>} policies - Array of policy records (for conversion rate).
 * @param {string|Date} startDate - Start date for filtering (inclusive).
 * @param {string|Date} endDate - End date for filtering (inclusive).
 * @param {boolean} [isRaw=false] - If true, returns raw data instead of printing.
 * @returns {Object|undefined} Metrics object if isRaw is true, otherwise undefined.
 */

module.exports = {
  /**
   * Main entry point for generating the full business report.
   * @see generateFullReport
   */
  generateFullReport,
  /**
   * Export the aggregated report data to a PDF file.
   * @see exportReportToPDF
   */
  exportReportToPDF,
  /**
   * Generate insurance policy metrics for a given date range.
   * @see generateInsuranceSection
   */
  generateInsuranceSection,
  /**
   * Generate quotation metrics for a given date range.
   * @see generateQuotationSection
   */
  generateQuotationSection,
  /**
   * Generate claims metrics for a given date range.
   * @see generateClaimsSection
   */
  generateClaimsSection,
};
