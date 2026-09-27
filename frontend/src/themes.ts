import type { ThemeConfig } from 'antd';
import type { User } from './services/authService';

const fontFamily = '"Noto Sans Thai", Arial, sans-serif';
const sharedTokens = {
  fontFamily,
  colorTextPlaceholder: '#526675',
  borderRadius: 10,
  borderRadiusLG: 14,
  controlHeight: 44,
};

// Role palettes from DESIGN.md. Containers use surface, not page background.
export const themeUser: ThemeConfig = {
  token: {
    ...sharedTokens,
    colorPrimary: '#3F76C9',
    colorPrimaryHover: '#3266B4',
    colorPrimaryActive: '#285EA8',
    colorPrimaryBg: '#E8F2FF',
    colorLink: '#285EA8',
    colorLinkHover: '#3266B4',
    colorBgLayout: '#EAF4FF',
    colorTextSecondary: '#5D7390',
    colorTextPlaceholder: '#5D7390',
    colorBorder: '#B8C0CB',
    colorBorderSecondary: '#D5E5F8',
    colorBgContainer: '#FFFFFF',
    colorText: '#294F80',
    fontFamily,
  },
  components: {
    Menu: { itemSelectedBg: '#E5F0FF', itemSelectedColor: '#285EA8', itemColor: '#5F7185', itemHeight: 44 },
    Button: { primaryShadow: 'none' },
  },
};

export const themePsychologist: ThemeConfig = {
  token: {
    ...sharedTokens,
    colorPrimary: '#475569',
    colorPrimaryHover: '#334155',
    colorPrimaryActive: '#334155',
    colorPrimaryBg: '#F1F5F9',
    colorBgLayout: '#F8FAFC',
    colorBgContainer: '#FFFFFF',
    colorText: '#1E293B',
    colorTextSecondary: '#64748B',
    colorTextTertiary: '#64748B',
    colorTextDescription: '#64748B',
    colorTextPlaceholder: '#64748B',
    colorLink: '#2563EB',
    colorLinkHover: '#334155',
    colorBorderSecondary: '#E2E8F0',
    colorInfo: '#2563EB',
    colorSuccess: '#16805C',
    colorWarning: '#B45309',
    colorError: '#C2413B',
    fontFamily,
  },
  components: {
    Menu: { itemSelectedBg: '#F1F5F9', itemSelectedColor: '#475569', itemHeight: 44 },
    Button: { primaryShadow: 'none' },
  },
};

export const themeAdmin: ThemeConfig = {
  token: {
    ...sharedTokens,
    colorPrimary: '#166534',
    colorBgContainer: '#FFFFFF',
    colorText: '#172B3A',
    fontFamily,
  },
};

const roleThemes: Record<User['role'], ThemeConfig> = {
  user: themeUser,
  psychologist: themePsychologist,
  admin: themeAdmin,
};

export function getThemeForRole(role?: User['role']): ThemeConfig {
  return role ? roleThemes[role] ?? themeUser : themeUser;
}
