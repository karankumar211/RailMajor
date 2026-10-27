import { createSlice } from '@reduxjs/toolkit';

const getStoredToken = () => {
  try {
    return localStorage.getItem('railopt_token') || null;
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('railopt_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialToken = getStoredToken();
const initialUser = getStoredUser();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: initialToken,
    user: initialUser,
    isAuthenticated: Boolean(initialToken),
  },
  reducers: {
    setCredentials: (state, action) => {
      const { access_token, user } = action.payload;
      state.token = access_token;
      state.user = user;
      state.isAuthenticated = true;
      try {
        localStorage.setItem('railopt_token', access_token);
        localStorage.setItem('railopt_user', JSON.stringify(user));
      } catch (err) {
        console.error('Failed to persist auth state:', err);
      }
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      try {
        localStorage.removeItem('railopt_token');
        localStorage.removeItem('railopt_user');
      } catch (err) {
        console.error('Failed to clear auth state:', err);
      }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
