import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../database/db';
import { settings } from '../database/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import * as SecureStore from 'expo-secure-store';

export const SettingsContext = createContext();

const defaultTheme = {
  id: 'default_dark',
  name: 'Escuro Padrão',
  background: '#121212',
  card: '#1E1E1E',
  cardSecondary: '#2C2C2C',
  text: '#FFFFFF',
  textSecondary: '#888888',
  accent: '#BB86FC',
  income: '#4CAF50',
  expense: '#F44336',
  zoom: 1,
  fontFamily: 'monospace'
};

const defaultLightTheme = {
  id: 'default_light',
  name: 'Claro Padrão',
  background: '#F5F5F5',
  card: '#FFFFFF',
  cardSecondary: '#E0E0E0',
  text: '#121212',
  textSecondary: '#555555',
  accent: '#6200EA',
  income: '#2E7D32',
  expense: '#D32F2F',
  zoom: 1,
  fontFamily: 'monospace'
};

const EXTRA_PRESETS = [
  {
    id: 'preset_shark',
    name: 'Shark Blue',
    background: '#0B132B',
    card: '#1C2541',
    cardSecondary: '#3A506B',
    text: '#FFFFFF',
    textSecondary: '#5BC0BE',
    accent: '#6FFFE9',
    income: '#4CAF50',
    expense: '#FF5252'
  },
  {
    id: 'preset_sienna',
    name: 'Sienna',
    background: '#3E2723',
    card: '#4E342E',
    cardSecondary: '#5D4037',
    text: '#EFEBE9',
    textSecondary: '#BCAAA4',
    accent: '#FF7043',
    income: '#66BB6A',
    expense: '#EF5350'
  },
  {
    id: 'preset_dreamy',
    name: 'Dreamy',
    background: '#FCE4EC',
    card: '#F8BBD0',
    cardSecondary: '#F48FB1',
    text: '#4A148C',
    textSecondary: '#7B1FA2',
    accent: '#E040FB',
    income: '#00B8D4',
    expense: '#FF1744'
  },
  {
    id: 'preset_matte',
    name: 'Matte',
    background: '#263238',
    card: '#37474F',
    cardSecondary: '#455A64',
    text: '#ECEFF1',
    textSecondary: '#90A4AE',
    accent: '#78909C',
    income: '#81C784',
    expense: '#E57373'
  },
  {
    id: 'preset_sleek',
    name: 'Sleek',
    background: '#000000',
    card: '#111111',
    cardSecondary: '#222222',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    accent: '#FFFFFF',
    income: '#FFFFFF',
    expense: '#444444'
  },
  {
    id: 'preset_starry',
    name: 'Starry Night',
    background: '#0A0A2A',
    card: '#14143D',
    cardSecondary: '#1C1C5E',
    text: '#F2F2F2',
    textSecondary: '#B8B8FF',
    accent: '#FFD700',
    income: '#00FFCC',
    expense: '#FF3366'
  },
  {
    id: 'preset_galaxy',
    name: 'Galaxy',
    background: '#120024',
    card: '#2A004F',
    cardSecondary: '#3F0071',
    text: '#FFFFFF',
    textSecondary: '#D180FF',
    accent: '#FF007F',
    income: '#00E5FF',
    expense: '#FF1744'
  },
  {
    id: 'preset_cappuccino',
    name: 'Cappuccino',
    background: '#EFEBE9',
    card: '#D7CCC8',
    cardSecondary: '#BCAAA4',
    text: '#3E2723',
    textSecondary: '#5D4037',
    accent: '#8D6E63',
    income: '#388E3C',
    expense: '#D32F2F'
  },
  {
    id: 'preset_tokyo',
    name: 'Tokyo',
    background: '#1A1A2E',
    card: '#16213E',
    cardSecondary: '#0F3460',
    text: '#E94560',
    textSecondary: '#A0AAB2',
    accent: '#FF2E93',
    income: '#08D9D6',
    expense: '#FF2A2A'
  }
].map(preset => ({ ...preset, zoom: 1, fontFamily: 'monospace' }));

