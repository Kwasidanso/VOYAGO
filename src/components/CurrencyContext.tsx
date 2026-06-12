import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  rate: number; // multiplier from USD
  label: string;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', rate: 1.0, label: 'US Dollar ($)' },
  EUR: { code: 'EUR', symbol: '€', rate: 0.92, label: 'Euro (€)' },
  GBP: { code: 'GBP', symbol: '£', rate: 0.79, label: 'British Pound (£)' },
  JPY: { code: 'JPY', symbol: '¥', rate: 156.4, label: 'Japanese Yen (¥)' },
  CAD: { code: 'CAD', symbol: 'C$', rate: 1.37, label: 'Canadian Dollar (C$)' },
};

interface CurrencyContextType {
  currency: CurrencyConfig;
  setCurrencyCode: (code: string) => void;
  formatPrice: (usdPrice: number) => string;
  convertPrice: (usdPrice: number) => { value: number; symbol: string; code: string };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Detect default currency based on system locale or default to USD
  const [currency, setCurrency] = useState<CurrencyConfig>(CURRENCIES.USD);

  useEffect(() => {
    const savedCurrency = localStorage.getItem('voyago_currency');
    if (savedCurrency && CURRENCIES[savedCurrency]) {
      setCurrency(CURRENCIES[savedCurrency]);
    } else {
      // Auto-identify based on browser locale
      try {
        const locale = navigator.language.toLowerCase();
        if (locale.includes('gb') || locale.includes('en-gb')) {
          setCurrency(CURRENCIES.GBP);
        } else if (locale.includes('ca')) {
          setCurrency(CURRENCIES.CAD);
        } else if (locale.includes('jp')) {
          setCurrency(CURRENCIES.JPY);
        } else if (
          locale.includes('fr') || 
          locale.includes('de') || 
          locale.includes('it') || 
          locale.includes('es') || 
          locale.includes('nl')
        ) {
          setCurrency(CURRENCIES.EUR);
        }
      } catch (e) {
        // fallback to USD
      }
    }
  }, []);

  const setCurrencyCode = (code: string) => {
    if (CURRENCIES[code]) {
      setCurrency(CURRENCIES[code]);
      localStorage.setItem('voyago_currency', code);
    }
  };

  const convertPrice = (usdPrice: number) => {
    const value = Math.round(usdPrice * currency.rate);
    return {
      value,
      symbol: currency.symbol,
      code: currency.code
    };
  };

  const formatPrice = (usdPrice: number) => {
    const converted = convertPrice(usdPrice);
    if (currency.code === 'JPY') {
      return `${converted.symbol}${converted.value.toLocaleString()}`;
    }
    return `${converted.symbol}${converted.value.toLocaleString()}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, formatPrice, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};
