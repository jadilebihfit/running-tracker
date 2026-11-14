(function(){
'use strict';
/* ================= util ================= */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}};
const pad=n=>String(n).padStart(2,'0');
function fmt(sec){if(!isFinite(sec))return '–';sec=Math.max(0,Math.round(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?`${h}:${pad(m)}:${pad(s)}`:`${m}:${pad(s)}`}
const fmtPace=s=>(!isFinite(s)||s<=0||s>1800)?'–:––':fmt(s);
const dec=(v,n=1)=>(+v||0).toFixed(n).replace('.',',');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BULAN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const HARI=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const pd=s=>new Date(String(s).length<=10?s+'T00:00:00':s);
const dowOf=d=>(d.getDay()+6)%7;
const monday=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-dowOf(x));return x};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const dShort=d=>`${d.getDate()} ${BULAN[d.getMonth()]}`;
const dLong=d=>`${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
function parseTime(str){str=String(str||'').trim();if(!str)return null;const p=str.split(/[:.]/).map(Number);if(p.some(n=>isNaN(n)))return null;if(p.length===1)return p[0]*60;let s=0;for(const x of p)s=s*60+x;return s}
function hav(a,b){const R=6371000,r=Math.PI/180,dLa=(b.lat-a.lat)*r,dLo=(b.lon-a.lon)*r;const x=Math.sin(dLa/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(x)))}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let toastT=null;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3200)}
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ================= konstanta ================= */
const LEVELS={
  pemula:{name:'Pemula',tag:'Baru mulai atau belum rutin lari',feats:['interval','tenpct','zones','voice'],weekRuns:2,
    goals:[['5','5K'],['10','10K']],days:[3,4],
    bullets:['Program lari-jalan bertahap','Cue suara saat ganti lari/jalan','Fokus zona 2 dan talk test','Peringatan aturan 10%']},
  menengah:{name:'Menengah',tag:'Sudah rutin, mau lebih jauh atau lebih cepat',feats:['tenpct','vdot','zones','voice','intensity'],weekRuns:3,
    goals:[['10','10K'],['21.1','Half marathon']],days:[4,5],
    bullets:['Program easy, tempo, interval, long run','Pace latihan dari hasil lombamu','Target pace saat merekam','Cek distribusi 80/20']},
  pro:{name:'Pro',tag:'Latihan terstruktur untuk target waktu',feats:['vdot','zones','load','split','intensity','voice'],weekRuns:4,
    goals:[['10','10K'],['21.1','Half marathon'],['42.2','Marathon']],days:[5,6],
    bullets:['2 sesi kualitas per minggu + taper','Pace VDOT lengkap (E/M/T/I/R)','Beban latihan ACWR','Perencana split lomba']}
};
const LVN={pemula:1,menengah:2,pro:3};
const FEATS=[
  ['interval','Cue lari-jalan & timer interval','Bunyi dan suara saat ganti lari/jalan, plus interval buatan sendiri.'],
  ['tenpct','Aturan 10%','Peringatan kalau jarak mingguan naik lebih dari 10%.'],
  ['vdot','VDOT & pace latihan','Pace easy, marathon, tempo, interval, repetisi, dan prediksi lomba.'],
  ['zones','Zona detak jantung','5 zona Karvonen dari umur dan detak istirahat.'],
  ['load','Beban latihan (ACWR)','Rasio beban 7 hari terhadap 28 hari untuk membaca risiko cedera.'],
  ['intensity','Distribusi 80/20','Cek apakah sebagian besar latihanmu benar-benar santai.'],
  ['split','Perencana split','Target waktu per km untuk hari lomba.'],
  ['voice','Suara tiap km','Jarak dan pace dibacakan setiap 1 km saat merekam.']
];
const GOALM={'5':5000,'10':10000,'21.1':21097.5,'42.2':42195};
const GOALN={'5':'5K','10':'10K','21.1':'Half marathon','42.2':'Marathon'};
const BEST=[['1','1K',1000],['5','5K',5000],['10','10K',10000],['21.1','Half marathon',21097.5],['42.2','Marathon',42195]];
const TYPE={E:['Easy','E'],Q:['Kualitas','Q'],L:['Long run','L'],R:['Lomba','R'],X:['Silang','X'],W:['Lari-jalan','W'],N:['Lari nonstop','E']};

/* ================= state ================= */
let P=LS.get('lk-profile',null);
let RUNS=LS.get('lk-runs',[]);
let DONE=LS.get('lk-done',{});
let EARNED=LS.get('lk-earned',{});
let PREF=Object.assign({theme:0,autoPause:true,sound:true,mode:'gps'},LS.get('lk-pref',{}));if(LS.get('lk-pref-v3',null)==null){PREF.theme=0;LS.set('lk-pref-v3',1)}
// pindahkan catatan dari versi lama
(function migrate(){if(RUNS.length)return;const old=LS.get('la-log',null);if(!old||!old.length)return;
  RUNS=old.filter(r=>!r.ex).map(r=>({id:r.id||uid(),date:r.date,km:r.km,sec:r.sec,elev:0,rpe:r.rpe||4,note:r.note||'',src:'manual',splits:[],bests:{}}));
  if(RUNS.length)saveRuns();})();
function defaultProfile(level){const L=LEVELS[level];return {name:'',level,age:25,restHR:70,maxHR:null,weight:null,
  goal:L.goals[L.goals.length>2?1:L.goals.length-1][0],days:L.days[0],cond:0,baseKm:level==='menengah'?20:40,
  raceDist:level==='pro'?'10':'5',raceTime:level==='menengah'?29*60:level==='pro'?46*60:null,
  planStart:defaultStart(),features:[...L.feats],onboarded:false}}
function defaultStart(){const t=new Date();const m=monday(t);return iso(dowOf(t)>=3?addDays(m,7):m)}
const saveP=()=>{P._u=Date.now();LS.set('lk-profile',P);syncSoon()};
function saveRuns(){if(LS.set('lk-runs',RUNS))return true;
  // penuh: buang rute dari lari terlama sampai muat
  const sorted=RUNS.filter(r=>r.track).sort((a,b)=>a.date.localeCompare(b.date));
  for(const r of sorted){delete r.track;if(LS.set('lk-runs',RUNS)){toast('Penyimpanan HP hampir penuh: rute lari lama dihapus, statistik tetap ada.');return true}}
  toast('Gagal menyimpan. Penyimpanan browser penuh.');return false}
const has=f=>P&&P.features.includes(f);

/* ================= fisiologi ================= */
function vdotFrom(m,sec){const t=sec/60,v=m/t;const vo2=-4.6+0.182258*v+0.000104*v*v;const pct=0.8+0.1894393*Math.exp(-0.012778*t)+0.2989558*Math.exp(-0.1932605*t);return vo2/pct}
function velAt(vo2){const a=0.000104,b=0.182258,c=-(vo2+4.6);return(-b+Math.sqrt(b*b-4*a*c))/(2*a)}
const paceAt=(v,f)=>60000/velAt(v*f);
function predict(v,m){let lo=m/1000*100,hi=m/1000*1200;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(vdotFrom(m,mid)>v)lo=mid;else hi=mid}return(lo+hi)/2}
function paces(v){return{E:[paceAt(v,.70),paceAt(v,.62)],M:predict(v,42195)/42.195,T:paceAt(v,.88),I:paceAt(v,.975),R:paceAt(v,1.06)}}
function bestsAll(excludeId){const b={};RUNS.forEach(r=>{if(r.id===excludeId)return;for(const k in (r.bests||{})){if(!b[k]||r.bests[k]<b[k].sec)b[k]={sec:r.bests[k],run:r}}});return b}
function currentVdot(){let best=null,src='';
  if(P.raceTime&&P.raceDist){const v=vdotFrom(GOALM[P.raceDist],P.raceTime);if(v>15&&v<90){best=v;src=`hasil ${GOALN[P.raceDist]} ${fmt(P.raceTime)}`}}
  const lim=addDays(new Date(),-120);
  RUNS.forEach(r=>{if(pd(r.date)<lim)return;for(const k of ['5','10','21.1','42.2']){const s=r.bests&&r.bests[k];if(!s)continue;const v=vdotFrom(GOALM[k],s);if(v>15&&v<90&&(!best||v>best)){best=v;src=`${GOALN[k]} ${fmt(s)} (${dShort(pd(r.date))})`}}});
  return best?{v:best,src}:null}
function maxHR(){return P.maxHR||Math.round(208-.7*(P.age||25))}

/* ================= program ================= */
const PEMULA_STEPS=[{run:60,walk:90,reps:8},{run:90,walk:120,reps:6},{run:180,walk:90,reps:5},{run:300,walk:150,reps:4},
 {run:480,walk:120,reps:3},{run:600,walk:120,reps:3},{run:900,walk:120,reps:2},{run:1500,walk:0,reps:1},
 {run:1800,walk:0,reps:1,test:'Tes 5K: lari santai sampai 5 km'},{run:2100,walk:0,reps:1},{run:2400,walk:0,reps:1},
 {run:2700,walk:0,reps:1},{run:3000,walk:0,reps:1},{run:3600,walk:0,reps:1,test:'Tes 10K: lari santai sampai 10 km'}];
const dur=s=>s<60?`${s} dtk`:(s%60?`${Math.floor(s/60)},5 mnt`:`${s/60} mnt`);
function segsOf(run,walk,reps){const g=[{t:'walk',sec:300,l:'Pemanasan jalan cepat'}];for(let i=0;i<reps;i++){g.push({t:'run',sec:run,l:'Lari santai'});if(walk&&i<reps-1)g.push({t:'walk',sec:walk,l:'Jalan'})}g.push({t:'walk',sec:300,l:'Pendinginan jalan'});return g}
function planPemula(){
  const end=P.goal==='10'?13:8,start=Math.min(+P.cond||0,end),dows=P.days==4?[0,2,4,6]:[0,2,5],weeks=[];
  for(let i=start,w=1;i<=end;i++,w++){const st=PEMULA_STEPS[i],sess=[];
    const mk=(long)=>{let run=st.run,walk=st.walk,reps=st.reps;if(long&&!st.test){if(walk)reps++;else run+=300}
      const segs=segsOf(run,walk,reps);const title=st.test&&long?st.test:(walk?`Lari ${dur(run)} / jalan ${dur(walk)} × ${reps}`:`Lari nonstop ${dur(run)}`);
      return{type:walk?'W':'N',title,detail:'Pemanasan & pendinginan jalan 5 mnt. Lari pelan, masih bisa ngobrol.',segs,mins:Math.round(segs.reduce((a,s)=>a+s.sec,0)/60)}};
    sess.push({dow:dows[0],...mk(false)});sess.push({dow:dows[1],...mk(false)});
    if(P.days==4)sess.push({dow:dows[2],type:'X',title:'Latihan silang 30 mnt',detail:'Jalan cepat, sepeda, renang, atau latihan kekuatan ringan.',mins:30});
    sess.push({dow:dows[dows.length-1],...mk(true),long:true});
    sess.forEach((s,j)=>s.id=`${w}-${j}`);
    weeks.push({w,sess,focus:st.walk?'Lari-jalan':'Lari nonstop',mins:sess.reduce((a,s)=>a+s.mins,0)})}
  return weeks}
function planStructured(){
  const pro=P.level==='pro',goal=P.goal,G={'10':{n:10,peak:[35,50],long:[16,20],taper:[.7,.5]},'21.1':{n:12,peak:[42,62],long:[21,25],taper:[.7,.5]},'42.2':{n:16,peak:[55,80],long:[30,34],taper:[.8,.65,.45]}}[goal]||{n:10,peak:[35,50],long:[16,20],taper:[.7,.5]};
  const vd=currentVdot(),pc=vd?paces(vd.v):null;
  const N=G.n,T=G.taper.length,build=N-T,base=Math.max(10,+P.baseKm||20),peak=Math.max(G.peak[pro?1:0],base*1.15);
  const kms=[];let last=base;
  for(let i=0;i<build;i++){if(i===0){kms.push(base);continue}if((i+1)%4===0){kms.push(Math.round(last*.8));continue}last=Math.min(peak,last*1.1);kms.push(Math.round(last))}
  const top=Math.max(...kms);G.taper.forEach(f=>kms.push(Math.round(top*f)));
  const dows={4:[1,3,5,6],5:[0,1,3,4,6],6:[0,1,2,3,5,6]}[P.days]||[1,3,5,6];
  const types={4:['E','Q1','E','L'],5:['E','Q1','E',pro?'Q2':'E','L'],6:['E','Q1','E',pro?'Q2':'E','E','L']}[P.days]||['E','Q1','E','L'];
  const pr=(s,w=5)=>pc?[s-w,s+w]:null;
  const Ep=pc?[pc.E[0],pc.E[1]]:null;
  const ps=s=>pc?` @ ${fmt(s)}/km`:'';
  const Q1m=[['Tempo',k=>`Pemanasan 2 km, 15–20 mnt tempo${ps(pc&&pc.T)}, pendinginan`,'T'],['Fartlek',k=>'Pemanasan, 8× (1 mnt cepat / 2 mnt santai), pendinginan','I'],['Interval 400 m',k=>`Pemanasan, 6×400 m${ps(pc&&pc.I)} (jog 400 m), pendinginan`,'I'],['Progresif',k=>`Mulai santai, 3 km terakhir naik ke tempo${ps(pc&&pc.T)}`,'T']];
  const Q1p=[['Tempo',k=>`Pemanasan, 20–25 mnt${ps(pc&&pc.T)}, pendinginan`,'T'],['Cruise interval',k=>`4–5×1,6 km${ps(pc&&pc.T)}, jog 1 mnt`,'T'],['Tempo terpisah',k=>`2×15 mnt${ps(pc&&pc.T)}, jog 3 mnt`,'T'],['Threshold',k=>`3×10 mnt${ps(pc&&pc.T)}, jog 2 mnt`,'T']];
  const Q2p=goal==='42.2'?[['Marathon pace',k=>`${Math.max(6,Math.round(k*.6))} km${ps(pc&&pc.M)} di tengah lari`,'M'],['Interval VO2',k=>`5×1 km${ps(pc&&pc.I)}, jog 3 mnt`,'I']]:[['Interval VO2',k=>`5–6×1 km${ps(pc&&pc.I)}, jog 3 mnt`,'I'],['Repetisi',k=>`10×400 m${ps(pc&&pc.R)}, jog 400 m`,'R'],['Interval 800 m',k=>`6×800 m${ps(pc&&pc.I)}, jog 400 m`,'I']];
  const weeks=[];
  kms.forEach((km,i)=>{const w=i+1,isRace=w===N,cut=i<build&&(i+1)%4===0,taper=i>=build;
    const longKm=Math.min(G.long[pro?1:0],Math.max(6,Math.round(km*.3)));
    const nQ=types.filter(t=>t[0]==='Q').length,qKm=Math.max(5,Math.round(km*.17));
    const nE=types.filter(t=>t==='E').length,eKm=Math.max(3,Math.round((km-longKm-nQ*qKm)/Math.max(1,nE)));
    const sess=types.map((t,j)=>{let s;
      if(t==='E')s={type:'E',title:'Easy run',km:isRace?Math.min(eKm,5):eKm,detail:'Santai, bisa ngobrol kalimat utuh.',pace:Ep};
      else if(t==='L'){if(isRace)s={type:'R',title:`Hari lomba: ${GOALN[goal]}`,km:GOALM[goal]/1000,detail:pc?`Target ${fmt(predict(vd.v,GOALM[goal]))} (${fmt(predict(vd.v,GOALM[goal])/(GOALM[goal]/1000))}/km). Mulai sedikit lebih pelan dari target.`:'Mulai pelan, naikkan di paruh kedua.',pace:pc?pr(predict(vd.v,GOALM[goal])/(GOALM[goal]/1000),4):null};
        else{const mpLong=pro&&goal==='42.2'&&i%3===2&&!taper;s={type:'L',title:mpLong?'Long run + marathon pace':'Long run',km:longKm,detail:mpLong?`${longKm} km, 25% terakhir${ps(pc&&pc.M)}`:'Pelan dan stabil. Bawa minum kalau lebih dari 75 menit.',pace:mpLong&&pc?pr(pc.M):Ep}}}
      else{const pool=t==='Q1'?(pro?Q1p:Q1m):Q2p,q=pool[i%pool.length];
        if(isRace||(taper&&t==='Q2'))s={type:'E',title:'Easy + 4 strides',km:Math.min(qKm,6),detail:'Santai, akhiri dengan 4×20 dtk cepat-rileks.',pace:Ep};
        else s={type:'Q',title:q[0],km:qKm,detail:q[1](qKm)+(cut?' (minggu ringan: kurangi 1 repetisi)':''),pace:pc?pr(pc[q[2]]):null}}
      return{dow:dows[j],id:`${w}-${j}`,...s}});
    weeks.push({w,km:Math.round(sess.reduce((a,s)=>a+s.km,0)),sess,focus:isRace?'Minggu lomba':taper?'Taper':cut?'Minggu ringan':i<build/2?'Bangun base':'Puncak'})});
  return weeks}
let PLAN_CACHE=null,PLAN_SIG='';
function plan(){const sig=JSON.stringify([P.level,P.goal,P.days,P.cond,P.baseKm,P.raceDist,P.raceTime,P.planStart,RUNS.length]);if(sig!==PLAN_SIG){PLAN_SIG=sig;PLAN_CACHE=P.level==='pemula'?planPemula():planStructured()}return PLAN_CACHE}
const planKey=()=>[P.level,P.goal,P.days,P.cond,P.planStart].join('|');
const doneMap=()=>DONE[planKey()]||(DONE[planKey()]={});
const sessDate=(w,s)=>addDays(pd(P.planStart),(w-1)*7+s.dow);
function weekNow(){const d=Math.floor((monday(new Date())-pd(P.planStart))/864e5/7)+1;return d}
function nextSession(){const pl=plan(),dm=doneMap(),today=iso(new Date());
  for(const wk of pl)for(const s of wk.sess){const d=iso(sessDate(wk.w,s));if(d>=today&&!dm[s.id])return{wk,s,date:sessDate(wk.w,s),isToday:d===today}}
  return null}

/* ================= statistik ================= */
function weekBuckets(n){const m=monday(new Date()),out=[];for(let i=n-1;i>=0;i--){const s=addDays(m,-7*i);out.push({mon:s,key:iso(s),km:0,n:0,sec:0,load:0})}
  const idx={};out.forEach((o,i)=>idx[o.key]=i);RUNS.forEach(r=>{const k=iso(monday(pd(r.date)));if(k in idx){const o=out[idx[k]];o.km+=r.km;o.n++;o.sec+=r.sec;o.load+=r.sec/60*(r.rpe||4)}});return out}
function streakWeeks(){const need=LEVELS[P.level].weekRuns,c={};RUNS.forEach(r=>{const k=iso(monday(pd(r.date)));c[k]=(c[k]||0)+1});
  let m=monday(new Date());if((c[iso(m)]||0)<need)m=addDays(m,-7);let n=0;while((c[iso(m)]||0)>=need){n++;m=addDays(m,-7)}return n}
function acwr(){const now=new Date(),d7=addDays(now,-7),d28=addDays(now,-28);let a=0,c=0;const first=RUNS.reduce((m,r)=>r.date<m?r.date:m,'9999');
  RUNS.forEach(r=>{const d=pd(r.date),l=r.sec/60*(r.rpe||4);if(d>d7)a+=l;if(d>d28)c+=l});
  const enough=first!=='9999'&&pd(first)<=addDays(now,-21);return{a,c:c/4,ratio:c>0?a/(c/4):null,enough}}
function intensity(){const d28=addDays(new Date(),-28);let e=0,h=0;RUNS.forEach(r=>{if(pd(r.date)<=d28)return;if((r.rpe||4)<=5)e+=r.sec;else h+=r.sec});return{e,h,pct:e+h?e/(e+h)*100:null}}
function stats(){const s={runs:RUNS.length,km:0,longest:0,elev:0,early:0,streak:streakWeeks()};
  RUNS.forEach(r=>{s.km+=r.km;s.longest=Math.max(s.longest,r.km);s.elev+=r.elev||0;if(r.date.length>10){const h=pd(r.date).getHours();if(h<6)s.early++}});
  const pl=plan(),dm=doneMap();s.planWeeks=pl.filter(w=>w.sess.every(x=>dm[x.id])).length;s.planTotal=pl.length;return s}

/* ================= milestone ================= */
const MS=[];
[1,5,10,25,50,100,200].forEach(n=>MS.push({id:'runs-'+n,big:String(n),unit:n===1?'LARI':'KALI',title:n===1?'Lari pertama':`${n} kali lari`,sub:n===1?'Langkah pertama sudah tercatat.':`Sudah ${n} kali kamu keluar dan lari.`,val:s=>s.runs,goal:n,tier:n>=50?3:n>=10?1:0}));
[10,25,50,100,250,500,1000].forEach(n=>MS.push({id:'km-'+n,big:String(n),unit:'KM',title:`${n} km total`,sub:`Total jarak larimu sudah tembus ${n} kilometer.`,val:s=>s.km,goal:n,tier:n>=250?3:n>=50?2:0}));
[[3,'3K'],[5,'5K'],[10,'10K'],[21.0975,'21K'],[42.195,'42K']].forEach(([n,l])=>MS.push({id:'long-'+l,big:l,unit:'SEKALI LARI',title:`Lari ${l} pertama`,sub:`Jarak ${l} dalam satu kali lari.`,val:s=>s.longest,goal:n*0.985,tier:n>=21?3:n>=10?1:0}));
[2,4,8,12,26,52].forEach(n=>MS.push({id:'streak-'+n,big:String(n),unit:'MINGGU',title:`${n} minggu konsisten`,sub:s=>`${n} minggu berturut-turut, minimal ${LEVELS[P.level].weekRuns}× lari tiap minggu.`,val:s=>s.streak,goal:n,tier:n>=12?3:n>=4?2:1}));
[100,500,1000,2500].forEach(n=>MS.push({id:'elev-'+n,big:String(n),unit:'M NAIK',title:`Mendaki ${n} m`,sub:`Total elevasi naik dari semua larimu.`,val:s=>s.elev,goal:n,tier:2}));
MS.push({id:'early-1',big:'05',unit:'PAGI',title:'Pelari subuh',sub:'Lari sebelum jam 6 pagi.',val:s=>s.early,goal:1,tier:1});
MS.push({id:'plan-1',big:'1',unit:'MINGGU',title:'Minggu program pertama tuntas',sub:'Semua sesi minggu pertama selesai.',val:s=>s.planWeeks,goal:1,tier:0});
MS.push({id:'plan-done',big:'100',unit:'PERSEN',title:'Program selesai',sub:'Semua minggu programmu tuntas.',val:s=>s.planWeeks/Math.max(1,s.planTotal),goal:1,tier:3});
const msSub=m=>typeof m.sub==='function'?m.sub():m.sub;
function checkMilestones(){const s=stats(),fresh=[];MS.forEach(m=>{if(!EARNED[m.id]&&m.val(s)>=m.goal){EARNED[m.id]=new Date().toISOString();fresh.push({kind:'ms',m,date:EARNED[m.id]})}});if(fresh.length)saveEarned();return fresh}
// tandai milestone yang sudah tercapai tanpa merayakan (data lama)
(function(){if(P&&P.onboarded&&!LS.get('lk-earned-init',false)){checkMilestones();LS.set('lk-earned-init',true)}})();

/* ================= audio & suara ================= */
let AC=null;function audio(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();AC.resume&&AC.resume()}catch(e){}}
function beep(p){if(!PREF.sound)return;try{if(!AC)return;let t=AC.currentTime;p.forEach(([f,d])=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;o.connect(g);g.connect(AC.destination);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.4,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.start(t);o.stop(t+d+.02);t+=d+.08})}catch(e){}
  try{navigator.vibrate&&navigator.vibrate(p.map(x=>x[1]*1000))}catch(e){}}
function say(txt){if(!PREF.sound)return;try{const u=new SpeechSynthesisUtterance(txt);u.lang='id-ID';u.rate=1.02;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
const paceWords=s=>{s=Math.round(s);return `${Math.floor(s/60)} menit ${s%60} detik`};
let WL=null;async function wake(on){try{if(on){if(!WL&&navigator.wakeLock)WL=await navigator.wakeLock.request('screen')}else{WL&&WL.release();WL=null}}catch(e){WL=null}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&R.st==='run'){WL=null;wake(true)}});

/* ================= analisis track ================= */
function elevGain(eles){let gain=0,anchor=null;const buf=[];for(const e of eles){if(e==null)continue;buf.push(e);if(buf.length>5)buf.shift();const s=buf.reduce((a,b)=>a+b,0)/buf.length;if(anchor==null){anchor=s;continue}if(s-anchor>=2){gain+=s-anchor;anchor=s}else if(anchor-s>=2)anchor=s}return gain}
function cumOf(track){const cum=[0];for(let i=1;i<track.length;i++){cum.push(cum[i-1]+hav({lat:track[i-1][0],lon:track[i-1][1]},{lat:track[i][0],lon:track[i][1]}))}return cum}
function bestEfforts(cum,ts){const out={},total=cum[cum.length-1];
  BEST.forEach(([k,,D])=>{if(total<D*.995)return;let i=0,best=Infinity;for(let j=1;j<cum.length;j++){while(i+1<j&&cum[j]-cum[i+1]>=D)i++;const dd=cum[j]-cum[i];if(dd>=D*.995){const t=(ts[j]-ts[i])*D/dd;if(t>0&&t<best)best=t}}if(isFinite(best))out[k]=Math.round(best)});return out}
function splitsOf(cum,ts){const sp=[];let next=1000,prevT=0;for(let j=1;j<cum.length;j++){while(cum[j]>=next){const f=(next-cum[j-1])/(cum[j]-cum[j-1]||1),t=ts[j-1]+(ts[j]-ts[j-1])*f;sp.push(Math.round(t-prevT));prevT=t;next+=1000}}return sp}
function downsample(tr,max){if(tr.length<=max)return tr;const step=tr.length/max,out=[];for(let i=0;i<max;i++)out.push(tr[Math.floor(i*step)]);out.push(tr[tr.length-1]);return out}

/* ================= native (Capacitor) ================= */
const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
const NP=n=>NATIVE&&window.Capacitor.Plugins?window.Capacitor.Plugins[n]:null;
/* ================= perekam ================= */
const R={st:'idle',mode:PREF.mode||'gps',pts:[],dist:0,mov:0,last:null,lastMoveAt:0,lastTick:0,reset:false,ele:{buf:[],anchor:null,gain:0},win:[],splits:[],splitAt:0,nextKm:1000,
  acc:null,watch:null,timer:null,sim:null,auto:false,started:null,plan:null,segI:0,segLeft:0,err:''};
function recReset(){Object.assign(R,{st:'idle',pts:[],dist:0,mov:0,last:null,lastMoveAt:0,reset:false,ele:{buf:[],anchor:null,gain:0},win:[],splits:[],splitAt:0,nextKm:1000,acc:null,auto:false,started:null,segI:0,segLeft:R.plan&&R.plan.segs?R.plan.segs[0].sec:0,err:''})}
function onPos(p){R.acc=p.acc;if(R.st!=='run')return;
  if(p.acc!=null&&p.acc>35)return;
  if(!R.last||R.reset){p.mov=R.mov;R.last=p;R.reset=false;pushPt(p);R.lastMoveAt=Date.now();return}
  const d=hav(R.last,p),dt=Math.max(.001,(p.ts-R.last.ts)/1000);
  if(d<3)return; if(d/dt>11)return;
  // Kalau ada jeda (layar mati, app di background, timer browser tertahan) tapi kamu tetap bergerak,
  // waktu yang terlewat tetap dihitung sebagai waktu bergerak.
  const credited=R.mov-(R.last.mov||0);if(dt>4&&dt<3600&&d/dt>=.7&&credited<dt)R.mov+=dt-credited;
  p.mov=R.mov;R.dist+=d;R.last=p;R.lastMoveAt=Date.now();pushPt(p);
  if(p.alt!=null){const b=R.ele.buf;b.push(p.alt);if(b.length>5)b.shift();const s=b.reduce((a,c)=>a+c,0)/b.length;if(R.ele.anchor==null)R.ele.anchor=s;else if(s-R.ele.anchor>=2){R.ele.gain+=s-R.ele.anchor;R.ele.anchor=s}else if(R.ele.anchor-s>=2)R.ele.anchor=s}
  R.win.push({d:R.dist,t:R.mov});while(R.win.length>2&&R.mov-R.win[0].t>25)R.win.shift();
  while(R.dist>=R.nextKm){const sp=R.mov-R.splitAt;R.splits.push(Math.round(sp));R.splitAt=R.mov;
    const k=R.nextKm/1000;R.nextKm+=1000;beep([[880,.12],[1175,.2]]);
    if(has('voice'))say(`Kilometer ${k}. Split ${paceWords(sp)}. Pace rata-rata ${paceWords(R.mov/(R.dist/1000))} per kilometer.`)}
}
function pushPt(p){R.pts.push([+p.lat.toFixed(5),+p.lon.toFixed(5),p.alt!=null?Math.round(p.alt*10)/10:null,Math.round(R.mov)])}
function curPace(){if(R.win.length<2)return NaN;const a=R.win[0],b=R.win[R.win.length-1];const dd=b.d-a.d;return dd>15?(b.t-a.t)/(dd/1000):NaN}
function tick(dtOverride){const now=Date.now();const dt=dtOverride!=null?dtOverride:(now-R.lastTick)/1000;R.lastTick=now;if(R.st!=='run')return;
  const gpsLive=R.mode!=='nogps'&&R.pts.length>1;
  const idle=gpsLive&&PREF.autoPause&&(dtOverride!=null?false:now-R.lastMoveAt>12000);
  R.auto=idle;
  // dt besar = timer sempat tertahan; di mode GPS waktu itu dihitung dari titik GPS (onPos), bukan dari timer
  if(!idle&&!(gpsLive&&dt>3))R.mov+=dt;
  if(R.plan&&R.plan.segs&&R.segI<R.plan.segs.length){R.segLeft-=dt;if(R.segLeft<=0){R.segI++;const s=R.plan.segs[R.segI];
    if(s){R.segLeft=s.sec;beep(s.t==='run'?[[990,.15],[990,.15]]:[[520,.6]]);if(has('interval'))say(s.t==='run'?`Lari, ${dur(s.sec)}`:(s.l.startsWith('Pendinginan')?'Pendinginan, jalan santai':`Jalan, ${dur(s.sec)}`))}
    else{beep([[880,.15],[880,.15],[1320,.5]]);say('Sesi selesai. Mantap!')}}}
  renderRec()}
function startGPS(){if(R.watch!=null)return;const BG=NP('BackgroundGeolocation');
  if(BG){R.watch={bg:null};BG.addWatcher({backgroundTitle:'cupuberlari merekam larimu',backgroundMessage:'GPS tetap aktif walau layar mati.',requestPermissions:true,stale:false,distanceFilter:0},
      (loc,err)=>{if(err){if(err.code==='NOT_AUTHORIZED')gpsFail('Izin lokasi ditolak. Buka Pengaturan HP → Aplikasi → cupuberlari → Izin → Lokasi, lalu pilih "Izinkan".');else gpsFail('GPS tidak tersedia: '+(err.message||err.code));return}
        R.here=loc;onPos({lat:loc.latitude,lon:loc.longitude,alt:loc.altitude,acc:loc.accuracy,ts:loc.time||Date.now()});renderRec()})
      .then(id=>{if(R.watch)R.watch.bg=id;else BG.removeWatcher({id})}).catch(e=>gpsFail('GPS tidak bisa dimulai: '+(e.message||e)));return}
  if(!('geolocation' in navigator)){gpsFail('Browser ini tidak mendukung GPS.');return}
  try{R.watch=navigator.geolocation.watchPosition(pos=>{const c=pos.coords;R.here={latitude:c.latitude,longitude:c.longitude};R.err='';onPos({lat:c.latitude,lon:c.longitude,alt:c.altitude,acc:c.accuracy,ts:Date.now()});renderRec()},
    err=>{if(err.code===1)gpsFail('Akses lokasi ditolak. Di claude.ai, halaman artifact memang tidak boleh memakai GPS. Pakai versi standalone (file HTML yang di-host sendiri) untuk merekam rute, atau pilih "Tanpa GPS".');else if(err.code===3)R.err='Mencari sinyal GPS…';else gpsFail('Sinyal GPS tidak tersedia. Coba di tempat terbuka.')},
    {enableHighAccuracy:true,maximumAge:0,timeout:20000})}catch(e){gpsFail('GPS tidak bisa dipakai di tampilan ini.')}}
function gpsFail(m){R.err=m;renderRec()}
function stopGPS(){if(R.watch!=null){try{if(typeof R.watch==='object'){const BG=NP('BackgroundGeolocation');if(BG&&R.watch.bg)BG.removeWatcher({id:R.watch.bg})}else navigator.geolocation.clearWatch(R.watch)}catch(e){}R.watch=null}}
// GPS dinyalakan begitu halaman Rekam dibuka (mode GPS), supaya sinyal sudah stabil saat kamu menekan Mulai
function gpsWarm(on){if(on){if(PREF.mode==='gps'&&R.st==='idle')startGPS()}else if(R.st==='idle'||R.st==='done')stopGPS()}
let SIM={a:0,t:0};
function startSim(){SIM={a:0,t:Date.now()};const c={lat:-6.1754,lon:106.8272},rad=420;
  R.sim=setInterval(()=>{if(R.st!=='run')return;for(let k=0;k<1;k++){SIM.t+=1000;const sp=2.55+Math.sin(SIM.t/40000)*0.35+(Math.random()-.5)*.25;SIM.a+=sp/rad;
    const lat=c.lat+(rad*Math.sin(SIM.a)+Math.sin(SIM.a*3)*60)/111320,lon=c.lon+(rad*Math.cos(SIM.a))/(111320*Math.cos(c.lat*Math.PI/180));
    tick(1);onPos({lat,lon,alt:22+Math.sin(SIM.a*2)*9+Math.random()*.6,acc:5,ts:SIM.t})}renderRec()},100)}
function recStart(){audio();recReset();R.st='run';R.started=new Date();R.lastTick=Date.now();R.lastMoveAt=Date.now();R.mode=PREF.mode;
  if(R.plan&&R.plan.segs){R.segI=0;R.segLeft=R.plan.segs[0].sec;beep([[520,.4]]);if(has('interval'))say(`Mulai. ${R.plan.segs[0].l}`)}else beep([[660,.15],[990,.25]]);
  if(R.mode==='gps')startGPS();else stopGPS();
  if(R.mode==='sim')startSim();else R.timer=setInterval(()=>tick(),1000);
  wake(true);renderRec()}
function recPause(){R.st='pause';R.auto=false;beep([[520,.3]]);renderRec()}
function recResume(){R.st='run';R.reset=true;R.lastTick=Date.now();R.lastMoveAt=Date.now();beep([[660,.15],[990,.25]]);renderRec()}
function recStop(){clearInterval(R.timer);clearInterval(R.sim);R.timer=R.sim=null;stopGPS();wake(false);try{speechSynthesis.cancel()}catch(e){}}
function recFinish(){recStop();R.st='done';showSaveForm({src:R.mode==='sim'?'sim':R.mode==='nogps'?'manual':'gps',date:R.started.toISOString(),km:R.dist/1000,sec:Math.round(R.mov),elev:Math.round(R.ele.gain),splits:R.splits.slice(),track:R.pts.slice()})}
function recDiscard(){recStop();recReset();$('#r-save').hidden=true;$('#r-live').hidden=false;renderRec();if(!$('#v-rekam').hidden)gpsWarm(true)}

function renderRec(){
  const main=$('#r-main');if(!main)return;main.dataset.st=R.st;
  $$('#r-mode button').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.m===PREF.mode?'true':'false');b.disabled=R.st==='run'||R.st==='pause'});
  const nr=$('#nav-rec');nr.classList.toggle('live',R.st==='run'||R.st==='pause');
  $('#r-title').textContent=R.st==='run'?(R.auto?'Jeda otomatis':'Merekam…'):R.st==='pause'?'Dijeda':R.plan?R.plan.title:'Siap lari?';
  $('#r-eyebrow').textContent=R.plan?R.plan.eyebrow:'Rekam lari';
  const g=$('#r-gps');g.className='gps';
  if(PREF.mode==='nogps'){g.querySelector('span').textContent='Tanpa GPS: hanya waktu'}
  else if(PREF.mode==='sim'){g.classList.add('ok');g.querySelector('span').textContent='Simulasi (data contoh, tidak disimpan)'}
  else if(R.acc==null){g.querySelector('span').textContent='Mencari sinyal GPS…'}
  else{g.classList.add(R.acc<=20?'ok':R.acc<=35?'mid':'bad');g.querySelector('span').textContent=R.st==='idle'?(R.acc<=20?`GPS siap · ±${Math.round(R.acc)} m`:`Sinyal belum stabil (±${Math.round(R.acc)} m), tunggu sebentar`):`GPS ±${Math.round(R.acc)} m`}
  $('#r-clock').textContent=R.started?`Mulai ${pad(R.started.getHours())}.${pad(R.started.getMinutes())}`:'';
  const e=$('#r-err');e.hidden=!R.err;e.textContent=R.err;
  $('#r-dist').textContent=dec(R.dist/1000,2);$('#r-time').textContent=fmt(R.mov);
  const cp=curPace();$('#r-pace').textContent=fmtPace(cp);$('#r-avg').textContent=R.dist>50?fmtPace(R.mov/(R.dist/1000)):'–:––';
  $('#r-elev').textContent=Math.round(R.ele.gain)+' m';
  // cue lari-jalan
  const cue=$('#r-cue');const segs=R.plan&&R.plan.segs;
  if(segs&&(R.st==='run'||R.st==='pause')&&R.segI<segs.length){const s=segs[R.segI],nx=segs[R.segI+1];cue.hidden=false;cue.dataset.t=s.t;$('#r-cue-ph').textContent=s.t==='run'?'Lari':'Jalan';$('#r-cue-left').textContent=fmt(Math.max(0,Math.ceil(R.segLeft)));$('#r-cue-nx').textContent=`${s.l} · ${nx?`berikutnya ${nx.t==='run'?'lari':'jalan'} ${fmt(nx.sec)}`:'terakhir'} · ${R.segI+1}/${segs.length}`}
  else cue.hidden=true;
  // target pace band
  const band=$('#r-band');const tp=R.plan&&R.plan.pace;
  if(tp&&PREF.mode!=='nogps'){band.hidden=false;const lo=tp[0]-45,hi=tp[1]+45,pos=v=>Math.min(100,Math.max(0,(v-lo)/(hi-lo)*100));
    const z=$('#r-band-z');z.style.left=pos(tp[0])+'%';z.style.width=(pos(tp[1])-pos(tp[0]))+'%';
    $('#r-band-l').textContent=`Target ${fmt(tp[0])}–${fmt(tp[1])}/km`;
    if(isFinite(cp)){$('#r-band-d').style.left=(100-pos(cp))+'%';z.style.left=(100-pos(tp[1]))+'%';const st=$('#r-band-s');
      if(cp<tp[0]){st.textContent='Terlalu cepat';st.style.color='var(--hot)'}else if(cp>tp[1]){st.textContent='Terlalu pelan';st.style.color='var(--warn)'}else{st.textContent='Pas';st.style.color='var(--good)'}}
    else{$('#r-band-d').style.left='50%';z.style.left=(100-pos(tp[1]))+'%';$('#r-band-s').textContent=''}}
  else band.hidden=true;
  // kontrol
  const c=$('#r-ctl');const key=R.st;
  if(c.dataset.k!==key){c.dataset.k=key;
    c.innerHTML=R.st==='idle'?`<button class="btn pri big" id="rb-start" type="button">Mulai</button>`:
      R.st==='run'?`<button class="btn sun big" id="rb-pause" type="button">Jeda</button><button class="btn big" id="rb-fin" type="button">Selesai</button>`:
      R.st==='pause'?`<button class="btn pri big" id="rb-res" type="button">Lanjut</button><button class="btn big" id="rb-fin" type="button">Selesai</button>`:''}
  // split
  const sp=$('#r-splits');if(sp.dataset.n!=String(R.splits.length)){sp.dataset.n=R.splits.length;sp.innerHTML=R.splits.length?splitsHTML(R.splits):'<p class="small muted">Split muncul setiap 1 km.</p>'}
  $('#r-pts').textContent=`${R.pts.length} titik`;
  if(useMap())updRecMap();else drawRouteCanvas($('#r-map'),R.pts);
}
$('#r-ctl').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='rb-start')recStart();else if(b.id==='rb-pause')recPause();else if(b.id==='rb-res')recResume();else if(b.id==='rb-fin'){if(R.mov<5){recDiscard();return}recFinish()}});
$('#r-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;PREF.mode=b.dataset.m;LS.set('lk-pref',PREF);R.err='';R.acc=null;if(PREF.mode==='gps')gpsWarm(true);else stopGPS();renderRec()});
function splitsHTML(sp){const mx=Math.max(...sp),mn=Math.min(...sp);return sp.map((s,i)=>`<div class="split ${s===mn&&sp.length>1?'best':''}"><span class="muted">${i+1}</span><span class="sb"><i style="width:${Math.max(18,mn/s*100)}%"></i></span><span>${fmt(s)}</span></div>`).join('')}
function drawRouteCanvas(cv,track,opt={}){if(!cv)return;const dpr=window.devicePixelRatio||1,w=cv.clientWidth||300,h=cv.clientHeight||200;
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
  const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
  if(!track||track.length<2){x.fillStyle=css('--muted');x.font='13px '+css('--sans');x.textAlign='center';x.fillText(track&&track.length?'Menunggu titik berikutnya…':'Rute akan tergambar di sini',w/2,h/2);return}
  routePath(x,track,14,14,w-28,h-28,css('--cobalt'),4,css('--mint'),css('--hot'))}
function routePath(x,track,bx,by,bw,bh,col,lw,cs,ce){let a=Infinity,b=-Infinity,c=Infinity,d=-Infinity;const k=Math.cos(track[0][0]*Math.PI/180);
  track.forEach(p=>{const X=p[1]*k,Y=p[0];a=Math.min(a,X);b=Math.max(b,X);c=Math.min(c,Y);d=Math.max(d,Y)});
  const sw=(b-a)||1e-6,sh=(d-c)||1e-6,s=Math.min(bw/sw,bh/sh),ox=bx+(bw-sw*s)/2,oy=by+(bh-sh*s)/2;
  const P2=p=>[ox+(p[1]*k-a)*s,oy+(d-p[0])*s];
  x.lineJoin='round';x.lineCap='round';x.strokeStyle=col;x.lineWidth=lw;x.beginPath();track.forEach((p,i)=>{const [X,Y]=P2(p);i?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke();
  const [sx,sy]=P2(track[0]),[ex,ey]=P2(track[track.length-1]);x.fillStyle=cs;x.beginPath();x.arc(sx,sy,lw*1.6,0,7);x.fill();x.fillStyle=ce;x.beginPath();x.arc(ex,ey,lw*1.6,0,7);x.fill()}

/* GPX impor */
$('#r-gpx').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const txt=await f.text();const doc=new DOMParser().parseFromString(txt,'application/xml');const pts=[...doc.getElementsByTagName('trkpt')].concat([...doc.getElementsByTagName('rtept')]);
    if(pts.length<2)throw new Error('Tidak ada titik rute di file ini.');
    const raw=pts.map(p=>{const t=p.getElementsByTagName('time')[0],el=p.getElementsByTagName('ele')[0];return{lat:+p.getAttribute('lat'),lon:+p.getAttribute('lon'),ele:el?+el.textContent:null,ts:t?Date.parse(t.textContent):NaN}}).filter(p=>isFinite(p.lat)&&isFinite(p.lon));
    const hasT=raw.every(p=>isFinite(p.ts));
    let mov=0,dist=0;const tr=[[raw[0].lat,raw[0].lon,raw[0].ele,0]];
    for(let i=1;i<raw.length;i++){const d=hav(raw[i-1],raw[i]),dt=hasT?(raw[i].ts-raw[i-1].ts)/1000:0;dist+=d;if(hasT&&dt>0&&dt<60&&d/dt>0.5)mov+=dt;tr.push([+raw[i].lat.toFixed(5),+raw[i].lon.toFixed(5),raw[i].ele!=null?Math.round(raw[i].ele*10)/10:null,Math.round(mov)])}
    const nm=doc.getElementsByTagName('name')[0];
    showSaveForm({src:'gpx',date:hasT?new Date(raw[0].ts).toISOString():new Date().toISOString(),km:dist/1000,sec:Math.round(mov),elev:Math.round(elevGain(raw.map(p=>p.ele))),splits:null,track:tr,note:nm?nm.textContent.trim().slice(0,80):'',noTime:!hasT});
  }catch(err){toast('GPX tidak bisa dibaca: '+(err.message||'format tidak dikenal'))}});

/* form simpan */
let PENDING=null;
function showSaveForm(run){PENDING=run;location.hash='rekam';$('#r-live').hidden=true;const f=$('#r-save');f.hidden=false;
  const sim=run.src==='sim',needKm=!sim&&(!run.track||run.track.length<2),noTime=run.noTime;
  f.innerHTML=`<div class="between"><h3>${sim?'Simulasi selesai':'Simpan lari'}</h3><span class="chip c-${sim?'X':'Q'}">${{gps:'GPS',gpx:'Impor GPX',manual:'Tanpa GPS',sim:'Simulasi'}[run.src]}</span></div>
   <div class="stats"><div class="stat"><span class="k">Jarak</span><span class="v">${dec(run.km,2)} <small>km</small></span></div><div class="stat"><span class="k">Waktu bergerak</span><span class="v">${fmt(run.sec)}</span></div>
   <div class="stat"><span class="k">Pace</span><span class="v">${run.km>0.05&&run.sec?fmtPace(run.sec/run.km):'–'} <small>/km</small></span></div><div class="stat"><span class="k">Elevasi naik</span><span class="v">${run.elev||0} <small>m</small></span></div></div>
   ${sim?`<p class="note blue"><b>Ini simulasi.</b> Data simulasi tidak disimpan supaya statistik dan milestone kamu tetap jujur.</p><div class="row"><button class="btn pri" type="button" id="sv-close">Tutup</button></div>`:`
   <div class="row">
     ${needKm?`<label class="f" for="sv-km">Jarak (km)<input id="sv-km" class="w-s" type="number" min="0.1" step="0.01" required placeholder="5.00"></label>`:''}
     ${noTime?`<label class="f" for="sv-time">Durasi (jj:mm:dd)<input id="sv-time" class="w-m" placeholder="0:32:10" required></label>`:''}
     <label class="f" for="sv-rpe">Rasa berat (RPE)<select id="sv-rpe" class="w-m">${[2,3,4,5,6,7,8,9,10].map(v=>`<option value="${v}" ${v===4?'selected':''}>${v} · ${RPE[v]}</option>`).join('')}</select></label>
     <label class="f" for="sv-note" style="flex:1 1 200px">Catatan<input id="sv-note" value="${esc(run.note||'')}" placeholder="mis. kaki enteng, cuaca panas"></label>
   </div>
   <div class="row"><button class="btn pri" type="button" id="sv-save">Simpan lari</button><button class="btn ghost" type="button" id="sv-del">Buang</button></div>
   <p class="small" id="sv-confirm" hidden>Yakin buang lari ini? <button class="btn sm hot" type="button" id="sv-del2">Ya, buang</button> <button class="btn sm" type="button" id="sv-keep">Batal</button></p>`}`;
}
const RPE={1:'Istirahat',2:'Sangat ringan',3:'Ringan',4:'Santai, bisa ngobrol',5:'Sedang',6:'Agak berat',7:'Berat',8:'Sangat berat',9:'Hampir maksimal',10:'Maksimal'};
$('#r-save').addEventListener('click',e=>{const id=e.target.id;
  if(id==='sv-close'||id==='sv-del2'){PENDING=null;recDiscard()}
  else if(id==='sv-del'){$('#sv-confirm').hidden=false}
  else if(id==='sv-keep'){$('#sv-confirm').hidden=true}
  else if(id==='sv-save'){const r=PENDING;if(!r)return;
    if($('#sv-km')){const v=+$('#sv-km').value;if(!(v>0)){toast('Isi jarak dulu, misalnya 5.2');return}r.km=v}
    if($('#sv-time')){const v=parseTime($('#sv-time').value);if(!v){toast('Isi durasi, misalnya 0:32:10');return}r.sec=v;if(r.track)r.track.forEach((p,i,a)=>p[3]=Math.round(v*i/(a.length-1)))}
    if(r.km<0.1){toast('Lari terlalu pendek untuk disimpan (minimal 100 m).');return}
    r.rpe=+$('#sv-rpe').value;r.note=$('#sv-note').value.trim();saveRun(r);PENDING=null;recDiscard()}});
function saveRun(r){const run={id:uid(),u:Date.now(),date:r.date,km:+r.km.toFixed(3),sec:r.sec,elev:r.elev||0,rpe:r.rpe||4,note:r.note||'',src:r.src,splits:r.splits||[],bests:{}};
  if(r.track&&r.track.length>1){const cum=cumOf(r.track),ts=r.track.map(p=>p[3]);run.bests=bestEfforts(cum,ts);if(!run.splits.length)run.splits=splitsOf(cum,ts);run.track=downsample(r.track,1200)}
  else{BEST.forEach(([k,,D])=>{const m=run.km*1000;if(Math.abs(m-D)/D<=0.03)run.bests[k]=Math.round(run.sec*D/m)})}
  const prev=bestsAll(null);RUNS.push(run);RUNS.sort((a,b)=>a.date.localeCompare(b.date));
  if(!saveRuns())return;
  // tandai sesi program hari itu
  const ds=iso(pd(run.date)),pl=plan(),dm=doneMap();pl.forEach(w=>w.sess.forEach(s=>{if(iso(sessDate(w.w,s))===ds&&!dm[s.id]&&s.type!=='X')dm[s.id]=1}));saveDone();
  const fresh=[];for(const k in run.bests){const p=prev[k];if((p&&run.bests[k]<p.sec)||(!p&&k!=='1'))fresh.push({kind:'pr',key:k,sec:run.bests[k],run,prev:p?p.sec:null})}
  fresh.push(...checkMilestones());
  location.hash='lari-'+run.id;
  if(fresh.length)setTimeout(()=>celebrate(fresh,run),250);else toast('Lari tersimpan');}

/* ================= story IG (kartu kaca) ================= */
const BGS=[['photo','Foto kamu'],['clear','Transparan'],['dark','Gelap'],['lime','Lime']];
const ST={bg:PREF.storyBg||'dark',gray:PREF.storyGray!==false,img:null};
let fontsOK=null;function fontsReady(){return fontsOK||(fontsOK=Promise.all(['700 60px Inter','600 40px Inter','400 40px Inter','500 40px "Roboto Mono"'].map(f=>document.fonts.load(f).catch(()=>{}))).catch(()=>{}))}
const SF='-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, system-ui, sans-serif';
function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}
function txt(x,s,X,Y,font,col,align='left'){x.font=font;x.fillStyle=col;x.textAlign=align;x.fillText(s,X,Y)}
function wrapT(x,s,maxW){const words=String(s).split(' '),lines=[];let cur='';words.forEach(w=>{const t=cur?cur+' '+w:w;if(x.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t});if(cur)lines.push(cur);return lines}
function coverRect(iw,ih,W,H){const s=Math.max(W/iw,H/ih);return[(W-iw*s)/2,(H-ih*s)/2,iw*s,ih*s]}
// blur lintas-browser: kecilkan lalu besarkan, plus grayscale/brightness di piksel kecil
function softImg(img,W,H,scale,gray,bright){const w=Math.max(8,Math.round(W*scale)),h=Math.max(8,Math.round(H*scale));const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  const [a,b,cw,ch]=coverRect(img.naturalWidth||img.width,img.naturalHeight||img.height,w,h);x.imageSmoothingQuality='high';x.drawImage(img,a,b,cw,ch);
  const d=x.getImageData(0,0,w,h),p=d.data;for(let i=0;i<p.length;i+=4){let r=p[i],g=p[i+1],bl=p[i+2];if(gray){const l=.299*r+.587*g+.114*bl;r=g=bl=l}p[i]=Math.min(255,r*bright);p[i+1]=Math.min(255,g*bright);p[i+2]=Math.min(255,bl*bright)}x.putImageData(d,0,0);
  const c2=document.createElement('canvas');c2.width=Math.round(w*3);c2.height=Math.round(h*3);const y=c2.getContext('2d');y.imageSmoothingQuality='high';y.drawImage(c,0,0,c2.width,c2.height);return c2}
function smooth(a,k){return a.map((_,i)=>{let s=0,n=0;for(let j=Math.max(0,i-k);j<=Math.min(a.length-1,i+k);j++){if(a[j]!=null){s+=a[j];n++}}return n?s/n:null})}
function eleSeries(tr){if(!tr||tr.length<3||!tr.some(p=>p[2]!=null))return null;const e=smooth(tr.map(p=>p[2]),4).filter(v=>v!=null);return e.length>2?e:null}
function paceSeries(r){const tr=r.track;if(tr&&tr.length>10){const cum=cumOf(tr),ts=tr.map(p=>p[3]),tot=cum[cum.length-1];if(tot>300){const out=[];let j=0;const tAt=d=>{while(j<cum.length-2&&cum[j+1]<d)j++;const f=(d-cum[j])/((cum[j+1]-cum[j])||1);return ts[j]+(ts[j+1]-ts[j])*f};
    const step=Math.max(25,tot/160);for(let d=0;d+100<=tot;d+=step){j=0;const p=(tAt(d+100)-tAt(d))*10;if(p>0)out.push(p)}
    if(out.length>4){const srt=out.slice().sort((a,b)=>a-b),med=srt[Math.floor(srt.length/2)];return smooth(out.map(v=>Math.min(med*1.8,Math.max(med*.55,v))),1)}}}
  return r.splits&&r.splits.length>1?r.splits.slice():null}
function drawLine(x,vals,X,Y,w,h,col,fill,invert){if(!vals||vals.length<2)return;const mn=Math.min(...vals),mx=Math.max(...vals),rg=(mx-mn)||1;const P=(v,i)=>[X+w*i/(vals.length-1),Y+h-(invert?(mx-v)/rg:(v-mn)/rg)*h*.86-h*.07];
  if(fill){x.beginPath();vals.forEach((v,i)=>{const [a,b]=P(v,i);i?x.lineTo(a,b):x.moveTo(a,b)});x.lineTo(X+w,Y+h);x.lineTo(X,Y+h);x.closePath();x.fillStyle=fill;x.fill()}
  x.beginPath();vals.forEach((v,i)=>{const [a,b]=P(v,i);i?x.lineTo(a,b):x.moveTo(a,b)});x.strokeStyle=col;x.lineWidth=5;x.lineJoin='round';x.lineCap='round';x.stroke()}
function drawBars(x,vals,X,Y,w,h,col,fasterHigher){if(!vals||!vals.length)return;vals=vals.slice(0,14);const gap=16,bw=(w-gap*(vals.length-1))/vals.length;const mn=Math.min(...vals),mx=Math.max(...vals),rg=(mx-mn)||1;
  vals.forEach((v,i)=>{const f=fasterHigher?(mx-v)/rg:(v-mn)/rg;const bh=h*(.55+.45*(vals.length>1?f:1));rr(x,X+i*(bw+gap),Y+h-bh,bw,bh,Math.min(16,bw/3));x.fillStyle=col;x.fill()})}
function planLabel(dateStr){if(!P)return '';const pl=plan(),d=pd(dateStr),w=Math.floor((monday(d)-pd(P.planStart))/864e5/7)+1;if(w>=1&&w<=pl.length)return `${P.level==='pemula'?'Program':'Program '+GOALN[P.goal]} | Minggu ${w}`;return `Pelari ${LEVELS[P.level].name}`}
async function drawStory(item){await fontsReady();const W=1080,H=1920,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const bg=ST.bg==='photo'&&!ST.img?'dark':ST.bg;
  if(bg==='photo'){const s=softImg(ST.img,W,H,1/18,ST.gray,.92);x.drawImage(s,-40,-40,W+80,H+80)}
  else if(bg==='dark'){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#34353A');g.addColorStop(1,'#141517');x.fillStyle=g;x.fillRect(0,0,W,H);const r=x.createRadialGradient(W*.75,H*.3,40,W*.75,H*.3,900);r.addColorStop(0,'rgba(204,243,58,.18)');r.addColorStop(1,'rgba(204,243,58,0)');x.fillStyle=r;x.fillRect(0,0,W,H)}
  else if(bg==='lime'){x.fillStyle='#CCF33A';x.fillRect(0,0,W,H)}
  const fg=bg==='lime'?'#15160F':'#FFFFFF',mu=bg==='lime'?'rgba(21,22,15,.62)':'rgba(255,255,255,.66)',soft=bg==='lime'?'rgba(21,22,15,.12)':'rgba(255,255,255,.16)';
  const CX=96,CY=320,CW=888,CH=1270,R=48,PX=CX+56,IW=CW-112;
  // kartu kaca
  x.save();rr(x,CX,CY,CW,CH,R);x.clip();
  if(bg==='photo'){const s=softImg(ST.img,W,H,1/70,ST.gray,1.22);x.drawImage(s,-40,-40,W+80,H+80);x.fillStyle='rgba(255,255,255,.10)';x.fillRect(CX,CY,CW,CH)}
  else{x.fillStyle=bg==='clear'?'rgba(24,25,28,.46)':bg==='lime'?'rgba(255,255,255,.34)':'rgba(255,255,255,.07)';x.fillRect(CX,CY,CW,CH)}
  x.restore();rr(x,CX+1,CY+1,CW-2,CH-2,R);x.strokeStyle=bg==='lime'?'rgba(21,22,15,.12)':'rgba(255,255,255,.26)';x.lineWidth=2;x.stroke();
  // pil + logo
  const run=item.run,pill=item.kind==='run'?planLabel(run.date):item.kind==='pr'?(item.prev?'Rekor pribadi baru':'Rekor pertama'):'Pencapaian baru';
  x.font=`400 30px ${SF}`;const pw=x.measureText(pill).width+48;rr(x,PX,CY+56,pw,54,27);x.fillStyle=soft;x.fill();txt(x,pill,PX+24,CY+93,`400 30px ${SF}`,mu);
  x.beginPath();x.arc(CX+CW-80,CY+84,26,0,7);x.lineWidth=5;x.strokeStyle=bg==='lime'?'#15160F':'#CCF33A';x.stroke();txt(x,'C',CX+CW-80,CY+96,`700 32px ${SF}`,fg,'center');
  let y=CY+200;
  if(item.kind==='run'){
    txt(x,ST.title||runName(run),PX,y,`700 64px ${SF}`,fg);y+=62;
    txt(x,ST.place||`${HARI[dowOf(pd(run.date))]}, ${dLong(pd(run.date))}`,PX,y,`400 44px ${SF}`,mu);y+=110;
    // jarak + elevasi
    txt(x,'Jarak',PX,y,`400 36px ${SF}`,mu);y+=70;txt(x,`${dec(run.km,2)}km`,PX,y,`700 64px ${SF}`,fg);txt(x,`Elevasi naik: ${run.elev||0}m`,PX+IW,y-4,`400 32px ${SF}`,fg,'right');
    const es=eleSeries(run.track);y+=32;if(es)drawLine(x,es,PX,y,IW,130,fg,bg==='lime'?'rgba(21,22,15,.10)':'rgba(255,255,255,.14)');else{rr(x,PX,y+60,IW,8,4);x.fillStyle=soft;x.fill()}
    y+=210;
    // pace
    const ps=paceSeries(run),fast=run.splits&&run.splits.length?Math.min(...run.splits):(run.bests&&run.bests['1']);
    txt(x,'Pace',PX,y,`400 36px ${SF}`,mu);y+=70;txt(x,`${fmtPace(run.sec/run.km)}/km`,PX,y,`700 64px ${SF}`,fg);if(fast)txt(x,`Tercepat: ${fmtPace(fast)}/km`,PX+IW,y-4,`400 32px ${SF}`,fg,'right');
    y+=32;if(ps)drawLine(x,ps,PX,y,IW,120,fg,null,true);y+=200;
    // waktu + split
    txt(x,'Waktu',PX,y,`400 36px ${SF}`,mu);y+=70;txt(x,fmt(run.sec),PX,y,`700 64px ${SF}`,fg);txt(x,`RPE ${run.rpe}`,PX+IW,y-4,`400 32px ${SF}`,fg,'right');y+=36;
    const sp=run.splits&&run.splits.length?run.splits:null;if(sp)drawBars(x,sp,PX,y,IW,130,bg==='lime'?'rgba(21,22,15,.78)':'rgba(255,255,255,.82)',true);
    else{txt(x,'Split per km muncul untuk lari yang direkam GPS atau diimpor.',PX,y+70,`400 28px ${SF}`,mu)}
  }else{
    let big,unit,title,sub;
    if(item.kind==='pr'){const b=BEST.find(z=>z[0]===item.key);big=fmt(item.sec);unit=b[1];title=`${b[1]} tercepat`;sub=`${fmtPace(item.sec/(b[2]/1000))}/km${item.prev?` · ${fmt(item.prev-item.sec)} lebih cepat dari rekor lama`:''}`}
    else{const m=item.m;big=m.big;unit=m.unit.toLowerCase();title=m.title;sub=msSub(m)}
    const d=item.kind==='pr'?pd(item.run.date):new Date(item.date||Date.now());
    txt(x,ST.title||title,PX,y,`700 64px ${SF}`,fg);y+=62;txt(x,ST.place||dLong(d),PX,y,`400 44px ${SF}`,mu);y+=280;
    let sz=230;x.font=`700 ${sz}px ${SF}`;while(x.measureText(big).width>IW-40&&sz>80){sz-=10;x.font=`700 ${sz}px ${SF}`}
    txt(x,big,PX-6,y,`700 ${sz}px ${SF}`,fg);const bw=x.measureText(big).width;if(bw+180<IW)txt(x,unit,PX+bw+18,y,`600 52px ${SF}`,bg==='lime'?'#15160F':'#CCF33A');else{y+=70;txt(x,unit,PX,y,`600 52px ${SF}`,bg==='lime'?'#15160F':'#CCF33A')}
    y+=80;x.font=`400 36px ${SF}`;wrapT(x,sub,IW).slice(0,2).forEach((l,i)=>txt(x,l,PX,y+i*48,`400 36px ${SF}`,mu));y+=150;
    const s=stats(),cols=[['Total jarak',`${dec(s.km)} km`],['Lari',String(s.runs)],['Konsisten',`${s.streak} mgg`]];
    cols.forEach((cc,i)=>{const X=PX+i*IW/3;txt(x,cc[0],X,y,`400 32px ${SF}`,mu);txt(x,cc[1],X,y+62,`700 50px ${SF}`,fg)});y+=130;
    const W10=weekBuckets(10).map(w=>w.km);txt(x,'Km per minggu',PX,y,`400 32px ${SF}`,mu);y+=26;
    const mx=Math.max(1,...W10),gap=14,bw2=(IW-gap*9)/10;W10.forEach((v,i)=>{const bh=Math.max(14,150*v/mx);rr(x,PX+i*(bw2+gap),y+150-bh,bw2,bh,12);x.fillStyle=i===9?(bg==='lime'?'#15160F':'#CCF33A'):(bg==='lime'?'rgba(21,22,15,.35)':'rgba(255,255,255,.75)');x.fill()});
  }
  if(bg!=='clear')txt(x,'CUPUBERLARI',W/2,CY+CH+80,`700 30px ${SF}`,mu,'center');
  return c}
let DL=null;(async()=>{try{if(window.claude&&window.claude.use)DL=await window.claude.use('downloads')}catch(e){DL=null}})();
function blobB64(blob){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=no;r.readAsDataURL(blob)})}
async function saveBlob(blob,name){
  // Aplikasi Android: simpan ke cache lalu buka lembar Bagikan (Instagram, Galeri, Drive, WhatsApp…)
  const FS=NP('Filesystem'),SH=NP('Share');
  if(FS&&SH){try{const w=await FS.writeFile({path:name,data:await blobB64(blob),directory:'CACHE'});await SH.share({title:'cupuberlari',files:[w.uri],dialogTitle:'Bagikan atau simpan'});return}catch(e){if(/cancel/i.test(String(e&&e.message)))return;toast('Gagal membagikan: '+((e&&e.message)||e))}return}
  if(DL){try{await DL.save({filename:name,data:blob});toast('Gambar tersimpan. Buka Instagram, pilih Story, lalu ambil dari galeri.');return}catch(e){if(e&&e.code==='declined')return}}
  try{const file=new File([blob],name,{type:blob.type});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'cupuberlari'});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);toast('Kalau tidak terunduh, tekan lama gambar lalu pilih Simpan.')}catch(e){toast('Tekan lama gambar lalu pilih Simpan gambar.')}}
function openModal(html){$('#sheet').innerHTML=html;$('#modal').hidden=false;document.body.style.overflow='hidden'}
function closeModal(){$('#modal').hidden=true;document.body.style.overflow='';$('#sheet').innerHTML=''}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'||e.target.closest('[data-close]'))closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').hidden)closeModal()});
let STORY_ITEM=null,STORY_CANVAS=null,CELEB=null;
function itemLabel(it){if(it.kind==='run')return `Lari ${dec(it.run.km,2)} km`;if(it.kind==='pr'){const b=BEST.find(z=>z[0]===it.key);return `Rekor ${b[1]} ${fmt(it.sec)}`}return it.m.title}
function storyFields(){const it=STORY_ITEM;if(it.kind==='run'){ST.title=it.run.storyTitle||'';ST.place=it.run.place||''}else{ST.title='';ST.place=''}}
async function openStory(item,intro){STORY_ITEM=item;storyFields();const isRun=item.kind==='run';
  openModal(`<div class="between"><div class="stack" style="gap:4px"><span class="eyebrow">${intro?'Selamat!':'Story Instagram'}</span><h2 class="disp">${esc(intro||itemLabel(item))}</h2></div><button class="btn ghost" type="button" data-close>Tutup</button></div>
  <div class="storybox"><img id="st-img" alt="Pratinjau story ${esc(itemLabel(item))}"><div class="stack">
    ${intro?`<div class="stack" id="st-list"></div>`:''}
    <div class="stack" style="gap:8px"><span class="eyebrow">Background</span><div class="seg" id="st-bg">${BGS.map(([k,n])=>`<button type="button" data-bg="${k}" aria-pressed="${k===ST.bg}">${n}</button>`).join('')}</div></div>
    <div class="stack" id="st-photo" ${ST.bg==='photo'?'':'hidden'} style="gap:10px"><div class="row"><label class="btn sm" for="st-file">${ST.img?'Ganti foto':'Upload foto'}</label><input type="file" id="st-file" accept="image/*" hidden>
      <label class="feat" for="st-gray" style="border:0;padding:0;align-items:center"><input type="checkbox" id="st-gray" ${ST.gray?'checked':''}><span>Hitam-putih</span></label></div>
      <p class="tiny muted">Foto hanya dipakai di HP ini untuk membuat gambar, tidak diunggah ke mana pun.</p></div>
    <p class="tiny muted" id="st-clear" ${ST.bg==='clear'?'':'hidden'}>PNG transparan: di Instagram, buka story dengan fotomu, lalu tempel gambar ini sebagai stiker (Stiker → ikon foto).</p>
    <div class="row"><label class="f" for="st-title" style="flex:1 1 160px">Judul<input id="st-title" value="${esc(ST.title)}" placeholder="${esc(isRun?runName(item.run):'Judul otomatis')}" maxlength="28"></label>
      <label class="f" for="st-place" style="flex:1 1 160px">${isRun?'Lokasi':'Baris kedua'}<input id="st-place" value="${esc(ST.place)}" placeholder="${isRun?'mis. GBK, Jakarta':'Tanggal otomatis'}" maxlength="32"></label></div>
    <div class="row"><button class="btn pri" type="button" id="st-save">Simpan gambar</button></div>
    <p class="tiny muted">Tombol tidak jalan? Tekan lama gambar, lalu pilih Simpan ke Foto.</p>
  </div></div>`);
  await renderStory()}
let stT=null;async function renderStory(){STORY_CANVAS=await drawStory(STORY_ITEM);const img=$('#st-img');if(img){img.src=STORY_CANVAS.toDataURL('image/png');img.classList.toggle('checker',ST.bg==='clear')}}
$('#sheet').addEventListener('click',async e=>{const b=e.target.closest('[data-bg]');if(b){ST.bg=b.dataset.bg;PREF.storyBg=ST.bg;LS.set('lk-pref',PREF);$$('#st-bg button').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#st-photo').hidden=ST.bg!=='photo';$('#st-clear').hidden=ST.bg!=='clear';if(ST.bg==='photo'&&!ST.img)$('#st-file').click();await renderStory();return}
  if(e.target.id==='st-save'&&STORY_CANVAS){STORY_CANVAS.toBlob(bl=>bl&&saveBlob(bl,`cupuberlari-story-${Date.now()}.png`),'image/png');return}
  const li=e.target.closest('[data-it]');if(li&&CELEB){STORY_ITEM=CELEB[+li.dataset.it];storyFields();$('#st-title').value=ST.title;$('#st-place').value=ST.place;$$('#st-list [data-it]').forEach(x=>x.setAttribute('aria-pressed',x===li));await renderStory()}});
$('#sheet').addEventListener('change',async e=>{const id=e.target.id;
  if(id==='st-gray'){ST.gray=e.target.checked;PREF.storyGray=ST.gray;LS.set('lk-pref',PREF);await renderStory()}
  else if(id==='st-file'){const f=e.target.files[0];e.target.value='';if(!f)return;const url=URL.createObjectURL(f);const im=new Image();im.onload=async()=>{ST.img=im;ST.bg='photo';$$('#st-bg button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.bg==='photo'));$('#st-photo').hidden=false;$('label[for="st-file"]').textContent='Ganti foto';await renderStory()};im.onerror=()=>toast('Foto tidak bisa dibuka. Coba JPG atau PNG.');im.src=url}});
$('#sheet').addEventListener('input',e=>{const id=e.target.id;if(id!=='st-title'&&id!=='st-place')return;ST[id==='st-title'?'title':'place']=e.target.value.trim();
  if(STORY_ITEM&&STORY_ITEM.kind==='run'){const r=RUNS.find(z=>z.id===STORY_ITEM.run.id);if(r){if(id==='st-title')r.storyTitle=ST.title;else r.place=ST.place;touchRun(r);saveRuns();syncSoon()}}
  clearTimeout(stT);stT=setTimeout(renderStory,250)});
async function celebrate(items,run){CELEB=[...items];if(run)CELEB.push({kind:'run',run});
  await openStory(CELEB[0],items.length>1?`${items.length} pencapaian baru!`:items[0].kind==='pr'?(items[0].prev?'Rekor pribadi baru!':'Rekor pertama tercatat!'):'Pencapaian baru!');
  $('#st-list').innerHTML=`<span class="eyebrow">Pilih yang mau dipamerin</span><div class="seg col">${CELEB.map((it,i)=>`<button type="button" data-it="${i}" aria-pressed="${i===0}">${esc(itemLabel(it))}</button>`).join('')}</div>`}

/* ================= peta ================= */
const MAPS={};let TILE_OK=null;
const useMap=()=>!!window.L&&TILE_OK!==false;
function makeMap(id){if(!window.L)return null;if(MAPS[id])return MAPS[id];const el=$('#'+id);if(!el)return null;
  const m=L.map(el,{zoomControl:false,attributionControl:true}).setView([-6.2,106.82],12);
  const tl=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19,attribution:'&copy; OpenStreetMap &copy; CARTO'});
  let errs=0;tl.on('tileerror',()=>{errs++;if(errs>=2&&TILE_OK!==true){TILE_OK=false;mapFallback()}});tl.on('tileload',()=>{TILE_OK=true});tl.addTo(m);
  const o={m,line:L.polyline([],{color:'#CCF33A',weight:5,opacity:.95,lineJoin:'round'}).addTo(m),dot:null,start:null,follow:true,n:-1};
  m.on('dragstart',()=>{o.follow=false;const b=$('#r-follow');if(b&&id==='r-lmap')b.hidden=false});MAPS[id]=o;return o}
function mapFallback(){$$('.lmap').forEach(el=>el.hidden=true);$$('canvas.route').forEach(c=>c.hidden=false);$$('.mapnote').forEach(n=>{n.hidden=false;n.textContent='Peta jalanan tidak bisa dimuat di tampilan ini (halaman claude.ai memblokir gambar peta). Rute tetap tergambar; di versi standalone peta tampil penuh.'});
  const fb=$('#r-follow');if(fb)fb.hidden=true;renderRec();const h=location.hash.slice(1);if(h.startsWith('lari-')){const r=RUNS.find(z=>'lari-'+z.id===h);r&&drawRouteCanvas($('#ld-map'),r.track)}}
function recMapShow(){const box=$('#r-lmap'),cv=$('#r-map');if(!useMap()){box.hidden=true;cv.hidden=false;return}box.hidden=false;cv.hidden=true;const o=makeMap('r-lmap');if(!o)return;
  setTimeout(()=>{o.m.invalidateSize();if(!o.n||o.n===-1||String(o.n).startsWith('0|')){const last=R.pts[R.pts.length-1];o.m.setView(last?[last[0],last[1]]:[-6.2,106.82],last?16:12)}updRecMap(true)},60)}
function updRecMap(force){const o=MAPS['r-lmap'];if(!o||!useMap()||$('#v-rekam').hidden)return;const key=R.pts.length+'|'+(R.here?R.here.latitude+','+R.here.longitude:'');if(!force&&o.n===key)return;o.n=key;
  const ll=R.pts.map(p=>[p[0],p[1]]);o.line.setLatLngs(ll);
  if(!ll.length){if(o.start){o.start.remove();o.start=null}
    if(R.here){const h=[R.here.latitude,R.here.longitude];if(!o.dot)o.dot=L.circleMarker(h,{radius:9,color:'#FFFFFF',weight:4,fillColor:'#CCF33A',fillOpacity:1}).addTo(o.m);else o.dot.setLatLng(h);if(o.follow)o.m.setView(h,Math.max(o.m.getZoom(),16))}
    else if(o.dot){o.dot.remove();o.dot=null}return}
  const last=ll[ll.length-1];if(!o.start)o.start=L.circleMarker(ll[0],{radius:6,color:'#1D1E21',weight:3,fillColor:'#4D8CF5',fillOpacity:1}).addTo(o.m);
  if(!o.dot)o.dot=L.circleMarker(last,{radius:9,color:'#FFFFFF',weight:4,fillColor:'#CCF33A',fillOpacity:1}).addTo(o.m);else o.dot.setLatLng(last);
  if(o.follow){if(o.m.getZoom()<15)o.m.setView(last,16);else o.m.panTo(last,{animate:true,duration:.4})}}
function detailMap(r){const box=$('#ld-lmap'),cv=$('#ld-map');if(!box||!r.track)return;if(MAPS['ld-lmap']){MAPS['ld-lmap'].m.remove();delete MAPS['ld-lmap']}
  if(!useMap()){box.hidden=true;cv.hidden=false;drawRouteCanvas(cv,r.track);return}cv.hidden=true;box.hidden=false;
  const o=makeMap('ld-lmap');const ll=r.track.map(p=>[p[0],p[1]]);o.line.setLatLngs(ll);L.circleMarker(ll[0],{radius:6,color:'#1D1E21',weight:3,fillColor:'#4D8CF5',fillOpacity:1}).addTo(o.m);L.circleMarker(ll[ll.length-1],{radius:7,color:'#1D1E21',weight:3,fillColor:'#EE403B',fillOpacity:1}).addTo(o.m);
  setTimeout(()=>{o.m.invalidateSize();o.m.fitBounds(o.line.getBounds(),{padding:[24,24]})},60)}

/* ================= akun & sinkron (Supabase) ================= */
// Pakai var supaya aman dipanggil sebelum baris ini dieksekusi (milestone awal memanggil saveEarned saat load).
var SB=null,SB_USER=null,SB_BUSY=false,SB_T=null,SB_ERR='',SB_LAST=LS.get('lk-sync-last',null);
function sbConf(){const c=window.LANGKAH_CONFIG||{},o=LS.get('lk-sb',{});return{url:(o.url||c.supabaseUrl||'').trim(),key:(o.key||c.supabaseAnonKey||'').trim()}}
function sbInit(){if(SB)return SB;const c=sbConf();if(!c.url||!c.key||!window.supabase||!window.supabase.createClient)return null;
  try{SB=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'lk-auth'}});
    SB.auth.onAuthStateChange((ev,session)=>{const u=session&&session.user||null,changed=(u&&u.id)!==(SB_USER&&SB_USER.id);SB_USER=u;if(changed){if(u)syncNow();refreshAcct()}});
    SB.auth.getSession().then(({data})=>{SB_USER=data&&data.session&&data.session.user||null;if(SB_USER)syncNow();refreshAcct()})}catch(e){SB=null;SB_ERR='Konfigurasi Supabase tidak valid.'}
  return SB}
function refreshAcct(){if(!$('#v-profil').hidden&&$('#acct'))$('#acct').innerHTML=acctInner()}
function syncSoon(){if(!SB_USER)return;clearTimeout(SB_T);SB_T=setTimeout(syncNow,2500)}
function saveDone(){LS.set('lk-done',DONE);LS.set('lk-state-u',Date.now());syncSoon()}
function saveEarned(){LS.set('lk-earned',EARNED);LS.set('lk-state-u',Date.now());syncSoon()}
function touchRun(r){r.u=Date.now()}
function tombRun(id){const t=LS.get('lk-tomb',{});t[id]=Date.now();LS.set('lk-tomb',t)}
async function syncNow(){const sb=sbInit();if(!sb||!SB_USER||SB_BUSY)return;SB_BUSY=true;SB_ERR='';refreshAcct();const uid=SB_USER.id;
  try{
    // 1. tarik lari yang berubah sejak sinkron terakhir
    let cursor=LS.get('lk-pull-cursor','1970-01-01T00:00:00Z'),pulled=0,changed=false;
    for(;;){const {data,error}=await sb.from('lk_runs').select('id,data,deleted,updated_at').gt('updated_at',cursor).order('updated_at',{ascending:true}).limit(200);if(error)throw error;
      for(const row of data){const ru=Date.parse(row.updated_at),i=RUNS.findIndex(r=>r.id===row.id),loc=i>=0?RUNS[i]:null;
        if(row.deleted){if(loc&&(loc.u||0)<=ru){RUNS.splice(i,1);changed=true}}
        else if(row.data&&(!loc||(loc.u||0)<ru)){const r=Object.assign({},row.data,{u:ru});if(loc)RUNS[i]=r;else RUNS.push(r);changed=true}
        cursor=row.updated_at;pulled++}
      if(data.length<200)break}
    LS.set('lk-pull-cursor',cursor);
    if(changed){RUNS.sort((a,b)=>a.date.localeCompare(b.date));LS.set('lk-runs',RUNS)}
    // 2. kirim lari lokal yang baru/berubah dan yang dihapus
    const pushedAt=LS.get('lk-pushed-at',0);let maxU=pushedAt;
    const out=RUNS.filter(r=>{if(!r.u){r.u=Date.parse(r.date)||Date.now();if(r.u<=pushedAt)r.u=Date.now()}return r.u>pushedAt});
    for(let i=0;i<out.length;i+=15){const rows=out.slice(i,i+15).map(r=>({user_id:uid,id:r.id,data:Object.assign({},r,{u:undefined}),deleted:false,updated_at:new Date(r.u).toISOString()}));
      const {error}=await sb.from('lk_runs').upsert(rows,{onConflict:'user_id,id'});if(error)throw error;rows.forEach(x=>maxU=Math.max(maxU,Date.parse(x.updated_at)))}
    const tomb=LS.get('lk-tomb',{}),tids=Object.keys(tomb).filter(id=>tomb[id]>pushedAt);
    if(tids.length){const rows=tids.map(id=>({user_id:uid,id,data:null,deleted:true,updated_at:new Date(tomb[id]).toISOString()}));const {error}=await sb.from('lk_runs').upsert(rows,{onConflict:'user_id,id'});if(error)throw error;tids.forEach(id=>maxU=Math.max(maxU,tomb[id]))}
    LS.set('lk-pushed-at',maxU);if(out.length)LS.set('lk-runs',RUNS);
    // 3. profil, progres program, milestone
    const {data:st,error:e1}=await sb.from('lk_state').select('*').eq('user_id',uid).maybeSingle();if(e1)throw e1;
    const firstLink=LS.get('lk-sync-linked',null)!==uid;
    const rs=st&&st.done&&st.done.__reset||0;
    if(rs>LS.get('lk-reset-seen',0)){LS.set('lk-reset-seen',rs);if(!firstLink){RUNS=[];DONE={};EARNED={};['lk-runs','lk-done','lk-earned','lk-tomb','lk-earned-init'].forEach(LS.del);LS.del('lk-profile');P=null;PLAN_SIG='';LS.set('lk-sync-linked',uid);SB_LAST=new Date().toISOString();LS.set('lk-sync-last',SB_LAST);route();toast('Data akun ini sudah di-reset dari perangkat lain.');return}}
    if(st){if(st.profile&&(firstLink||!P||(+st.profile_u||0)>(P._u||0))){P=Object.assign({},st.profile,{onboarded:true,_u:+st.profile_u||Date.now()});LS.set('lk-profile',P);PLAN_SIG='';changed=true}
      for(const k in (st.done||{})){if(k==='__reset')continue;DONE[k]=Object.assign({},st.done[k],DONE[k]||{})}
      for(const k in (st.earned||{})){if(!EARNED[k]||st.earned[k]<EARNED[k])EARNED[k]=st.earned[k]}
      LS.set('lk-done',DONE);LS.set('lk-earned',EARNED)}
    if(P){const {error:e2}=await sb.from('lk_state').upsert({user_id:uid,profile:P,profile_u:P._u||Date.now(),done:rs?Object.assign({},DONE,{__reset:rs}):DONE,earned:EARNED,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(e2)throw e2}
    LS.set('lk-sync-linked',uid);SB_LAST=new Date().toISOString();LS.set('lk-sync-last',SB_LAST);
    if(changed||pulled){PLAN_SIG='';route()}
  }catch(e){SB_ERR=(e&&e.message)||'Sinkron gagal.';if(/fetch|network/i.test(SB_ERR))SB_ERR='Tidak bisa terhubung ke server. Cek koneksi internet atau Project URL.';if(/relation .* does not exist|lk_runs|lk_state/.test(SB_ERR))SB_ERR='Tabel belum dibuat. Jalankan supabase/schema.sql di SQL Editor Supabase.'}
  finally{SB_BUSY=false;refreshAcct()}}
function acctInner(){const c=sbConf();
  if(!c.url||!c.key||!window.supabase)return `<p class="small muted">Sinkron menyimpan lari, profil, dan pencapaian ke akunmu, sehingga data di aplikasi Android dan web sama. Isi alamat proyek Supabase dulu (Project Settings → API).</p>
    <div class="row"><label class="f" for="sb-url" style="flex:1 1 240px">Project URL<input id="sb-url" placeholder="https://xxxx.supabase.co" value="${esc(c.url)}"></label><label class="f" for="sb-key" style="flex:1 1 240px">Anon public key<input id="sb-key" placeholder="eyJhbGciOi…" value="${esc(c.key)}"></label></div>
    <div class="row"><button class="btn pri" type="button" id="sb-conf">Simpan</button></div>`;
  if(!SB_USER)return `<p class="small muted">Masuk untuk menyinkronkan data antara aplikasi Android dan web. Belum punya akun? Isi email dan kata sandi, lalu tekan Daftar.</p>
    <div class="row"><label class="f" for="sb-email" style="flex:1 1 200px">Email<input id="sb-email" type="email" autocomplete="email" placeholder="nama@email.com"></label><label class="f" for="sb-pass" style="flex:1 1 160px">Kata sandi<input id="sb-pass" type="password" autocomplete="current-password" placeholder="min. 6 karakter"></label></div>
    <div class="row"><button class="btn pri" type="button" id="sb-in">Masuk</button><button class="btn" type="button" id="sb-up">Daftar</button><button class="btn ghost sm" type="button" id="sb-reset-conf">Ganti server</button></div>
    ${SB_ERR?`<p class="note red small">${esc(SB_ERR)}</p>`:''}`;
  return `<div class="between"><div class="stack" style="gap:2px"><b>${esc(SB_USER.email||'Akun')}</b><span class="small muted">${SB_BUSY?'Menyinkronkan…':SB_LAST?`Terakhir sinkron ${dShort(new Date(SB_LAST))} ${pad(new Date(SB_LAST).getHours())}.${pad(new Date(SB_LAST).getMinutes())}`:'Belum pernah sinkron'}</span></div><span class="chip ${SB_ERR?'c-R':'c-Q'}">${SB_ERR?'Gagal':'Tersambung'}</span></div>
    ${SB_ERR?`<p class="note red small">${esc(SB_ERR)}</p>`:''}
    <div class="row"><button class="btn pri" type="button" id="sb-sync" ${SB_BUSY?'disabled':''}>Sinkron sekarang</button><button class="btn ghost" type="button" id="sb-out">Keluar</button></div>
    <p class="tiny muted">Sinkron otomatis saat aplikasi dibuka dan setiap ada lari baru. Data tetap tersimpan di HP walau sedang offline.</p>`}
function acctCard(){return `<div class="card stack"><h3>Akun & sinkron</h3><div class="stack" id="acct">${acctInner()}</div></div>`}
document.addEventListener('click',async e=>{const id=e.target.id;if(!id.startsWith('sb-'))return;
  if(id==='sb-conf'){const url=$('#sb-url').value.trim(),key=$('#sb-key').value.trim();if(!/^https:\/\/.+/.test(url)||key.length<20){toast('Isi Project URL (https://…supabase.co) dan anon key.');return}LS.set('lk-sb',{url,key});SB=null;sbInit();refreshAcct();toast('Server tersimpan. Sekarang masuk atau daftar.');return}
  if(id==='sb-reset-conf'){LS.del('lk-sb');SB=null;refreshAcct();return}
  const sb=sbInit();if(!sb)return;
  if(id==='sb-in'||id==='sb-up'){const email=$('#sb-email').value.trim(),password=$('#sb-pass').value;if(!email||password.length<6){toast('Isi email dan kata sandi (minimal 6 karakter).');return}
    e.target.disabled=true;SB_ERR='';
    const {data,error}=id==='sb-in'?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password});
    e.target.disabled=false;
    if(error){SB_ERR=/fetch|network/i.test(error.message)?'Tidak bisa terhubung ke server. Cek koneksi internet atau Project URL.':/Invalid login/i.test(error.message)?'Email atau kata sandi salah.':/confirm/i.test(error.message)?'Email belum dikonfirmasi. Buka email dari Supabase, klik tautannya, lalu masuk lagi.':error.message;refreshAcct();return}
    if(id==='sb-up'&&!data.session){toast('Akun dibuat. Cek email untuk konfirmasi, lalu tekan Masuk.');return}
    toast('Masuk berhasil. Menyinkronkan…')}
  else if(id==='sb-sync')syncNow();
  else if(id==='sb-out'){await sb.auth.signOut();SB_USER=null;LS.del('lk-pull-cursor');LS.del('lk-pushed-at');LS.del('lk-sync-linked');refreshAcct();toast('Keluar dari akun. Data di HP ini tetap ada.')}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncSoon()});

/* ================= routing ================= */
const VIEWS=['beranda','program','rekam','riwayat','alat','pencapaian','profil','lari'];
function route(){if(!NATIVE&&!LS.get('lk-lp',false)){showLP();return}$('#lp').hidden=true;if(!P||!P.onboarded){showOnb();return}$('#onb').hidden=true;
  let h=location.hash.slice(1),v=h.startsWith('lari-')?'lari':(VIEWS.includes(h)?h:'beranda');
  VIEWS.forEach(x=>$('#v-'+x).hidden=x!==v);if(v!=='rekam')gpsWarm(false);
  $$('#nav a').forEach(a=>a.setAttribute('aria-current',a.dataset.v===v?'page':'false'));
  updHead();
  ({beranda:rBeranda,program:rProgram,rekam:()=>{renderRec();recMapShow();gpsWarm(true)},riwayat:rRiwayat,alat:rAlat,pencapaian:rPencapaian,profil:rProfil,lari:()=>rLari(h.slice(5))})[v]();
  window.scrollTo(0,0)}
window.addEventListener('hashchange',route);
window.addEventListener('resize',()=>{if(!$('#v-rekam').hidden)renderRec();if(!$('#v-lari').hidden){const r=RUNS.find(z=>'lari-'+z.id===location.hash.slice(1));r&&drawRouteCanvas($('#ld-map'),r.track)}});

/* ================= Beranda ================= */
const TIPS=['Talk test: kalau tidak bisa bicara satu kalimat utuh, pelankan atau jalan sebentar.','Pegal merata itu wajar. Nyeri tajam di satu titik (tulang kering, lutut, tumit): istirahat dulu.','Jangan lari dua hari berturut-turut di bulan pertama. Tendon butuh waktu adaptasi.','Langkah pendek dan ringan lebih aman daripada langkah panjang yang menghentak tumit.','Ulangi satu minggu program kalau terasa berat. Itu bukan gagal, itu strategi.','Minum air 2 jam sebelum lari, dan jangan coba sepatu baru di hari lomba.'];
function updHead(){if(!P)return;$('#me').textContent=(P.name||'?').trim().slice(0,1).toUpperCase()||'?';$('#lvb').textContent=LVN[P.level];
  if(P.name)$('#who-name').textContent=P.name;else $('#who-name').textContent=`Pelari ${LEVELS[P.level].name}`;
  const n=streakWeeks();$('#streak').textContent=`${n} minggu`}
function sessCard(ns,opts={}){if(!ns)return `<div class="card today"><span class="eyebrow">Program</span><p class="big">Programmu sudah selesai.</p><p class="muted">Atur target baru di halaman Program.</p><div><a class="btn pri" href="#program">Atur program</a></div></div>`;
  const {wk,s,date,isToday}=ns;const t=TYPE[s.type],dm=doneMap(),done=!!dm[s.id];
  const strip=s.segs?`<div class="strip" aria-hidden="true">${s.segs.map(g=>`<i class="${g.t==='run'?'r':'w'}" style="flex:${g.sec}"></i>`).join('')}</div>`:'';
  const meta=[s.km?`${dec(s.km,s.km%1?1:0)} km`:'',s.mins?`${s.mins} mnt`:'',s.pace?`${fmt(s.pace[0])}–${fmt(s.pace[1])}/km`:''].filter(Boolean).join(' · ');
  const when=isToday?'Sesi hari ini':`${opts.next?'Sesi berikutnya · ':''}${HARI[dowOf(date)]}, ${dShort(date)}`;
  return `<div class="card today"><div class="between"><span class="eyebrow">${when} · minggu ${wk.w}</span><span class="chip c-${t[1]}">${done?'Selesai':t[0]}</span></div>
    <p class="big">${esc(s.title)}</p><p class="muted">${esc(s.detail)}</p>${meta?`<p class="mono" style="color:var(--lime);font-size:.92rem">${meta}</p>`:''}${strip}
    <div class="row">${s.type!=='X'&&!done?`<button class="btn pri" type="button" data-rec="${wk.w}|${s.id}">+ Mulai lari</button>`:''}${!done?`<button class="btn" type="button" data-done="${s.id}">Tandai selesai</button>`:''}</div></div>`}
let SELDAY=null;
function rBeranda(){const v=$('#v-beranda'),s=stats(),wb=weekBuckets(2),cur=wb[1],prev=wb[0],pl=plan(),wn=weekNow(),wkPlan=pl[wn-1],dm=doneMap();
  const today=new Date();today.setHours(0,0,0,0);const tk=iso(today),mon=monday(today);if(!SELDAY||pd(SELDAY)<mon||pd(SELDAY)>addDays(mon,6))SELDAY=tk;
  const days=[...Array(7)].map((_,i)=>{const d=addDays(mon,i),k=iso(d);return{i,d,k,runs:RUNS.filter(r=>iso(pd(r.date))===k),ses:wkPlan?wkPlan.sess.find(x=>x.dow===i):null}});
  const sel=days.find(x=>x.k===SELDAY);
  // ring
  let ringV,ringK,pct,ringS;
  if(P.level==='pemula'&&wkPlan){const ss=wkPlan.sess.filter(x=>x.type!=='X'),dn=ss.filter(x=>dm[x.id]).length;ringV=String(dn);ringK='Sesi minggu ini';pct=dn/ss.length;ringS=`${Math.round(pct*100)}% · Target ${ss.length} sesi`}
  else{const t=(wkPlan||pl[0]||{}).km||Math.max(5,Math.round(prev.km*1.1)||10);ringV=cur.km>=100?String(Math.round(cur.km)):dec(cur.km);ringK='Km minggu ini';pct=cur.km/t;ringS=`${Math.round(pct*100)}% · Target ${t} km`}
  const C=2*Math.PI*130,p=Math.max(0,Math.min(1,pct||0));
  // metrik hari terpilih
  const sk=sel.runs.reduce((a,r)=>a+r.km,0),ss=sel.runs.reduce((a,r)=>a+r.sec,0),se=sel.runs.reduce((a,r)=>a+(r.elev||0),0),kc=Math.round((P.weight||60)*sk*1.036);
  const selTxt=sel.k===tk?'hari ini':`${HARI[sel.i]}`;
  const maxDay=Math.max(1,...days.map(x=>x.runs.reduce((a,r)=>a+r.km,0)));
  // kartu sesi
  let sc='';
  if(sel.ses)sc=sessCard({wk:wkPlan,s:sel.ses,date:sel.d,isToday:sel.k===tk});
  else if(wkPlan)sc=`<div class="card today"><span class="eyebrow">${sel.k===tk?'Hari ini':`${HARI[sel.i]}, ${dShort(sel.d)}`}</span><p class="big">Hari istirahat</p><p class="muted">Pemulihan bagian dari latihan. Jalan santai atau peregangan boleh. Mau tetap lari? Jaga tetap santai.</p><div class="row"><a class="btn" href="#rekam">+ Lari bebas</a></div></div>`;
  else sc=sessCard(nextSession(),{next:true});
  let lvCard='';
  if(P.level==='pemula')lvCard=`<div class="card stack"><span class="eyebrow">Tips pemula</span><p style="font-size:1.05rem;font-weight:500">${TIPS[new Date().getDate()%TIPS.length]}</p>${has('zones')?`<p class="small muted">Target detak lari santai <b class="mono" style="color:var(--lime)">${zoneRange(1)} bpm</b> (zona 2).</p>`:''}</div>`;
  else if(has('vdot')){const vd=currentVdot();lvCard=vd?(()=>{const q=paces(vd.v);return `<div class="card stack"><div class="between"><span class="eyebrow">Pace latihanmu</span><span class="chip c-Q">VDOT ${dec(vd.v)}</span></div>
    <div class="tbl"><table><tbody><tr><td>Easy</td><td class="r">${fmt(q.E[0])}–${fmt(q.E[1])}/km</td></tr><tr><td>Tempo (T)</td><td class="r">${fmt(q.T)}/km</td></tr><tr><td>Interval (I)</td><td class="r">${fmt(q.I)}/km</td></tr>${P.level==='pro'?`<tr><td>Marathon (M)</td><td class="r">${fmt(q.M)}/km</td></tr>`:''}</tbody></table></div><p class="tiny muted">Dari ${esc(vd.src)}</p></div>`})():`<div class="card stack"><span class="eyebrow">Pace latihan</span><p>Isi hasil lomba atau time trial terakhir di Program untuk menghitung pace latihan.</p><div><a class="btn" href="#program">Isi sekarang</a></div></div>`}
  if(has('load'))lvCard+=acwrCard(acwr());
  const nextMs=MS.filter(m=>!EARNED[m.id]).map(m=>({m,p:Math.min(1,m.val(s)/m.goal)})).sort((a,b)=>b.p-a.p).slice(0,3);
  const recent=Object.entries(EARNED).sort((a,b)=>b[1].localeCompare(a[1])).slice(0,4).map(([id])=>MS.find(m=>m.id===id)).filter(Boolean);
  const I={fire:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.7 7-6.6 0-3.1-1.9-5.3-3.6-7.2-.4 1.6-1.2 2.7-2.4 3.3.3-3.4-1.2-6.6-4-8.5.2 3.1-1.2 5-2.7 6.8C4.9 11.5 5 13.2 5 15.4 5 19.3 8 22 12 22z"/></svg>',
    pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    gauge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18a9 9 0 1 1 16 0"/><path d="M12 14l4-5"/></svg>',
    mount:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l6-10 4 6 3-4 5 8z"/></svg>'};
  v.innerHTML=`
  <nav class="chips" aria-label="Pintasan"><a href="#beranda" aria-current="true">Hari ini</a><a href="#program">Program</a><a href="#pencapaian">Pencapaian</a><a href="#riwayat">Riwayat</a><a href="#alat">Alat</a></nav>
  <div class="days" role="group" aria-label="Pilih hari minggu ini">${days.map(x=>{const planned=x.ses&&x.ses.type!=='X'&&!dm[x.ses.id]&&x.k>=tk,ran=x.runs.length>0;
    return `<button type="button" class="day ${x.k===tk?'today':''}" data-day="${x.k}" aria-pressed="${x.k===SELDAY}" aria-label="${HARI[x.i]} ${dShort(x.d)}${ran?', ada lari':''}${planned?', ada sesi':''}">${ran?'<i class="ran"></i>':planned?'<i class="plan"></i>':''}<b>${x.d.getDate()}</b><span>${HARI[x.i].slice(0,3)}</span></button>`}).join('')}</div>
  <div class="ringw"><div class="ring"><svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="130" fill="none" stroke="#45474D" stroke-width="18"/><circle cx="150" cy="150" r="130" fill="none" stroke="var(--lime)" stroke-width="18" stroke-linecap="round" stroke-dasharray="${(C*p).toFixed(1)} ${C.toFixed(1)}" ${p===0?'stroke-opacity="0"':''}/></svg>
    <div class="in"><span class="k">${ringK}</span><span class="v">${ringV}</span><span class="s">${ringS}</span></div></div></div>
  <div class="tiles" aria-label="Ringkasan ${selTxt}">
    <div class="tile blue"><span class="tt">Jarak</span><span class="tb"><span class="ic">${I.pin}</span><span class="tv">${dec(sk,sk>=10?1:2)}<small>km</small></span></span></div>
    <div class="tile orange"><span class="tt">Waktu</span><span class="tb"><span class="ic">${I.clock}</span><span class="tv">${ss?fmt(ss):'0:00'}</span></span></div>
    <div class="tile red"><span class="tt">kcal${P.weight?'':' ±'}</span><span class="tb"><span class="ic">${I.fire}</span><span class="tv">${kc}</span></span></div>
    <div class="tile lime"><span class="tt">Pace</span><span class="tb"><span class="ic">${I.gauge}</span><span class="tv">${sk>0.05?fmtPace(ss/sk):'–:––'}<small>/km</small></span></span></div>
    <div class="tile blue"><span class="tt">Elevasi</span><span class="tb"><span class="ic">${I.mount}</span><span class="tv">${Math.round(se)}<small>m</small></span></span></div>
  </div>
  <p class="tiny muted" style="margin-top:-8px">Angka di kartu untuk ${selTxt}${P.weight?'':'. Kalori pakai berat 60 kg, isi beratmu di Profil'}.</p>
  <div class="cols">${sc}
    <div class="card stack"><div class="between"><h3>Km per hari</h3><button class="btn pri sm" type="button" id="h-sim">+ Simulasi lari</button></div>
      <div class="dbars">${days.map(x=>{const k=x.runs.reduce((a,r)=>a+r.km,0);return `<div class="dbar ${x.k===SELDAY?'sel':''}">${k?`<em>${dec(k)}</em>`:''}<i style="height:${Math.max(3,k/maxDay*100)}%"></i><span>${HARI[x.i].slice(0,3)}</span></div>`}).join('')}</div>
      ${sel.runs.length?`<div class="runs">${sel.runs.map(runRow).join('')}</div>`:''}</div></div>
  <div class="stats">
    <div class="stat ${s.streak>=2?'good':''}"><span class="k">Konsisten</span><span class="v">${s.streak} <small>minggu</small></span><span class="s">≥${LEVELS[P.level].weekRuns} lari per minggu</span></div>
    <div class="stat"><span class="k">Total</span><span class="v">${dec(s.km)} <small>km</small></span><span class="s">${s.runs} lari · ${Math.round(s.elev)} m naik</span></div>
    ${has('tenpct')?tenpctTile(cur.km,prev.km):`<div class="stat"><span class="k">Lari terjauh</span><span class="v">${dec(s.longest,2)} <small>km</small></span></div>`}
    <div class="stat"><span class="k">Program</span><span class="v">${wkPlan?wn:'–'}<small> / ${pl.length} mgg</small></span><span class="s">${wkPlan?esc(wkPlan.focus):wn<1?`Mulai ${dShort(pd(P.planStart))}`:'Selesai'} · ${GOALN[P.goal]}</span></div>
  </div>
  ${lvCard?`<div class="cols">${lvCard}</div>`:''}
  <div class="card stack"><div class="between"><h3>Achievements</h3><a href="#pencapaian" class="small">Lihat semua</a></div>
    ${recent.length?`<div class="badges">${recent.map(m=>badgeHTML(m,true)).join('')}</div>`:''}
    <div class="stack">${nextMs.map(({m,p})=>`<div class="stack" style="gap:6px"><div class="between small"><span>${esc(m.title)}</span><span class="mono muted">${progressText(m,s)}</span></div><div class="bar"><i style="width:${p*100}%"></i></div></div>`).join('')}</div></div>`;
}
document.addEventListener('click',e=>{const d=e.target.closest('[data-day]');if(d){SELDAY=d.dataset.day;rBeranda();return}
  if(e.target.id==='h-sim'){if(R.st==='run'||R.st==='pause'){location.hash='rekam';return}PREF.mode='sim';LS.set('lk-pref',PREF);location.hash='rekam'}});
function tenpctTile(cur,prev){if(!(prev>0))return `<div class="stat"><span class="k">Batas aman</span><span class="v">– <small>km</small></span><span class="s">Butuh data minggu lalu</span></div>`;
  const cap=prev*1.1,over=cur>cap;return `<div class="stat ${over?'warn':''}"><span class="k">Batas aman minggu ini</span><span class="v">${dec(cap)} <small>km</small></span><span class="s">${over?`Lewat ${dec(cur-cap)} km. Kurangi lari berikutnya.`:`Sisa ${dec(cap-cur)} km (aturan 10%)`}</span></div>`}
function acwrCard(a){if(!a.enough||a.ratio==null)return `<div class="card stack"><span class="eyebrow">Beban latihan (ACWR)</span><p class="small muted">Butuh minimal 3 minggu catatan lari untuk menghitung rasio beban.</p></div>`;
  const r=a.ratio,lab=r<.8?['Kurang latihan','var(--z1)']:r<=1.3?['Ideal','var(--good)']:r<=1.5?['Waspada','var(--warn)']:['Risiko cedera tinggi','var(--bad)'];const pos=Math.min(100,r/2*100);
  return `<div class="card stack"><div class="between"><span class="eyebrow">Beban latihan (ACWR)</span><b style="color:${lab[1]}">${lab[0]}</b></div><div class="between"><span style="font-size:2rem;font-weight:700" class="num">${dec(r,2)}</span><span class="small muted num">7 hr ${Math.round(a.a)} · rata² 4 mgg ${Math.round(a.c)}</span></div>
   <div style="position:relative;height:12px;border-radius:99px;background:linear-gradient(90deg,var(--z1) 0 40%,var(--good) 40% 65%,var(--warn) 65% 75%,var(--bad) 75%)"><i style="position:absolute;top:-4px;left:${pos}%;width:4px;height:20px;margin-left:-2px;background:var(--ink);border-radius:2px"></i></div>
   <p class="tiny muted">Beban = durasi (menit) × RPE. Zona ideal 0,8–1,3.</p></div>`}
function progressText(m,s){const v=m.val(s);if(m.id==='plan-done')return `${Math.round(v*100)}%`;if(m.id.startsWith('long'))return `${dec(v,1)} / ${dec(m.goal/0.985,1)} km`;return `${dec(v,v%1&&v<100?1:0)} / ${m.goal}`}
function badgeHTML(m,earned){const t=m.tier?'t'+m.tier:'';return `<button class="badge ${earned?'':'locked'}" type="button" ${earned?`data-ms="${m.id}"`:'disabled'} aria-label="${esc(m.title)}${earned?', buat story':''}"><span class="medal ${t}"><b>${esc(m.big)}</b><span>${esc(m.unit)}</span></span><span class="bt">${esc(m.title)}</span>${earned?`<span class="bd">${dShort(new Date(EARNED[m.id]))}</span>`:''}</button>`}
document.addEventListener('click',e=>{
  const ms=e.target.closest('[data-ms]');if(ms){const m=MS.find(z=>z.id===ms.dataset.ms);CELEB=null;openStory({kind:'ms',m,date:EARNED[m.id]});return}
  const pr=e.target.closest('[data-pr]');if(pr){const b=bestsAll(null)[pr.dataset.pr];if(b){CELEB=null;openStory({kind:'pr',key:pr.dataset.pr,sec:b.sec,run:b.run,prev:null})}return}
  const rc=e.target.closest('[data-rec]');if(rc){const [w,id]=rc.dataset.rec.split('|');loadSession(+w,id);return}
  const dn=e.target.closest('[data-done]');if(dn){const dm=doneMap();dm[dn.dataset.done]=1;saveDone();const f=checkMilestones();route();if(f.length)celebrate(f);else toast('Sesi ditandai selesai');return}
});
function loadSession(w,id){const wk=plan().find(x=>x.w===w),s=wk&&wk.sess.find(x=>x.id===id);if(!s)return;
  if(R.st==='run'||R.st==='pause'){toast('Selesaikan rekaman yang sedang berjalan dulu.');location.hash='rekam';return}
  R.plan={title:s.title,eyebrow:`Minggu ${w} · ${HARI[s.dow]}`,segs:s.segs&&has('interval')?s.segs:(s.segs||null),pace:s.pace||null,km:s.km};recReset();location.hash='rekam';renderPlanCard()}
function renderPlanCard(){const c=$('#r-plan-card');if(!R.plan){c.innerHTML=`<h3>Sesi terpandu</h3><p class="small muted">Pilih sesi dari Program (tombol "Rekam") untuk mendapat cue lari-jalan atau target pace saat merekam.</p><div><a class="btn" href="#program">Buka Program</a></div>`;return}
  c.innerHTML=`<div class="between"><h3>Sesi terpandu</h3><button class="btn sm ghost" type="button" id="rp-clear">Lepas sesi</button></div><p><b>${esc(R.plan.title)}</b>${R.plan.km?` · ${dec(R.plan.km,R.plan.km%1?1:0)} km`:''}</p>
   ${R.plan.segs?`<div class="strip" aria-hidden="true">${R.plan.segs.map(g=>`<i class="${g.t==='run'?'r':'w'}" style="flex:${g.sec}"></i>`).join('')}</div><p class="small muted">${R.plan.segs.length} interval · ${Math.round(R.plan.segs.reduce((a,s)=>a+s.sec,0)/60)} mnt. Ada bunyi dan suara setiap ganti lari/jalan.</p>`:''}
   ${R.plan.pace?`<p class="small muted">Target pace ${fmt(R.plan.pace[0])}–${fmt(R.plan.pace[1])}/km. Indikator di atas memberi tahu kalau kamu terlalu cepat atau pelan.</p>`:''}`}
$('#r-follow').addEventListener('click',()=>{const o=MAPS['r-lmap'];if(o){o.follow=true;$('#r-follow').hidden=true;updRecMap(true)}});
$('#r-plan-card').addEventListener('click',e=>{if(e.target.id==='rp-clear'&&R.st!=='run'&&R.st!=='pause'){R.plan=null;recReset();renderPlanCard();renderRec()}});

/* ================= Program ================= */
function rProgram(){const v=$('#v-program'),pl=plan(),dm=doneMap(),wn=weekNow(),L=LEVELS[P.level],vd=P.level!=='pemula'?currentVdot():null;
  let fin=0,tot=0;pl.forEach(w=>w.sess.forEach(s=>{tot++;if(dm[s.id])fin++}));
  const today=iso(new Date());
  v.innerHTML=`<div class="vhead"><div><span class="eyebrow">Program ${L.name}</span><h2 class="disp">${P.level==='pemula'?'Program lari-jalan':`Menuju ${GOALN[P.goal]}`}</h2></div><a class="btn sm" href="#profil">Ubah level</a></div>
  <div class="card stack">
    <div class="row">
      <label class="f" for="pg-goal">Target<select id="pg-goal" class="w-m">${L.goals.map(([k,n])=>`<option value="${k}" ${k===P.goal?'selected':''}>${n}</option>`).join('')}</select></label>
      <div class="f">Hari per minggu<div class="seg" id="pg-days">${L.days.map(d=>`<button type="button" data-d="${d}" aria-pressed="${d==P.days}">${d} hari</button>`).join('')}</div></div>
      <label class="f" for="pg-start">Mulai (Senin)<input id="pg-start" type="date" class="w-m" value="${P.planStart}"></label>
      ${P.level==='pemula'?`<label class="f" for="pg-cond">Kondisi awal<select id="pg-cond" class="w-m"><option value="0" ${P.cond==0?'selected':''}>Baru mulai</option><option value="3" ${P.cond==3?'selected':''}>Kuat lari 5 mnt</option><option value="5" ${P.cond==5?'selected':''}>Kuat lari 10–15 mnt</option></select></label>`:
      `<label class="f" for="pg-base">Km per minggu sekarang<input id="pg-base" type="number" min="5" max="200" class="w-s" value="${P.baseKm}"></label>
       <label class="f" for="pg-rd">Hasil lomba terakhir<select id="pg-rd" class="w-s">${['5','10','21.1','42.2'].map(k=>`<option value="${k}" ${k===P.raceDist?'selected':''}>${GOALN[k]}</option>`).join('')}</select></label>
       <label class="f" for="pg-rt">Waktu<input id="pg-rt" class="w-s" placeholder="28:30" value="${P.raceTime?fmt(P.raceTime):''}"></label>`}
    </div>
    ${vd?`<p class="small muted">Pace target dihitung dari ${esc(vd.src)} · VDOT ${dec(vd.v)}.</p>`:P.level!=='pemula'?`<p class="note"><b>Isi waktu lomba</b> supaya tiap sesi punya target pace.</p>`:''}
  </div>
  <div class="stats"><div class="stat"><span class="k">Durasi</span><span class="v">${pl.length} <small>minggu</small></span><span class="s">${dShort(pd(P.planStart))} – ${dShort(addDays(pd(P.planStart),pl.length*7-1))}</span></div>
   <div class="stat"><span class="k">Sesi selesai</span><span class="v">${fin}<small> / ${tot}</small></span></div>
   <div class="stat"><span class="k">Minggu sekarang</span><span class="v">${wn<1?'–':Math.min(wn,pl.length)}</span><span class="s">${wn<1?'Belum mulai':wn>pl.length?'Selesai':pl[wn-1].focus}</span></div>
   ${P.level!=='pemula'?`<div class="stat"><span class="k">Puncak</span><span class="v">${Math.max(...pl.map(w=>w.km))} <small>km/mgg</small></span></div>`:`<div class="stat"><span class="k">Per minggu</span><span class="v">±${Math.round(pl.reduce((a,w)=>a+w.mins,0)/pl.length)} <small>mnt</small></span></div>`}</div>
  <div class="weeks">${pl.map(w=>{const n=w.sess.filter(s=>dm[s.id]).length,now=w.w===wn;
    return `<details class="week ${now?'now':''}" ${now||(wn<1&&w.w===1)?'open':''}><summary><span class="wk"><small>Mgg</small>${w.w}</span><span class="wsum"><strong>${esc(w.focus)}${w.km?` · ${w.km} km`:` · ${w.mins} mnt`}</strong><span class="small muted">${dShort(addDays(pd(P.planStart),(w.w-1)*7))} – ${dShort(addDays(pd(P.planStart),(w.w-1)*7+6))}</span><div class="bar" style="height:5px"><i style="width:${n/w.sess.length*100}%;background:var(--good)"></i></div></span><span class="prog">${n}/${w.sess.length}</span></summary>
     ${w.sess.map(s=>{const ok=!!dm[s.id],d=sessDate(w.w,s),t=TYPE[s.type];return `<div class="sess ${ok?'done':''} ${iso(d)===today?'today':''}"><input type="checkbox" id="cb-${s.id}" data-sid="${s.id}" ${ok?'checked':''} aria-label="Tandai ${esc(s.title)} selesai">
      <label class="what" for="cb-${s.id}"><span class="t"><span>${HARI[s.dow]}</span><span class="chip c-${t[1]}">${t[0]}</span>${s.km?`<span class="num small muted">${dec(s.km,s.km%1?1:0)} km</span>`:''}${s.pace?`<span class="num small muted">${fmt(s.pace[0])}–${fmt(s.pace[1])}/km</span>`:''}</span><span class="d"><b>${esc(s.title)}</b> <span class="small muted">${esc(s.detail)}</span></span>
      ${s.segs?`<div class="strip" style="height:8px" aria-hidden="true">${s.segs.map(g=>`<i class="${g.t==='run'?'r':'w'}" style="flex:${g.sec}"></i>`).join('')}</div>`:''}</label>
      ${s.type!=='X'?`<button class="btn sm go" type="button" data-rec="${w.w}|${s.id}">Rekam</button>`:''}</div>`}).join('')}</details>`}).join('')}</div>
  ${P.level==='pemula'?`<div class="card stack"><h3>Aturan dasar pelari pemula</h3><div class="stack small">${TIPS.map(t=>`<p>· ${t}</p>`).join('')}</div></div>`:
   `<div class="card stack"><h3>Cara membaca program</h3><div class="stack small"><p><span class="chip c-E">Easy</span> Lari santai, mayoritas volume. Kalau ragu, lebih pelan.</p><p><span class="chip c-Q">Kualitas</span> Tempo, interval, atau marathon pace. Selalu pemanasan 10–15 mnt.</p><p><span class="chip c-L">Long run</span> Bangun daya tahan. Pace easy, fokus waktu di kaki.</p><p>Setiap minggu ke-4 adalah minggu ringan (volume turun ±20%) supaya tubuh sempat beradaptasi.</p></div></div>`}`;
}
document.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.sid){const dm=doneMap();if(t.checked)dm[t.dataset.sid]=1;else delete dm[t.dataset.sid];saveDone();const f=checkMilestones();const open=$$('#v-program .week').map(x=>x.open);rProgram();$$('#v-program .week').forEach((x,i)=>x.open=open[i]);if(f.length)celebrate(f);return}
  const id=t.id;if(!id.startsWith('pg-'))return;
  if(id==='pg-goal')P.goal=t.value;else if(id==='pg-start'&&t.value)P.planStart=iso(monday(pd(t.value)));else if(id==='pg-cond')P.cond=+t.value;
  else if(id==='pg-base')P.baseKm=Math.max(5,+t.value||20);else if(id==='pg-rd')P.raceDist=t.value;
  else if(id==='pg-rt'){const s=parseTime(t.value);P.raceTime=s&&s>300?s:null}
  saveP();rProgram()});
document.addEventListener('click',e=>{const b=e.target.closest('#pg-days button');if(!b)return;P.days=+b.dataset.d;saveP();rProgram()});

/* ================= Riwayat ================= */
function rRiwayat(){const v=$('#v-riwayat'),W=weekBuckets(12),cur=W[11],prev=W[10],s=stats(),list=RUNS.slice().reverse(),bests=bestsAll(null);
  const tot=RUNS.reduce((a,r)=>a+r.sec,0);
  v.innerHTML=`<div class="vhead"><div><span class="eyebrow">Riwayat</span><h2 class="disp">Semua larimu</h2></div><div class="row"><button class="btn sm" type="button" id="rw-add">Tambah manual</button><label class="btn sm" for="r-gpx">Impor GPX</label></div></div>
  <form class="card stack" id="rw-form" hidden><h3>Tambah lari manual</h3><p class="small muted">Untuk treadmill atau lari yang tidak direkam.</p>
    <div class="row"><label class="f" for="mf-date">Tanggal<input id="mf-date" type="date" class="w-m" value="${iso(new Date())}" required></label><label class="f" for="mf-hour">Jam mulai<input id="mf-hour" type="time" class="w-s" value="06:00"></label>
    <label class="f" for="mf-km">Jarak (km)<input id="mf-km" type="number" min="0.1" step="0.01" class="w-s" required placeholder="5.00"></label><label class="f" for="mf-time">Durasi<input id="mf-time" class="w-s" required placeholder="32:10"></label>
    <label class="f" for="mf-elev">Elevasi (m)<input id="mf-elev" type="number" min="0" class="w-s" placeholder="0"></label>
    <label class="f" for="mf-rpe">RPE<select id="mf-rpe" class="w-m">${[2,3,4,5,6,7,8,9,10].map(x=>`<option value="${x}" ${x===4?'selected':''}>${x} · ${RPE[x]}</option>`).join('')}</select></label>
    <label class="f" for="mf-note" style="flex:1 1 180px">Catatan<input id="mf-note" placeholder="Treadmill, incline 1%"></label></div>
    <div class="row"><button class="btn pri" type="submit">Simpan</button><button class="btn ghost" type="button" id="mf-cancel">Batal</button></div></form>
  <div class="stats">
    <div class="stat"><span class="k">Minggu ini</span><span class="v">${dec(cur.km)} <small>km</small></span><span class="s">${prev.km>0?`${cur.km>=prev.km?'+':''}${Math.round((cur.km-prev.km)/prev.km*100)}% vs minggu lalu`:`${cur.n} lari`}</span></div>
    ${has('tenpct')?tenpctTile(cur.km,prev.km):''}
    <div class="stat"><span class="k">Rata-rata pace</span><span class="v">${s.km?fmtPace(tot/s.km):'–:––'} <small>/km</small></span><span class="s">semua lari</span></div>
    <div class="stat"><span class="k">Total waktu</span><span class="v">${Math.floor(tot/3600)} <small>jam</small> ${Math.round(tot%3600/60)} <small>mnt</small></span><span class="s">${s.runs} lari</span></div>
  </div>
  <div class="card stack"><div class="between"><h3>Km per minggu</h3><span class="small muted">12 minggu terakhir</span></div>${weekChart(W)}</div>
  <div class="cols">
   <div class="card stack"><div class="between"><h3>Rekor terbaik</h3><span class="tiny muted">ketuk untuk story</span></div>${BEST.some(b=>bests[b[0]])?`<div class="tbl"><table><tbody>${BEST.filter(b=>bests[b[0]]).map(b=>{const x=bests[b[0]];return `<tr class="click" data-pr="${b[0]}"><td><b>${b[1]}</b></td><td class="r num"><b>${fmt(x.sec)}</b></td><td class="r small muted">${fmtPace(x.sec/(b[2]/1000))}/km</td><td class="r small muted">${dShort(pd(x.run.date))}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="small muted">Rekor 1K, 5K, 10K, half, dan full marathon terdeteksi otomatis dari lari yang direkam GPS atau diimpor.</p>'}</div>
   ${has('load')?acwrCard(acwr()):''}
   ${has('intensity')?intensityCard():''}
  </div>
  <div class="stack"><h3>Daftar lari</h3>${list.length?`<div class="runs">${list.map(runRow).join('')}</div>`:`<div class="card empty"><p>Belum ada lari tercatat.</p><p class="small">Rekam lari pertamamu, impor GPX, atau tambah manual.</p><a class="btn pri" href="#rekam">Mulai rekam</a></div>`}</div>
  <div class="card stack"><h3>Data kamu</h3><p class="small muted">Semua data hanya tersimpan di browser HP ini, tanpa server. Simpan cadangan secara berkala, terutama sebelum ganti HP atau hapus data browser.</p>
   <div class="row"><button class="btn sm" type="button" id="bk-out">Simpan cadangan (.json)</button><label class="btn sm" for="bk-in">Pulihkan dari cadangan</label><input type="file" id="bk-in" accept=".json,application/json" hidden></div></div>`;
}
function runRow(r){const d=pd(r.date);return `<a class="runrow" href="#lari-${r.id}"><span class="dt"><b>${d.getDate()}</b><span>${BULAN[d.getMonth()]}</span></span><span class="mid"><span class="t">${esc(runName(r))}${r.src==='gpx'?'<span class="chip c-X">GPX</span>':r.src==='manual'?'<span class="chip c-X">manual</span>':''}${Object.keys(r.bests||{}).length?'':''}</span><span class="small muted num">${fmt(r.sec)} · ${fmtPace(r.sec/r.km)}/km${r.elev?` · ${r.elev} m naik`:''} · RPE ${r.rpe}</span></span><span class="km num">${dec(r.km,2)}<small>km</small></span></a>`}
function runName(r){const d=pd(r.date);if(r.date.length<=10)return `Lari ${HARI[dowOf(d)]}`;const h=d.getHours();return `Lari ${h<5?'dini hari':h<11?'pagi':h<15?'siang':h<18?'sore':'malam'}`}
function weekChart(W){const cap=has('tenpct')&&W[10].km>0?W[10].km*1.1:0;const w=720,h=230,pl=36,pb=28,pt=18;const max=Math.max(5,Math.ceil(Math.max(...W.map(x=>x.km),cap)/5)*5);
  const bw=(w-pl-8)/W.length,y=v=>pt+(h-pt-pb)*(1-v/max);let g='';
  for(let i=0;i<=4;i++){const v=max/4*i;g+=`<line x1="${pl}" x2="${w-4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl-8}" y="${y(v)+4}" text-anchor="end">${Math.round(v)}</text>`}
  W.forEach((x,i)=>{const bx=pl+i*bw+bw*.2,bww=bw*.6,p=i?W[i-1].km:0,over=has('tenpct')&&p>0&&x.km>p*1.1,last=i===W.length-1;
    const col=over?'var(--warn)':last?'var(--cobalt)':'var(--z1)';
    if(x.km>0)g+=`<rect x="${bx}" y="${y(x.km)}" width="${bww}" height="${Math.max(1,y(0)-y(x.km))}" rx="4" fill="${col}"><title>${dec(x.km)} km, ${x.n} lari</title></rect>${last||x.km===Math.max(...W.map(z=>z.km))?`<text x="${bx+bww/2}" y="${y(x.km)-6}" text-anchor="middle" style="fill:var(--ink);font-weight:700">${dec(x.km)}</text>`:''}`;
    if(i%2===1||last)g+=`<text x="${bx+bww/2}" y="${h-8}" text-anchor="middle">${last?'Ini':dShort(x.mon)}</text>`});
  if(cap)g+=`<line x1="${pl+11*bw+2}" x2="${pl+12*bw-2}" y1="${y(cap)}" y2="${y(cap)}" stroke="var(--warn)" stroke-width="2.5" stroke-dasharray="5 4"/>`;
  return `<div class="tbl"><svg viewBox="0 0 ${w} ${h}" width="100%" style="min-width:460px;display:block" role="img" aria-label="Km per minggu, 12 minggu terakhir">${g}</svg></div>${has('tenpct')?'<p class="tiny muted">Oranye: naik lebih dari 10% dari minggu sebelumnya. Garis putus-putus: batas aman minggu ini.</p>':''}`}
function intensityCard(){const it=intensity();if(it.pct==null)return `<div class="card stack"><span class="eyebrow">Distribusi 80/20</span><p class="small muted">Belum ada lari dalam 4 minggu terakhir.</p></div>`;
  const ok=it.pct>=75;return `<div class="card stack"><div class="between"><span class="eyebrow">Distribusi 80/20 · 4 minggu</span><b style="color:${ok?'var(--good)':'var(--warn)'}">${ok?'Sudah pas':'Terlalu banyak yang berat'}</b></div>
   <div style="display:flex;height:14px;border-radius:99px;overflow:hidden"><i style="width:${it.pct}%;background:var(--mint)"></i><i style="flex:1;background:var(--hot)"></i></div>
   <div class="between small"><span><b class="num">${Math.round(it.pct)}%</b> santai (RPE ≤5)</span><span><b class="num">${Math.round(100-it.pct)}%</b> berat</span></div>
   <p class="tiny muted">Target: sekitar 80% waktu lari di intensitas santai.</p></div>`}
document.addEventListener('click',e=>{const id=e.target.id;
  if(id==='rw-add'){$('#rw-form').hidden=false;$('#mf-km').focus()}
  else if(id==='mf-cancel'){$('#rw-form').hidden=true}
  else if(id==='bk-out'){const data=JSON.stringify({app:'cupuberlari',v:2,exported:new Date().toISOString(),profile:P,runs:RUNS,done:DONE,earned:EARNED,pref:PREF});saveBlob(new Blob([data],{type:'application/json'}),`cupuberlari-cadangan-${iso(new Date())}.json`)}
});
document.addEventListener('submit',e=>{if(e.target.id!=='rw-form')return;e.preventDefault();const km=+$('#mf-km').value,sec=parseTime($('#mf-time').value);if(!(km>0)||!sec){toast('Isi jarak dan durasi (contoh 32:10).');return}
  const hr=$('#mf-hour').value;saveRun({src:'manual',date:hr?new Date(`${$('#mf-date').value}T${hr}:00`).toISOString():$('#mf-date').value,km,sec,elev:+$('#mf-elev').value||0,rpe:+$('#mf-rpe').value,note:$('#mf-note').value.trim(),splits:[],track:null})});
document.addEventListener('change',async e=>{if(e.target.id!=='bk-in')return;const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const d=JSON.parse(await f.text());if((d.app!=='langkah'&&d.app!=='cupuberlari')||!Array.isArray(d.runs))throw 0;P=d.profile||P;RUNS=d.runs;DONE=d.done||{};EARNED=d.earned||{};PREF=Object.assign(PREF,d.pref||{});
    saveP();saveRuns();saveDone();saveEarned();LS.set('lk-pref',PREF);PLAN_SIG='';toast(`Cadangan dipulihkan: ${RUNS.length} lari.`);route()}catch(err){toast('File ini bukan cadangan cupuberlari.')}});

/* ================= detail lari ================= */
function rLari(id){const v=$('#v-lari'),r=RUNS.find(x=>x.id===id);if(!r){v.innerHTML=`<div class="card empty"><p>Lari tidak ditemukan.</p><a class="btn" href="#riwayat">Ke riwayat</a></div>`;return}
  const d=pd(r.date),kcal=P.weight?Math.round(P.weight*r.km*1.036):null;const bests=Object.keys(r.bests||{});const all=bestsAll(null);
  v.innerHTML=`<div class="vhead"><div><span class="eyebrow">${HARI[dowOf(d)]}, ${dLong(d)}${r.date.length>10?` · ${pad(d.getHours())}.${pad(d.getMinutes())}`:''}</span><h2 class="disp">${esc(runName(r))}</h2></div><div class="row"><button class="btn sun" type="button" id="ld-story">Bagikan ke Story</button><a class="btn ghost" href="#riwayat">Kembali</a></div></div>
  <div class="stats"><div class="stat"><span class="k">Jarak</span><span class="v">${dec(r.km,2)} <small>km</small></span></div><div class="stat"><span class="k">Waktu</span><span class="v">${fmt(r.sec)}</span></div>
   <div class="stat"><span class="k">Pace</span><span class="v">${fmtPace(r.sec/r.km)} <small>/km</small></span></div><div class="stat"><span class="k">Elevasi naik</span><span class="v">${r.elev||0} <small>m</small></span></div>
   <div class="stat"><span class="k">Kecepatan</span><span class="v">${dec(r.km/(r.sec/3600))} <small>km/j</small></span></div><div class="stat"><span class="k">${kcal?'Kalori (perkiraan)':'Rasa berat'}</span><span class="v">${kcal?`${kcal} <small>kkal</small>`:`${r.rpe} <small>RPE</small>`}</span></div></div>
  ${bests.length?`<div class="card stack"><h3>Usaha terbaik di lari ini</h3><div class="row">${BEST.filter(b=>r.bests[b[0]]).map(b=>{const isPR=all[b[0]]&&all[b[0]].run.id===r.id;return `<button class="btn ${isPR?'sun':''}" type="button" ${isPR?`data-pr="${b[0]}"`:'disabled'}>${b[1]} <b class="num">${fmt(r.bests[b[0]])}</b>${isPR?' · rekor':''}</button>`}).join('')}</div></div>`:''}
  <div class="cols">
   ${r.track?`<div class="card stack"><h3>Rute</h3><div class="mapbox"><div class="lmap" id="ld-lmap" style="height:300px"></div><canvas class="route" id="ld-map" style="height:300px" hidden></canvas></div><p class="mapnote tiny muted" hidden></p></div>`:''}
   ${r.splits&&r.splits.length?`<div class="card stack"><h3>Split per km</h3><div class="splits">${splitsHTML(r.splits)}</div>${r.km%1>0.05?`<p class="tiny muted">Sisa ${dec((r.km%1)*1000,0)} m di akhir tidak dihitung sebagai split.</p>`:''}</div>`:''}
  </div>
  ${r.track&&r.track.some(p=>p[2]!=null)?`<div class="card stack"><div class="between"><h3>Profil elevasi</h3><span class="small muted">+${r.elev||0} m</span></div>${elevChart(r.track)}</div>`:''}
  <div class="card stack"><h3>Catatan</h3><div class="row"><label class="f" for="ld-rpe">RPE<select id="ld-rpe" class="w-m" data-run="${r.id}">${[1,2,3,4,5,6,7,8,9,10].map(x=>`<option value="${x}" ${x===r.rpe?'selected':''}>${x} · ${RPE[x]}</option>`).join('')}</select></label>
   <label class="f" for="ld-note" style="flex:1 1 220px">Catatan<input id="ld-note" data-run="${r.id}" value="${esc(r.note)}"></label></div>
   <div class="row"><button class="btn ghost sm" type="button" id="ld-del">Hapus lari ini</button><span id="ld-conf" hidden class="small">Hapus permanen? <button class="btn sm hot" type="button" id="ld-del2" data-run="${r.id}">Ya, hapus</button> <button class="btn sm" type="button" id="ld-keep">Batal</button></span></div></div>`;
  if(r.track)requestAnimationFrame(()=>detailMap(r));
  $('#ld-story').onclick=()=>{CELEB=null;openStory({kind:'run',run:r})}}
function elevChart(tr){const cum=cumOf(tr),pts=tr.map((p,i)=>[cum[i],p[2]]).filter(p=>p[1]!=null);if(pts.length<2)return '';const w=720,h=160,pl=40,pb=24,pt=10;
  const mx=cum[cum.length-1]||1,e0=Math.min(...pts.map(p=>p[1])),e1=Math.max(...pts.map(p=>p[1])),lo=Math.floor(e0-2),hi=Math.ceil(e1+2);
  const X=d=>pl+(w-pl-8)*d/mx,Y=e=>pt+(h-pt-pb)*(1-(e-lo)/(hi-lo||1));
  const line=pts.map((p,i)=>`${i?'L':'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
  let g=`<path d="${line}L${X(pts[pts.length-1][0])},${Y(lo)}L${X(pts[0][0])},${Y(lo)}Z" fill="var(--cobalt-soft)"/><path d="${line}" fill="none" stroke="var(--cobalt)" stroke-width="2"/>`;
  [lo,hi].forEach(e=>g+=`<text x="${pl-6}" y="${Y(e)+4}" text-anchor="end">${e} m</text>`);
  for(let k=0;k<=mx/1000;k+=Math.max(1,Math.ceil(mx/1000/6)))g+=`<text x="${X(k*1000)}" y="${h-6}" text-anchor="middle">${k} km</text>`;
  return `<div class="tbl"><svg viewBox="0 0 ${w} ${h}" width="100%" style="min-width:420px;display:block" role="img" aria-label="Profil elevasi">${g}</svg></div>`}
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset.run)return;const r=RUNS.find(x=>x.id===t.dataset.run);if(!r)return;if(t.id==='ld-rpe')r.rpe=+t.value;if(t.id==='ld-note')r.note=t.value.trim();touchRun(r);saveRuns();syncSoon();toast('Tersimpan')});
document.addEventListener('click',e=>{const id=e.target.id;if(id==='ld-del')$('#ld-conf').hidden=false;else if(id==='ld-keep')$('#ld-conf').hidden=true;
  else if(id==='ld-del2'){tombRun(e.target.dataset.run);RUNS=RUNS.filter(x=>x.id!==e.target.dataset.run);saveRuns();syncSoon();toast('Lari dihapus');location.hash='riwayat'}});

