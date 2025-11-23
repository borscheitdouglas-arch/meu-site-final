# Apêndice operacional do prompt

Este arquivo contém instruções detalhadas e exemplos para operações do agente (edições em arquivos, uso de scripts, padrões de substituição de encoding, e exemplos do formato `apply_patch`).

1) Uso do `apply_patch` (resumo)
- Use o formato de patch V4A (ex.: `*** Update File: path/to/file`) — consulte o exemplo abaixo.
- Sempre mantenha o contexto mínimo necessário (3 linhas acima/abaixo), e evite mudanças que alterem estilo de arquivos não relacionados.

Exemplo curto de patch:

*** Begin Patch
*** Update File: pages/exemplo.html
@@
 -<h1>Velho</h1>
 +<h1>Novo</h1>
*** End Patch

2) Rodar scripts de correção de encoding
- O script `scripts/fix-encoding.ps1` foi criado para substituir sequências comuns de mojibake e gravar arquivos em UTF-8.
- Execute o script localmente com:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\fix-encoding.ps1
```

- Atenção: esse script modifica arquivos em `pages/`. Peça confirmação antes de executar em produção ou branch `main`.

3) Padrões de substituição comuns (exemplos)
- 'Ã¡' -> 'á'
- 'Ã©' -> 'é'
- 'Ã§' -> 'ç'
- 'Â©' -> '©'

4) Procedimento para QA visual
1. Servir site localmente (ex.: `python -m http.server 8000`).
2. Abrir `http://localhost:8000/` e navegar pelas páginas alteradas.
3. Verificar fontes (Cardo/Playfair), imagens (`/assets/img/icone.png`) e layout do cartão litúrgico.

5) Dicas rápidas
- Use placeholders no prompt (`{PROJECT_ROOT}`, `{PAGES_DIR}`) ao escrever instruções para facilitar portabilidade.
- Mantenha o prompt principal enxuto; mova detalhes e exemplos para este apêndice.
