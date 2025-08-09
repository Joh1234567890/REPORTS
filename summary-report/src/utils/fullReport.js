// utils/fullReport.js
// ---------- Imports ----------
const dayjs = require("dayjs");
const isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(isBetween);
const chalk = require("chalk");
const Table = require("cli-table3");
const PDFDocument = require("pdfkit");
const fs = require("fs");

// ---------- Utility Functions ----------
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

// ---------- Insurance Policy Metrics ----------
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

// ---------- PDF Export ----------
/**
 * Exports the full business report to a PDF file.
 * @param {Object} reportData - The aggregated report data.
 * @param {string} filePath - The output PDF file path.
 */
function exportReportToPDF(reportData, filePath) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(fs.createWriteStream(filePath));

  // Header with company info (replace logo path if you have one)
  // Uncomment and adjust if you have a logo image file
  // doc.image("path/to/logo.png", 40, 30, { width: 100 });
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("The Heritage Insurance Company Tanzania Limited", 40, 50);
  doc
    .fontSize(9)
    .font("Helvetica")
    .text("4th Floor, Bains Avenue, Masaki Ikon", 40, 65);
  doc.text("P.O. Box 7390 Dar es Salaam, Tanzania", 40, 80);
  doc.text("info@heritageinsurance.co.tz | +255 222 602 984", 40, 95);

  doc.moveDown(2);

  // Main Title
  doc
    .fontSize(17)
    .font("Helvetica-Bold")
    .fillColor("#003366")
    .text("Full Business Report", { align: "center" });
  doc.moveDown(1.5);

  // Section title helper
  function printSectionTitle(title) {
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#003366").text(title);
    doc.moveDown(0.3);
    const startX = doc.x;
    const width =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const y = doc.y;
    doc
      .strokeColor("#003366")
      .lineWidth(1.5)
      .moveTo(startX, y)
      .lineTo(startX + width, y)
      .stroke();
    doc.moveDown(0.8);
    doc.fillColor("black").font("Helvetica");
  }

  // Key-value table helper
  function printKeyValueTable(data, col1Label = "Category", maxRows = 20) {
    const entries = Object.entries(data).slice(0, maxRows);
    // Find max key length for padding
    const maxKeyLen = Math.max(
      ...entries.map(([key]) => key.length),
      col1Label.length
    );
    // Header row
    doc.font("Courier-Bold");
    const header = col1Label.padEnd(maxKeyLen + 2, " ") + "Count";
    doc.text(header);
    doc.moveDown(0.2);
    // Data rows
    doc.font("Courier");
    entries.forEach(([key, val]) => {
      const line = key.padEnd(maxKeyLen + 2, " ") + val.toString();
      doc.text(line);
    });
    doc.moveDown(1);
  }

  // --- Insurance Section ---
  printSectionTitle("Insurance Policy Metrics");
  doc.fontSize(11);
  doc.text(`Total Policies Issued: ${reportData.insurance.totalPolicies}`);
  doc.text(
    `Total Premiums Collected: ${reportData.insurance.totalPremium.toLocaleString()}`
  );
  doc.text(
    `Total VAT Collected: ${reportData.insurance.totalVAT.toLocaleString()}`
  );
  doc.moveDown();

  printKeyValueTable(reportData.insurance.insuranceTypeCounts, "Type");
  printKeyValueTable(reportData.insurance.policyStatusCounts, "Status");
  printKeyValueTable(reportData.insurance.platformCounts, "Platform");
  printKeyValueTable(
    reportData.insurance.paymentMethodCounts,
    "Payment Method"
  );
  printKeyValueTable(reportData.insurance.customerTypeCounts, "Customer Type");
  printKeyValueTable(reportData.insurance.insurerNameCounts, "Insurer Name");

  // --- Quotation Section ---
  printSectionTitle("Quotation Metrics");
  doc.fontSize(11);
  doc.text(
    `Total Quotations Generated: ${reportData.quotation.totalQuotations}`
  );
  doc.text(
    `Total Quotation Amount: ${reportData.quotation.totalValue.toLocaleString()}`
  );
  doc.text(
    `Average Quotation Value: ${Math.round(
      reportData.quotation.avgValue
    ).toLocaleString()}`
  );
  doc.text(
    `Conversion Rate: ${reportData.quotation.conversionRate.toFixed(2)}%`
  );
  if (reportData.quotation.avgTimeToConversion !== null) {
    doc.text(
      `Average Time to Conversion (days): ${reportData.quotation.avgTimeToConversion.toFixed(
        2
      )}`
    );
  } else {
    doc.text("Average Time to Conversion (days): Not Available");
  }
  doc.moveDown();

  printKeyValueTable(reportData.quotation.sourceCounts, "Source");
  printKeyValueTable(reportData.quotation.platformCounts, "Platform");
  printKeyValueTable(reportData.quotation.customerTypeCounts, "Customer Type");
  printKeyValueTable(reportData.quotation.statusCounts, "Status");
  printKeyValueTable(reportData.quotation.reqVehicles, "Vehicle");
  printKeyValueTable(reportData.quotation.reqTypes, "Type");

  // --- Claims Section ---
  printSectionTitle("Claims Metrics");
  doc.fontSize(11);
  doc.text(`Total Claims Submitted: ${reportData.claims.totalClaims}`);
  if (reportData.claims.avgResolveDays !== null) {
    doc.text(
      `Average Time to Resolve (days): ${reportData.claims.avgResolveDays.toFixed(
        2
      )}`
    );
  } else {
    doc.text("Average Time to Resolve (days): Not Available");
  }
  doc.text(
    `Claims Conversion Rate (per policy): ${reportData.claims.conversionRate.toFixed(
      2
    )}%`
  );
  doc.text(
    `Average Files/Documents per Claim: ${reportData.claims.avgFilesPerClaim.toFixed(
      2
    )}`
  );
  doc.text(
    `Claims Missing Required Docs: ${reportData.claims.claimsWithMissingDocs}`
  );
  doc.moveDown();

  printKeyValueTable(reportData.claims.statusCounts, "Status");
  printKeyValueTable(reportData.claims.insuranceTypeCounts, "Type");
  printKeyValueTable(reportData.claims.vehicleCounts, "Vehicle");
  printKeyValueTable(reportData.claims.insurerNameCounts, "Insurer Name");
  printKeyValueTable(reportData.claims.reasonCounts, "Reason");
  printKeyValueTable(reportData.claims.claimsPerCustomer, "Customer");
  printKeyValueTable(reportData.claims.claimsPerPolicy, "Policy");
  printKeyValueTable(reportData.claims.accidentTypeCounts, "Accident Type");

  // --- Human-Readable Raw Data Section ---
  doc.addPage();
  doc
    .fontSize(15)
    .font("Helvetica-Bold")
    .fillColor("#003366")
    .text("Raw Data (Summary)");
  doc.moveDown(0.5);

  function printKeyValueList(data, indent = 0) {
    const indentStr = " ".repeat(indent * 2);
    const entries = Object.entries(data);
    const isFlat = entries.every(
      ([_, v]) => typeof v !== "object" || v === null
    );
    if (isFlat) {
      // Find max key length for padding
      const maxKeyLen = Math.max(...entries.map(([key]) => key.length));
      doc.font("Courier-Bold").fontSize(11);
      entries.forEach(([key, value]) => {
        const line = indentStr + key.padEnd(maxKeyLen + 2, " ") + String(value);
        doc.text(line);
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
          doc.font("Courier-Bold").fontSize(11).text(`${indentStr}${key}:`);
          // Table header
          const subEntries = Object.entries(value);
          const maxKeyLen = Math.max(...subEntries.map(([k]) => k.length), 8);
          const header =
            indentStr + "  " + "Name".padEnd(maxKeyLen + 2, " ") + "Count";
          doc.font("Courier-Bold").fontSize(10).text(header);
          // Table rows
          doc.font("Courier").fontSize(10);
          subEntries.forEach(([k, v]) => {
            const line = indentStr + "  " + k.padEnd(maxKeyLen + 2, " ") + v;
            doc.text(line);
          });
          doc.moveDown(0.5);
        } else if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          doc.font("Helvetica-Bold").fontSize(11).text(`${indentStr}${key}:`);
          printKeyValueList(value, indent + 1);
        } else if (Array.isArray(value)) {
          doc.font("Helvetica-Bold").fontSize(11).text(`${indentStr}${key}:`);
          value.slice(0, 10).forEach((item, idx) => {
            if (typeof item === "object" && item !== null) {
              doc.font("Helvetica").fontSize(10).text(`${indentStr}  -`);
              printKeyValueList(item, indent + 2);
            } else {
              doc
                .font("Helvetica")
                .fontSize(10)
                .text(`${indentStr}  - ${item}`);
            }
          });
          if (value.length > 10) {
            doc
              .font("Helvetica-Oblique")
              .fontSize(10)
              .text(`${indentStr}  ...and ${value.length - 10} more`);
          }
        } else {
          doc
            .font("Helvetica")
            .fontSize(10)
            .text(`${indentStr}${key}: ${value}`);
        }
      }
      doc.moveDown(0.5);
    }
  }

  function printSectionSummary(title, data) {
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#003366").text(title);
    doc.moveDown(0.2);
    doc.fontSize(9).font("Helvetica").fillColor("black");
    printKeyValueList(data);
    doc.moveDown(0.8);
  }

  printSectionSummary("Insurance Data Summary", reportData.insurance);
  printSectionSummary("Quotation Data Summary", reportData.quotation);
  printSectionSummary("Claims Data Summary", reportData.claims);

  // Footer with page numbers and date/time (fix: use correct buffered page range)
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(7)
      .fillColor("gray")
      .text(
        `Page ${i + 1} of ${range.count}`,
        doc.page.width - doc.page.margins.right - 100,
        doc.page.height - 30,
        { align: "right" }
      );
    const currentDate = new Date().toLocaleString();
    doc.text(
      `Generated: ${currentDate}`,
      doc.page.margins.left,
      doc.page.height - 30,
      {
        align: "left",
      }
    );
  }

  doc.end();
}

// ---------- Unified Full Report ----------
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
module.exports = {
  generateFullReport,
  exportReportToPDF,
  generateInsuranceSection,
  generateQuotationSection,
  generateClaimsSection,
};
