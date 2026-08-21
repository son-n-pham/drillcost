import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DISPLAY_CURRENCY, DEFAULT_USD_TO_PHP_RATE, EXCHANGE_RATE_CACHE_TTL_MS } from '../constants';
import { CurrencyCode, CurrencyPresentation, ExchangeRateCache } from '../types';
import { fetchExchangeRate, isCurrencyCode, isFreshRate, readCachedRate, writeCachedRate } from '../utils/currency';

interface UseCurrencyResult extends CurrencyPresentation {
  setCurrency: (currency: CurrencyCode) => void;
  refreshRate: () => Promise<void>;
}

export const useCurrency = (initialCurrency: unknown = DEFAULT_DISPLAY_CURRENCY): UseCurrencyResult => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(isCurrencyCode(initialCurrency) ? initialCurrency : DEFAULT_DISPLAY_CURRENCY);
  const [cache, setCache] = useState<ExchangeRateCache>(() => readCachedRate() ?? {
    rate: DEFAULT_USD_TO_PHP_RATE,
    fetchedAt: 0,
    rateDate: '',
    source: 'fallback',
  });
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const refreshRate = useCallback(async () => {
    const cached = readCachedRate();
    if (cached && isFreshRate(cached)) {
      setCache(cached);
      return;
    }

    if (cached) setCache({ ...cached, source: 'stale-cache' });
    setIsRateLoading(true);
    setRateError(null);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const nextCache = await fetchExchangeRate(controller.signal);
      writeCachedRate(nextCache);
      setCache(nextCache);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setRateError('Live exchange rate unavailable');
        if (!cached) setCache({ rate: DEFAULT_USD_TO_PHP_RATE, fetchedAt: 0, rateDate: '', source: 'fallback' });
      }
    } finally {
      if (requestRef.current === controller) setIsRateLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRate();
    return () => requestRef.current?.abort();
  }, [refreshRate]);

  const setCurrency = useCallback((nextCurrency: CurrencyCode) => {
    setCurrencyState(nextCurrency);
    if (nextCurrency === 'PHP') void refreshRate();
  }, [refreshRate]);

  return {
    currency,
    rate: cache.rate,
    isRateLoading,
    rateError,
    rateSource: cache.source,
    fetchedAt: cache.fetchedAt || null,
    rateDate: cache.rateDate || null,
    setCurrency,
    refreshRate,
  };
};

export default useCurrency;