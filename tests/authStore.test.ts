jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
  isSupabaseConfigured: false,
}));

import { useAuthStore } from '../stores/authStore';

describe('authentication configuration guard', () => {
  beforeEach(() => {
    useAuthStore.setState({ isLoading: false, error: null, session: null, user: null, profile: null });
  });

  test('does not call a dummy endpoint when Supabase is unconfigured', async () => {
    const response = await useAuthStore.getState().signUp('new@example.com', 'safe-password', 'New');

    expect(response.error).toContain('Account creation is not configured');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