/* ================= Alat ================= */
const ZN=[[.5,.6,'Pemulihan','Pemanasan, pendinginan, jalan cepat','Sangat ringan'],[.6,.7,'Aerobik dasar','Easy run dan long run','Bisa ngobrol kalimat utuh'],[.7,.8,'Tempo','Lari agak cepat, steady','Hanya beberapa kata'],[.8,.9,'Ambang','Tempo dan interval panjang','Napas berat'],[.9,1,'Maksimal','Interval pendek, sprint','Tidak bisa bicara']];
const zoneRange=i=>{const mx=maxHR(),hrr=mx-P.restHR;return `${Math.round(P.restHR+hrr*ZN[i][0])}–${Math.round(P.restHR+hrr*ZN[i][1])}`};
let PC={km:5,sec:30*60},SPL={goal:P?P.goal:'10',sec:null,strat:'neg'};
function rAlat(){const v=$('#v-alat'),off=FEATS.filter(f=>!has(f[0])&&['vdot','zones','split','interval'].includes(f[0]));
  v.innerHTML=`<div class="vhead"><div><span class="eyebrow">Alat</span><h2 class="disp">Hitung, rencanakan, latih</h2></div></div>
  <div class="card stack" id="t-pace"></div>
  ${has('vdot')?`<div class="card stack" id="t-vdot"></div>`:''}
  ${has('zones')?`<div class="card stack" id="t-zone"></div>`:''}
  ${has('split')?`<div class="card stack" id="t-split"></div>`:''}
  ${has('interval')?`<div class="card stack"><h3>Interval buatan sendiri</h3><p class="small muted">Dipakai di halaman Rekam dengan cue suara. Otomatis ditambah pemanasan dan pendinginan jalan 5 menit.</p>
    <div class="row"><label class="f" for="iv-run">Lari (detik)<input id="iv-run" type="number" min="10" step="10" value="60" class="w-s"></label><label class="f" for="iv-walk">Jalan (detik)<input id="iv-walk" type="number" min="0" step="10" value="90" class="w-s"></label><label class="f" for="iv-reps">Ulangan<input id="iv-reps" type="number" min="1" max="40" value="8" class="w-s"></label><button class="btn pri" type="button" id="iv-go">Pakai di Rekam</button></div></div>`:''}
  ${off.length?`<p class="small muted">Alat lain (${off.map(f=>f[1]).join(', ')}) bisa diaktifkan di <a href="#profil">Profil</a>.</p>`:''}`;
  rPaceTool();if(has('vdot'))rVdotTool();if(has('zones'))rZoneTool();if(has('split'))rSplitTool()}
