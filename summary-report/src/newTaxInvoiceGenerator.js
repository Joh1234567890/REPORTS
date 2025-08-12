/**
 * @fileoverview PDF Tax Invoice Generator
 *
 * This module generates professional PDF tax invoices for Heritage Insurance Company Ltd.
 * The generator creates structured invoices with company branding, QR codes, premium breakdowns,
 * and regulatory compliance features including TRA (Tanzania Revenue Authority) information.
 *
 * Key Features:
 * - Company header with logo and contact information
 * - Tax information table with TIN, VRN, and other tax details
 * - Insurance information table with policy and customer details
 * - Premium breakdown with VAT calculations and bold total
 * - Bank details section for payment information
 * - Important notices and regulatory compliance
 * - QR code for verification purposes
 * - TRA purposes section for audit compliance
 *
 * Architecture:
 * - Modular function design for maintainability
 * - Utility functions for calculations and positioning
 * - Table utilities for structured data presentation
 * - Configuration constants for easy customization
 * - Error handling for robust PDF generation
 *
 * @author Labedan IT Solutions
 * @version 1.0.0
 * @since 2025-08-01
 */

const fs = require("fs");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const toWords = require("./toWordsConfig");
const TIRAInsuranceData = require("./tiraData");
const {
  drawBorderedTable,
  createTaxInvoiceTableRows,
} = require("./tableUtils");
const {
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
  innerLeftMargin,
  blockSpacing,
  taxCalculationConfig,
  defaultBankInformation,
  traConfig,
  uiText,
  pdfMetadata,
} = require("./constants");

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Converts amount to words using the toWords converter
 * @param {Object} data - Tax invoice data containing amount
 * @returns {string} Amount in words format
 */
const amountInWords = (data) =>
  toWords.convert(data.amount, { currency: true, ignoreDecimal: true });

/**
 * Calculates the inside width of the document excluding margins
 * @param {PDFDocument} doc - The PDF document instance
 * @returns {number} The available width inside margins
 */
const insideWidth = (doc) => doc.page.width - (leftMargin + rightMargin + 10);

/**
 * Calculates the maximum height available on the page
 * @param {PDFDocument} doc - The PDF document instance
 * @returns {number} The maximum usable height
 */
const maxHeight = (doc) => doc.page.height - 60;

/**
 * Calculates the center position for logo placement
 * @param {PDFDocument} doc - The PDF document instance
 * @returns {number} The X coordinate for centered logo placement
 */
const logoCenter = (doc) => (doc.page.width - coverNoteLogoSize) / 2;

// ========================================
// MAIN PDF GENERATION FUNCTION
// ========================================

/**
 * Generates a PDF tax invoice document
 * @param {string} fileName - Name of the file to generate
 * @param {string} fullFileName - Full file name with path
 * @param {Object} data - Tax invoice data containing all necessary information
 * @param {boolean} uploadOnline - Whether to upload the file online (deprecated)
 * @returns {Promise} Promise that resolves when PDF is generated
 */
async function generateNewTaxInvoice(
  fileName,
  fullFileName,
  data,
  uploadOnline = false,
  qrCodeUrl = traConfig.defaultQrCodeUrl
) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { left: leftMargin, right: rightMargin },
    bufferPages: true,
  });

  registerFonts(doc);

  // Set PDF document metadata for proper identification and searchability
  doc.info.Title = `Tax Invoice ${data.invoiceNumber}`;
  doc.info.Author = companyName;
  doc.info.Subject = pdfMetadata.subject;
  doc.info.Keywords = pdfMetadata.keywords;
  doc.info.ModDate = new Date();
  doc.info.Creator = pdfMetadata.creator;
  doc.info.Producer = pdfMetadata.producer;

  const localPath = "./src/assets/" + fileName;
  const chunks = [];

  // Collect PDF data in memory for processing
  doc.on("data", (chunk) => chunks.push(chunk));

  const generationDateTime = new Date();

  // === DOCUMENT STRUCTURE GENERATION ===
  // Build the tax invoice document in logical sections

  // Generate document header section
  let y = generateHeader(doc, data.invoiceNumber);

  // Create and render compact insurance information table (moved up by 15px total)
  y = generateInsuranceInformationTable(doc, data, y);

  // Add "PREMIUM PAYMENT DETAILS" heading - centered, bold, size 14
  doc.font("Title").fontSize(14);
  const headingText = uiText.premiumPaymentDetailsHeading;
  const headingWidth = doc.widthOfString(headingText);
  const pageWidth = doc.page.width;
  const centerX = (pageWidth - headingWidth) / 2;
  doc.text(headingText, centerX, y + 10);
  y += 30; // Add space after heading

  // Add premium breakdown section
  y = drawPremiumBreakdown(doc, data, y);

  // Add "BANK DETAILS" heading - centered, bold, size 14 (moved up 15px)
  doc.font("Title").fontSize(14);
  const bankHeadingText = uiText.bankDetailsHeading;
  const bankHeadingWidth = doc.widthOfString(bankHeadingText);
  const bankCenterX = (pageWidth - bankHeadingWidth) / 2;
  doc.text(bankHeadingText, bankCenterX, y + 5); // Reduced from y + 20 to y + 5 (15px up)
  y += 25; // Reduced space after heading (was 45, now 25 to get 5px gap)

  // Add bank information section
  y = drawBankInformation(doc, data, y);

  // Add important notice section (moved up 20px - from y + 5 to y - 15)
  y = drawImportantBlock(doc, data.importantNote, y - 15);

  // Add TRA purposes only section on the right side, below the important block division line
  drawTRAPurposesOnlySection(doc, data, y);

  // === FINAL TOUCHES AND VERIFICATION ===
  // Add branding, verification, and styling elements

  // Add QR code for verification
  await drawQRCodeAtBottomLeft(doc, qrCodeUrl, uiText.scanMeLabel);

  // Apply page styling and footer
  drawPageBorder(doc);
  addFooter(doc, generationDateTime, data.platform);

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", async () => {
      try {
        const pdfData = Buffer.concat(chunks);
        fs.writeFileSync(localPath, pdfData);
        console.log(`✅ PDF generated successfully: ${localPath}`);
        resolve();
      } catch (error) {
        console.error("❌ Error writing PDF file:", error);
        reject(error);
      }
    });

    doc.on("error", (err) => {
      console.error("❌ PDF generation error:", err);
      reject(err);
    });
  });
}

