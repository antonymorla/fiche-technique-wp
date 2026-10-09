/*!
 * Moteur de dessin du générateur de plan Cerisier (plan de masse, élévations, cotes, menuiseries).
 * Partagé par l'outil interne (/fiche-technique-interne) et les configurateurs du site.
 * Réglages : ST.cfg (objet { 'f-lar': '450', ... }) s'il est fourni, sinon les champs de la page (outil interne).
 */
window.CerPlan=(function(){
const ST={type:'abri',menus:[],ext:{},cfg:null};
// Côtés fermés d'un carport : codes de l'outil interne (gd, gdf…) ou liste « gauche+fond » d'un configurateur
function closList(){ const v=fv('f-clos'); const L=({aucune:[],gd:['gauche','droite'],gdf:['gauche','droite','fond']})[v]; return L||v.split('+').filter(s=>['gauche','droite','fond'].includes(s)); }
function fv(id){ if(ST.cfg&&Object.prototype.hasOwnProperty.call(ST.cfg,id)) return String(ST.cfg[id]); const e=document.getElementById(id); return e?e.value:''; }

const WALL_T={madrier28:0.027,madrier45:0.045,ossature:0.135}; // 27mm, 45mm, 135mm
// Carport : entrait / sablière de 16 cm sur les poteaux, rive (bandeau) de 26 cm qui cache le bac acier
const CP_ENTRAIT=0.16, CP_RIVE=0.26;
// Sous-face vue d'en dessous : choisie dans le configurateur (f-sousface), sinon déduite de la couverture
function sousFace(){
  const s=fv('f-sousface'); if(s) return s;
  const c=fv('f-couv')||'bac';
  return /^(shingle|tuile)/.test(c)?'planchette':c==='epdm'?'osb':'non';
}

// ════════════════════════════════════════════════════════
// CALC DIMS
// ════════════════════════════════════════════════════════
const r2=v=>Math.round(v*100)/100;
// Saisie en cm (sur mesure au centimètre) → mètres
function readCm(id,def){
  const v=parseFloat(String(fv(id)).replace(',','.'));
  return (isNaN(v)||v<50)?def:Math.round(v)/100;
}
function calcDims(){
  const L  =readCm('f-lar',5);
  const P  =readCm('f-pro',4);
  const ados=ST.type==='carport'?fv('f-ados'):'non';
  const reh=parseInt(fv('f-reh'))||0;
  const sys=fv('f-sys');
  const toit=fv('f-toit');
  const pente=parseInt(fv('f-pente'))||18;
  const orient=fv('f-orient');
  const isFlat=toit==='TOIT_PLAT'||toit==='QUADRO';
  const isQuadro=toit==='QUADRO';
  const hasGout=fv('f-gout')==='oui';

  // User extra overhangs (cm → m)
  const uf=(parseFloat(fv('f-df'))||0)/100;
  const ub=(parseFloat(fv('f-db'))||0)/100;
  const ul=(parseFloat(fv('f-dl'))||0)/100;
  const ur=(parseFloat(fv('f-dr'))||0)/100;

  // ── DÉBORDS STANDARDS (dépend du type + toiture) ──
  let stdOvhgF, stdOvhgB, stdOvhgL, stdOvhgR;
  if(ST.type==='carport'){
    // Carport : 20 cm tout le tour (1pan, 2pans, toit plat), 0 côté mur si adossé
    stdOvhgF=0.20; stdOvhgB=0.20;
    stdOvhgL=ados==='gauche'?0:0.20; stdOvhgR=ados==='droite'?0:0.20;
  } else if(isQuadro){
    // QUADRO : 0 cm débord
    stdOvhgF=0; stdOvhgB=0; stdOvhgL=0; stdOvhgR=0;
  } else if(isFlat){
    // Toit plat (abri/garage) : 10 cm tout le tour, 20 cm si gouttière (pour intégration)
    const tp=hasGout?0.20:0.10;
    stdOvhgF=tp; stdOvhgB=tp; stdOvhgL=tp; stdOvhgR=tp;
  } else {
    // 2 pans / 1 pan (abri/garage) : 20 cm côtés (G/D), 20 cm face, 10 cm arrière
    stdOvhgF=0.20; stdOvhgB=0.10; stdOvhgL=0.20; stdOvhgR=0.20;
  }
  const stdOvhg=stdOvhgF; // pour compatibilité (valeur de référence)

  // Total overhang = standard + user extra
  const ovF=stdOvhgF+uf, ovB=stdOvhgB+ub, ovL=stdOvhgL+ul, ovR=stdOvhgR+ur;

  // ── ÉPAISSEUR MURS ──
  let wt=0;
  if(ST.type==='carport'){wt=parseFloat(fv('f-pot'))||0.12;}
  else{wt=WALL_T[sys]||0.027;}

  // ── DIMENSIONS EXTÉRIEURES (madrier toit plat : -17 cm) ──
  let Lext=L, Pext=P;
  if(ST.type==='carport'){
    // Carport (règle du configurateur du site) : la dimension choisie est le
    // hors tout de la toiture ; poteaux = hors tout − débords standards
    Lext=r2(L-stdOvhgL-stdOvhgR); Pext=r2(P-stdOvhgF-stdOvhgB);
  } else if(isFlat && sys!=='ossature'){
    // Madrier toit plat : retirer 17 cm sur chaque dimension
    Lext=r2(L-0.17); Pext=r2(P-0.17);
  }

  // ── DIMENSIONS INTÉRIEURES ──
  let intL, intP;
  if(ST.type==='carport'){
    // Entre poteaux ; adossé : une seule rangée de poteaux en largeur
    intL=r2(Lext-wt*(ados==='non'?2:1));
    intP=r2(Pext-wt*2);
  } else if(isQuadro && sys==='ossature'){
    // QUADRO ossature : -11 cm de chaque côté = -22 cm en tout
    intL=Math.round((Lext-0.22)*100)/100;
    intP=Math.round((Pext-0.22)*100)/100;
  } else {
    intL=Math.round((Lext-wt*2)*100)/100;
    intP=Math.round((Pext-wt*2)*100)/100;
  }

  // ── HAUTEUR INTÉRIEURE (sous ferme/sablière) ──
  let hInt;
  if(ST.type==='carport'){
    hInt=2.10; // carport : 2,10 m sous ferme
  } else if(isQuadro){
    hInt=ST.type==='garage'?2.20:2.10; // QUADRO : 2,10 abri / 2,20 garage
  } else if(sys==='ossature'){
    hInt=ST.type==='garage'?2.26:2.00; // Ossature : 2,00 abri / 2,26 garage
  } else {
    // Madrier : 13,5 planches côté = 188,5 cm pour abri, 215 cm pour garage
    hInt=ST.type==='garage'?2.15:1.885;
  }
  hInt+=reh*0.13; // rehausses

  // ── HAUTEUR EXTÉRIEURE (hors tout murs) ──
  const hExt=ST.type==='carport'?hInt:hInt+wt*0.5;

  // ── HAUTEUR FAÎTAGE ──
  const penteRad=pente*Math.PI/180;
  let rH=0;
  if(isFlat && ST.type==='carport'){
    // Carport toit plat / QUADRO : bandeau de 36 cm au-dessus de la ferme
    // (2,10 m sous ferme → 2,46 m haut bandeau, rehausses comprises)
    rH=0.36;
  } else if(isQuadro){
    // QUADRO : hauteur hors tout fixe (2,50 abri / 2,60 garage)
    if(ST.type==='garage') rH=2.60-hExt;
    else rH=2.50-hExt;
    if(rH<0) rH=0;
  } else if(toit==='2PANS'){
    rH=(L/2)*Math.tan(penteRad);
  } else if(toit==='1PAN'){
    if(orient==='droite'||orient==='gauche') rH=L*Math.tan(penteRad);
    else rH=P*Math.tan(penteRad);
  }

  // ── HORS TOUT ──
  const htL=r2(Lext+ovL+ovR), htP=r2(Pext+ovF+ovB);

  // ── POTEAUX CARPORT (même calcul que le configurateur du site) ──
  // nCols = poteaux par rangée (en largeur), nRows = rangées (en profondeur)
  let nPosts=0, nCols=0, nRows=0;
  if(ST.type==='carport'){
    const esp=parseInt(fv('f-esp'))||4, espLc=parseInt(fv('f-espL'))||0;
    const espL=((espLc||esp)===6||toit==='1PAN'||toit==='2PANS')?6:4;
    nCols=Math.ceil(L/espL)+(ados==='non'?1:0);
    nRows=Math.ceil(P/esp)+1;
    nPosts=nCols*nRows;
  }

  // Soubassement parpaing (abri, garage) : surélève le bâtiment d'environ 20 cm (description du site)
  const soub=(ST.type!=='carport'&&fv('f-soub')==='oui')?0.20:0;
  const D={L:Lext,P:Pext,Lnom:L,Pnom:P,reh,sys,toit,pente,orient,wt,hInt,hExt,rH,soub,
          ovF,ovB,ovL,ovR,stdOvhg,stdOvhgF,stdOvhgB,stdOvhgL,stdOvhgR,uf,ub,ul,ur,
          htL,htP,intL,intP,nPosts,nCols,nRows,ados,penteRad,isFlat,isQuadro,hasGout};
  // Configurateur de vente : les cotes affichées et dessinées sont celles du site (ST.site), le reste vient du calcul ci-dessus
  if(ST.site){
    const s=ST.site;
    ['L','P','intL','intP','htL','htP','hInt','nPosts','nCols','nRows'].forEach(k=>{ if(s[k]!=null&&!isNaN(s[k])) D[k]=s[k]; });
    if(s.hInt!=null) D.hExt=ST.type==='carport'?D.hInt:D.hInt+D.wt*0.5;
    if(s.ov){ ['F','B','L','R'].forEach(k=>{ if(s.ov[k]!=null) D['ov'+k]=s.ov[k]; }); D.stdOvhg=D.ovF; }
  }
  // Carport à pentes : la ferme repose sur l'entrait au droit des poteaux bas, la rive passe au-dessus ;
  // faîtage = haut de la rive côté haut, débord compris (pente réelle conservée)
  if(ST.type==='carport'&&(toit==='1PAN'||toit==='2PANS')){
    const tg=Math.tan(penteRad), base=CP_ENTRAIT+CP_RIVE;
    if(toit==='2PANS') D.rH=base+(D.L/2)*tg;
    else if(orient==='droite'||orient==='gauche') D.rH=base+(D.L+(orient==='droite'?D.ovL:D.ovR))*tg;
    else D.rH=base+(D.P+(orient==='fond'?D.ovF:D.ovB))*tg;
  }
  return D;
}

// ════════════════════════════════════════════════════════
// SVG HELPERS
// ════════════════════════════════════════════════════════
const NS='http://www.w3.org/2000/svg';
function svgEl(tag,attrs){const e=document.createElementNS(NS,tag);Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,v));return e;}
function clr(svg){while(svg.firstChild)svg.removeChild(svg.firstChild);}

function sRect(p,x,y,w,h,fill,stroke,sw,dash){
  const r=svgEl('rect',{x,y,width:w,height:h,fill:fill||'none',stroke:stroke||'none','stroke-width':sw||1});
  if(dash)r.setAttribute('stroke-dasharray',dash);p.appendChild(r);return r;
}
function sLine(p,x1,y1,x2,y2,stroke,sw,dash){
  const l=svgEl('line',{x1,y1,x2,y2,stroke:stroke||'#000','stroke-width':sw||1});
  if(dash)l.setAttribute('stroke-dasharray',dash);p.appendChild(l);
}
function sPoly(p,pts,fill,stroke,sw,dash){
  const e=svgEl('polygon',{points:pts.map(([x,y])=>`${x},${y}`).join(' '),fill:fill||'none',stroke:stroke||'#000','stroke-width':sw||1});
  if(dash)e.setAttribute('stroke-dasharray',dash);p.appendChild(e);
}
function sPath(p,d,stroke,sw,fill,dash){
  const e=svgEl('path',{d,stroke:stroke||'#000','stroke-width':sw||1,fill:fill||'none'});
  if(dash)e.setAttribute('stroke-dasharray',dash);p.appendChild(e);
}
function sTxt(p,x,y,s,sz=10,fill='#333',anchor='middle',weight=''){
  const t=svgEl('text',{x,y,'font-family':'Arial,sans-serif','font-size':sz,fill,
    'text-anchor':anchor,'dominant-baseline':'central'});
  if(weight)t.setAttribute('font-weight',weight);t.textContent=s;p.appendChild(t);
}
function sTxtBg(p,x,y,s,sz=10,fill='#333'){
  const w=s.length*sz*0.55+6;
  sRect(p,x-w/2,y-sz*0.65,w,sz*1.3,'white','none',0);
  sTxt(p,x,y,s,sz,fill);
}

function sArrow(p,x1,y1,x2,y2,col='#3d3d28',sz=5){
  const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);
  if(len<1)return;
  const ux=dx/len,uy=dy/len;
  const ax=x1+ux*sz,ay=y1+uy*sz;
  sPoly(p,[[x1,y1],[ax-uy*sz*.35,ay+ux*sz*.35],[ax+uy*sz*.35,ay-ux*sz*.35]],col,'none',0);
}

/* dimension line: from (x1,y1) to (x2,y2), offset perpendicular by `off` px */
function dimL(p,x1,y1,x2,y2,label,off=28,col='#3d3d28'){
  const dx=x2-x1,dy=y2-y1,isH=Math.abs(dx)>Math.abs(dy);
  const ox=isH?0:off, oy=isH?off:0;
  const lx1=x1+ox,ly1=y1+oy,lx2=x2+ox,ly2=y2+oy;
  const mx=(lx1+lx2)/2,my=(ly1+ly2)/2;
  // extension lines
  sLine(p,x1,y1,lx1,ly1,col,.6,'3 2');
  sLine(p,x2,y2,lx2,ly2,col,.6,'3 2');
  // main line
  sLine(p,lx1,ly1,lx2,ly2,col,1.2);
  sArrow(p,lx1,ly1,lx2,ly2,col,5);
  sArrow(p,lx2,ly2,lx1,ly1,col,5);
  // label
  if(isH){
    // Horizontal dim: label BELOW the line (offset positive = below ground)
    const labelY=my+8;
    sTxtBg(p,mx,labelY,label,8,col);
  } else {
    // Vertical dim: label rotated, positioned AWAY from the wall
    // off>0 → dim is RIGHT of wall → text further RIGHT
    // off<0 → dim is LEFT of wall → text further LEFT
    const lx=mx+(ox>0?9:-9);
    const sz=8;
    const w=label.length*sz*0.55+6;
    sRect(p,lx-sz*0.7,my-w/2,sz*1.4,w,'white','none',0);
    const t=svgEl('text',{x:lx,y:my,'font-family':'Arial,sans-serif','font-size':sz,fill:col,
      'text-anchor':'middle','dominant-baseline':'central',
      transform:`rotate(${ox>0?90:-90},${lx},${my})`});
    t.textContent=label; p.appendChild(t);
  }
}

// ════════════════════════════════════════════════════════
// PLAN DE MASSE
// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// RENDU RÉALISTE — textures de bardage, couverture, menuiseries
// Teintes relevées sur les visuels du site abri-cerisier.fr
// ════════════════════════════════════════════════════════
const FINITIONS={
  madrier:     {label:'Madrier épicéa autoclave',          dir:'h', board:0.14,  c:['#c4b886','#8a7f55','#d8ceA2']},
  sr_vert:     {label:'Sapin rouge autoclave vert 21×130', dir:'h', board:0.13,  c:['#bdb07e','#857a50','#d2c799']},
  sr_brun:     {label:'Sapin rouge autoclave brun 21×130', dir:'h', board:0.13,  c:['#9e7642','#664826','#b48c57']},
  ayous125:    {label:'Ayous 21×125',                      dir:'h', board:0.125, c:['#b8916a','#86633f','#caa780']},
  srn_gris:    {label:'SRN 20×70 gris (vertical ajouré)',  dir:'v', boards:[0.07], gap:0.012, c:['#8f9087','#5c5d57','#a8a9a1']},
  douglas_noir:{label:'Douglas noir (vertical)',           dir:'v', boards:[0.14,0.11,0.14,0.12], c:['#45463f','#262722','#5f605b']},
  dibond:      {label:'Dibond (panneaux composite)',       dir:'v', boards:[0.6], gap:0.006, gapC:'#1d1e20', c:['#4a4c50','#35373a','#5c5f63']},
  bac_bandeau: {label:'Bac acier RAL 7016 (bandeau)',      dir:'v', boards:[0.25], c:['#43474b','#25282b','#62676c']},
  sr_vert_v:   {label:'Pin sylvestre vert (vertical)',     dir:'v', boards:[0.13], c:['#bdb07e','#857a50','#d2c799']},
  ayous_alea:  {label:'Ayous 21×45 et 21×90 (vertical)',   dir:'v', boards:[0.09,0.045], alea:true, gap:0.006, gapC:'#2b1a0d', c:['#8a5f34','#5a3b1d','#a2764a']},
};
const COUVERTURES={
  bac:      {label:'Bac acier gris RAL 7016', kind:'bac',     c:['#43474b','#25282b','#62676c']},
  shingle_n:{label:'Shingle noir',            kind:'shingle', c:['#393637','#1f1d1e','#4d4a4b']},
  shingle_b:{label:'Shingle brun',            kind:'shingle', c:['#5e4433','#38281d','#775944']},
  shingle_v:{label:'Shingle vert',            kind:'shingle', c:['#4b5a42','#2c3627','#62735a']},
  tuile_g:  {label:'Tuiles acier gris 7016',  kind:'tuile',   c:['#43474b','#25282b','#62676c']},
  tuile_r:  {label:'Tuiles acier rouge',      kind:'tuile',   c:['#7a271d','#4a1410','#9c4136']},
  epdm:     {label:'EPDM',                    kind:'plat',    c:['#2e2f31','#18191a','#444649']},
};
const isReal=()=>fv('f-rendu')!=='tech';
function wallFin(d){
  if(ST.type!=='carport'&&d.sys!=='ossature') return FINITIONS.madrier;
  return FINITIONS[fv('f-bard')]||FINITIONS.sr_vert;
}
function couvFin(d){
  if(d.isQuadro) return COUVERTURES.epdm;
  return COUVERTURES[fv('f-couv')]||COUVERTURES.bac;
}
// Teintes des cadres relevées sur les vignettes SketchUp du site
const FR_COL={exo:['#8e4b22','#5a2b10','#ad6a3c'],gris:['#9a9b94','#64655f','#b4b5ae'],vert:['#c4b886','#8a7f55','#d8cea2'],
  ayous:['#b07a4e','#7a4f2c','#c8956a'],alu:['#3d4146','#222528','#5a5f65']};