function rPaceTool(){const el=$('#t-pace');if(!el)return;const p=PC.sec/PC.km;
  el.innerHTML=`<h3>Kalkulator pace</h3><div class="row"><label class="f" for="pc-km">Jarak (km)<input id="pc-km" type="number" min="0.1" step="0.01" class="w-s" value="${PC.km}"></label>
   <div class="row" style="gap:6px">${[['5','5K'],['10','10K'],['21.0975','HM'],['42.195','FM']].map(([k,n])=>`<button class="btn sm" type="button" data-pkm="${k}">${n}</button>`).join('')}</div>
   <label class="f" for="pc-t">Waktu<input id="pc-t" class="w-m" value="${fmt(PC.sec)}" placeholder="30:00"></label><label class="f" for="pc-p">atau pace /km<input id="pc-p" class="w-s" value="${fmtPace(p)}" placeholder="6:00"></label></div>
   <div class="stats"><div class="stat"><span class="k">Pace</span><span class="v">${fmtPace(p)} <small>/km</small></span></div><div class="stat"><span class="k">Kecepatan</span><span class="v">${dec(PC.km/(PC.sec/3600))} <small>km/j</small></span></div><div class="stat"><span class="k">Per 400 m</span><span class="v">${fmt(p*.4)}</span></div><div class="stat"><span class="k">Treadmill</span><span class="v">${dec(3600/p)} <small>km/j</small></span></div></div>
   ${P.level==='pemula'?`<p class="small muted">Pace easy yang disarankan dari angka ini: <b class="num" style="color:var(--ink)">${fmt(p+60)}–${fmt(p+90)}/km</b> (kalau ini hasil lari terbaikmu).</p>`:''}`}
