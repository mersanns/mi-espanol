/* Mi español — синхронизация прогресса через Supabase.
   Без настроек в supabase-config.js ничего не делает: всё живёт в localStorage, как раньше. */
(function(){
"use strict";
const CFG=window.MI_SUPABASE||{};
const ON=!!(CFG.url&&CFG.key);
const LIB="vendor/supabase-2.117.3.js";
const DAY=864e5,INT=[0,1,3,7,14];
let draft="",ctx=null,sb=null,user=null,timer=null,dirty=false,lastSync=0,sent=false,sentTo="",msg="",busy=false;
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
const same=(a,b)=>{const c=o=>{const x=Object.assign({},o);delete x._t;return JSON.stringify(x,Object.keys(x).sort())};return c(a)===c(b)};

/* ---------- Supabase ---------- */
function loadLib(){
  if(window.supabase)return Promise.resolve();
  return new Promise((ok,bad)=>{const s=document.createElement("script");s.src=LIB;s.onload=ok;s.onerror=bad;document.head.appendChild(s)});
}
async function pull(){
  if(!sb||!user||busy)return;busy=true;
  try{
    const {data,error}=await sb.from("progress").select("data").eq("user_id",user.id).maybeSingle();
    if(error)throw error;
    const local=ctx.get(),remote=data&&data.data||{};
    const m=merge(local,remote);
    const changedLocal=!same(m,local);
    if(changedLocal)ctx.set(m);
    if(!data||!same(m,remote))await push(true);
    lastSync=Date.now();msg="";
    if(changedLocal)ctx.rerender();
  }catch(e){console.warn("sync pull",e);msg="Нет связи — синхронизирую позже"}
  finally{busy=false;paint()}
}
async function push(now){
  if(!sb||!user)return;
  if(!now){dirty=true;clearTimeout(timer);timer=setTimeout(()=>push(true),1500);return}
  clearTimeout(timer);
  try{
    const {error}=await sb.from("progress").upsert({user_id:user.id,data:ctx.get(),updated_at:new Date().toISOString()});
    if(error)throw error;
    dirty=false;lastSync=Date.now();msg="";
  }catch(e){dirty=true;console.warn("sync push",e);msg="Нет связи — синхронизирую позже"}
  paint();
}
async function start(){
  await loadLib();
  sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{flowType:"pkce",detectSessionInUrl:true,persistSession:true,autoRefreshToken:true,storageKey:"mi-espanol-auth"}});
  sb.auth.onAuthStateChange((ev,session)=>{
    const was=user&&user.id;user=session&&session.user||null;if(user)handoff="";
    if(user&&user.id!==was)setTimeout(pull,0);
    paint();
  });
  const {data}=await sb.auth.getSession();user=data.session&&data.session.user||null;if(user)handoff="";
  if(user)pull();
  paint();
  window.addEventListener("online",()=>{if(dirty)push(true);else pull()});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")pull();else if(dirty)push(true)});
}

/* ---------- карточка во вкладке «Progreso» ---------- */
// На iPhone ссылка из письма открывается в Safari, а у приложения с экрана «Домой» своё хранилище.
// Поэтому Safari может передать вход приложению одноразовым кодом (refresh token) и сам из него выйти.
const STANDALONE=navigator.standalone===true||(window.matchMedia&&matchMedia("(display-mode: standalone)").matches);
const MOBILE=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
let handoff="";
const note=t=>t?'<p class="muted" style="font-size:.88rem">'+esc(t)+'</p>':"";
const handIn='<p style="font-size:.95rem">Вошла в Safari? Нажми там «Перенести вход в приложение» и вставь код сюда:</p>'+
  '<div class="row"><input type="text" id="syhand" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Код из Safari" style="max-width:220px"><button class="btn sm" data-sync="hand">Войти</button></div>';
