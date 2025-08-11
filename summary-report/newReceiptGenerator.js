/**
 * @fileoverview PDF Receipt Generator
 * Generates  PDF receipts with company branding, QR codes, and structured layout.
 * Utilizes modular table utilities and configuration constants for maintainable code.
 *
 * @author Labedan IT Solutions
 * @version 1.0.0
 * @since 2025-08-01
 */

const fs = require("fs");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const toWords = require("./toWordsConfig");
const { drawBorderedTable, createReceiptTableRows } = require("./tableUtils");
const {
  insideWidth,
  maxHeight,
  logoCenter,
  drawLine,
  drawPageBorder,
  addHeritageLogo,
  addFooter,
  generateHeader,
} = require("./src/utils/pdfLayoutUtils");
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
} = require("./constants");

/**
 * Converts amount to words using the toWords converter
 * @param {Object} data - Receipt data containing amount
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

/**
 * Generates a PDF receipt document
 * @param {string} fileName - Name of the file to generate
 * @param {string} fullFileName - Full file name with path
 * @param {Object} data - Receipt data containing all necessary information
 * @param {boolean} uploadOnline - Whether to upload the file online (deprecated)
 * @returns {Promise} Promise that resolves when PDF is generated
 */
async function generateNewReceipt(
  fileName,
  fullFileName,
  data,
  uploadOnline = false
) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { left: leftMargin, right: rightMargin },
    bufferPages: true,
  });

  registerFonts(doc);

  // Set PDF document metadata for proper identification and searchability
  doc.info.Title = `Receipt ${data.receiptNumber}`;
  doc.info.Author = companyName;
  doc.info.Subject = "Payment Receipt";
  doc.info.Keywords = "receipt, payment, insurance";
  doc.info.ModDate = new Date();
  doc.info.Creator = "Labedan IT Solutions";
  doc.info.Producer = "Labedan IT Solutions";

  const localPath = "./src/assets/" + fileName;
  const chunks = [];

  // Collect PDF data in memory for processing
  doc.on("data", (chunk) => chunks.push(chunk));

  const generationDateTime = new Date();

  // === DOCUMENT STRUCTURE GENERATION ===
  // Build the receipt document in logical sections

  // Generate document header section
  let y = generateHeader(doc, data.receiptNumber);

  // Add risk note and sticker number boxes with reduced padding (5px less above and below)
  y = drawRiskAndStickerNoInline(
    doc,
    data.riskNoteNumber,
    data.stickerNumber,
    y + 15
  );

  // Create and render main information table - moved up by additional 5px (total 10px up)
  const rows = createReceiptTableRows(data, amountInWords);
  y = drawBorderedTable(doc, rows, y);

  // Add important notice section
  y = drawImportantBlock(doc, data.importantNote, y + 10);

  // === FINAL TOUCHES AND VERIFICATION ===
  // Add branding, verification, and styling elements

  // Add company logo and verification elements
  addHeritageLogo(doc);
  await drawQRCodeAtBottomRight(
    doc,
    `${webPlatformURL}/verify?receipt=${data.receiptNumber}`
  );

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
    "TIN No",
    "VRN",
    "TAX OFFICE",
    "Z BRN No",
    "Z VRN",
    "VFD SERIAL",
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
    uniformCellHeight
  );

  // Second row: Field values
  [valueFromTop, beginningPoint] = generateInformationLineWithFixedHeight(
    doc,
    valueTexts,
    valueFromTop,
    beginningPoint,
    "Normal",
    uniformCellHeight
  );

  return valueFromTop;
}

// ==================== PDF Generation Helper Functions ====================

/**
 * Registers custom fonts for the PDF document
 * @param {PDFDocument} doc - The PDF document instance
 */
function registerFonts(doc) {
  doc.registerFont("Normal", "./src/assets/fonts/Lato.ttf");
  doc.registerFont("Title", "./src/assets/fonts/Lato-Bold.ttf");
}

/**
// generateHeader now imported from pdfLayoutUtils.js

/**
 * Draws risk note and sticker number in bordered boxes with labels
 * @param {PDFDocument} doc - The PDF document instance
 * @param {string} risk - Risk note number
 * @param {string} sticker - Sticker number
 * @param {number} y - Y position to start drawing
 * @returns {number} The Y position after drawing
 */