function rVdotTool(){const el=$('#t-vdot');const vd=currentVdot();if(!vd){el.innerHTML=`<h3>VDOT & pace latihan</h3><p class="small muted">Isi hasil lomba di Program, atau rekam lari 5K ke atas, untuk menghitung VDOT.</p><div><a class="btn" href="#program">Isi hasil lomba</a></div>`;return}
  const p=paces(vd.v);el.innerHTML=`<div class="between"><h3>VDOT & pace latihan</h3><span class="chip c-Q">VDOT ${dec(vd.v)}</span></div><p class="small muted">Dari ${esc(vd.src)}. Perkiraan berdasarkan rumus Daniels.</p>
  <div class="cols"><div class="tbl"><table><thead><tr><th>Jenis</th><th class="r">Pace /km</th><th class="r">Per 400 m</th></tr></thead><tbody>
   <tr><td><span class="chip c-E">E</span> Easy</td><td class="r"><b>${fmt(p.E[0])}–${fmt(p.E[1])}</b></td><td class="r">${fmt(p.E[0]*.4)}–${fmt(p.E[1]*.4)}</td></tr>
   <tr><td><span class="chip c-L">M</span> Marathon</td><td class="r"><b>${fmt(p.M)}</b></td><td class="r">${fmt(p.M*.4)}</td></tr>
   <tr><td><span class="chip c-Q">T</span> Tempo</td><td class="r"><b>${fmt(p.T)}</b></td><td class="r">${fmt(p.T*.4)}</td></tr>
   <tr><td><span class="chip c-Q">I</span> Interval</td><td class="r"><b>${fmt(p.I)}</b></td><td class="r">${fmt(p.I*.4)}</td></tr>
   <tr><td><span class="chip c-R">R</span> Repetisi</td><td class="r"><b>${fmt(p.R)}</b></td><td class="r">${fmt(p.R*.4)}</td></tr></tbody></table></div>
  <div class="tbl"><table><thead><tr><th>Prediksi lomba</th><th class="r">Waktu</th><th class="r">Pace</th></tr></thead><tbody>${[['5','5K'],['10','10K'],['21.1','Half marathon'],['42.2','Marathon']].map(([k,n])=>{const t=predict(vd.v,GOALM[k]);return `<tr><td>${n}</td><td class="r"><b>${fmt(t)}</b></td><td class="r">${fmt(t/(GOALM[k]/1000))}</td></tr>`}).join('')}</tbody></table></div></div>`}
