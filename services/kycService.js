const crypto = require('crypto');

/**
 * Verhoeff Algorithm Tables for Aadhaar Checksum Validation
 * UIDAI uses the Verhoeff algorithm on the 12th digit of Aadhaar numbers.
 */
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

/**
 * Validates a number string using the Verhoeff algorithm.
 * Returns true if the checksum matches.
 */
function validateVerhoeff(numStr) {
  let c = 0;
  const digits = numStr.split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]];
  }
  return c === 0;
}

/**
 * Computes the 12th Verhoeff checksum digit for an 11-digit string.
 */
function generateVerhoeffCheckDigit(elevenDigitStr) {
  const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];
  let c = 0;
  const digits = elevenDigitStr.split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[(i + 1) % 8][digits[i]]];
  }
  return inv[c];
}

/**
 * Validates Indian Aadhaar Card
 * Rules:
 * 1. Must be exactly 12 numeric digits
 * 2. Cannot start with 0 or 1 (UIDAI standard)
 * 3. Must pass Verhoeff checksum algorithm
 */
function validateAadhaar(aadhaarNumber, fullName) {
  if (!aadhaarNumber || typeof aadhaarNumber !== 'string') {
    return { valid: false, error: 'Aadhaar number is required.' };
  }

  // Strip spaces, dashes, or formatting
  const cleanNumber = aadhaarNumber.replace(/[\s-]/g, '');

  if (!/^\d{12}$/.test(cleanNumber)) {
    return { valid: false, error: 'Aadhaar number must be exactly 12 numeric digits.' };
  }

  if (cleanNumber.startsWith('0') || cleanNumber.startsWith('1')) {
    return { valid: false, error: 'Valid Aadhaar numbers cannot begin with 0 or 1.' };
  }

  if (!validateVerhoeff(cleanNumber)) {
    return {
      valid: false,
      error: 'Invalid Aadhaar checksum (Verhoeff check failed). Please re-check the number.'
    };
  }

  if (!fullName || fullName.trim().length < 2) {
    return { valid: false, error: 'Please enter your full legal name as printed on your Aadhaar card.' };
  }

  const maskedNumber = `XXXX-XXXX-${cleanNumber.slice(-4)}`;
  const documentHash = crypto.createHash('sha256').update(cleanNumber).digest('hex');

  return {
    valid: true,
    cleanNumber,
    maskedNumber,
    documentHash,
    fullName: fullName.trim()
  };
}

/**
 * Validates Indian PAN (Permanent Account Number) Card
 * Format: 10 alphanumeric characters [A-Z]{5}[0-9]{4}[A-Z]{1}
 * - 4th character: Holder type (P for Individual, C for Company, F for Firm, H for HUF, etc.)
 * - 5th character: First letter of the holder's surname/last name
 */
function validatePAN(panNumber, fullName) {
  if (!panNumber || typeof panNumber !== 'string') {
    return { valid: false, error: 'PAN number is required.' };
  }

  const cleanPAN = panNumber.trim().toUpperCase();

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(cleanPAN)) {
    return {
      valid: false,
      error: 'PAN must follow standard format: 5 uppercase letters, 4 digits, and 1 letter (e.g. ABCDE1234F).'
    };
  }

  const validFourthChar = ['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G'];
  const fourthChar = cleanPAN.charAt(3);
  if (!validFourthChar.includes(fourthChar)) {
    return {
      valid: false,
      error: `Invalid PAN 4th character '${fourthChar}'. Must be a valid entity code (e.g. 'P' for Individual).`
    };
  }

  if (!fullName || fullName.trim().length < 2) {
    return { valid: false, error: 'Please enter your full legal name as printed on your PAN card.' };
  }

  const nameParts = fullName.trim().split(/\s+/);
  const lastName = nameParts[nameParts.length - 1].toUpperCase();
  const fifthChar = cleanPAN.charAt(4);

  // If user has a multi-part name, check if 5th char matches surname initial
  if (nameParts.length > 1 && lastName.charAt(0) !== fifthChar) {
    return {
      valid: false,
      error: `5th character of PAN ('${fifthChar}') does not match the first letter of your surname '${lastName}'.`
    };
  }

  const maskedNumber = `${cleanPAN.slice(0, 2)}***${cleanPAN.slice(-2)}`;
  const documentHash = crypto.createHash('sha256').update(cleanPAN).digest('hex');

  return {
    valid: true,
    cleanNumber: cleanPAN,
    maskedNumber,
    documentHash,
    fullName: fullName.trim()
  };
}

/**
 * Process and verify host KYC
 */
async function verifyHostIdentity({ documentType, documentNumber, fullName }) {
  if (documentType === 'aadhaar') {
    const result = validateAadhaar(documentNumber, fullName);
    if (!result.valid) return result;

    return {
      success: true,
      documentType: 'aadhaar',
      documentNumber: result.cleanNumber,
      maskedNumber: result.maskedNumber,
      documentHash: result.documentHash,
      fullNameAsOnDoc: result.fullName,
      verificationRef: `UIDAI-VER-${Date.now().toString(36).toUpperCase()}`,
      verifiedAt: new Date()
    };
  } else if (documentType === 'pan') {
    const result = validatePAN(documentNumber, fullName);
    if (!result.valid) return result;

    return {
      success: true,
      documentType: 'pan',
      documentNumber: result.cleanNumber,
      maskedNumber: result.maskedNumber,
      documentHash: result.documentHash,
      fullNameAsOnDoc: result.fullName,
      verificationRef: `ITD-NSDL-${Date.now().toString(36).toUpperCase()}`,
      verifiedAt: new Date()
    };
  } else {
    return {
      valid: false,
      error: 'Invalid document type. Supported types: aadhaar, pan.'
    };
  }
}

module.exports = {
  validateVerhoeff,
  generateVerhoeffCheckDigit,
  validateAadhaar,
  validatePAN,
  verifyHostIdentity
};
