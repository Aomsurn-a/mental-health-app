import React, { createContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/authService';
import type { User } from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true, loading: false, error: null };
    case 'SET_ERROR':
      return { ...state, user: null, isAuthenticated: false, loading: false, error: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, loading: false, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const checkAuth = async () => {
      const token = authService.getToken();
      if (token) {
        try {
          const user = await authService.getMe();
          dispatch({ type: 'SET_USER', payload: user });
        } catch {
          authService.removeToken();
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const response = await authService.login({ email, password });
      authService.setToken(response.token);
      dispatch({ type: 'SET_USER', payload: response.user });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ';
      dispatch({ type: 'SET_ERROR', payload: msg });
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, firstName?: string, lastName?: string) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const response = await authService.register({ username, email, password, first_name: firstName, last_name: lastName });
      authService.setToken(response.token);
      dispatch({ type: 'SET_USER', payload: response.user });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'สมัครสมาชิกไม่สำเร็จ';
      dispatch({ type: 'SET_ERROR', payload: msg });
      throw error;
    }
  };

  const logout = () => {
    authService.removeToken();
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};