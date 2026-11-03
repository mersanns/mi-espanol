/* Mi español — загрузка данных и логика приложения */
(function(){
"use strict";
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(e=>console.warn("SW",e)));
const FILES=["decks","cards","exercises","lessons","lex","tr","verbs","facts","sobre","icons","flags"];
const getJSON=p=>fetch(p).then(r=>{if(!r.ok)throw new Error(p+" "+r.status);return r.json()});
Promise.all([...FILES.map(f=>getJSON("data/"+f+".json")),getJSON("data/stickers.json")])
 .then(parts=>{const STK=parts.pop();run(Object.assign({},...parts),STK)})
 .catch(err=>{console.error(err);const b=document.querySelector(".bootscr");if(b){b.classList.add("err");b.querySelector("i").textContent="Не получилось загрузить данные — обнови страницу"}});

function run(DATA,STK){
(function(){
"use strict";
const D=DATA,$=s=>document.querySelector(s),view=$("#view");
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const rnd=n=>Math.floor(Math.random()*n),pick=a=>a[rnd(a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const ic=(n,cls)=>D.icons[n]?'<svg class="ic '+(cls||"")+'" viewBox="0 0 256 256" aria-hidden="true"><path d="'+D.icons[n]+'"/></svg>':"";
const img=(k,cls,st)=>STK[k]?'<img class="'+(cls||"")+'" src="'+STK[k]+'" alt="" style="'+(st||"")+'">':"";
const flag=c=>D.flags[c]?'<span class="fl">'+D.flags[c]+'</span>':"";

/* ---------- state ---------- */
const KEY="mi-espanol-v2";
let ST={box:{},due:{},xp:0,days:{},mist:{},mode:"curso",les:"all",ex:{},my:{},myfacts:[],hide:false};
try{const old=localStorage.getItem("mi-espanol-v1");if(old)Object.assign(ST,JSON.parse(old));const r=localStorage.getItem(KEY);if(r)Object.assign(ST,JSON.parse(r))}catch(e){}
ST.ex=ST.ex||{};ST.my=ST.my||{};ST.myfacts=ST.myfacts||[];
const save=()=>{ST._t=Date.now();try{localStorage.setItem(KEY,JSON.stringify(ST))}catch(e){}if(window.MiSync)MiSync.changed()};
const dstr=(t=Date.now())=>{const d=new Date(t);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const DAY=864e5,INT=[0,1,3,7,14];
const streak=()=>{let n=0,t=Date.now();if(!ST.days[dstr(t)])t-=DAY;while(ST.days[dstr(t)]){n++;t-=DAY}return n};
const todayN=()=>ST.days[dstr()]||0;
const CARD={};D.cards.forEach(c=>CARD[c.id]=c);
const boxOf=id=>ST.box[id]===undefined?-1:ST.box[id];
function mark(id,ok){const b=boxOf(id);const nb=ok?Math.min(4,(b<0?0:b)+1):0;ST.box[id]=nb;ST.due[id]=Date.now()+INT[nb]*DAY;if(!ok)ST.mist[id]=(ST.mist[id]||0)+1}
function bump(k,ok){if(k&&!ok)ST.mist[k]=(ST.mist[k]||0)+1}
function tick(ok){ST.days[dstr()]=todayN()+1;if(ok)ST.xp+=10;save()}
function toast(t){const e=document.createElement("div");e.className="toast";e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),1800)}

/* ---------- speech ---------- */
let VOICE=null;
function pickVoice(){try{const vs=speechSynthesis.getVoices();VOICE=vs.find(v=>/^es[-_]ES/i.test(v.lang))||vs.find(v=>/^es/i.test(v.lang))||null}catch(e){}}
try{pickVoice();speechSynthesis.onvoiceschanged=pickVoice}catch(e){}
function say(t,rate){try{const u=new SpeechSynthesisUtterance(String(t).replace(/\s*\/\s*/g,", ").replace(/___/g,"…"));u.lang="es-ES";if(VOICE)u.voice=VOICE;u.rate=rate||.85;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){toast("Озвучка недоступна в этом браузере")}}
const spk=(t,cls)=>'<button class="spk '+(cls||"")+'" data-act="say" data-t="'+esc(t)+'" aria-label="Произнести">'+ic("speaker-high")+'</button>';

/* ---------- clickable words ---------- */
const WRE=/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g;
const TR=D.tr||{},ART=D.art||{},SENT=[],SID=new Map(),NRU={};
D.cards.forEach(c=>{const m=/^(el|la|los|las) (\S+)$/.exec(c.es);if(m&&!NRU[m[2].toLowerCase()])NRU[m[2].toLowerCase()]=c.ru});
const sid=ru=>{if(!SID.has(ru)){SID.set(ru,SENT.length);SENT.push(ru)}return SID.get(ru)};
function words(t,ru){
  if(ru===undefined)ru=TR[t];const ds=ru?' data-s="'+sid(ru)+'"':"";
  let out="",last=0;String(t).replace(WRE,(m,i)=>{out+=esc(t.slice(last,i)).replace(/\n/g,"<br>")+'<span class="w" data-w="'+esc(m)+'"'+ds+'>'+esc(m)+'</span>';last=i+m.length;return m});
  return out+esc(String(t).slice(last)).replace(/\n/g,"<br>")}
const pop=$("#pop");let popEl=null;
function showPop(el){
  const w=el.dataset.w,k=w.toLowerCase(),kf=k.normalize("NFD").replace(/[\u0300-\u036f]/g,""),e=D.lex[k]||D.lex[kf],a=ART[k]||ART[kf],ru=el.dataset.s?SENT[el.dataset.s]:"";
  if(popEl)popEl.classList.remove("on");popEl=el;el.classList.add("on");
  let h='<div class="row between" style="flex-wrap:nowrap"><span class="pw">'+(a?'<span class="part">'+esc(a)+'</span> ':"")+esc(w)+'</span>'+spk(a?a.split("/")[0]+" "+w:w)+'</div>';
  if(e){h+='<span class="pr">'+esc(a&&NRU[k]||e[0])+'</span>';if(e[1]&&e[1]!==k)h+='<span class="pn">'+(e[2]?esc(e[2])+" · ":"")+'от <b>'+esc(e[1])+'</b></span>';else if(e[2])h+='<span class="pn">'+esc(e[2])+'</span>'}
  else h+='<span class="pn">Нет в словаре — нажми на динамик, чтобы послушать.</span>';
  if(ru){const blk=el.closest(".readblk");h+=ru.length>220&&blk?'<button class="btn soft sm psent" data-act="poptr">'+ic("translate")+'Перевод всего текста</button>':'<div class="psent">'+esc(ru).replace(/\n/g,"<br>")+'</div>'}
  pop.innerHTML=h;placePop(el.getBoundingClientRect());say(w)}
function placePop(r){pop.hidden=false;const pw=pop.offsetWidth,ph=pop.offsetHeight;
  let x=Math.min(Math.max(12,r.left+r.width/2-pw/2),innerWidth-pw-12),y=r.bottom+8;if(y+ph>innerHeight-10)y=r.top-ph-8;
  pop.style.left=x+"px";pop.style.top=Math.max(10,y)+"px"}
function hidePop(){pop.hidden=true;if(popEl)popEl.classList.remove("on");popEl=null}

/* ---------- перевод выделенной фразы ---------- */
const pkey=s=>String(s).toLowerCase().replace(/[¿?¡!.,;:«»"()…—–-]/g," ").replace(/\s+/g," ").trim();
let PH=null;const ONL=new Map();
function phraseRu(t){
  if(!PH){PH=new Map();Object.entries(D.lex).forEach(([k,v])=>{if(k.includes(" "))PH.set(pkey(k),v[0])});D.cards.forEach(c=>{PH.set(pkey(c.es),c.ru);const m=/^(el|la|los|las) (.+)$/.exec(c.es);if(m&&!PH.has(pkey(m[2])))PH.set(pkey(m[2]),c.ru)});Object.entries(TR).forEach(([k,v])=>PH.set(pkey(k.replace(/\[([^\]]*)\]/g,(_,a)=>a.split("/")[0])),v))}
  return PH.get(pkey(t))}
function gloss(w){const k=w.toLowerCase(),kf=k.normalize("NFD").replace(/[̀-ͯ]/g,""),e=D.lex[k]||D.lex[kf],a=ART[k]||ART[kf];
  return e?String(a&&NRU[k]||e[0]).split(/[;,(]/)[0].trim():"—"}
function selPhrase(){const s=getSelection();if(!s||s.isCollapsed||!s.rangeCount)return null;
  const t=s.toString().replace(/\s+/g," ").trim(),ws=t.match(WRE)||[];
  if(ws.length<2||t.length>300||!view.contains(s.anchorNode))return null;return{t,ws,r:s.getRangeAt(0).getBoundingClientRect()}}
function showPhrase(p){
  if(popEl)popEl.classList.remove("on");popEl=null;
  const known=phraseRu(p.t);
  let h='<div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><span class="pw pph">'+esc(p.t)+'</span>'+spk(p.t)+'</div>';
  h+=known?'<span class="pr">'+esc(known)+'</span>':'<span class="pr" id="ponl"><span class="pn">перевожу…</span></span>';
  h+='<div class="pwords">'+p.ws.map(w=>'<span><b>'+esc(w)+'</b> '+esc(gloss(w))+'</span>').join("")+'</div>';
  pop.innerHTML=h;placePop(p.r);
  if(known)return;
  const key=pkey(p.t),put=v=>{const el=document.getElementById("ponl");if(el)el.innerHTML=v;placePop(p.r)};
  const got=ONL.get(key);if(got)return put(esc(got)+' <span class="pn">· онлайн-перевод</span>');
  if(!navigator.onLine)return put('<span class="pn">Без интернета — только перевод по словам.</span>');
  const ctl=new AbortController();setTimeout(()=>ctl.abort(),6000);
  fetch("https://api.mymemory.translated.net/get?langpair=es|ru&q="+encodeURIComponent(p.t),{signal:ctl.signal}).then(r=>r.json()).then(d=>{
    const v=d&&d.responseData&&d.responseData.translatedText;if(!v||d.responseStatus!==200)throw 0;ONL.set(key,v);put(esc(v)+' <span class="pn">· онлайн-перевод</span>')})
   .catch(()=>put('<span class="pn">Не получилось перевести целиком — вот перевод по словам.</span>'))}
let selT=0;
document.addEventListener("selectionchange",()=>{clearTimeout(selT);selT=setTimeout(()=>{const p=selPhrase();if(p)showPhrase(p)},450)});
document.addEventListener("click",e=>{if(!e.target.closest("#pop")&&selPhrase()){e.stopPropagation();return}
  const w=e.target.closest(".w");if(w){e.stopPropagation();showPop(w);return}
  const s=e.target.closest('[data-act="say"]');if(s){e.preventDefault();say(s.dataset.t);return}
  const pt=e.target.closest('[data-act="poptr"]');if(pt){e.stopPropagation();const b=popEl&&popEl.closest(".readblk"),r=b&&b.querySelector(".ru-text");if(r){r.hidden=false;r.scrollIntoView({block:"nearest",behavior:"smooth"})}hidePop();return}
  if(!e.target.closest("#pop"))hidePop()},true);
addEventListener("scroll",hidePop,{passive:true});

/* ---------- checking ---------- */
const norm=s=>String(s).normalize("NFC").toLowerCase().replace(/[¿?¡!.,;:—–-]/g," ").replace(/\s+/g," ").trim();
const flat=s=>norm(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"");
function check(inp,ans){const n=norm(inp);if(!n)return"empty";if(ans.some(a=>norm(a)===n))return"ok";const f=flat(inp);if(ans.some(a=>flat(a)===f))return"acc";return"bad"}

/* ---------- conjugation ---------- */
const PRON=["yo","tú","él / ella / usted","nosotros","vosotros","ellos / ustedes"];
const RP=["me","te","se","nos","os","se"];
const IRR={ser:"soy eres es somos sois son",estar:"estoy estás está estamos estáis están",tener:"tengo tienes tiene tenemos tenéis tienen",hacer:"hago haces hace hacemos hacéis hacen",ir:"voy vas va vamos vais van",ver:"veo ves ve vemos veis ven",dar:"doy das da damos dais dan",saber:"sé sabes sabe sabemos sabéis saben",poner:"pongo pones pone ponemos ponéis ponen",salir:"salgo sales sale salimos salís salen",venir:"vengo vienes viene venimos venís vienen",decir:"digo dices dice decimos decís dicen",traer:"traigo traes trae traemos traéis traen","oír":"oigo oyes oye oímos oís oyen",seguir:"sigo sigues sigue seguimos seguís siguen",haber:"he has ha hemos habéis han",coger:"cojo coges coge cogemos cogéis cogen",caer:"caigo caes cae caemos caéis caen",jugar:"juego juegas juega jugamos jugáis juegan"};
const END={ar:["o","as","a","amos","áis","an"],er:["o","es","e","emos","éis","en"],ir:["o","es","e","imos","ís","en"]};
function chg(stem,k){const rep=(ch,to)=>{const i=stem.lastIndexOf(ch);return i<0?stem:stem.slice(0,i)+to+stem.slice(i+1)};
  if(k==="ie")return rep("e","ie");if(k==="ue")return stem.lastIndexOf("o")>=0?rep("o","ue"):rep("u","ue");if(k==="i")return rep("e","i");return stem}
function regForms(inf){const t=inf.slice(-2),s=inf.slice(0,-2);return END[t]?END[t].map(e=>s+e):null}
function conj(v){let refl=false,inf=v.v,kind=v.k||"reg";
  if(kind.startsWith("refl")){refl=true;inf=inf.slice(0,-2);kind=kind.slice(5)}
  let f;if(IRR[inf])f=IRR[inf].split(" ");
  else{const t=inf.slice(-2),stem=inf.slice(0,-2);f=END[t].map((en,i)=>{let s=stem;if(["ie","ue","i"].includes(kind)&&[0,1,2,5].includes(i))s=chg(stem,kind);if(kind==="zc"&&i===0)return stem.slice(0,-1)+"zco";return s+en})}
  return refl?f.map((x,i)=>RP[i]+" "+x):f}
function hl(f,regular){ // highlight part of f differing from regular
  if(!regular||f===regular){const stemLen=regular?regular.length-endLen(regular):f.length;return esc(f.slice(0,stemLen))+'<mark style="color:var(--wine)">'+esc(f.slice(stemLen))+'</mark>'}
  let a=0;while(a<f.length&&a<regular.length&&f[a]===regular[a])a++;
  let b=0;while(b<f.length-a&&b<regular.length-a&&f[f.length-1-b]===regular[regular.length-1-b])b++;
  return esc(f.slice(0,a))+"<mark>"+esc(f.slice(a,f.length-b))+"</mark>"+esc(f.slice(f.length-b))}
function endLen(r){for(const L of[4,3,2,1]){const e=r.slice(-L);if(["amos","emos","imos","áis","éis","as","es","an","en","a","e","o","ís"].includes(e))return L}return 1}

/* ---------- pictures ---------- */
function pic(c,size){
  let inner;
  if(c.fl&&D.flags[c.fl])inner=flag(c.fl);
  else if(c.sw)inner='<span class="sw" style="background:'+c.sw+'"></span>';
  else if(c.num)inner='<span class="num">'+esc(c.num)+'</span>';
  else if(c.ic)inner='<svg class="ico" viewBox="0 0 256 256"><path d="'+D.icons[c.ic]+'"/></svg>';
  else{const b=(c.es||"").replace(/^(el|la|los|las|el\/la)\s+/,"").replace(/^[¿¡]/,"");inner='<span class="let">'+esc(b.charAt(0).toUpperCase())+'</span>'}
  return '<span class="stamp '+(size||"")+'"><span class="in">'+inner+'</span></span>'}
function postmark(t1,t2){
  return '<svg class="pm" viewBox="0 0 100 100" aria-hidden="true"><defs><path id="pmc" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0"/></defs><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" stroke-width="1.2"/><text font-family="Cormorant Garamond,serif" font-size="11" font-weight="700" letter-spacing="2" fill="currentColor"><textPath href="#pmc">'+esc(t1)+'</textPath></text><text x="50" y="47" text-anchor="middle" font-family="Cormorant Garamond,serif" font-weight="700" font-size="13" fill="currentColor">'+esc(t2.split(" ")[0]||"")+'</text><text x="50" y="62" text-anchor="middle" font-family="Cormorant Garamond,serif" font-weight="700" font-size="13" fill="currentColor">'+esc(t2.split(" ").slice(1).join(" "))+'</text><path d="M-4 40 q10 -6 20 0 t20 0 M-4 52 q10 -6 20 0 t20 0" stroke="currentColor" fill="none" stroke-width="1.4" transform="translate(84 4)"/></svg>'}

/* ---------- modes & lessons ---------- */
const isA1=()=>ST.mode==="a1";
const LES=D.lessons,LESS={};LES.forEach(l=>LESS[l.id]=l);
function lessonChips(withAll=true){
  return '<div class="chips" role="group" aria-label="Занятие">'+(withAll?'<button class="chip" data-act="les" data-id="all" aria-pressed="'+(ST.les==="all")+'">Всё</button>':"")+
   LES.map(l=>'<button class="chip" data-act="les" data-id="'+l.id+'" aria-pressed="'+(ST.les===l.id)+'">'+esc(l.d)+'</button>').join("")+'</div>'}
document.querySelectorAll(".modes button").forEach(b=>{b.onclick=()=>{ST.mode=b.dataset.mode;save();paintModes();route()}});
function paintModes(){document.querySelectorAll(".modes button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===ST.mode)))}
paintModes();
const courseDecks=()=>D.decks.filter(d=>d.lvl==="curso");
const a1Decks=()=>D.decks.filter(d=>d.lvl==="a1");
function activeDecks(){if(isA1())return a1Decks().concat(courseDecks());if(ST.les!=="all"){const L=LESS[ST.les];return courseDecks().filter(d=>L.decks.includes(d.id))}return courseDecks()}
const COURSE_VERBS=new Set(["hablar","trabajar","estudiar","comer","leer","vivir","escribir","abrir","aprender","ser","tener","hacer","llamarse","querer","ver","escuchar","descansar","comprar","beber","creer","fumar","bailar","cantar","viajar","visitar","presentar","mirar","llamar"]);
const verbPool=()=>isA1()?D.verbs:D.verbs.filter(v=>COURSE_VERBS.has(v.v));

/* ---------- question builders ---------- */
const ruShort=c=>c.ru.split("  ·  ")[0];
const FIELD2={prof:["м. р.","ж. р."],nat:["м. р.","ж. р."]};
const ART_DECKS=["nouns","things","family","cities"];
function qMC(c,dir){const same=D.cards.filter(x=>x.d===c.d&&x.id!==c.id&&(dir==="es2ru"?ruShort(x)!==ruShort(c):x.es!==c.es));
  const ds=shuffle(same).slice(0,3),txt=x=>dir==="es2ru"?ruShort(x):x.es;
  return{kind:"mc",card:c,prompt:dir==="es2ru"?c.es:ruShort(c),ipa:dir==="es2ru"?c.ipa:"",sub:dir==="es2ru"?"Выбери перевод":"Выбери по-испански",opts:shuffle([c].concat(ds)).map(x=>({t:txt(x),ok:x.id===c.id})),answerText:txt(c),why:c.ipa?"["+c.ipa+"]":"",speak:c.es}}
function qType(c){const two=FIELD2[c.d]&&c.ans.length===2;const fields=two?c.ans.map((a,i)=>({label:FIELD2[c.d][i],ans:[a]})):[{label:"По-испански",ans:c.ans}];
  return{kind:"type",card:c,prompt:ruShort(c),sub:(ART_DECKS.includes(c.d)||c.ar)?"Напиши с артиклем":(two?"Напиши обе формы":"Напиши по-испански"),fields,answerText:two?c.ans.join(" / "):c.es,why:c.ipa?"["+c.ipa+"]":"",speak:c.es}}
function qChain(){const e=pick(D.chain),mode=rnd(2)?"country":"adj",artc=e.art?e.art+" "+e.es:e.es;
  return{kind:"type",chain:e,key:"chain:"+e.es,prompt:mode==="country"?e.ru:e.adj,sub:mode==="country"?"Страна → восстанови цепочку":"Прилагательное → восстанови цепочку",
   fields:[{label:"Страна",ans:[e.es,artc]},{label:"Национальность, м. р.",ans:[e.m]},{label:"Национальность, ж. р.",ans:[e.f]}],answerText:artc+" → "+e.m+" → "+e.f,why:e.ru+" · "+e.adj,speak:e.es}}
function qConj(v){v=v||pick(verbPool());const i=rnd(6),f=conj(v)[i];
  return{kind:"type",key:"v:"+v.v,prompt:PRON[i]+" — "+v.v,sub:v.ru+((v.k||"").startsWith("refl")?" · с местоимением":""),fields:[{label:"Форма",ans:[f]}],answerText:f,
   why:v.k==="reg"?"Правильный: основа + окончание.":v.k==="irr"?"Неправильный — выучить формы.":"Особая форма: "+({ie:"e → ie",ue:"o → ue",i:"e → i",zc:"yo -zco"}[(v.k||"").replace("refl-","")]||""),speak:f}}
function qSent(s){const parts=s.q.split("___"),ans=s.a.split("|");return{kind:"gap",key:"s:"+D.sents.indexOf(s),parts,fields:ans.map(a=>({label:"",ans:[a]})),prompt:"",sub:s.ru,answerText:ans.join(" · "),why:s.x}}

/* ---------- session engine ---------- */
let SES=null;
function weak(cards,n){const now=Date.now();const sc=c=>{const b=boxOf(c.id);return(b<0?.5:b)+((ST.due[c.id]||0)>now?3:0)-(ST.mist[c.id]||0)*.4+Math.random()*.8};return cards.slice().sort((a,b)=>sc(a)-sc(b)).slice(0,n)}
function cardQs(cards){return cards.map(c=>{if(["qw","phrases","class","tener"].includes(c.d)||/\s/.test(c.es)&&c.es.length>18)return qMC(c,rnd(2)?"es2ru":"ru2es");return Math.random()<.55?qMC(c,rnd(2)?"es2ru":"ru2es"):qType(c)})}
function sentQs(n,topic){return shuffle(D.sents.filter(s=>!topic||s.t===topic)).slice(0,n).map(qSent)}
function conjQs(n){return shuffle(verbPool()).slice(0,n).map(v=>qConj(v))}
function poolCards(){const ids=new Set(activeDecks().map(d=>d.id));return D.cards.filter(c=>ids.has(c.d)&&!["days","class","numbers"].includes(c.d))}
function quick(){const qs=cardQs(weak(poolCards(),5)).concat(conjQs(2),isA1()?cardQs(weak(a1Decks().length?D.cards.filter(c=>c.d.startsWith("a1_")):[],2)):sentQs(2),[qChain()]);return shuffle(qs)}
function start(qs,title,back,mk){SES={qs,i:0,ok:0,res:[],title,back:back||"#inicio",mk,checked:false};if(location.hash==="#play")renderPlay();else location.hash="#play"}
function renderPlay(){
  if(!SES){location.hash="#inicio";return}
  if(SES.i>=SES.qs.length)return renderSummary();
  const q=SES.qs[SES.i],n=SES.qs.length;SES.checked=false;let body="";
  const visual=q.card?pic(q.card,"big"):q.chain?pic({fl:FLAGOF(q.chain.es),es:q.chain.es},"big"):"";
  if(q.kind==="mc"){body+='<div class="row" style="flex-wrap:nowrap;gap:16px">'+(q.card&&q.ipa?visual:"")+'<div class="stack" style="gap:6px;min-width:0"><div class="q-prompt">'+esc(q.prompt)+'</div>'+(q.ipa?'<div class="row"><span class="ipa">['+esc(q.ipa)+']</span>'+spk(q.speak)+'</div>':"")+'</div></div>';
    body+='<div class="popts">'+q.opts.map((o,i)=>'<button class="popt" data-act="opt" data-i="'+i+'">'+esc(o.t)+'</button>').join("")+'</div>'}
  else if(q.kind==="type"){body+='<div class="q-prompt">'+esc(q.prompt)+'</div>';body+=q.fields.map((f,i)=>'<div class="field"><label for="f'+i+'">'+esc(f.label)+'</label><input type="text" id="f'+i+'" data-f="'+i+'" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></div>').join("")}
  else{let h="";q.parts.forEach((p,i)=>{h+=words(p);if(i<q.parts.length-1)h+='<input type="text" data-f="'+i+'" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="пропуск">'});body+='<div class="sentence">'+h+'</div><div class="muted">'+esc(q.sub)+'</div>'}
  view.innerHTML='<div class="stack"><div class="row between"><span class="eyebrow">'+esc(SES.title)+' · '+(SES.i+1)+' из '+n+'</span><button class="btn ghost sm" data-act="quit">Выйти</button></div><div class="bar"><i style="width:'+(SES.i/n*100)+'%"></i></div>'+
   '<div class="card stack">'+(q.kind!=="gap"&&q.sub?'<div class="hand">'+esc(q.sub)+'</div>':"")+body+'<div id="fb"></div><div class="row" id="acts">'+(q.kind==="mc"?"":'<button class="btn" data-act="check">Проверить</button>')+'<button class="btn ghost" data-act="idk">Не помню — покажи</button></div></div></div>';
  const f=view.querySelector("input");if(f)f.focus({preventScroll:true})}
function finishQ(res,q,extra){SES.checked=true;SES.res.push({q,ok:res==="ok"});if(res==="ok")SES.ok++;if(q.card)mark(q.card.id,res==="ok");else bump(q.key,res==="ok");tick(res==="ok");
  const ansHtml='<span class="ans">'+esc(q.answerText)+'</span>'+(q.why?'<span class="why">'+esc(q.why)+'</span>':"");
  $("#fb").innerHTML=res==="ok"?'<div class="fb ok"><b>¡Muy bien!</b>'+(q.why?'<span class="why">'+esc(q.why)+'</span>':"")+'</div>':res==="acc"?'<div class="fb acc"><b>Почти — проверь акценты и ñ</b>'+ansHtml+'</div>':'<div class="fb bad"><b>'+(extra==="idk"?"Вот ответ":"Пока не то")+'</b>'+ansHtml+'</div>';
  $("#acts").innerHTML='<button class="btn" data-act="next" id="nextBtn">'+(SES.i+1>=SES.qs.length?"Итоги":"Дальше")+'</button>'+(q.speak?'<button class="btn soft" data-act="say" data-t="'+esc(q.speak)+'">'+ic("speaker-high")+'Послушать</button>':"");
  const nb=$("#nextBtn");if(nb)nb.focus({preventScroll:true})}
function doCheck(){const q=SES.qs[SES.i];if(SES.checked)return;const ins=[...view.querySelectorAll("input[data-f]")];const rs=ins.map((el,i)=>check(el.value,q.fields[i].ans));
  if(rs.includes("empty")){ins[rs.indexOf("empty")].focus();return}ins.forEach((el,i)=>{el.classList.add(rs[i]);el.readOnly=true});
  finishQ(rs.every(r=>r==="ok")?"ok":rs.every(r=>r==="ok"||r==="acc")?"acc":"bad",q)}
function renderSummary(){const n=SES.qs.length,ok=SES.ok,bad=SES.res.filter(r=>!r.ok);
  const msg=ok===n?"Чисто. На сегодня можно и остановиться.":ok>=n*.7?"Хороший результат. Ошибки ниже — самое полезное.":"Это нормально: ошибки и запоминаются лучше всего. Эти слова вернутся сами.";
  view.innerHTML='<div class="stack"><div class="card tape" style="text-align:center;padding:28px 18px"><div class="hand">'+esc(SES.title)+'</div><div class="poster md">'+ok+' / '+n+'</div><p class="muted">+'+(ok*10)+' очков · '+msg+'</p></div>'+
   (bad.length?'<div class="card stack"><h3 class="h3">Что повторить</h3>'+bad.map(r=>{const q=r.q,p=q.kind==="gap"?q.parts.join(" ___ "):q.prompt;return'<div><div class="muted" style="font-size:.9rem">'+esc(p)+'</div><div class="sum-cell"><b>'+esc(q.answerText)+'</b></div></div>'}).join('<div class="divider">♥</div>')+'</div>':"")+
   '<div class="row"><button class="btn" data-act="again">Ещё 10</button><button class="btn ghost" data-act="home">На главную</button></div></div>';window.scrollTo(0,0)}
const FLAGMAP={};D.cards.forEach(c=>{if(c.d==="countries"&&c.fl)FLAGMAP[c.es.replace(/^(el|la|los)\s+/,"")]=c.fl});
const FLAGOF=es=>FLAGMAP[es];

/* ---------- HOME ---------- */
function greet(){const h=new Date().getHours();return h<5?"Buenas noches":h<12?"Buenos días":h<20?"Buenas tardes":"Buenas noches"}
function factOfDay(){const all=D.facts;return all[Math.floor(Date.now()/DAY)%all.length]}
function vInicio(){
  const L=LES[LES.length-2],st=streak(),tn=todayN();let m=0;D.cards.forEach(c=>{if(boxOf(c.id)>=3)m++});
  const f=factOfDay(),now=new Date(),dd=String(now.getDate()).padStart(2,"0")+" "+String(now.getMonth()+1).padStart(2,"0")+" "+now.getFullYear();
  view.innerHTML='<div class="stack" style="gap:26px">'+
  '<div class="hero two"><div class="cover">'+img("nb_stamp","stk sketch","left:3%;top:12px;width:26%;max-width:150px")+img("nb_flag","stk sketch","left:44%;top:6px;width:16%;max-width:84px")+img("nb_house","stk sketch","right:1%;top:6px;width:17%;max-width:96px;opacity:.75")+
   '<div style="position:relative;z-index:2;padding-top:clamp(90px,16vw,130px)"><div class="hand" style="font-size:1.5rem">'+greet()+', Anna</div><div class="bigt">ESPAÑOL</div><div class="divider" style="max-width:260px;margin:4px auto">♥</div><div class="motto">cada día es una nueva oportunidad para aprender</div>'+
   '<div class="row" style="justify-content:center;margin-top:18px"><button class="btn" data-act="quick">'+ic("play")+'10 вопросов · 5 минут</button></div></div>'+
   img("nb_bike","stk sketch","left:2%;bottom:6px;width:26%;max-width:150px")+img("nb_books","stk sketch","right:2%;bottom:4px;width:26%;max-width:150px")+'</div>'+
   '<div class="stack"><div class="card tape"><div class="row between" style="flex-wrap:nowrap"><div><div class="eyebrow">Последнее занятие</div><div class="h3">'+esc(L.d)+' · '+esc(L.t)+'</div></div>'+postmark("SAN PETERSBURGO · CUADERNO · ",dd)+'</div>'+
   '<div class="hand" style="margin:6px 0 4px">задали на дом:</div><ul style="margin:0;padding-left:20px">'+L.hw.map(h=>'<li>'+esc(h)+'</li>').join("")+'</ul>'+
   '<div class="row" style="margin-top:12px"><button class="btn sm" data-act="les" data-id="'+L.id+'" data-goto="#cuaderno">Открыть упражнения</button></div></div>'+
   '<div class="grid sm" style="grid-template-columns:repeat(3,1fr)">'+[[st,"дней подряд"],[ST.xp,"очков"],[m,"слов выучено"]].map(x=>'<div class="card" style="padding:12px;text-align:center"><div class="big-num">'+x[0]+'</div><div class="muted" style="font-size:.8rem">'+x[1]+'</div></div>').join("")+'</div>'+
   (tn?'<p class="hand" style="text-align:center">сегодня уже '+tn+' ответов — ¡muy bien!</p>':'<p class="muted" style="font-size:.9rem;text-align:center">Пропуск дня ничего не сбрасывает: карточки подождут.</p>')+'</div></div>'+
  '<div class="divider">♥ ♥ ♥</div>'+
  '<div class="grid">'+
   tile("#cuaderno","Cuaderno","Все упражнения тетради: решай заново, нажимай на слова","nb_books","notebook")+
   tile("#verbos","Verbos","Огромные таблицы спряжений и неправильных глаголов","guitar_fan","lightning")+
   tile("#sobremi","Sobre mí","Главные вопросы о себе с готовыми ответами","heart_madrid","user")+
   tile("#drill-chain","Диктант: страны","Страна → национальность м. → ж. Для control de semestre","flag_watercolor","flag")+
   tile("#palabras","Palabras","Карточки с картинками и озвучкой","malaga","cards")+
   tile("#cultura","Cultura","Факты об Испании и Латинской Америке","sevilla","globe-hemisphere-west")+'</div>'+
  '<div class="card tape blue"><div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:16px">'+img(f.img,"stkin","width:90px;flex:0 0 auto;transform:rotate(-4deg)")+'<div class="stack" style="gap:6px;min-width:0"><div class="eyebrow">Факт дня</div><div class="h3">'+esc(f.t)+'</div><div class="serif" style="font-style:italic;color:var(--wine)">'+words(f.es)+'</div><p>'+esc(f.x)+'</p><div><a href="#cultura">Все факты →</a></div></div></div></div>'+
  '</div>'}
function tile(h,t,s,st,i){return'<a class="deck" href="'+h+'" style="text-decoration:none;position:relative;padding-right:90px;min-height:96px">'+'<span style="display:flex;flex-direction:column;gap:4px"><b>'+esc(t)+'</b><span>'+esc(s)+'</span></span>'+img(st,"stk","right:6px;top:50%;transform:translateY(-50%) rotate(5deg);width:78px;max-height:84px;object-fit:contain")+'</a>'}

/* ---------- CUADERNO ---------- */
let EXF="all";
const EXBY={};D.ex.forEach(e=>EXBY[e.id]=e);
function exStatus(e){const r=ST.ex[e.id];return r?'<span class="done">'+ic("check-circle")+' '+r.s+'/'+r.t+'</span>':""}
function vCuaderno(){
  const sel=ST.les,list=LES.filter(l=>sel==="all"||l.id===sel);
  let h='<div class="stack"><div class="row between" style="align-items:flex-end"><div><h1 class="poster">Cuaderno</h1><div class="hand">все упражнения тетради — решай сколько хочешь раз</div></div>'+img("nb_books","stkin","width:130px;mix-blend-mode:multiply")+'</div>'+
   '<p class="muted">Нажми на любое испанское слово: услышишь его и увидишь перевод. Ответы сохраняются на этом устройстве.</p>'+lessonChips()+
   '<div class="chips"><button class="chip" data-act="exf" data-f="all" aria-pressed="'+(EXF==="all")+'">Все упражнения</button><button class="chip" data-act="exf" data-f="hw" aria-pressed="'+(EXF==="hw")+'">Только домашка</button><button class="chip" data-act="exf" data-f="todo" aria-pressed="'+(EXF==="todo")+'">Ещё не решала</button></div>';
  list.forEach((L,li)=>{
    const exs=L.ex.map(id=>EXBY[id]).filter(Boolean).filter(e=>EXF==="all"||(EXF==="hw"&&e.hw)||(EXF==="todo"&&!ST.ex[e.id]));
    h+='<section class="stack" style="gap:12px;margin-top:10px"><div class="row" style="flex-wrap:nowrap;gap:14px">'+postmark(L.id==="next"?"PRÓXIMAMENTE · CUADERNO · ":"CLASE DE ESPAÑOL · ",L.id==="next"?"más ···":L.d+" 2026")+'<div style="min-width:0"><div class="eyebrow">'+(L.id==="next"?"Дальше по тетради":"Занятие "+esc(L.d))+'</div><div class="title">'+esc(L.t)+'</div></div></div>'+
     '<details class="g"><summary><span style="font-size:1.05rem">Что было в классе и дома</span></summary><div class="th"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))"><div><div class="hand">en clase</div><ul>'+L.cls.map(x=>'<li>'+words(x)+'</li>').join("")+'</ul></div>'+(L.hw.length?'<div><div class="hand">en casa</div><ul>'+L.hw.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>':"")+'</div></div></details>'+
     (exs.length?'<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">'+exs.map(e=>'<a class="extile" href="#ex-'+e.id+'"><span class="n">'+esc(e.id)+'</span><span style="min-width:0;display:flex;flex-direction:column;gap:2px"><span class="t">'+esc(e.t)+'</span><span class="s">стр. '+esc(e.p||"—")+(e.hw?' · <span class="tag">ДЗ</span>':"")+'</span>'+exStatus(e)+'</span></a>').join("")+'</div>':'<p class="muted">Здесь всё решено ♥</p>')+'</section>'});
  view.innerHTML=h+'<p class="muted" style="font-size:.88rem">Аудирование (16B, 18, 21C, 24, 34) без записи здесь не повторить. Упражнения по картинкам (5, 10, 13, 30, 39, 40) я пересобрала в текстовом виде.</p></div>'}
function gapHtml(s,ri){let h="",k=0;s.split(/(\[[^\]]*\])/).forEach(p=>{if(p.startsWith("[")){const a=p.slice(1,-1);const L=Math.max(...a.split("/").map(x=>x.length));h+='<input class="gapin" data-a="'+esc(a)+'" data-r="'+ri+'" style="width:'+Math.min(28,Math.max(3,L+2))+'ch" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="пропуск">';k++}else h+=words(p,TR[s]||"")});return h}
function readBlk(b,i){return'<div class="card readblk"><div class="row between" style="flex-wrap:nowrap"><div class="h3">'+words(b[0])+'</div><div class="row" style="flex-wrap:nowrap">'+spk(b[1])+'<button class="btn soft sm" data-act="tr" data-i="'+i+'">'+ic("translate")+'Перевод</button></div></div><div class="es-text">'+words(b[1],b[2])+'</div><div class="ru-text" id="tr'+i+'" hidden>'+esc(b[2]).replace(/\n/g,"<br>")+'</div></div>'}
const trl=t=>TR[t]?'<div class="trl" hidden>'+esc(TR[t])+'</div>':"";
function vEx(id){
  const e=EXBY[id];if(!e){go("#cuaderno");return}
  const L=LESS[e.l],idx=D.ex.indexOf(e),prev=D.ex[idx-1],next=D.ex[idx+1];
  const hasTh=TH.some(s=>(e.th||[]).includes(s.id)),hasTr=["gap","choice","open"].includes(e.k)&&e.items.some(it=>TR[Array.isArray(it)?it[0]:it]);
  let h='<div class="stack"><div class="row between"><a class="btn ghost sm" href="#cuaderno">'+ic("arrow-left")+'Тетрадь</a><span class="row">'+(e.hw?'<span class="tag">Домашка</span>':"")+'<span class="tag blue">'+(L?esc(L.d):"")+'</span>'+(e.p?'<span class="tag gold">стр. '+esc(e.p)+'</span>':"")+'</span></div>'+
   '<div class="exhead"><div class="exnum">'+esc(e.id)+'</div><div style="flex:1;min-width:220px" class="stack"><div class="title">'+esc(e.t)+'</div><div class="es-text" style="font-size:1.15rem;font-style:italic">'+words(e.es)+' '+spk(e.es)+'</div><div class="muted">'+esc(e.ru)+'</div></div></div>'+
   (hasTh||hasTr?'<div class="stack" style="gap:10px"><div class="row">'+(hasTh?'<button class="btn ghost sm" data-act="exth" aria-expanded="false" aria-controls="exth">'+ic("book-open")+'Теория</button>':"")+(hasTr?'<button class="btn ghost sm" data-act="extr" aria-pressed="false">'+ic("translate")+'Перевод всего</button>':"")+'</div>'+(hasTh?'<div id="exth" hidden>'+TH.filter(s=>e.th.includes(s.id)).sort((x,y)=>e.th.indexOf(x.id)-e.th.indexOf(y.id)).map(s=>'<details class="g" open><summary><span>'+esc(s.t)+'</span></summary><div class="th">'+s.h()+'</div></details>').join("")+'</div>':"")+'</div>':"")+
   (e.note?'<div class="card tape" style="padding:14px 18px;margin-top:14px"><span class="hand" style="font-size:1.25rem">подсказка: </span>'+esc(e.note)+'</div>':"");
  if(e.text)h+='<div class="stack">'+e.text.map((b,i)=>readBlk(b,"t"+i)).join("")+'</div>';
  if(e.k==="gap")h+='<div class="card"><div class="items">'+e.items.map((s,i)=>'<div class="item"><div class="body">'+gapHtml(s,i)+trl(s)+'</div></div>').join("")+'</div></div><div class="row"><button class="btn" data-act="excheck">'+ic("check")+'Проверить</button><button class="btn soft" data-act="exshow">Показать ответы</button><button class="btn ghost" data-act="exreset">'+ic("arrow-counter-clockwise")+'Заново</button><span id="exres" class="hand"></span></div>';
  else if(e.k==="choice")h+='<div class="card"><div class="items">'+e.items.map((it,i)=>'<div class="item"><div class="body"><div>'+words(it[0])+'</div>'+trl(it[0])+'<div class="opts">'+it[1].split("|").map((o,j)=>'<button class="opt" data-act="exopt" data-i="'+i+'" data-j="'+j+'">'+esc(o)+'</button>').join("")+'</div></div></div>').join("")+'</div></div><div class="row"><span id="exres" class="hand"></span><button class="btn ghost" data-act="exreset">'+ic("arrow-counter-clockwise")+'Заново</button></div>';
  else if(e.k==="read")h+='<div class="stack">'+e.items.map((b,i)=>readBlk(b,i)).join("")+'</div><div class="row"><button class="btn" data-act="exdone">'+ic("check")+'Прочитала</button></div>';
  else if(e.k==="open")h+='<div class="card"><div class="items">'+e.items.map((it,i)=>'<div class="item"><div class="body stack" style="gap:6px"><div class="serif" style="font-size:1.2rem;font-weight:600">'+words(it[0])+'</div>'+(/[А-Яа-яЁё]/.test(it[0])?"":trl(it[0]))+'<textarea data-o="'+i+'" rows="2" placeholder="Твой ответ"></textarea><div class="row"><button class="btn soft sm" data-act="model" data-i="'+i+'">Сверить с образцом</button></div><div id="m'+i+'" hidden class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="es-text" style="font-size:1.15rem;color:var(--ok)">'+words(it[1])+'</div>'+spk(it[1])+'</div></div></div>').join("")+'</div></div><div class="row"><button class="btn" data-act="exdone">'+ic("check")+'Готово</button></div>';
  h+='<div class="divider">♥</div><div class="row between">'+(prev?'<a class="btn ghost sm" href="#ex-'+prev.id+'">'+ic("arrow-left")+esc(prev.id)+'</a>':"<span></span>")+(next?'<a class="btn ghost sm" href="#ex-'+next.id+'">'+esc(next.id)+ic("arrow-right")+'</a>':"")+'</div></div>';
  view.innerHTML=h;CUR_EX=e;CH={};
  const saved=(ST.exv||{})[e.id];if(saved&&e.k==="gap")view.querySelectorAll(".gapin").forEach((x,i)=>{if(saved[i])x.value=saved[i]})}
let CUR_EX=null,CH={};
function exCheck(show){const e=CUR_EX;let ok=0,t=0;
  view.querySelectorAll(".gapin").forEach(inp=>{const a=inp.dataset.a.split("/");t++;inp.classList.remove("ok","bad","acc");const nx=inp.nextElementSibling;if(nx&&nx.classList.contains("fix"))nx.remove();
    if(show){inp.value=a[0];inp.classList.add("ok");return}
    const r=check(inp.value,a);if(r==="ok"){ok++;inp.classList.add("ok")}else{inp.classList.add(r==="empty"?"bad":r);const s=document.createElement("span");s.className="fix";s.textContent=a[0];inp.after(s)}});
  if(!show){ST.ex[e.id]={s:ok,t,at:Date.now()};tick(ok===t);ST.exv=ST.exv||{};ST.exv[e.id]=[...view.querySelectorAll(".gapin")].map(x=>x.value);save();
    $("#exres").textContent=ok===t?"¡Perfecto! "+ok+" из "+t:ok+" из "+t+" — исправления зелёным"}}

/* ---------- PALABRAS ---------- */
let CV={deck:null,mode:"fc",dir:"es2ru",queue:[],i:0,flip:false,q:""};
function deckStat(id){const cs=D.cards.filter(c=>c.d===id);let m=0;cs.forEach(c=>{if(boxOf(c.id)>=3)m++});return{n:cs.length,m}}
function vPalabras(){
  if(!CV.deck){const ds=activeDecks();
    view.innerHTML='<div class="stack"><div class="row between" style="align-items:flex-end"><div><h1 class="poster">Palabras</h1><div class="hand">'+(isA1()?"курс + A1 для путешествий":"слова из тетради")+'</div></div>'+img("malaga","stkin","width:120px;transform:rotate(6deg)")+'</div>'+
     (isA1()?"":lessonChips())+(isA1()?'<div class="divider">A1 · для путешествий</div>':"")+
     '<div class="grid">'+ds.map((d,i)=>{const s=deckStat(d.id);const sep=isA1()&&i===a1Decks().length?'</div><div class="divider">мой курс</div><div class="grid">':"";return sep+'<button class="deck" data-act="deck" data-id="'+d.id+'">'+pic({ic:d.ic,es:d.title})+'<span style="min-width:0;flex:1;display:flex;flex-direction:column;gap:4px"><b>'+esc(d.title)+'</b><span>'+esc(d.blurb)+'</span><span class="bar"><i style="width:'+(s.m/s.n*100)+'%"></i></span><span>'+s.m+' из '+s.n+' выучено</span></span></button>'}).join("")+'</div></div>';return}
  const d=D.decks.find(x=>x.id===CV.deck),cs=D.cards.filter(c=>c.d===CV.deck);
  let h='<div class="stack"><div class="row between"><button class="btn ghost sm" data-act="decks">'+ic("arrow-left")+'Все колоды</button><span class="eyebrow">'+cs.length+' слов</span></div><div class="row" style="flex-wrap:nowrap;gap:14px">'+pic({ic:d.ic,es:d.title})+'<div class="title">'+esc(d.title)+'</div></div>'+
   '<div class="row"><button class="chip" aria-pressed="'+(CV.mode==="fc")+'" data-act="mode" data-m="fc">Карточки</button><button class="chip" aria-pressed="'+(CV.mode==="list")+'" data-act="mode" data-m="list">Список</button><button class="btn soft sm" data-act="trainDeck">'+ic("play")+'Тренировка (10)</button></div>';
  if(CV.mode==="list"){const q=norm(CV.q);const rows=cs.filter(c=>!q||norm(c.es+" "+c.ru).includes(q));
    h+='<input type="search" placeholder="Поиск по колоде" value="'+esc(CV.q)+'" data-act="search" aria-label="Поиск"><div class="wl">'+rows.map(c=>'<div class="wi">'+pic(c,"sm")+'<div style="min-width:0;flex:1"><div class="es">'+esc(c.es)+'</div><div class="ru">'+esc(c.ru)+'</div><div class="ipa">['+esc(c.ipa)+']</div></div>'+spk(c.es)+'</div>').join("")+'</div>'}
  else{if(!CV.queue.length){CV.queue=weak(cs,Math.min(12,cs.length));CV.i=0;CV.flip=false}
    if(CV.i>=CV.queue.length)h+='<div class="card tape" style="text-align:center"><div class="hand">круг пройден</div><p class="muted">Хороший момент остановиться — или взять ещё.</p><div class="row" style="justify-content:center;margin-top:10px"><button class="btn" data-act="fcnew">Ещё круг</button></div></div>';
    else h+=fcHtml()}
  view.innerHTML=h+'</div>'}
function fcHtml(){const c=CV.queue[CV.i],front=CV.dir==="es2ru";
  return'<div class="row"><button class="chip" aria-pressed="'+front+'" data-act="dir" data-d="es2ru">Испанский → русский</button><button class="chip" aria-pressed="'+!front+'" data-act="dir" data-d="ru2es">Русский → испанский</button></div><div class="bar"><i style="width:'+(CV.i/CV.queue.length*100)+'%"></i></div>'+
   '<div class="card fc tape" data-act="flip" role="button" tabindex="0" aria-label="Перевернуть">'+pic(c,"big")+
   (CV.flip?'<div class="big">'+esc(front?ruShort(c):c.es)+'</div>'+(front?"":'<div class="ipa">['+esc(c.ipa)+']</div>'):'<div class="big">'+esc(front?c.es:ruShort(c))+'</div>'+(front?'<div class="ipa">['+esc(c.ipa)+']</div>':"")+'<div class="hand" style="font-size:1.1rem">нажми, чтобы перевернуть</div>')+'</div>'+
   '<div class="row" style="justify-content:center">'+(CV.flip?'<button class="btn ghost" data-act="again1">Ещё раз</button><button class="btn" data-act="know">Знаю</button>':'<button class="btn soft" data-act="flip">Показать ответ</button>')+spk(c.es)+'</div>'}

/* ---------- VERBOS ---------- */
let VQ="";
function vcard(v){const refl=(v.k||"").startsWith("refl");const base=refl?v.v.slice(0,-2):v.v;const reg=regForms(base);
  const boot=["ie","ue","i"].includes((v.k||"").replace("refl-",""))||v.v==="jugar";
  const f=v.f||conj(v);const order=[0,3,1,4,2,5];
  return'<div class="vcard"><div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><div style="min-width:0"><div class="inf">'+esc(v.v)+'</div><div class="muted">'+esc(v.ru)+(v.c?' <span class="tag olive">в курсе</span>':"")+'</div></div>'+spk(v.v+". "+f.join(", "))+'</div>'+
   '<div class="vgrid">'+order.map(i=>{const form=f[i];const pre=refl?form.split(" ")[0]+" ":"";const body=refl?form.split(" ").slice(1).join(" "):form;
     return'<div class="c'+(boot&&[0,1,2,5].includes(i)?" boot":"")+'" data-act="vreveal" data-t="'+esc(form)+'"><small>'+PRON[i]+'</small><b>'+esc(pre)+hl(body,reg?reg[i]:null)+'</b></div>'}).join("")+'</div></div>'}
function vVerbos(){
  let h='<div class="stack'+(ST.hide?" hideforms":"")+'" id="vroot"><div class="row between" style="align-items:flex-end"><div><h1 class="poster">Verbos</h1><div class="hand">выучить раз и навсегда</div></div>'+img("guitar_fan","stkin","width:120px;transform:rotate(-6deg)")+'</div>'+
   '<div class="row"><button class="chip" data-act="hide" aria-pressed="'+ST.hide+'">'+(ST.hide?"Формы скрыты — нажимай, чтобы открыть":"Скрыть формы и проверить себя")+'</button><a class="btn sm" href="#drill-verbs">'+ic("play")+'Тренажёр спряжений</a></div>'+
   '<div class="card tape"><div class="eyebrow" style="margin-bottom:10px">Окончания правильных глаголов · presente</div><div class="tw"><div class="endings"><div class="hd" style="background:var(--wine)"></div><div class="hd">-AR</div><div class="hd">-ER</div><div class="hd">-IR</div>'+
   ["yo","tú","él, ella, usted","nosotros","vosotros","ellos, ustedes"].map((p,i)=>'<div class="pr">'+p+'</div><div class="en"><span><small class="st">cant</small>'+END.ar[i]+'</span></div><div class="en"><span><small class="st">com</small>'+END.er[i]+'</span></div><div class="en"><span><small class="st">viv</small>'+END.ir[i]+'</span></div>').join("")+'</div></div>'+
   '<p class="muted" style="margin-top:10px">Пример: <b class="serif">habl-o, com-o, viv-o</b>. -er и -ir отличаются только в nosotros и vosotros. Местоимение обычно опускают: <span class="serif">Hablo español.</span></p></div>'+
   '<div class="card tape"><div class="row" style="flex-wrap:nowrap;gap:14px"><svg viewBox="0 0 120 90" width="110" height="82" aria-hidden="true"><g fill="none" stroke="#6E5524" stroke-width="2"><rect x="4" y="4" width="54" height="24" rx="4" fill="#E9D5A6"/><rect x="62" y="4" width="54" height="24" rx="4"/><rect x="4" y="32" width="54" height="24" rx="4" fill="#E9D5A6"/><rect x="62" y="32" width="54" height="24" rx="4"/><rect x="4" y="60" width="54" height="24" rx="4" fill="#E9D5A6"/><rect x="62" y="60" width="54" height="24" rx="4" fill="#E9D5A6"/></g></svg><div><b class="serif" style="font-size:1.2rem">Правило «ботинка» (la bota)</b><p>У глаголов с изменением корня меняются формы yo, tú, él и ellos — на карточках они подсвечены и складываются в форму сапога. Nosotros и vosotros остаются «нормальными». Красным выделено то, что отличается от правильной формы.</p></div></div></div>';
  D.vg.forEach(g=>{h+='<section class="stack" style="gap:12px;margin-top:8px"><div class="divider">♥</div><div><h2 class="poster md">'+esc(g.t)+'</h2><p class="muted">'+esc(g.x)+'</p></div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">'+g.v.map(vcard).join("")+'</div></section>'});
  if(isA1()){const q=norm(VQ);const vs=D.verbs.filter(v=>!q||norm(v.v+" "+v.ru).includes(q)).sort((a,b)=>a.v.localeCompare(b.v,"es"));
    h+='<section class="stack" style="gap:12px;margin-top:8px"><div class="divider">A1</div><h2 class="poster md">Все глаголы A1</h2><input type="search" data-act="vsearch" placeholder="Найти глагол" value="'+esc(VQ)+'"><div class="grid" id="vall" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">'+vs.slice(0,60).map(v=>vcard(Object.assign({c:COURSE_VERBS.has(v.v)},v))).join("")+'</div>'+(vs.length>60?'<p class="muted">Показаны первые 60 — уточни поиск.</p>':"")+'</section>'}
  view.innerHTML=h+'</div>'}

/* ---------- SOBRE MÍ ---------- */
function vSobre(){
  let h='<div class="stack"><div class="row between" style="align-items:flex-end"><div><h1 class="poster">Sobre mí</h1><div class="hand">рассказать о себе за 2 минуты</div></div>'+img("heart_madrid","stkin","width:120px;transform:rotate(-5deg)")+'</div>'+
   '<p class="muted">Главные вопросы для знакомства и устной части. Образец ответа уже про тебя — поправь его под себя в поле «мой вариант», он сохранится.</p><div class="row"><button class="btn" data-act="sobretrain">'+ic("shuffle")+'Тренировка: случайный вопрос</button></div><div id="strain"></div>';
  D.sobre.forEach((g,gi)=>{h+='<div class="divider">'+esc(g.g)+'</div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(290px,1fr))">'+g.q.map((q,qi)=>{const key=q.q;
    return'<div class="card stack" style="gap:8px"><div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><div class="serif" style="font-size:1.35rem;font-weight:700;line-height:1.15">'+words(q.q)+'</div>'+spk(q.q)+'</div><div class="muted" style="font-size:.9rem">'+esc(q.ru)+'</div>'+
     '<div class="row" style="flex-wrap:nowrap;align-items:flex-start;background:#FFFCF5;border-radius:10px;padding:8px 10px;border:1px dashed var(--line2)"><div class="es-text" style="font-size:1.12rem;flex:1;color:var(--blue)">'+words(ST.my[key]||q.a)+'</div>'+spk(ST.my[key]||q.a)+'</div>'+
     '<input type="text" data-my="'+esc(key)+'" placeholder="мой вариант ответа" value="'+esc(ST.my[key]||"")+'"></div>'}).join("")+'</div>'});
  view.innerHTML=h+'</div>'}
function sobreTrain(){const all=[];D.sobre.forEach(g=>g.q.forEach(q=>all.push(q)));const q=pick(all);
  $("#strain").innerHTML='<div class="card tape blue stack" style="gap:10px;text-align:center;align-items:center"><div class="hand">ответь вслух, потом проверь</div><div class="q-prompt">'+words(q.q)+'</div>'+spk(q.q)+'<button class="btn soft sm" data-act="sobreshow">Показать образец</button><div id="sans" hidden class="es-text" style="color:var(--blue)">'+words(ST.my[q.q]||q.a)+'</div></div>';say(q.q)}

/* ---------- PRACTICA ---------- */
function vPractica(sub){
  if(sub==="chain"){const mk=()=>Array.from({length:10},qChain);return start(mk(),"Диктант: страны","#practica",mk)}
  if(sub==="verbs"){const mk=()=>conjQs(10);return start(mk(),"Спряжения","#practica",mk)}
  view.innerHTML='<div class="stack"><div class="row between" style="align-items:flex-end"><div><h1 class="poster">Práctica</h1><div class="hand">10 вопросов — и свободна</div></div>'+img("flamenco","stkin","width:100px")+'</div>'+
   '<div class="grid">'+
   ptile("quick","Быстрая смесь","Слова, глаголы, предложения и страны — по твоим ошибкам","play")+
   ptile("chain","Диктант: страны","Русское слово → страна → национальность м. р. → ж. р.","flag")+
   ptile("verbs","Спряжения","ser, правильные и особые глаголы — по одной форме","lightning")+'</div>'+
   '<div class="card tape stack"><div class="h3">Слова по колодам</div><div class="row"><select id="pdeck" aria-label="Колода" style="border:1px solid var(--line2);border-radius:10px;padding:9px;background:#FFFCF5;max-width:100%"><option value="">Все колоды режима</option>'+activeDecks().map(d=>'<option value="'+d.id+'">'+esc(d.title)+'</option>').join("")+'</select><button class="btn sm" data-act="wmc">Выбрать перевод</button><button class="btn sm ghost" data-act="wtype">Написать</button></div></div>'+
   '<div class="card tape olive stack"><div class="h3">Предложения с пропусками</div><div class="row">'+D.topics.map(t=>'<button class="chip" data-act="topic" data-id="'+t.id+'">'+esc(t.title)+' · '+t.n+'</button>').join("")+'</div></div></div>'}
function ptile(a,t,s,i){return'<button class="deck" data-act="'+(a==="quick"?"quick":"godrill")+'" data-id="'+a+'">'+pic({ic:i,es:t})+'<span style="display:flex;flex-direction:column;gap:4px"><b>'+esc(t)+'</b><span>'+esc(s)+'</span></span></button>'}

/* ---------- GRAMATICA ---------- */
const vt=(v,k)=>vcard({v,k,ru:"",f:conj({v,k})});
const TH=[
{id:"art",t:"Род и артикли",h:()=>`<p>Артикль показывает род: <b class="e">el</b> — мужской, <b class="e">la</b> — женский; мн. ч. <b class="e">los / las</b>. Неопределённые: <b class="e">un / una</b> (<b class="e">unos / unas</b>).</p><ul><li>-o → обычно м. р.: <span class="ex">el libro, el vaso</span>. Но: <span class="ex">la mano, la foto, la moto, la radio</span></li><li>-a → обычно ж. р.: <span class="ex">la casa, la mesa</span>. Но: <span class="ex">el día, el idioma, el problema, el mapa, el planeta, el pijama</span></li><li>-ción, -sión → ж. р.: <span class="ex">la canción, la televisión</span></li><li>-dad, -tad → ж. р.: <span class="ex">la ciudad, la libertad</span></li><li>-e и согласная — бывает по-разному: <span class="ex">el coche, el hotel / la clase, la flor</span></li></ul><div class="note">Перед ударным a- ставят el, хотя слово женского рода: <span class="ex">el águila, el aula</span> (мн. ч. — las aulas).</div>`},
{id:"plural",t:"Множественное число",h:()=>`<ul><li>гласная + <b class="e">s</b>: <span class="ex">casa → casas, café → cafés</span></li><li>согласная, -í + <b class="e">es</b>: <span class="ex">reloj → relojes, ley → leyes, rubí → rubíes</span></li><li><b class="e">z → ces</b>: <span class="ex">luz → luces, actriz → actrices</span></li><li>-ión теряет акцент: <span class="ex">canción → canciones</span></li><li>не меняются: <span class="ex">el lunes → los lunes, el paraguas → los paraguas</span>; всегда мн. ч.: <span class="ex">gafas, tijeras, pantalones, vaqueros</span></li><li>мужской + женский = мужской мн. ч.: <span class="ex">Pedro y Ana son pequeños</span></li></ul>`},
{id:"ser",t:"Местоимения и ser",h:()=>`${vt("ser","irr")}<ul><li>Кто это: <span class="ex">Es Marta. (Esto) es una mesa.</span></li><li>Профессия без артикля: <span class="ex">Marta es estudiante.</span></li><li>Откуда: <span class="ex">Soy de Rusia, de San Petersburgo.</span></li><li>Вопрос и отрицание: <span class="ex">¿Es Marta estudiante? — No, Marta no es estudiante.</span></li><li><b>usted / ustedes</b> — вежливое «вы», глагол как у él / ellos.</li></ul>`},
{id:"qw",t:"Вопросы: qué, quién, de dónde…",h:()=>`<div class="tw"><table><tbody>${[["¿Qué?","что; какой (+ сущ.)"],["¿Quién? ¿Quiénes?","кто"],["¿Cómo?","как"],["¿Dónde?","где"],["¿De dónde?","откуда"],["¿Adónde?","куда"],["¿Cuándo?","когда"],["¿Cuánto/a/os/as?","сколько"],["¿Cuál? ¿Cuáles?","какой из"],["¿De quién?","чей"],["¿Por qué?","почему"],["¿Para qué?","зачем"],["¿A qué te dedicas?","чем занимаешься"]].map(r=>`<tr><td class="ex">${words(r[0])}</td><td>${r[1]}</td></tr>`).join("")}</tbody></table></div><ul><li>¿Qué es? — Es un lápiz. ¿Qué es Paco? — вопрос о профессии: Paco es estudiante.</li><li>¿Quién es este chico? — Es Paco / Es mi hermano.</li><li><b>Cuál</b> с ser: <span class="ex">¿Cuál es tu nombre?</span>; <b>qué</b> + сущ.: <span class="ex">¿Qué idiomas hablas?</span></li></ul>`},
{id:"nat",t:"Национальности",h:()=>`<ul><li>-o → -a: <span class="ex">ruso → rusa</span></li><li>согласная → +a: <span class="ex">español → española, inglés → inglesa, alemán → alemana</span> (акцент пропадает)</li><li>-a, -e, -í не меняются: <span class="ex">belga, canadiense, marroquí</span></li><li>Мн. ч.: <span class="ex">rusos, españolas, marroquíes</span></li><li>С маленькой буквы! Страны — с большой.</li></ul><div class="note">Для диктанта: тренажёр «Диктант: страны» во вкладке Práctica.</div>`},
{id:"regular",t:"Правильные глаголы",h:()=>`<div class="tw"><table><thead><tr><th></th><th>cantar</th><th>comer</th><th>vivir</th></tr></thead><tbody>${PRON.map((p,i)=>`<tr><td class="muted">${p}</td><td class="ex">cant<b class="e">${END.ar[i]}</b></td><td class="ex">com<b class="e">${END.er[i]}</b></td><td class="ex">viv<b class="e">${END.ir[i]}</b></td></tr>`).join("")}</tbody></table></div><ul><li>Отрицание: <b class="e">no</b> перед глаголом.</li><li>hablar <b>con</b> кем, <b>de</b> чём, <b>en</b> каком языке: <span class="ex">Pedro habla con Marta de los estudios en español.</span></li><li>¿Dónde estudias? — Estudio en la Universidad de San Petersburgo.</li></ul><p><a href="#verbos">Большие таблицы — во вкладке Verbos →</a></p>`},
{id:"llamarse",t:"Llamarse и знакомство",h:()=>`${vt("llamarse","refl")}<ul><li><span class="ex">¿Cómo te llamas? ¿Cómo se llama usted? ¿Cómo os llamáis, chicos?</span></li><li>Hola, buenos días, buenas tardes, buenas noches / hasta luego, hasta pronto, hasta mañana, adiós, chao</li><li><span class="ex">Mucho gusto. Encantado / Encantada. Igualmente.</span></li></ul>`},
{id:"prep",t:"Предлоги de, a, en, con",h:()=>`<ul><li><b class="e">de</b> — чей, откуда, из чего: <span class="ex">¿De quién es este libro? Soy de España. La mesa es de madera.</span></li><li><b class="e">a</b> — куда и кого: <span class="ex">Voy a Madrid. Presento a Pedro.</span> (но presentar un proyecto)</li><li><b class="e">en</b> — где, на чём: <span class="ex">Vivo en Moscú. Voy en autobús.</span></li><li><b class="e">con</b> — с кем: <span class="ex">Vivo con mis padres.</span></li></ul><div class="note">de + el = <b>del</b>, a + el = <b>al</b></div>`},
{id:"porque",t:"Por qué, porque, para",h:()=>`<ul><li><b class="e">¿Por qué?</b> — почему → <b class="e">porque</b> + глагол: <span class="ex">Estudio idiomas porque trabajo en una multinacional.</span></li><li><b class="e">¿Para qué?</b> — зачем → <b class="e">para</b> + инфинитив: <span class="ex">Estudio idiomas para viajar.</span></li><li>Trabajar <b>de / como</b> médico — работать врачом.</li></ul>`},
{id:"tambien",t:"También и tampoco",h:()=>`<ul><li>Утверждение → <b class="e">también</b>: <span class="ex">M. es de Moscú. Yo también soy de Moscú. / Yo soy de Moscú también.</span></li><li>Отрицание → <b class="e">tampoco</b>: <span class="ex">M. no es española. Yo tampoco soy española. / Yo no soy española tampoco.</span></li></ul><div class="note">Tampoco перед глаголом — без no. Tampoco в конце — с no.</div>`},
{id:"adj",t:"Прилагательные и цвета",h:()=>`<ul><li>Согласуются в роде и числе: <span class="ex">un libro interesante, unas casas altas</span></li><li>-o: 4 формы (alto, alta, altos, altas); -e и согласная: 2 формы (grande, grandes; fácil, fáciles)</li><li>¿Cómo es? — Es alto y guapo. ¿De qué color es? — Es rojo.</li></ul><div class="row">${["blanco","amarillo","rojo","azul","verde","marrón","negro","gris","naranja","rosa","morado"].map(c=>{const k=D.cards.find(x=>x.d==="colors"&&x.ans[0]===c);return'<span class="row" style="gap:6px;flex-wrap:nowrap">'+pic(k||{es:c},"sm")+'<span class="ex">'+c+'</span></span>'}).join("")}</div>`},
{id:"tener",t:"Tener, mucho / poco / muy",h:()=>`${vt("tener","irr")}<ul><li><span class="ex">¿Cuántos años tienes? — Tengo veinte años. ¿Cuántas clases tenéis hoy?</span></li><li>tener hambre, sed, sueño, frío, calor, miedo, prisa, suerte, cuidado</li><li><b class="e">muy</b> + прил. / нареч.: <span class="ex">muy bien, un libro muy interesante</span></li><li><b class="e">mucho / poco</b> + сущ. (согласуется): <span class="ex">Tengo muchas clases hoy. Tengo poco dinero.</span></li><li>после глагола: <span class="ex">Trabajo mucho, descanso poco.</span></li></ul>`},
{id:"numbers",t:"Числительные",h:()=>`<ul><li>0–15: cero, uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez, once, doce, trece, catorce, quince</li><li>16–29 слитно: <span class="ex">dieciséis, veintiuno, veintidós</span></li><li>с 31: <span class="ex">treinta y uno, cuarenta y cinco</span></li><li>100 cien, 101 ciento uno, 200 doscientos, 500 quinientos, 1000 mil</li><li>uno → un перед сущ. м. р. и una перед ж. р.: <span class="ex">veintiún euros, treinta y una aulas</span></li><li>Порядковые: primero (primer), segundo, tercero (tercer), cuarto, quinto, sexto, séptimo, octavo, noveno, décimo</li></ul>`},
{id:"irregular",t:"Querer, ver и другие особые глаголы",h:()=>`<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${vt("querer","ie")}${vt("ver","irr")}${vt("hacer","irr")}</div><p><a href="#verbos">Все группы — во вкладке Verbos →</a></p>`},
{id:"ir",t:"Ir + a / en",x:1,h:()=>`${vt("ir","irr")}<ul><li>ir <b class="e">en</b> + транспорт: <span class="ex">Voy a Moscú en tren.</span>; пешком — <span class="ex">a pie</span></li><li>ir <b class="e">a</b> + куда: <span class="ex">Vamos al trabajo en coche.</span></li><li>ir <b class="e">de</b>: <span class="ex">ir de compras, ir de vacaciones</span></li><li>ir a + инфинитив — ближайшее будущее: <span class="ex">Voy a estudiar.</span></li></ul>`},
{id:"serestar",t:"Ser или estar",x:1,h:()=>`<div class="tw"><table><thead><tr><th>ser</th><th>estar</th></tr></thead><tbody><tr><td>кто, откуда, профессия: <span class="ex">Soy de Madrid.</span></td><td>где: <span class="ex">¿Dónde está Manolo?</span></td></tr><tr><td>внешность и характер: <span class="ex">Pedro es alto. Luisa es simpática.</span></td><td>состояние: <span class="ex">Estoy cansado. Estás triste.</span></td></tr><tr><td>день, время: <span class="ex">Hoy es lunes.</span></td><td>временное: <span class="ex">El café está frío.</span></td></tr></tbody></table></div>${vt("estar","irr")}<p>С estar: de vacaciones, de buen humor, de acuerdo, de compras, de viaje, ocupado, enfermo, contento, casado, soltero.</p>`},
{id:"pos",t:"Притяжательные",x:1,h:()=>`<div class="tw"><table><thead><tr><th></th><th>перед сущ.</th><th>после / без сущ.</th></tr></thead><tbody>${[["yo","mi, mis","mío, mía…"],["tú","tu, tus","tuyo, tuya…"],["él, usted","su, sus","suyo, suya…"],["nosotros","nuestro/a/os/as","nuestro…"],["vosotros","vuestro/a/os/as","vuestro…"],["ellos, ustedes","su, sus","suyo…"]].map(r=>`<tr><td class="muted">${r[0]}</td><td class="ex">${r[1]}</td><td class="ex">${r[2]}</td></tr>`).join("")}</tbody></table></div><ul><li>Согласуются с тем, <b>что</b> принадлежит: <span class="ex">nuestra casa, mis libros</span></li><li><span class="ex">¡Madre mía! un amigo tuyo. ¿De quién es? — Es mío. Mi coche está aquí, ¿y el tuyo?</span></li></ul>`},
{id:"hay",t:"Hay — есть, имеется",x:1,h:()=>`<ul><li><span class="ex">Hay un banco aquí.</span> — Здесь есть банк. Форма не меняется.</li><li><span class="ex">¿Hay wifi?</span> — Есть вай-фай?</li><li>Про конкретный предмет — está: <span class="ex">El banco está en la plaza.</span></li></ul>`},
{id:"gustar",t:"Gustar — нравится",x:1,h:()=>`<ul><li><span class="ex">Me gusta el café. Me gustan los libros. Me gusta leer.</span></li><li>me / te / le / nos / os / les + gusta(n)</li><li><span class="ex">A mí también. A mí tampoco.</span></li></ul>`},
{id:"time",t:"Время и дни",x:1,h:()=>`<ul><li><span class="ex">¿Qué hora es? — Es la una. Son las dos y media.</span></li><li>y cuarto, menos cuarto: <span class="ex">Son las tres menos cuarto.</span></li><li>Дни и месяцы с маленькой буквы: <span class="ex">el lunes, en octubre</span></li><li><span class="ex">Mi cumpleaños es el 12 de mayo.</span></li></ul>`},
{id:"prof",t:"Профессии: род и ¿a qué te dedicas?",h:()=>`<ul><li>-o → -a: <span class="ex">camarero → camarera, médico → médica, abogado → abogada</span></li><li>-or → -ora: <span class="ex">profesor → profesora, conductor → conductora</span></li><li>-ista, -nte — одна форма, меняется только артикль: <span class="ex">el / la periodista, el / la estudiante, el / la cantante</span></li><li>особые: <span class="ex">actor → actriz</span>, <span class="ex">el / la policía, el / la piloto, el / la modelo</span></li><li>мн. ч. по обычным правилам: <span class="ex">profesores, actrices, periodistas</span></li></ul><div class="tw"><table><tbody>${[["¿A qué te dedicas?","Soy enfermera.","чем занимаешься"],["¿Qué haces?","Estudio Derecho.","что делаешь (учёба / работа)"],["¿En qué trabajas?","Trabajo de / como camarero.","кем работаешь"],["¿Dónde trabajas?","Trabajo en un hospital.","где работаешь"]].map(r=>`<tr><td class="ex">${words(r[0])}</td><td class="ex">${words(r[1])}</td><td class="muted">${r[2]}</td></tr>`).join("")}</tbody></table></div><div class="note">После ser профессия идёт без артикля: <span class="ex">Marta es médica.</span> С прилагательным артикль нужен: <span class="ex">Marta es una médica muy buena.</span></div><p>Где работают: médico — en un hospital, profesor — en una escuela, camarero — en un bar / restaurante, dependiente — en una tienda, cocinero — en una cocina, abogado — en un despacho, periodista — en un periódico.</p>`},
{id:"names",t:"Имена и фамилии",h:()=>`<ul><li>У испанцев две фамилии (apellidos): первая — первая фамилия отца, вторая — первая фамилия матери.</li><li><span class="ex">Raúl Díaz Bernal + Isabel González Sánchez → hijos: Francisco Díaz González, Eva Díaz González</span></li><li>Женщина после свадьбы свою фамилию не меняет.</li><li>В разговоре обычно называют первую фамилию: <span class="ex">el señor Díaz</span>.</li><li>Часто два имени: <span class="ex">José Luis, María José, Juan Carlos</span>.</li></ul><div class="tw"><table><tbody>${[["¿Cómo te llamas?","Me llamo Ana."],["¿Cuál es tu nombre?","Mi nombre es Ana."],["¿Cuál es tu apellido?","Mi apellido es Dolgova."],["¿Cómo se escribe?","Se escribe D-O-L-G-O-V-A."]].map(r=>`<tr><td class="ex">${words(r[0])}</td><td class="ex">${words(r[1])}</td></tr>`).join("")}</tbody></table></div><div class="note">señor / señora / señorita + фамилия; don / doña + имя — уважительно: <span class="ex">don Pedro, doña Carmen</span>.</div>`},
{id:"colloc",t:"Hacer, tener, estudiar: с чем сочетаются",h:()=>`<div class="tw"><table><thead><tr><th>глагол</th><th>с чем</th></tr></thead><tbody>${[["tener","años, hijos, hermanos, coche, (teléfono) móvil, novio, tiempo, trabajo, clase, hambre, sed, prisa"],["hacer","deporte, yoga, ejercicio, los deberes, un curso, la compra, la comida, fotos, un viaje"],["estudiar","idiomas, inglés, Económicas, Derecho, Medicina, en la universidad, para el examen"],["trabajar","en un banco, en una empresa, de camarero, mucho, por la mañana"],["hablar","español, por teléfono, con amigos, de política"]].map(r=>`<tr><td class="ex"><b class="e">${r[0]}</b></td><td class="ex">${r[1]}</td></tr>`).join("")}</tbody></table></div><ul><li>Возраст — только с tener: <span class="ex">Tengo 35 años.</span> (не «soy 35»)</li><li>Спорт — hacer или practicar: <span class="ex">Hago yoga. Practico tenis.</span>; но jugar al fútbol</li><li>Учиться (где) — estudiar en: <span class="ex">Estudio en la universidad.</span>; изучать (что) — estudiar + предмет: <span class="ex">Estudio Psicología.</span></li></ul>`},
{id:"yo",t:"Особая форма yo в настоящем времени",x:1,h:()=>`<p>У части глаголов неправильная только форма <b class="e">yo</b>, остальные — как у правильных.</p><div class="tw"><table><tbody>${[["hacer","hago","делать"],["poner","pongo","класть"],["salir","salgo","выходить"],["traer","traigo","приносить"],["coger","cojo","брать; садиться (на транспорт)"],["conocer","conozco","знать (кого-то, место)"],["ver","veo","видеть"],["dar","doy","давать"],["saber","sé","знать (факт)"]].map(r=>`<tr><td class="ex">${r[0]}</td><td class="ex"><b class="e">${r[1]}</b></td><td class="muted">${r[2]}</td></tr>`).join("")}</tbody></table></div><ul><li>g → j перед o, чтобы звук не менялся: <span class="ex">coger → cojo, coges</span>; <span class="ex">escoger → escojo</span></li><li>-cer / -cir после гласной → -zco: <span class="ex">conocer → conozco, traducir → traduzco</span></li><li>Полностью неправильные: <span class="ex">ser (soy), estar (estoy), ir (voy), tener (tengo, tienes), venir (vengo, vienes), decir (digo, dices)</span></li></ul><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${vt("salir","irr")}${vt("coger","irr")}</div>`},
{id:"ordinal",t:"Порядковые числительные",x:1,h:()=>`<div class="tw"><table><tbody>${[["1º","primero (primer)"],["2º","segundo"],["3º","tercero (tercer)"],["4º","cuarto"],["5º","quinto"],["6º","sexto"],["7º","séptimo"],["8º","octavo"],["9º","noveno"],["10º","décimo"]].map((r,i,A)=>i<5?`<tr><td class="muted">${r[0]}</td><td class="ex">${r[1]}</td><td class="muted">${A[i+5][0]}</td><td class="ex">${A[i+5][1]}</td></tr>`:"").join("")}</tbody></table></div><ul><li>Согласуются с существительным: <span class="ex">el segundo piso, la segunda planta, los primeros días</span></li><li>primero → <b class="e">primer</b>, tercero → <b class="e">tercer</b> перед сущ. м. р.: <span class="ex">el primer piso, el tercer día</span>; но <span class="ex">la primera, la tercera</span></li><li>После десяти обычно говорят количественными: <span class="ex">el piso once, el siglo veintiuno</span></li><li>Адрес: <span class="ex">2º C</span> = <span class="ex">segundo C</span> — второй этаж, дверь C</li></ul><div class="note">Монархи и папы: до десяти — порядковые, дальше — количественные: <span class="ex">Felipe VI (sexto), Juan Carlos I (primero), Alfonso XIII (trece), Luis XIV (catorce)</span>. Pío IX — Pío nono.</div>`},
{id:"family",t:"Семья",x:1,h:()=>`<div class="tw"><table><thead><tr><th>он</th><th>она</th><th></th></tr></thead><tbody>${[["el padre","la madre","отец / мать"],["el hijo","la hija","сын / дочь"],["el hermano","la hermana","брат / сестра"],["el abuelo","la abuela","дедушка / бабушка"],["el nieto","la nieta","внук / внучка"],["el tío","la tía","дядя / тётя"],["el primo","la prima","двоюродный брат / сестра"],["el sobrino","la sobrina","племянник / племянница"],["el marido, el esposo","la mujer, la esposa","муж / жена"],["el novio","la novia","парень / девушка; жених / невеста"],["el suegro","la suegra","свёкор, тесть / свекровь, тёща"],["el yerno","la nuera","зять / невестка"],["el cuñado","la cuñada","шурин, деверь / золовка, невестка"]].map(r=>`<tr><td class="ex">${r[0]}</td><td class="ex">${r[1]}</td><td class="muted">${r[2]}</td></tr>`).join("")}</tbody></table></div><ul><li>Мужской мн. ч. объединяет оба пола: <span class="ex">los padres</span> — родители, <span class="ex">los hermanos</span> — братья и сёстры, <span class="ex">los hijos</span> — дети, <span class="ex">los abuelos</span> — бабушка и дедушка</li><li><span class="ex">Estoy casada con Pablo. Es soltero. Están divorciados.</span></li><li><span class="ex">Te presento a mi hermana. ¿Tienes hermanos? — Sí, tengo dos hermanos. / No, soy hijo único.</span></li></ul>`},
{id:"posx",t:"Mío, tuyo, el mío: ударные притяжательные",x:1,h:()=>`<div class="tw"><table><thead><tr><th></th><th>ударные формы</th></tr></thead><tbody>${[["yo","mío, mía, míos, mías"],["tú","tuyo, tuya, tuyos, tuyas"],["él, ella, usted","suyo, suya, suyos, suyas"],["nosotros","nuestro, nuestra, nuestros, nuestras"],["vosotros","vuestro, vuestra, vuestros, vuestras"],["ellos, ustedes","suyo, suya, suyos, suyas"]].map(r=>`<tr><td class="muted">${r[0]}</td><td class="ex">${r[1]}</td></tr>`).join("")}</tbody></table></div><ul><li>После сущ.: <span class="ex">un amigo mío</span> — мой друг (один из), <span class="ex">¡Dios mío!</span></li><li>После ser — без артикля: <span class="ex">¿De quién es el libro? — Es mío.</span></li><li>Вместо сущ. — с артиклем: <span class="ex">Mi coche es rojo, ¿y el tuyo? — El mío es azul.</span></li><li>Согласуются с предметом, а не с владельцем: <span class="ex">Las llaves son mías.</span></li></ul><div class="note">Безударные (mi, tu, su) стоят только перед сущ.: <span class="ex">mi casa</span>. Ударные — после сущ. или вместо него: <span class="ex">la casa mía, la mía</span>. <span class="ex">¿De quién es?</span> — Es de Pedro / Es suyo.</div>`},
{id:"stem",t:"Чередование в корне: e → ie, o → ue, e → i",x:1,h:()=>`<p>В ударном слоге гласная корня меняется во всех формах, кроме <b class="e">nosotros</b> и <b class="e">vosotros</b>.</p><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${vt("querer","ie")}${vt("poder","ue")}${vt("pedir","i")}</div><ul><li><b class="e">e → ie</b>: <span class="ex">querer, pensar, empezar, entender, preferir, cerrar, sentir</span></li><li><b class="e">o → ue</b>: <span class="ex">poder, volver, dormir, encontrar, costar, recordar, contar</span></li><li><b class="e">u → ue</b>: только <span class="ex">jugar → juego</span></li><li><b class="e">e → i</b> (только на -ir): <span class="ex">pedir, repetir, servir, seguir (sigo)</span></li></ul><div class="note">Tener (tengo, tienes) и venir (vengo, vienes) — тоже e → ie, но с особой формой yo.</div>`}
];
function vGram(){
  const L=ST.les!=="all"?LESS[ST.les]:null;const list=TH.filter(s=>isA1()||!L||L.gram.includes(s.id));
  view.innerHTML='<div class="stack"><div class="row between" style="align-items:flex-end"><div><h1 class="poster">Gramática</h1><div class="hand">коротко и с примерами</div></div>'+img("madrid_azulejo","stkin","width:90px;transform:rotate(4deg)")+'</div>'+(isA1()?"":lessonChips())+
   '<p class="muted"><span class="tag olive">курс</span> — было на занятиях, <span class="tag blue">дальше</span> — то, что скоро будет и пригодится в поездке.</p><div>'+
   list.map(s=>'<details class="g"'+(list.length<4?" open":"")+'><summary><span>'+esc(s.t)+' <span class="tag '+(s.x?"blue":"olive")+'">'+(s.x?"дальше":"курс")+'</span></span></summary><div class="th">'+s.h()+'</div></details>').join("")+'</div></div>'}

/* ---------- CULTURA ---------- */
let FC="all";
function vCultura(){
  const cats=D.fcats,fs=D.facts.concat(ST.myfacts.map(f=>Object.assign({c:"mine",img:"heart_madrid"},f))).filter(f=>FC==="all"||f.c===FC);
  view.innerHTML='<div class="stack" style="gap:24px"><div class="hero two"><div class="stack"><h1 class="poster">Cultura</h1><div class="hand">España y el mundo hispano</div><p>Факты об истории Испании, языке, Латинской Америке и жизни испанцев. Испанские слова кликабельны. Новые факты присылай мне в чат — я внесу их сюда навсегда. Или добавь свой прямо здесь.</p>'+
   '<div class="row">'+img("spain_plate","stkin","width:150px;transform:rotate(-4deg)")+img("paella","stkin","width:100px;transform:rotate(6deg)")+'</div></div><div style="display:flex;justify-content:center">'+img("poster_alhambra","posterimg")+'</div></div>'+
   '<div class="chips"><button class="chip" data-act="fc" data-c="all" aria-pressed="'+(FC==="all")+'">Все · '+D.facts.length+'</button>'+cats.map(c=>'<button class="chip" data-act="fc" data-c="'+c[0]+'" aria-pressed="'+(FC===c[0])+'">'+esc(c[1])+'</button>').join("")+(ST.myfacts.length?'<button class="chip" data-act="fc" data-c="mine" aria-pressed="'+(FC==="mine")+'">Мои</button>':"")+'</div>'+
   '<div class="masonry">'+fs.map(f=>{const s=f.src&&D.sources[f.src];return'<article class="fact">'+(f.img&&STK[f.img]?'<img class="fimg" src="'+STK[f.img]+'" alt="">':"")+'<span class="tag '+(f.c==="latam"?"olive":f.c==="idioma"?"blue":f.c==="cultura"?"gold":"")+'">'+esc((cats.find(c=>c[0]===f.c)||[0,"мой факт"])[1])+'</span><h3>'+esc(f.t)+'</h3>'+(f.es?'<div class="esc">'+words(f.es)+'</div>':"")+'<p>'+esc(f.x)+'</p>'+(s?'<a class="src" href="'+esc(s[1])+'" target="_blank" rel="noopener">Источник: '+esc(s[0])+'</a>':"")+'</article>'}).join("")+'</div>'+
   '<div class="card tape olive stack"><div class="h3">Испания или Латинская Америка?</div><div class="tw"><table><thead><tr><th>по-русски</th><th>в Испании</th><th>в Латинской Америке</th></tr></thead><tbody>'+[["машина","coche","carro, auto"],["компьютер","ordenador","computadora"],["мобильный","móvil","celular"],["сок","zumo","jugo"],["картошка","patata","papa"],["водить машину","conducir","manejar"],["квартира","piso","departamento"],["очки","gafas","lentes, anteojos"],["автобус","autobús","camión (Мексика), colectivo (Аргентина)"],["вы (мн.)","vosotros / ustedes","ustedes"]].map(r=>'<tr><td>'+r[0]+'</td><td class="ex serif" style="font-size:1.15rem">'+words(r[1])+'</td><td class="serif" style="font-size:1.15rem">'+words(r[2])+'</td></tr>').join("")+'</tbody></table></div></div>'+
   '<div class="card stack"><div class="h3">Добавить свой факт</div><input type="text" id="nft" placeholder="Заголовок"><input type="text" id="nfe" placeholder="Фраза по-испански (необязательно)"><textarea id="nfx" placeholder="Сам факт"></textarea><div class="row"><button class="btn" data-act="addfact">'+ic("plus")+'Сохранить</button><span class="muted" style="font-size:.88rem">Сохранится в этом браузере. Чтобы факт был на сайте везде — пришли его мне в чат.</span></div></div></div>'}

/* ---------- PROGRESO ---------- */
function vProgreso(){
  const total=D.cards.length;const cnt=[0,0,0,0,0,0];D.cards.forEach(c=>cnt[boxOf(c.id)+1]++);
  const exDone=D.ex.filter(e=>ST.ex[e.id]).length;
  const ent=Object.entries(ST.mist).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,n])=>{if(CARD[k])return[CARD[k].es+" — "+ruShort(CARD[k]),n];if(k.startsWith("v:"))return["Спряжение: "+k.slice(2),n];if(k.startsWith("chain:"))return["Страна: "+k.slice(6),n];if(k.startsWith("s:")){const s=D.sents[+k.slice(2)];return[s?s.q:k,n]}return[k,n]});
  view.innerHTML='<div class="stack"><div class="row between" style="align-items:flex-end"><h1 class="poster">Progreso</h1>'+img("stamp_sagrada","stkin","width:90px;transform:rotate(5deg)")+'</div>'+
   '<div class="grid sm">'+[[streak(),"дней подряд"],[ST.xp,"очков"],[Object.keys(ST.days).length,"дней занималась"],[exDone+" / "+D.ex.length,"упражнений решено"]].map(x=>'<div class="card" style="text-align:center"><div class="big-num">'+x[0]+'</div><div class="muted">'+x[1]+'</div></div>').join("")+'</div>'+
   '<div class="card stack"><div class="h3">Упражнения по занятиям</div>'+LES.map(L=>{const n=L.ex.length,d=L.ex.filter(id=>ST.ex[id]).length;return'<div><div class="row between"><span>'+esc(L.d)+' · '+esc(L.t)+'</span><span class="muted">'+d+'/'+n+'</span></div><div class="bar"><i style="width:'+(d/n*100)+'%"></i></div></div>'}).join("")+'</div>'+
   '<div class="card stack"><div class="h3">Слова</div>'+[["Новые",cnt[0]],["Учу",cnt[1]+cnt[2]+cnt[3]],["Знаю",cnt[4]+cnt[5]]].map(r=>'<div><div class="row between"><span>'+r[0]+'</span><span class="muted">'+r[1]+'</span></div><div class="bar"><i style="width:'+(r[1]/total*100)+'%"></i></div></div>').join("")+'</div>'+
   '<div class="card stack"><div class="h3">Над чем поработать</div>'+(ent.length?ent.map(e=>'<div class="row between" style="flex-wrap:nowrap"><span style="min-width:0;overflow-wrap:anywhere">'+esc(e[0])+'</span><span class="muted">×'+e[1]+'</span></div>').join(""):'<p class="muted">Пока пусто — ошибки появятся здесь после тренировок.</p>')+'</div>'+
   '<div class="card stack" id="sync" hidden></div>'+
   '<div class="card stack"><div class="h3">Сбросить прогресс</div><div class="row" id="rs"><button class="btn ghost sm" data-act="reset1">Сбросить</button></div></div></div>';if(window.MiSync)MiSync.mount($("#sync"))}

/* ---------- routing ---------- */
const TABS=[["inicio","Inicio","house"],["sobremi","Sobre mí","user"],["cuaderno","Cuaderno","notebook"],["palabras","Palabras","cards"],["verbos","Verbos","lightning"],["practica","Práctica","play"],["gramatica","Gramática","book-open"],["cultura","Cultura","globe-hemisphere-west"],["progreso","Progreso","chart-bar"]];
$("#tabs").innerHTML=TABS.map(t=>'<a class="tab" href="#'+t[0]+'" data-r="'+t[0]+'">'+ic(t[2])+'<span>'+t[1]+'</span></a>').join("");
function route(){
  hidePop();const h=location.hash.replace("#","")||"inicio";let r=h,sub="";
  if(h.startsWith("drill-")){r="practica";sub=h.slice(6)}if(h.startsWith("ex-")){r="ex";sub=h.slice(3)}
  const tab=r==="play"?"practica":r==="ex"?"cuaderno":r;
  $(".modes").hidden=r==="play"||!["palabras","verbos","practica","gramatica"].includes(tab);
  document.querySelectorAll("#tabs a").forEach(a=>{if(a.dataset.r===tab){a.setAttribute("aria-current","page");a.scrollIntoView({block:"nearest",inline:"nearest"})}else a.removeAttribute("aria-current")});
  if(r!=="play")window.scrollTo(0,0);
  ({play:renderPlay,cuaderno:vCuaderno,ex:()=>vEx(sub),palabras:vPalabras,verbos:vVerbos,sobremi:vSobre,practica:()=>vPractica(sub),gramatica:vGram,cultura:vCultura,progreso:vProgreso}[r]||vInicio)()}
function go(h){if(location.hash===h)route();else location.hash=h}
/* слова в теории тоже нажимаются */
function wordify(root){
  const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),ns=[];
  while(tw.nextNode()){const n=tw.currentNode;if(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(n.data)&&!n.parentElement.closest(".w,button,a,input,textarea,select,svg,summary"))ns.push(n)}
  ns.forEach(n=>{const t=document.createElement("template");t.innerHTML=words(n.data,"");
    t.content.querySelectorAll(".w").forEach(w=>{const p=w.previousSibling,q=w.nextSibling;if(p&&p.nodeType===3&&/-$/.test(p.data)||q&&q.nodeType===3&&/^-/.test(q.data))w.replaceWith(w.textContent)});
    n.replaceWith(t.content)})}
new MutationObserver(()=>view.querySelectorAll(".th:not([data-wd])").forEach(el=>{el.dataset.wd="1";wordify(el)})).observe(view,{childList:true,subtree:true});
window.addEventListener("hashchange",route);

/* ---------- events ---------- */
view.addEventListener("click",e=>{
  const t=e.target.closest("[data-act]");if(!t)return;const a=t.dataset.act;
  switch(a){
   case"quick":start(quick(),"Быстрая тренировка","#inicio",quick);break;
   case"godrill":go("#drill-"+t.dataset.id);break;
   case"les":ST.les=t.dataset.id;save();if(t.dataset.goto)go(t.dataset.goto);else route();break;
   case"exf":EXF=t.dataset.f;vCuaderno();break;
   case"excheck":exCheck(false);break;
   case"exshow":exCheck(true);$("#exres").textContent="Ответы на месте — прочитай вслух";break;
   case"exreset":ST.exv&&delete ST.exv[CUR_EX.id];save();vEx(CUR_EX.id);break;
   case"exdone":ST.ex[CUR_EX.id]={s:1,t:1,at:Date.now()};tick(true);toast("Отмечено ♥");break;
   case"exopt":{const i=+t.dataset.i,j=+t.dataset.j,it=CUR_EX.items[i];if(CH[i]!==undefined)return;const okset=String(it[2]).split(",").map(Number);const ok=okset.includes(j);CH[i]=ok;
     t.parentElement.querySelectorAll(".opt").forEach((b,k)=>{b.disabled=true;if(okset.includes(k))b.classList.add("ok")});if(!ok)t.classList.add("bad");say(t.textContent);
     const n=Object.keys(CH).length;if(n===CUR_EX.items.length){const s=Object.values(CH).filter(Boolean).length;ST.ex[CUR_EX.id]={s,t:n,at:Date.now()};tick(s===n);save();$("#exres").textContent=s===n?"¡Perfecto! "+s+" из "+n:s+" из "+n+" — правильные отмечены зелёным"}break}
   case"exth":{const el=$("#exth");if(el){el.hidden=!el.hidden;t.setAttribute("aria-expanded",String(!el.hidden))}break}
   case"extr":{const on=t.getAttribute("aria-pressed")!=="true";t.setAttribute("aria-pressed",String(on));view.querySelectorAll(".trl").forEach(x=>x.hidden=!on);break}
   case"tr":{const el=$("#tr"+t.dataset.i);if(el)el.hidden=!el.hidden;break}
   case"model":{const el=$("#m"+t.dataset.i);if(el)el.hidden=false;break}
   case"deck":CV.deck=t.dataset.id;CV.queue=[];CV.i=0;CV.flip=false;CV.mode="fc";vPalabras();break;
   case"decks":CV.deck=null;vPalabras();break;
   case"mode":CV.mode=t.dataset.m;vPalabras();break;
   case"dir":CV.dir=t.dataset.d;CV.flip=false;vPalabras();break;
   case"flip":CV.flip=!CV.flip;vPalabras();if(CV.flip&&CV.dir==="ru2es")say(CV.queue[CV.i].es);if(!CV.flip||CV.dir==="es2ru");break;
   case"know":case"again1":{const c=CV.queue[CV.i];mark(c.id,a==="know");tick(a==="know");if(a==="again1")CV.queue.push(c);CV.i++;CV.flip=false;vPalabras();break}
   case"fcnew":CV.queue=[];vPalabras();break;
   case"trainDeck":{const dk=CV.deck,mk=()=>cardQs(weak(D.cards.filter(c=>c.d===dk),10));start(mk(),D.decks.find(x=>x.id===dk).title,"#palabras",mk);break}
   case"hide":ST.hide=!ST.hide;save();vVerbos();break;
   case"vreveal":if(ST.hide)t.classList.toggle("show");say(t.dataset.t);break;
   case"sobretrain":sobreTrain();break;
   case"sobreshow":{const el=$("#sans");if(el)el.hidden=false;break}
   case"wmc":case"wtype":{const dk=$("#pdeck").value,mk=()=>{const pool=dk?D.cards.filter(c=>c.d===dk):poolCards();const sel=weak(pool,10);return a==="wmc"?sel.map(c=>qMC(c,rnd(2)?"es2ru":"ru2es")):sel.map(qType)};start(mk(),dk?D.decks.find(x=>x.id===dk).title:"Слова","#practica",mk);break}
   case"topic":{const tp=D.topics.find(x=>x.id===t.dataset.id),mk=()=>sentQs(10,tp.id);start(mk(),tp.title,"#practica",mk);break}
   case"opt":{if(SES.checked)return;const q=SES.qs[SES.i],o=q.opts[+t.dataset.i];view.querySelectorAll(".popt").forEach((b,j)=>{b.disabled=true;if(q.opts[j].ok)b.classList.add("ok")});if(!o.ok)t.classList.add("bad");if(q.speak)say(q.speak);finishQ(o.ok?"ok":"bad",q);break}
   case"check":doCheck();break;
   case"idk":{if(SES.checked)return;const q=SES.qs[SES.i];if(q.kind==="mc")view.querySelectorAll(".popt").forEach((b,j)=>{b.disabled=true;if(q.opts[j].ok)b.classList.add("ok")});view.querySelectorAll("input").forEach(x=>x.readOnly=true);finishQ("bad",q,"idk");break}
   case"next":SES.i++;renderPlay();window.scrollTo(0,0);break;
   case"quit":case"home":SES=null;go("#inicio");break;
   case"again":if(SES.mk){const m=SES.mk,ti=SES.title,b=SES.back;start(m(),ti,b,m)}else go(SES.back);break;
   case"fc":FC=t.dataset.c;vCultura();break;
   case"addfact":{const ti=$("#nft").value.trim(),x=$("#nfx").value.trim();if(!ti||!x){toast("Нужны заголовок и текст");return}ST.myfacts.push({t:ti,es:$("#nfe").value.trim(),x});save();FC="mine";vCultura();toast("Факт сохранён ♥");break}
   case"reset1":$("#rs").innerHTML='<span class="muted">Точно?</span><button class="btn sm" data-act="reset2">Да, сбросить</button><button class="btn ghost sm" data-act="reset0">Отмена</button>';break;
   case"reset0":vProgreso();break;
   case"reset2":ST=Object.assign({},ST,{box:{},due:{},xp:0,days:{},mist:{},ex:{},exv:{},resetAt:Date.now()});save();vProgreso();break}
});
view.addEventListener("input",e=>{
  const t=e.target;
  if(t.dataset.act==="search"){CV.q=t.value;const p=t.selectionStart;vPalabras();const s=view.querySelector('input[data-act="search"]');if(s){s.focus();s.setSelectionRange(p,p)}}
  if(t.dataset.act==="vsearch"){VQ=t.value;const p=t.selectionStart;vVerbos();const s=view.querySelector('input[data-act="vsearch"]');if(s){s.focus();s.setSelectionRange(p,p)}}
  if(t.dataset.my!==undefined){ST.my[t.dataset.my]=t.value.trim();save()}});
view.addEventListener("keydown",e=>{
  if(e.target.matches&&e.target.matches('.fc[data-act="flip"]')&&(e.key==="Enter"||e.key===" ")){e.preventDefault();CV.flip=!CV.flip;vPalabras();return}
  if(e.key!=="Enter")return;
  if(e.target.classList&&e.target.classList.contains("gapin")){e.preventDefault();const all=[...view.querySelectorAll(".gapin")];const i=all.indexOf(e.target);if(i<all.length-1)all[i+1].focus();else exCheck(false);return}
  if(!SES||location.hash!=="#play")return;
  if(e.target.matches("input[data-f]")){e.preventDefault();const ins=[...view.querySelectorAll("input[data-f]")];const i=ins.indexOf(e.target);if(SES.checked)return;if(i<ins.length-1)ins[i+1].focus();else doCheck()}});
route();
if(window.MiSync)MiSync.attach({get:()=>ST,set:s=>{ST=s;ST.ex=ST.ex||{};ST.my=ST.my||{};ST.myfacts=ST.myfacts||[];try{localStorage.setItem(KEY,JSON.stringify(ST))}catch(e){}},
  rerender:()=>{const f=document.activeElement;if(location.hash==='#play'||(f&&view.contains(f)&&f.matches('input,textarea,select')))return;route()}});
})();
}
})();
