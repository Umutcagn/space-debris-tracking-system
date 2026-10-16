// ── SEKME GEÇİŞ ──
function switchTab(tabId) {
  document.getElementById('view-main').style.display = (tabId==='main') ? 'block' : 'none';
  document.getElementById('view-heatmap').style.display = (tabId==='heatmap') ? 'block' : 'none';
  document.getElementById('view-debris').style.display = (tabId==='debris') ? 'block' : 'none';
  document.getElementById('panel-heatmap').style.display = (tabId==='heatmap') ? 'block' : 'none';
  document.getElementById('panel-debris').style.display = (tabId==='debris') ? 'block' : 'none';
  document.getElementById('tab-main').classList.toggle('active', tabId==='main');
  document.getElementById('tab-heatmap').classList.toggle('active', tabId==='heatmap');
  document.getElementById('tab-debris').classList.toggle('active', tabId==='debris');
  window.dispatchEvent(new Event('resize'));
}

const SATS = [
  {isim:'Türksat 4A',norad:39522,tip:'GEO',irtifa:35786,renk:0x60aaff,renkHex:'#60aaff',tle2:'2 39522   0.0600  88.2300 0001234 265.1234 244.8766  1.00270741 37024'},
  {isim:'Türksat 4B',norad:40985,tip:'GEO',irtifa:35786,renk:0x60aaff,renkHex:'#60aaff',tle2:'2 40985   0.0720  88.9200 0001456 275.2345 255.9876  1.00270741 30123'},
  {isim:'Türksat 5A',norad:47790,tip:'GEO',irtifa:35786,renk:0x60aaff,renkHex:'#60aaff',tle2:'2 47790   0.0480  89.5600 0001123 285.3456 234.7654  1.00270741 11234'},
  {isim:'Türksat 5B',norad:49077,tip:'GEO',irtifa:35786,renk:0x60aaff,renkHex:'#60aaff',tle2:'2 49077   0.0390  90.1200 0001345 295.4567 214.6543  1.00270741  5678'},
  {isim:'GÖKTÜRK-1', norad:41875,tip:'LEO',irtifa:681,renk:0x4ee8d0,renkHex:'#4ee8d0',tle2:'2 41875  97.9500  88.1234 0001234 267.5678  92.4321 14.88420000 42345'},
  {isim:'GÖKTÜRK-2', norad:38704,tip:'LEO',irtifa:686,renk:0x4ee8d0,renkHex:'#4ee8d0',tle2:'2 38704  98.1200  90.2345 0001456 258.6789 101.3210 14.88230000 67890'},
  {isim:'RASAT',     norad:37791,tip:'LEO',irtifa:689,renk:0x4ee8d0,renkHex:'#4ee8d0',tle2:'2 37791  98.3400  92.3456 0001678 249.7890 110.2109 14.87980000 89012'},
  {isim:'İMECE',     norad:55491,tip:'LEO',irtifa:680,renk:0x4ee8d0,renkHex:'#4ee8d0',tle2:'2 55491  97.7800  86.4567 0001890 276.8901  83.0988 14.88560000 12345'},
];

let ALERTS = [
  {tier:'RED',sat:'GÖKTÜRK-1',debris:40221,dist:0.082,vel:14.3,ml:0.78,tca_h:8.4,pc:1.2e-3},
  {tier:'RED',sat:'RASAT',debris:32789,dist:0.134,vel:12.7,ml:0.61,tca_h:19.2,pc:6.8e-4},
  {tier:'ORANGE',sat:'İMECE',debris:44562,dist:0.341,vel:11.2,ml:0.42,tca_h:31.5,pc:2.1e-4},
  {tier:'ORANGE',sat:'GÖKTÜRK-2',debris:38901,dist:0.412,vel:9.8,ml:0.38,tca_h:44.1,pc:1.4e-4},
  {tier:'ORANGE',sat:'GÖKTÜRK-1',debris:26548,dist:0.521,vel:13.1,ml:0.22,tca_h:52.3,pc:8.9e-5},
  {tier:'ORANGE',sat:'RASAT',debris:19045,dist:0.634,vel:8.4,ml:0.18,tca_h:58.7,pc:5.2e-5},
  {tier:'ORANGE',sat:'İMECE',debris:33712,dist:0.712,vel:10.5,ml:0.15,tca_h:63.9,pc:3.8e-5},
  {tier:'YELLOW',sat:'Türksat 4A',debris:45231,dist:1.24,vel:2.1,ml:0.06,tca_h:12.3,pc:1.1e-5},
  {tier:'YELLOW',sat:'Türksat 5A',debris:47812,dist:1.89,vel:1.8,ml:0.04,tca_h:24.6,pc:4.3e-6},
  {tier:'YELLOW',sat:'GÖKTÜRK-2',debris:29034,dist:2.11,vel:7.2,ml:0.03,tca_h:36.8,pc:2.8e-6},
  {tier:'YELLOW',sat:'RASAT',debris:31568,dist:2.45,vel:6.8,ml:0.02,tca_h:48.2,pc:1.5e-6},
  {tier:'YELLOW',sat:'İMECE',debris:42890,dist:2.78,vel:9.1,ml:0.02,tca_h:51.4,pc:9.2e-7},
];

