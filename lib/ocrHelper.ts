import Tesseract from 'tesseract.js';

export interface OCRExtractedItem {
  name: string;
  hsn_code: string;
  quantity: string;
  unit: string;
  rate: string;
  taxable_value: string;
  amount: string;
}

export interface OCRResult {
  success: boolean;
  rawText: string;
  extractedData: {
    invoiceNumber: string;
    billDate: string;
    totalAmount: string;
    gstin: string;
    sellerName: string;
    placeOfSupply: string;
    taxableAmount: string;
    cgstRate: string;
    cgstAmount: string;
    sgstRate: string;
    sgstAmount: string;
    igstRate: string;
    igstAmount: string;
    items: OCRExtractedItem[];
  };
  confidence: number;
  error?: string;
}

/**
 * Scan a bill image and extract relevant information using OCR
 * Works with computer-generated bills for best accuracy
 */
export const scanBillImage = async (
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> => {
  try {
    const result = await Tesseract.recognize(
      imageFile,
      'eng', // Language - English
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(m.progress * 100));
          }
        },
      }
    );

    const text = result.data.text;
    const confidence = result.data.confidence;

    // Extract data using regex patterns
    const extractedData = extractBillData(text);

    return {
      success: true,
      rawText: text,
      extractedData,
      confidence,
    };
  } catch (error) {
    console.error('OCR Failed:', error);
    return {
      success: false,
      rawText: '',
      extractedData: {
        invoiceNumber: '',
        billDate: '',
        totalAmount: '',
        gstin: '',
        sellerName: '',
        placeOfSupply: '',
        taxableAmount: '',
        cgstRate: '',
        cgstAmount: '',
        sgstRate: '',
        sgstAmount: '',
        igstRate: '',
        igstAmount: '',
        items: [],
      },
      confidence: 0,
      error: error instanceof Error ? error.message : 'OCR processing failed',
    };
  }
};

/**
 * Extract structured data from OCR text using regex patterns
 */
function extractBillData(text: string) {
  // Normalize text - remove extra whitespace
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  return {
    invoiceNumber: extractInvoiceNumber(normalizedText, lines),
    billDate: extractDate(normalizedText, lines),
    totalAmount: extractTotalAmount(normalizedText, lines),
    gstin: extractGSTIN(normalizedText),
    sellerName: extractSellerName(lines),
    placeOfSupply: extractPlaceOfSupply(normalizedText, lines),
    taxableAmount: extractTaxableAmount(normalizedText, lines),
    cgstRate: extractCGSTRate(normalizedText, lines),
    cgstAmount: extractCGSTAmount(normalizedText, lines),
    sgstRate: extractSGSTRate(normalizedText, lines),
    sgstAmount: extractSGSTAmount(normalizedText, lines),
    igstRate: extractIGSTRate(normalizedText, lines),
    igstAmount: extractIGSTAmount(normalizedText, lines),
    items: extractLineItems(lines),
  };
}

/**
 * Extract invoice/bill number
 */
