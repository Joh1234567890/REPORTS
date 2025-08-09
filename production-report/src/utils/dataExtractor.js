/**
 * Utility functions for extracting values from nested objects.
 * Handles dot notation and MongoDB special fields for robust data access.
 */
// dataExtractor.js
// Extract nested values safely including MongoDB ObjectID and Date special fields

function getValueByPath(obj, path) {
  if (!obj || !path) return "";

  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current == null) return "";

    if (typeof current === "object") {
      // Special MongoDB _id or dates
      if (current.hasOwnProperty("$oid")) {
        current = current.$oid;
        if (part !== "$oid") return "";
      } else if (current.hasOwnProperty("$date")) {
        current = current.$date;
        if (part !== "$date") return "";
      } else {
        current = current[part];
      }
    } else {
      return "";
    }
  }

  if (typeof current === "object" && current !== null) {
    return JSON.stringify(current);
  }

  return current != null ? String(current) : "";
}

module.exports = { getValueByPath };
