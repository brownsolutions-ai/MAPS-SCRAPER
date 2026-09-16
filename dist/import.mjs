import {FIELDS,COUNTRIES,autoMap,planImport,escape as esc} from './core.mjs';
import {icon} from './icons.mjs';
import {importCompanies} from './store.mjs';

export function showImport({state,toast,render,navigate}){
  const modal=document.querySelector('#modal');
  let book=null,rows=[],headers=[],mapping={},filename='',country=state.country||'BR';
  const countryOptions=()=>Object.entries(COUNTRIES).map(([code,name])=>`<option value="${code}" ${country===code?'selected':''}>${esc(name)}</option>`).join('');
  modal.innerHTML=`<div class="modal-header"><div><h2 id="modal-title">Importar planilha</h2><p>Excel, CSV ou TSV · até 25 MB</p></div><button class="icon-button" data-close aria-label="Fechar">${icon('close')}</button></div><div class="modal-body"><div class="field"><label for="import-country">País desta lista</label><select id="import-country">${countryOptions()}</select><small>Todos os leads desta planilha serão organizados na área escolhida.</small></div><div class="drop-zone" id="drop"><span class="upload-icon">${icon('upload')}</span><strong>Arraste sua planilha para cá</strong><p>O CRM mostra uma prévia antes de salvar qualquer empresa.</p><label for="file">Selecionar arquivo</label><input id="file" type="file" accept=".xlsx,.xls,.csv,.tsv" hidden></div></div><div class="modal-footer"><span class="small muted">Empresas repetidas preservam status, notas e follow-up.</span><button data-close>Cancelar</button></div>`;
  modal.showModal();
  const close=()=>modal.close();
  modal.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
  modal.oncancel=()=>{};
  const drop=modal.querySelector('#drop'),fileInput=modal.querySelector('#file');
  modal.querySelector('#import-country').onchange=e=>{country=e.target.value;};
  for(const ev of ['dragenter','dragover'])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag');});
  for(const ev of ['dragleave','drop'])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag');});
  drop.addEventListener('drop',e=>readFile(e.dataTransfer.files[0]));
  fileInput.addEventListener('change',()=>readFile(fileInput.files[0]));
  async function readFile(file){
    if(!file)return;if(file.size>25*1024*1024){toast('O arquivo ultrapassa 25 MB.');return;}
    if(!/\.(xlsx|xls|csv|tsv)$/i.test(file.name)){toast('Use um arquivo Excel, CSV ou TSV.');return;}
    try{const data=await file.arrayBuffer();const textFile=/\.(csv|tsv)$/i.test(file.name);book=globalThis.XLSX.read(textFile?new TextDecoder('utf-8').decode(data):data,{type:textFile?'string':'array',cellDates:true,raw:false,FS:file.name.toLowerCase().endsWith('.tsv')?'\t':undefined});filename=file.name;chooseSheet();}catch{toast('Não foi possível ler a planilha. Verifique o arquivo.');}
  }
  function chooseSheet(){
    const names=book.SheetNames;
    modal.querySelector('.modal-body').innerHTML=`<div class="file-details">${icon('file')}<div><strong>${esc(filename)}</strong><small>${names.length} aba(s) · ${esc(COUNTRIES[country])}</small></div><button data-change>Trocar arquivo</button></div><div class="field"><label for="sheet">Aba que contém as empresas</label><select id="sheet">${names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select></div><div class="notice blue">A primeira linha da aba será usada como cabeçalho das colunas.</div>`;
    modal.querySelector('.modal-footer').innerHTML=`<button data-close>Cancelar</button><button class="primary" data-next>Revisar colunas ${icon('arrow')}</button>`;
    modal.querySelector('[data-change]').onclick=()=>{modal.close();showImport({state,toast,render,navigate});};
    modal.querySelector('[data-close]').onclick=close;
    modal.querySelector('[data-next]').onclick=()=>parseSheet(modal.querySelector('#sheet').value);
  }
  function parseSheet(sheet){
    const matrix=globalThis.XLSX.utils.sheet_to_json(book.Sheets[sheet],{header:1,defval:'',raw:false,blankrows:false});
    if(matrix.length<2){toast('A aba precisa ter cabeçalho e pelo menos uma empresa.');return;}
    headers=matrix[0].map((h,i)=>String(h||`Coluna ${i+1}`).trim());rows=matrix.slice(1);mapping=autoMap(headers);showMapping();
  }
  function showMapping(){
    modal.querySelector('.modal-body').innerHTML=`<div class="file-details">${icon('file')}<div><strong>${esc(filename)}</strong><small>${rows.length.toLocaleString('pt-BR')} linhas para revisar</small></div></div><h3 style="margin-bottom:6px">Associe as colunas</h3><p class="muted small" style="margin-bottom:20px">Reconhecemos os títulos mais comuns. Confira principalmente o nome e o site.</p><div class="mapping-grid">${Object.entries(FIELDS).map(([k,label])=>`<div class="field"><label>${esc(label)}</label><select data-map="${k}"><option value="-1">Ignorar coluna</option>${headers.map((h,i)=>`<option value="${i}" ${mapping[k]===i?'selected':''}>${esc(h)}</option>`).join('')}</select></div>`).join('')}</div>`;
    modal.querySelector('.modal-footer').innerHTML=`<button data-back>${icon('left')} Voltar</button><button class="primary" data-preview>Conferir importação ${icon('arrow')}</button>`;
    modal.querySelector('[data-back]').onclick=chooseSheet;
    modal.querySelector('[data-preview]').onclick=()=>{modal.querySelectorAll('[data-map]').forEach(s=>mapping[s.dataset.map]=Number(s.value));if(mapping.name<0){toast('Escolha a coluna com o nome da empresa.');return;}showPreview();};
  }
  function showPreview(){
    const plan=planImport(rows,mapping,state.leads,country);
    if(!plan.leads.length){toast('Nenhuma empresa válida foi encontrada.');return;}
    modal.querySelector('.modal-body').innerHTML=`<h3>Pronto para importar em ${esc(COUNTRIES[country])}</h3><div class="import-summary"><div><strong>${plan.created}</strong><span>novas empresas</span></div><div><strong>${plan.updated}</strong><span>já existentes</span></div><div><strong>${plan.invalid+plan.duplicates}</strong><span>linhas ignoradas</span></div></div>${state.demo?`<div class="notice">Você ainda está na demonstração. A importação funcionará nesta sessão, mas só ficará salva depois de entrar na sua conta.</div>`:''}<h3 style="margin:22px 0 10px">Prévia</h3><div class="preview-table"><table><thead><tr><th>EMPRESA</th><th>CIDADE</th><th>TELEFONE</th><th>SITE</th></tr></thead><tbody>${plan.leads.slice(0,5).map(l=>`<tr><td>${esc(l.name)}</td><td>${esc(l.city)}</td><td>${esc(l.phone)}</td><td>${esc(l.website||'Não informado')}</td></tr>`).join('')}</tbody></table></div>`;
    modal.querySelector('.modal-footer').innerHTML=`<button data-back>${icon('left')} Corrigir colunas</button><button class="primary" data-confirm>Importar ${plan.leads.length.toLocaleString('pt-BR')} empresas</button>`;
    modal.querySelector('[data-back]').onclick=showMapping;
    modal.querySelector('[data-confirm]').onclick=async e=>{const btn=e.currentTarget;btn.disabled=true;btn.innerHTML='<span class="loader"></span> Importando';try{const result=await importCompanies(state,plan,filename,country);state.country=country;modal.close();navigate('all');toast(result.saved?`Planilha importada em ${COUNTRIES[country]} e salva no Supabase.`:'Planilha importada nesta demonstração. Conecte sua conta para salvar.');}catch(err){btn.disabled=false;btn.textContent='Tentar novamente';toast(err.message);}};
  }
}
