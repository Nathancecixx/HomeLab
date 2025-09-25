// Utility
async function onModuleClick(e, name){
const btn = e.target.closest('button[data-op]'); if(!btn) return
const op = btn.dataset.op
if(op === 'logs'){ openLogs(name); return }
btn.disabled = true
try{ await api(`/api/admin/modules/${encodeURIComponent(name)}`, { method:'POST', body: JSON.stringify({ op }) }); toast(`${op} sent to ${name}`) }
catch(e){ alert(e.message) }
finally{ btn.disabled=false; setTimeout(loadModules, 700) }
}


// Logs drawer via SSE
let logEvtSrc=null, logPaused=false
function openLogs(name){
$('#logs').classList.add('open')
$('#logs-title').textContent = `Logs: ${name}`
const body = $('#logs-body'); body.textContent=''
if(logEvtSrc) logEvtSrc.close()
logEvtSrc = new EventSource(`/api/admin/logs/${encodeURIComponent(name)}`)
logEvtSrc.addEventListener('log', ev => { if(!logPaused){ body.textContent += ev.data } body.scrollTop = body.scrollHeight })
logEvtSrc.addEventListener('done', ev => { toast(`Logs ended (code ${ev.data})`) })
}
$('#logs-close').addEventListener('click', ()=>{ if(logEvtSrc) logEvtSrc.close(); $('#logs').classList.remove('open') })
$('#logs-clear').addEventListener('click', ()=>{ $('#logs-body').textContent='' })
$('#logs-pause').addEventListener('click', function(){ logPaused = !logPaused; this.textContent = logPaused? 'Resume':'Pause' })


// ENV editor (dynamic)
async function loadEnv(){
const { env, byService } = await api('/api/admin/env')
const form = $('#env-form'); form.innerHTML=''
const order = Object.keys(byService).length ? Object.keys(byService) : ['global']
for (const svc of order){
const d = descriptorFor(svc) || { display: svc }
const keys = byService[svc] || []
if (!keys.length) continue
const title = document.createElement('h3'); title.textContent = `Config · ${d.display || svc}`; title.style.margin='8px 4px'; form.appendChild(title)
for (const k of keys){
const masked = /PASSWORD|SECRET|KEY/i.test(k) && env[k]
const group = document.createElement('div'); group.className='group'
group.innerHTML = `
<label for="k_${k}">${k}</label>
<div class="row gap">
<input id="k_${k}" type="${masked?'password':'text'}" value="${masked? '••••••••' : (env[k]??'')}" ${masked? 'data-masked="1"':''}>
${masked? '<button class="btn" data-toggle="reveal" data-for="k_'+k+'">Reveal</button>':''}
</div>`
form.appendChild(group)
}
}
}


$('#btn-reload-env').addEventListener('click', loadEnv)
$('#btn-save-env').addEventListener('click', async ()=>{
const updates = {}
$$('#env-form input').forEach(inp => { const k = inp.id.slice(2); const masked = inp.dataset.masked==='1'; if(masked && inp.value==='••••••••') return; updates[k] = inp.value })
try{ const r = await api('/api/admin/env', { method:'PATCH', body: JSON.stringify({ updates }) }); toast('Saved .env (backup '+r.backup+')') }
catch(e){ alert('Save failed: '+e.message) }
})


document.addEventListener('click', e=>{
const t = e.target.closest('[data-toggle="reveal"]'); if(!t) return
const id = t.dataset.for; const inp = document.getElementById(id)
if(inp.dataset.masked==='1'){ inp.dataset.masked='0'; inp.type='text'; inp.value=''; inp.placeholder='enter new secret' ; t.textContent='Hide' }
else { inp.dataset.masked='1'; inp.type='password'; inp.value='••••••••'; t.textContent='Reveal' }
})


// WireGuard helpers
async function loadPeers(){
try{ const { peers } = await api('/api/admin/wg/peers'); const sel = $('#wg-peer'); sel.innerHTML = peers.map(p=>`<option>${p}</option>`).join('') }
catch{ $('#wg-peer').innerHTML = '' }
}
$('#wg-view-conf').addEventListener('click', async ()=>{ const name = $('#wg-peer').value; const { conf } = await api(`/api/admin/wg/peer/${encodeURIComponent(name)}`); $('#wg-output').textContent = conf })
$('#wg-show-qr').addEventListener('click', async ()=>{ const name = $('#wg-peer').value; const { png } = await api(`/api/admin/wg/peer/${encodeURIComponent(name)}/qr`); $('#wg-output').innerHTML = `<img alt="QR" src="${png}" />` })


// Toasts
function toast(msg){ const n = document.createElement('div'); n.className='toast card'; n.textContent = msg; document.body.appendChild(n); setTimeout(()=>n.classList.add('show'),10); setTimeout(()=>{n.classList.remove('show'); setTimeout(()=>n.remove(),250)}, 3000) }


// Boot
async function init(){ await ensureAuth(); await loadRegistry(); await Promise.all([loadModules(), loadEnv(), loadPeers()]) }
window.addEventListener('keydown', e=>{ if(e.key==='l' && (e.ctrlKey||e.metaKey)) { e.preventDefault(); $('#logs').classList.toggle('open') } })
init()