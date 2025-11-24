# Prompt (versão completa)

Este documento descreve a versão completa do prompt de operação usado para editar o repositório `meu-site-final`. Ele contém o objetivo, contexto, regras e exemplos para operações com ferramentas (patches, execução de scripts, buscas).

1. Objetivo
- Realizar alterações seguras e auditáveis no site estático: adicionar/editar páginas, padronizar estilos, corrigir problemas de encoding e preparar para QA.

2. Contexto do repositório
- Root: `j:/Meu Drive/3- Site/meu-site-final`
- Pastas relevantes: `pages/`, `styles/`, `assets/img/`, `scripts/`, `prompt/`, `docs/`.
- Encoding preferido: `UTF-8` (arquivos gravados sempre em UTF-8).

3. Regras operacionais (resumidas)
- Edite arquivos com `apply_patch` (siga a formatação de patch mínima descrita no apêndice).
- Para mudanças de conteúdo em `pages/`, priorize pequenas alterações (não reescrever páginas inteiras sem necessidade).
- Ao executar scripts que gravam arquivos, confirmar com o usuário quando isso alterar `pages/` ou `styles/`.
- Ao criar documentação ou arquivos auxiliares (`prompt/*`, `docs/*`), esses não alteram o site; podem ser gravados direto na branch `main` se autorizado.

4. Fluxo recomendado para mudanças invasivas
1. Criar branch `chore/<descrição>` para mudanças grandes.
2. Aplicar `apply_patch` localmente através do agente (ou manual) e testar.
3. Rodar `scripts/fix-encoding.ps1` somente se autorizado; revisar diffs.
4. Abrir PR e pedir revisão antes de merge.

5. Exemplos rápidos
- Exemplo: adicionar `pages/pater-noster.html`: use `apply_patch` para criar o arquivo e atualizar `index.html`.
- Exemplo: centralizar CSS duplicado: mover regras para `styles/style.css` e atualizar páginas para remover inline styles.

6. Referências úteis
- Apêndice operacional: `docs/prompt-appendix.md` (contém formatação de patch, comandos de terminal e padrões de substituição de encoding).
