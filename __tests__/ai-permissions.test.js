import {
  DEFAULT_ASSISTANT_PERMISSIONS,
  isToolAllowed,
  resolvePermissions
} from '../src/services/ai/permissions';

describe('AI tool permissions', () => {
  it('resolves partial permissions over the defaults', () => {
    expect(resolvePermissions({ groups: false })).toEqual({
      ...DEFAULT_ASSISTANT_PERMISSIONS,
      groups: false
    });
    expect(resolvePermissions()).toEqual(DEFAULT_ASSISTANT_PERMISSIONS);
  });

  it('allows read tools while write tools follow their permission toggles', () => {
    const permissions = {
      createTransactions: false,
      groups: false,
      settings: false
    };

    expect(isToolAllowed('search_transactions', permissions)).toBe(true);
    expect(isToolAllowed('list_groups', permissions)).toBe(true);
    expect(isToolAllowed('propose_transactions', permissions)).toBe(false);
    expect(isToolAllowed('propose_group', permissions)).toBe(false);
    expect(isToolAllowed('propose_settings_change', permissions)).toBe(false);
  });

  it('allows write tools whose toggles remain enabled by default', () => {
    expect(isToolAllowed('propose_transactions')).toBe(true);
    expect(isToolAllowed('remember_preference')).toBe(true);
  });
});
