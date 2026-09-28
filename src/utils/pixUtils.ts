/**
 * Pix BR Code (EMVCo / Banco Central do Brasil) Generator
 * Strictly follows BCB specifications with valid TLV structure and CRC16-CCITT checksum.
 */

export interface PixPayloadOptions {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  txId?: string;
  description?: string;
  omitInitiationMethod?: boolean;
}

function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Normalizes text to ASCII uppercase, removing accents and special symbols
 * as required by EMVCo / BCB standards.
 */
function normalizeAscii(str: string, maxLength: number): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

/**
 * Calculates CRC16-CCITT (polynomial 0x1021, init 0xFFFF, false/false)
 * Specification standard for Banco Central do Brasil Pix BRCode.
 */
export function computePixCRC16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Cleans and formats Pix key according to its type:
 * - Phone: international format with +55 (e.g. +5548988487037)
 * - CPF: 11 numeric digits only
 * - Email: lowercase trimmed
 * - Random: UUID / EVP string
 */
export function formatPixKey(rawKey: string, keyType?: 'phone' | 'cpf' | 'email' | 'random' | 'auto'): string {
  const trimmed = (rawKey || '').trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (keyType === 'phone') {
    if (trimmed.startsWith('+')) return trimmed;
    if (digitsOnly.length === 10 || digitsOnly.length === 11) {
      return `+55${digitsOnly}`;
    }
    if (digitsOnly.startsWith('55') && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
      return `+${digitsOnly}`;
    }
    return trimmed.startsWith('+') ? trimmed : `+55${digitsOnly}`;
  }

  if (keyType === 'cpf') {
    return digitsOnly;
  }

  if (keyType === 'email') {
    return trimmed.toLowerCase();
  }

  if (keyType === 'random') {
    return trimmed;
  }

  // Auto-detect
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  if (trimmed.length === 36 && (trimmed.match(/-/g) || []).length === 4) {
    return trimmed;
  }

  // If 11 digits starting with common DDD (e.g. 48, 11, 21, etc.) and has 9 in 3rd position
  if (digitsOnly.length === 11 && (digitsOnly[2] === '9' || digitsOnly[2] === '8')) {
    return `+55${digitsOnly}`;
  }

  return trimmed;
}

/**
 * Generates a standard, valid Banco Central do Brasil Pix Copia e Cola payload.
 * Strictly complies with BCB Manual de Padrões para Iniciação do Pix (EMVCo BR Code).
 */
export function generatePixPayload(options: PixPayloadOptions): string {
  const {
    pixKey,
    merchantName = 'CINEFLIX',
    merchantCity = 'SAO PAULO',
    amount,
    txId = 'CINEFLIX',
  } = options;

  // 1. Payload Format Indicator (ID 00)
  let payload = formatTLV('00', '01');

  // 2. Point of Initiation Method (ID 01)
  // For static QR codes, '11' or omission is supported. Omitting avoids dynamic URL confusion on some banks.
  // We omit ID 01 by default for static payments, or include '11' if explicitly needed.
  if (!options.omitInitiationMethod) {
    payload += formatTLV('01', '11');
  }

  // 3. Merchant Account Information (Tag 26)
  const gui = formatTLV('00', 'br.gov.bcb.pix');
  const keyFormatted = formatTLV('01', pixKey.trim());
  const merchantAccountInfo = gui + keyFormatted;
  payload += formatTLV('26', merchantAccountInfo);

  // 4. Merchant Category Code (Tag 52)
  payload += formatTLV('52', '0000');

  // 5. Transaction Currency (Tag 53): 986 = BRL
  payload += formatTLV('53', '986');

  // 6. Transaction Amount (Tag 54) - optional in static, included when amount > 0
  if (amount !== undefined && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatTLV('54', formattedAmount);
  }

  // 7. Country Code (Tag 58)
  payload += formatTLV('58', 'BR');

  // 8. Merchant Name (Tag 59) - max 25 chars
  const cleanName = normalizeAscii(merchantName, 25) || 'CINEFLIX';
  payload += formatTLV('59', cleanName);

  // 9. Merchant City (Tag 60) - max 15 chars
  const cleanCity = normalizeAscii(merchantCity, 15) || 'SAO PAULO';
  payload += formatTLV('60', cleanCity);

  // 10. Additional Data Field Template (Tag 62)
  // TxID: 1 to 25 alphanumeric chars. Using alphanumeric 'CINEFLIX' avoids bank app errors with '***'
  const rawTxId = txId === '***' ? 'CINEFLIX' : txId;
  const cleanTxId = rawTxId.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || 'CINEFLIX';
  const additionalData = formatTLV('05', cleanTxId);
  payload += formatTLV('62', additionalData);

  // 11. CRC16 (Tag 63)
  const payloadToHash = payload + '6304';
  const checksum = computePixCRC16(payloadToHash);

  return payloadToHash + checksum;
}
