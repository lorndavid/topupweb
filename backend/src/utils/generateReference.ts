import { v4 as uuidv4 } from 'uuid';
import { REFERENCE_PREFIX } from '../constants';

export function generateReference(): string {
  const shortId = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${REFERENCE_PREFIX}-${timestamp}-${shortId}`;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