// Teinte d'une menuiserie : cadre imposé par le modèle, sinon d'après le libellé
function menuFin(m,d){
  const P=presetOf(m), l=m.label.toLowerCase();
  if(P.fr) return {c:FR_COL[P.fr],alu:P.fr==='alu'};
  if(/alu|pvc|baie/.test(l)) return {c:FR_COL.alu,alu:true};
  if(/noir/.test(l)) return FINITIONS.douglas_noir;
  if(/gris/.test(l)) return FINITIONS.srn_gris;
  if(/brun/.test(l)) return FINITIONS.sr_brun;
  if(/ayous/.test(l)) return /aléatoire/.test(l)?FINITIONS.ayous_alea:FINITIONS.ayous125;
  if(/ bois$/.test(P.cat||'')) return FINITIONS.sr_vert; // menuiseries bois du site : autoclave vert
  return d?wallFin(d):FINITIONS.sr_vert; // sans teinte précisée : même bois que le bardage
}
// Bardage d'une porte d'ossature : sens des lames (clin horizontal / vertical) et ajouré d'après le libellé
function doorCladding(m,f){
  const l=m.label.toLowerCase(), ajour=/ajour/.test(l);
  if(/horizontal/.test(l)) return Object.assign({},f,{dir:'h',board:f.board||0.13});
  if(f.dir==='v') return ajour&&!f.gap?Object.assign({},f,{gap:0.01}):f;
  return {dir:'v',boards:[f.board||0.13],c:f.c,gap:ajour?0.01:0};
}
function shade(hex,amt){ // amt -1..1
  const n=parseInt(hex.slice(1,7),16); let r=n>>16,g=(n>>8)&255,b=n&255;
  const f=v=>Math.max(0,Math.min(255,Math.round(amt<0?v*(1+amt):v+(255-v)*amt)));
  return '#'+[f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
// Générateur pseudo-aléatoire déterministe (même dessin à chaque rendu)
function rng(seed){let s=(seed>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function texDefs(svg){
  let d=[...svg.children].find(c=>c.tagName==='defs');
  if(!d){d=svgEl('defs',{});svg.insertBefore(d,svg.firstChild);}
  return d;
}
let TEXN=0;
function texPat(svg,attrs,build){
  const id=`${svg.id||'sv'}-tx${++TEXN}`;
  const p=svgEl('pattern',Object.assign({id,patternUnits:'userSpaceOnUse'},attrs));
  build(p); texDefs(svg).appendChild(p);
  return `url(#${id})`;
}
// Lames de bardage / madriers. ox,oy = origine (bas du mur) pour caler les lames sur le sol
function patBoards(svg,f,sc,ox,oy,tone=0){
  const [b0,dk,lt]=f.c.map(c=>shade(c,tone));
  if(f.dir==='h'){
    const bh=Math.max(2.2,f.board*sc), N=3, W=Math.max(90,bh*16), R=rng(Math.round(bh*97)+N);
    return texPat(svg,{width:W,height:bh*N,x:ox,y:oy-bh*N*Math.ceil(1000/(bh*N))},p=>{
      for(let i=0;i<N;i++){
        const y=i*bh, c=shade(b0,(R()-.5)*.10);
        p.appendChild(svgEl('rect',{x:0,y,width:W,height:bh,fill:c}));
        if(bh>5) for(let k=0;k<2;k++){ // veinage
          const gy=y+bh*(.3+.4*R()), a=bh*.18*(R()-.5);
          p.appendChild(svgEl('path',{d:`M0 ${gy} Q ${W*.25} ${gy+a} ${W*.5} ${gy} T ${W} ${gy}`,stroke:dk,'stroke-width':.35,fill:'none',opacity:.35}));
        }
        p.appendChild(svgEl('rect',{x:0,y,width:W,height:Math.max(.35,bh*.09),fill:lt,opacity:.8}));
        p.appendChild(svgEl('rect',{x:0,y:y+bh-Math.max(.55,bh*.13),width:W,height:Math.max(.55,bh*.13),fill:dk}));
        const jx=W*(.15+.7*R()); // raccord de lame
        p.appendChild(svgEl('line',{x1:jx,y1:y,x2:jx,y2:y+bh,stroke:dk,'stroke-width':.5,opacity:.55}));
      }
    });
  }
  // vertical
  // Aléatoire : suite pseudo-aléatoire (toujours la même) de lames de largeurs différentes, teintes plus contrastées
  const Ra=rng(4242), seq=f.alea?Array.from({length:24},()=>f.boards[Math.floor(Ra()*f.boards.length)]):f.boards;
  const ws=seq.map(w=>Math.max(1.6,w*sc)), gap=f.gap?Math.max(.45,f.gap*sc):0, W=ws.reduce((a,b)=>a+b,0)+gap*ws.length;
  const H=Math.max(60,3*sc), R=rng(Math.round(W*31));
  return texPat(svg,{width:W,height:H,x:ox,y:oy},p=>{
    p.appendChild(svgEl('rect',{x:0,y:0,width:W,height:H,fill:gap?(f.gapC||'#1e1f1c'):dk}));
    let x=0;
    ws.forEach(w=>{
      const c=shade(b0,(R()-.5)*(f.alea?.34:.14));
      p.appendChild(svgEl('rect',{x,y:0,width:w,height:H,fill:c}));
      if(w>4){const gx=x+w*(.3+.4*R());p.appendChild(svgEl('line',{x1:gx,y1:0,x2:gx+(R()-.5)*2,y2:H,stroke:dk,'stroke-width':.35,opacity:.35}));}
      p.appendChild(svgEl('rect',{x,y:0,width:Math.max(.3,w*.08),height:H,fill:lt,opacity:.7}));
      if(!gap) p.appendChild(svgEl('rect',{x:x+w-Math.max(.45,w*.08),y:0,width:Math.max(.45,w*.08),height:H,fill:dk}));
      x+=w+gap;
    });
  });
}
// Couverture vue en élévation (pan vu de côté). rowH = pas apparent des rangs
function patCouv(svg,cv,sc,ox,oy,penteRad){
  const [b0,dk,lt]=cv.c, sin=Math.max(.15,Math.sin(penteRad||0.3));
  if(cv.kind==='bac'||cv.kind==='plat'){
    const w=Math.max(3,0.25*sc);
    return texPat(svg,{width:w,height:10,x:ox,y:oy},p=>{
      p.appendChild(svgEl('rect',{x:0,y:0,width:w,height:10,fill:b0}));
      if(cv.kind==='bac'){
        p.appendChild(svgEl('rect',{x:w*.42,y:0,width:Math.max(.6,w*.12),height:10,fill:lt}));
        p.appendChild(svgEl('rect',{x:w*.54,y:0,width:Math.max(.5,w*.07),height:10,fill:dk}));
      }
    });
  }
  if(cv.kind==='shingle'){
    const tw=Math.max(3,0.333*sc), rh=Math.max(1.6,0.143*sc*sin), R=rng(Math.round(tw*13));
    return texPat(svg,{width:tw*2,height:rh*2,x:ox,y:oy},p=>{
      for(let r=0;r<2;r++) for(let i=-1;i<3;i++){
        const x=i*tw+(r?tw/2:0);
        p.appendChild(svgEl('rect',{x,y:r*rh,width:tw,height:rh,fill:shade(b0,(R()-.5)*.18),stroke:dk,'stroke-width':.4}));
      }
    });
  }
  // tuiles acier : ondes
  const tw=Math.max(3,0.185*sc), rh=Math.max(2,0.35*sc*sin);
  return texPat(svg,{width:tw,height:rh,x:ox,y:oy},p=>{
    p.appendChild(svgEl('rect',{x:0,y:0,width:tw,height:rh,fill:b0}));
    p.appendChild(svgEl('path',{d:`M0 ${rh*.15} Q ${tw/2} ${rh*.75} ${tw} ${rh*.15}`,stroke:lt,'stroke-width':Math.max(.5,tw*.08),fill:'none',opacity:.8}));
    p.appendChild(svgEl('rect',{x:0,y:rh-Math.max(.6,rh*.12),width:tw,height:Math.max(.6,rh*.12),fill:dk}));
  });
}
// Sol : bande de gazon sous la ligne de terre
function drawGround(svg,x1,x2,gndY){
  sRect(svg,x1,gndY,x2-x1,5,'#b9cc93','none',0);
  sLine(svg,x1,gndY,x2,gndY,'#7c8f5c',1.5);
}
// Verre : fond bleuté + reflets
function drawGlass(svg,x,y,w,h,frosted){
  sRect(svg,x,y,w,h,frosted?'#e6ecee':'#c9dde6','none',0);
  if(!frosted&&w>4&&h>4){
    const k=Math.min(w,h);
    svg.appendChild(svgEl('line',{x1:x+w*.15,y1:y+h*.55,x2:x+w*.15+k*.4,y2:y+h*.55-k*.4,stroke:'#fff','stroke-width':Math.max(.6,k*.06),opacity:.75}));
    svg.appendChild(svgEl('line',{x1:x+w*.32,y1:y+h*.6,x2:x+w*.32+k*.25,y2:y+h*.6-k*.25,stroke:'#fff','stroke-width':Math.max(.4,k*.035),opacity:.6}));
  }
}
// ── Pièces de menuiserie ──
// Poignée à béquille (argent) ; side = côté de la béquille
function drawHandle(svg,x,y,sc,side){
  const pw=Math.max(.8,0.025*sc), ph=Math.max(2.2,0.14*sc), lw=Math.max(2,0.11*sc);
  sRect(svg,x-pw/2,y,pw,ph,'#b9bdc1','#6f7377',.3);
  sRect(svg,side==='L'?x-lw:x,y+ph*.18,lw,Math.max(.7,0.018*sc),'#d6d9dc','#6f7377',.3);
}
// Paumelles ou pentures (bandes noires) sur le bord ferré d'un vantail
function drawHinges(svg,x,y,h,sc,side,strap){
  const n=strap?3:3;
  for(let i=0;i<n;i++){
    const hy=y+h*(.1+.4*i);
    if(strap){
      const L=Math.max(4,0.32*sc), t=Math.max(.9,0.035*sc);
      sRect(svg,side==='L'?x:x-L,hy,L,t,'#1d1d1d','none',0);
      svg.appendChild(svgEl('circle',{cx:side==='L'?x+L:x-L,cy:hy+t/2,r:t*.8,fill:'#1d1d1d'}));
    } else sRect(svg,side==='L'?x-Math.max(.6,0.012*sc):x,hy,Math.max(.8,0.02*sc),Math.max(1.6,0.09*sc),'#3a3a3a','none',0);
  }
}
// Vitrage à petits bois (cols × rows)
function drawGlassGrid(svg,x,y,w,h,cols,rows,col,sc,frosted){
  drawGlass(svg,x,y,w,h,frosted);
  const t=Math.max(.7,0.025*sc);
  for(let i=1;i<cols;i++) sRect(svg,x+w*i/cols-t/2,y,t,h,col,'none',0);
  for(let j=1;j<rows;j++) sRect(svg,x,y+h*j/rows-t/2,w,t,col,'none',0);
}
// Vantail contemporain à 4 panneaux superposés : les « vit » panneaux du haut vitrés, les autres en lames horizontales
function drawLeafCont(svg,x,y,w,h,f,sc,vit,frosted){
  const [b0,dk]=f.c, st=Math.max(1.4,0.085*sc), rl=Math.max(1.1,0.065*sc);
  sRect(svg,x,y,w,h,shade(b0,-.05),dk,.7);
  const ph=(h-rl*5)/4, pw=w-st*2;
  for(let i=0;i<4;i++){
    const px=x+st, py=y+rl+i*(ph+rl);
    if(i<vit){
      sRect(svg,px,py,pw,ph,shade(dk,.1),'none',0);
      drawGlass(svg,px+Math.max(.5,0.012*sc),py+Math.max(.5,0.012*sc),pw-Math.max(1,0.024*sc),ph-Math.max(1,0.024*sc),frosted);
    } else {
      sRect(svg,px,py,pw,ph,patBoards(svg,{dir:'h',board:Math.max(0.03,ph/sc/3),c:f.c},sc,px,py+ph,-.03),dk,.5);
    }
  }
}
// Zone de coulissement d'une porte coulissante, en abscisses de la vue (px) : [[x0,x1],...]
function slideZonesPx(m,mx,mW){
  if(isDoubleM(m)) return [[mx-mW/2,mx],[mx+mW,mx+mW*1.5]];
  return m.rail==='droite'?[[mx+mW,mx+mW*2]]:[[mx-mW,mx]];
}
// Rail et zone de coulissement (rendu réaliste et technique)
function drawSlide(svg,m,mx,my,mW,mH,sc,real){
  const P=presetOf(m), inside=P.dr==='coulO', zs=slideZonesPx(m,mx,mW);
  const x0=Math.min(mx,...zs.map(z=>z[0])), x1=Math.max(mx+mW,...zs.map(z=>z[1]));
  zs.forEach(([a,b])=>sRect(svg,a,my,b-a,mH,inside?'rgba(52,152,219,.06)':'rgba(230,126,34,.06)',inside?'#3498db':'#e67e22',.8,'4 3'));
  if(inside){
    sLine(svg,x0,my-2,x1,my-2,'#3498db',1,'4 3');
    sTxtBg(svg,(zs[0][0]+zs[0][1])/2,my+mH*.18,'rail intérieur',6,'#3498db');
  } else {
    const rh=Math.max(2.5,0.12*sc), f=menuFin(m);
    if(real) sRect(svg,x0,my-rh,x1-x0,rh,patBoards(svg,{dir:'h',board:0.12,c:f.c},sc,x0,my,-.08),shade(f.c[1],-.2),.8);
    else sRect(svg,x0,my-rh,x1-x0,rh,'#ecf0f1','#555',1);
    sTxtBg(svg,(zs[0][0]+zs[0][1])/2,my+mH*.18,'coulissement',6,'#e67e22');
  }
}
// Menuiserie dessinée (porte, fenêtre, baie, hublot) avec ses options
function drawMenuReal(svg,m,mx,my,mW,mH,sc,d){
  const P=presetOf(m), l=m.label.toLowerCase(), f=menuFin(m,d), [b0,dk,lt]=f.c;
  const fr=Math.max(1.4,0.045*sc); // cadre 4,5 cm
  const frosted=/acidifi/.test(l);
  if(m.opt==='VBF'||m.opt==='VBP'||m.opt==='VDF'||m.opt==='VDP'){ // volets de part et d'autre
    const vw=mW/2;
    [[mx-vw-fr*.5,'L'],[mx+mW+fr*.5,'R']].forEach(([vx])=>{
      sRect(svg,vx,my,vw,mH,b0,dk,.8);
      const n=Math.max(2,Math.round(vw/(0.1*sc)));
      for(let i=1;i<n;i++) sLine(svg,vx+vw*i/n,my,vx+vw*i/n,my+mH,dk,.5);
      sLine(svg,vx,my+mH*.18,vx+vw,my+mH*.18,dk,.9); sLine(svg,vx,my+mH*.82,vx+vw,my+mH*.82,dk,.9);
      sLine(svg,vx,my+mH*.82,vx+vw,my+mH*.18,dk,.9); // écharpe en Z
    });
  }
  if(/hublot/.test(l)){
    const r=mW/2, cx=mx+r, cy=my+r;
    svg.appendChild(svgEl('circle',{cx,cy,r,fill:b0,stroke:dk,'stroke-width':.8}));
    svg.appendChild(svgEl('circle',{cx,cy,r:r-fr*1.2,fill:'#c9dde6',stroke:shade(dk,-.3),'stroke-width':Math.max(.8,0.02*sc)}));
    svg.appendChild(svgEl('line',{x1:cx-r*.35,y1:cy+r*.1,x2:cx+r*.05,y2:cy-r*.3,stroke:'#fff','stroke-width':Math.max(.6,r*.08),opacity:.75}));
    return;
  }
  const isDoor=m.type==='porte';
  sRect(svg,mx,my,mW,mH,f.alu?b0:shade(b0,-.12),dk,.8); // dormant
  const ix=mx+fr, iy=my+fr, iw=mW-fr*2, ih=mH-(isDoor?fr:fr*2);
  // ── Fenêtres et baies ──
  if(!isDoor||/baie/.test(l)){
    const n=P.n&&mW>mH?P.n:1;
    for(let i=0;i<n;i++){
      const px=ix+i*iw/n, pw=iw/n;
      if(P.dr==='croix') drawGlassGrid(svg,px+fr*.4,iy+fr*.4,pw-fr*.8,ih-fr*.8,2,2,shade(b0,-.12),sc,frosted);
      else drawGlass(svg,px+fr*.4,iy+fr*.4,pw-fr*.8,ih-fr*.8,frosted);
      if(i>0) sRect(svg,px-fr*.4,iy,fr*.8,ih,f.alu?b0:shade(b0,-.12),'none',0);
    }
    if(m.opt==='115'){ // jardinière
      const jh=Math.max(2,0.18*sc);
      sRect(svg,mx-fr,my+mH,mW+fr*2,jh,b0,dk,.8);
      for(let i=1;i<3;i++) sLine(svg,mx-fr,my+mH+jh*i/3,mx+mW+fr,my+mH+jh*i/3,dk,.4);
      for(let i=0;i<5;i++) svg.appendChild(svgEl('circle',{cx:mx+mW*(.1+.2*i),cy:my+mH-1,r:Math.max(1.2,jh*.35),fill:i%2?'#6f9a4d':'#89b35f'}));
    }
    return;
  }
  // ── Portes : vantaux ──
  const leaves=P.leaves||(/double/.test(l)?[.5,.5]:(/tierce/.test(l)?[2/3,1/3]:[1]));
  let x=ix;
  leaves.forEach((k,i)=>{
    const w=iw*k, side=leaves.length===1?'R':(i===0?'R':'L'); // côté de la béquille
    const hingeX=side==='R'?x:x+w, hingeSide=side==='R'?'L':'R';
    if(P.dr==='cont'||P.dr==='coul'){
      drawLeafCont(svg,x,iy,w,ih,f,sc,P.vit||0,frosted);
    } else if(P.dr==='coulO'){ // ossature coulissante : cadre et 4 vitrages acidifiés
      const st=Math.max(1.4,0.07*sc), rl=Math.max(1.1,0.05*sc), ph=(ih-rl*5)/4;
      sRect(svg,x,iy,w,ih,b0,dk,.7);
      for(let j=0;j<4;j++) drawGlass(svg,x+st,iy+rl+j*(ph+rl),w-st*2,ph,true);
    } else if(P.dr==='bard'){ // porte d'ossature bardée comme le bardage choisi
      const cl=doorCladding(m,f);
      sRect(svg,x,iy,w,ih,patBoards(svg,cl,sc,x,iy+ih,-.04),'none',0);
      sRect(svg,x+.6,iy+.6,w-1.2,ih-.6,'none','#1b1b1b',Math.max(1,0.022*sc)); // joint périphérique du vantail
    } else if(P.dr==='mort'||P.dr==='courch'||P.dr==='pfdv'){
      const gk=P.dr==='mort'?.5:(P.dr==='courch'?.68:.7), st=Math.max(1.4,0.08*sc), gh=(ih-st*2)*gk;
      sRect(svg,x,iy,w,ih,P.dr==='pfdv'?shade(b0,-.05):b0,dk,.7);
      const gx=x+st, gy=iy+st, gw=w-st*2;
      if(P.dr==='pfdv') drawGlass(svg,gx,gy,gw,gh,frosted);
      else drawGlassGrid(svg,gx,gy,gw,gh,2,P.dr==='mort'?2:3,shade(b0,-.12),sc,frosted);
      const by=gy+gh+st*.7, bh=iy+ih-st-by;
      if(P.dr==='pfdv') sRect(svg,gx,by,gw,bh,shade(b0,-.15),dk,.5);
      else sRect(svg,gx,by,gw,bh,patBoards(svg,{dir:'v',boards:[0.09],c:f.c},sc,gx,by),dk,.5);
    } else if(P.dr==='z'){ // lames verticales et écharpe en Z
      sRect(svg,x,iy,w,ih,patBoards(svg,{dir:'v',boards:[0.1],c:f.c},sc,x,iy),dk,.7);
      sLine(svg,x,iy+ih*.15,x+w,iy+ih*.15,dk,1.2); sLine(svg,x,iy+ih*.85,x+w,iy+ih*.85,dk,1.2);
      sLine(svg,x,iy+ih*.85,x+w,iy+ih*.15,dk,1.2);
    } else { // ALU / PVC : vitrage toute hauteur
      sRect(svg,x,iy,w,ih,b0,dk,.7);
      drawGlass(svg,x+fr*.8,iy+fr*.8,w-fr*1.6,ih-fr*1.6,frosted);
    }
    if(i>0) sLine(svg,x,iy,x,iy+ih,shade(dk,-.35),Math.max(.8,0.012*sc)); // joint entre vantaux
    // ferrage et poignée
    if(P.dr==='z'||P.pent) drawHinges(svg,hingeX,iy,ih,sc,hingeSide,true);
    else if(P.dr!=='coul'&&P.dr!=='coulO') drawHinges(svg,hingeX,iy,ih,sc,hingeSide,false);
    const kx=side==='R'?x+w-Math.max(2,0.06*sc):x+Math.max(2,0.06*sc);
    if(P.dr==='z') svg.appendChild(svgEl('circle',{cx:kx,cy:iy+ih*.52,r:Math.max(.9,0.02*sc),fill:'#1d1d1d'}));
    else if(!(leaves.length===2&&i===1&&P.dr!=='coul')) drawHandle(svg,kx,iy+ih*.5,sc,side==='R'?'L':'R');
    x+=w;
  });
}

// Toiture en rendu réaliste (abri / garage)
function drawRoofReal(svg,d,g,baseX,baseY,drawW,oL,oR,sc){
  const rx=baseX-oL, rw=drawW+oL+oR, roofH=g.rH*sc;
  const fin=wallFin(d), cv=couvFin(d), gndY=baseY+g.wallH*sc;
  const wallPat=patBoards(svg,fin,sc,baseX,gndY);
  const rive=shade(fin.c[0],-.18), t=Math.max(3,0.16*sc), cvw=Math.max(1.4,0.05*sc);
  // Bande de rive + couverture le long d'une ligne de pente (liste de points du bas de rive)
  const riveBand=pts=>{
    const up=pts.map(([x,y])=>[x,y-t]).reverse();
    sPoly(svg,pts.concat(up),rive,shade(rive,-.35),.8);
    const top=pts.map(([x,y])=>`${x},${y-t}`).join(' ');
    svg.appendChild(svgEl('polyline',{points:top,fill:'none',stroke:cv.c[1],'stroke-width':cvw,'stroke-linejoin':'round'}));
  };
  if(g.roofT==='flat'){
    const slabH=Math.max(8,0.39*sc);
    sRect(svg,rx,baseY-slabH,rw,slabH,patBoards(svg,fin,sc,rx,baseY,-.06),shade(rive,-.35),1);
    sRect(svg,rx-1,baseY-slabH-cvw,rw+2,cvw,cv.c[1],'none',0);
    return;
  }
  if(g.roofT==='edge'){ // côté haut d'un 1 pan : seule la rive du toit dépasse du grand mur
    sRect(svg,rx,baseY-t,rw,t,rive,shade(rive,-.35),.8);
    sRect(svg,rx-1,baseY-t-cvw,rw+2,cvw,cv.c[1],'none',0);
    sTxt(svg,rx+rw/2,baseY-t-cvw-5,'faîte (côté haut)',7,'#555');
    return;
  }
  if(g.roofT==='triangle'){
    const ty=baseY-roofH, px=baseX+drawW/2, k=roofH/(drawW/2||1);
    sPoly(svg,[[baseX,baseY],[px,ty],[baseX+drawW,baseY]],wallPat,shade(rive,-.35),1);
    // Pignon d'ossature 2 pans (vignettes du site) : classique = lames horizontales et montant central ;
    // biseauté = lames à 45° en V de part et d'autre du montant. Tous les autres pignons : lames horizontales.
    if(d.sys==='ossature'){
      if(fv('f-pignon')==='biseaute'){
        gableBoards(svg,fin,[[baseX,baseY],[px,ty],[px,baseY]],[1,1],sc);
        gableBoards(svg,fin,[[px,baseY],[px,ty],[baseX+drawW,baseY]],[1,-1],sc);
      }
      sRect(svg,px-Math.max(1,0.045*sc),ty,Math.max(2,0.09*sc),baseY-ty,shade(fin.c[0],-.06),shade(rive,-.35),.5); // montant central
      sPoly(svg,[[baseX,baseY],[px,ty],[baseX+drawW,baseY]],'none',shade(rive,-.35),1);
    }
    riveBand([[rx,baseY+k*oL],[px,ty],[rx+rw,baseY+k*oR]]);
    sTxtBg(svg,px,baseY-roofH*.3,`${d.pente}°`,8,'#555');
    return;
  }
  if(g.roofT==='trapL'||g.roofT==='trapR'){
    const ty=baseY-roofH, k=roofH/(drawW||1), L=g.roofT==='trapL';
    sPoly(svg,L?[[baseX,baseY],[baseX,ty],[baseX+drawW,baseY]]:[[baseX,baseY],[baseX+drawW,baseY],[baseX+drawW,ty]],wallPat,shade(rive,-.35),1);

    riveBand(L?[[rx,ty-k*oL],[rx+rw,baseY+k*oR]]:[[rx,baseY+k*oL],[rx+rw,ty-k*oR]]);
    sTxtBg(svg,baseX+drawW*(L?.35:.65),baseY-roofH*.28,`${d.pente}°`,8,'#555');
    sTxt(svg,L?baseX-5:baseX+drawW+5,ty-t-3,'faîte',7,'#888',L?'end':'start');
    return;
  }
  const drop=(g.ovhgTop||0)*Math.tan(d.penteRad||0)*sc; // le débord côté spectateur descend sous le haut du mur
  if(g.roofT==='slope2'){
    const ty=baseY-roofH, ey=baseY+drop;
    sRect(svg,rx,ty,rw,ey-ty,patCouv(svg,cv,sc,rx,ty,d.penteRad),cv.c[1],1);
    sRect(svg,rx,ey-Math.max(1.5,0.05*sc),rw,Math.max(1.5,0.05*sc),rive,'none',0); // planche d'égout
    sRect(svg,rx,ty-Math.max(1.5,0.04*sc),rw,Math.max(2.5,0.08*sc),cv.c[1],'none',0); // faîtière
    sTxt(svg,rx+rw/2,ty-7,'faîte',7,'#555');
    sTxtBg(svg,rx+rw/2,ty+roofH/2,`pente ${d.pente}°`,8,'#555');
    return;
  }
  if(g.roofT==='slope1'){ // côté bas d'un 1 pan : le pan monte de l'égout (devant) au faîte (au fond)
    const ty=baseY-roofH, ey=baseY+drop;
    sRect(svg,rx,ty,rw,ey-ty,patCouv(svg,cv,sc,rx,ty,d.penteRad),cv.c[1],1);
    sRect(svg,rx,ty-Math.max(1.5,0.04*sc),rw,Math.max(2,0.06*sc),rive,'none',0); // rive de faîte
    sRect(svg,rx,ey-Math.max(1.5,0.05*sc),rw,Math.max(1.5,0.05*sc),rive,'none',0); // planche d'égout
    sTxt(svg,rx+rw/2,ty-7,'faîte (au fond)',7,'#555');
    sTxtBg(svg,rx+rw/2,ty+roofH/2,`pente ${d.pente}° vers vous`,8,'#555');
    return;
  }
}
// Gouttière anthracite et descente (vignette du site) : section demi-ronde au bout d'un égout, ou longueur d'égout vue de face
const GOUT_C=['#2f3236','#141517','#5a5e63'];
function gutterSec(svg,x,y,sc,dir){ // x, y : bout bas de la rive ; dir -1 = égout à gauche, +1 = à droite
  const gw=Math.max(3,0.12*sc), gh=Math.max(2.4,0.09*sc), x0=dir<0?x-gw*.25:x-gw*.75;
  svg.appendChild(svgEl('path',{d:`M${x0},${y} h${gw} v${gh*.3} a${gw/2},${gh*.7} 0 0 1 ${-gw},0 z`,fill:GOUT_C[0],stroke:GOUT_C[1],'stroke-width':.6}));
  return {x:x0+gw/2,y:y+gh};
}
function gutterRun(svg,x1,x2,y,sc){
  const gh=Math.max(2.4,0.10*sc);
  sRect(svg,x1,y,x2-x1,gh,GOUT_C[0],GOUT_C[1],.6); sLine(svg,x1,y+gh*.3,x2,y+gh*.3,GOUT_C[2],.5);
  return y+gh;
}
function downpipe(svg,x,y1,y2,sc,xs){ // descente jusqu'au sol, coude de sortie ; xs : sortie de la gouttière (col de cygne jusqu'au mur)
  const w=Math.max(1.6,0.07*sc), e=Math.max(1.4,0.05*sc);
  if(y2-y1<2) return;
  if(xs!=null&&Math.abs(xs-x)>w){
    const yc=y1+Math.max(4,0.22*sc), dx=x-xs, dy=yc-y1, L=Math.hypot(dx,dy), nx=-dy/L*w/2, ny=dx/L*w/2;
    sPoly(svg,[[xs+nx,y1+ny],[x+nx,yc+ny],[x-nx,yc-ny],[xs-nx,y1-ny]],GOUT_C[0],GOUT_C[1],.5);
    y1=yc;
  }
  sRect(svg,x-w/2,y1,w,y2-y1-e,GOUT_C[0],GOUT_C[1],.5);
  sRect(svg,x-w/2,y2-e*2,w+Math.max(2.5,0.1*sc),e,GOUT_C[0],GOUT_C[1],.5);
}
// Pignon biseauté : lames parallèles aux rampants (chevron), couvre-joint au faîte ; pts = polygone à remplir, dir = sens des lames
function gableBoards(svg,fin,pts,dir,sc){
  const id='cg'+Math.random().toString(36).slice(2,9);
  const cp=svgEl('clipPath',{id}); cp.appendChild(svgEl('polygon',{points:pts.map(p=>p.join(',')).join(' ')})); svg.appendChild(cp);
  const g=svgEl('g',{'clip-path':`url(#${id})`}); svg.appendChild(g);
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]), x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  g.appendChild(svgEl('rect',{x:x0,y:y0,width:x1-x0,height:y1-y0,fill:fin.c[0]}));
  const L=Math.hypot(dir[0],dir[1])||1, ux=dir[0]/L, uy=dir[1]/L, nx=-uy, ny=ux, R=Math.hypot(x1-x0,y1-y0), cx=(x0+x1)/2, cy=(y0+y1)/2;
  const sp=Math.max(2.5,0.13*sc);
  for(let o=-R;o<=R;o+=sp) g.appendChild(svgEl('line',{x1:cx+nx*o-ux*R,y1:cy+ny*o-uy*R,x2:cx+nx*o+ux*R,y2:cy+ny*o+uy*R,stroke:fin.c[1],'stroke-width':Math.max(.5,0.012*sc),opacity:.85}));
  for(let o=-R+sp*.5;o<=R;o+=sp) g.appendChild(svgEl('line',{x1:cx+nx*o-ux*R,y1:cy+ny*o-uy*R,x2:cx+nx*o+ux*R,y2:cy+ny*o+uy*R,stroke:fin.c[2]||fin.c[0],'stroke-width':Math.max(.4,0.006*sc),opacity:.35}));
}
// Profilés aluminium d'angle (option « profil U ») : coiffent les abouts des madriers aux angles
function drawAluCorners(svg,d,baseX,baseY,drawW,gndY,sc){
  const oss=d.sys==='ossature', cw=oss?Math.max(2,0.05*sc):0.10*sc, h=gndY-baseY, hl=Math.max(.6,cw*.18);
  [oss?baseX:baseX-cw, oss?baseX+drawW-cw:baseX+drawW].forEach(x=>{
    sRect(svg,x,baseY,cw,h,'#c4c8cc','#868b90',.7);
    sRect(svg,x+hl,baseY,hl,h,'#e2e4e6','none',0);
    sRect(svg,x+cw-hl*2,baseY,hl,h,'#9da2a7','none',0);
  });
}
// Bouts de madriers croisés aux angles (vue en élévation)
function drawMadrierCorners(svg,d,baseX,baseY,drawW,gndY,sc){
  // Les madriers dépassent de 10 cm au-delà des murs extérieurs (« débordement madriers 10 cm de chaque côté »)
  const fin=FINITIONS.madrier, cw=0.10*sc, h=gndY-baseY;
  const pat=patBoards(svg,fin,sc,baseX,gndY-fin.board*sc/2,-.14);
  sRect(svg,baseX-cw,baseY,cw,h,pat,shade(fin.c[1],-.3),.8);
  sRect(svg,baseX+drawW,baseY,cw,h,pat,shade(fin.c[1],-.3),.8);
}
// Porte de garage dessinée selon son modèle (vignettes du site : huisserie métal gris clair, poignée carrée noire)
function drawGarageDoorReal(svg,x,y,w,h,sc){
  const t=fv('f-pgtype');
  const M={PGPH:['sr_vert','h'],PGPV:['sr_vert','v'],PGBH:['sr_brun','h'],PGG:['srn_gris','v'],PGN:['douglas_noir','v'],PGAH:['ayous125','h'],PGAV:['ayous_alea','v']};
  const fr=Math.max(1.8,0.06*sc);
  sRect(svg,x-fr,y-fr,w+fr*2,h+fr,'#a9acaf','#6d7074',.8); // huisserie métal
  sRect(svg,x-fr,y-fr,w+fr*2,Math.max(.6,fr*.3),'#c9cbcd','none',0);
  if(M[t]){
    const f=FINITIONS[M[t][0]];
    const ff=M[t][1]==='h'&&f.dir==='v'?Object.assign({},f,{dir:'h',board:0.12}):(M[t][1]==='v'&&f.dir==='h'?Object.assign({},f,{dir:'v',boards:[0.12]}):f);
    sRect(svg,x,y,w,h,patBoards(svg,ff,sc,x,y+h,-.03),'#2f3236',.8);
    if(M[t][1]==='v'){ // rangées de pointes des traverses
      const step=Math.max(2.5,0.12*sc);
      [.12,.5,.88].forEach(k=>{for(let px=x+step/2;px<x+w;px+=step) svg.appendChild(svgEl('circle',{cx:px,cy:y+h*k,r:Math.max(.35,0.008*sc),fill:'#e8e8e8',opacity:.8}));});
    }
  } else if(t==='PGM'){ // basculante métallique anthracite, nervures verticales
    sRect(svg,x,y,w,h,'#3b3e42','#222',.8);
    const step=Math.max(2.5,0.12*sc);
    for(let px=x+step;px<x+w-1;px+=step){sRect(svg,px-Math.max(.6,0.02*sc),y,Math.max(1.2,0.04*sc),h,'#2a2c2f','none',0);sLine(svg,px+Math.max(.6,0.02*sc),y,px+Math.max(.6,0.02*sc),y+h,'#55595e',.5);}
  } else { // sectionnelle : panneaux horizontaux
    sRect(svg,x,y,w,h,'#e3e4e2','#555',.8);
    for(let i=1;i<4;i++) sLine(svg,x,y+h*i/4,x+w,y+h*i/4,'#8b8f93',1);
  }
  const hs=Math.max(1.8,0.05*sc);
  sRect(svg,x+w/2-hs/2,y+h*.6,hs,hs,'#111','none',0); // poignée
}

// ════════════════════════════════════════════════════════
// EXTENSIONS (abri bûches) : fermetures et plancher extérieur
// Coordonnées bâtiment : x depuis le mur gauche (0 → L), y depuis la façade (0 → P)
// ════════════════════════════════════════════════════════
// état des extensions : ST.ext // côtés fermés par extension : {droite:{a,b,c}} (a, b = flancs ; c = bout)
const EXT_SIDES={droite:['côté face','côté fond','bout'],gauche:['côté face','côté fond','bout'],face:['côté gauche','côté droit','bout'],fond:['côté gauche','côté droit','bout']};
function extList(d){return ST.type==='carport'||d.isQuadro?[]:[['face',d.ovF],['fond',d.ovB],['gauche',d.ovL],['droite',d.ovR]].filter(([,o])=>o>0.5).map(([s])=>s);}
function extGeom(d){
  const {L,P}=d, out={seg:[],floor:[],type:fv('f-ext-ferm')};
  const plan=fv('f-ext-plan')==='oui';
  extList(d).forEach(s=>{
    const box=s==='droite'?{x0:L,x1:L+d.ovR,y0:0,y1:P}:s==='gauche'?{x0:-d.ovL,x1:0,y0:0,y1:P}:s==='face'?{x0:0,x1:L,y0:-d.ovF,y1:0}:{x0:0,x1:L,y0:P,y1:P+d.ovB};
    if(plan) out.floor.push(box);
    if(out.type==='non') return;
    const e=ST.ext[s]||{};
    if(s==='droite'||s==='gauche'){
      if(e.a) out.seg.push({x0:box.x0,y0:0,x1:box.x1,y1:0});
      if(e.b) out.seg.push({x0:box.x0,y0:P,x1:box.x1,y1:P});
      if(e.c){const xb=s==='droite'?box.x1:box.x0; out.seg.push({x0:xb,y0:0,x1:xb,y1:P});}
    } else {
      if(e.a) out.seg.push({x0:0,y0:box.y0,x1:0,y1:box.y1});
      if(e.b) out.seg.push({x0:L,y0:box.y0,x1:L,y1:box.y1});
      if(e.c){const yb=s==='face'?box.y0:box.y1; out.seg.push({x0:0,y0:yb,x1:L,y1:yb});}
    }
  });
  return out;
}
// Hauteur de la ligne de toit au point (x,y), en m (prolongée sur les débords)
function roofHAt(d,x,y){
  const {L,P,hExt,rH,toit}=d, o=fv('f-orient');
  if(toit==='2PANS') return hExt+rH-Math.abs(x-L/2)*(rH/(L/2||1));
  if(toit==='1PAN'){
    if(o==='droite') return hExt+rH*(1-x/L);
    if(o==='gauche') return hExt+rH*x/L;
    if(o==='fond') return hExt+rH*(1-y/P);
    return hExt+rH*y/P;
  }
  return hExt;
}
// (x,y) bâtiment → [abscisse dans la vue (m), profondeur] ; profondeur < 0 = devant le mur de la vue
function viewMap(d,side){
  if(side==='face') return (x,y)=>[x,y];
  if(side==='fond') return (x,y)=>[d.L-x,d.P-y];
  if(side==='gauche') return (x,y)=>[y,x];
  return (x,y)=>[d.P-y,d.L-x];
}
function extFin(d,type){
  if(type==='ajouree') return {dir:'v',boards:[0.042],gap:0.025,gapC:'none',c:FINITIONS.sr_vert.c};
  return d.sys==='ossature'?wallFin(d):FINITIONS.madrier;
}
// Fermetures et plancher d'extension dans une élévation
function drawExtElev(svg,d,side,baseX,gndY,sc,real,W){
  const X=extGeom(d); if(!X.seg.length&&!X.floor.length) return;
  const vm=viewMap(d,side), fin=extFin(d,X.type), items=[];
  X.seg.forEach(s=>{
    const [u0,d0]=vm(s.x0,s.y0),[u1,d1]=vm(s.x1,s.y1);
    if(Math.abs(d0-d1)>1e-6) return; // vue de chant
    const ua=Math.min(u0,u1), ub=Math.max(u0,u1);
    if(!(d0<-1e-6||ub<=1e-6||ua>=W-1e-6)) return; // derrière le mur : caché
    items.push({ua,ub,depth:d0,s});
  });
  items.sort((a,b)=>b.depth-a.depth).forEach(it=>{ // du fond vers l'avant
    const pts=[];
    for(let k=0;k<=12;k++){const q=k/12, x=it.s.x0+(it.s.x1-it.s.x0)*q, y=it.s.y0+(it.s.y1-it.s.y0)*q; pts.push([baseX+vm(x,y)[0]*sc,gndY-roofHAt(d,x,y)*sc]);}
    pts.sort((a,b)=>a[0]-b[0]);
    const poly=[[pts[0][0],gndY],...pts,[pts[pts.length-1][0],gndY]];
    if(real){
      sPoly(svg,poly,patBoards(svg,fin,sc,baseX,gndY,it.depth>0?-.22:.07),'none',0);
      sPoly(svg,poly,'none','#1f1d16',Math.max(1,0.02*sc));
    }
    else sPoly(svg,poly,'rgba(200,215,230,.45)','#7f8c8d',1,X.type==='ajouree'?'3 2':'');
  });
  X.floor.forEach(f=>{ // plancher extérieur : lames sur lambourdes, 12 cm au-dessus du sol
    const c=[[f.x0,f.y0],[f.x1,f.y0],[f.x0,f.y1],[f.x1,f.y1]].map(([x,y])=>vm(x,y));
    const ua=Math.min(...c.map(q=>q[0])), ub=Math.max(...c.map(q=>q[0])), dmin=Math.min(...c.map(q=>q[1]));
    if(!(dmin<-1e-6||ub<=1e-6||ua>=W-1e-6)) return;
    const fh=Math.max(2,0.12*sc);
    sRect(svg,baseX+ua*sc,gndY-fh,(ub-ua)*sc,fh,real?patBoards(svg,{dir:'h',board:0.06,c:FINITIONS.sr_brun.c},sc,baseX,gndY):'#e8dcc8','#5c4a32',.8);
  });
}

function drawPlan(svg,d,vw=480,vh=340){
  clr(svg);
  const PAD=70;
  const avW=vw-PAD*2, avH=vh-PAD*2;
  const sc=ST.planScale||Math.min(avW/d.htL, avH/d.htP);
  svg.setAttribute('data-sc',sc);

  const htW=d.htL*sc, htP=d.htP*sc;
  const cx=vw/2, cy=vh/2;
  const ox=cx-htW/2, oy=cy-htP/2; // top-left of hors-tout
  const wx=ox+d.ovL*sc, wy=oy+d.ovB*sc; // top-left of wall (FOND ovhg at top, FACE at bottom)
  const drawW=d.L*sc, drawP=d.P*sc, wt=d.wt*sc;

  // Hors tout boundary — extension toiture (hachurée)
  // Fill overhang zones with diagonal hatch pattern
  const ovLpx=d.ovL*sc, ovRpx=d.ovR*sc, ovFpx=d.ovF*sc, ovBpx=d.ovB*sc;
  const hatchCol='#c8d0b8', hatchOp=.5;
  // Top strip (fond overhang)
  if(ovBpx>2) sRect(svg,ox,oy,htW,ovBpx,'#f0f3ea','none',0);
  // Bottom strip (face overhang)
  if(ovFpx>2) sRect(svg,ox,oy+htP-ovFpx,htW,ovFpx,'#f0f3ea','none',0);
  // Left strip (gauche overhang)
  if(ovLpx>2) sRect(svg,ox,oy,ovLpx,htP,'#f0f3ea','none',0);
  // Right strip (droite overhang)
  if(ovRpx>2) sRect(svg,ox+htW-ovRpx,oy,ovRpx,htP,'#f0f3ea','none',0);
  // Diagonal hatch lines across the overhang area
  const step=8;
  // Lignes x − y = c à 45°, bornées au rectangle hors tout
  for(let i=-htP;i<htW;i+=step){
    const ax=Math.max(0,i), bx=Math.min(htW,i+htP);
    const lx1=ox+ax, ly1=oy+ax-i;
    const lx2=ox+bx, ly2=oy+bx-i;
    // Only draw in overhang zones (not inside wall rect)
    if(lx1<wx||lx2>wx+drawW||ly1<wy||ly2>wy+drawP)
      sLine(svg,lx1,ly1,lx2,ly2,hatchCol,hatchOp);
  }
  // Hors tout border
  sRect(svg,ox,oy,htW,htP,'none','#515136',.8,'5 3');

  if(ST.type==='carport'){
    drawPlanCarport(svg,d,wx,wy,drawW,drawP,wt,sc);
  } else {
    // Wall exterior
    sRect(svg,wx,wy,drawW,drawP,'#e8eef5','#1a1a2e',2);
    // Wall interior
    sRect(svg,wx+wt,wy+wt,drawW-wt*2,drawP-wt*2,'#f5f8fc','#7f8c8d',.7);
    // Madrier corner joints (10cm protrusions)
    if(d.sys!=='ossature'){
      const cj=0.10*sc;
      [[wx,wy],[wx+drawW,wy],[wx,wy+drawP],[wx+drawW,wy+drawP]].forEach(([cx2,cy2])=>{
        const sx=cx2===wx?-cj:0, sy=cy2===wy?-cj:0;
        const ex=cx2===wx?wt:drawW-wt, ey=cy2===wy?wt:drawP-wt;
        // horizontal joint
        sRect(svg,cx2+sx,cy2+sy,cj+wt*(cx2===wx?1:-1),cj,'#d0dae8','#1a1a2e',1);
        // vertical joint
        sRect(svg,cx2+sx,cy2+sy,cj,cj+wt*(cy2===wy?1:-1),'#d0dae8','#1a1a2e',1);
      });
      // Madrier log lines (horizontal)
      const logH=(d.sys==='madrier28'?0.028:0.045)*sc;
      let ly=wy+drawP-logH;
      while(ly>wy){sLine(svg,wx+1,ly,wx+drawW-1,ly,'#c8d6e5',.4);ly-=logH;}
    }
  }

  // Plancher extérieur des extensions (sous les poteaux)
  const EXg=extGeom(d), pX=x=>wx+x*sc, pY=y=>wy+(d.P-y)*sc;
  EXg.floor.forEach(f=>{
    const x0=pX(f.x0), x1=pX(f.x1), y0=pY(f.y1), y1=pY(f.y0), vert=(f.x1-f.x0)<(f.y1-f.y0);
    sRect(svg,x0,y0,x1-x0,y1-y0,'#eadfcb','#8a6d48',.6);
    const st=Math.max(2.5,0.12*sc);
    if(vert) for(let y=y0+st;y<y1;y+=st) sLine(svg,x0,y,x1,y,'#b89b72',.4);
    else for(let x=x0+st;x<x1;x+=st) sLine(svg,x,y0,x,y1,'#b89b72',.4);
  });
  // Support posts for overhangs > 50cm (portée max 3m → poteaux espacés de ≤3m)
  const postSz=0.12*sc, maxSpan=3; // 3m portée max
  function drawPostRow(x1,y1,x2,y2,ov){
    if(ov<=0.5) return;
    const len=Math.sqrt((x2-x1)**2+(y2-y1)**2)/sc; // longueur du mur en m
    const nPosts=Math.max(2,Math.ceil(len/maxSpan)+1); // min 2 (extrémités)
    for(let i=0;i<nPosts;i++){
      const t=nPosts>1?i/(nPosts-1):0.5;
      const cx=x1+(x2-x1)*t, cy=y1+(y2-y1)*t;
      sRect(svg,cx-postSz/2,cy-postSz/2,postSz,postSz,'#f0b429','#856404',1.2);
    }
  }
  // Face overhang: posts along bottom edge (at max ovhg Y)
  drawPostRow(wx,wy+drawP+d.ovF*sc,wx+drawW,wy+drawP+d.ovF*sc,d.ovF);
  // Fond overhang: posts along top edge
  drawPostRow(wx,wy-d.ovB*sc+postSz,wx+drawW,wy-d.ovB*sc+postSz,d.ovB);
  // Gauche overhang: posts along left edge
  drawPostRow(wx-d.ovL*sc+postSz/2,wy,wx-d.ovL*sc+postSz/2,wy+drawP,d.ovL);
  // Droite overhang: posts along right edge
  drawPostRow(wx+drawW+d.ovR*sc-postSz/2,wy,wx+drawW+d.ovR*sc-postSz/2,wy+drawP,d.ovR);

  // Fermetures des extensions
  EXg.seg.forEach(s=>sLine(svg,pX(s.x0),pY(s.y0),pX(s.x1),pY(s.y1),'#5c3d1e',3,EXg.type==='ajouree'?'4 2':''));

  // Menuiseries — position comptée de gauche à droite sur l'élévation vue de l'extérieur
  // (fond : depuis le côté droit ; gauche : depuis la façade ; droite : depuis le fond)
  const along=(wall,t)=>wall==='face'?[wx+t*drawW,wy+drawP]:wall==='fond'?[wx+(1-t)*drawW,wy]:wall==='gauche'?[wx,wy+(1-t)*drawP]:[wx+drawW,wy+t*drawP];
  ST.menus.forEach(m=>{
    const lenM=(m.wall==='face'||m.wall==='fond')?d.L:d.P, half=m.lw/200/lenM, t=m.pos/100;
    const [ax,ay]=along(m.wall,t-half), [bx,by]=along(m.wall,t+half);
    const c=m.type==='fenetre'?'#3498db':'#27ae60', horiz=m.wall==='face'||m.wall==='fond';
    sRect(svg,Math.min(ax,bx)-(horiz?0:3),Math.min(ay,by)-(horiz?3:0),horiz?Math.abs(bx-ax):6,horiz?6:Math.abs(by-ay),m.type==='fenetre'?'#d6eaf8':'#d5f5e3',c,1.5);
    if(isSliding(m)){ // zone de coulissement : dehors (rail extérieur) ou dedans (rail intérieur)
      const ins=presetOf(m).dr==='coulO', out=(ins?-1:1)*7;
      const n={face:[0,1],fond:[0,-1],gauche:[-1,0],droite:[1,0]}[m.wall];
      const zs=isDoubleM(m)?[[t-half*2,t-half],[t+half,t+half*2]]:(m.rail==='droite'?[[t+half,t+half*3]]:[[t-half*3,t-half]]);
      zs.forEach(([z0,z1])=>{
        const [x0,y0]=along(m.wall,z0),[x1,y1]=along(m.wall,z1);
        sLine(svg,x0+n[0]*out,y0+n[1]*out,x1+n[0]*out,y1+n[1]*out,ins?'#3498db':'#e67e22',3,'3 2');
      });
    }
  });

  // ── DIMENSION LINES ──────────────────────────────────
  // Exterior largeur (bottom, main)
  dimL(svg,wx,wy+drawP,wx+drawW,wy+drawP,`${d.L.toFixed(2)} m`,24);
  // Exterior profondeur (right, main)
  dimL(svg,wx+drawW,wy,wx+drawW,wy+drawP,`${d.P.toFixed(2)} m`,24);
  // Hors tout largeur (top, offset above plan)
  if(Math.abs(d.htL-d.L)>0.001)
    dimL(svg,ox,oy,ox+htW,oy,`HT ${d.htL.toFixed(2)} m`,-18,'#e67e22');
  // Hors tout profondeur (left, offset left of plan)
  if(Math.abs(d.htP-d.P)>0.001)
    dimL(svg,ox,oy,ox,oy+htP,`HT ${d.htP.toFixed(2)} m`,-18,'#e67e22');

  // Interior dims — centered, small, with white bg
  if(ST.type!=='carport'){
    const icx=wx+drawW/2, icy=wy+drawP/2;
    sTxtBg(svg,icx,icy-10,`↔ int. ${d.intL.toFixed(2)} m`,8,'#3498db');
    sTxtBg(svg,icx,icy+10,`↕ int. ${d.intP.toFixed(2)} m`,8,'#3498db');
  }

  // North arrow (top-right of plan)
  const nx=ox+htW-16,ny=oy+16;
  sLine(svg,nx,ny+12,nx,ny,'#888',1.5);sArrow(svg,nx,ny+12,nx,ny,'#888',5);
  sTxt(svg,nx,ny-6,'N',8,'#888','middle');

  // Labels FACE/FOND (inside plan, near edges)
  sTxt(svg,wx+drawW/2,wy+drawP-6,'FACE',7,'#aaa','middle');
  sTxt(svg,wx+drawW/2,wy+8,'FOND',7,'#aaa','middle');
  sTxt(svg,wx+6,wy+drawP/2,'G',7,'#aaa','middle');
  sTxt(svg,wx+drawW-6,wy+drawP/2,'D',7,'#aaa','middle');

  // Overhang dims (only when non-standard)
  if(d.ovF>d.stdOvhg+0.01){
    dimL(svg,wx+drawW*0.3,wy+drawP,wx+drawW*0.3,oy+htP,`${(d.ovF*100).toFixed(0)} cm`,30,'#e67e22');
  }
  if(d.ovB>d.stdOvhg+0.01){
    dimL(svg,wx+drawW*0.7,oy,wx+drawW*0.7,wy,`${(d.ovB*100).toFixed(0)} cm`,-30,'#e67e22');
  }

  drawScaleBar(svg,sc);
  // Légende (en bas du SVG, sous le dessin)
  const legX=8, legY=vh-14;
  sRect(svg,legX,legY,6,6,'#f0f3ea','#515136',.5,'3 2');
  sTxt(svg,legX+9,legY+3,'Extension toiture',5,'#888','start');
  sRect(svg,legX+90,legY,6,6,'#e8eef5','#1a1a2e',1);
  sTxt(svg,legX+99,legY+3,ST.type==='carport'?'Emprise poteaux':'Murs ext.',5,'#888','start');
}

// Abscisses (0→1) des poteaux d'une rangée en largeur ; côté adossé = mur, pas de poteau
function carportColsT(d){
  const n=d.nCols, ts=[];
  if(d.ados==='non'){for(let i=0;i<n;i++) ts.push(n>1?i/(n-1):0.5);}
  else if(d.ados==='gauche'){for(let i=1;i<=n;i++) ts.push(i/n);}
  else {for(let i=0;i<n;i++) ts.push(i/n);}
  return ts;
}
function drawPlanCarport(svg,d,wx,wy,drawW,drawP,wt,sc){
  const ps=parseFloat(fv('f-pot'))*sc||0.12*sc;
  // Beam outlines (light fill)
  sRect(svg,wx,wy,drawW,ps,'#ecf0f1','#555',.8);
  sRect(svg,wx,wy+drawP-ps,drawW,ps,'#ecf0f1','#555',.8);
  // Side beams
  sRect(svg,wx,wy,ps,drawP,'#ecf0f1','#555',.5);
  sRect(svg,wx+drawW-ps,wy,ps,drawP,'#ecf0f1','#555',.5);
  // Mur d'adossement (hachuré, côté mur)
  if(d.ados!=='non'){
    const mw=Math.max(6,0.20*sc), mx=d.ados==='gauche'?wx-mw:wx+drawW;
    sRect(svg,mx,wy-12,mw,drawP+24,'#e5e5e5','#555',1);
    for(let y=wy-12;y<wy+drawP+12;y+=6) sLine(svg,mx,y+6,mx+mw,y,'#999',.6);
    sTxt(svg,mx+mw/2,wy-16,'MUR',6,'#777');
  }
  // Fermetures (côtés bardés)
  const CL=closList();
  if(CL.includes('gauche')&&d.ados!=='gauche') sLine(svg,wx+ps/2,wy,wx+ps/2,wy+drawP,'#5c3d1e',3);
  if(CL.includes('droite')&&d.ados!=='droite') sLine(svg,wx+drawW-ps/2,wy,wx+drawW-ps/2,wy+drawP,'#5c3d1e',3);
  if(CL.includes('fond')) sLine(svg,wx,wy+ps/2,wx+drawW,wy+ps/2,'#5c3d1e',3);
  // Poteaux : grille nCols × nRows, à l'intérieur de l'emprise poteaux
  const cols=carportColsT(d), nr=d.nRows;
  for(let r=0;r<nr;r++){
    const py=wy+(nr>1?(drawP-ps)*r/(nr-1):(drawP-ps)/2);
    cols.forEach(t=>{
      const px=wx+(drawW-ps)*t;
      sRect(svg,px,py,ps,ps,'#bdc3c7','#2c3e50',1.5);
    });
  }
}

// ════════════════════════════════════════════════════════
// ELEVATION GEOMETRY
//
// Convention for gauche/droite views:
//   gauche (looking from left toward right):  left=FACE, right=FOND
//   droite (looking from right toward left):  left=FOND, right=FACE
//
// Convention for face/fond views:
//   both look at LARGEUR:  left=GAUCHE, right=DROITE
// ════════════════════════════════════════════════════════
function getElevGeom(d,side){
  const {L,P,hExt,rH,toit,orient,ovF,ovB,ovL,ovR}=d;

  if(side==='face'||side==='fond'){
    const w=L;
    // FOND vu depuis l'arrière : gauche/droite sont INVERSÉS par rapport à FACE
    const isFond=side==='fond';
    const ovhgL=isFond?ovR:ovL, ovhgR=isFond?ovL:ovR;
    const ovhgTop=side==='face'?ovF:ovB;
    if(toit==='2PANS')
      return{w,wallH:hExt,roofT:'triangle',rH,ovhgL,ovhgR,ovhgTop};
    if(toit==='1PAN'){
      if(orient==='droite'||orient==='gauche'){
        const slopeRate=rH/w;
        // FACE: orient=droite → high-left (trapL). FOND: inversé → high-right (trapR)
        let isHighL=orient==='droite';
        if(isFond) isHighL=!isHighL; // Miroir pour la vue fond
        const rOvhgL=slopeRate*ovhgL;
        const rOvhgR=slopeRate*ovhgR;
        return{w,wallH:hExt,roofT:isHighL?'trapL':'trapR',rH,ovhgL,ovhgR,ovhgTop,rOvhgL,rOvhgR};
      }
      // Pente vers le fond ou la façade : de face/fond on voit soit le grand mur (rive), soit le pan qui monte
      const isHigh=(orient==='fond'&&side==='face')||(orient==='face'&&side==='fond');
      return isHigh?{w,wallH:hExt+rH,roofT:'edge',rH:0,ovhgL,ovhgR,ovhgTop}:{w,wallH:hExt,roofT:'slope1',rH,ovhgL,ovhgR,ovhgTop};
    }
    return{w,wallH:hExt,roofT:'flat',rH:0,ovhgL,ovhgR,ovhgTop};
  }

  if(side==='gauche'||side==='droite'){
    const w=P;
    const isG=side==='gauche';
    // gauche: left=FACE, right=FOND
    // droite: left=FOND, right=FACE  (mirrored!)
    const ovhgL=isG?ovF:ovB;
    const ovhgR=isG?ovB:ovF;
    const ovhgTop=isG?ovL:ovR;

    if(toit==='2PANS')
      return{w,wallH:hExt,roofT:'slope2',rH,ovhgL,ovhgR,ovhgTop};

    if(toit==='1PAN'){
      if(orient==='droite'){
        // slope goes to building's RIGHT: GAUCHE=high wall, DROITE=low/gutter wall
        if(isG) return{w,wallH:hExt+rH,roofT:'edge',rH:0,ovhgL,ovhgR,ovhgTop}; // côté haut : grand mur + rive du toit
        else    return{w,wallH:hExt,roofT:'slope1',rH,ovhgL,ovhgR,ovhgTop};     // gutter side: shows slope profile with acrotère behind
      }
      if(orient==='gauche'){
        // slope goes to building's LEFT: DROITE=high wall, GAUCHE=low/gutter wall
        if(isG) return{w,wallH:hExt,roofT:'slope1',rH,ovhgL,ovhgR,ovhgTop};    // gutter side: shows slope profile with acrotère behind
        else    return{w,wallH:hExt+rH,roofT:'edge',rH:0,ovhgL,ovhgR,ovhgTop}; // côté haut : grand mur + rive du toit
      }
      if(orient==='fond'){
        // high=FACE, low=FOND
        // gauche: left=FACE(high), right=FOND(low) → trapL
        // droite: left=FOND(low), right=FACE(high) → trapR (mirrored)
        return{w,wallH:hExt,roofT:isG?'trapL':'trapR',rH,ovhgL,ovhgR,ovhgTop};
      }
      if(orient==='face'){
        // high=FOND, low=FACE
        return{w,wallH:hExt,roofT:isG?'trapR':'trapL',rH,ovhgL,ovhgR,ovhgTop};
      }
    }
    return{w,wallH:hExt,roofT:'flat',rH:0,ovhgL,ovhgR,ovhgTop};
  }
}

// ════════════════════════════════════════════════════════
// DRAW ELEVATION
// ════════════════════════════════════════════════════════
// Échelle ajustée d'une élévation (unités SVG par mètre), même calcul que drawElev / drawCarportElev
function elevFit(d,side,vw,vh){
  if(ST.type==='carport'){
    const isFace=side==='face'||side==='fond', viewW=isFace?d.L:d.P;
    const oL=isFace?d.ovL:(side==='gauche'?d.ovF:d.ovB), oR=isFace?d.ovR:(side==='gauche'?d.ovB:d.ovF);
    return Math.min((vw-100)/(viewW+oL+oR),(vh-75-8)/(d.hExt+d.rH));
  }
  const g=getElevGeom(d,side), hasMenus=ST.menus.some(m=>m.wall===side), hasHT=(g.ovhgL+g.ovhgR)>0.01;
  const PAD={t:25,b:hasMenus?(hasHT?80:65):(hasHT?55:45),l:55,r:50};
  const maxH=g.wallH+(g.roofT==='flat'?0.39:(g.roofT==='edge'?0.2:g.rH))+(d.soub||0);
  return Math.min((vw-PAD.l-PAD.r)/(g.w+g.ovhgL+g.ovhgR),(vh-PAD.t-PAD.b-8)/maxH);
}
// Échelle commune aux quatre élévations : toutes les vues à la même échelle
function commonScale(d,vw,vh){ return Math.min(...['face','gauche','droite','fond'].map(s=>elevFit(d,s,vw,vh))); }
// Barre d'échelle graphique (1 ou 2 m selon la place), en haut à gauche de la vue
function drawScaleBar(svg,sc,x=10,y=12){
  if(!ST.scaleBar) return;
  const L=sc>=45?1:(sc>=22?2:5), w=L*sc, h=3.2;
  sRect(svg,x,y,w/2,h,'#3d3d28','#3d3d28',.6); sRect(svg,x+w/2,y,w/2,h,'#fff','#3d3d28',.6);
  sTxt(svg,x,y+h+7,'0',6,'#555','middle'); sTxt(svg,x+w/2,y+h+7,String(L/2).replace('.',','),6,'#555','middle'); sTxt(svg,x+w,y+h+7,L+' m',6,'#555','middle');
}

function drawElev(svg,d,side,vw=320,vh=260){
  clr(svg);
  if(ST.type==='carport'){drawCarportElev(svg,d,side,vw,vh);return;}

  const g=getElevGeom(d,side);
  const hasMenus=ST.menus.some(m=>m.wall===side);
  const hasHT=(g.ovhgL+g.ovhgR)>0.01;
  const PAD={t:25,b:hasMenus?(hasHT?80:65):(hasHT?55:45),l:55,r:50};
  const avW=vw-PAD.l-PAD.r, avH=vh-PAD.t-PAD.b;

  const soub=d.soub||0;
  const maxH=g.wallH+(g.roofT==='flat'?0.39:(g.roofT==='edge'?0.2:g.rH))+soub;
  const totW=g.w+g.ovhgL+g.ovhgR;
  const sc=ST.scale||Math.min(avW/totW,(avH-8)/maxH);
  svg.setAttribute('data-sc',sc);

  const solY=vh-PAD.b, gndY=solY-soub*sc; // gndY : pied des murs (sur le soubassement s'il y en a un), solY : terrain
  const wallHpx=g.wallH*sc;
  const oL=g.ovhgL*sc,oR=g.ovhgR*sc;
  const drawW=g.w*sc;
  const baseX=PAD.l+(avW-totW*sc)/2+oL;
  const baseY=gndY-wallHpx;
  const wt=d.wt*sc;

  const real=isReal();
  if(real){
    drawGround(svg,PAD.l/2,vw-PAD.r/2,solY);
    if(d.sys!=='ossature') drawMadrierCorners(svg,d,baseX,baseY,drawW,gndY,sc);
    sRect(svg,baseX,baseY,drawW,wallHpx,patBoards(svg,wallFin(d),sc,baseX,gndY),'#3a3828',1.2);
    if(fv('f-profu')==='oui') drawAluCorners(svg,d,baseX,baseY,drawW,gndY,sc);
  } else {
  // Ground + hatch
  sLine(svg,PAD.l/2,solY,vw-PAD.r/2,solY,'#888',2);
  for(let i=0;i<18;i++) sLine(svg,PAD.l/2+i*14,solY,PAD.l/2+i*14-10,solY+12,'#ddd',.5);

  // Wall
  sRect(svg,baseX,baseY,drawW,wallHpx,'#e8eef5','#1a1a2e',2);

  // Wall thickness dashes
  sLine(svg,baseX+wt,baseY,baseX+wt,gndY,'#b0bec5',.7,'4 3');
  sLine(svg,baseX+drawW-wt,baseY,baseX+drawW-wt,gndY,'#b0bec5',.7,'4 3');

  // Madrier log lines
  if(d.sys!=='ossature'){
    const lh=(d.sys==='madrier28'?0.028:0.045)*sc;
    let ly=gndY-lh;
    while(ly>baseY+2){sLine(svg,baseX+2,ly,baseX+drawW-2,ly,'#c8d6e5',.5);ly-=lh;}
  }
  }

  // Soubassement en parpaings (un rang d'environ 20 cm sous les murs)
  if(soub>0){
    sRect(svg,baseX,gndY,drawW,solY-gndY,real?'#bdbcb5':'#e3e3e0','#77766f',.8);
    const bl=0.50*sc; for(let x=baseX+bl;x<baseX+drawW-1;x+=bl) sLine(svg,x,gndY,x,solY,'#8f8e88',.6);
    if(real) sLine(svg,baseX,gndY+Math.max(.6,0.01*sc),baseX+drawW,gndY+Math.max(.6,0.01*sc),'#d6d5cf',.5);
  }
  // Roof
  drawRoof(svg,d,g,baseX,baseY,drawW,oL,oR,sc,vw);

  // Poteaux de soutien (débord > 50 cm)
  // Un seul poteau à l'extrémité, hauteur = du sol au dessous du toit à ce point
  const postW=0.12*sc, postCol='#f0b429', postStroke='#856404';
  const rHpx=g.rH*sc;
  // Fonction : Y du dessous du toit à une distance dx du bord gauche du mur
  function roofYat(dx){
    // dx<0 = à gauche du mur, dx>drawW = à droite du mur
    const slope=rHpx/(drawW||1); // pente 1-pan (px/px)
    const slope2=rHpx/((drawW/2)||1); // pente 2-pans (px/px, chaque côté)
    if(g.roofT==='trapL'){
      // Faîte gauche (baseY-rHpx), gouttière droite (baseY). Pente descend G→D.
      return (baseY-rHpx) + slope*dx; // dx=0→faîte, dx=drawW→baseY
    }
    if(g.roofT==='trapR'){
      // Faîte droite (baseY-rHpx), gouttière gauche (baseY). Pente descend D→G.
      return baseY - slope*dx; // dx=0→baseY, dx=drawW→faîte
    }
    if(g.roofT==='triangle'){
      // Faîte au centre, descend vers G et D
      const mid=drawW/2;
      return dx<mid ? (baseY-rHpx)+slope2*Math.abs(mid-dx) :
                      (baseY-rHpx)+slope2*Math.abs(dx-mid);
    }
    // flat, slope1, slope2 : toit plat à baseY ou baseY-rHpx
    return g.roofT==='flat'?baseY:baseY-rHpx;
  }
  if(g.ovhgL>0.50){
    const topY=roofYat(-oL/sc*sc); // Y du toit au bord extérieur gauche
    // Utilise dx négatif = à gauche du mur
    const ry=roofYat(-oL);
    sRect(svg,baseX-oL,ry,postW,solY-ry,postCol,postStroke,1);
  }
  if(g.ovhgR>0.50){
    const ry=roofYat(drawW+oR);
    sRect(svg,baseX+drawW+oR-postW,ry,postW,solY-ry,postCol,postStroke,1);
  }

  // Gouttière : côté égout seulement (rien sur le côté haut d'un 1 pan), descente au coin jusqu'au sol
  if(fv('f-gout')==='oui'&&g.roofT!=='edge'){
    const kk=g.rH*sc/((g.roofT==='triangle'?drawW/2:drawW)||1);
    const dropE=(g.ovhgTop||0)*Math.tan(d.penteRad||0)*sc;
    const ends=[];
    if(g.roofT==='triangle') ends.push([baseX-oL,baseY+kk*oL,-1],[baseX+drawW+oR,baseY+kk*oR,1]);
    else if(g.roofT==='trapL') ends.push([baseX+drawW+oR,baseY+kk*oR,1]);
    else if(g.roofT==='trapR') ends.push([baseX-oL,baseY+kk*oL,-1]);
    ends.forEach(([x,y,dir],i)=>{ const s=gutterSec(svg,x,y,sc,dir); if(i===0) downpipe(svg,dir<0?baseX-Math.max(2,0.06*sc):baseX+drawW+Math.max(2,0.06*sc),s.y,solY,sc,s.x); });
    if(g.roofT==='slope1'||g.roofT==='slope2'){ const yb=gutterRun(svg,baseX-oL,baseX+drawW+oR,baseY+dropE,sc); downpipe(svg,baseX+Math.max(2,0.06*sc),yb,solY,sc); }
    if(g.roofT==='flat') downpipe(svg,baseX+Math.max(2,0.06*sc),baseY,solY,sc); // toit plat : gouttière intégrée derrière le bandeau
  }

  // Menuiseries
  ST.menus.filter(m=>m.wall===side).forEach(m=>{
    const mW=(m.lw/100)*sc, mH=(m.lh/100)*sc;
    const seuilPx=(m.seuil||0)/100*sc;
    const mx=baseX+(m.pos/100)*drawW-mW/2;
    const my=gndY-mH-seuilPx;
    const c=m.type==='fenetre'?'#3498db':'#27ae60';
    if(isSliding(m)) drawSlide(svg,m,mx,my,mW,mH,sc,real);
    if(real) drawMenuReal(svg,m,mx,my,mW,mH,sc,d);
    else {
    sRect(svg,mx,my,mW,mH,m.type==='fenetre'?'#d6eaf8':'#d5f5e3',c,1.5);
    if(m.type==='fenetre'){
      sLine(svg,mx+mW/2,my,mx+mW/2,my+mH,c,.7);
      sLine(svg,mx,my+mH/2,mx+mW,my+mH/2,c,.7);
    } else {
      sLine(svg,mx+mW/2,my,mx+mW/2,my+mH,c,.7);
    }
    }
    // Dimensions label on menuiserie
    sTxtBg(svg,mx+mW/2,my+mH/2,`${m.lw}×${m.lh}`,6,'#555');
    // Allège dim (if window with seuil > 0)
    if(m.seuil>5&&seuilPx>4){
      sLine(svg,mx+mW+2,my+mH,mx+mW+2,gndY,'#999',.5,'2 2');
      sTxt(svg,mx+mW+5,my+mH+(gndY-my-mH)/2,`${m.seuil}`,6,'#999','start');
    }
  });

  // Garage door (only facade)
  if(ST.type==='garage'&&side==='face'){
    const gW=(parseFloat(fv('f-pglw'))||237)/100*sc;
    const gH=(parseFloat(fv('f-pglh'))||200)/100*sc;
    const gx=baseX+drawW/2-gW/2, gy=solY-gH; // la porte de garage descend jusqu'au sol (le soubassement s'interrompt au droit de l'ouverture)
    if(real) drawGarageDoorReal(svg,gx,gy,gW,gH,sc);
    else {
    sRect(svg,gx,gy,gW,gH,'#ecf0f1','#2c3e50',2);
    for(let i=1;i<4;i++) sLine(svg,gx,gy+(gH/4)*i,gx+gW,gy+(gH/4)*i,'#aaa',.5);
    sTxt(svg,gx+gW/2,gy+gH/2,'Porte garage',7,'#555');
    }
  }

  // Fermetures et plancher des extensions (abri bûches)
  drawExtElev(svg,d,side,baseX,solY,sc,real,g.w);

  // ── DIMENSION LINES ──────────────────────────────────
  const roofTopY=baseY-(g.roofT==='flat'?0.39*sc:(g.roofT==='edge'?0:g.rH*sc));
  const hTot=g.wallH+(g.roofT==='flat'?0.39:(g.roofT==='edge'?0:g.rH));
  const hasRise=g.rH>0&&g.roofT!=='flat'&&g.roofT!=='edge';

  // ── BOTTOM DIMENSION CHAINS (layered, well spaced) ──
  const wallMenus2=ST.menus.filter(m=>m.wall===side).sort((a,b)=>a.pos-b.pos);
  const htW_elev=g.w+g.ovhgL+g.ovhgR;
  const showHT=htW_elev>g.w+0.01;

  // Calculate Y offsets in advance to avoid overlap
  let row1Y=solY+14; // menuiserie chain (if any)
  let row2Y, row3Y;
  if(wallMenus2.length>0){
    row2Y=row1Y+16; // ext width below chain
    row3Y=row2Y+16; // HT below ext
  } else {
    row2Y=solY+14;  // ext width
    row3Y=row2Y+16; // HT below ext
  }

  // ROW 1: Menuiserie chain
  if(wallMenus2.length>0){
    const pts=[{x:0,type:'wall'}];
    wallMenus2.forEach(m=>{
      const halfW=(m.lw/100)/g.w*100/2;
      pts.push({x:m.pos-halfW, type:'menuL', lw:m.lw});
      pts.push({x:m.pos+halfW, type:'menuR'});
    });
    pts.push({x:100,type:'wall'});
    for(let i=0;i<pts.length-1;i++){
      const x1=baseX+(pts[i].x/100)*drawW;
      const x2=baseX+(pts[i+1].x/100)*drawW;
      const isMenu=(pts[i].type==='menuL');
      const dist=isMenu?pts[i].lw:((pts[i+1].x-pts[i].x)/100*g.w*100).toFixed(0);
      const col=isMenu?'#2980b9':'#3d3d28';
      if(x2-x1>3){
        sLine(svg,x1,row1Y-2,x1,row1Y+2,col,.6);
        sLine(svg,x2,row1Y-2,x2,row1Y+2,col,.6);
        sLine(svg,x1,row1Y,x2,row1Y,col,.8);
        if(x2-x1>8){sArrow(svg,x1,row1Y,x2,row1Y,col,3);sArrow(svg,x2,row1Y,x1,row1Y,col,3);}
        if(x2-x1>14) sTxtBg(svg,(x1+x2)/2,row1Y-5,`${dist}`,6,col);
      }
    }
  }

  // ROW 2: Wall ext. width
  dimL(svg,baseX,gndY,baseX+drawW,gndY,`${g.w.toFixed(2)} m`,row2Y-gndY);

  // ROW 3: HT width
  if(showHT){
    dimL(svg,baseX-oL,gndY,baseX+drawW+oR,gndY,`HT ${htW_elev.toFixed(2)} m`,row3Y-gndY,'#e67e22');
  }

  // ── LEFT SIDE: wall height (offset LEFT = negative) ──
  const dimLx=Math.max(12,PAD.l*0.5);
  // Côté haut d'un 1 pan : le mur monte jusqu'au faîte, la hauteur d'égout n'est pas visible ici
  if(g.roofT!=='edge') dimL(svg,dimLx,baseY,dimLx,gndY,`H mur ${d.hInt.toFixed(2)} m`,-8);

  // ── RIGHT SIDE: total height + faîte bracket (offset RIGHT = positive) ──
  const dimRx=baseX+drawW+Math.max(oR+6,10);
  dimL(svg,dimRx,roofTopY,dimRx,solY,`H ${(hTot+soub).toFixed(2)} m`,8);
  if(soub>0) sTxtBg(svg,baseX+drawW/2,(gndY+solY)/2,`soubassement parpaing ${soub.toFixed(2).replace('.',',')} m`,6,'#555');
  if(hasRise){
    const dimRx2=dimRx+20;
    dimL(svg,dimRx2,roofTopY,dimRx2,baseY,`+${g.rH.toFixed(2)} m`,8,'#e67e22');
  }

  // ── WALL THICKNESS (subtle bottom dashes) ──
  sLine(svg,baseX,gndY-3,baseX+wt,gndY-3,'#b0bec5',.7);
  sLine(svg,baseX+drawW-wt,gndY-3,baseX+drawW,gndY-3,'#b0bec5',.7);

  drawScaleBar(svg,sc);

  // ── INTERIOR HEIGHT (centered in wall, smaller) ──
  const busy=ST.menus.filter(m=>m.wall===side).map(m=>[(m.pos/100)*drawW-(m.lw/100)*sc/2-30,(m.pos/100)*drawW+(m.lw/100)*sc/2+30]);
  const intK=[.5,.25,.75,.12,.88].find(k=>!busy.some(([a,b])=>k*drawW>a&&k*drawW<b))??.5;
  sTxtBg(svg,baseX+drawW*intK,gndY-wallHpx*0.45,g.roofT==='edge'?`int. sous faîte ${(d.hInt+d.rH).toFixed(2)} m`:`int. ${d.hInt.toFixed(2)} m`,7,'#3498db');

}

// ════════════════════════════════════════════════════════
// DRAW CARPORT ELEVATION
// Posts only — no walls
// ════════════════════════════════════════════════════════
function drawCarportElev(svg,d,side,vw,vh){
  const PAD={t:25,b:50,l:55,r:45};
  const avW=vw-PAD.l-PAD.r, avH=vh-PAD.t-PAD.b;
  const isFace=side==='face'||side==='fond';
  const viewW=isFace?d.L:d.P;
  const ovhgL=isFace?d.ovL:(side==='gauche'?d.ovF:d.ovB);
  const ovhgR=isFace?d.ovR:(side==='gauche'?d.ovB:d.ovF);
  const maxH=d.hExt+d.rH;
  const totW=viewW+ovhgL+ovhgR;
  const sc=ST.scale||Math.min(avW/totW,(avH-8)/maxH);
  svg.setAttribute('data-sc',sc);
  const gndY=vh-PAD.b;
  const hpx=d.hExt*sc, rHpx=d.rH*sc;
  const baseX=PAD.l+(avW-totW*sc)/2+ovhgL*sc;
  const dW=viewW*sc;
  const oL=ovhgL*sc, oR=ovhgR*sc;
  const rx=baseX-oL, rw=dW+oL+oR; // roof full width
  const ps=Math.max(6,parseFloat(fv('f-pot'))*sc||0.12*sc);

  const real=isReal(), fin=wallFin(d), cv=couvFin(d);
  const isAlu=fv('f-pot')==='0.15';
  const potC=isAlu?['#4a5056','#2c3035','#68707a']:['#c3b47f','#8a7d50','#d8cc9c'];
  if(real) drawGround(svg,PAD.l/2,vw-PAD.r/2,gndY);
  else {
  // Ground + hatch
  sLine(svg,PAD.l/2,gndY,vw-PAD.r/2,gndY,'#888',2);
  for(let i=0;i<18;i++) sLine(svg,PAD.l/2+i*14,gndY,PAD.l/2+i*14-10,gndY+12,'#ddd',.5);
  }

  // Posts — vue face/fond : poteaux d'une rangée ; vue côté : rangées en profondeur
  // Côté adossé vu de face : mur ; vue du côté adossé : le mur cache les poteaux
  const wallSide=(side==='gauche'&&d.ados==='gauche')||(side==='droite'&&d.ados==='droite');
  // Vue « en 3D » : à travers un côté ouvert, on voit le côté fermé (ou le mur d'adossement) d'en face, derrière les poteaux
  const CLOSALL=closList();
  const behind=({face:'fond',fond:'face',gauche:'droite',droite:'gauche'})[side];
  if(!wallSide&&!CLOSALL.includes(side)){
    if(d.ados===behind){
      sRect(svg,baseX,gndY-hpx,dW,hpx,'#d9d9d9','#888',.8);
      for(let x=baseX;x<baseX+dW;x+=10) sLine(svg,x,gndY,Math.min(x+10,baseX+dW),gndY-10,'#c4c4c4',.5);
    } else if(CLOSALL.includes(behind)){
      if(real) sRect(svg,baseX,gndY-hpx,dW,hpx,patBoards(svg,fin,sc,baseX,gndY,-.3),'#2b2a20',.8);
      else sRect(svg,baseX,gndY-hpx,dW,hpx,'rgba(200,215,230,0.2)','#9aa5ad',.8,'3 3');
      sTxtBg(svg,baseX+dW/2,gndY-hpx*0.8,`fermeture ${behind} (au fond)`,6,'#777');
    }
  }
  let ts;
  if(isFace) ts=carportColsT(d);
  else {const nr=d.nRows; ts=[]; for(let i=0;i<nr;i++) ts.push(nr>1?i/(nr-1):0.5);}
  if(wallSide){
    sRect(svg,baseX,gndY-hpx,dW,hpx,'#e5e5e5','#555',1.2);
    for(let x=baseX;x<baseX+dW;x+=10) sLine(svg,x,gndY,Math.min(x+10,baseX+dW),gndY-10,'#bbb',.5);
    sTxtBg(svg,baseX+dW/2,gndY-hpx*0.55,'Mur d\'adossement',7,'#555');
  } else {
    // Pieds de poteaux (configurateur) : platine, plot béton, pied galva à visser, réglable (tige filetée) ou à sceller
    const supp=fv('f-supp')||'non', GV=['#b9c0c6','#7e868d','#dfe3e6'];
    const jw=Math.max(1,0.012*sc), pl=Math.max(1.2,0.012*sc), bh=0.16*sc;
    const lift=supp==='reglable'?0.07*sc:(supp==='visser'?0.02*sc:0);
    const fl=(supp==='visser'||supp==='reglable')?lift+pl:(supp==='scelle'?pl:0); // le poteau repose dans l'étrier
    const foot=px=>{
      const cx=px+ps/2;
      if(supp==='plot'){
        const w=0.40*sc, hv=Math.max(2,0.05*sc);
        sRect(svg,cx-w/2,gndY,w,0.40*sc,'none','#9c9b95',.6,'3 2'); // partie enterrée
        sRect(svg,cx-w/2,gndY-hv,w,hv,real?'#c9c8c2':'#e6e6e3','#8a8984',.7);
        return;
      }
      if(supp==='visser'||supp==='reglable'||supp==='scelle'){
        const yb=gndY-lift;
        if(supp!=='scelle') sRect(svg,cx-0.09*sc,gndY-pl,0.18*sc,pl,GV[0],GV[1],.6); // platine vissée
        if(lift>pl){ // tige (filetée si réglable)
          sRect(svg,cx-Math.max(.8,0.012*sc),yb,Math.max(1.6,0.024*sc),lift-pl,GV[1],'none',0);
          if(supp==='reglable') for(let y=yb+1.2;y<gndY-pl;y+=1.6) sLine(svg,cx-Math.max(1.2,0.018*sc),y,cx+Math.max(1.2,0.018*sc),y-.8,GV[2],.4);
        }
        sRect(svg,px-jw*2,yb-pl,ps+jw*4,pl,GV[0],GV[1],.5); // fond de l'étrier
        sRect(svg,px-jw,yb-pl-bh,jw,bh,GV[0],GV[1],.5); sRect(svg,px+ps,yb-pl-bh,jw,bh,GV[0],GV[1],.5); // joues
        if(supp==='scelle'){ // queue de scellement et massif béton (enterrés)
          sRect(svg,cx-Math.max(1,0.02*sc),gndY,Math.max(2,0.04*sc),0.25*sc,'none',GV[1],.6,'3 2');
          sRect(svg,cx-0.2*sc,gndY+0.04*sc,0.4*sc,0.32*sc,'none','#9c9b95',.6,'3 2');
        }
        return;
      }
      if(real) sRect(svg,px-2,gndY-3,ps+4,3,'#5a5e62','#333',.6); // platine
      else sRect(svg,px-2,gndY-3,ps+4,3,'#aaa','#555',.8);
    };
    ts.forEach(t=>{
      const px=baseX+(dW-ps)*t, ph=hpx-fl;
      if(real){
        sRect(svg,px,gndY-hpx,ps,ph,potC[0],potC[1],.8);
        sRect(svg,px,gndY-hpx,Math.max(.6,ps*.18),ph,potC[2],'none',0);
        sRect(svg,px+ps-Math.max(.6,ps*.18),gndY-hpx,Math.max(.6,ps*.18),ph,potC[1],'none',0);
      } else {
      sRect(svg,px,gndY-hpx,ps,ph,'#d5d8dc','#555',1.5);
      }
      foot(px);
    });
  }
  if(isFace&&d.ados!=='non'){
    const mw=Math.max(6,0.20*sc), mx=d.ados==='gauche'?baseX-mw:baseX+dW;
    sRect(svg,mx,gndY-hpx-rHpx-6,mw,hpx+rHpx+6,'#e5e5e5','#555',1);
    for(let y=gndY-hpx-rHpx;y<gndY;y+=6) sLine(svg,mx,y+6,mx+mw,y,'#999',.6);
  }
  const np=ts.length;

  // Closures
  const showClos=closList().includes(side);
  // Remplissage des fermetures : type choisi dans le configurateur (ajouré / madrier clin / ossature bardée), sinon le bardage
  const ct=fv('f-clos-type'), cfin=ct==='ajouree'?extFin(d,'ajouree'):(ct==='clin'?FINITIONS.sr_vert:fin);
  if(showClos&&!wallSide){
    if(real) sRect(svg,baseX,gndY-hpx,dW,hpx,patBoards(svg,cfin,sc,baseX,gndY),'#3a3828',1);
    else {
    sRect(svg,baseX,gndY-hpx,dW,hpx,'rgba(200,215,230,0.3)','#7f8c8d',1,'5 3');
    sTxt(svg,baseX+dW/2,gndY-hpx/2,'Fermeture bardage',7,'#888');
    }
    // Menuiseries posées sur un côté fermé
    ST.menus.filter(m=>m.wall===side).forEach(m=>{
      const mW=(m.lw/100)*sc, mH=Math.min((m.lh/100)*sc,hpx-(m.seuil||0)/100*sc-2);
      const mx=baseX+(m.pos/100)*dW-mW/2, my=gndY-mH-(m.seuil||0)/100*sc;
      if(isSliding(m)) drawSlide(svg,m,mx,my,mW,mH,sc,real);
      if(real) drawMenuReal(svg,m,mx,my,mW,mH,sc,d);
      else sRect(svg,mx,my,mW,mH,m.type==='fenetre'?'#d6eaf8':'#d5f5e3',m.type==='fenetre'?'#3498db':'#27ae60',1.5);
      sTxtBg(svg,mx+mW/2,my+mH/2,`${m.lw}×${m.lh}`,6,'#555');
    });
  }

  // ── Charpente apparente et toiture (d'après les vues du configurateur du site) ──
  // Rives et bandeau de 26 cm : ils cachent le bac acier ; entrait / sablière de 16 cm ; jambes de force aux poteaux
  const topY=gndY-hpx;
  const orient=d.toit==='1PAN'?fv('f-orient'):'';
  const isFlat=d.toit==='TOIT_PLAT'||d.toit==='QUADRO';
  // Gouttière (option ; incluse sur le toit plat) : cachée derrière le bandeau d'égout, seule la descente se voit (poteau d'angle)
  const gout=fv('f-gout')==='oui', dpL=baseX-Math.max(2,0.05*sc), dpR=baseX+dW+Math.max(2,0.05*sc);
  const bh=Math.max(3,CP_ENTRAIT*sc), rv=Math.max(4,CP_RIVE*sc), th=Math.max(1.6,0.1*sc), pw=Math.max(2,0.12*sc);
  const tgA=Math.tan(d.penteRad||0);
  // Sous-face de la toiture vue d'en dessous (côté haut d'un 1 pan) : bac acier nervuré + pannes, ou planchettes, OSB, feutre
  const underside=(x,y,w,h)=>{
    if(h<=1) return;
    const sf=sousFace();
    if(sf==='planchette'){
      sRect(svg,x,y,w,h,real?'#dcc79b':'#efe6d2',real?'#8a7a52':'#999',.6);
      const st=Math.max(2.5,0.11*sc);
      for(let xx=x+st;xx<x+w-1;xx+=st) sLine(svg,xx,y,xx,y+h,real?'#b29c6c':'#c9bfa8',.5);
      return 'planchette';
    }
    if(sf==='osb'){ sRect(svg,x,y,w,h,real?'#d1ab6e':'#efe3cc',real?'#8a7044':'#999',.6); return 'osb'; }
    if(sf==='feutre'){ sRect(svg,x,y,w,h,real?'#6b6f73':'#e1e3e5',real?'#3d4044':'#999',.6); return 'feutre'; }
    // bac acier vu de dessous : nervures tous les 25 cm (dans le sens de la pente, vues de bout), pannes tous les mètres
    // (dessous à l'ombre : teintes assombries pour se lire comme une sous-face, pas comme une façade)
    sRect(svg,x,y,w,h,real?'#b4b9be':'#eef0f2',real?'#7d848b':'#999',.6);
    const nv=Math.max(3,0.25*sc);
    for(let xx=x+nv/2;xx<x+w-1;xx+=nv){ sLine(svg,xx,y,xx,y+h,real?'#a3a9af':'#d9dde0',.5); if(real) sLine(svg,xx+Math.max(.8,0.03*sc),y,xx+Math.max(.8,0.03*sc),y+h,'#c3c8cc',.35); }
    const pas=1.25*sc*tgA, ph=Math.max(2,0.09*sc);
    if(pas>ph*2) for(let yy=y+pas*.55;yy<y+h-ph*1.5;yy+=pas){
      sRect(svg,x,yy,w,ph,real?'#a3956a':'#d5d8dc',real?'#776a45':'#777',.5); // panne, dans l'ombre de la toiture
    }
    return 'bac';
  };
  const wood=potC;
  const piece=(pts)=>sPoly(svg,pts,real?wood[0]:'#d5d8dc',real?wood[1]:'#555',real?.7:1);
  const beam=(x,y,w,h)=>{piece([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]); if(real) sRect(svg,x,y,w,Math.max(.5,h*.18),wood[2],'none',0);};
  const member=(x1,y1,x2,y2,tk)=>{ // pièce inclinée d'épaisseur tk
    const dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy)||1, nx=-dy/L*tk/2, ny=dx/L*tk/2;
    piece([[x1+nx,y1+ny],[x2+nx,y2+ny],[x2-nx,y2-ny],[x1-nx,y1-ny]]);
  };
  const vert=(x,y1,y2,w)=>{ if(y2-y1>1) beam(x-w/2,y1,w,y2-y1); }; // montant vertical
  const rive=(pts)=>{ // planche de rive / bandeau sous la ligne de toit (pts = ligne haute)
    piece(pts.concat(pts.map(([x,y])=>[x,y+rv]).reverse()));
    if(real) svg.appendChild(svgEl('polyline',{points:pts.map(([x,y])=>`${x},${y+rv*.5}`).join(' '),fill:'none',stroke:wood[1],'stroke-width':.5,opacity:.7}));
  };
  const kneeBraces=()=>{ // jambes de force à 45° entre poteaux et entrait / sablière
    if(wallSide||CLOSALL.includes(side)) return;
    const kb=Math.min(0.5*sc,hpx*.25);
    ts.forEach((t,i)=>{
      const px=baseX+(dW-ps)*t;
      if(i>0) member(px,topY+kb,px-kb,topY,Math.max(1.6,0.08*sc));
      if(i<ts.length-1) member(px+ps,topY+kb,px+ps+kb,topY,Math.max(1.6,0.08*sc));
    });
  };
  const sabliere=()=>beam(isFace?baseX:rx,topY-bh,isFace?dW:rw,bh); // entrait (face) ou sablière (côté)
  const postTop=(x,yTop)=>{ if(!wallSide) beam(x,yTop,ps,topY-bh-yTop); }; // poteau prolongé jusqu'à la rive

  if(isFlat){
    // Bandeau toit plat : 36 cm au-dessus de la ferme (2,10 → 2,46 m)
    const slabH=Math.max(6,rHpx);
    if(real){
      const bf=FINITIONS[fv('f-bandeau')]||fin;
      sRect(svg,rx,topY-slabH,rw,slabH,patBoards(svg,bf,sc,rx,topY),'#3a3828',1);
      sRect(svg,rx-1,topY-slabH-Math.max(1.4,0.04*sc),rw+2,Math.max(1.4,0.04*sc),cv.c[1],'none',0);
    } else
    sRect(svg,rx,topY-slabH,rw,slabH,'#d5d8dc','#555',1.5);
    kneeBraces();
    if(!wallSide) downpipe(svg,dpL,topY,gndY,sc); // gouttière intégrée derrière le bandeau
  } else if(d.toit==='2PANS'){
    if(isFace){
      // Ferme : entrait, jambettes au quart, diagonales en V depuis le milieu de l'entrait, rives
      const peak=topY-rHpx, cx=rx+rw/2, eaveY=peak+(rw/2)*tgA; // rive : la ferme repose sur l'entrait, la rive passe au-dessus
      const yAt=x=>x<cx?eaveY-(eaveY-peak)*(x-rx)/(cx-rx||1):eaveY-(eaveY-peak)*(rx+rw-x)/(rx+rw-cx||1);
      kneeBraces(); sabliere();
      [baseX+dW*.25,baseX+dW*.75].forEach(x=>vert(x,yAt(x)+rv*.9,topY-bh,pw));
      const xl=cx-(cx-rx)*.22, xr=cx+(rx+rw-cx)*.22;
      member(cx,topY-bh,xl,yAt(xl)+rv*.9,th); member(cx,topY-bh,xr,yAt(xr)+rv*.9,th);
      rive([[rx,eaveY],[cx,peak],[rx+rw,eaveY]]);
      if(gout&&!wallSide) downpipe(svg,dpL,eaveY+rv,gndY,sc,rx+Math.max(3,0.08*sc));
      sTxt(svg,rx+rw*0.3,yAt(rx+rw*0.3)-6,`${d.pente}°`,8,'#888');
      sTxt(svg,rx+rw*0.7,yAt(rx+rw*0.7)-6,`${d.pente}°`,8,'#888');
    } else {
      // Vue de côté : pan de toiture jusqu'à l'égout (au-dessus de la sablière), rive d'égout, sablière sur les poteaux
      const eaveY=gndY-(d.hExt+d.rH-(d.L/2+d.ovL)*tgA)*sc;
      sRect(svg,rx,topY-rHpx,rw,eaveY-(topY-rHpx),real?patCouv(svg,cv,sc,rx,topY-rHpx,d.penteRad):'#d5d8dc',real?cv.c[1]:'#555',1.5);
      sabliere(); kneeBraces();
      beam(rx,eaveY,rw,rv); // bandeau d'égout : cache le bac acier et la gouttière
      if(gout&&!wallSide) downpipe(svg,dpL,eaveY+rv,gndY,sc);
      sTxtBg(svg,rx+rw/2,topY-rHpx/2,`pente ${d.pente}°`,8,'#888');
      sTxt(svg,rx+rw/2,topY-rHpx-8,'faîte',7,'#555');
    }
  } else if(d.toit==='1PAN'){
    // Pente vers la droite ou la gauche : profil vu de face et du fond (miroir), vues de côté dans le sens de la pente.
    // Pente vers le fond ou la façade : profil vu des côtés (gauche : face à gauche ; droite : fond à gauche).
    let highL=false, highR=false;
    if(isFace){
      const faiteG=orient==='droite', faiteD=orient==='gauche'; // faîte côté gauche / droit du carport
      if(side==='face'){highL=faiteG;highR=faiteD;} else {highL=faiteD;highR=faiteG;}
    } else {
      const faiteFace=orient==='fond', faiteFond=orient==='face';
      if(side==='gauche'){highL=faiteFace;highR=faiteFond;} else {highL=faiteFond;highR=faiteFace;}
    }
    const highY=topY-rHpx;
    // Longueur de toiture dans le sens de la pente et haut de la rive à l'égout (bas de pente)
    const slopeLen=((orient==='droite'||orient==='gauche')?d.L+d.ovL+d.ovR:d.P+d.ovF+d.ovB)*sc;
    const lowY=highY+slopeLen*tgA;
    if(!highL&&!highR){
      // Vue dans le sens de la pente
      const isHigh=(orient==='fond'&&side==='face')||(orient==='face'&&side==='fond')||
                   (orient==='droite'&&side==='gauche')||(orient==='gauche'&&side==='droite');
      if(isHigh){
        // Côté haut : on voit le dessous de la toiture qui descend vers l'égout du fond (sous-face), puis devant :
        // poteaux jusqu'au bandeau, sablière, bandeau sur toute la largeur de la toiture (cache le bac acier)
        underside(rx,highY+rv,rw,lowY+rv-(highY+rv));
        beam(rx,lowY,rw,rv); // bandeau d'égout du fond, vu de derrière (la gouttière est derrière lui)
        kneeBraces(); sabliere();
        ts.forEach(t=>postTop(baseX+(dW-ps)*t,highY+rv));
        beam(rx,highY,rw,rv);
        if(real) sLine(svg,rx,highY+rv*.5,rx+rw,highY+rv*.5,wood[1],.5);
        sTxt(svg,rx+rw/2,highY-6,'faîte (côté haut) — bandeau',7,'#555');
      } else {
        // Côté bas : le pan monte vers le fond de la vue ; égout au-dessus de la sablière
        sRect(svg,rx,highY,rw,lowY-highY,real?patCouv(svg,cv,sc,rx,highY,d.penteRad):'#d5d8dc',real?cv.c[1]:'#555',1.5);
        sabliere(); kneeBraces();
        beam(rx,lowY,rw,rv); // bandeau d'égout : cache le bac acier et la gouttière
        if(gout&&!wallSide) downpipe(svg,dpL,lowY+rv,gndY,sc);
        sTxtBg(svg,rx+rw/2,(highY+lowY)/2,`pente ${d.pente}° vers vous`,8,'#888');
        sTxt(svg,rx+rw/2,highY-7,'faîte (au fond)',7,'#555');
      }
    } else {
      // Ferme 1 pan : poteau côté haut jusqu'à la rive, entrait, montant, diagonale, rive épaisse
      const xs=rx, xe=rx+rw, lyL=highL?highY:lowY, lyR=highR?highY:lowY; // bas de pente : la rive passe au-dessus de l'entrait
      const yAt=x=>lyL+(lyR-lyL)*(x-xs)/(xe-xs||1);
      kneeBraces(); sabliere();
      const xp=highL?baseX:baseX+dW-ps;
      postTop(xp,yAt(xp+ps/2)+rv*.6);
      const xm=highL?baseX+dW*.45:baseX+dW*.55, xd=highL?baseX+dW*.24:baseX+dW*.76;
      vert(xm,yAt(xm)+rv*.9,topY-bh,pw); // montant
      member(highL?xp+ps:xp,topY-bh,xd,yAt(xd)+rv*.9,th); // diagonale
      rive([[xs,lyL],[xe,lyR]]);
      if(gout&&!wallSide) downpipe(svg,highL?dpR:dpL,(highL?lyR:lyL)+rv,gndY,sc,(highL?xe:xs)+(highL?-1:1)*Math.max(3,0.08*sc)); // sortie sous le bandeau
      sTxt(svg,rx+rw/2,(lyL+lyR)/2-8,`${d.pente}°`,8,'#888');
      sTxt(svg,highL?rx+3:rx+rw-3,Math.min(lyL,lyR)-6,'faîte',7,'#555',highL?'start':'end');
    }
  }

  // Dim lines
  dimL(svg,baseX,gndY,baseX+dW,gndY,`${viewW.toFixed(2)} m`,22);
  // Gauche : hauteur faîtage (haut du bandeau / faîte) ; droite : hauteur sous ferme
  const dimLx=Math.max(10,PAD.l*0.4);
  const totalH=d.hExt+d.rH;
  const topDim=isFlat?topY-Math.max(6,rHpx):topY-rHpx;
  dimL(svg,dimLx,topDim,dimLx,gndY,`H faîtage ${totalH.toFixed(2)} m`,-5);
  const dimRx=rx+rw+12;
  dimL(svg,dimRx,topY,dimRx,gndY,`${d.hInt.toFixed(2)} m sous ferme`,5,'#3498db');
  // HT width
  if(oL+oR>1){
    dimL(svg,rx,gndY,rx+rw,gndY,`HT ${(viewW+ovhgL+ovhgR).toFixed(2)} m`,36,'#e67e22');
  }
  drawScaleBar(svg,sc);
  // Espacement des poteaux : passage libre entre poteaux (et entraxe, d'axe à axe)
  if(!wallSide&&np>1){
    const esp=(viewW-d.wt)*(ts[1]-ts[0]);
    sTxtBg(svg,baseX+dW/2,gndY-hpx*0.4,`${np} poteaux — ${(esp-d.wt).toFixed(2)} m entre poteaux (entraxe ${esp.toFixed(2)} m)`,7,'#555');
  } else if(!wallSide&&np===1){
    sTxtBg(svg,baseX+dW/2,gndY-hpx*0.4,`1 poteau`,7,'#555');
  }
}

// ════════════════════════════════════════════════════════
// DRAW ROOF (shared between abri and carport)
// ════════════════════════════════════════════════════════
function drawRoof(svg,d,g,baseX,baseY,drawW,oL,oR,sc,vw){
  if(isReal()){drawRoofReal(svg,d,g,baseX,baseY,drawW,oL,oR,sc);return;}
  const rx=baseX-oL, rw=drawW+oL+oR;
  const roofH=g.rH*sc;

  if(g.roofT==='edge'){ // côté haut d'un 1 pan : rive du toit au-dessus du grand mur
    const t=Math.max(3,0.16*sc);
    sRect(svg,rx,baseY-t,rw,t,'#d5d8dc','#555',1.5);
    sTxt(svg,rx+rw/2,baseY-t-6,'faîte (côté haut)',7,'#555');
    return;
  }
  if(g.roofT==='flat'){
    const slabH=Math.max(8,0.39*sc); // 39cm réel
    sRect(svg,rx,baseY-slabH,rw,slabH,'#d5d8dc','#555',1.5);
    // Bac acier / EPDM line at top
    sLine(svg,rx,baseY-slabH+2,rx+rw,baseY-slabH+2,'#888',.8);
    return;
  }

  if(g.roofT==='triangle'){
    const ty=baseY-roofH;
    // Gable triangle stays within WALL bounds (not overhang)
    sPoly(svg,[[baseX,baseY],[baseX+drawW/2,ty],[baseX+drawW,baseY]],'#d5d8dc','#555',1.5);
    sLine(svg,baseX+drawW/2-4,ty,baseX+drawW/2+4,ty,'#555',2); // ridge
    sTxt(svg,baseX+(drawW*0.3),baseY-roofH*0.35,`${d.pente}°`,9,'#888');
    sTxt(svg,baseX+(drawW*0.7),baseY-roofH*0.35,`${d.pente}°`,9,'#888');
    // OVERHANG: slope lines continue beyond walls (just lines)
    const slopeRate=roofH/(drawW/2||1); // px rise per px horizontal
    if(oL>1){
      const extL=slopeRate*oL;
      sLine(svg,baseX,baseY,rx,baseY+extL,'#555',1.5); // left slope continues down
    }
    if(oR>1){
      const extR=slopeRate*oR;
      sLine(svg,baseX+drawW,baseY,rx+rw,baseY+extR,'#555',1.5); // right slope continues down
    }
    return;
  }

  if(g.roofT==='trapL'){
    // 1-PAN pignon: high left, low right
    // WALL part: filled triangle between wall tops
    const ty=baseY-roofH;
    sPoly(svg,[[baseX,baseY],[baseX,ty],[baseX+drawW,baseY]],'#d5d8dc','#555',1.5);
    sTxt(svg,baseX+drawW*0.35,baseY-roofH*0.3,`${d.pente}°`,9,'#888');
    sLine(svg,baseX-4,ty,baseX+8,ty,'#555',1.5);
    sTxt(svg,baseX-5,ty-3,'faîte',7,'#888','end');
    // OVERHANG: slope LINE continues beyond walls (just a line, not filled)
    const slopeRate=roofH/(drawW||1);
    if(g.ovhgL>0.01){
      const extL=slopeRate*(g.ovhgL*sc);
      sLine(svg,rx,ty-extL,baseX,ty,'#555',1.5); // line extends up-left
    }
    if(g.ovhgR>0.01){
      const extR=slopeRate*(g.ovhgR*sc);
      sLine(svg,baseX+drawW,baseY,rx+rw,baseY+extR,'#555',1.5); // line extends down-right
    }
    return;
  }

  if(g.roofT==='trapR'){
    // 1-PAN pignon: high right, low left
    const ty=baseY-roofH;
    sPoly(svg,[[baseX,baseY],[baseX+drawW,baseY],[baseX+drawW,ty]],'#d5d8dc','#555',1.5);
    sTxt(svg,baseX+drawW*0.65,baseY-roofH*0.3,`${d.pente}°`,9,'#888');
    sLine(svg,baseX+drawW-8,ty,baseX+drawW+4,ty,'#555',1.5);
    sTxt(svg,baseX+drawW+5,ty-3,'faîte',7,'#888','start');
    // OVERHANG: slope LINE continues beyond walls
    const slopeRate=roofH/(drawW||1);
    if(g.ovhgR>0.01){
      const extR=slopeRate*(g.ovhgR*sc);
      sLine(svg,baseX+drawW,ty,rx+rw,ty-extR,'#555',1.5); // line extends up-right
    }
    if(g.ovhgL>0.01){
      const extL=slopeRate*(g.ovhgL*sc);
      sLine(svg,rx,baseY+extL,baseX,baseY,'#555',1.5); // line extends down-left
    }
    return;
  }

  if(g.roofT==='slope2'){
    // 2-PANS from the side: near slope visible as a filled panel (WALL BOUNDS only)
    const ty=baseY-roofH, drop=(g.ovhgTop||0)*Math.tan(d.penteRad||0)*sc;
    // Roof body within wall bounds (jusqu'au bord du débord côté spectateur)
    sRect(svg,baseX,ty,drawW,roofH+drop,'#d5d8dc','#555',1.5);
    // Diagonal hatch lines inside wall bounds
    const step=12;
    for(let x=baseX;x<baseX+drawW+roofH;x+=step){
      const lx1=x,lx2=x-roofH*0.7;
      const ly1=ty,ly2=Math.min(baseY,ty+roofH*0.7);
      sLine(svg,Math.max(baseX,lx2),Math.min(baseY,ly2),Math.min(baseX+drawW,lx1),Math.max(ty,ly1),'#aaa',.5);
    }
    sLine(svg,baseX,baseY,baseX+drawW,baseY,'#555',1);
    sLine(svg,baseX,ty,baseX+drawW,ty,'#555',1.5);
    sTxt(svg,baseX+drawW/2,ty-8,'faîte',8,'#555');
    sTxt(svg,baseX+drawW/2,ty+roofH/2,`pente ${d.pente}°`,9,'#888');
    // OVERHANG: roof extends as lines beyond walls
    if(oL>1) sLine(svg,baseX,ty,rx,ty,'#555',1,'4 3'); // roof line extends left (at ridge level)
    if(oR>1) sLine(svg,baseX+drawW,ty,rx+rw,ty,'#555',1,'4 3'); // extends right
    if(oL>1) sLine(svg,baseX,baseY,rx,baseY,'#555',1,'4 3'); // eave extends left
    if(oR>1) sLine(svg,baseX+drawW,baseY,rx+rw,baseY,'#555',1,'4 3'); // eave extends right
    return;
  }

  if(g.roofT==='slope1'){
    // 1-PAN from the GUTTER/LOW side — slope goes into the page (away from viewer)
    // Near eave at baseY (wallH=hExt), far acrotère/faîte at baseY-roofH
    // Visible profile: rectangle spanning full height (near wall + slope body + far acrotère)
    const ty=baseY-roofH;
    const slabH=0; // pas d'acrotère : le pan monte jusqu'au faîte
    // Roof body (slope visible as filled rectangle, slope goes into page)
    sRect(svg,rx,ty-slabH,rw,roofH+slabH+(g.ovhgTop||0)*Math.tan(d.penteRad||0)*sc,'#d5d8dc','#555',1.5);
    // Diagonal hatch indicating slope goes away-and-upward into page
    const step=12;
    for(let x=rx;x<rx+rw+roofH;x+=step){
      const lx1=Math.min(rx+rw,x), ly1=Math.max(ty-slabH,ty+(x-(rx+rw))*0.6);
      const lx2=Math.max(rx,x-roofH*0.9), ly2=Math.min(baseY,ly1+roofH*0.9);
      if(lx1>rx-1&&lx2<rx+rw+1) sLine(svg,lx2,ly2,lx1,Math.max(ty-slabH,ly1),'#aaa',.5);
    }
    // Near eave line (gouttière side — near edge of roof)
    sLine(svg,rx,baseY,rx+rw,baseY,'#555',1.5);
    // Far acrotère line drawn by sRect border above
    // Labels
    sTxt(svg,rx+rw/2,ty-8,'faîte (au fond)',8,'#555');
    sTxt(svg,rx+2,baseY-6,'égout',7,'#888','start');
    sTxt(svg,rx+rw/2,ty+roofH/2,`pente ${d.pente}°`,9,'#888');
    return;
  }
}

// ════════════════════════════════════════════════════════
// DIMS TABLE
// ════════════════════════════════════════════════════════
function renderDims(d,tbl){
  // Épaisseur murs en mm (pas cm)
  const wtMm=Math.round(d.wt*1000);
  // Débords standards détaillés
  const debStd=d.isQuadro?'0 cm':`F:${(d.stdOvhgF*100).toFixed(0)} / B:${(d.stdOvhgB*100).toFixed(0)} / G:${(d.stdOvhgL*100).toFixed(0)} / D:${(d.stdOvhgR*100).toFixed(0)} cm`;

  if(ST.type==='carport'){
    const ADOS={gauche:'Adossé côté gauche',droite:'Adossé côté droit'};
    const crows=[
      ['Largeur hors tout', `${d.htL.toFixed(2)} m`],
      ['Profondeur hors tout', `${d.htP.toFixed(2)} m`],
      ['Largeur ext. poteaux', `${d.L.toFixed(2)} m`],
      ['Profondeur ext. poteaux', `${d.P.toFixed(2)} m`],
      ['Dim. int. poteaux', `${d.intL.toFixed(2)} × ${d.intP.toFixed(2)} m`],
      ['Hauteur sous ferme', `${d.hInt.toFixed(2)} m`],
      ['Hauteur faîtage', `${(d.hExt+d.rH).toFixed(2)} m`],
      ['Surface toiture', `${(d.htL*d.htP).toFixed(2)} m²`],
      ['Emprise poteaux', `${(d.L*d.P).toFixed(2)} m²`],
      d.ados!=='non'?['Implantation', ADOS[d.ados]]:null,
      ['Débord std.', debStd],
      d.uf>0?['+ Débord face', `${(d.uf*100).toFixed(0)} cm`]:null,
      d.ub>0?['+ Débord fond', `${(d.ub*100).toFixed(0)} cm`]:null,
      d.ul>0?['+ Débord gauche', `${(d.ul*100).toFixed(0)} cm`]:null,
      d.ur>0?['+ Débord droite', `${(d.ur*100).toFixed(0)} cm`]:null,
      ['Section poteaux', `${(d.wt*100).toFixed(0)}×${(d.wt*100).toFixed(0)} cm`],
      ['Nb. poteaux', `${d.nPosts} (${d.nRows} rangée${d.nRows>1?'s':''} de ${d.nCols})`],
    ].filter(Boolean);
    tbl.innerHTML=crows.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    return;
  }
  const rows=[
    ['Largeur ext.', `${d.L.toFixed(2)} m`],
    ['Profondeur ext.', `${d.P.toFixed(2)} m`],
    // Dimensions nominales si différentes (madrier toit plat)
    Math.abs(d.Lnom-d.L)>0.001?['Largeur nominale', `${d.Lnom.toFixed(2)} m`]:null,
    Math.abs(d.Pnom-d.P)>0.001?['Profondeur nominale', `${d.Pnom.toFixed(2)} m`]:null,
    ['Largeur int.', `${d.intL.toFixed(2)} m`],
    ['Profondeur int.', `${d.intP.toFixed(2)} m`],
    ['Hauteur intérieure', `${d.hInt.toFixed(2)} m`],
    d.rH>0?['Hauteur faîtage', `${(d.hExt+d.rH).toFixed(2)} m`]:null,
    ['Largeur hors tout', `${d.htL.toFixed(2)} m`],
    ['Profondeur hors tout', `${d.htP.toFixed(2)} m`],
    ['Surface ext.', `${(d.L*d.P).toFixed(2)} m²`],
    ['Surface int.', `${(d.intL*d.intP).toFixed(2)} m²`],
    ['Débord std.', debStd],
    d.uf>0?['+ Débord face', `${(d.uf*100).toFixed(0)} cm`]:null,
    d.ub>0?['+ Débord fond', `${(d.ub*100).toFixed(0)} cm`]:null,
    d.ul>0?['+ Débord gauche', `${(d.ul*100).toFixed(0)} cm`]:null,
    d.ur>0?['+ Débord droite', `${(d.ur*100).toFixed(0)} cm`]:null,
    ['Épaisseur murs', `${wtMm} mm`],
  ].filter(Boolean);
  tbl.innerHTML=rows.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('');
}

// ════════════════════════════════════════════════════════
// MENUISERIES
// ════════════════════════════════════════════════════════
// Champs de dessin (v2.7) : dr = modèle dessiné, vit = panneaux vitrés sur 4, leaves = vantaux,
// fr = teinte du cadre (vignette SketchUp du site), n = vitrages, nopx = pas de prix au site
const MPRESETS=[
  // ── PORTES CLASSIQUES BOIS ──
  {id:'pz80',       cat:'Porte classique bois',    label:'Porte Z simple 80×186',              type:'porte',  lw:80,  lh:186, sku:'PBSPZ', dr:'z', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.41.01.png'},
  {id:'pz140',      cat:'Porte classique bois',    label:'Porte Z double 140×186',             type:'porte',  lw:140, lh:186, sku:'PBDPZ', dr:'z', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.41.15.png'},
  {id:'pmort80',    cat:'Porte classique bois',    label:'Porte mortaisée simple semi-vitrée 80×186', type:'porte', lw:80, lh:186, sku:'PBSVZ', dr:'mort', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.41.29.png'},
  {id:'pmort140',   cat:'Porte classique bois',    label:'Porte mortaisée double semi-vitrée 140×186', type:'porte', lw:140, lh:186, sku:'PBDVZ', dr:'mort', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.41.40.png'},
  {id:'pcourch120', cat:'Porte classique bois',    label:'Porte Courchevel 3/4 vitrée 120×186', type:'porte', lw:120, lh:186, sku:'', nopx:true, dr:'courch', leaves:[.5,.5], img:''},
  {id:'ppl80',      cat:'Porte classique bois',    label:'Porte pleine 80×173',                type:'porte',  lw:80,  lh:173, sku:'', nopx:true, dr:'z', img:''},
  {id:'ppl140',     cat:'Porte classique bois',    label:'Porte pleine double 140×173',        type:'porte',  lw:140, lh:173, sku:'', nopx:true, dr:'z', img:''},
  {id:'ppfdv80',    cat:'Porte classique bois',    label:'Porte-fenêtre double vitrage 80×205', type:'porte', lw:80, lh:205, sku:'PBE80', dr:'pfdv', fr:'exo', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-09-24-a-15.02.22.png'},
  {id:'ppfdv120',   cat:'Porte classique bois',    label:'Porte-fenêtre double vitrage 120×205', type:'porte', lw:120, lh:205, sku:'PBE120', dr:'pfdv', fr:'exo', leaves:[.5,.5], img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-09-24-a-15.02.27.png'},
  // ── PORTES CLASSIQUES OSSATURE (bardées, H 186) ──
  {id:'pclsv',      cat:'Porte classique ossature',  label:'Porte simple bardée autoclave vert clin vertical 80×186',  type:'porte', lw:80,  lh:186, sku:'PCLSVV', dr:'bard', pent:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.59.21.png'},
  {id:'pcltv',      cat:'Porte classique ossature',  label:'Porte tierce bardée autoclave vert clin vertical 120×186', type:'porte', lw:120, lh:186, sku:'PCLTVV', dr:'bard', pent:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.59.30.png'},
  {id:'pcldv',      cat:'Porte classique ossature',  label:'Porte double bardée autoclave vert clin vertical 160×186', type:'porte', lw:160, lh:186, sku:'PCLDVV', dr:'bard', pent:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.59.11.png'},
  {id:'pclsb',      cat:'Porte classique ossature',  label:'Porte simple bardée autoclave brun clin vertical 80×186',  type:'porte', lw:80,  lh:186, sku:'PCLSBV', dr:'bard', pent:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.58.55.png'},
  {id:'pcltb',      cat:'Porte classique ossature',  label:'Porte tierce bardée autoclave brun clin vertical 120×186', type:'porte', lw:120, lh:186, sku:'PCLTBV', dr:'bard', pent:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.59.04.png'},
  {id:'pcldb',      cat:'Porte classique ossature',  label:'Porte double bardée autoclave brun clin vertical 160×186', type:'porte', lw:160, lh:186, sku:'PCLDBV', dr:'bard', pent:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.58.47.png'},
  {id:'pclsa',      cat:'Porte classique ossature',  label:'Porte simple bardée ayous clin vertical 80×186',  type:'porte', lw:80,  lh:186, sku:'PCLSAV', dr:'bard', pent:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.58.29.png'},
  {id:'pclta',      cat:'Porte classique ossature',  label:'Porte tierce bardée ayous clin vertical 120×186', type:'porte', lw:120, lh:186, sku:'PCLTAV', dr:'bard', pent:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.58.39.png'},
  {id:'pclda',      cat:'Porte classique ossature',  label:'Porte double bardée ayous clin vertical 160×186', type:'porte', lw:160, lh:186, sku:'PCLDAV', dr:'bard', pent:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.58.21.png'},
  // ── PORTES CONTEMPORAINES BOIS (4 panneaux, H 186) ──
  {id:'pcont1v',    cat:'Porte contemporaine bois', label:'Porte battante 3/4 vitrée 80×186',          type:'porte', lw:80,  lh:186, sku:'PBSV34', dr:'cont', vit:3, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.42.49.png'},
  {id:'pcont2v',    cat:'Porte contemporaine bois', label:'Porte battante double 3/4 vitrée 160×186',  type:'porte', lw:160, lh:186, sku:'PBDV34', dr:'cont', vit:3, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.41.51.png'},
  {id:'pcont1p',    cat:'Porte contemporaine bois', label:'Porte battante simple pleine 80×186',       type:'porte', lw:80,  lh:186, sku:'PBSP',   dr:'cont', vit:0, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.43.28.png'},
  {id:'pcont2p',    cat:'Porte contemporaine bois', label:'Porte battante double pleine 160×186',      type:'porte', lw:160, lh:186, sku:'PBDP',   dr:'cont', vit:0, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.42.25.png'},
  {id:'pcont1dv',   cat:'Porte contemporaine bois', label:'Porte battante simple 2/4 vitrée 80×186',   type:'porte', lw:80,  lh:186, sku:'PBSV24', dr:'cont', vit:2, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.43.03.png'},
  {id:'pcont1qv',   cat:'Porte contemporaine bois', label:'Porte battante simple 1/4 vitrée 80×186',   type:'porte', lw:80,  lh:186, sku:'PBSV14', dr:'cont', vit:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.43.17.png'},
  {id:'pcont2dv',   cat:'Porte contemporaine bois', label:'Porte battante double 2/4 vitrée 160×186',  type:'porte', lw:160, lh:186, sku:'PBDV24', dr:'cont', vit:2, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.42.04.png'},
  {id:'pcont2qv',   cat:'Porte contemporaine bois', label:'Porte battante double 1/4 vitrée 160×186',  type:'porte', lw:160, lh:186, sku:'PBDV14', dr:'cont', vit:1, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.42.15.png'},
  // ── PORTES CONTEMPORAINES OSSATURE (bardées, H 186) ──
  {id:'pcsaa',      cat:'Porte contemporaine ossature',  label:'Porte simple bardée Ayous aléatoire 80×186',   type:'porte', lw:80,  lh:186, sku:'PCSAA', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.56.26.png'},
  {id:'pcdaa',      cat:'Porte contemporaine ossature',  label:'Porte double bardée Ayous aléatoire 160×186',  type:'porte', lw:160, lh:186, sku:'PCDAA', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.56.15.png'},
  {id:'pcsnv',      cat:'Porte contemporaine ossature',  label:'Porte simple bardée autoclave noir vertical ajouré 80×186',  type:'porte', lw:80,  lh:186, sku:'PCSNV', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.56.59.png'},
  {id:'pcdnv',      cat:'Porte contemporaine ossature',  label:'Porte double bardée autoclave noir vertical ajouré 160×186', type:'porte', lw:160, lh:186, sku:'PCDNV', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.56.36.png'},
  {id:'pcsgv',      cat:'Porte contemporaine ossature',  label:'Porte simple bardée autoclave gris vertical ajouré 80×186',  type:'porte', lw:80,  lh:186, sku:'PCSGV', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.57.14.png'},
  {id:'pcdgv',      cat:'Porte contemporaine ossature',  label:'Porte double bardée autoclave gris vertical ajouré 160×186', type:'porte', lw:160, lh:186, sku:'PCDGV', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.57.07.png'},
  {id:'pcsbh',      cat:'Porte contemporaine ossature',  label:'Porte simple bardée autoclave brun clin horizontal 80×186',  type:'porte', lw:80,  lh:186, sku:'PCSBH', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.57.33.png'},
  {id:'pcdbh',      cat:'Porte contemporaine ossature',  label:'Porte double bardée autoclave brun clin horizontal 160×186', type:'porte', lw:160, lh:186, sku:'PCDBH', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.57.26.png'},
  {id:'pcsvh',      cat:'Porte contemporaine ossature',  label:'Porte simple bardée autoclave vert clin horizontal 80×186',  type:'porte', lw:80,  lh:186, sku:'PCSVH', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.57.55.png'},
  {id:'pcdvh',      cat:'Porte contemporaine ossature',  label:'Porte double bardée autoclave vert clin horizontal 160×186', type:'porte', lw:160, lh:186, sku:'PCDVH', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.57.46.png'},
  {id:'pcsah',      cat:'Porte contemporaine ossature',  label:'Porte simple bardée ayous clin horizontal 80×186',  type:'porte', lw:80,  lh:186, sku:'PCSAH', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.58.12.png'},
  {id:'pcdah',      cat:'Porte contemporaine ossature',  label:'Porte double bardée ayous clin horizontal 160×186', type:'porte', lw:160, lh:186, sku:'PCDAH', dr:'bard', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-29-a-17.58.03.png'},
  // ── PORTES COULISSANTES BOIS (rail extérieur) ──
  {id:'pcoul90v',   cat:'Porte coulissante bois',  label:'Coulissante vitrée 90×186 (autoclave vert)',  type:'porte', lw:90,  lh:186, sku:'PCSVv90', dr:'coul', vit:3, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.43.56.png'},
  {id:'pcoul140v',  cat:'Porte coulissante bois',  label:'Coulissante double vitrée 140×186 (autoclave vert)', type:'porte', lw:140, lh:186, sku:'PCDV140', dr:'coul', vit:3, leaves:[.5,.5], img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.44.24.png'},
  // ── PORTES COULISSANTES OSSATURE (rail intérieur) ──
  {id:'pcoul110av', cat:'Porte coulissante ossature', label:'Coulissante acidifié 110×186 (autoclave vert)', type:'porte', lw:110, lh:186, sku:'PCSVv1O', dr:'coulO', fr:'vert', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.45.02.png'},
  {id:'pcoul110ay', cat:'Porte coulissante ossature', label:'Coulissante acidifié Ayous 110×186', type:'porte', lw:110, lh:186, sku:'PCSPv1O', dr:'coulO', fr:'ayous', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.44.51.png'},
  {id:'pcoul110ag', cat:'Porte coulissante ossature', label:'Coulissante acidifié 110×186 (autoclave gris)', type:'porte', lw:110, lh:186, sku:'PCSVg1O', dr:'coulO', fr:'gris', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.44.38.png'},
  {id:'pcoul110al', cat:'Porte coulissante ossature', label:'Coulissante acidifié 110×186 (capotage ALU)', type:'porte', lw:110, lh:186, sku:'PCSVaO', dr:'coulO', fr:'alu', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.45.18.png'},
  // ── PORTES ALU / PVC ──
  {id:'palu80',     cat:'Porte ALU/PVC',           label:'Porte-fenêtre ALU 80×215 (RAL 7016)', type:'porte', lw:80, lh:215, sku:'PBSA80', fr:'alu', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.11.33.png'},
  {id:'ppvc90',     cat:'Porte ALU/PVC',           label:'Porte battante PVC 90×217 (RAL 7016/Blanc)', type:'porte', lw:90, lh:217, sku:'PBPVC90', fr:'alu', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.11.33.png'},
  // ── BAIES COULISSANTES ALU ──
  {id:'baie180',    cat:'Baie coulissante ALU',    label:'Baie vitrée coulissante ALU 180×217', type:'porte', lw:180, lh:217, sku:'BVA180', fr:'alu', n:2, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.39.22.png'},
  {id:'baie240',    cat:'Baie coulissante ALU',    label:'Baie coulissante DV 4/16/4 — 240×195 (RAL 7016)', type:'porte', lw:240, lh:195, sku:'BVA240', fr:'alu', n:2, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.39.50.png'},
  // ── FENÊTRES CLASSIQUES BOIS ──
  {id:'f49fix',     cat:'Fenêtre classique bois',  label:'Fenêtre fixe 49×93',                 type:'fenetre', lw:49, lh:93, sku:'FF49X93', dr:'croix', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-03-01-a-09.12.40.png'},
  {id:'f80fix',     cat:'Fenêtre classique bois',  label:'Fenêtre fixe 80×93',                 type:'fenetre', lw:80, lh:93, sku:'FF76X91', dr:'croix', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-03-01-a-09.12.44.png'},
  {id:'f49ouv',     cat:'Fenêtre classique bois',  label:'Fenêtre ouvrante 49×93',             type:'fenetre', lw:49, lh:93, sku:'FO49X73', dr:'croix', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-03-01-a-09.12.40.png'},
  {id:'f80ouv',     cat:'Fenêtre classique bois',  label:'Fenêtre ouvrante 80×93',             type:'fenetre', lw:80, lh:93, sku:'FO76X91', dr:'croix', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-03-01-a-09.12.44.png'},
  // Double vitrage : appellation hauteur × largeur (75×60 = 75 de haut, 60 de large)
  {id:'fdv75',      cat:'Fenêtre classique bois',  label:'Fenêtre double vitrage 75×60 (h 75 × l 60)',   type:'fenetre', lw:60,  lh:75, sku:'FE75O',  fr:'exo', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.17.48.png'},
  {id:'fdv95',      cat:'Fenêtre classique bois',  label:'Fenêtre double vitrage 95×60 (h 95 × l 60)',   type:'fenetre', lw:60,  lh:95, sku:'FE950',  fr:'exo', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.17.40.png'},
  {id:'fdv95120',   cat:'Fenêtre classique bois',  label:'Fenêtre double vitrage 95×120 (h 95 × l 120)', type:'fenetre', lw:120, lh:95, sku:'FE120O', fr:'exo', n:2, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.27.58.png'},
  // ── FENÊTRES CONTEMPORAINES (un seul vitrage, sans meneau) ──
  {id:'fhublot',    cat:'Fenêtre contemporaine',   label:'Hublot 91 cm',                       type:'fenetre', lw:91, lh:91, sku:'FHF91', fr:'vert', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.48.52.png'},
  {id:'fc9353',     cat:'Fenêtre contemporaine',   label:'Fenêtre fixe 93×53.5 cm',            type:'fenetre', lw:93, lh:53.5, sku:'FF91H', fr:'vert', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.49.08.png'},
  {id:'fc5393',     cat:'Fenêtre contemporaine',   label:'Fenêtre fixe 53.5×93 cm',            type:'fenetre', lw:53.5, lh:93, sku:'FF91V', fr:'vert', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-03-01-a-09.12.32.png'},
  {id:'fc20054',    cat:'Fenêtre contemporaine',   label:'Fenêtre fixe 200×54 cm',             type:'fenetre', lw:200, lh:54, sku:'FL200H', fr:'gris', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.18.25.png'},
  {id:'fc54200',    cat:'Fenêtre contemporaine',   label:'Fenêtre fixe 54×200 cm',             type:'fenetre', lw:54, lh:200, sku:'FL200V', fr:'gris', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.18.48.png'},
  {id:'fab80',      cat:'Fenêtre contemporaine',   label:'Fenêtre double vitrage abattante 80×45',  type:'fenetre', lw:80,  lh:45, sku:'FA80O',  fr:'exo', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.18.16.png'},
  {id:'fab120',     cat:'Fenêtre contemporaine',   label:'Fenêtre double vitrage abattante 120×45', type:'fenetre', lw:120, lh:45, sku:'FA120O', fr:'exo', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.17.57.png'},
  // ── FENÊTRES CONTEMPORAINES OSSATURE ──
  {id:'fhublotO',   cat:'Fenêtre contemporaine ossature', label:'Hublot 91 cm sur ossature',            type:'fenetre', lw:91, lh:91, sku:'FHF91O', fr:'vert', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.48.52.png'},
  {id:'fc5393O',    cat:'Fenêtre contemporaine ossature', label:'Fenêtre fixe 53,5×93 cm sur ossature', type:'fenetre', lw:53.5, lh:93, sku:'FF91OH', fr:'vert', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.49.08.png'},
  {id:'fc9353O',    cat:'Fenêtre contemporaine ossature', label:'Fenêtre fixe 93×53,5 cm sur ossature', type:'fenetre', lw:93, lh:53.5, sku:'FF91OV', fr:'vert', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-02-19-a-18.49.08.png'},
  {id:'fc54200O',   cat:'Fenêtre contemporaine ossature', label:'Fenêtre fixe 54×200 cm sur ossature',  type:'fenetre', lw:54, lh:200, sku:'FL200OH', fr:'gris', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.18.48.png'},
  {id:'fc20054O',   cat:'Fenêtre contemporaine ossature', label:'Fenêtre fixe 200×54 cm sur ossature',  type:'fenetre', lw:200, lh:54, sku:'FL200OV', fr:'gris', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.18.25.png'},
  // ── FENÊTRES ALU / PVC ──
  {id:'falu60',     cat:'Fenêtre ALU/PVC',         label:'Fenêtre ALU 60×95 (RAL 7016)',       type:'fenetre', lw:60, lh:95, sku:'FBA60', fr:'alu', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.11.47.png'},
  {id:'fpano120',   cat:'Fenêtre ALU/PVC',         label:'Fenêtre ALU panoramique 120×95 (RAL 7016)', type:'fenetre', lw:120, lh:95, sku:'FBA120', fr:'alu', n:2, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.11.40.png'},
  {id:'fpvc60',     cat:'Fenêtre ALU/PVC',         label:'Fenêtre PVC 60×95 (RAL 7016/Blanc)', type:'fenetre', lw:60, lh:95, sku:'FPVC60', fr:'alu', img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.11.47.png'},
  {id:'fpvc120',    cat:'Fenêtre ALU/PVC',         label:'Fenêtre PVC panoramique 120×95 (RAL 7016/Blanc)', type:'fenetre', lw:120, lh:95, sku:'FPVC120', fr:'alu', n:2, img:'https://abri-cerisier.fr/wp-content/uploads/2021/05/Capture-decran-2024-06-04-a-16.11.40.png'},
];
const presetOf=m=>MPRESETS.find(p=>p.id===m.preset)||{};
const isSliding=m=>/^coul/.test(presetOf(m).dr||'');
const isDoubleM=m=>(presetOf(m).leaves||[]).length===2||/double/i.test(m.label);
// Options par ouverture (codes de la table « menuiseries » du site)
const MOPTS={
  fenetre:[['','Aucune'],['VDF','Volets décoratifs fixes'],['VBF','Volets battants'],['115','Jardinière']],
  porte:[['','Aucune'],['VDP','Volets décoratifs fixes'],['VBP','Volets battants']],
};
const optLabel=m=>(MOPTS[m.type]||[]).find(o=>o[0]===m.opt)?.[1]||'';
// Hauteur du haut du mur (m) à l'abscisse xm d'une vue (pignons compris)
function wallTopAt(g,xm){
  if(g.roofT==='triangle'){const mid=g.w/2; return g.wallH+g.rH*Math.max(0,1-Math.abs(xm-mid)/mid);}
  if(g.roofT==='trapL') return g.wallH+g.rH*Math.max(0,1-xm/g.w);
  if(g.roofT==='trapR') return g.wallH+g.rH*Math.min(1,xm/g.w);
  return g.wallH;
}
// Contrôles des menuiseries : dépassement du mur, chevauchements, zone de coulissement, prix, côtés ouverts du carport
function menuWarnings(d){
  const W=[];
  const closed=ST.type==='carport'?closList():null;
  const box=m=>{const w=(m.wall==='face'||m.wall==='fond')?d.L:d.P, c=m.pos/100*w;
    return {w,x0:c-m.lw/200,x1:c+m.lw/200,y0:(m.seuil||0)/100,y1:((m.seuil||0)+m.lh)/100};};
  ST.menus.forEach((m,i)=>{
    const n=`Ouverture ${i+1}`, P=presetOf(m), b=box(m);
    if(P.nopx) W.push(`${n} (${m.label}) : pas de prix au site, non comptée dans le prix.`);
    if(ST.type==='carport'&&!closed.includes(m.wall)){W.push(`${n} : côté ${m.wall} ouvert, menuiserie non dessinée (fermer ce côté).`);return;}
    if(b.x0<-0.001||b.x1>b.w+0.001) W.push(`${n} : dépasse du mur ${m.wall} (${(b.w*100).toFixed(0)} cm de long).`);
    if(ST.type==='carport'){ if(b.y1>d.hInt+0.001) W.push(`${n} : plus haute que la fermeture (${d.hInt.toFixed(2)} m).`); }
    else {
      const g=getElevGeom(d,m.wall), top=Math.min(wallTopAt(g,Math.max(0,b.x0)),wallTopAt(g,Math.min(b.w,b.x1)));
      if(b.y1>top+0.001) W.push(`${n} : son haut (${(b.y1*100).toFixed(0)} cm) dépasse le haut du mur à cet endroit (${(top*100).toFixed(0)} cm). Baisser l'allège ou déplacer.`);
    }
    ST.menus.forEach((o,j)=>{
      if(j<=i||o.wall!==m.wall) return;
      const c=box(o);
      if(b.x0<c.x1&&c.x0<b.x1&&b.y0<c.y1&&c.y0<b.y1) W.push(`${n} et ouverture ${j+1} se chevauchent sur le mur ${m.wall}.`);
    });
    if(isSliding(m)){
      const zs=isDoubleM(m)?[[b.x0-m.lw/200,b.x0],[b.x1,b.x1+m.lw/200]]:(m.rail==='droite'?[[b.x1,b.x1+m.lw/100]]:[[b.x0-m.lw/100,b.x0]]);
      const ins=P.dr==='coulO'?' (à l\'intérieur)':'';
      zs.forEach(([a,z])=>{
        if(a<-0.001||z>b.w+0.001) W.push(`${n} : la porte coulissante sort du mur en position ouverte${ins} ; changer le côté du rail ou la position.`);
        ST.menus.forEach((o,j)=>{ if(j===i||o.wall!==m.wall) return; const c=box(o);
          if(a<c.x1&&c.x0<z&&c.y0<b.y1) W.push(`${n} : ouverte, la porte coulissante recouvre l'ouverture ${j+1}${ins}.`); });
      });
    }
  });
  return W;
}


return {ST,fv,closList,sousFace,CP_ENTRAIT,CP_RIVE,elevFit,commonScale,drawScaleBar,COUVERTURES,EXT_SIDES,FINITIONS,FR_COL,MOPTS,MPRESETS,NS,TEXN,WALL_T,calcDims,carportColsT,clr,couvFin,dimL,doorCladding,drawCarportElev,drawElev,drawExtElev,drawGarageDoorReal,drawGlass,drawGlassGrid,drawGround,drawHandle,drawHinges,drawLeafCont,drawMadrierCorners,drawMenuReal,drawPlan,drawPlanCarport,drawRoof,drawRoofReal,drawSlide,extFin,extGeom,extList,getElevGeom,isDoubleM,isReal,isSliding,menuFin,menuWarnings,optLabel,patBoards,patCouv,presetOf,r2,readCm,renderDims,rng,roofHAt,sArrow,sLine,sPath,sPoly,sRect,sTxt,sTxtBg,shade,slideZonesPx,svgEl,texDefs,texPat,viewMap,wallFin,wallTopAt};
})();
