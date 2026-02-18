import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8');

assert.match(
  source,
  /createContext<AuthContextData \| undefined>\(undefined\)/,
  'AuthContext deve ser inicializado com undefined para validar provider corretamente.'
);

assert.match(
  source,
  /if \(!context\) \{\s*throw new Error\('useAuth deve ser usado dentro de um AuthProvider'\);\s*\}/s,
  'useAuth deve lançar erro explícito quando usado fora do AuthProvider.'
);

console.log('AuthContext guard check passou.');