function card(){
  if(!ON)return"";
  if(user)return'<div class="h3">Синхронизация</div><p>Вход: <b>'+esc(user.email)+'</b></p>'+
    note(msg||(dirty?"Сохраняю…":lastSync?"Прогресс одинаковый на всех устройствах · "+new Date(lastSync).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}):"Синхронизирую…"))+
    '<div class="row">'+(MOBILE&&!STANDALONE?'<button class="btn sm" data-sync="handoff">Перенести вход в приложение</button>':"")+'<button class="btn ghost sm" data-sync="out">Выйти</button></div>';
  if(handoff)return'<div class="h3">Синхронизация</div><p>Код для приложения скопирован. Открой «Mi español» с экрана «Домой» → Progreso и вставь его в поле «Код из Safari».</p>'+
    '<p style="font-family:var(--ipa);overflow-wrap:anywhere;user-select:all">'+esc(handoff)+'</p>'+
    '<div class="row"><button class="btn ghost sm" data-sync="copy">Скопировать ещё раз</button></div>'+note(msg||"В Safari вход больше не нужен — код работает один раз.");
  if(sent)return'<div class="h3">Синхронизация</div><p>Письмо отправлено на <b>'+esc(sentTo)+'</b>. Открой ссылку из письма'+(STANDALONE?" — она откроется в Safari.":" на этом устройстве.")+'</p>'+
    (STANDALONE?handIn:"")+'<div class="row"><button class="btn ghost sm" data-sync="back">Другой e-mail</button></div>'+note(msg);
  return'<div class="h3">Синхронизация</div><p class="muted">Войди по e-mail — коробки карточек, упражнения, ответы в «Sobre mí» и твои факты будут одинаковыми на телефоне и ноутбуке. Без входа всё хранится в этом браузере.</p>'+
    '<div class="row"><input type="email" autocomplete="email" id="symail" value="'+esc(draft)+'" placeholder="твой e-mail" style="max-width:260px"><button class="btn sm" data-sync="send">Прислать ссылку</button></div>'+
    (STANDALONE?handIn:"")+note(msg);
}
function paint(){const el=document.getElementById("sync");if(el)el.innerHTML=card()}
const copy=t=>{try{return navigator.clipboard.writeText(t).then(()=>true,()=>false)}catch(e){return Promise.resolve(false)}};
async function act(a){
  if(!sb)return;
  if(a==="send"){
    const email=draft=(document.getElementById("symail").value||"").trim();
    if(!/^\S+@\S+\.\S+$/.test(email)){msg="Проверь адрес";paint();return}
    msg="Отправляю…";paint();
    const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
    if(error){msg=/rate|seconds/i.test(error.message)?"Подожди минуту и попробуй ещё раз":"Не получилось отправить письмо";console.warn(error);paint();return}
    sent=true;sentTo=email;msg="";paint();
  }else if(a==="hand"){
    const rt=(document.getElementById("syhand").value||"").trim();
    if(!rt){msg="Вставь код из Safari";paint();return}
    msg="Проверяю…";paint();
    const {error}=await sb.auth.refreshSession({refresh_token:rt});
    if(error){msg="Код не подошёл — получи в Safari новый";console.warn(error);paint();return}
    sent=false;msg="";paint();
  }else if(a==="handoff"){
    const {data}=await sb.auth.getSession();if(!data.session)return;
    if(dirty)await push(true);
    sb.auth.stopAutoRefresh();try{localStorage.removeItem("mi-espanol-auth")}catch(e){}
    handoff=data.session.refresh_token;user=null;
    msg=await copy(handoff)?"":"Скопируй код вручную — выдели его и нажми «Скопировать».";paint();
  }else if(a==="copy"){msg=await copy(handoff)?"Скопировано":"Выдели код и скопируй вручную";paint()}
  else if(a==="back"){sent=false;msg="";paint()}
  else if(a==="out"){if(dirty)await push(true);await sb.auth.signOut();user=null;msg="";paint()}
}
document.addEventListener("click",e=>{const t=e.target.closest("[data-sync]");if(t)act(t.dataset.sync)});
document.addEventListener("keydown",e=>{if(e.key!=="Enter")return;if(e.target.id==="symail")act("send");if(e.target.id==="syhand")act("hand")});

window.MiSync={
  on:ON,merge,
  attach(c){ctx=c;if(ON)start().catch(e=>{console.warn("sync",e)})},
  changed(){if(user)push(false)},
  mount(el){el.hidden=!ON;el.innerHTML=card()}
};
})();
