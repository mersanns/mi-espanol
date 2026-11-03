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
    const was=user&&user.id;user=session&&session.user||null;
    if(user&&user.id!==was)setTimeout(pull,0);
    paint();
  });
  const {data}=await sb.auth.getSession();user=data.session&&data.session.user||null;
  if(user)pull();
  paint();
  window.addEventListener("online",()=>{if(dirty)push(true);else pull()});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")pull();else if(dirty)push(true)});
}

/* ---------- карточка во вкладке «Progreso» ---------- */
function card(){
  if(!ON)return"";
  if(user)return'<div class="h3">Синхронизация</div><p>Вход: <b>'+esc(user.email)+'</b></p>'+
    '<p class="muted" style="font-size:.88rem">'+(msg?esc(msg):dirty?"Сохраняю…":lastSync?"Прогресс одинаковый на всех устройствах · "+new Date(lastSync).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}):"Синхронизирую…")+'</p>'+
    '<div class="row"><button class="btn ghost sm" data-sync="out">Выйти</button></div>';
  if(sent)return'<div class="h3">Синхронизация</div><p>Письмо отправлено на <b>'+esc(sentTo)+'</b>. Открой ссылку из письма на этом устройстве — или введи код из письма:</p>'+
    '<div class="row"><input type="text" inputmode="numeric" autocomplete="one-time-code" id="sycode" placeholder="Код из письма" style="max-width:200px"><button class="btn sm" data-sync="code">Войти</button><button class="btn ghost sm" data-sync="back">Другой e-mail</button></div>'+
    (msg?'<p class="muted" style="font-size:.88rem">'+esc(msg)+'</p>':"");
  return'<div class="h3">Синхронизация</div><p class="muted">Войди по e-mail — коробки карточек, упражнения, ответы в «Sobre mí» и твои факты будут одинаковыми на телефоне и ноутбуке. Без входа всё хранится в этом браузере.</p>'+
    '<div class="row"><input type="email" autocomplete="email" id="symail" value="'+esc(draft)+'" placeholder="твой e-mail" style="max-width:260px"><button class="btn sm" data-sync="send">Прислать ссылку</button></div>'+
    (msg?'<p class="muted" style="font-size:.88rem">'+esc(msg)+'</p>':"");
}
function paint(){const el=document.getElementById("sync");if(el)el.innerHTML=card()}
async function act(a){
  if(!sb)return;
  if(a==="send"){
    const email=draft=(document.getElementById("symail").value||"").trim();
    if(!/^\S+@\S+\.\S+$/.test(email)){msg="Проверь адрес";paint();return}
    msg="Отправляю…";paint();
    const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
    if(error){msg=/rate|seconds/i.test(error.message)?"Подожди минуту и попробуй ещё раз":"Не получилось отправить письмо";console.warn(error);paint();return}
    sent=true;sentTo=email;msg="";paint();
  }else if(a==="code"){
    const token=(document.getElementById("sycode").value||"").replace(/\s/g,"");
    if(!token){msg="Введи код из письма";paint();return}
    msg="Проверяю…";paint();
    const {error}=await sb.auth.verifyOtp({email:sentTo,token,type:"email"});
    if(error){msg="Код не подошёл — проверь или запроси новое письмо";console.warn(error);paint();return}
    sent=false;msg="";
  }else if(a==="back"){sent=false;msg="";paint()}
  else if(a==="out"){if(dirty)await push(true);await sb.auth.signOut();user=null;msg="";paint()}
}
document.addEventListener("click",e=>{const t=e.target.closest("[data-sync]");if(t)act(t.dataset.sync)});
document.addEventListener("keydown",e=>{if(e.key!=="Enter")return;if(e.target.id==="symail")act("send");if(e.target.id==="sycode")act("code")});

window.MiSync={
  on:ON,merge,
  attach(c){ctx=c;if(ON)start().catch(e=>{console.warn("sync",e)})},
  changed(){if(user)push(false)},
  mount(el){el.hidden=!ON;el.innerHTML=card()}
};
})();