// ========================================
// DOCUMENT STRUCTURE GENERATION FUNCTIONS
// ========================================

/**
 * Generates tax information table using the same format as cover note generator
 * @param {PDFDocument} doc - The PDF document instance
 * @param {number} y - Y position to start drawing
 * @returns {number} The Y position after drawing the table
 */
/**
 * Generates the tax information table with Heritage Insurance tax details
 * Creates a structured table with tax labels and values in uniform cells
 * @param {PDFDocument} doc - The PDF document instance
 * @param {number} y - Y position to start drawing
 * @returns {number} The Y position after drawing the table
 */
function generateTaxInformationTable(doc, y) {
  let valueFromTop = y;

  // Draw top border line for the table
  drawLine(doc, valueFromTop);

  let beginningPoint = valueFromTop;
  valueFromTop += 8; // Adjusted spacing

  // Calculate the maximum height needed for both rows to ensure uniform cell heights
  const labelTexts = [
    uiText.taxTinNo,
    uiText.taxVrn,
    uiText.taxOfficeLabel,
    uiText.taxZBrnNo,
    uiText.taxZVrn,
    uiText.taxVfdSerial,
  ];
  const valueTexts = [
    tinNumber,
    vrnNumber,
    taxOffice,
    zBrnNumber,
    zVrnNumber,
    vfdSerial,
  ];

  const width = insideWidth(doc) / 6;
  const textWidth = width - 5;
  const minCellHeight = 14;

  // Calculate height for labels (with Title font) - Bold text typically needs more space
  doc.font("Title").fontSize(9);
  const labelHeight = Math.max(
    labelTexts.reduce((max, text) => {
      const height = doc.heightOfString(text, { width: textWidth });
      return height > max ? height : max;
    }, 0),
    minCellHeight
  );

  // Calculate height for values (with Normal font) - Regular text
  doc.font("Normal").fontSize(9);
  const valueHeight = Math.max(
    valueTexts.reduce((max, text) => {
      const height = doc.heightOfString(text, { width: textWidth });
      return height > max ? height : max;
    }, 0),
    minCellHeight
  );

  // Use the same height for both rows (the maximum of both) to ensure visual consistency
  const uniformCellHeight = Math.max(labelHeight, valueHeight);

  // First row: Field labels
  [valueFromTop, beginningPoint] = generateInformationLineWithFixedHeight(
    doc,
    labelTexts,
    valueFromTop,
    beginningPoint,
    "Title",
    uniformCellHeight,
    6 // 6 columns for tax table
  );

  // Second row: Field values
  [valueFromTop, beginningPoint] = generateInformationLineWithFixedHeight(
    doc,
    valueTexts,
    valueFromTop,
    beginningPoint,
    "Normal",
    uniformCellHeight,
    6 // 6 columns for tax table
  );

  return valueFromTop;
}

/**
 * Generates the insurance information as two side-by-side tables without grid lines
 * @param {PDFDocument} doc - The PDF document instance
 * @param {Object} data - Tax invoice data containing customer and policy information
 * @param {number} y - The Y position to start drawing
 * @returns {number} The Y position after drawing the tables
 */
