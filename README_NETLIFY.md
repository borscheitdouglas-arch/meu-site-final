Guia rápido: configurar Netlify CMS para editar partituras (passos mínimos)

1) Crie um repositório Git (GitHub/GitLab/Bitbucket) e envie este projeto.

2) No Netlify:
   - Acesse https://app.netlify.com/sites -> "Add new site" -> "Import an existing project" -> conecte ao seu provedor Git e selecione o repositório.
   - Deploy: clique em "Deploy site". O site ficará disponível em `https://<nome>.netlify.app`.

3) Ativar Identity e Git Gateway:
   - No painel do site no Netlify: `Site settings` > `Identity` e clique em `Enable Identity`.
   - Ainda em `Identity`, vá em `Services` e ative `Git Gateway`.
   - Em `Identity` -> `Invite users` crie um usuário (ou auto-register). Use esse usuário para entrar no CMS.

4) Acessar o CMS:
   - Abra `https://<seu-site>.netlify.app/admin`.
   - Faça login com o usuário criado e comece a adicionar partituras.
   - Campos disponíveis: `Título`, `Descrição`, `Capa (imagem)` e `Partitura (PDF)`.

5) Onde os ficheiros vão ficar:
   - Imagens e PDFs carregados pelo CMS serão gravados em `assets/uploads`.
   - Os itens de conteúdo serão gravados em `content/partituras` como arquivos JSON.

6) Como o site exibirá as partituras:
   - O CMS salva arquivos e cria JSON. Para que as partituras apareçam no site você precisa de um código que leia `content/partituras/*.json` e gere páginas ou inclua listagem.
   - Se o site for estático sem processamento (HTML puro), você pode:
     - Copiar manualmente os valores do JSON e criar uma página em `pages/` apontando para `/assets/uploads/<arquivo>.pdf` e `<capa>.jpg`.
     - Ou integrar um gerador (ex.: um build system) que consuma `content/partituras` e gere páginas estáticas.

7) Segurança e boas práticas:
   - Use Identity/Git Gateway para controlar quem edita.
   - Teste com um usuário convidado antes de liberar para outros.

Se quiser, eu posso:
- Ajustar templates do site para listar automaticamente `content/partituras` (requer alguma lógica de build ou JavaScript de cliente). 
- Ajudar com os passos do Netlify (passo-a-passo com telas) enquanto você clica (não consigo agir na sua conta).
