import {COUNTRIES,escape as esc} from './core.mjs';
import {REGIONS,regionOptions,regionName} from './regions.mjs';
import {moveRecords} from './store.mjs';

export function showMove({state,leads,render,toast,icon}){
  if(state.demo||state.loading){toast('Aguarde a conexão com o banco para mover leads.');return;}
  if(!leads.length){toast('Não há leads nesta lista para mover.');return;}
  const dialog=document.querySelector('#modal');
  const filteredIds=leads.map(l=>l.id);
  const selectedIds=filteredIds.filter(id=>state.selected.has(id));
  let busy=false;
  dialog.innerHTML=`<div class="modal-header"><div><h2 id="modal-title">Mover leads</h2><p>Corrija o país e o estado / região das empresas.</p></div><button class="icon-button" data-close aria-label="Fechar">${icon('close')}</button></div><form id="move-form"><div class="modal-body"><div class="field"><label for="move-scope">Quais leads mover?</label><select id="move-scope">${selectedIds.length?`<option value="selected">Somente os selecionados (${selectedIds.length})</option>`:''}<option value="filtered">Todos os resultados filtrados (${filteredIds.length}) — todas as páginas</option></select></div><div class="form-grid"><div class="field"><label for="move-country">País de destino</label><select id="move-country">${Object.entries(COUNTRIES).map(([code,name])=>`<option value="${code}" ${code===state.country?'selected':''}>${esc(name)}</option>`).join('')}</select></div><div class="field"><label for="move-region">Estado / região de destino</label><select id="move-region">${regionOptions(state.country,REGIONS[state.country].some(r=>r.code===state.region)?state.region:'')}</select></div></div><p class="notice blue" id="move-summary" aria-live="polite"></p><p class="small muted">Os leads sairão da localização anterior. Notas, status, nichos e histórico serão preservados. Empresas repetidas no destino serão ignoradas; os outros leads serão movidos normalmente.</p><p id="move-error" role="alert" hidden></p></div><div class="modal-footer"><button type="button" data-close>Cancelar</button><button class="primary" type="submit" id="move-confirm">Mover leads</button></div></form>`;
  const scope=dialog.querySelector('#move-scope'),country=dialog.querySelector('#move-country'),region=dialog.querySelector('#move-region');
  const ids=()=>scope.value==='selected'?selectedIds:filteredIds;
  const summary=()=>{dialog.querySelector('#move-summary').textContent=`Mover ${ids().length} lead(s) para ${COUNTRIES[country.value]} · ${regionName(country.value,region.value)}.`;dialog.querySelector('#move-confirm').textContent=`Mover ${ids().length} lead(s)`;};
  country.onchange=()=>{region.innerHTML=regionOptions(country.value);summary();};scope.onchange=summary;region.onchange=summary;
  dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(!busy)dialog.close();});
  dialog.oncancel=e=>{if(busy)e.preventDefault();};
  dialog.querySelector('#move-form').onsubmit=async e=>{
    e.preventDefault();if(busy)return;busy=true;
    const targetCountry=country.value,targetRegion=region.value,movingIds=ids();
    const error=dialog.querySelector('#move-error');error.hidden=true;
    dialog.querySelectorAll('button,select').forEach(el=>el.disabled=true);
    try{
      const result=await moveRecords(state,movingIds,targetCountry,targetRegion);
      state.selected.clear();state.page=1;render();
      dialog.innerHTML=`<div class="modal-header"><h2 id="modal-title">Transferência concluída</h2></div><div class="modal-body"><p>${result.moved.length} lead(s) movido(s) para <strong>${esc(COUNTRIES[targetCountry])} · ${esc(regionName(targetCountry,targetRegion))}</strong>.</p>${result.skipped.length?`<p>${result.skipped.length} lead(s) ignorado(s) por já existir uma empresa igual no destino. Eles permanecem na localização original.</p><ul>${result.skipped.map(l=>`<li>${esc(l.name)}</li>`).join('')}</ul>`:''}</div><div class="modal-footer"><button class="primary" id="move-done">Concluir</button></div>`;
      dialog.querySelector('#move-done').onclick=()=>dialog.close();
      dialog.querySelector('#move-done').focus();
    }catch(err){error.textContent=err.message;error.hidden=false;}
    finally{busy=false;dialog.querySelectorAll('button,select').forEach(el=>el.disabled=false);}
  };
  summary();dialog.showModal();
}
