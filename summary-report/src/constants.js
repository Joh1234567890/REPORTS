/**
 * @fileoverview
 * Centralized constants and configuration for business report generation.
 * Update these values to reflect your company branding, layout, and tax info.
 * All layout and branding settings should be changed here for consistency.
 */

/**
 * Company name for branding and headers.
 * @type {string}
 */
const companyName = "HERITAGE INSURANCE COMPANY LTD";

/**
 * Company address for headers and contact info.
 * @type {string}
 */
const companyAddress = "4th Floor, Bains Avenue, Masaki Ikon";

/**
 * Company postal box for headers and contact info.
 * @type {string}
 */
const companyBox = "P.O.Box 7390 Dar Es Salaam, Tanzania";

/**
 * Company email address for contact info.
 * @type {string}
 */
const companyEmail = "info@heritageinsurance.co.tz";

/**
 * Company phone number for contact info.
 * @type {string}
 */
const companyPhoneNumber = "+255 222 602 984";

/**
 * Path to the company logo image (relative to project root).
 * @type {string}
 */
const logoPath = "./Logo.png";

/**
 * Logo left offset (px) for PDF layout.
 * @type {number}
 */
const coverNoteLogoLeftOffset = 30;

/**
 * Logo top offset (px) for PDF layout.
 * @type {number}
 */
const coverNoteLogoTopOffset = 0;

/**
 * Logo display size (px) for PDF layout.
 * @type {number}
 */
const coverNoteLogoSize = 100;

/**
 * Web platform URL for reference in reports.
 * @type {string}
 */
const webPlatformURL = "https://example.com";

/**
 * Tax Identification Number (TIN).
 * @type {string}
 */
const tinNumber = "100 738 031";

/**
 * VAT Registration Number (VRN).
 * @type {string}
 */
const vrnNumber = "100 168 38A";

/**
 * Tax office name for compliance.
 * @type {string}
 */
const taxOffice = "LARGE TAXPAYER";

/**
 * Zanzibar Business Registration Number (ZBRN).
 * @type {string}
 */
const zBrnNumber = "Z025350886";

/**
 * Zanzibar VAT Registration Number (ZVRN).
 * @type {string}
 */
const zVrnNumber = "070 015 35S";

/**
 * VFD serial number for tax receipts.
 * @type {string}
 */
const vfdSerial = "10TZ100438";

/**
 * Left margin for all PDF pages (px).
 * @type {number}
 */
const leftMargin = 20;

/**
 * Right margin for all PDF pages (px).
 * @type {number}
 */
const rightMargin = 20;

// const innerLeftMargin = leftMargin + 5; // Removed, use leftMargin + 20 directly

/**
 * Vertical spacing between blocks/sections (px).
 * @type {number}
 */
const blockSpacing = 20;

/**
 * Font sizes for receipts and reports.
 * @type {{small: number, normal: number, medium: number, title: number}}
 */
const receiptFontSizes = {
  small: 9,
  normal: 10,
  medium: 12,
  title: 16,
};

/**
 * Spacing values for receipt/report layout.
 * @type {{minimal: number, small: number, normal: number, medium: number, large: number, extraLarge: number, headerBelow: number}}
 */
const receiptSpacing = {
  minimal: 5,
  small: 8,
  normal: 10,
  medium: 15,
  large: 18,
  extraLarge: 25,
  headerBelow: 33,
};

/**
 * Risk sticker layout configuration for insurance documents.
 * @type {{boxWidth: number, boxHeight: number, spacing: number, leftOffset: number, labelSpacing: number}}
 */
const riskStickerConfig = {
  boxWidth: 180,
  boxHeight: 22,
  spacing: 30,
  leftOffset: 12,
  labelSpacing: 8,
};

/**
 * Table layout configuration for summary/breakdown tables.
 * @type {{columns: number, textPadding: number, minCellHeight: number, verticalPadding: number}}
 */
const tableConfig = {
  columns: 6,
  textPadding: 5,
  minCellHeight: 14,
  verticalPadding: 5,
};

/**
 * Layout configuration for important blocks (e.g., notices).
 * @type {{leftPadding: number, titleSpacing: number, contentSpacing: number, bottomSpacing: number}}
 */
const importantBlockConfig = {
  leftPadding: 10,
  titleSpacing: 5,
  contentSpacing: 15,
  bottomSpacing: 25,
};

module.exports = {
  companyName,
  companyAddress,
  companyBox,
  companyEmail,
  companyPhoneNumber,
  logoPath,
  coverNoteLogoLeftOffset,
  coverNoteLogoTopOffset,
  coverNoteLogoSize,
  webPlatformURL,
  tinNumber,
  vrnNumber,
  taxOffice,
  zBrnNumber,
  zVrnNumber,
  vfdSerial,
  leftMargin,
  rightMargin,
  // innerLeftMargin, // Removed from export
  blockSpacing,
  receiptFontSizes,
  receiptSpacing,
  riskStickerConfig,
  tableConfig,
  importantBlockConfig,
};