function rZoneTool(){const el=$('#t-zone'),mx=maxHR(),hrr=mx-P.restHR;
  el.innerHTML=`<div class="between"><h3>Zona detak jantung</h3><span class="small muted num">Maks ${mx} · istirahat ${P.restHR} bpm</span></div>
  <div class="row"><label class="f" for="zt-age">Umur<input id="zt-age" type="number" min="12" max="90" class="w-s" value="${P.age}"></label><label class="f" for="zt-rest">Detak istirahat<input id="zt-rest" type="number" min="35" max="110" class="w-s" value="${P.restHR}"></label><label class="f" for="zt-max">Detak maks (opsional)<input id="zt-max" type="number" min="120" max="230" class="w-s" value="${P.maxHR||''}" placeholder="${Math.round(208-.7*P.age)}"></label></div>
  <div class="zones">${ZN.map((z,i)=>`<div class="zone-r ${i===1?'hl':''}"><div class="zt" style="background:var(--z${i+1})">Z${i+1}</div><div class="zb"><div class="top"><b>${z[2]}</b><span class="bpm">${Math.round(P.restHR+hrr*z[0])}–${Math.round(P.restHR+hrr*z[1])} <span class="small muted">bpm</span></span></div><span class="small">${z[3]} · <span class="muted">${z[4]}</span></span></div></div>`).join('')}</div>
  <p class="tiny muted">Metode Karvonen. Detak maks dari rumus Tanaka (208 − 0,7 × umur) kalau tidak diisi.${P.level==='pemula'?' Untuk pemula, ±80% waktu latihan sebaiknya di zona 2.':''}</p>`}