function updateClock(){
  const s=new Date().toISOString().replace('T',' ').substring(0,19);
  document.getElementById('clock').textContent=s.substring(11)+' UTC';
}
updateClock(); setInterval(updateClock,1000);

function getCenterSize(){
  const c=document.getElementById('center-stage');
  return {w:c.clientWidth, h:c.clientHeight};
}

// ══════════════════════════════════════
// MOTOR 1: ANA EKRAN (BLOOM + UYDULAR)
// ══════════════════════════════════════
(function initGlobe(){
  const canvas=document.getElementById('globe-canvas');
  let {w,h}=getCenterSize();
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(w,h);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=0.9;

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x03080f);
  const camera=new THREE.PerspectiveCamera(40,w/h,0.01,1000);
  camera.position.z=3.2;

  const controls=new THREE.OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=0.05; controls.enablePan=false;

  // Post-Processing Bloom
  const renderPass=new THREE.RenderPass(scene,camera);
  const bloomPass=new THREE.UnrealBloomPass(new THREE.Vector2(w,h),0.8,0.3,0.9);
  bloomPass.threshold=0.3; bloomPass.strength=0.7; bloomPass.radius=0.3;
  const composer=new THREE.EffectComposer(renderer);
  composer.addPass(renderPass); composer.addPass(bloomPass);

  scene.add(new THREE.AmbientLight(0x223355,0.6));
  const sun=new THREE.DirectionalLight(0xfff0e0,1.8); sun.position.set(50,0,20); scene.add(sun);
  const fill=new THREE.DirectionalLight(0x4488ff,0.6); fill.position.set(-5,-2,-4); scene.add(fill);

  // Yıldızlar
  const sg=new THREE.BufferGeometry(),sp=new Float32Array(9000);
  for(let i=0;i<3000;i++){const t2=Math.random()*Math.PI*2,p2=Math.acos(2*Math.random()-1),r2=80+Math.random()*120;sp[i*3]=r2*Math.sin(p2)*Math.cos(t2);sp[i*3+1]=r2*Math.cos(p2);sp[i*3+2]=r2*Math.sin(p2)*Math.sin(t2);}
  sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
  scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.3,transparent:true,opacity:0.7})));

  // Dünya
  const ldr=new THREE.TextureLoader(); ldr.setCrossOrigin('anonymous');
  const dayT=ldr.load('https://unpkg.com/three-globe@2.30.0/example/img/earth-day.jpg');
  const nightT=ldr.load('https://unpkg.com/three-globe@2.30.0/example/img/earth-night.jpg');
  const cloudT=ldr.load('https://unpkg.com/three-globe@2.30.0/example/img/earth-clouds.png');
  const normT=ldr.load('https://unpkg.com/three-globe@2.30.0/example/img/earth-topology.png');

  const earthMat=new THREE.MeshPhongMaterial({map:dayT,emissiveMap:nightT,emissive:new THREE.Color(0xffeeaa),emissiveIntensity:0.08,bumpMap:normT,bumpScale:0.015,shininess:12});
  const earth=new THREE.Mesh(new THREE.SphereGeometry(1,64,64),earthMat);
  scene.add(earth);

  const clouds=new THREE.Mesh(new THREE.SphereGeometry(1.008,64,64),new THREE.MeshPhongMaterial({map:cloudT,transparent:true,opacity:0.45,depthWrite:false}));
  scene.add(clouds);

  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.03,32,32),new THREE.MeshBasicMaterial({color:0x2266cc,transparent:true,opacity:0.06,side:THREE.BackSide,depthWrite:false})));

  // SGP4
  function sgp4(sat,minutesSinceEpoch){
    const l2=sat.tle2;
    const inc=parseFloat(l2.substring(8,16))*Math.PI/180;
    const raan=parseFloat(l2.substring(17,25))*Math.PI/180;
    const ecc=parseFloat('0.'+l2.substring(26,33));
    const argP=parseFloat(l2.substring(34,42))*Math.PI/180;
    const ma0=parseFloat(l2.substring(43,51))*Math.PI/180;
    const mm=parseFloat(l2.substring(52,63));
    const mu=398600.4418,T=86400/mm,a=Math.cbrt(mu*(T/(2*Math.PI))**2),n=2*Math.PI/T,t=minutesSinceEpoch*60;
    const M=ma0+n*t; let E=M; for(let i=0;i<10;i++)E=M+ecc*Math.sin(E);
    const nu=2*Math.atan2(Math.sqrt(1+ecc)*Math.sin(E/2),Math.sqrt(1-ecc)*Math.cos(E/2));
    const r=a*(1-ecc*Math.cos(E)),u=argP+nu;
    return{x:r*(Math.cos(raan)*Math.cos(u)-Math.sin(raan)*Math.sin(u)*Math.cos(inc)),y:r*(Math.sin(raan)*Math.cos(u)+Math.cos(raan)*Math.sin(u)*Math.cos(inc)),z:r*Math.sin(u)*Math.sin(inc)};
  }
  function getGAST(d){const JD=d.getTime()/86400000+2440587.5;const T2=(JD-2451545)/36525;return((280.46061837+360.98564736629*(JD-2451545)+T2*T2*.000387933)%360)*Math.PI/180;}
  function toScreen(p){const v=p.clone().project(camera);return{x:(v.x+1)/2*canvas.clientWidth,y:(-v.y+1)/2*canvas.clientHeight,z:v.z};}

  // Uydu modelleri
  const satGroup=new THREE.Group(); scene.add(satGroup);
  const satMeshes=SATS.map(sat=>{
    const isGEO=sat.tip==='GEO'; const grp=new THREE.Group();
    const body=new THREE.Mesh(isGEO?new THREE.BoxGeometry(.016,.008,.008):new THREE.BoxGeometry(.012,.006,.006),new THREE.MeshStandardMaterial({color:0x000000,emissive:sat.renk,emissiveIntensity:2.0}));
    const panel=new THREE.Mesh(new THREE.BoxGeometry(isGEO?.04:.025,.0006,isGEO?.008:.006),new THREE.MeshPhongMaterial({color:0x112244,emissive:0x000011}));
    const ant=new THREE.Mesh(new THREE.CylinderGeometry(.0004,.0004,isGEO?.012:.008,4),new THREE.MeshBasicMaterial({color:0x888888}));
    ant.rotation.z=Math.PI/2; ant.position.y=isGEO?.01:.007;
    grp.add(body,panel,ant); grp.userData={sat,body}; satGroup.add(grp);
    return{grp,body,sat};
  });

  // Yörünge izleri
  const trails={};
  SATS.forEach(s=>{const tg=new THREE.BufferGeometry();const tp=new Float32Array(100*3);tg.setAttribute('position',new THREE.BufferAttribute(tp,3));tg.setDrawRange(0,0);const tl=new THREE.Line(tg,new THREE.LineBasicMaterial({color:s.renk,transparent:true,opacity:s.tip==='GEO'?.12:.22}));scene.add(tl);trails[s.norad]={tl,pos:[]};});

  // Enkaz parçacıkları
  const Nd=300;const dg=new THREE.BufferGeometry(),dp=new Float32Array(Nd*3),dc=new Float32Array(Nd*3);const dd=[];
  for(let i=0;i<Nd;i++){const hi=i<14;const r=1+(hi?681:680+Math.random()*300)/6371;const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);dp[i*3]=r*Math.sin(ph)*Math.cos(th);dp[i*3+1]=r*Math.sin(ph)*Math.sin(th);dp[i*3+2]=r*Math.cos(ph);if(hi){dc[i*3]=1;dc[i*3+1]=.24;dc[i*3+2]=.31}else{dc[i*3]=.22;dc[i*3+1]=.30;dc[i*3+2]=.38}dd.push({th,ph,r,dth:(.002+Math.random()*.006)*(Math.random()>.5?1:-1)});}
  dg.setAttribute('position',new THREE.BufferAttribute(dp,3));dg.setAttribute('color',new THREE.BufferAttribute(dc,3));
  scene.add(new THREE.Points(dg,new THREE.PointsMaterial({size:.009,vertexColors:true,transparent:true,opacity:.9})));

  const overlay=document.getElementById('globe-overlay');
  let simMin=new Date().getTime()/60000, timeMul=187.5, myTime=0;

  function animate(){
    requestAnimationFrame(animate);
    if(document.getElementById('view-main').style.display==='none') return;
    controls.update(); myTime+=0.016;
    simMin+=(0.016*timeMul)/60;
    const now=new Date(simMin*60000); const gast=getGAST(now);
    earth.rotation.y=gast-Math.PI/2; clouds.rotation.y=gast-Math.PI/2+(simMin*0.0001);

    satMeshes.forEach(({grp,body,sat})=>{
      const{x,y,z}=sgp4(sat,simMin); const S=1/6371;
      const pos=new THREE.Vector3(x*S,z*S,-y*S);
      grp.position.copy(pos); grp.lookAt(new THREE.Vector3(0,0,0));
      const al=ALERTS.find(a=>a.sat===sat.isim&&(a.tier==='RED'||a.tier==='ORANGE'));
      if(al){body.material.emissive.setHex(al.tier==='RED'?0xff2030:0xff5500);body.material.emissiveIntensity=3+2*Math.sin(myTime*6);}
      else{body.material.emissive.setHex(sat.renk);body.material.emissiveIntensity=2.0;}
      const tr=trails[sat.norad];if(tr){tr.pos.push(pos.clone());if(tr.pos.length>100)tr.pos.shift();const arr=tr.tl.geometry.attributes.position.array;tr.pos.forEach((p,i)=>{arr[i*3]=p.x;arr[i*3+1]=p.y;arr[i*3+2]=p.z});tr.tl.geometry.attributes.position.needsUpdate=true;tr.tl.geometry.setDrawRange(0,tr.pos.length);}
    });

    const pa=dg.attributes.position.array;
    dd.forEach((d,i)=>{d.th+=d.dth*.04;const p=new THREE.Vector3(d.r*Math.sin(d.ph)*Math.cos(d.th),d.r*Math.sin(d.ph)*Math.sin(d.th),d.r*Math.cos(d.ph));pa[i*3]=p.x;pa[i*3+1]=p.y;pa[i*3+2]=p.z;});
    dg.attributes.position.needsUpdate=true;

    let html='';
    satMeshes.forEach(({grp,sat})=>{const s=toScreen(grp.position);if(s.z>1)return;const al=ALERTS.find(a=>a.sat===sat.isim&&(a.tier==='RED'||a.tier==='ORANGE'));const cls=al?'alert':sat.tip==='GEO'?'geo':'leo';const ic=al?(al.tier==='RED'?'🔴':'🟠'):(sat.tip==='GEO'?'📡':'🛰');html+=`<div class="sat-label ${cls}" style="left:${s.x}px;top:${s.y}px">${ic} ${sat.isim}</div>`;});
    overlay.innerHTML=html;
    composer.render();
  }
  animate();
  window.addEventListener('resize',()=>{const{w,h}=getCenterSize();renderer.setSize(w,h);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});
})();

