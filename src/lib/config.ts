/**
 * Configurações do Sistema BJJ College
 * 
 * IMPORTANTE: Valores sensíveis NÃO devem estar no frontend em produção
 * Este arquivo contém apenas configurações públicas e constantes do sistema
 */

// Chaves de armazenamento no localStorage
export const STORAGE_KEYS = {
  AUTHORIZED_DEVICE: '@BJJCollege:authorized_device',
  USER: '@BJJCollege:user',
  LOGIN_TIMESTAMP: '@BJJCollege:login_timestamp',
  LAST_PAGE: 'bjj_last_page',
} as const;

// Configurações de sessão
// Sessão expira em 8 horas (em milissegundos)
export const SESSION_CONFIG = {
  EXPIRATION_MS: 8 * 60 * 60 * 1000, // 8 horas
} as const;

// Limites de queries para performance
export const QUERY_LIMITS = {
  DASHBOARD_TRANSACTIONS: 1000,
  DASHBOARD_ALUNOS: 500,
  LIST_DEFAULT: 100,
} as const;

// Configurações de UI
export const UI_CONFIG = {
  TOAST_AUTO_CLOSE_MS: 3000,
  DEFAULT_PAGE_SIZE: 20,
} as const;

// Tipos de confirmação para o Modal genérico
export type ConfirmType = 'danger' | 'success' | 'warning' | 'info';
