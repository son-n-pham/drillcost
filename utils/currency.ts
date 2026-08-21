import {
  EXCHANGE_RATE_CACHE_TTL_MS,
  EXCHANGE_RATE_CACHE_KEY,
  FRANKFURTER_RATE_URL,
} from '../constants';
import { CurrencyCode, ExchangeRateCache } from '../types';

export const isCurrencyCode = (value: unknown): value is CurrencyCode => value === 'USD' || value === 'PHP';

export const isValidRate = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0
);

export const toDisplayAmount = (usdAmount: number, currency: CurrencyCode, rate: number): number => (
  currency === 'PHP' ? usdAmount * rate : usdAmount
);

export const toBaseAmount = (displayAmount: number, currency: CurrencyCode, rate: number): number => (
  currency === 'PHP' ? displayAmount / rate : displayAmount
);

export const getCurrencySymbol = (currency: CurrencyCode): string => currency === 'PHP' ? '₱' : '$';

export const formatMoney = (
  usdAmount: number,
  currency: CurrencyCode,
  rate: number,
  options: Intl.NumberFormatOptions = {}
): string => new Intl.NumberFormat(currency === 'PHP' ? 'en-PH' : 'en-US', {
  maximumFractionDigits: 0,
  ...options,
  style: 'currency',
  currency,
}).format(toDisplayAmount(usdAmount, currency, rate));

export const formatCompactMoney = (usdAmount: number, currency: CurrencyCode, rate: number): string => {
  const amount = toDisplayAmount(usdAmount, currency, rate) / 1000;
  return `${getCurrencySymbol(currency)}${amount.toLocaleString(currency === 'PHP' ? 'en-PH' : 'en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}k`;
};

export const readCachedRate = (): ExchangeRateCache | null => {
  try {
    const raw = localStorage.getItem(EXCHANGE_RATE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExchangeRateCache>;
    if (!isValidRate(parsed.rate) || typeof parsed.fetchedAt !== 'number' || typeof parsed.rateDate !== 'string') return null;
    return {
      rate: parsed.rate,
      fetchedAt: parsed.fetchedAt,
      rateDate: parsed.rateDate,
      source: parsed.source === 'fallback' || parsed.source === 'stale-cache' ? parsed.source : 'api',
    };
  } catch {
    return null;
  }
};

export const writeCachedRate = (cache: ExchangeRateCache): void => {
  try {
    localStorage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage is optional; the in-memory rate remains usable.
  }
};

export const isFreshRate = (cache: ExchangeRateCache, now = Date.now()): boolean => (
  now - cache.fetchedAt < EXCHANGE_RATE_CACHE_TTL_MS
);

export const fetchExchangeRate = async (signal?: AbortSignal): Promise<ExchangeRateCache> => {
  const response = await fetch(FRANKFURTER_RATE_URL, { signal });
  if (!response.ok) throw new Error(`Exchange rate request failed (${response.status})`);
  const data = await response.json() as { base?: string; date?: string; rates?: { PHP?: number } };
  if (data.base !== 'USD' || !data.date || !isValidRate(data.rates?.PHP)) {
    throw new Error('Exchange rate response was invalid');
  }
  return { rate: data.rates.PHP, fetchedAt: Date.now(), rateDate: data.date, source: 'api' };
};