function extractInvoiceNumber(text: string, lines: string[]): string {
  // Common patterns for invoice numbers
  const patterns = [
    /Invoice\s*(?:No\.?|Number|#)\s*[:\-]?\s*([A-Za-z0-9\-\/]+)/i,
    /Bill\s*(?:No\.?|Number|#)\s*[:\-]?\s*([A-Za-z0-9\-\/]+)/i,
    /Receipt\s*(?:No\.?|Number|#)\s*[:\-]?\s*([A-Za-z0-9\-\/]+)/i,
    /Inv\.?\s*(?:No\.?|#)\s*[:\-]?\s*([A-Za-z0-9\-\/]+)/i,
    /(?:INV|BILL|REC)[:\-]?\s*([A-Za-z0-9\-\/]+)/i,
    /No\.?\s*[:\-]?\s*([A-Za-z0-9]{5,})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Try to find from lines
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }

  return '';
}

/**
 * Extract date from bill
 */
function extractDate(text: string, _lines: string[]): string {
  // Common date patterns
  const patterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
    // YYYY-MM-DD
    /(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/,
    // Date: or Date keyword followed by date
    /Date\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    // DD MMM YYYY (e.g., 15 Jan 2024)
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return formatDate(match[1]);
    }
  }

  return '';
}

/**
 * Format extracted date to YYYY-MM-DD
 */
function formatDate(dateStr: string): string {
  // Try to parse and format the date
  try {
    // Handle DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = dateStr.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      let year = dmyMatch[3];
      if (year.length === 2) {
        year = '20' + year;
      }
      // Assume DD/MM/YYYY format (Indian standard)
      return `${year}-${month}-${day}`;
    }

    // Handle YYYY-MM-DD
    const ymdMatch = dateStr.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    if (ymdMatch) {
      return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
    }

    // Handle DD MMM YYYY
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const textDateMatch = dateStr.match(/(\d{1,2})\s+([a-z]+)\s+(\d{2,4})/i);
    if (textDateMatch) {
      const day = textDateMatch[1].padStart(2, '0');
      const month = monthNames[textDateMatch[2].toLowerCase().substring(0, 3)] || '01';
      let year = textDateMatch[3];
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Return original if parsing fails
  }
  return dateStr;
}

/**
 * Extract total amount
 */
function extractTotalAmount(text: string, lines: string[]): string {
  // Patterns for total amount - look for keywords followed by amount
  const patterns = [
    /(?:Grand\s*)?Total\s*(?:Amount)?\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
    /(?:Net\s*)?(?:Payable|Amount)\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
    /(?:Rs\.?|₹|INR)\s*([\d,]+\.?\d{2})\s*(?:Total|Only)/i,
    /(?:Bill\s*)?Amount\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
  ];

  // First try with total/grand total keywords
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/,/g, '');
    }
  }

  // Look in lines from bottom (totals usually at bottom)
  const reversedLines = [...lines].reverse();
  for (const line of reversedLines.slice(0, 10)) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/,/g, '');
      }
    }
  }

  return '';
}

/**
 * Extract GSTIN
 */
function extractGSTIN(text: string): string {
  // GSTIN format: 2 digits state code + 10 char PAN + 1 digit entity + Z + 1 check digit
  // Pattern: 22AAAAA0000A1Z5
  const gstinPattern = /\b(\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z]\d)\b/i;
  const match = text.match(gstinPattern);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }

  // Try with GSTIN keyword
  const keywordPattern = /GSTIN?\s*[:\-]?\s*(\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z]\d)/i;
  const keywordMatch = text.match(keywordPattern);
  if (keywordMatch && keywordMatch[1]) {
    return keywordMatch[1].toUpperCase();
  }

  return '';
}

/**
 * Extract seller/vendor name (usually at top of bill)
 */
function extractSellerName(lines: string[]): string {
  // Usually the first non-empty line that looks like a company name
  // Skip very short lines and lines that look like addresses/phone numbers
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Skip if it looks like a phone number, address, or date
    if (
      /^\d+$/.test(line) ||
      /phone|tel|mobile|address|date|invoice|bill/i.test(line) ||
      line.length < 3
    ) {
      continue;
    }
    // Return first reasonable line as potential company name
    if (line.length >= 3 && line.length <= 100) {
      return line;
    }
  }
  return '';
}

/**
 * Extract line items from bill
 */
