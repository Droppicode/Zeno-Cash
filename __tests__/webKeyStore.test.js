import { createWebKeyStore } from '../src/services/ai/webKeyStore';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
};

describe('web AI key storage', () => {
  let local;
  let session;
  let store;

  beforeEach(() => {
    local = createStorage();
    session = createStorage();
    store = createWebKeyStore({ local, session });
  });

  it('remembers a key in local storage when requested', () => {
    store.set('gemini', 'test-key', true);

    expect(local.getItem('llmKey_gemini')).toBe('test-key');
    expect(session.getItem('llmKey_gemini')).toBeNull();
    expect(store.isRemembered('gemini')).toBe(true);
  });

  it('keeps a non-remembered key in session storage only', () => {
    store.set('gemini', 'test-key', false);

    expect(session.getItem('llmKey_gemini')).toBe('test-key');
    expect(local.getItem('llmKey_gemini')).toBeNull();
    expect(store.isRemembered('gemini')).toBe(false);
  });

  it('moves the key when the remember setting changes', () => {
    store.set('gemini', 'test-key', false);
    store.set('gemini', 'test-key', true);
    expect(local.getItem('llmKey_gemini')).toBe('test-key');
    expect(session.getItem('llmKey_gemini')).toBeNull();

    store.set('gemini', 'test-key', false);
    expect(session.getItem('llmKey_gemini')).toBe('test-key');
    expect(local.getItem('llmKey_gemini')).toBeNull();
  });

  it('removes the key from both storages', () => {
    local.setItem('llmKey_gemini', 'local-key');
    session.setItem('llmKey_gemini', 'session-key');

    store.remove('gemini');

    expect(local.getItem('llmKey_gemini')).toBeNull();
    expect(session.getItem('llmKey_gemini')).toBeNull();
  });

  it('prefers the session value when both storages contain a key', () => {
    local.setItem('llmKey_gemini', 'local-key');
    session.setItem('llmKey_gemini', 'session-key');

    expect(store.get('gemini')).toBe('session-key');
  });
});
