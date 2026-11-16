import {escape as esc,phoneNumber,leadCountry,norm} from './core.mjs';
import {regionOptions,regionName} from './regions.mjs';
import {STAGES,SOURCES,boardStatus,boardLeads} from './social-core.mjs';
import {saveManualLead,createCategory,updateRecords,loadAll} from './store.mjs';

const options=(values,current,empty)=>`${empty?`<option value="">${empty}</option>`:''}${Object.entries(values).map(([key,label])=>`<option value="${esc(key)}" ${key===current?'selected':''}>${esc(label)}</option>`).join('')}`;
const categoryOptions=(state,value)=>options(Object.fromEntries(state.categories.map(c=>[c.id,c.name])),value,'Sem categoria');
export function socialNav(state,icon){return `<nav class="nav-list social-nav" aria-label="Leads e contato">${[['whatsapp','message','WhatsApp'],['instagram','grid','Instagram'],['queue','phone','Para contatar']].map(([view,i,label])=>`<button class="nav-item ${state.view===view?'active':''}" data-nav="${view}" ${state.view===view?'aria-current="page"':''}>${icon(i)}${label}<span class="count">${boardLeads(state.leads,view).length}</span></button>`).join('')}</nav>`;}
function card(l,state,icon){
  const phone=phoneNumber(l.phone,leadCountry(l)),category=state.categories.find(c=>c.id===l.lead_category_id)?.name;
  return `<article class="kanban-card" data-card="${esc(l.id)}"><div class="card-heading"><span class="source-label">${SOURCES[l.source]||'Planilha'}</span><button class="drag-handle" data-drag="${esc(l.id)}" aria-label="Arrastar ${esc(l.name)}; também é possível usar o seletor de etapa" title="Arraste para outra etapa">⠿</button></div><button class="card-name" data-${['whatsapp','instagram'].includes(l.source)?'edit-social':'detail'}="${esc(l.id)}">${esc(l.name)}</button><p class="card-location">${esc(regionName(leadCountry(l),l.state)||l.state||'Sem estado')}${category?' · '+esc(category):''}</p><p class="card-phone">${esc(l.phone||l.instagram||'Telefone não informado')}</p><div class="card-actions">${l.phone?`<button data-copy-phone="${esc(l.id)}" aria-label="Copiar número de ${esc(l.name)}">${icon('copy')}Copiar</button>`:''}${phone?`<a class="button whatsapp-link" href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer">${icon('message')}WhatsApp</a>`:''}</div><label class="sr-only" for="stage-${esc(l.id)}">Etapa de ${esc(l.name)}</label><select id="stage-${esc(l.id)}" data-stage="${esc(l.id)}">${options(STAGES,boardStatus(l.status))}</select><button class="queue-toggle" data-queue="${esc(l.id)}" aria-pressed="${!!l.contact_queue}">${l.contact_queue?'Remover da fila':'Enviar para contatar'}</button></article>`;
}
export function renderBoard(state,icon){
  const leads=boardLeads(state.leads,state.view,state.boardFilters);
  return `${!state.socialReady?'<div class="notice">Os novos campos ainda não estão disponíveis no banco. <a href="/social-leads.sql" download>Baixar atualização SQL</a> e executar no Supabase. <button data-social="reload">Verificar conexão</button></div>':''}<section class="board-toolbar" aria-label="Filtros do quadro"><label>Buscar lead<input type="search" data-board-filter="q" placeholder="Nome, WhatsApp ou Instagram" value="${esc(state.boardFilters.q||'')}"></label><label>Estado<select data-board-filter="region">${regionOptions('BR',state.boardFilters.region,'Todos os estados')}</select></label><label>Categoria<select data-board-filter="category">${options(Object.fromEntries(state.categories.map(c=>[c.id,c.name])),state.boardFilters.category,'Todas as categorias')}</select></label><button data-social="category">Criar categoria</button><button data-social="reload" aria-label="Atualizar base">${icon('refresh')||'↻'}Atualizar</button></section><div class="board-caption"><span>${leads.length} lead${leads.length===1?'':'s'} neste quadro</span><span>Arraste pela alça ⠿ ou escolha a etapa no cartão.</span></div><div class="kanban" aria-label="Quadro de leads">${Object.entries(STAGES).map(([status,label])=>{const rows=leads.filter(l=>boardStatus(l.status)===status);return `<section class="kanban-column stage-${status}" data-drop="${status}" aria-label="${label}"><header><h2>${label}</h2><span>${rows.length}</span></header><div class="kanban-cards">${rows.map(l=>card(l,state,icon)).join('')||'<p class="column-empty">Solte um lead aqui</p>'}</div></section>`;}).join('')}</div><p class="shared-note">Base compartilhada: alterações ficam disponíveis para todos com acesso ao CRM.</p>`;
}

