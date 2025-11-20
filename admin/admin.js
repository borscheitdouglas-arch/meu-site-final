(function(){
  const pwd = document.getElementById('pwd');
  const loginBtn = document.getElementById('loginBtn');
  const loginBox = document.getElementById('loginBox');
  const adminUI = document.getElementById('adminUI');
  const SAVE_KEY = 'shopProducts_v1';

  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}

  function readJSON(){ try{ return JSON.parse(localStorage.getItem(SAVE_KEY)||'[]') }catch(e){return[]} }
  function writeJSON(v){ localStorage.setItem(SAVE_KEY, JSON.stringify(v)) }

  function fileToDataUrl(file){
    return new Promise((res,rej)=>{
      const r = new FileReader();
      r.onload = ()=>res(r.result);
      r.onerror = ()=>rej(new Error('Erro ao ler arquivo'));
      r.readAsDataURL(file);
    })
  }

  async function saveProduct(existingId){
    const title = document.getElementById('title').value.trim();
    const price = document.getElementById('price').value.trim();
    const oldPrice = document.getElementById('oldPrice') ? document.getElementById('oldPrice').value.trim() : '';
    const discount = document.getElementById('discount') ? document.getElementById('discount').value.trim() : '';
    const badge = document.getElementById('badge') ? document.getElementById('badge').value.trim() : '';
    const tag = document.getElementById('tag') ? document.getElementById('tag').value.trim() : '';
    const rating = document.getElementById('rating') ? document.getElementById('rating').value.trim() : '';
    const desc = document.getElementById('desc').value.trim();
    const coverFile = document.getElementById('cover').files[0];
    const sheetFile = document.getElementById('sheet').files[0];
    if(!title){ alert('Preencha um título'); return }
    const products = readJSON();
    let coverData, sheetData, sheetName;
    if(coverFile) coverData = await fileToDataUrl(coverFile);
    if(sheetFile){ sheetData = await fileToDataUrl(sheetFile); sheetName = sheetFile.name }

    if(existingId){
      const idx = products.findIndex(p=>p.id===existingId);
      if(idx!==-1){
        const p = products[idx];
        p.title = title; p.price = price; p.desc = desc;
        if(coverData) p.cover = coverData;
        if(sheetData){ p.sheet = sheetData; p.sheetName = sheetName }
        p.oldPrice = oldPrice || p.oldPrice || '';
        p.discount = discount || p.discount || '';
        p.badge = badge || p.badge || '';
        p.tag = tag || p.tag || '';
        p.rating = rating || p.rating || '';
        products[idx]=p;
      }
    }else{
      const p = {
        id:uid(), title, price, desc,
        oldPrice: oldPrice||'', discount: discount||'', badge: badge||'', tag: tag||'', rating: rating||'',
        cover:coverData||'../assets/img/thumbnails.jpg', sheet:sheetData||'', sheetName:sheetName||''
      }
      products.unshift(p);
    }
    writeJSON(products);
    renderList();
    clearForm();
  }

  function clearForm(){ document.getElementById('title').value=''; document.getElementById('price').value=''; document.getElementById('desc').value=''; document.getElementById('cover').value=''; document.getElementById('sheet').value=''; }

  function renderList(){
    const list = document.getElementById('productsList'); list.innerHTML='';
    const products = readJSON();
    if(products.length===0){ list.innerHTML='<p class="small">Nenhum produto cadastrado ainda.</p>'; return }
    products.forEach(p=>{
      const el = document.createElement('div'); el.className='product-item';
      el.innerHTML = `
        <img src="${p.cover||'../assets/img/thumbnails.jpg'}" alt="" style="width:84px;height:84px;object-fit:cover;margin-right:12px">
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${p.title}</strong>
            <span class="small">${p.price||''}</span>
          </div>
          <div class="small">${(p.desc||'').slice(0,120)}</div>
          <div class="small">${p.badge?('Badge: '+p.badge):''} ${p.tag?(' | '+p.tag):''} ${p.rating?(' | ★ '+p.rating):''}</div>
          <div style="margin-top:6px">
            ${p.sheet?(`<a href="${p.sheet}" download="${p.sheetName||'sheet'}" class="btn outline small">Baixar partitura</a>`):''}
            ${p.cover?(`<a href="${p.cover}" download="${(p.title||'cover').replace(/\s+/g,'_')+'_cover'}" class="btn outline small">Baixar capa</a>`):''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn edit">Editar</button>
          <button class="btn outline delete">Excluir</button>
        </div>
      `;
      list.appendChild(el);
      el.querySelector('.delete').addEventListener('click',()=>{
        if(!confirm('Remover este produto?')) return;
        const arr = readJSON().filter(x=>x.id!==p.id); writeJSON(arr); renderList();
      });
      el.querySelector('.edit').addEventListener('click',()=>{
        document.getElementById('title').value = p.title;
        document.getElementById('price').value = p.price;
        document.getElementById('desc').value = p.desc;
        // store editing id on save button
        document.getElementById('saveProd').dataset.editId = p.id;
        window.scrollTo({top:0,behavior:'smooth'});
      });
    })
  }

  document.getElementById('saveProd').addEventListener('click', async ()=>{
    const editId = document.getElementById('saveProd').dataset.editId;
    await saveProduct(editId||null);
    delete document.getElementById('saveProd').dataset.editId;
  });

  document.getElementById('clearForm').addEventListener('click', (e)=>{ e.preventDefault(); clearForm(); delete document.getElementById('saveProd').dataset.editId })

  document.getElementById('exportBtn').addEventListener('click', ()=>{
    const data = localStorage.getItem(SAVE_KEY)||'[]';
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'shop-backup.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  document.getElementById('importFile').addEventListener('change', (ev)=>{
    const f = ev.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = ()=>{ try{ const parsed = JSON.parse(r.result); localStorage.setItem(SAVE_KEY, JSON.stringify(parsed)); renderList(); alert('Importado com sucesso') }catch(e){ alert('Arquivo inválido') } }; r.readAsText(f);
  });

  // botão para limpar todos os produtos (remove a chave do storage)
  const clearBtn = document.getElementById('clearAllBtn');
  if(clearBtn){
    clearBtn.addEventListener('click', ()=>{
      if(!confirm('Remover todos os produtos salvos? Esta ação não pode ser desfeita do navegador.')) return;
      localStorage.removeItem(SAVE_KEY);
      renderList();
      alert('Todos os produtos foram removidos.');
    });
  }

  loginBtn.addEventListener('click', ()=>{
    const val = pwd.value||'';
    // senha simples no front-end; ALTERE em produção
    if(val === 'admin123'){
      sessionStorage.setItem('isAdmin','1'); loginBox.style.display='none'; adminUI.style.display='block'; renderList();
    }else{ alert('Senha incorreta') }
  });

  // se já logado
  if(sessionStorage.getItem('isAdmin')){ loginBox.style.display='none'; adminUI.style.display='block'; renderList(); }

})();