function generateInsuranceInformationTable(doc, data, y) {
  let currentY = y + 15; // Start with some spacing
  const leftTableX = leftMargin + 40;
  const leftColonX = leftMargin + 110; // Fixed position for left table colons
  const leftValueX = leftMargin + 120;
  const rightTableX = leftMargin + 290;
  const rightColonX = leftMargin + 380; // Fixed position for right table colons
  const rightValueX = leftMargin + 390;
  const lineHeight = 18;

  // Set font for the tables
  doc.font("Title").fontSize(10);

  // Left table - First 5 items
  // Row 1: INSURED
  doc
    .text(uiText.insured, leftTableX, currentY)
    .text(":", leftColonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(data.customerName || "N/A", leftValueX, currentY);

  // Right table - Row 1: POLICY NO
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.policyNo, rightTableX, currentY)
    .text(":", rightColonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(data.policyNumber || "N/A", rightValueX, currentY);
  currentY += lineHeight;

  // Left table - Row 2: ADDRESS
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.address, leftTableX, currentY)
    .text(":", leftColonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(data.customerAddress || "N/A", leftValueX, currentY);

  // Right table - Row 2: COVER NOTE NO
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.coverNoteNo, rightTableX, currentY)
    .text(":", rightColonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(data.coverNoteNumber || "N/A", rightValueX, currentY);
  currentY += lineHeight;

  // Left table - Row 3: TIN No
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.tinNo, leftTableX, currentY)
    .text(":", leftColonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(data.customerTIN || "N/A", leftValueX, currentY);

  // Right table - Row 3: ISSUE DATE
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.issueDate, rightTableX, currentY)
    .text(":", rightColonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(data.issueDate || "N/A", rightValueX, currentY);
  currentY += lineHeight;

  // Left table - Row 4: INTERMEDIARY
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.intermediary, leftTableX, currentY)
    .text(":", leftColonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(data.intermediary || "N/A", leftValueX, currentY);

  // Right table - Row 4: EFFECTIVE DATE
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.effectiveDate, rightTableX, currentY)
    .text(":", rightColonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(data.effectiveDate || "N/A", rightValueX, currentY);
  currentY += lineHeight;

  // Left table - Row 5: CLASS
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.classLabel, leftTableX, currentY)
    .text(":", leftColonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(data.classOfInsurance || "N/A", leftValueX, currentY);

  // Right table - Row 5: PREMIUM (TZS)
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.premiumTzs, rightTableX, currentY)
    .text(":", rightColonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(`${data.amount.toLocaleString("en-US")}`, rightValueX, currentY);
  currentY += lineHeight;

  return currentY + 10; // Add some spacing after the tables
}

/**
 * Generates the tax information table in grid format
 * @param {PDFDocument} doc - The PDF document instance
 * @param {number} y - The Y position to start drawing
 * @returns {number} The Y position after drawing
 */
function generateTaxInformationTable(doc, y) {
  let valueFromTop = y;

  // Draw top border line for the table
  drawLine(doc, valueFromTop);

  let beginningPoint = valueFromTop;
  valueFromTop += 8; // Adjusted spacing

  // Tax information data for 6-column grid (including TIN No back)
  const labelTexts = [
    uiText.taxTinNo,
    uiText.taxVrn,
    uiText.taxOfficeLabel,
    uiText.taxZBrnNo,
    uiText.taxZVrn,
    uiText.taxVfdSerial,
  ];
  const valueTexts = [
    tinNumber,
    vrnNumber,
    taxOffice,
    zBrnNumber,
    zVrnNumber,
    vfdSerial,
  ];

  const width = insideWidth(doc) / 6;
  const textWidth = width - 5;
  const minCellHeight = 14;

  // Calculate height for labels (with Title font)
  doc.font("Title").fontSize(9);
  const labelHeight = Math.max(
    labelTexts.reduce((max, text) => {
      const height = doc.heightOfString(text, { width: textWidth });
      return height > max ? height : max;
    }, 0),
    minCellHeight
  );

  // Calculate height for values (with Normal font)
  doc.font("Normal").fontSize(9);
  const valueHeight = Math.max(
    valueTexts.reduce((max, text) => {
      const height = doc.heightOfString(text, { width: textWidth });
      return height > max ? height : max;
    }, 0),
    minCellHeight
  );

  const uniformCellHeight = Math.max(labelHeight, valueHeight);

  // First row: Tax labels
  [valueFromTop, beginningPoint] = generateInformationLineWithFixedHeight(
    doc,
    labelTexts,
    valueFromTop,
    beginningPoint,
    "Title",
    uniformCellHeight,
    6 // 6 columns for tax table
  );

  // Second row: Tax values
  [valueFromTop, beginningPoint] = generateInformationLineWithFixedHeight(
    doc,
    valueTexts,
    valueFromTop,
    beginningPoint,
    "Normal",
    uniformCellHeight,
    6 // 6 columns for tax table
  );

  return valueFromTop;
}

// ========================================
// PREMIUM AND BILLING FUNCTIONS
// ========================================

/**
 * Draws the premium breakdown section using grid format like insurance table
 * @param {PDFDocument} doc - The PDF document instance
 * @param {Object} data - Tax invoice data containing premium information
 * @param {number} y - Y position to start drawing
 * @returns {number} The Y position after drawing
 */
function drawPremiumBreakdown(doc, data, y) {
  let valueFromTop = y;

  // Draw top border line for the table
  drawLine(doc, valueFromTop);

  let beginningPoint = valueFromTop;
  valueFromTop += 8; // Adjusted spacing

  // Get vehicle type data from TIRA for calculations
  const vehicleType = data.vehicleType || "private_car";
  const tiraData =
    TIRAInsuranceData[vehicleType] || TIRAInsuranceData.private_car;

  // Calculate amounts
  const basePremium =
    data.basePremium || taxCalculationConfig.defaultBasePremium;
  const vatRate = data.vatRate || taxCalculationConfig.vatRate;
  const vatAmount = Math.round(basePremium * vatRate);
  const totalPremium = basePremium + vatAmount;

  // Premium breakdown data for 2-column grid

  const coverDescriptions = [
    uiText.premiumForMotor,
    uiText.premium,
    `VAT (${Math.round(vatRate * 100)}%)`,
    uiText.totalPremium,
  ];

  const premiumDetails = [
    data.classOfInsurance || taxCalculationConfig.defaultClassOfInsurance,
    `${basePremium.toLocaleString("en-US")}.00 TZS`,
    `${vatAmount.toLocaleString("en-US")}.00 TZS`,
    `${totalPremium.toLocaleString("en-US")}.00 TZS`,
  ];

  const width = insideWidth(doc) / 2; // 2 columns
  const textWidth = width - 5;
  const minCellHeight = 14;

  // Calculate height for descriptions (with Normal font)
  doc.font("Normal").fontSize(8);
  const descHeight = Math.max(
    coverDescriptions.reduce((max, text) => {
      const height = doc.heightOfString(text, { width: textWidth });
      return height > max ? height : max;
    }, 0),
    minCellHeight
  );

  // Calculate height for premium details (with Normal font)
  const premiumHeight = Math.max(
    premiumDetails.reduce((max, text) => {
      const height = doc.heightOfString(text, { width: textWidth });
      return height > max ? height : max;
    }, 0),
    minCellHeight
  );

  // Use the same height for both columns
  const uniformCellHeight = Math.max(descHeight, premiumHeight);

  // Header row
  const headerLabels = [uiText.descriptionOfCover, uiText.premium];
  [valueFromTop, beginningPoint] = generateInformationLineWithFixedHeight(
    doc,
    headerLabels,
    valueFromTop,
    beginningPoint,
    "Title",
    uniformCellHeight,
    2 // 2 columns
  );

  // Content rows
  for (let i = 0; i < coverDescriptions.length; i++) {
    const rowData = [coverDescriptions[i], premiumDetails[i]];

    // Calculate height for this specific row
    doc.font("Normal").fontSize(8);
    const rowHeight = Math.max(
      doc.heightOfString(coverDescriptions[i], { width: textWidth }),
      doc.heightOfString(premiumDetails[i], { width: textWidth }),
      minCellHeight
    );

    // Use bold font for the "TOTAL PREMIUM" row (last row, index 3)
    const fontStyle = i === 3 ? "Title" : "Normal"; // TOTAL PREMIUM is at index 3

    [valueFromTop, beginningPoint] = generateInformationLineWithFixedHeight(
      doc,
      rowData,
      valueFromTop,
      beginningPoint,
      fontStyle,
      rowHeight,
      2 // 2 columns
    );
  }

  // Add premium amount text below the table
  valueFromTop += 5; // Space after table (reduced from 10 to 5, moving up by 5px)
  const premiumAmountText = toWords
    .convert(totalPremium, { currency: true, ignoreDecimal: true })
    .replace(/tanzanian shillings/i, "Tanzanian Shillings")
    .replace(/only/i, "Only");

  const fullText = `Premium amount payable is ${premiumAmountText}.`;

  doc.font("Title").fontSize(8); // Changed from "Normal" to "Title" for bold
  doc.text(fullText, leftMargin + 40, valueFromTop, {
    width: insideWidth(doc) - 80,
    align: "left",
  });

  // Calculate height of the text to adjust return position
  const textHeight = doc.heightOfString(fullText, {
    width: insideWidth(doc) - 80,
  });
  valueFromTop += textHeight + 5;

  return valueFromTop;
}

/**
 * Draws bank information as simple text without table lines, aligned with insurance table
 * @param {PDFDocument} doc - The PDF document instance
 * @param {Object} data - The tax invoice data containing bank information
 * @param {number} y - The Y position to start drawing
 * @returns {number} The Y position after drawing
 */
function drawBankInformation(doc, data, y) {
  let currentY = y; // Removed spacing (was y + 15, now y) to move content 15px up
  const leftColumnX = leftMargin + 40; // Same alignment as insurance table
  const colonX = leftMargin + 140; // Fixed position for colons
  const rightColumnX = leftMargin + 150; // Close spacing for values after colon
  const lineHeight = 18;

  // Set font for the bank details
  doc.font("Title").fontSize(10);

  // Row 1: BANK NAME
  doc
    .text(uiText.bankName, leftColumnX, currentY)
    .text(":", colonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(
      data.bankInformation?.bankName || defaultBankInformation.bankName,
      rightColumnX,
      currentY
    );
  currentY += lineHeight;

  // Row 2: SWIFT CODE
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.swiftCode, leftColumnX, currentY)
    .text(":", colonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(
      data.bankInformation?.swiftCode || defaultBankInformation.swiftCode,
      rightColumnX,
      currentY
    );
  currentY += lineHeight;

  // Row 3: ACCOUNT NUMBER
  doc
    .font("Title")
    .fontSize(10)
    .text(uiText.accountNumber, leftColumnX, currentY)
    .text(":", colonX, currentY)
    .font("Normal")
    .fontSize(10)
    .text(
      data.bankInformation?.accountNumber ||
        defaultBankInformation.accountNumber,
      rightColumnX,
      currentY
    );
  currentY += lineHeight;

  return currentY + 10; // Add some spacing after the bank details
}

// ========================================
// DOCUMENT LAYOUT AND STYLING FUNCTIONS
// ========================================

/**
 * Registers custom fonts for the PDF document
 * @param {PDFDocument} doc - The PDF document instance
 */
function registerFonts(doc) {
  doc.registerFont("Normal", "./src/assets/fonts/Lato.ttf");
  doc.registerFont("Title", "./src/assets/fonts/Lato-Bold.ttf");
}

/**
 * Generates the document header with company information, title, and tax details
 * @param {PDFDocument} doc - The PDF document instance
 * @param {string} invoiceNumber - The invoice number to display
 * @returns {number} The Y position after drawing the header
 */
function generateHeader(doc, invoiceNumber) {
  let y = 25;

  // Add company logo if available
  try {
    doc.image(
      logoPath,
      innerLeftMargin + coverNoteLogoLeftOffset,
      y + coverNoteLogoTopOffset,
      {
        width: coverNoteLogoSize,
      }
    );
  } catch {
    // Logo file not found, continue without logo
  }

  // Add company contact information
  y += 10;
  doc
    .fontSize(9)
    .font("Normal")
    .text(companyAddress, innerLeftMargin, y, {
      align: "right",
      width: insideWidth(doc),
    })
    .text(companyBox, innerLeftMargin, (y += 15), {
      align: "right",
      width: insideWidth(doc),
    })
    .text(
      `${companyEmail} / ${companyPhoneNumber}`,
      innerLeftMargin,
      (y += 15),
      {
        align: "right",
        width: insideWidth(doc),
      }
    );

  // Add separator line and document title
  drawLine(doc, (y += 25));
  doc
    .font("Title")
    .fontSize(16)
    .text(`${uiText.taxInvoiceTitle} ${invoiceNumber}`, leftMargin, (y += 18), {
      align: "center",
      width: insideWidth(doc) + 10,
    });

  // Generate tax information table with increased spacing below title
  y = generateTaxInformationTable(doc, y + 33);

  return y + 5;
}

/**
 * Draws simplified invoice date information section
 * @param {PDFDocument} doc - The PDF document instance
 * @param {Object} data - Tax invoice data
 * @param {number} y - Y position to start drawing
 * @returns {number} The Y position after drawing
 */
function drawInvoiceDateInfo(doc, data, y) {
  // Draw invoice date and due date
  doc
    .font("Title")
    .fontSize(10)
    .text("Invoice Date:", leftMargin, y)
    .font("Normal")
    .text(data.invoiceDate || "Date", leftMargin + 80, y);

  doc
    .font("Title")
    .fontSize(10)
    .text("Due Date:", leftMargin + 250, y)
    .font("Normal")
    .text(data.dueDate || "Due Date", leftMargin + 330, y);

  return y + 30;
}

/**
 * Draws customer billing information section
 * @param {PDFDocument} doc - The PDF document instance
 * @param {Object} data - Tax invoice data
 * @param {number} y - Y position to start drawing
 * @returns {number} The Y position after drawing
 */
function drawCustomerBillingInfo(doc, data, y) {
  const leftPadding = 10;

  // Draw "BILL TO:" label
  doc.font("Title").fontSize(11).text("BILL TO:", leftMargin, y);

  // Draw customer information
  let currentY = y + 20;
  doc
    .font("Normal")
    .fontSize(10)
    .text(data.customerName, leftMargin + leftPadding, currentY);

  if (data.customerAddress) {
    currentY += 15;
    doc.text(data.customerAddress, leftMargin + leftPadding, currentY);
  }

  // Add TIN number if available
  if (data.customerTIN) {
    currentY += 15;
    doc
      .font("Title")
      .fontSize(10)
      .text("TIN No: ", leftMargin + leftPadding, currentY)
      .font("Normal")
      .text(data.customerTIN, leftMargin + leftPadding + 40, currentY);
  }

  // Add insurance policy details if available
  if (data.policyNumber) {
    currentY += 20;
    doc
      .font("Title")
      .fontSize(10)
      .text("POLICY DETAILS:", leftMargin + leftPadding, currentY);

    currentY += 15;
    doc
      .font("Normal")
      .fontSize(9)
      .text(
        `Policy No: ${data.policyNumber}`,
        leftMargin + leftPadding,
        currentY
      );

    if (data.coverNoteNumber) {
      currentY += 12;
      doc.text(
        `Cover Note: ${data.coverNoteNumber}`,
        leftMargin + leftPadding,
        currentY
      );
    }

    if (data.classOfInsurance) {
      currentY += 12;
      doc.text(
        `Class: ${data.classOfInsurance}`,
        leftMargin + leftPadding,
        currentY
      );
    }

    if (data.intermediary) {
      currentY += 12;
      doc.text(
        `Intermediary: ${data.intermediary}`,
        leftMargin + leftPadding,
        currentY
      );
    }
  }

  // Draw invoice date and due date on the right side
  const rightColumnX = leftMargin + 300;
  let rightY = y;

  doc
    .font("Title")
    .fontSize(10)
    .text("Invoice Date:", rightColumnX, rightY)
    .font("Normal")
    .text(data.invoiceDate || "Date", rightColumnX + 80, rightY);

  rightY += 15;
  doc
    .font("Title")
    .fontSize(10)
    .text("Due Date:", rightColumnX, rightY)
    .font("Normal")
    .text(data.dueDate || "Due Date", rightColumnX + 80, rightY);

  // Add policy dates if available
  if (data.effectiveDate) {
    rightY += 20;
    doc.font("Title").fontSize(10).text("POLICY PERIOD:", rightColumnX, rightY);

    rightY += 15;
    doc
      .font("Normal")
      .fontSize(9)
      .text(`Effective: ${data.effectiveDate}`, rightColumnX, rightY);

    if (data.expiryDate) {
      rightY += 12;
      doc.text(`Expiry: ${data.expiryDate}`, rightColumnX, rightY);
    }

    if (data.issueDate) {
      rightY += 12;
      doc.text(`Issue Date: ${data.issueDate}`, rightColumnX, rightY);
    }
  }

  return Math.max(currentY + 25, rightY + 25);
}

/**
 * Draws an important notice block with emphasized title and underline
 * @param {PDFDocument} doc - The PDF document instance
 * @param {string} text - The important notice text content
 * @param {number} y - Y position to start drawing
 * @returns {number} The Y position after drawing
 */
function drawImportantBlock(doc, text, y) {
  const leftPadding = 10; // Spacing from left margin for content indentation

  // Draw "IMPORTANT" centered on its own line with underline for emphasis
  doc
    .font("Title")
    .fontSize(14) // Increased from 10 to 14
    .text(uiText.importantHeading, leftMargin, y + 5, {
      width: insideWidth(doc),
      align: "center",
      underline: true,
    });

  // Calculate spacing for policy text below the title
  const importantHeight = doc.heightOfString(uiText.importantHeading);
  const contentY = y + importantHeight + 10; // Increased from 4 to 10px for reasonable gap

  // Render the policy notice text with proper indentation and reduced line spacing
  // Split the text by numbered items and render each separately for better alignment
  const lines = text.split(/(?=\d+\.)/); // Split before each number
  let currentY = contentY;

  lines.forEach((line, index) => {
    if (line.trim()) {
      doc
        .font("Normal")
        .fontSize(11)
        .text(line.trim(), leftMargin, currentY, {
          width: insideWidth(doc),
          align: "center",
          lineGap: 0, // Changed from -2 to 0 for normal line spacing
        });

      const lineHeight = doc.heightOfString(line.trim(), {
        width: insideWidth(doc),
        lineGap: 0,
      });
      currentY += lineHeight + 8; // Increased from 3 to 8px for reasonable spacing between items
    }
  });

  // Calculate total section height using the final currentY position
  const totalHeight = currentY - y + 10; // Calculate based on actual rendered height
  drawLine(doc, y + totalHeight); // Moved up 15px (removed + 15)

  return y + totalHeight + (blockSpacing + 10); // Reduced spacing
}

// ========================================
// VISUAL ELEMENTS AND GRAPHICS FUNCTIONS
// ========================================

/**
 * Draws a horizontal line across the page width
 * @param {PDFDocument} doc - The PDF document instance
 * @param {number} y - Y position to draw the line
 */
function drawLine(doc, y) {
  doc
    .strokeColor("black")
    .lineCap("butt")
    .moveTo(leftMargin, y)
    .lineTo(doc.page.width - rightMargin, y)
    .stroke();
}

/**
 * Draws a border frame around the entire page content area
 * @param {PDFDocument} doc - The PDF document instance
 */
function drawPageBorder(doc) {
  doc
    .rect(leftMargin, rightMargin, doc.page.width - 40, maxHeight(doc))
    .strokeColor("black")
    .stroke();
}

/**
 * Adds a company logo to any space left at the bottom of the page so it doesn't look empty
 * @param {PDFDocument} doc - The PDF document instance
 */
function addHeritageLogo(doc) {
  let valueFromTop = doc.y;
  if (valueFromTop > 725) {
    return;
  }
  valueFromTop += 5;
  const remainingSpace = maxHeight(doc) - valueFromTop;
  const remainingCenter = remainingSpace / 2 - 35;
  valueFromTop += remainingCenter;

  try {
    doc.image(
      logoPath,
      logoCenter(doc) + coverNoteLogoLeftOffset,
      valueFromTop + coverNoteLogoTopOffset,
      { width: coverNoteLogoSize }
    );
  } catch {
    // Logo file not found, continue without logo
  }
}

/**
 * Draws the "FOR TRA PURPOSES ONLY" section with premium details and invoice information
 * @param {PDFDocument} doc - The PDF document instance
 * @param {Object} data - The tax invoice data
 * @param {number} y - The Y position to start drawing (right after division line)
 * @returns {number} The Y position after drawing
 */
function drawTRAPurposesOnlySection(doc, data, y) {
  // Position 10px from right margin, like QR code positioning
  const rightMarginX = doc.page.width - rightMargin - 200; // 200px width for the section
  let currentY = y - 20; // Push it up by 20px (was -10, now -20)

  // Calculate amounts
  const basePremium =
    data.basePremium || taxCalculationConfig.defaultBasePremium;
  const vatRate = data.vatRate || taxCalculationConfig.vatRate;
  const vatAmount = Math.round(basePremium * vatRate);
  const totalPremium = basePremium + vatAmount;

  // Get current date and time for TRA section
  const now = new Date();
  const zNumber = data.zNumber || traConfig.defaultZNumber;
  const invoiceDate = now
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
  const invoiceTime = now.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Draw "FOR TRA PURPOSES ONLY" heading with larger font
  doc.font("Title").fontSize(12);
  doc.text(uiText.traPurposesHeading, rightMarginX, currentY);
  currentY += 18;

  // Add line under "FOR TRA PURPOSES ONLY" heading (moved down 5px, doesn't touch margins)
  doc
    .moveTo(rightMarginX, currentY)
    .lineTo(rightMarginX + 190, currentY)
    .stroke();
  currentY += 5;

  // Create table data
  const tableData = [
    ["Premium", "TZS", `${basePremium.toLocaleString("en-US")}.00`],
    ["VAT", "TZS", `${vatAmount.toLocaleString("en-US")}.00`],
    ["Total", "TZS", `${totalPremium.toLocaleString("en-US")}.00`],
    ["Invoice No", ":", data.invoiceNumber || ""],
    ["Z Number", ":", zNumber],
    ["Invoice Date", ":", invoiceDate],
    ["Invoice Time", ":", invoiceTime],
  ];

  // Set font for table content with larger size
  doc.font("Normal").fontSize(10);

  // Column widths (adjusted for better spacing)
  const col1Width = 75;
  const col2Width = 30;
  const col3Width = 95;
  const lineHeight = 14;

  // Draw table rows
  tableData.forEach((row, index) => {
    const x1 = rightMarginX;
    const x2 = rightMarginX + col1Width;
    const x3 = rightMarginX + col1Width + col2Width;

    doc.text(row[0], x1, currentY);
    doc.text(row[1], x2, currentY);
    doc.text(row[2], x3, currentY);

    currentY += lineHeight;

    // Add line under "Total" row (index 2 is the Total row) - moved down 5px, doesn't touch margins
    if (index === 2) {
      doc
        .moveTo(rightMarginX, currentY)
        .lineTo(rightMarginX + 190, currentY)
        .stroke();
      currentY += 5; // Reduced back to 5px to bring content closer
    }
  });

  return currentY + 10;
}

/**
 * Generates and places a QR code at the bottom left corner of the page
 * @param {PDFDocument} doc - The PDF document instance
 * @param {string} qrValue - The value to encode in the QR code
 */
/**
 * Draws a QR code at the bottom left of the page
 * @param {PDFDocument} doc - The PDF document instance
 * @param {string} qrValue - The value to encode in the QR code
 * @param {string} labelText - The text to display above and beside the QR code (default: "SCAN ME")
 */
async function drawQRCodeAtBottomLeft(doc, qrValue, labelText = "SCAN ME") {
  const qrBuffer = await QRCode.toBuffer(qrValue, { width: 74, margin: 0 });
  const qrCodeX = leftMargin + 4;
  const qrCodeY = doc.page.height - rightMargin - 74 - 24;
  doc.image(qrBuffer, qrCodeX, qrCodeY, { width: 74, height: 74 });

  // Add label text on top of QR code
  doc.font("Title").fontSize(10);
  const labelTextWidth = doc.widthOfString(labelText);
  const labelTextX = qrCodeX + (74 - labelTextWidth) / 2; // Center above QR code
  doc.text(labelText, labelTextX, qrCodeY - 15);
}

/**
 * Adds footer information to all pages including page numbers and generation details
 * @param {PDFDocument} doc - The PDF document instance
 * @param {Date} date - Generation date for the document
 * @param {string} platform - Platform used to generate the document
 */
function addFooter(doc, date, platform) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .font("Title")
      .fontSize(9)
      .text(`Page ${i + 1} of ${pages.count}`, 500, 805, { align: "right" })
      .text(uiText.poweredByText, leftMargin, 805);
    doc
      .font("Normal")
      .text(
        `${uiText.generatedAtText} ${date.toLocaleDateString("en-GB")}, ${
          uiText.viaText
        } ${platform}`,
        leftMargin,
        818
      );
  }
}