// ══════════════════════════════════════
// MOTOR 2: ISI HARİTASI 3D
// ══════════════════════════════════════
(function initHeatmap3D(){
  const canvas=document.getElementById('heatmap-canvas');
  const{w,h}=getCenterSize();
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(w,h);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,w/h,.1,1000); camera.position.set(0,10,30);
  const controls=new THREE.OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.05;controls.autoRotate=true;controls.autoRotateSpeed=.6;
  canvas.addEventListener('mousedown',()=>controls.autoRotate=false);

  const earth=new THREE.Mesh(new THREE.SphereGeometry(5,32,32),new THREE.MeshBasicMaterial({color:0x020617,wireframe:true,transparent:true,opacity:.3}));
  scene.add(earth);
  const heatGroup=new THREE.Group();
  function makeRing(radius,inc,passes,maxP){
    const pts=[];for(let i=0;i<=64;i++){const a=(i/64)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius));}
    const geo=new THREE.BufferGeometry().setFromPoints(pts);
    const ratio=passes/maxP;let col;if(ratio>.8)col=0xff2200;else if(ratio>.2)col=0x00ff44;else col=0x0088ff;
    const mat=new THREE.LineBasicMaterial({color:col,transparent:true,opacity:Math.max(.015,ratio*.05),blending:THREE.AdditiveBlending,depthWrite:false});
    const line=new THREE.Line(geo,mat);line.rotation.x=inc;line.rotation.y=Math.random()*Math.PI*2;return line;
  }
  for(let i=0;i<800;i++)heatGroup.add(makeRing(5.2+Math.random()*1.5,Math.random()*Math.PI,14582,15000));
  for(let i=0;i<200;i++)heatGroup.add(makeRing(7+Math.random()*6,Math.random()*Math.PI,3240,15000));
  for(let i=0;i<150;i++)heatGroup.add(makeRing(18+Math.random()*.1,(Math.random()-.5)*.02,450,15000));
  scene.add(heatGroup);

  function animate(){requestAnimationFrame(animate);if(document.getElementById('view-heatmap').style.display!=='none'){controls.update();earth.rotation.y+=.001;renderer.render(scene,camera);}}
  animate();
  window.addEventListener('resize',()=>{const{w,h}=getCenterSize();renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});
})();

