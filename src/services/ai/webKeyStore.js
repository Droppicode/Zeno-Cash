export const createWebKeyStore = ({ local, session }) => ({
  get(provider) {
    const key = `llmKey_${provider}`;
    return session?.getItem(key) || local?.getItem(key) || '';
  },
  set(provider, value, remember) {
    const key = `llmKey_${provider}`;
    if (!value) {
      local?.removeItem(key);
      session?.removeItem(key);
    } else if (remember) {
      local?.setItem(key, value);
      session?.removeItem(key);
    } else {
      session?.setItem(key, value);
      local?.removeItem(key);
    }
  },
  remove(provider) {
    const key = `llmKey_${provider}`;
    local?.removeItem(key);
    session?.removeItem(key);
  },
  isRemembered(provider) {
    return Boolean(local?.getItem(`llmKey_${provider}`));
  }
});

const getWindowStorage = name => {
  try {
    return typeof window === 'undefined' ? null : window[name];
  } catch (error) {
    return null;
  }
};

export default createWebKeyStore({
  local: getWindowStorage('localStorage'),
  session: getWindowStorage('sessionStorage')
});
