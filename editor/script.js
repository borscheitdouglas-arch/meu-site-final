const editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    fromElement: false,
    storageManager: false, // nÃ£o salva automaticamente ainda
    plugins: [],
});

// Tenta carregar a pÃ¡gina principal (`../index.html`) e seus estilos CSS
// ObservaÃ§Ã£o: isso sÃ³ funciona corretamente quando os arquivos estÃ£o sendo
// servidos via HTTP (ex: http://localhost:8000). Se abrir o arquivo via
// file://, o fetch pode falhar por seguranÃ§a.
async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha ao buscar ${url}: ${res.status}`);
    return await res.text();
}

async function loadPageIntoEditor(pageRelPath = '../index.html') {
    try {
        const pageUrl = new URL(pageRelPath, location.href).href;
        const html = await fetchText(pageUrl);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // ConteÃºdo principal: usamos todo o body para preservar estrutura
        const bodyHtml = doc.body ? doc.body.innerHTML : html;

        // Reunir estilos: links rel=stylesheet + <style> internos
        let css = '';
        const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
        for (const link of links) {
            const href = link.getAttribute('href');
            if (!href) continue;
            try {
                const cssUrl = new URL(href, pageUrl).href;
                const cssText = await fetchText(cssUrl);
                css += '\n/* ' + cssUrl + ' */\n' + cssText;
            } catch (e) {
                console.warn('NÃ£o foi possÃ­vel carregar CSS:', href, e);
            }
        }
        const styleTags = Array.from(doc.querySelectorAll('style'));
        styleTags.forEach(s => { css += '\n' + s.textContent; });

        // Carrega no GrapesJS
        editor.setComponents(bodyHtml);
        if (css) editor.setStyle(css);

        console.log('PÃ¡gina carregada no editor a partir de', pageUrl);
    } catch (err) {
        console.warn('Falha ao carregar a pÃ¡gina para o editor:', err);
        // fallback simples
        editor.setComponents(`
            <h1>Seu editor GrapesJS estÃ¡ funcionando!</h1>
            <p>Edite este texto e teste os blocos ao lado.</p>
        `);
    }
}

// Executa a carga ao iniciar
loadPageIntoEditor().catch(e => console.error(e));