// ══════════════════════════════════════
// MOTOR 3: ENKAZ BULUTU (KESSLER)
// ══════════════════════════════════════
(function initDebrisCloud(){
  const canvas=document.getElementById('debris-canvas');
  const{w,h}=getCenterSize();
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(w,h);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,w/h,.01,100); camera.position.set(0,1.5,4.5);
  const controls=new THREE.OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.05;controls.autoRotate=true;controls.autoRotateSpeed=.3;
  canvas.addEventListener('mousedown',()=>controls.autoRotate=false);

  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1,64,64),new THREE.MeshBasicMaterial({color:0x020617,wireframe:true,transparent:true,opacity:.3})));

  const N=22830,geo=new THREE.BufferGeometry(),pos=new Float32Array(N*3),col=new Float32Array(N*3),co=new THREE.Color();
  for(let i=0;i<N;i++){const r=1.01+Math.pow(Math.random(),4)*6.2;const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);pos[i*3]=r*Math.sin(ph)*Math.cos(th);pos[i*3+1]=r*Math.cos(ph);pos[i*3+2]=r*Math.sin(ph)*Math.sin(th);if(r<1.3)co.setHex(0xff3d50);else if(r<2)co.setHex(0x64748b);else if(r<5.5)co.setHex(0x334155);else co.setHex(0x3b82f6);col[i*3]=co.r;col[i*3+1]=co.g;col[i*3+2]=co.b;}
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const debPts=new THREE.Points(geo,new THREE.PointsMaterial({size:.002,vertexColors:true,transparent:true,opacity:.5}));
  scene.add(debPts);

  function animate(){requestAnimationFrame(animate);if(document.getElementById('view-debris').style.display!=='none'){controls.update();debPts.rotation.y+=.0004;renderer.render(scene,camera);}}
  animate();
  window.addEventListener('resize',()=>{const{w,h}=getCenterSize();renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});
})();

