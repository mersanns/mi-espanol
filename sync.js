/* Mi español — синхронизация прогресса по коду, без входа и писем.
   Код (например K7QM-3XRP-W9TD) создаётся на одном устройстве и вводится на другом.
   Данные лежат в Supabase; без кода их не прочитать. Без кода синхронизации всё живёт в localStorage. */
(function(){
"use strict";
const CFG=window.MI_SUPABASE||{};
const ON=!!(CFG.url&&CFG.key);
const CODE_KEY="mi-espanol-sync";
const ABC="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DAY=864e5,INT=[0,1,3,7,14];
let code="",ctx=null,timer=null,dirty=false,lastSync=0,msg="",busy=false,joining=false;
try{code=localStorage.getItem(CODE_KEY)||""}catch(e){}
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- слияние двух состояний ---------- */
// Время повторения карточки: due = момент ответа + интервал коробки.
const seenAt=(s,id)=>s.due&&s.due[id]!=null?s.due[id]-INT[s.box&&s.box[id]!=null?s.box[id]:0]*DAY:-1;
function merge(L,R){
  L=L||{};R=R||{};
  const r0=Math.max(L.resetAt||0,R.resetAt||0);
  const newer=(L._t||0)>=(R._t||0)?L:R,older=newer===L?R:L;
  const fresh=[L,R].filter(s=>(s.resetAt||0)>=r0);
  const out=Object.assign({},older,newer);
  out.box={};out.due={};
  new Set([...Object.keys(L.due||{}),...Object.keys(R.due||{})]).forEach(id=>{
    const a=seenAt(L,id),b=seenAt(R,id),src=a>=b?L:R,t=Math.max(a,b);
    if(t<r0||t<0)return;out.box[id]=src.box[id];out.due[id]=src.due[id]});
  out.ex={};out.exv={};
  new Set([...Object.keys(L.ex||{}),...Object.keys(R.ex||{})]).forEach(id=>{
    const a=(L.ex||{})[id],b=(R.ex||{})[id],src=!b||(a&&(a.at||0)>=(b.at||0))?L:R,e=src.ex[id];
    if((e.at||0)<r0)return;out.ex[id]=e;if(src.exv&&src.exv[id])out.exv[id]=src.exv[id]});
  out.days={};out.mist={};out.xp=0;
  fresh.forEach(s=>{
    Object.entries(s.days||{}).forEach(([d,n])=>out.days[d]=Math.max(out.days[d]||0,n));
    Object.entries(s.mist||{}).forEach(([k,n])=>out.mist[k]=Math.max(out.mist[k]||0,n));
    out.xp=Math.max(out.xp,s.xp||0)});
  out.my=Object.assign({},older.my||{});
  Object.entries(newer.my||{}).forEach(([k,v])=>{if(v||!out.my[k])out.my[k]=v});
  const seen=new Set(),mf=[];
  [...(older.myfacts||[]),...(newer.myfacts||[])].forEach(f=>{const k=f.t+"|"+f.x;if(!seen.has(k)){seen.add(k);mf.push(f)}});
  out.myfacts=mf;
  out.resetAt=r0;out._t=Math.max(L._t||0,R._t||0);
  return out;
}
const canon=v=>Array.isArray(v)?"["+v.map(canon).join(",")+"]":v&&typeof v==="object"?"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canon(v[k])).join(",")+"}":JSON.stringify(v===undefined?null:v);
const same=(a,b)=>{const c=o=>{const x=Object.assign({},o);delete x._t;return canon(x)};return c(a)===c(b)};

/* ---------- код ---------- */
const newCode=()=>{const r=crypto.getRandomValues(new Uint8Array(12));return[...r].map(n=>ABC[n%ABC.length]).join("").replace(/(.{4})(?=.)/g,"$1-")};
const norm=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const pretty=s=>norm(s).replace(/(.{4})(?=.)/g,"$1-");
const setCode=c=>{code=c;try{c?localStorage.setItem(CODE_KEY,c):localStorage.removeItem(CODE_KEY)}catch(e){}};

/* ---------- сервер ---------- */
const rpc=(fn,body)=>fetch(CFG.url+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:CFG.key,"Content-Type":"application/json"},body:JSON.stringify(body)})
  .then(r=>r.ok?(r.status===204?null:r.json()):r.text().then(t=>{throw new Error(fn+" "+r.status+" "+t)}));
