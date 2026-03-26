import { hexToString, stringToHex } from 'viem';

export function encodeTaskText(value) {
  return stringToHex(value.trim().slice(0, 31), { size: 32 });
}

export function decodeTaskText(value) {
  try {
    return hexToString(value, { size: 32 }).replace(/\u0000/g, '') || 'Empty task';
  } catch {
    return value;
  }
}

export function normalizeIndex(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric < 0) {
    return 0;
  }
  return Math.floor(numeric);
}

export function shortenAddress(value) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : '';
}

export function isAscii(value) {
  return /^[\x00-\x7F]*$/.test(value);
}

export function getReadableError(error) {
  const candidates = [
    error?.shortMessage,
    error?.message,
    error?.cause?.shortMessage,
    error?.cause?.message,
    error?.details,
  ];

  const message = candidates.find(Boolean);
  if (!message) {
    return 'Transaction failed before it could be sent.';
  }

  return String(message).split('\n')[0];
}