function drawRiskAndStickerNoInline(doc, risk, sticker, y) {
  // Define styling constants for consistent appearance
  const labelFont = "Title",
    labelFontSize = 9,
    valueFont = "Normal",
    valueFontSize = 10;
  const boxWidth = 180,
    boxHeight = 22,
    spacing = 30; // Space between risk note and sticker number sections

  let x = leftMargin + 12; // Starting position offset from left margin

  // Draw risk note section with label and bordered box
  doc.font(labelFont).fontSize(labelFontSize);
  const riskLabelHeight = doc.heightOfString("RISK NOTE NO:");
  const riskLabelCenterY = y + (boxHeight - riskLabelHeight) / 2;
  doc.text("RISK NOTE NO:", x, riskLabelCenterY);

  x += doc.widthOfString("RISK NOTE NO:") + 8;
  doc.rect(x, y, boxWidth, boxHeight).stroke();

  // Center the risk number text within the box
  doc.font(valueFont).fontSize(valueFontSize);
  const riskTextHeight = doc.heightOfString(risk);
  const riskCenterY = y + (boxHeight - riskTextHeight) / 2;
  doc.text(risk, x, riskCenterY, {
    width: boxWidth,
    align: "center",
  });

  x += boxWidth + spacing;

  // Draw sticker number section with label and bordered box
  doc.font(labelFont).fontSize(labelFontSize);
  const stickerLabelHeight = doc.heightOfString("STICKER NO:");
  const stickerLabelCenterY = y + (boxHeight - stickerLabelHeight) / 2;
  doc.text("STICKER NO:", x, stickerLabelCenterY);

  x += doc.widthOfString("STICKER NO:") + 8;
  doc.rect(x, y, boxWidth, boxHeight).stroke();

  // Center the sticker number text within the box
  doc.font(valueFont).fontSize(valueFontSize);
  const stickerTextHeight = doc.heightOfString(sticker);
  const stickerCenterY = y + (boxHeight - stickerTextHeight) / 2;
  doc.text(sticker, x, stickerCenterY, {
    width: boxWidth,
    align: "center",
  });

  // Return with padding to match header spacing exactly
  // Header spacing: 18px (after division line) + 33px (after receipt title) = 51px
  const headerSpacing = 51;

  return y + headerSpacing;
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
    .fontSize(12)
    .text("IMPORTANT", leftMargin, y + 5, {
      width: insideWidth(doc),
      align: "center",
      underline: true,
    });

  // Calculate spacing for policy text below the title
  const importantHeight = doc.heightOfString("IMPORTANT");
  const contentY = y + importantHeight + 15; // 15px gap between title and content

  // Render the policy notice text with proper indentation
  doc
    .font("Normal")
    .fontSize(11)
    .text(text, leftMargin + leftPadding, contentY, {
      width: insideWidth(doc) - leftPadding,
    });

  // Calculate total section height and add separator line
  const textHeight = doc.heightOfString(text, {
    width: insideWidth(doc) - leftPadding,
  });
  const totalHeight = importantHeight + 15 + textHeight;
  drawLine(doc, y + totalHeight + 25); // Add line with spacing

  return y + totalHeight + (blockSpacing + 15);
}

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
 * Generates and places a QR code at the bottom right corner of the page
 * @param {PDFDocument} doc - The PDF document instance
 * @param {string} qrValue - The value to encode in the QR code
 */
async function drawQRCodeAtBottomRight(doc, qrValue) {
  const qrBuffer = await QRCode.toBuffer(qrValue, { width: 74, margin: 0 });
  const qrCodeX = doc.page.width - rightMargin - 74 - 4;
  const qrCodeY = doc.page.height - rightMargin - 74 - 24;
  doc.image(qrBuffer, qrCodeX, qrCodeY, { width: 74, height: 74 });
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
      .text("Powered by: Labedan IT Solutions", leftMargin, 805);
    doc
      .font("Normal")
      .text(
        `Generated at: ${date.toLocaleDateString("en-GB")}, via: ${platform}`,
        leftMargin,
        818
      );
  }
}

/**
 * Generates an information line with columns using the same format as cover note
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
 * @returns {Array} [newY, endingPoint] positions
 */
function generateInformationLineWithFixedHeight(
  doc,
  text,
  valueFromTop,
  beginningPoint,
  font = "Normal",
  fixedHeight
) {
  const width = insideWidth(doc) / 6;
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

module.exports = generateNewReceipt;