function extractLineItems(lines: string[]): OCRExtractedItem[] {
  const items: OCRExtractedItem[] = [];

  // Look for patterns like: Product Name | HSN | Qty | Unit | Rate | Amount
  // This is a simplified extraction - real bills vary widely
  const itemPattern = /^(.+?)\s+(\d{4,8})?\s*(\d+(?:\.\d+)?)\s*(kg|pcs|ltr|box|nos|gm|ml|unit)?\.?\s+(?:x\s*)?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/i;
  
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match) {
      const qty = match[3] || '';
      const rate = match[5] || '';
      items.push({
        name: match[1].trim(),
        hsn_code: match[2] || '',
        quantity: qty,
        unit: match[4] || 'kg',
        rate: rate,
        taxable_value: match[6] || '',
        amount: match[6] || '',
      });
    }
  }

  // Try alternate pattern: Name followed by numbers
  if (items.length === 0) {
    const simplePattern = /^([A-Za-z\s]+)[\s\|]+(\d+(?:\.\d+)?)\s*(?:kg|pcs|ltr)?[\s\|]+(\d+(?:\.\d+)?)[\s\|]+(\d+(?:\.\d+)?)$/i;
    for (const line of lines) {
      const match = line.match(simplePattern);
      if (match) {
        items.push({
          name: match[1].trim(),
          hsn_code: '',
          quantity: match[2],
          unit: 'kg',
          rate: match[3],
          taxable_value: match[4],
          amount: match[4],
        });
      }
    }
  }

  return items;
}

/**
 * Extract Place of Supply (State)
 */
function extractPlaceOfSupply(text: string, lines: string[]): string {
  const patterns = [
    /Place\s*of\s*Supply\s*[:\-]?\s*([A-Za-z\s]+?)(?:\(|$|\d)/i,
    /State\s*[:\-]?\s*([A-Za-z\s]+?)(?:\(|$|\d)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }

  return '';
}

/**
 * Extract Taxable Amount
 */
function extractTaxableAmount(text: string, _lines: string[]): string {
  const patterns = [
    /Taxable\s*(?:Amount|Value)\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
    /Total\s*Taxable\s*(?:Amount|Value)\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
    /Sub\s*Total\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/,/g, '');
    }
  }

  return '';
}

/**
 * Extract CGST Rate
 */
function extractCGSTRate(text: string, _lines: string[]): string {
  const patterns = [
    /CGST\s*@?\s*(\d+(?:\.\d+)?)\s*%/i,
    /CGST\s*\(\s*(\d+(?:\.\d+)?)\s*%\s*\)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}

/**
 * Extract CGST Amount
 */
function extractCGSTAmount(text: string, lines: string[]): string {
  const patterns = [
    /CGST\s*(?:@\s*\d+(?:\.\d+)?\s*%)?\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
    /CGST\s*\(\s*\d+(?:\.\d+)?\s*%\s*\)\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/,/g, '');
      }
    }
  }

  return '';
}

/**
 * Extract SGST Rate
 */
function extractSGSTRate(text: string, _lines: string[]): string {
  const patterns = [
    /SGST\s*@?\s*(\d+(?:\.\d+)?)\s*%/i,
    /SGST\s*\(\s*(\d+(?:\.\d+)?)\s*%\s*\)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}

/**
 * Extract SGST Amount
 */
function extractSGSTAmount(text: string, lines: string[]): string {
  const patterns = [
    /SGST\s*(?:@\s*\d+(?:\.\d+)?\s*%)?\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
    /SGST\s*\(\s*\d+(?:\.\d+)?\s*%\s*\)\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/,/g, '');
      }
    }
  }

  return '';
}

/**
 * Extract IGST Rate
 */
function extractIGSTRate(text: string, _lines: string[]): string {
  const patterns = [
    /IGST\s*@?\s*(\d+(?:\.\d+)?)\s*%/i,
    /IGST\s*\(\s*(\d+(?:\.\d+)?)\s*%\s*\)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}

/**
 * Extract IGST Amount
 */
function extractIGSTAmount(text: string, lines: string[]): string {
  const patterns = [
    /IGST\s*(?:@\s*\d+(?:\.\d+)?\s*%)?\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
    /IGST\s*\(\s*\d+(?:\.\d+)?\s*%\s*\)\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/,/g, '');
      }
    }
  }

  return '';
}

/**
 * Convert image file to base64 for preview
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};
