// utils/insuranceStats.js
const dayjs = require("dayjs");
const isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(isBetween);

const Table = require("cli-table3");

/** Helper: Get nested value safely */
function getPath(obj, path) {
  return path.split(".").reduce((acc, cur) => acc && acc[cur], obj);
}

/** Filter by date range */
function filterByDateRange(records, start, end, dateField = "createdAt.$date") {
  return records.filter((rec) => {
    const dateStr = getPath(rec, dateField);
    return dateStr && dayjs(dateStr).isBetween(start, end, null, "[]");
  });
}

/** Count by field */
function countByField(records, fieldPath) {
  const counts = {};
  records.forEach((r) => {
    const key = getPath(r, fieldPath);
    if (key) counts[key] = (counts[key] || 0) + 1;
  });

  // 1. Total Policies Issued
  const totalPolicies = filtered.length;
  console.log(`Total Policies Issued: ${totalPolicies}`);

  // 2. Breakdown by Insurance Type
  const insuranceTypeCounts = countByField(filtered, "insuranceLabel");
  printTable("Insurance Types", insuranceTypeCounts);

  // 3. Total Premiums Collected
  const totalPremium = sumByField(filtered, "premium");
  console.log(`Total Premiums Collected: ${totalPremium.toLocaleString()}`);

  // 4. Total VAT Collected
  const totalVAT = sumByField(filtered, "vat");
  console.log(`Total VAT Collected: ${totalVAT.toLocaleString()}`);

  // 5. Breakdown by Policy Status
  const statusCounts = countByField(filtered, "status");
  printTable("Policy Status", statusCounts);

  // 6. Comprehensive vs Third-Party
  const compCount = filtered.filter((r) => r.isComprehensive).length;
  const thirdCount = totalPolicies - compCount;
  console.log(
    `Comprehensive: ${compCount} (${(
      (compCount / totalPolicies) * 100 || 0
    ).toFixed(2)}%)`
  );
  console.log(
    `Third-Party: ${thirdCount} (${(
      (thirdCount / totalPolicies) * 100 || 0
    ).toFixed(2)}%)`
  );

  // 7. Distribution by Platform
  const platformCounts = countByField(filtered, "platform");
  printTable("Platforms", platformCounts);

  // 8. Policies by Payment Method
  const paymentCounts = countByField(filtered, "paymentMethod");
  printTable("Payment Methods", paymentCounts);

  // 9. Top Vehicles
  console.log("\nTop Vehicles Insured:");
  topVehicles(filtered, 5).forEach(([veh, count]) => {
    console.log(`- ${veh} : ${count}`);
  });

  // 10. Policies by Customer Type
  const custTypeCounts = countByField(filtered, "customerType");
  printTable("Customer Types", custTypeCounts);

  // 11. Policies by Insurer Name
  const insurerCounts = countByField(filtered, "insurerName");
  printTable("Insurer Names", insurerCounts);

  // 12. Peak Issuance Hours/Days
  const { hourCount, dayCount } = peakTimeAnalysis(filtered);
  printTable("Peak Hours", hourCount);
  printTable("Peak Days", dayCount);

  // 13. Amount Due vs Amount Paid
  let totalDue = sumByField(filtered, "dueNow");
  let totalPaid = sumByField(filtered, "total");
  console.log(`Total Amount Paid: ${totalPaid.toLocaleString()}`);
  console.log(`Total Amount Due: ${totalDue.toLocaleString()}`);

  return {
    totalPolicies,
    insuranceTypeCounts,
    totalPremium,
    totalVAT,
    statusCounts,
    compCount,
    thirdCount,
    platformCounts,
    paymentCounts,
    topVehicles: topVehicles(filtered),
    custTypeCounts,
    insurerCounts,
    hourCount,
    dayCount,
    totalPaid,
    totalDue,
  };
}

module.exports = { generateInsuranceStats };
