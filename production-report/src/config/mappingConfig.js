/**
 * General mapping configuration for insurance data export.
 * Each object in the array defines a field to be exported, with a label for Excel and the key path in the data.
 * Dot notation is used for nested fields. MongoDB special fields like $oid and $date are supported.
 */
// mappingConfig.js
// Define all keys you want to export, along with their human-friendly labels.
// Nested keys use dot notation, including MongoDB special fields ($oid, $date).

module.exports = [
  { label: "Policy ID", key: "_id.$oid" },
  { label: "Insured Name", key: "insuredName" },
  { label: "Address", key: "address" },
  { label: "Insurer Name", key: "insurerName" },
  { label: "Policy Start Date", key: "startDate.$date" },
  { label: "Policy End Date", key: "endDate.$date" },
  { label: "Insurance Label", key: "insuranceLabel" },
  { label: "Is Comprehensive", key: "isComprehensive" },
  { label: "Seats", key: "seats" },
  {
    label: "Vehicle Registration Number",
    key: "vehicleInfo.registrationNumber",
  },
  { label: "Vehicle Owner", key: "vehicleInfo.ownerName" },
  { label: "Vehicle Make", key: "vehicleInfo.make" },
  { label: "Vehicle Model", key: "vehicleInfo.model" },
  { label: "Payment Total", key: "total" },
  { label: "Payment Reference", key: "paymentReference" },
  { label: "Transaction ZNumber", key: "transactionData.ZNumber" },
];