// ══════════════════════════════════════
// SAĞ PANEL: LİSTELER VE GRAFİKLER
// ══════════════════════════════════════
function buildSatList(){
  document.getElementById('sat-list').innerHTML=SATS.map(sat=>{
    const al=ALERTS.filter(a=>a.sat===sat.isim).sort((a,b)=>({RED:0,ORANGE:1,YELLOW:2,GREEN:3}[a.tier]-{RED:0,ORANGE:1,YELLOW:2,GREEN:3}[b.tier]))[0];
    const tier=al?al.tier:'GREEN';
    const tierTR={RED:'KRİTİK',ORANGE:'TURUNCU',YELLOW:'SARI',GREEN:'YEŞİL'};
    return `<div class="sat-item"><div class="sat-ico ${sat.tip.toLowerCase()}">${sat.tip}</div><div class="sat-info"><div class="sat-name">${sat.isim}</div><div class="sat-meta"><span>NORAD ${sat.norad}</span><span>${sat.irtifa.toLocaleString('tr')} km</span><span>${sat.tip==='GEO'?'Jeostasyoner':'Alçak Yörünge'}</span></div></div><div class="sat-risk"><div class="risk-badge r-${tier}">${tierTR[tier]}</div></div></div>`;
  }).join('');
}

function buildAlertList(){
  const tO={RED:0,ORANGE:1,YELLOW:2,GREEN:3};
  const sorted=[...ALERTS].sort((a,b)=>tO[a.tier]-tO[b.tier]);
  let r=0,o=0,y=0;
  ALERTS.forEach(a=>{if(a.tier==='RED')r++;if(a.tier==='ORANGE')o++;if(a.tier==='YELLOW')y++;});
  document.getElementById('m-red').textContent=r;
  document.getElementById('m-orange').textContent=o;
  document.getElementById('m-yellow').textContent=y;
  document.getElementById('alert-badge').textContent=ALERTS.length+' olay';
  if(r>0) document.getElementById('ban-text').textContent='AKTİF KAVUŞUM UYARISI — '+r+' KRİTİK OLAY (24 SAAT)';
  const tC={RED:'var(--red)',ORANGE:'var(--orange)',YELLOW:'var(--yellow)',GREEN:'var(--green)'};
  const tTR={RED:'KRİTİK',ORANGE:'TURUNCU',YELLOW:'SARI',GREEN:'YEŞİL'};
  document.getElementById('alert-list').innerHTML=sorted.map(a=>{
    const pc=a.pc>=1e-3?(a.pc*1e3).toFixed(2)+'×10⁻³':a.pc>=1e-4?(a.pc*1e4).toFixed(1)+'×10⁻⁴':(a.pc*1e5).toFixed(1)+'×10⁻⁵';
    return `<div class="alert-item"><div class="alert-tier r-${a.tier}">${tTR[a.tier]}</div><div class="alert-body"><div class="alert-title">${a.sat} × NORAD ${a.debris}</div><div class="alert-stats"><span>⏱ +${a.tca_h.toFixed(1)}s</span><span>📏 ${a.dist.toFixed(3)} km</span><span>⚡ ${a.vel.toFixed(1)} km/s</span><span>🤖 ${(a.ml*100).toFixed(0)}%</span></div></div><div class="alert-pc-wrap"><div class="alert-pc" style="color:${tC[a.tier]}">${pc}</div><div class="alert-pc-lbl">Pc</div></div></div>`;
  }).join('');
}