export function showLeadForm({state,render,toast},id){
  const l=state.leads.find(l=>l.id===id)||{source:state.view==='instagram'?'instagram':'whatsapp',status:'new',state:state.boardFilters.region||'',contact_queue:state.view==='queue'};
  const dialog=document.querySelector('#modal');
  dialog.innerHTML=`<div class="modal-header"><h2 id="modal-title">${id?'Editar':'Adicionar'} lead</h2><button data-close aria-label="Fechar">×</button></div><form class="modal-body" id="social-form"><div class="form-grid"><label class="field">Nome / empresa<input name="name" required maxlength="160" autocomplete="organization" value="${esc(l.name||'')}"></label><label class="field">Origem<select name="source">${options({whatsapp:'WhatsApp',instagram:'Instagram'},l.source)}</select></label><label class="field">WhatsApp com DDD<input name="phone" type="tel" autocomplete="tel" placeholder="(11) 99999-1234" value="${esc(l.phone||'')}"><small>Obrigatório para leads de WhatsApp.</small></label><label class="field">Instagram<input name="instagram" maxlength="200" placeholder="@empresa" value="${esc(l.instagram||'')}"></label><label class="field">Estado<select name="state" required>${regionOptions('BR',l.state,'Escolher estado')}</select></label><label class="field">Etapa<select name="status">${options(STAGES,boardStatus(l.status))}</select></label><label class="field">Categoria<select name="lead_category_id">${categoryOptions(state,l.lead_category_id)}</select></label><label class="field">Nova categoria<div class="inline-field"><input id="inline-category" maxlength="60" placeholder="Ex.: Clientes locais"><button type="button" id="add-category">Criar</button></div></label></div><label class="check-label"><input name="contact_queue" type="checkbox" ${l.contact_queue?'checked':''}>Adicionar à fila “Para contatar”</label><p class="form-error" role="alert"></p><div class="form-actions"><button type="button" data-close>Cancelar</button><button class="primary" type="submit">Salvar lead</button></div></form>`;
  const form=dialog.querySelector('form'),error=dialog.querySelector('.form-error');
  dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
  const requiredPhone=()=>form.elements.phone.required=form.elements.source.value==='whatsapp';
  form.elements.source.onchange=requiredPhone;requiredPhone();
  dialog.querySelector('#add-category').onclick=async e=>{e.target.disabled=true;try{const c=await createCategory(state,dialog.querySelector('#inline-category').value);form.elements.lead_category_id.innerHTML=categoryOptions(state,c.id);dialog.querySelector('#inline-category').value='';error.textContent='';}catch(err){error.textContent=err.message;}finally{e.target.disabled=false;}};
  form.onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;error.textContent='';try{await saveManualLead(state,{...Object.fromEntries(new FormData(form)),contact_queue:form.elements.contact_queue.checked},id);dialog.close();render();}catch(err){error.textContent=err.message;}finally{button.disabled=false;}};
  dialog.showModal();
}

export function showQueuePicker({state,render,toast}){
  const dialog=document.querySelector('#modal');
  const selected=new Set();
  dialog.innerHTML=`<div class="modal-header"><div><h2 id="modal-title">Enviar leads para contato</h2><p>Escolha empresas da planilha, do Instagram ou do WhatsApp.</p></div><button data-close aria-label="Fechar">×</button></div><div class="modal-body"><label class="field">Buscar na base<input id="queue-search" type="search" placeholder="Nome ou telefone"></label><label class="field">Origem<select id="queue-source">${options(SOURCES,'','Todas as origens')}</select></label><div id="queue-results" class="queue-results"></div><p class="form-error" role="alert"></p><div class="form-actions"><span id="queue-count">0 selecionados</span><button class="primary" id="queue-save" disabled>Enviar para contatar</button></div></div>`;
  const results=dialog.querySelector('#queue-results'),save=dialog.querySelector('#queue-save');
  const refresh=()=>{const q=norm(dialog.querySelector('#queue-search').value),source=dialog.querySelector('#queue-source').value;const rows=state.leads.filter(l=>!l.contact_queue&&(!source||(l.source||'spreadsheet')===source)&&(!q||norm([l.name,l.phone].join(' ')).includes(q)));results.innerHTML=rows.slice(0,100).map(l=>`<label class="queue-choice"><input type="checkbox" value="${esc(l.id)}" ${selected.has(l.id)?'checked':''}><span><strong>${esc(l.name)}</strong><small>${SOURCES[l.source]||'Planilha'} · ${esc(l.phone||'Sem telefone')}</small></span></label>`).join('')||'<p>Nenhum lead disponível para adicionar.</p>';if(rows.length>100)results.insertAdjacentHTML('beforeend','<p>Mostrando 100 resultados. Refine a busca.</p>');};
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('#queue-search').oninput=refresh;dialog.querySelector('#queue-source').onchange=refresh;
  results.onchange=e=>{e.target.checked?selected.add(e.target.value):selected.delete(e.target.value);save.disabled=!selected.size;dialog.querySelector('#queue-count').textContent=`${selected.size} selecionados`;};
  save.onclick=async()=>{save.disabled=true;try{await updateRecords(state,[...selected],{contact_queue:true});dialog.close();render();}catch(err){dialog.querySelector('.form-error').textContent=err.message;}finally{save.disabled=!selected.size;}};
  refresh();dialog.showModal();
}

