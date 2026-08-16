import React, { createContext, useState, useEffect } from 'react';
import { db } from '../database/db';
import { settings } from '../database/schema';
import { eq } from 'drizzle-orm';

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [accentColor, setAccentColor] = useState('#BB86FC');
  const [defaultPeriod, setDefaultPeriod] = useState('30d');
  const [llmKey, setLlmKey] = useState('');
  const [uiConfig, setUiConfig] = useState({
    homeShowPending: true,
    homeShowAccounts: true,
    analyticsShowVilao: true,
    transactionsShowFilters: true,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await db.select().from(settings);
        data.forEach(item => {
          if (item.key === 'accentColor') setAccentColor(item.value);
          if (item.key === 'defaultPeriod') setDefaultPeriod(item.value);
          if (item.key === 'llmKey') setLlmKey(item.value);
          if (item.key === 'uiConfig') setUiConfig(JSON.parse(item.value));
        });
      } catch (err) {
        console.log('Erro loadSettingsContext:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const saveSetting = async (key, value) => {
    // Update local state instantly for fast UI
    if (key === 'accentColor') setAccentColor(value);
    if (key === 'defaultPeriod') setDefaultPeriod(value);
    if (key === 'llmKey') setLlmKey(value);
    if (key === 'uiConfig') setUiConfig(value);

    // Save to database
    try {
      const strValue = typeof value === 'string' ? value : JSON.stringify(value);
      const existing = await db.select().from(settings).where(eq(settings.key, key));
      if (existing.length > 0) {
        await db.update(settings).set({ value: strValue }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value: strValue });
      }
    } catch (err) {
      console.log('Erro saveSettingContext:', err);
    }
  };

  return (
    <SettingsContext.Provider value={{ accentColor, defaultPeriod, llmKey, uiConfig, saveSetting, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
};