export const SettingsProvider = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState(defaultTheme);
  const [customThemes, setCustomThemes] = useState([defaultTheme, defaultLightTheme, ...EXTRA_PRESETS]);
  const [defaultPeriod, setDefaultPeriod] = useState('30d');
  const [llmProvider, setLlmProvider] = useState('openai');
  const [llmModel, setLlmModel] = useState('');
  const [llmKey, setLlmKey] = useState('');
  
  const [uiConfig, setUiConfig] = useState({
    homeShowPending: true,
    homeShowAccounts: true,
    analyticsShowCharts: true,
    transactionsShowFilters: true,
    showInvestmentsTab: false,
    analyticsModulesOrder: ['kpis', 'monthly', 'composition', 'cashflow', 'heatmap', 'ranking', 'accounts', 'recurrence', 'villains', 'insights'],
  });

  const [backupLimit, setBackupLimit] = useState('5');
  const [backupFrequency, setBackupFrequency] = useState('daily');

  const [macroTargets, setMacroTargets] = useState({
    'Essenciais': 50,
    'Estilo de Vida': 30,
    'Investimento': 20,
    'Outros': 0
  });

  const [macroOptions, setMacroOptions] = useState(['Essenciais', 'Estilo de Vida', 'Investimento']);
  const [macroMapping, setMacroMapping] = useState({});

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await db.select().from(settings);
        
        let loadedThemes = [defaultTheme, defaultLightTheme];
        let hasInitializedThemes = false;
        
        data.forEach(item => {
          if (item.key === 'themesInitialized') hasInitializedThemes = item.value === 'true';
          if (item.key === 'activeTheme') setActiveTheme(JSON.parse(item.value));
          if (item.key === 'customThemes') {
            const parsedThemes = JSON.parse(item.value);
            const hasDark = parsedThemes.some(t => t.id === 'default_dark');
            const hasLight = parsedThemes.some(t => t.id === 'default_light');
            
            let finalThemes = [...parsedThemes];
            if (!hasDark) finalThemes.unshift(defaultTheme);
            if (!hasLight) finalThemes.push(defaultLightTheme);
            
            loadedThemes = finalThemes;
          }
          if (item.key === 'defaultPeriod') setDefaultPeriod(item.value);
          if (item.key === 'llmProvider') setLlmProvider(item.value);
          if (item.key === 'llmModel') setLlmModel(item.value);
          // Omit loading llmKey from db
          if (item.key === 'uiConfig') setUiConfig(JSON.parse(item.value));
          if (item.key === 'macroTargets') setMacroTargets(JSON.parse(item.value));
          if (item.key === 'macroMapping') setMacroMapping(JSON.parse(item.value));
          if (item.key === 'macroOptions') setMacroOptions(JSON.parse(item.value));
          if (item.key === 'backupLimit') setBackupLimit(item.value);
          if (item.key === 'backupFrequency') setBackupFrequency(item.value);
        });
        
        if (!hasInitializedThemes) {
          loadedThemes = [...loadedThemes, ...EXTRA_PRESETS];
          await db.insert(settings).values({ key: 'themesInitialized', value: 'true' }).onConflictDoNothing?.();
          await saveSettingInternal('customThemes', loadedThemes);
        }
        
        setCustomThemes(loadedThemes);

        // Load active provider from db, then fetch its secure key
        const providerFromDb = data.find(i => i.key === 'llmProvider')?.value || 'openai';
        try {
          const secureKey = await SecureStore.getItemAsync(`llmKey_${providerFromDb}`);
          if (secureKey) setLlmKey(secureKey);
        } catch(e) { Logger.error('SecureStore init', e); }

        // Clean up legacy unencrypted key
        const hasLegacyKey = data.some(i => i.key === 'llmKey');
        if (hasLegacyKey) {
          await db.delete(settings).where(eq(settings.key, 'llmKey'));
        }

      } catch (err) {
        Logger.error('SettingsContext.loadSettings', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const saveSettingInternal = async (key, value) => {
    try {
      const strValue = typeof value === 'string' ? value : JSON.stringify(value);
      const existing = await db.select().from(settings).where(eq(settings.key, key));
      if (existing.length > 0) {
        await db.update(settings).set({ value: strValue }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value: strValue });
      }
    } catch (err) {
      Logger.error('SettingsContext.saveSettingInternal', err);
    }
  };

  const saveSetting = async (key, value) => {
    // Update local state instantly for fast UI
    if (key === 'activeTheme') setActiveTheme(value);
    if (key === 'customThemes') setCustomThemes(value);
    if (key === 'defaultPeriod') setDefaultPeriod(value);
    if (key === 'llmProvider') {
      setLlmProvider(value);
      getSecureKey(value).then(k => setLlmKey(k));
    }
    if (key === 'llmModel') setLlmModel(value);
    // Do not set llmKey in local db here
    if (key === 'uiConfig') setUiConfig(value);
    if (key === 'macroTargets') setMacroTargets(value);
    if (key === 'macroMapping') setMacroMapping(value);
    if (key === 'macroOptions') setMacroOptions(value);
    if (key === 'backupLimit') setBackupLimit(value);
    if (key === 'backupFrequency') setBackupFrequency(value);

    if (key !== 'llmKey') {
      await saveSettingInternal(key, value);
    }
  };

  const getSecureKey = async (provider) => {
    try {
      return await SecureStore.getItemAsync(`llmKey_${provider}`) || '';
    } catch (err) {
      Logger.error('SecureStore.getItemAsync', err);
      return '';
    }
  };

  const saveSecureKey = async (provider, keyStr) => {
    try {
      if (keyStr) {
        await SecureStore.setItemAsync(`llmKey_${provider}`, keyStr);
      } else {
        await SecureStore.deleteItemAsync(`llmKey_${provider}`);
      }
      if (provider === llmProvider) {
        setLlmKey(keyStr);
      }
    } catch (err) {
      Logger.error('SecureStore.setItemAsync', err);
    }
  };

  const contextValue = useMemo(() => ({
    activeTheme, customThemes, defaultPeriod, llmProvider, llmModel, llmKey, uiConfig, macroTargets,
    macroOptions, macroMapping, backupLimit, backupFrequency,
    isLoaded,
    saveSetting,
    getSecureKey,
    saveSecureKey
  }), [
    activeTheme, customThemes, defaultPeriod, llmProvider, llmModel, llmKey, uiConfig, macroTargets,
    macroOptions, macroMapping, backupLimit, backupFrequency, isLoaded,
    saveSetting, getSecureKey, saveSecureKey
  ]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
