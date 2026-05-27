/**
 * CRM 主题系统
 * 每个主题包含：name(显示名)、key(标识)、cssVars(CSS 变量)、antdToken(Ant Design token)
 */

const themes = {
  ocean: {
    name: '深海商务',
    key: 'ocean',
    cssVars: {
      '--crm-primary': '#0d9488',
      '--crm-primary-hover': '#0f766e',
      '--crm-primary-active': '#115e59',
      '--crm-primary-light': '#ccfbf1',
      '--crm-primary-bg': '#f0fdfa',

      '--crm-text-primary': '#0f172a',
      '--crm-text-secondary': '#1e293b',
      '--crm-text-body': '#334155',
      '--crm-text-muted': '#64748b',
      '--crm-text-placeholder': '#94a3b8',

      '--crm-border': '#e2e8f0',
      '--crm-border-light': '#f1f5f9',
      '--crm-bg-page': '#f0fdfa',
      '--crm-bg-card': '#ffffff',
      '--crm-bg-dark': '#0f172a',

      '--crm-success': '#10b981',
      '--crm-warning': '#f59e0b',
      '--crm-danger': '#ef4444',
      '--crm-info': '#0d9488',

      '--crm-shadow-sm': '0 1px 3px rgba(0,0,0,0.04)',
      '--crm-shadow-md': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
      '--crm-shadow-lg': '0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.04)',

      '--crm-tag-level-a-bg': '#fef2f2',
      '--crm-tag-level-a-text': '#dc2626',
      '--crm-tag-level-b-bg': '#fffbeb',
      '--crm-tag-level-b-text': '#d97706',
      '--crm-tag-level-c-bg': '#eff6ff',
      '--crm-tag-level-c-text': '#2563eb',

      '--crm-card-inner-bg': '#fafafa',
      '--crm-empty-color': '#cbd5e1',
      '--crm-sub-text-color': '#64748b',

      // 登录页专用
      '--crm-login-left-bg': '#0f172a',
      '--crm-login-right-bg': '#f0fdfa',
      '--crm-login-gradient-from': '#0d9488',
      '--crm-login-gradient-to': '#0f766e',
      '--crm-login-ring-color': 'rgba(13, 148, 136, 0.3)',
      '--crm-login-ring-color-light': 'rgba(13, 148, 136, 0.2)',
      '--crm-login-dot-color': 'rgba(13, 148, 136, 0.1)',
      '--crm-login-line-color': 'rgba(13, 148, 136, 0.15)',
      '--crm-login-accent-color': 'rgba(13, 148, 136, 0.6)',
    },
    antdToken: {
      colorPrimary: '#0d9488',
      colorInfo: '#0d9488',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorBgContainer: '#ffffff',
      colorBorder: '#e2e8f0',
      borderRadius: 10,
    },
    antdComponents: {
      Menu: {
        darkItemBg: 'transparent',
        darkItemSelectedBg: 'rgba(13, 148, 136, 0.15)',
        darkItemSelectedColor: '#0d9488',
        darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
      },
      Layout: {
        siderBg: '#0f172a',
      },
      Button: {
        primaryShadow: '0 2px 0 rgba(13, 148, 136, 0.1)',
      },
    },
    chartColors: ['#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
    siderGradient: 'rgba(13, 148, 136, 0.08)',
  },

  dark: {
    name: '暗夜模式',
    key: 'dark',
    cssVars: {
      '--crm-primary': '#2dd4bf',
      '--crm-primary-hover': '#5eead4',
      '--crm-primary-active': '#14b8a6',
      '--crm-primary-light': 'rgba(45, 212, 191, 0.15)',
      '--crm-primary-bg': 'rgba(45, 212, 191, 0.06)',

      '--crm-text-primary': '#f1f5f9',
      '--crm-text-secondary': '#e2e8f0',
      '--crm-text-body': '#cbd5e1',
      '--crm-text-muted': '#94a3b8',
      '--crm-text-placeholder': '#64748b',

      '--crm-border': '#334155',
      '--crm-border-light': '#1e293b',
      '--crm-bg-page': '#0f172a',
      '--crm-bg-card': '#1e293b',
      '--crm-bg-dark': '#020617',

      '--crm-success': '#34d399',
      '--crm-warning': '#fbbf24',
      '--crm-danger': '#f87171',
      '--crm-info': '#2dd4bf',

      '--crm-shadow-sm': '0 1px 3px rgba(0,0,0,0.3)',
      '--crm-shadow-md': '0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)',
      '--crm-shadow-lg': '0 4px 12px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.3)',

      '--crm-tag-level-a-bg': 'rgba(239, 68, 68, 0.15)',
      '--crm-tag-level-a-text': '#fca5a5',
      '--crm-tag-level-b-bg': 'rgba(245, 158, 11, 0.15)',
      '--crm-tag-level-b-text': '#fcd34d',
      '--crm-tag-level-c-bg': 'rgba(59, 130, 246, 0.15)',
      '--crm-tag-level-c-text': '#93c5fd',

      '--crm-card-inner-bg': '#334155',
      '--crm-empty-color': '#475569',
      '--crm-sub-text-color': '#94a3b8',

      '--crm-login-left-bg': '#020617',
      '--crm-login-right-bg': '#0f172a',
      '--crm-login-gradient-from': '#2dd4bf',
      '--crm-login-gradient-to': '#14b8a6',
      '--crm-login-ring-color': 'rgba(45, 212, 191, 0.25)',
      '--crm-login-ring-color-light': 'rgba(45, 212, 191, 0.15)',
      '--crm-login-dot-color': 'rgba(45, 212, 191, 0.08)',
      '--crm-login-line-color': 'rgba(45, 212, 191, 0.1)',
      '--crm-login-accent-color': 'rgba(45, 212, 191, 0.5)',
    },
    antdToken: {
      colorPrimary: '#2dd4bf',
      colorInfo: '#2dd4bf',
      colorSuccess: '#34d399',
      colorWarning: '#fbbf24',
      colorError: '#f87171',
      colorBgContainer: '#1e293b',
      colorBorder: '#334155',
      borderRadius: 10,
    },
    antdComponents: {
      Menu: {
        darkItemBg: 'transparent',
        darkItemSelectedBg: 'rgba(45, 212, 191, 0.15)',
        darkItemSelectedColor: '#2dd4bf',
        darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
      },
      Layout: {
        siderBg: '#020617',
      },
      Button: {
        primaryShadow: '0 2px 0 rgba(45, 212, 191, 0.1)',
      },
    },
    chartColors: ['#2dd4bf', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'],
    siderGradient: 'rgba(45, 212, 191, 0.06)',
  },

  sunset: {
    name: '暖阳橙',
    key: 'sunset',
    cssVars: {
      '--crm-primary': '#ea580c',
      '--crm-primary-hover': '#c2410c',
      '--crm-primary-active': '#9a3412',
      '--crm-primary-light': '#ffedd5',
      '--crm-primary-bg': '#fff7ed',

      '--crm-text-primary': '#1c1917',
      '--crm-text-secondary': '#292524',
      '--crm-text-body': '#44403c',
      '--crm-text-muted': '#78716c',
      '--crm-text-placeholder': '#a8a29e',

      '--crm-border': '#e7e5e4',
      '--crm-border-light': '#f5f5f4',
      '--crm-bg-page': '#fff7ed',
      '--crm-bg-card': '#ffffff',
      '--crm-bg-dark': '#1c1917',

      '--crm-success': '#16a34a',
      '--crm-warning': '#d97706',
      '--crm-danger': '#dc2626',
      '--crm-info': '#ea580c',

      '--crm-shadow-sm': '0 1px 3px rgba(0,0,0,0.04)',
      '--crm-shadow-md': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
      '--crm-shadow-lg': '0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.04)',

      '--crm-tag-level-a-bg': '#fef2f2',
      '--crm-tag-level-a-text': '#dc2626',
      '--crm-tag-level-b-bg': '#fffbeb',
      '--crm-tag-level-b-text': '#d97706',
      '--crm-tag-level-c-bg': '#eff6ff',
      '--crm-tag-level-c-text': '#2563eb',

      '--crm-card-inner-bg': '#fafaf9',
      '--crm-empty-color': '#d6d3d1',
      '--crm-sub-text-color': '#78716c',

      '--crm-login-left-bg': '#1c1917',
      '--crm-login-right-bg': '#fff7ed',
      '--crm-login-gradient-from': '#ea580c',
      '--crm-login-gradient-to': '#c2410c',
      '--crm-login-ring-color': 'rgba(234, 88, 12, 0.3)',
      '--crm-login-ring-color-light': 'rgba(234, 88, 12, 0.2)',
      '--crm-login-dot-color': 'rgba(234, 88, 12, 0.1)',
      '--crm-login-line-color': 'rgba(234, 88, 12, 0.15)',
      '--crm-login-accent-color': 'rgba(234, 88, 12, 0.6)',
    },
    antdToken: {
      colorPrimary: '#ea580c',
      colorInfo: '#ea580c',
      colorSuccess: '#16a34a',
      colorWarning: '#d97706',
      colorError: '#dc2626',
      colorBgContainer: '#ffffff',
      colorBorder: '#e7e5e4',
      borderRadius: 10,
    },
    antdComponents: {
      Menu: {
        darkItemBg: 'transparent',
        darkItemSelectedBg: 'rgba(234, 88, 12, 0.15)',
        darkItemSelectedColor: '#ea580c',
        darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
      },
      Layout: {
        siderBg: '#1c1917',
      },
      Button: {
        primaryShadow: '0 2px 0 rgba(234, 88, 12, 0.1)',
      },
    },
    chartColors: ['#ea580c', '#d97706', '#dc2626', '#7c3aed', '#db2777'],
    siderGradient: 'rgba(234, 88, 12, 0.08)',
  },

  aurora: {
    name: '极光蓝',
    key: 'aurora',
    cssVars: {
      '--crm-primary': '#2563eb',
      '--crm-primary-hover': '#1d4ed8',
      '--crm-primary-active': '#1e40af',
      '--crm-primary-light': '#dbeafe',
      '--crm-primary-bg': '#eff6ff',

      '--crm-text-primary': '#0f172a',
      '--crm-text-secondary': '#1e293b',
      '--crm-text-body': '#334155',
      '--crm-text-muted': '#64748b',
      '--crm-text-placeholder': '#94a3b8',

      '--crm-border': '#e2e8f0',
      '--crm-border-light': '#f1f5f9',
      '--crm-bg-page': '#eff6ff',
      '--crm-bg-card': '#ffffff',
      '--crm-bg-dark': '#0f172a',

      '--crm-success': '#10b981',
      '--crm-warning': '#f59e0b',
      '--crm-danger': '#ef4444',
      '--crm-info': '#2563eb',

      '--crm-shadow-sm': '0 1px 3px rgba(0,0,0,0.04)',
      '--crm-shadow-md': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
      '--crm-shadow-lg': '0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.04)',

      '--crm-tag-level-a-bg': '#fef2f2',
      '--crm-tag-level-a-text': '#dc2626',
      '--crm-tag-level-b-bg': '#fffbeb',
      '--crm-tag-level-b-text': '#d97706',
      '--crm-tag-level-c-bg': '#eff6ff',
      '--crm-tag-level-c-text': '#2563eb',

      '--crm-card-inner-bg': '#f8fafc',
      '--crm-empty-color': '#cbd5e1',
      '--crm-sub-text-color': '#64748b',

      '--crm-login-left-bg': '#0f172a',
      '--crm-login-right-bg': '#eff6ff',
      '--crm-login-gradient-from': '#2563eb',
      '--crm-login-gradient-to': '#1d4ed8',
      '--crm-login-ring-color': 'rgba(37, 99, 235, 0.3)',
      '--crm-login-ring-color-light': 'rgba(37, 99, 235, 0.2)',
      '--crm-login-dot-color': 'rgba(37, 99, 235, 0.1)',
      '--crm-login-line-color': 'rgba(37, 99, 235, 0.15)',
      '--crm-login-accent-color': 'rgba(37, 99, 235, 0.6)',
    },
    antdToken: {
      colorPrimary: '#2563eb',
      colorInfo: '#2563eb',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorBgContainer: '#ffffff',
      colorBorder: '#e2e8f0',
      borderRadius: 10,
    },
    antdComponents: {
      Menu: {
        darkItemBg: 'transparent',
        darkItemSelectedBg: 'rgba(37, 99, 235, 0.15)',
        darkItemSelectedColor: '#60a5fa',
        darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
      },
      Layout: {
        siderBg: '#0f172a',
      },
      Button: {
        primaryShadow: '0 2px 0 rgba(37, 99, 235, 0.1)',
      },
    },
    chartColors: ['#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
    siderGradient: 'rgba(37, 99, 235, 0.08)',
  },
};

export const THEME_LIST = Object.values(themes).map(t => ({
  key: t.key,
  name: t.name,
}));

export const DEFAULT_THEME = 'ocean';

export function getTheme(key) {
  return themes[key] || themes[DEFAULT_THEME];
}

export default themes;