async function pull(){
  if(!code||busy)return;busy=true;
  try{
    const remote=await rpc("sync_get",{p_code:norm(code)});
    const local=ctx.get(),m=merge(local,remote||{});
    const changedLocal=!same(m,local);
    if(changedLocal)ctx.set(m);
    if(!remote||!same(m,remote))await push(true);
    lastSync=Date.now();msg="";
    if(changedLocal)ctx.rerender();
  }catch(e){console.warn("sync pull",e);msg="Нет связи — синхронизирую позже"}
  finally{busy=false;paint()}
}
async function push(now){
  if(!code)return;
  if(!now){dirty=true;clearTimeout(timer);timer=setTimeout(()=>push(true),1500);return}
  clearTimeout(timer);
  try{await rpc("sync_put",{p_code:norm(code),p_data:ctx.get()});dirty=false;lastSync=Date.now();msg=""}
  catch(e){dirty=true;console.warn("sync push",e);msg="Нет связи — синхронизирую позже"}
  paint();
}

/* ---------- карточка во вкладке «Progreso» ---------- */
const note=t=>t?'<p class="muted" style="font-size:.88rem">'+esc(t)+'</p>':"";
function card(){
  if(!ON)return"";
  if(code)return'<div class="h3">Синхронизация</div>'+
    '<p>Код этого устройства — введи его на телефоне или ноутбуке, и прогресс станет общим:</p>'+
    '<p style="font-family:var(--sans);font-weight:700;font-size:1.35rem;letter-spacing:.08em;color:var(--wine);user-select:all">'+esc(pretty(code))+'</p>'+
    note(msg||(dirty?"Сохраняю…":lastSync?"Синхронизировано · "+new Date(lastSync).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}):"Синхронизирую…"))+
    '<div class="row"><button class="btn ghost sm" data-sync="copy">Скопировать код</button><button class="btn ghost sm" data-sync="off">Отключить здесь</button></div>';
  return'<div class="h3">Синхронизация</div><p class="muted">Коробки карточек, упражнения, ответы в «Sobre mí» и твои факты — одинаковые на телефоне и ноутбуке. Без паролей и писем: только код.</p>'+
    (joining?'<div class="row"><input type="text" id="sycode" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" style="max-width:220px"><button class="btn sm" data-sync="join">Подключить</button><button class="btn ghost sm" data-sync="cancel">Отмена</button></div>'
     :'<div class="row"><button class="btn sm" data-sync="new">Включить синхронизацию</button><button class="btn ghost sm" data-sync="enter">У меня уже есть код</button></div>')+
    note(msg);
}
function paint(){const el=document.getElementById("sync");if(el)el.innerHTML=card()}
async function act(a){
  if(a==="new"){setCode(newCode());msg="";paint();await push(true)}
  else if(a==="enter"){joining=true;msg="";paint();const i=document.getElementById("sycode");if(i)i.focus()}
  else if(a==="cancel"){joining=false;msg="";paint()}
  else if(a==="join"){
    const c=norm(document.getElementById("sycode").value);
    if(c.length!==12){msg="В коде 12 символов — проверь";paint();return}
    msg="Подключаю…";paint();
    try{const remote=await rpc("sync_get",{p_code:c});if(!remote){msg="Такого кода нет — проверь буквы";paint();return}}
    catch(e){console.warn(e);msg="Нет связи — попробуй позже";paint();return}
    setCode(c);joining=false;msg="";await pull();
  }
  else if(a==="copy"){try{await navigator.clipboard.writeText(pretty(code));msg="Код скопирован"}catch(e){msg="Выдели код и скопируй вручную"}paint()}
  else if(a==="off"){if(dirty)await push(true);setCode("");lastSync=0;msg="Синхронизация на этом устройстве выключена. Прогресс остался здесь.";paint()}
}
document.addEventListener("click",e=>{const t=e.target.closest("[data-sync]");if(t)act(t.dataset.sync)});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="sycode")act("join")});

window.MiSync={
  on:ON,merge,
  attach(c){
    ctx=c;if(!ON)return;
    if(code)pull();
    window.addEventListener("online",()=>{if(dirty)push(true);else pull()});
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")pull();else if(dirty)push(true)});
    setInterval(()=>{if(document.visibilityState==="visible"&&!dirty)pull()},60000);
  },
  changed(){if(code)push(false)},
  mount(el){el.hidden=!ON;el.innerHTML=card()}
};
})();