// ========================================
// TABLE AND GRID UTILITY FUNCTIONS
// ========================================

/**
 * Generates a line of information in a table format with multiple columns
 * @param {PDFDocument} doc - The PDF document instance
 * @param {Array} text - Array of text content for each column
 * @param {number} valueFromTop - Y position to start drawing
 * @param {number} beginningPoint - Starting point for line calculations
 * @param {string} font - Font to use (default: "Normal")
 * @returns {Array} Array containing new Y position and ending point
 */
function generateInformationLine(
  doc,
  text,
  valueFromTop,
  beginningPoint,
  font = "Normal"
) {
  const width = insideWidth(doc) / 6;
  const textWidth = width - 5;

  let maxHeight = 0;

  // Calculate the maximum height needed for all columns
  maxHeight = text.reduce((max, current) => {
    const height = doc.heightOfString(current, { width: textWidth });
    return height > max ? height : max;
  }, 0);

  // Ensure minimum height for consistent cell size
  const minCellHeight = 14; // Minimum height to ensure consistent cells
  maxHeight = Math.max(maxHeight, minCellHeight);

  // Draw text in each column
  for (let i = 0; i < text.length; i++) {
    const x = i === 0 ? leftMargin : leftMargin + width * i + 2.5;
    const height = doc.heightOfString(text[i], { width: textWidth });

    let y = valueFromTop;

    // Center text vertically if height is less than maxHeight
    if (height !== maxHeight) {
      y += (maxHeight - height) / 2 - 1;
    }
    doc.font(font).fontSize(9).text(text[i], x, y, {
      align: "center",
      width: textWidth,
    });
  }

  const endingPoint = valueFromTop + maxHeight + 5;

  // Draw vertical lines between columns
  for (let i = 0; i < text.length; i++) {
    if (i === 0) {
      continue;
    }
    const x = leftMargin + width * i;
    drawVerticalLine(doc, endingPoint - beginningPoint, x, beginningPoint);
  }

  // Draw horizontal line at the bottom
  drawLine(doc, endingPoint);

  return [endingPoint + 5, endingPoint];
}

