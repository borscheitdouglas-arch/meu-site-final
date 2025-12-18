# Padrão de Páginas do Advento

## Objetivo
Manter consistência visual e de funcionamento em todas as páginas das celebrações de Advento (Entrada, Comunhão e Veni Veni Emmanuel).

## Estrutura HTML

### Layout Principal
```html
<div class="wrap">
  <div class="content">
    <main role="main">
      <!-- Conteúdo principal -->
    </main>
    <aside class="sidebar" role="complementary">
      <!-- Recursos complementares -->
    </aside>
  </div>
</div>

<!-- Seção de compartilhamento -->
<div class="social-share">
  <label>Compartilhar:</label>
  <!-- Ícones sociais -->
</div>
```

## CSS - Padrão de Espaçamento

### 1. Classe `.wrap`
- **Desktop**: `padding: 30px 20px 200px`
- **Tablet (768px)**: `padding: 20px 16px 150px`
- **Mobile (480px)**: `padding: 20px 16px 120px`

### 2. Classe `.content`
- **Grid**: `grid-template-columns: 1fr 320px`
- **Gap**: `gap: 0` (removido o gap de 28px)
- **Align items**: `align-items: start`
- **Max width**: `980px`
- **Margin**: `0 auto`

### 3. Classe `.social-share`
- **Display**: `flex`
- **Gap**: `12px`
- **Align items**: `center`
- **Margin**: `-100px auto 0` (negative margin para puxar para cima)
- **Padding**: `20px`
- **Max width**: `980px`
- **Background**: `linear-gradient(135deg, rgba(31,31,31,0.5) 0%, rgba(21,21,21,0.7) 100%)`
- **Border**: `1px solid rgba(212,175,55,0.2)`
- **Border radius**: `6px`

## Elementos Obrigatórios

### No `.wrap` > `.content`
1. **`<main>`** com conteúdo
2. **`<aside class="sidebar">`** com:
   - Vídeos relacionados
   - Recursos complementares (Saiba Mais)
   - Card informativo sobre o tema

### Fora do `.content`
1. **`<div class="social-share">`** com:
   - Label "Compartilhar:"
   - Ícones: Facebook, Twitter, Instagram, WhatsApp, Email

## Componentes Visuais Padronizados

### Divisor com Diamante (Opcional mas Recomendado)
```html
<div class="divider-line">
  <div></div>
  <div class="divider-diamond"></div>
  <div></div>
</div>
```

### Título Principal
```html
<h1 class="title">Título da Página | "Subtítulo ou Verso"</h1>
```

### Cards na Sidebar
- Imagem de thumbnail do YouTube
- Badge com categoria (ENTRADA, COMUNHÃO, etc)
- Título
- Citação/verso
- CTA "Ver conteúdo completo"

## Páginas Aplicadas

- ✅ `/pages/advento-1-entrada.html` - Base de referência
- 🔄 `/pages/advento-1-comunhao.html` - A aplicar
- 🔄 `/pages/advento-2-comunhao.html` - A aplicar
- 🔄 `/pages/advento-3-comunhao.html` - A aplicar
- 🔄 `/pages/veni-veni-emmanuel.html` - A aplicar

## Responsividade

### Breakpoints Principais
- **480px**: Mobile (1 coluna)
- **768px**: Tablet (ajustes de padding e gap)
- **820px**: Desktop pequeno (1 coluna single)
- **980px**: Desktop médio (2 colunas)
- **1200px**: Desktop grande (ajustes finos)
- **1400px**: Desktop XL (ajustes finos)

## Notas Importantes

1. O `gap: 0` no `.content` remove o espaço entre main e sidebar
2. O `margin: -100px auto 0` no `.social-share` puxa a seção de compartilhamento para cima, preenchendo o espaço vazio
3. O footer padding (200px/150px/120px) é aplicado no `.wrap` para dar espaço ao conteúdo de encerramento
4. A estrutura visa proximidade entre título e compartilhamento, eliminando vazios desnecessários

## Changelog

- **18/12/2025** - Documento criado baseado em padrão definido em advento-1-entrada.html
