# Revisão da base de código — tarefas sugeridas

## 1) Tarefa de correção de erro de digitação/nomenclatura
**Problema encontrado:** a assinatura do contexto usa `pass` como nome do parâmetro (`signIn: (usuario: string, pass: string)`), enquanto a implementação usa `senha`. Isso gera ambiguidade de leitura e reduz consistência semântica no código.

**Tarefa sugerida:** padronizar a nomenclatura do segundo parâmetro de login para `senha` em toda a tipagem/interface e chamadas relacionadas.

**Critério de aceite:** não existir mais ocorrência do parâmetro `pass` na API interna de autenticação; a assinatura e implementação devem usar o mesmo nome.

---

## 2) Tarefa de correção de bug
**Problema encontrado:** o hook `useAuth` tenta validar o uso dentro de `AuthProvider` com `if (!context)`, porém o `AuthContext` é criado com um objeto default (`{} as AuthContextData`), então essa proteção nunca dispara. Na prática, uso fora de provider pode falhar em runtime de forma menos clara.

**Tarefa sugerida:** alterar o contexto para iniciar com `undefined` e ajustar `useAuth` para lançar erro explícito quando `context` for `undefined`.

**Critério de aceite:** `useAuth` deve lançar erro determinístico quando usado fora do provider, e os tipos devem refletir esse contrato.

---

## 3) Tarefa para ajustar comentário/discrepância de documentação
**Problema encontrado:** no `Login.tsx` existe comentário indicando “Exemplo: Troque pela URL da sua logo”, mas o código já está com uma URL fixa externa em produção. O comentário está desatualizado em relação ao comportamento real.

**Tarefa sugerida:** remover comentário de placeholder ou substituí-lo por instrução alinhada ao fluxo real (ex.: logo configurável por variável de ambiente/asset local).

**Critério de aceite:** comentários do bloco da logo não devem sugerir estado “exemplo” quando a funcionalidade já está definida para produção.

---

## 4) Tarefa de melhoria de teste/qualidade automatizada
**Problema encontrado:** os checks de qualidade não estão estáveis. `npm run lint` falha por incompatibilidade de regra ESLint/TypeScript ESLint, e `npm run typecheck` retorna múltiplos erros de tipagem (incluindo vários `never` nas integrações Supabase).

**Tarefa sugerida:** estabilizar pipeline local de validação:
1. corrigir/alinhar versões e configuração de ESLint para `npm run lint` executar sem crash;
2. corrigir tipagens Supabase (ou geração de tipos) para eliminar erros `never` críticos;
3. adicionar um teste smoke mínimo (ex.: renderização de `App` com providers) para garantir que build/teste peguem regressões básicas.

**Critério de aceite:** `npm run lint` e `npm run typecheck` executam com sucesso e existe ao menos 1 teste automatizado de smoke rodando no CI/local.