/**
 * Generates an information line with fixed height for uniform cell sizes
 * @param {PDFDocument} doc - The PDF document instance
 * @param {Array} text - Array of text content for each column
 * @param {number} valueFromTop - Y position to start drawing
 * @param {number} beginningPoint - Starting Y position for borders
 * @param {string} font - Font to use (default: "Normal")
 * @param {number} fixedHeight - Fixed height for the row
 * @param {number} columns - Number of columns (default: 6)
 * @returns {Array} [newY, endingPoint] positions
 */
function generateInformationLineWithFixedHeight(
  doc,
  text,
  valueFromTop,
  beginningPoint,
  font = "Normal",
  fixedHeight,
  columns = 6
) {
  const width = insideWidth(doc) / columns;
  const textWidth = width - 5;

  // Draw text in each column
  for (let i = 0; i < text.length; i++) {
    const x = i === 0 ? leftMargin : leftMargin + width * i + 2.5;
    const height = doc.heightOfString(text[i], { width: textWidth });

    let y = valueFromTop;

    // Center text vertically within the fixed height
    if (height !== fixedHeight) {
      y += (fixedHeight - height) / 2 - 1;
    }
    doc.font(font).fontSize(9).text(text[i], x, y, {
      align: "center",
      width: textWidth,
    });
  }

  const endingPoint = valueFromTop + fixedHeight + 5;

  // Draw vertical lines between columns
  for (let i = 0; i < text.length; i++) {
    if (i === 0) {
      continue;
    }
    const x = leftMargin + width * i;
    drawVerticalLine(doc, endingPoint - beginningPoint, x, beginningPoint);
  }

  // Draw horizontal line at the bottom
  drawLine(doc, endingPoint);

  return [endingPoint + 5, endingPoint];
}

/**
 * Draws a vertical line at specified position
 * @param {PDFDocument} doc - The PDF document instance
 * @param {number} height - Height of the line
 * @param {number} x - X position
 * @param {number} y - Y position
 */
function drawVerticalLine(doc, height, x, y) {
  doc
    .strokeColor("black")
    .lineCap("butt")
    .moveTo(x, y)
    .lineTo(x, y + height)
    .stroke();
}

// ========================================
// MODULE EXPORTS
// ========================================

// Export the main tax invoice generation function for external use
module.exports = generateNewTaxInvoice;
