jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn()
}));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-document-picker', () => ({}));
jest.mock('../src/database/db', () => ({ expoDb: {}, flushWebDb: jest.fn() }));
jest.mock('../src/services/TransactionRepository', () => ({ TransactionRepository: {} }));
jest.mock('../src/utils/logger', () => ({ Logger: { error: jest.fn() } }));
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'web' },
  NativeModules: {}
}));

import { readPickedFileAsText } from '../src/services/DataExportService';

describe('readPickedFileAsText on web', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reads the File API asset directly', async () => {
    const text = jest.fn().mockResolvedValue('file contents');

    await expect(readPickedFileAsText({ uri: 'blob:test', file: { text } })).resolves.toBe('file contents');
    expect(text).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches the asset URI when the File API is unavailable', async () => {
    const response = { text: jest.fn().mockResolvedValue('fetched contents') };
    global.fetch.mockResolvedValue(response);

    await expect(readPickedFileAsText({ uri: 'blob:test' })).resolves.toBe('fetched contents');
    expect(global.fetch).toHaveBeenCalledWith('blob:test');
  });
});
