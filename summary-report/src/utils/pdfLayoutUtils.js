/**
 * Draws a two-column table with a wide left column (label) and narrow right column (value),
 * with a bold header row and visible borders, similar to the premium payment table in tax invoice.
 * @param {PDFDocument} doc - The PDF document instance
 * @param {Array<{label: string, value: string|number}>} rows - Array of row objects
 * @param {string} leftHeader - Header for the left column
 * @param {string} rightHeader - Header for the right column
 * @param {number} [y] - Optional Y position to start drawing (defaults to doc.y)
 * @param {Object} [options] - Optional config: { col1Width, col2Width, gap }
 * @returns {number} The Y position after drawing the table
 *
 * @example
 * // Usage:
 * drawWideLeftTable(doc, [
 *   { label: 'Type A', value: 10 },
 *   { label: 'Type B', value: 5 }
 * ], 'Type', 'Count');
 */
function drawWideLeftTable(
  doc,
  rows,
  leftHeader,
  rightHeader,
  y,
  options = {}
) {
  // Table stretches from leftMargin to page width - rightMargin
  const startY = y !== undefined ? y : doc.y;
  const tableX = leftMargin;
  const tableWidth = doc.page.width - leftMargin - rightMargin;
  // 2 columns: left (label) is 75%, right (value) is 25%
  const col1Width = Math.floor(tableWidth * 0.75);
  const col2Width = tableWidth - col1Width;
  const rowHeight = 18;
  const headerHeight = 20;
  let currentY = startY;
  const bottom = doc.page.height - doc.page.margins.bottom;

  // Helper to draw header row (left/right aligned as before)
  function drawHeader(yPos) {
    doc.font("Lato-Bold").fontSize(10);
    doc.rect(tableX, yPos, col1Width, headerHeight).stroke();
    doc.rect(tableX + col1Width, yPos, col2Width, headerHeight).stroke();
    doc.text(leftHeader, tableX + 8, yPos + 5, {
      width: col1Width - 16,
      align: "left",
    });
    doc.text(rightHeader, tableX + col1Width + 8, yPos + 5, {
      width: col2Width - 16,
      align: "right",
    });
  }

  // Draw header row (bordered)
  drawHeader(currentY);
  currentY += headerHeight;

  // Draw data rows (bordered), with page break if needed
  doc.font("Lato").fontSize(10);
  for (let i = 0; i < rows.length; i++) {
    // If not enough space for row + bottom border, add page and redraw header
    if (currentY + rowHeight + 10 > bottom) {
      doc.addPage();
      currentY = doc.page.margins.top;
      drawHeader(currentY);
      currentY += headerHeight;
    }
    const { label, value } = rows[i];
    doc.rect(tableX, currentY, col1Width, rowHeight).stroke();
    doc.rect(tableX + col1Width, currentY, col2Width, rowHeight).stroke();
    doc.text(label, tableX + 8, currentY + 4, {
      width: col1Width - 16,
      align: "left",
    });
    doc.text(String(value), tableX + col1Width + 8, currentY + 4, {
      width: col2Width - 16,
      align: "right",
    });
    currentY += rowHeight;
  }
  // Draw bottom border
  doc
    .moveTo(tableX, currentY)
    .lineTo(tableX + tableWidth, currentY)
    .stroke();
  return currentY + 4;
}

// pdfLayoutUtils.js
// Shared PDF layout and branding utilities for receipts and reports

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
  leftMargin,
  rightMargin,
  innerLeftMargin,
  blockSpacing,
} = require("../constants");

/**
 * Calculates the inside width of the document excluding margins.
 * @param {PDFDocument} doc - The PDF document instance.
 * @returns {number} The usable width inside margins.
 */
const insideWidth = (doc) => doc.page.width - (leftMargin + rightMargin + 10);

/**
 * Calculates the maximum height available on the page.
 * @param {PDFDocument} doc - The PDF document instance.
 * @returns {number} The usable height for content.
 */
const maxHeight = (doc) => doc.page.height - 60;

/**
 * Calculates the center position for logo placement.
 * @param {PDFDocument} doc - The PDF document instance.
 * @returns {number} The X coordinate for centered logo.
 */
const logoCenter = (doc) => (doc.page.width - coverNoteLogoSize) / 2;

/**
 * Registers Lato fonts for consistent usage in the PDF.
 * @param {PDFDocument} doc - The PDF document instance.
 */
function registerSharedFonts(doc) {
  if (!doc._latoFontsRegistered) {
    doc.registerFont("Normal", __dirname + "/../fonts/Lato.ttf");
    doc.registerFont("Title", __dirname + "/../fonts/Lato-Bold.ttf");
    doc._latoFontsRegistered = true;
  }
}

/**
 * Draws a horizontal line across the page width at position y.
 * @param {PDFDocument} doc - The PDF document instance.
 * @param {number} y - Y position to draw the line.
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
 * Draws a border frame around the entire page content area.
 * @param {PDFDocument} doc - The PDF document instance.
 */
function drawPageBorder(doc) {
  const { left, right, top, bottom } = doc.page.margins;
  doc
    .rect(
      left,
      top,
      doc.page.width - left - right,
      doc.page.height - top - bottom
    )
    .strokeColor("black")
    .stroke();
}

/**
 * Adds a company logo to any space left at the bottom of the page.
 * @param {PDFDocument} doc - The PDF document instance.
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
 * Adds footer information to all pages including page numbers and generation details.
 * @param {PDFDocument} doc - The PDF document instance.
 * @param {Date} date - Generation date for the document.
 * @param {string} platform - Platform used to generate the document.
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
 * Generates the document header with company information, title, and tax details.
 * @param {PDFDocument} doc - The PDF document instance.
 * @param {string} receiptNumber - The receipt or report number.
 * @param {string} [title="RECEIPT"] - The document title.
 * @returns {number} The Y position after drawing the header.
 */
function generateHeader(doc, receiptNumber, title = "RECEIPT") {
  registerSharedFonts(doc);
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
    .text(`${title} ${receiptNumber || ""}`.trim(), leftMargin, (y += 18), {
      align: "center",
      width: insideWidth(doc) + 10,
    });

  // Optionally, you can add tax info table here if needed
  // (for business report, pass a flag to skip or add a custom section)

  return y + 5;
}

module.exports = {
  insideWidth,
  maxHeight,
  logoCenter,
  drawLine,
  drawPageBorder,
  addHeritageLogo,
  addFooter,
  generateHeader,
  registerSharedFonts,
  drawWideLeftTable,
};
