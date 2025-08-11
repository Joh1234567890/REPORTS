// Company and configuration constants
const companyName = "HERITAGE INSURANCE COMPANY LTD";
const companyAddress = "4th Floor, Bains Avenue, Masaki Ikon";
const companyBox = "P.O.Box 7390 Dar Es Salaam, Tanzania";
const companyEmail = "info@heritageinsurance.co.tz";
const companyPhoneNumber = "+255 222 602 984";

// Logo configuration
const logoPath = "./Logo.png";
const coverNoteLogoLeftOffset = 30;
const coverNoteLogoTopOffset = 0;
const coverNoteLogoSize = 100;

// URLs and platform settings
const webPlatformURL = "https://example.com";

// Tax information
const tinNumber = "100 738 031";
const vrnNumber = "100 168 38A";
const taxOffice = "LARGE TAXPAYER";
const zBrnNumber = "Z025350886";
const zVrnNumber = "070 015 35S";
const vfdSerial = "10TZ100438";

// Layout constants
const leftMargin = 20;
const rightMargin = 20;
// const innerLeftMargin = leftMargin + 5; // Removed, use leftMargin + 20 directly
const blockSpacing = 20;

// Receipt specific constants
const receiptFontSizes = {
  small: 9,
  normal: 10,
  medium: 12,
  title: 16,
};

const receiptSpacing = {
  minimal: 5,
  small: 8,
  normal: 10,
  medium: 15,
  large: 18,
  extraLarge: 25,
  headerBelow: 33,
};

const riskStickerConfig = {
  boxWidth: 180,
  boxHeight: 22,
  spacing: 30,
  leftOffset: 12,
  labelSpacing: 8,
};

const tableConfig = {
  columns: 6,
  textPadding: 5,
  minCellHeight: 14,
  verticalPadding: 5,
};

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