export function bindSocial({app,state,render,toast,updateLeads}){
  const context={state,render,toast};
  const updateStage=async(ids,patch)=>{
    await updateLeads(ids,patch);
    const select=app.querySelector(`[data-stage="${CSS.escape(ids[0])}"]`);
    select?.closest('.kanban-card').scrollIntoView({block:'nearest',inline:'center'});
    select?.focus({preventScroll:true});
  };
  app.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    try{
      if(b.dataset.editSocial){showLeadForm(context,b.dataset.editSocial);return;}
      if(b.dataset.queue){b.disabled=true;const l=state.leads.find(l=>l.id===b.dataset.queue);await updateLeads([l.id],{contact_queue:!l.contact_queue});return;}
      if(b.dataset.social==='new')showLeadForm(context);
      if(b.dataset.social==='pick')showQueuePicker(context);
      if(b.dataset.social==='reload'){b.disabled=true;await loadAll(state);}
      if(b.dataset.social==='category'){
        const dialog=document.querySelector('#modal');
        dialog.innerHTML='<div class="modal-header"><h2 id="modal-title">Criar categoria</h2><button data-close aria-label="Fechar">×</button></div><form class="modal-body"><label class="field">Nome da categoria<input name="name" required maxlength="60" placeholder="Ex.: Parceiros"></label><p class="form-error" role="alert"></p><div class="form-actions"><button class="primary">Criar categoria</button></div></form>';
        dialog.querySelector('[data-close]').onclick=()=>dialog.close();
        dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();event.submitter.disabled=true;try{await createCategory(state,new FormData(event.target).get('name'));dialog.close();render();toast('Categoria criada.');}catch(err){dialog.querySelector('.form-error').textContent=err.message;}finally{event.submitter.disabled=false;}};dialog.showModal();
      }
    }catch(err){toast(err.message);b.disabled=false;}
  });
  app.addEventListener('change',async e=>{try{if(e.target.dataset.stage){e.target.disabled=true;await updateStage([e.target.dataset.stage],{status:e.target.value});}if(e.target.dataset.boardFilter&&e.target.type!=='search'){state.boardFilters[e.target.dataset.boardFilter]=e.target.value;render();}}catch(err){toast(err.message);render();}});
  app.addEventListener('input',e=>{if(e.target.dataset.boardFilter==='q'){state.boardFilters.q=e.target.value;const start=e.target.selectionStart;render();const input=app.querySelector('[data-board-filter="q"]');input.focus();if(input.type!=='search')input.setSelectionRange(start,start);}});
  bindDrag(app,updateStage,toast);
}

function bindDrag(app,updateLeads,toast){
  let drag=null,frame=0;
  function target(){return document.elementFromPoint(drag.x,drag.y)?.closest('[data-drop]');}
  function tick(){if(!drag)return;const board=app.querySelector('.kanban');if(!board)return;const rect=board.getBoundingClientRect();
    drag.preview.style.transform=`translate(${Math.max(0,Math.min(drag.x+12,innerWidth-250))}px,${Math.max(0,Math.min(drag.y+12,innerHeight-80))}px)`;
    if(drag.x<rect.left+55)board.scrollLeft-=12;else if(drag.x>rect.right-55)board.scrollLeft+=12;
    app.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));target()?.classList.add('drop-target');frame=requestAnimationFrame(tick);
  }
  app.addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-drag]');if(!handle||e.button!==0||drag)return;e.preventDefault();handle.setPointerCapture(e.pointerId);const preview=document.createElement('div');preview.className='drag-preview';preview.textContent=handle.closest('.kanban-card').querySelector('.card-name').textContent;preview.setAttribute('aria-hidden','true');document.body.append(preview);drag={id:handle.dataset.drag,handle,preview,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,pointer:e.pointerId};handle.closest('.kanban-card').classList.add('dragging');frame=requestAnimationFrame(tick);});
  app.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.pointer){drag.x=e.clientX;drag.y=e.clientY;}});
  async function end(e){if(!drag||e.pointerId!==drag.pointer)return;const current=drag;const column=target();drag=null;cancelAnimationFrame(frame);current.preview.remove();app.querySelectorAll('.dragging,.drop-target').forEach(el=>el.classList.remove('dragging','drop-target'));if(current.handle.hasPointerCapture(e.pointerId))current.handle.releasePointerCapture(e.pointerId);if(e.type==='pointerup'&&column&&Math.hypot(e.clientX-current.startX,e.clientY-current.startY)>8){try{await updateLeads([current.id],{status:column.dataset.drop});}catch(err){toast(err.message);}}}
  app.addEventListener('pointerup',end);app.addEventListener('pointercancel',end);app.addEventListener('lostpointercapture',end);
}