function buildHeatmap(){
  const el=document.getElementById('heatmap');
  const saatler=Array.from({length:18},(_,i)=>(i*4)+'s');
  const matris={};
  SATS.forEach(s=>matris[s.isim]=Array(18).fill(0));
  ALERTS.forEach(a=>{if(!matris[a.sat])return;const idx=Math.min(17,Math.floor(a.tca_h/4));const risk=a.tier==='RED'?1:a.tier==='ORANGE'?.65:a.tier==='YELLOW'?.3:.08;matris[a.sat][idx]=Math.max(matris[a.sat][idx],risk);});
  SATS.forEach(s=>{matris[s.isim]=matris[s.isim].map(v=>v>0?v+Math.random()*.04:Math.random()*.05);});
  function rc(v){if(v<.05)return'#0a1a0a';if(v<.15)return'#0e2c0e';if(v<.30)return'#1a5a1a';if(v<.50)return'#5a5800';if(v<.65)return'#8a3200';if(v<.82)return'#cc1f00';return'#ff1500';}
  let html=`<div class="hm-axis"><div style="width:68px;flex-shrink:0"></div>`;
  saatler.forEach(s=>html+=`<div class="hm-ax">${s}</div>`);
  html+=`</div>`;
  SATS.forEach(sat=>{
    html+=`<div class="hm-row"><div class="hm-lbl">${sat.isim.replace('Türksat ','TS')}</div>`;
    matris[sat.isim].forEach((v,i)=>{html+=`<div class="hm-cell" style="background:${rc(v)}" onmousemove="showTip(event,'${sat.isim}','${saatler[i]}','${Math.round(v*100)}')" onmouseleave="hideTip()"></div>`;});
    html+=`</div>`;
  });
  el.innerHTML=html;
}

