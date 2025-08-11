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

// Calculates the inside width of the document excluding margins
const insideWidth = (doc) => doc.page.width - (leftMargin + rightMargin + 10);

// Calculates the maximum height available on the page
const maxHeight = (doc) => doc.page.height - 60;

// Calculates the center position for logo placement
const logoCenter = (doc) => (doc.page.width - coverNoteLogoSize) / 2;

// Register Lato fonts for consistent usage
function registerSharedFonts(doc) {
  if (!doc._latoFontsRegistered) {
    doc.registerFont("Normal", __dirname + "/../fonts/Lato.ttf");
    doc.registerFont("Title", __dirname + "/../fonts/Lato-Bold.ttf");
    doc._latoFontsRegistered = true;
  }
}

// Draws a horizontal line across the page width
function drawLine(doc, y) {
  doc
    .strokeColor("black")
    .lineCap("butt")
    .moveTo(leftMargin, y)
    .lineTo(doc.page.width - rightMargin, y)
    .stroke();
}

// Draws a border frame around the entire page content area
function drawPageBorder(doc) {
  // Use left/right/top margins for the border, bottom margin can be different
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

// Adds a company logo to any space left at the bottom of the page
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

// Adds footer information to all pages including page numbers and generation details
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

// Generates the document header with company information, title, and tax details
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
};