function rSplitTool(){const el=$('#t-split');const D=GOALM[SPL.goal]||10000;const vd=currentVdot();if(SPL.sec==null)SPL.sec=vd?Math.round(predict(vd.v,D)):Math.round(D/1000*330);
  const n=Math.ceil(D/1000),avg=SPL.sec/(D/1000),f={even:0,neg:.02,pos:-.015}[SPL.strat];let cum=0;const rows=[];
  for(let i=0;i<n;i++){const segKm=Math.min(1,D/1000-i),pos=n>1?i/(n-1):0;const pace=avg*(1+f*(0.5-pos)*2);const t=pace*segKm;cum+=t;rows.push([i+1,segKm,pace,cum])}
  const fix=SPL.sec/cum;rows.forEach(r=>{r[2]*=fix;r[3]*=fix});
  el.innerHTML=`<h3>Perencana split</h3><div class="row"><label class="f" for="sp-goal">Lomba<select id="sp-goal" class="w-m">${['5','10','21.1','42.2'].map(k=>`<option value="${k}" ${k===SPL.goal?'selected':''}>${GOALN[k]}</option>`).join('')}</select></label>
   <label class="f" for="sp-t">Target waktu<input id="sp-t" class="w-m" value="${fmt(SPL.sec)}"></label>
   <div class="f">Strategi<div class="seg" id="sp-strat">${[['even','Rata'],['neg','Negative split'],['pos','Mulai cepat']].map(([k,n])=>`<button type="button" data-s="${k}" aria-pressed="${k===SPL.strat}">${n}</button>`).join('')}</div></div></div>
   <p class="small muted">Pace rata-rata <b class="num" style="color:var(--ink)">${fmtPace(avg)}/km</b>.${SPL.strat==='neg'?' Paruh kedua sedikit lebih cepat, strategi paling aman untuk sebagian besar pelari.':''}</p>
   <div class="tbl" style="max-height:360px;overflow:auto"><table><thead><tr><th>Km</th><th class="r">Pace</th><th class="r">Waktu tempuh</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[1]<1?dec(D/1000,D%1000?1:0):r[0]}</td><td class="r">${fmt(r[2])}</td><td class="r"><b>${fmt(r[3])}</b></td></tr>`).join('')}</tbody></table></div>`}
document.addEventListener('input',e=>{const id=e.target.id;
  if(id==='pc-km'){const v=+e.target.value;if(v>0){PC.km=v;refreshPace(['pc-km'])}}
  else if(id==='pc-t'){const s=parseTime(e.target.value);if(s>0){PC.sec=s;refreshPace(['pc-t'])}}
  else if(id==='pc-p'){const s=parseTime(e.target.value);if(s>60){PC.sec=s*PC.km;refreshPace(['pc-p'])}}});
function refreshPace(keep){const a=document.activeElement,id=a&&a.id,pos=a&&a.selectionStart;rPaceTool();if(id){const n=$('#'+id);if(n&&keep.includes(id)){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}}}
document.addEventListener('change',e=>{const id=e.target.id;
  if(id==='zt-age'||id==='zt-rest'||id==='zt-max'){if(id==='zt-age')P.age=+e.target.value||25;if(id==='zt-rest')P.restHR=+e.target.value||70;if(id==='zt-max')P.maxHR=+e.target.value||null;saveP();rZoneTool()}
  else if(id==='sp-goal'){SPL.goal=e.target.value;SPL.sec=null;rSplitTool()}else if(id==='sp-t'){const s=parseTime(e.target.value);if(s)SPL.sec=s;rSplitTool()}});
document.addEventListener('click',e=>{const k=e.target.closest('[data-pkm]');if(k){const p=PC.sec/PC.km;PC.km=+k.dataset.pkm;PC.sec=p*PC.km;rPaceTool();return}
  const s=e.target.closest('#sp-strat button');if(s){SPL.strat=s.dataset.s;rSplitTool();return}
  if(e.target.id==='iv-go'){const r=Math.max(10,+$('#iv-run').value||60),w=Math.max(0,+$('#iv-walk').value||0),n=Math.min(40,Math.max(1,+$('#iv-reps').value||1));
    if(R.st==='run'||R.st==='pause'){toast('Selesaikan rekaman yang sedang berjalan dulu.');return}
    R.plan={title:`Interval ${dur(r)} / ${dur(w)} × ${n}`,eyebrow:'Interval buatan sendiri',segs:segsOf(r,w,n),pace:null};recReset();location.hash='rekam';renderPlanCard()}});

/* ================= Pencapaian ================= */
function rPencapaian(){const v=$('#v-pencapaian'),s=stats(),bests=bestsAll(null);const earned=MS.filter(m=>EARNED[m.id]),locked=MS.filter(m=>!EARNED[m.id]);
  v.innerHTML=`<div class="vhead"><div><span class="eyebrow">Pencapaian</span><h2 class="disp">${earned.length} dari ${MS.length} milestone</h2></div></div>
  <p class="muted">Ketuk milestone yang sudah didapat untuk membuat gambar Instagram Story.</p>
  ${BEST.some(b=>bests[b[0]])?`<div class="card stack"><h3>Rekor pribadi</h3><div class="badges">${BEST.filter(b=>bests[b[0]]).map(b=>`<button class="badge" type="button" data-pr="${b[0]}"><span class="medal t1"><b style="font-size:1.35rem">${fmt(bests[b[0]].sec)}</b><span>${b[1]}</span></span><span class="bt">Rekor ${b[1]}</span><span class="bd">${dShort(pd(bests[b[0]].run.date))}</span></button>`).join('')}</div></div>`:''}
  ${earned.length?`<div class="stack"><h3>Sudah didapat</h3><div class="badges">${earned.sort((a,b)=>EARNED[b.id].localeCompare(EARNED[a.id])).map(m=>badgeHTML(m,true)).join('')}</div></div>`:`<div class="card empty"><p>Belum ada milestone. Lari pertamamu langsung membuka satu.</p><a class="btn pri" href="#rekam">Mulai rekam</a></div>`}
  <div class="stack"><h3>Berikutnya</h3><div class="badges">${locked.map(m=>{const p=Math.min(1,m.val(s)/m.goal);return `<div class="badge locked"><span class="medal"><b>${esc(m.big)}</b><span>${esc(m.unit)}</span></span><span class="bt">${esc(m.title)}</span><span class="bd num">${progressText(m,s)}</span><span class="bar"><i style="width:${p*100}%"></i></span></div>`}).join('')}</div></div>`}

/* ================= Profil ================= */
function rProfil(){const v=$('#v-profil');
  v.innerHTML=`<div class="vhead"><div><span class="eyebrow">Profil</span><h2 class="disp">${esc(P.name||'Pelari')}</h2></div></div>
  <div class="card stack"><h3>Level</h3><p class="small muted">Ganti level kapan saja. Program, fitur, dan target konsistensi menyesuaikan. Catatan lari tidak berubah.</p>
    <div class="lvls" id="pf-lvl">${Object.entries(LEVELS).map(([k,L])=>lvlCard(k,L,k===P.level)).join('')}</div></div>
  ${acctCard()}
  ${NATIVE?'':`<div class="card stack"><h3>Aplikasi Android</h3><p class="small muted">GPS tetap merekam walau layar mati. Masuk dengan akun yang sama supaya datanya tersambung dengan website ini.</p><div class="row"><a class="btn" href="${APK_URL}" download>Unduh APK terbaru</a><button class="btn ghost sm" type="button" id="lp-again">Lihat halaman pilihan akses</button></div></div>`}
  <div class="card stack"><h3>Data diri</h3><div class="row">
    <label class="f" for="pf-name" style="flex:1 1 180px">Nama panggilan<input id="pf-name" value="${esc(P.name)}" maxlength="24"></label>
    <label class="f" for="pf-age">Umur<input id="pf-age" type="number" min="12" max="90" class="w-s" value="${P.age}"></label>
    <label class="f" for="pf-rest">Detak istirahat<input id="pf-rest" type="number" min="35" max="110" class="w-s" value="${P.restHR}"></label>
    <label class="f" for="pf-max">Detak maks<input id="pf-max" type="number" min="120" max="230" class="w-s" value="${P.maxHR||''}" placeholder="otomatis"></label>
    <label class="f" for="pf-w">Berat (kg)<input id="pf-w" type="number" min="25" max="200" class="w-s" value="${P.weight||''}" placeholder="opsional"></label></div></div>
  <div class="card stack"><div class="between"><h3>Fitur yang tampil</h3><button class="btn sm ghost" type="button" id="pf-reset">Kembalikan ke bawaan ${LEVELS[P.level].name}</button></div>
    <div>${FEATS.map(([id,n,d])=>`<label class="feat" for="ft-${id}"><input type="checkbox" id="ft-${id}" data-feat="${id}" ${has(id)?'checked':''}><span><b>${n}${LEVELS[P.level].feats.includes(id)?' <span class="chip c-Q">bawaan</span>':''}</b><span class="small muted">${d}</span></span></label>`).join('')}</div></div>
  <div class="card stack"><h3>Saat merekam</h3>
    <label class="feat" for="pf-sound"><input type="checkbox" id="pf-sound" ${PREF.sound?'checked':''}><span><b>Bunyi dan suara</b><span class="small muted">Bip, getar, dan suara berbahasa Indonesia.</span></span></label>
    <label class="feat" for="pf-auto"><input type="checkbox" id="pf-auto" ${PREF.autoPause?'checked':''}><span><b>Jeda otomatis</b><span class="small muted">Waktu berhenti dihitung saat kamu diam lebih dari 12 detik (misalnya lampu merah).</span></span></label></div>
  <div class="card stack"><h3>Reset data</h3><p class="small muted">Simpan cadangan dulu di halaman Riwayat kalau ragu. Semua reset tidak bisa dibatalkan.</p>
    <div>
      <div class="feat" style="grid-template-columns:1fr auto;align-items:center"><span><b>Ulang program dari minggu 1</b><span class="small muted">Progres sesi dihapus dan program mulai lagi minggu depan. Catatan lari dan pencapaian tetap.</span></span><button class="btn sm" type="button" data-reset="prog">Ulang</button></div>
      <div class="feat" style="grid-template-columns:1fr auto;align-items:center"><span><b>Hapus data di perangkat ini</b><span class="small muted">Profil, lari, dan pencapaian dihapus dari ${NATIVE?'aplikasi':'browser'} ini${SB_USER?' dan kamu keluar dari akun. Data di akun tetap aman, masuk lagi untuk mengembalikannya':''}.</span></span><button class="btn sm" type="button" data-reset="device">Hapus</button></div>
      ${SB_USER?`<div class="feat" style="grid-template-columns:1fr auto;align-items:center"><span><b>Hapus semua, termasuk di akun</b><span class="small muted">Menghapus data di server sehingga hilang dari aplikasi <i>dan</i> website. Akun login tetap ada.</span></span><button class="btn sm hot" type="button" data-reset="all">Hapus semua</button></div>`:''}
    </div>
    <p class="small" id="rs-conf" hidden></p></div>`}
function lvlCard(k,L,on){return `<button class="lvl" type="button" data-lvl="${k}" aria-pressed="${on}"><span class="ln"><i>${LVN[k]}</i>${L.name}</span><span class="tg">${L.tag}</span><ul>${L.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></button>`}
function setLevel(k){if(P.level===k)return;setTimeout(updHead);const L=LEVELS[k];P.level=k;P.features=[...L.feats];if(!L.goals.some(g=>g[0]===P.goal))P.goal=L.goals[Math.min(1,L.goals.length-1)][0];if(!L.days.includes(+P.days))P.days=L.days[0];
  if(k!=='pemula'&&!P.raceTime){P.raceDist=k==='pro'?'10':'5';P.raceTime=k==='pro'?46*60:29*60}saveP();PLAN_SIG='';toast(`Level diganti ke ${L.name}. Program dan fitur disesuaikan.`)}
document.addEventListener('click',e=>{const l=e.target.closest('#pf-lvl [data-lvl]');if(l){setLevel(l.dataset.lvl);rProfil();return}
  const id=e.target.id;if(id==='pf-reset'){P.features=[...LEVELS[P.level].feats];saveP();rProfil();toast('Fitur dikembalikan ke bawaan')}
});
const RESET_TXT={prog:'Program diulang dari minggu 1 mulai Senin depan.',device:'Semua data di perangkat ini akan dihapus.',all:'Semua data di akun dan di semua perangkat akan dihapus permanen.'};
function wipeLocal(){['lk-profile','lk-runs','lk-done','lk-earned','lk-pref','lk-earned-init','lk-tomb','lk-pull-cursor','lk-pushed-at','lk-sync-linked','lk-sync-last','lk-state-u','la-log','la-cfg','la-done'].forEach(LS.del);P=null;RUNS=[];DONE={};EARNED={};PLAN_SIG='';OB={step:0,d:null};location.hash='';route()}
document.addEventListener('click',async e=>{const r=e.target.closest('[data-reset]');if(r){const c=$('#rs-conf');c.hidden=false;c.innerHTML=`${RESET_TXT[r.dataset.reset]} <button class="btn sm hot" type="button" id="rs-yes" data-act="${r.dataset.reset}">Ya, lanjutkan</button> <button class="btn sm" type="button" id="rs-no">Batal</button>`;return}
  if(e.target.id==='rs-no'){$('#rs-conf').hidden=true;return}
  if(e.target.id!=='rs-yes')return;const act=e.target.dataset.act;e.target.disabled=true;
  if(act==='prog'){const t=new Date(),m=monday(t);P.planStart=iso(addDays(m,7));saveP();PLAN_SIG='';toast(`Program diulang. Minggu 1 mulai ${dShort(pd(P.planStart))}.`);rProfil();return}
  if(act==='device'){if(SB&&SB_USER){try{await SB.auth.signOut()}catch(err){}SB_USER=null}wipeLocal();toast('Data di perangkat ini dihapus.');return}
  if(act==='all'){const sb=sbInit();if(!sb||!SB_USER){toast('Masuk ke akun dulu.');return}
    try{const uid=SB_USER.id,now=Date.now(),ts=new Date(now).toISOString();
      const {data:ids,error:e0}=await sb.from('lk_runs').select('id').eq('user_id',uid).eq('deleted',false);if(e0)throw e0;
      const all=[...new Set([...(ids||[]).map(x=>x.id),...RUNS.map(r=>r.id)])];
      for(let i=0;i<all.length;i+=100){const {error}=await sb.from('lk_runs').upsert(all.slice(i,i+100).map(id=>({user_id:uid,id,data:null,deleted:true,updated_at:ts})),{onConflict:'user_id,id'});if(error)throw error}
      const b=await sb.from('lk_state').upsert({user_id:uid,profile:null,profile_u:now,done:{__reset:now},earned:{},updated_at:ts},{onConflict:'user_id'});if(b.error)throw b.error;LS.set('lk-reset-seen',now);
      await sb.auth.signOut();SB_USER=null;wipeLocal();toast('Semua data di akun dan perangkat ini sudah dihapus.')}
    catch(err){e.target.disabled=false;toast('Gagal menghapus data di server: '+((err&&err.message)||err)+'. Data di perangkat belum diubah.')}}});
document.addEventListener('change',e=>{const t=e.target,id=t.id;
  if(t.dataset.feat){const f=t.dataset.feat;P.features=t.checked?[...new Set([...P.features,f])]:P.features.filter(x=>x!==f);saveP();return}
  if(id==='pf-sound'){PREF.sound=t.checked;LS.set('lk-pref',PREF)}else if(id==='pf-auto'){PREF.autoPause=t.checked;LS.set('lk-pref',PREF)}
  else if(id==='pf-name'){P.name=t.value.trim();saveP();updHead()}
  else if(id==='pf-age'){P.age=+t.value||25;saveP()}else if(id==='pf-rest'){P.restHR=+t.value||70;saveP()}else if(id==='pf-max'){P.maxHR=+t.value||null;saveP()}else if(id==='pf-w'){P.weight=+t.value||null;saveP()}});

/* ================= Landing: web atau aplikasi ================= */
const APK_URL='https://github.com/jadilebihfit/running-tracker/releases/latest/download/cupuberlari.apk';
const APK_PAGE='https://github.com/jadilebihfit/running-tracker/releases/latest';
function showLP(){VIEWS.forEach(x=>$('#v-'+x).hidden=true);$('#onb').hidden=true;const o=$('#lp');o.hidden=false;
  const ic={web:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    app:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
    dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    go:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    sync:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3"/><path d="M4 4v4h4M20 20v-4h-4"/></svg>'};
  o.innerHTML=`<div class="lpw">
   <header class="lp-head"><span class="lp-logo">C</span><span class="wm">cupuberlari<i></i></span></header>
   <section class="lp-hero"><span class="eyebrow">Running tracker</span><h1>Lari bareng <em>cupuberlari.</em></h1>
     <p>Program latihan, rekam GPS, rekor otomatis, dan story milestone. Pilih mau pakai lewat mana.</p></section>
   <div class="lp-opts">
     <button class="lp-opt" type="button" id="lp-web"><span class="lp-ic">${ic.web}</span><span class="lp-t"><b>Pakai di website</b><span>Langsung jalan di browser HP atau laptop. Tanpa install.</span></span><span class="lp-go">${ic.go}</span></button>
     <a class="lp-opt main" href="${APK_URL}" id="lp-app" download><span class="lp-ic">${ic.app}</span><span class="lp-t"><b>Unduh aplikasi Android</b><span>GPS tetap merekam walau layar mati. File APK ±5 MB.</span></span><span class="lp-go">${ic.dl}</span></a>
   </div>
   <div class="lp-sync"><span class="lp-ic">${ic.sync}</span><div><b>Data kamu tersambung antara aplikasi dan website</b><p>Masuk dengan akun yang sama di keduanya (Profil → Akun &amp; sinkron), maka lari, program, dan pencapaian otomatis sama. Tanpa akun, data hanya tersimpan di perangkat yang sedang dipakai.</p></div></div>
   <p class="lp-foot">Aplikasi belum ada di Play Store. Setelah unduh, buka file APK dan izinkan "Instal dari sumber tidak dikenal" kalau diminta. Pengguna iPhone: pakai website, lalu Share → Add to Home Screen. <a href="${APK_PAGE}" target="_blank" rel="noopener">Semua versi APK</a></p>
  </div>`}
document.addEventListener('click',e=>{if(e.target.id==='lp-again'){LS.del('lk-lp');route();return}if(e.target.closest('#lp-web')){LS.set('lk-lp',true);route()}else if(e.target.closest('#lp-app')){LS.set('lk-lp',true);toast('Mengunduh cupuberlari.apk…')}});

/* ================= Onboarding ================= */
let OB={step:0,d:null};
function showOnb(){VIEWS.forEach(x=>$('#v-'+x).hidden=true);const o=$('#onb');o.hidden=false;if(!OB.d)OB.d=defaultProfile('pemula');rOnb()}
function rOnb(){const o=$('#onb'),d=OB.d,L=LEVELS[d.level];const steps=`<div class="steps" aria-hidden="true">${[0,1,2].map(i=>`<i class="${i<=OB.step?'on':''}"></i>`).join('')}</div>`;
  if(OB.step===0)o.innerHTML=`<div class="onb">${steps}<span class="wm" style="font-size:2rem">cupuberlari<i></i></span><h1>Lari yang <em>pas</em> buat levelmu.</h1>
    <p class="muted" style="font-size:1.08rem;max-width:56ch">Program latihan, rekam GPS, target pace, rekor otomatis, dan milestone yang bisa kamu pamerin di Instagram Story. Semua data tersimpan di HP-mu sendiri, tanpa akun dan tanpa server.</p>
    <label class="f" for="ob-name" style="max-width:360px">Nama panggilan<input id="ob-name" value="${esc(d.name)}" placeholder="mis. Raka" maxlength="24" autocomplete="nickname"></label>
    <div class="row"><button class="btn pri big" type="button" id="ob-next">Lanjut</button><button class="btn" type="button" id="ob-login">Sudah punya akun? Masuk</button>${(RUNS.length||LS.get('la-log',null))?'':`<label class="btn ghost" for="bk-in">Pulihkan cadangan</label><input type="file" id="bk-in" accept=".json,application/json" hidden>`}</div></div>`;
  else if(OB.step===1)o.innerHTML=`<div class="onb">${steps}<h1>Seberapa jauh perjalanan larimu?</h1><p class="muted">Bisa diganti kapan saja di Profil.</p>
    <div class="lvls" id="ob-lvl">${Object.entries(LEVELS).map(([k,x])=>lvlCard(k,x,k===d.level)).join('')}</div>
    <div class="row"><button class="btn pri big" type="button" id="ob-next">Lanjut sebagai ${L.name}</button><button class="btn ghost" type="button" id="ob-back">Kembali</button></div></div>`;
  else o.innerHTML=`<div class="onb">${steps}<h1>Sedikit tentang kamu.</h1><p class="muted">Dipakai untuk menyusun program dan menghitung zona detak jantung.</p>
    <div class="card stack"><div class="row">
      <label class="f" for="ob-age">Umur<input id="ob-age" type="number" min="12" max="90" class="w-s" value="${d.age}"></label>
      <label class="f" for="ob-rest">Detak istirahat (bpm)<input id="ob-rest" type="number" min="35" max="110" class="w-s" value="${d.restHR}"></label>
      <label class="f" for="ob-w">Berat (kg, opsional)<input id="ob-w" type="number" min="25" max="200" class="w-s" placeholder="–"></label></div>
      <p class="tiny muted">Tidak tahu detak istirahat? Biarkan 70. Ukur besok pagi sebelum bangun dari kasur, lalu ubah di Profil.</p></div>
    <div class="card stack"><div class="row">
      <label class="f" for="ob-goal">Target<select id="ob-goal" class="w-m">${L.goals.map(([k,n])=>`<option value="${k}" ${k===d.goal?'selected':''}>${n}</option>`).join('')}</select></label>
      <label class="f" for="ob-days">Hari lari per minggu<select id="ob-days" class="w-s">${L.days.map(x=>`<option ${x==d.days?'selected':''}>${x}</option>`).join('')}</select></label>
      ${d.level==='pemula'?`<label class="f" for="ob-cond">Kondisi sekarang<select id="ob-cond" class="w-m"><option value="0">Baru mulai</option><option value="3">Kuat lari 5 mnt nonstop</option><option value="5">Kuat lari 10–15 mnt</option></select></label>`:
      `<label class="f" for="ob-base">Km per minggu sekarang<input id="ob-base" type="number" min="5" max="200" class="w-s" value="${d.baseKm}"></label>
       <label class="f" for="ob-rd">Lomba / time trial terakhir<select id="ob-rd" class="w-s">${['5','10','21.1','42.2'].map(k=>`<option value="${k}" ${k===d.raceDist?'selected':''}>${GOALN[k]}</option>`).join('')}</select></label>
       <label class="f" for="ob-rt">Waktunya<input id="ob-rt" class="w-s" value="${fmt(d.raceTime)}" placeholder="28:30"></label>`}
    </div>${d.level!=='pemula'?'<p class="tiny muted">Waktu lomba dipakai untuk menghitung pace latihan (VDOT). Perkiraan kasar juga tidak apa-apa.</p>':''}</div>
    <div class="row"><button class="btn pri big" type="button" id="ob-fin">Mulai program</button><button class="btn ghost" type="button" id="ob-back">Kembali</button></div></div>`;
}
$('#onb').addEventListener('click',e=>{const d=OB.d;const l=e.target.closest('[data-lvl]');if(l){const nm=d.name;OB.d=defaultProfile(l.dataset.lvl);OB.d.name=nm;rOnb();return}
  const id=e.target.id;
  if(id==='ob-login'){P=defaultProfile('pemula');P.onboarded=true;P._u=0;LS.set('lk-profile',P);PLAN_SIG='';$('#onb').hidden=true;location.hash='profil';route();toast('Masuk ke akunmu di bagian Akun & sinkron.');return}
  if(id==='ob-next'){if(OB.step===0)d.name=$('#ob-name').value.trim();OB.step++;rOnb();window.scrollTo(0,0)}
  else if(id==='ob-back'){OB.step--;rOnb()}
  else if(id==='ob-fin'){d.age=+$('#ob-age').value||25;d.restHR=+$('#ob-rest').value||70;d.weight=+$('#ob-w').value||null;d.goal=$('#ob-goal').value;d.days=+$('#ob-days').value;
    if(d.level==='pemula')d.cond=+$('#ob-cond').value;else{d.baseKm=+$('#ob-base').value||20;d.raceDist=$('#ob-rd').value;const s=parseTime($('#ob-rt').value);d.raceTime=s&&s>300?s:null}
    d.onboarded=true;P=d;saveP();PLAN_SIG='';LS.set('lk-earned-init',true);checkMilestones();$('#onb').hidden=true;location.hash='beranda';route();toast(`Program ${GOALN[P.goal]} mulai ${dShort(pd(P.planStart))}`)}});
$('#onb').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='ob-name'){e.preventDefault();$('#ob-next').click()}});

/* ================= mulai ================= */
if(P&&P.onboarded&&!P.features)P.features=[...LEVELS[P.level].feats];
renderPlanCard();route();renderRec();sbInit();
window.addEventListener('beforeunload',e=>{if(R.st==='run'||R.st==='pause'){e.preventDefault();e.returnValue=''}});
})();