function buildScatter(){
  const ctx=document.getElementById('scatter-chart').getContext('2d');
  const tC2={RED:'#ff3d50',ORANGE:'#ff6428',YELLOW:'#ffcc00'};
  const tS={RED:10,ORANGE:8,YELLOW:6};
  const tTR2={RED:'Kritik',ORANGE:'Turuncu',YELLOW:'Sarı'};
  const ds=['RED','ORANGE','YELLOW'].map(t=>({label:tTR2[t],data:ALERTS.filter(a=>a.tier===t).map(a=>({x:Math.log10(Math.max(a.pc,1e-9)),y:a.dist,raw:a})),backgroundColor:tC2[t]+'88',borderColor:tC2[t],borderWidth:1.5,pointRadius:tS[t],pointHoverRadius:tS[t]+3}));
  document.getElementById('scatter-legend').innerHTML=['RED','ORANGE','YELLOW'].map(t=>`<div class="cl-item"><div class="cl-dot" style="background:${tC2[t]}"></div>${tTR2[t]} (${ALERTS.filter(a=>a.tier===t).length})</div>`).join('');
  if(window._sc)window._sc.destroy();
  window._sc=new Chart(ctx,{type:'scatter',data:{datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#07111e',borderColor:'rgba(80,160,255,.3)',borderWidth:1,titleColor:'#ddeeff',bodyColor:'#6a96bc',padding:10,titleFont:{family:'Space Mono',size:11},bodyFont:{family:'Space Mono',size:10},callbacks:{title:c=>c[0].raw.raw.sat+' × '+c[0].raw.raw.debris,label:c=>{const d=c.raw.raw;return['Pc: '+d.pc.toExponential(2),'Mesafe: '+d.dist.toFixed(3)+' km','ML: '+(d.ml*100).toFixed(0)+'%']}}}},scales:{x:{title:{display:true,text:'log₁₀(Çarpışma Olasılığı)',color:'#6a96bc',font:{family:'Space Mono',size:10}},grid:{color:'rgba(80,160,255,.07)'},ticks:{color:'#2d5070',font:{family:'Space Mono',size:10},callback:v=>'10^'+v}},y:{title:{display:true,text:'Kaçış Mesafesi (km)',color:'#6a96bc',font:{family:'Space Mono',size:10}},grid:{color:'rgba(80,160,255,.07)'},ticks:{color:'#2d5070',font:{family:'Space Mono',size:10}}}}}});
}

function buildTimeline(){
  document.getElementById('timeline').innerHTML=[...ALERTS].filter(a=>a.tier!=='GREEN').sort((a,b)=>a.tca_h-b.tca_h).slice(0,10).map(a=>`<div class="tl-row"><div class="tl-lbl">${a.sat.replace('Türksat ','TS')}</div><div class="tl-track"><div class="tl-fill ${a.tier}" style="width:${(a.tca_h/72*100).toFixed(1)}%">${a.tca_h>10?'NORAD '+a.debris:''}</div></div><div class="tl-h">+${a.tca_h.toFixed(0)}s</div></div>`).join('');
}

function showTip(e,sat,saat,pct){const tt=document.getElementById('tooltip');document.getElementById('tt-title').textContent=sat+' · '+saat;document.getElementById('tt-body').innerHTML=`<div class="tt-row"><span>Risk skoru</span><span>%${pct}</span></div>`;tt.style.display='block';tt.style.left=(e.clientX+14)+'px';tt.style.top=(e.clientY-44)+'px';}
function hideTip(){document.getElementById('tooltip').style.display='none';}

function loadJSON(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{try{const raw=JSON.parse(e.target.result);const events=raw.scored_conjunctions||raw.alerts||(Array.isArray(raw)?raw:null);if(!events){alert('JSON formatı tanınmadı.');return}ALERTS=events.map(ev=>({tier:ev.final_tier||ev.tier||'GREEN',sat:SATS.find(s=>s.norad===(ev.turkish_norad_id||ev.norad))?.isim||'NORAD '+ev.turkish_norad_id,debris:ev.debris_norad_id||0,dist:ev.miss_distance_km||0,vel:ev.relative_velocity_km_s||0,ml:ev.ml_score||0,tca_h:ev.tca_hours_from_now||0,pc:ev.pc_analytic||0}));renderAll();}catch(err){alert('Hata: '+err.message)}};
  reader.readAsText(file);
}

function renderAll(){buildSatList();buildAlertList();buildHeatmap();buildScatter();buildTimeline();}
renderAll();
