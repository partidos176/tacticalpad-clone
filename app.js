// ===================== TacticalPad Clone =====================
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const SPORTS = {
  soccer: { name: 'Fútbol', aspect: 105/68, drawPitch: drawSoccerPitch },
};

const PITCH_IMAGES = {
  campo: '/campo%20completo%201.png',
  medio: '/medio%20campo%201.png',
  nada: '/limpio%201.png',
};

function uid(){ return 'id'+Math.random().toString(36).slice(2,9); }
const TASK_MODE = (typeof window !== 'undefined') && (window.APP_MODE === 'tareas' || /tareas/i.test(location.pathname));

const state = {
  sport: 'soccer',
  tool: 'select',
  penColor: '#ffffff',
  penSize: 3,
  arrowColor: '#ffcc00',
  home: { name: 'Local', color: '#e63946', players: [] },
  away: { name: 'Visitante', color: '#1d3557', players: [] },
  boards: [],
  activeBoardId: null,
  currentFrame: 0,
  playing: false,
  speed: 1,
  showNames: true,
  showBallPath: true,
  showNumbers: true,
  pitchType: 'campo',
  taskCounter: 1,
  taskName: '',
  pitchImg: null,
  pitchImgRotate: false,
  pitchImage: null,
  backgroundImage: null,
  bgImage: null,
  boardImage: null,
  image: null,
  pitchImgAspect: null,
  pitchImgLoaded: false,
  transparentBg: false,
  placeItem: null,
  selectedItem: null,
  selectedDrawing: null,
  _strokeClicked: null,
  copiedItem: null,
  copiedDrawing: null,
  // interaction
  dragging: null,
  dragMoved: false,
  dragStart: null,
  drawing: null, // current in-progress shape
  fastCounter: { home: 0, away: 0 },
};

let playI = 0, playT = 0, playStart = null, playRaf = null;
let currentFileHandle = null;

function initRosters(){
  state.home.players = [];
  state.away.players = [];
  for (let i=1;i<=11;i++){ state.home.players.push({id:uid(), name:'Jugador', num:i}); }
  for (let i=1;i<=11;i++){ state.away.players.push({id:uid(), name:'Jugador', num:i}); }
}
initRosters();

function getBoard(){ return state.boards.find(b=>b.id===state.activeBoardId) || null; }
function currentFrameObj(){ const b=getBoard(); if(!b) return null; return b.frames[state.currentFrame] || null; }

// ---------- Pitch drawing helpers ----------
function drawPitchBase(ctx, pr, lineColor='#ffffff'){
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(pr.x, pr.y, pr.w, pr.h);
}

function drawSoccerPitch(ctx, pr){
  drawPitchBase(ctx, pr);
  // center line
  ctx.beginPath();
  ctx.moveTo(pr.x+pr.w/2, pr.y);
  ctx.lineTo(pr.x+pr.w/2, pr.y+pr.h);
  ctx.stroke();
  // center circle
  const r = pr.h*0.12;
  ctx.beginPath();
  ctx.arc(pr.x+pr.w/2, pr.y+pr.h/2, r, 0, Math.PI*2);
  ctx.stroke();
  // penalty areas (simplified)
  const pw = pr.w*0.16, ph = pr.h*0.44;
  ctx.strokeRect(pr.x, pr.y + (pr.h-ph)/2, pw, ph);
  ctx.strokeRect(pr.x+pr.w-pw, pr.y + (pr.h-ph)/2, pw, ph);
  // goals
  const gw = pr.w*0.02, gh = pr.h*0.18;
  ctx.strokeRect(pr.x-gw, pr.y+(pr.h-gh)/2, gw, gh);
  ctx.strokeRect(pr.x+pr.w, pr.y+(pr.h-gh)/2, gw, gh);
}

function drawHalfPitch(ctx, pr){
  // outline half field
  ctx.strokeRect(pr.x, pr.y, pr.w, pr.h);
  // goal at left
  const gw = (pr.w*2)*0.02, gh = pr.h*0.18;
  ctx.strokeRect(pr.x-gw, pr.y+(pr.h-gh)/2, gw, gh);
  // penalty area
  const pw = (pr.w*2)*0.16, ph = pr.h*0.44;
  ctx.strokeRect(pr.x, pr.y+(pr.h-ph)/2, pw, ph);
  // center line? no (half field)
}
function drawBasketPitch(ctx, pr){
  drawPitchBase(ctx, pr);
  ctx.beginPath();
  ctx.moveTo(pr.x+pr.w/2, pr.y);
  ctx.lineTo(pr.x+pr.w/2, pr.y+pr.h);
  ctx.stroke();
  const r = pr.h*0.12;
  ctx.beginPath();
  ctx.arc(pr.x+pr.w/2, pr.y+pr.h/2, r, 0, Math.PI*2);
  ctx.stroke();
  // keys
  const kw = pr.w*0.17, kh = pr.h*0.4;
  ctx.strokeRect(pr.x, pr.y+(pr.h-kh)/2, kw, kh);
  ctx.strokeRect(pr.x+pr.w-kw, pr.y+(pr.h-kh)/2, kw, kh);
  // free throw circles
  ctx.beginPath();
  ctx.arc(pr.x+kw, pr.y+pr.h/2, pr.h*0.12, -Math.PI/2, Math.PI/2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pr.x+pr.w-kw, pr.y+pr.h/2, pr.h*0.12, Math.PI/2, -Math.PI/2, true);
  ctx.stroke();
}

function drawVolleyPitch(ctx, pr){
  drawPitchBase(ctx, pr);
  ctx.beginPath();
  ctx.moveTo(pr.x, pr.y+pr.h/2);
  ctx.lineTo(pr.x+pr.w, pr.y+pr.h/2);
  ctx.stroke();
  // attack lines
  const off = pr.h*0.16;
  ctx.beginPath();
  ctx.moveTo(pr.x, pr.y+off); ctx.lineTo(pr.x+pr.w, pr.y+off); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pr.x, pr.y+pr.h-off); ctx.lineTo(pr.x+pr.w, pr.y+pr.h-off); ctx.stroke();
}

function drawTennisPitch(ctx, pr){
  drawPitchBase(ctx, pr);
  const m = pr.h*0.08;
  ctx.strokeRect(pr.x+pr.w*0.1, pr.y+m, pr.w*0.8, pr.h-2*m);
  // net
  ctx.beginPath();
  ctx.moveTo(pr.x, pr.y+pr.h/2);
  ctx.lineTo(pr.x+pr.w, pr.y+pr.h/2);
  ctx.stroke();
  // service lines
  ctx.beginPath();
  ctx.moveTo(pr.x+pr.w/2, pr.y+m);
  ctx.lineTo(pr.x+pr.w/2, pr.y+pr.h-m);
  ctx.stroke();
}

// ---------- Canvas sizing ----------
function resizeCanvas(){
  const wrap = document.getElementById('canvasWrap');
  const rect = wrap.getBoundingClientRect();
  canvas.width = Math.floor(rect.width);
  canvas.height = Math.floor(rect.height);
  draw();
}
window.addEventListener('resize', resizeCanvas);

// ---------- Coordinate helpers ----------
function pitchRect(){
  let aspect;
  if (state.pitchImgLoaded && state.pitchImgAspect){
    aspect = state.pitchImgAspect;
  } else {
    aspect = SPORTS[state.sport].aspect;
    if (state.pitchType === 'medio') aspect = aspect / 2;
  }
  const margin = 30;
  const availW = canvas.width - margin*2;
  const availH = canvas.height - margin*2;
  let w,h;
  if (availW/availH > aspect){ h = availH; w = h*aspect; }
  else { w = availW; h = w/aspect; }
  const x = (canvas.width-w)/2;
  const y = (canvas.height-h)/2;
  return {x,y,w,h};
}
function canvasToNorm(cx,cy){
  const pr = pitchRect();
  return { x:(cx-pr.x)/pr.w, y:(cy-pr.y)/pr.h };
}
function normToCanvas(nx,ny){
  const pr = pitchRect();
  return { x: pr.x + nx*pr.w, y: pr.y + ny*pr.h };
}

// ---------- Rendering ----------
function drawPlayer(p){
  const pos = normToCanvas(p.x, p.y);
  const team = p.team==='home' ? state.home : state.away;
  const color = team.color;
  const radius = 14;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI*2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (state.showNumbers){
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // find player num
    const pl = team.players.find(x=>x.id===p.pid);
    const num = pl ? pl.num : '';
    ctx.fillText(num, pos.x, pos.y);
  }
  if (state.showNames){
    const pl = team.players.find(x=>x.id===p.pid);
    const name = pl ? (pl.name + (pl.num? '' : '')) : '';
    if (name && name!=='Jugador'){
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(name, pos.x, pos.y+radius+12);
    } else if (pl){
      // show number tag only? show num already
    }
  }
}

function drawStroke(stroke, highlight=false){
  const pts = Array.isArray(stroke) ? stroke : (stroke && stroke.points);
  if (!pts || pts.length<2) return;
  ctx.beginPath();
  ctx.moveTo(normToCanvas(pts[0].x,pts[0].y).x, normToCanvas(pts[0].x,pts[0].y).y);
  for (let i=1;i<pts.length;i++){
    const c = normToCanvas(pts[i].x,pts[i].y);
    ctx.lineTo(c.x,c.y);
  }
  if (highlight){
    ctx.strokeStyle = 'rgba(255,215,0,0.9)';
    ctx.lineWidth = ((stroke && stroke.size) || state.penSize) + 3;
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = (stroke && stroke.color) || state.penColor;
    ctx.lineWidth = (stroke && stroke.size) || state.penSize;
    ctx.setLineDash([]);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawArrowhead(x, y, ang, color){
  const hl = 18;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - hl*Math.cos(ang-Math.PI/6), y - hl*Math.sin(ang-Math.PI/6));
  ctx.lineTo(x - hl*Math.cos(ang+Math.PI/6), y - hl*Math.sin(ang+Math.PI/6));
  ctx.closePath();
  ctx.fillStyle = color || state.arrowColor;
  ctx.fill();
}
function drawLine(l, arrow=false, highlight=false){
  const a = normToCanvas(l.x1,l.y1);
  const b = normToCanvas(l.x2,l.y2);
  const color = l.color || state.arrowColor;
  let ctrl = null;
  if (l.deformed && typeof l.cx === 'number' && typeof l.cy === 'number'){
    ctrl = normToCanvas(l.cx, l.cy);
  }
  ctx.beginPath();
  ctx.moveTo(a.x,a.y);
  if (ctrl){ ctx.quadraticCurveTo(ctrl.x, ctrl.y, b.x, b.y); }
  else { ctx.lineTo(b.x,b.y); }
  if (highlight){
    ctx.strokeStyle = 'rgba(255,215,0,0.9)';
    ctx.lineWidth = (l.size || 2) + 3;
    if (l.dashed) ctx.setLineDash([6,4]); else ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = l.size || 2;
    if (l.dashed) ctx.setLineDash([6,4]); else ctx.setLineDash([]);
  }
  ctx.lineCap = 'butt';
  ctx.stroke();
  ctx.setLineDash([]);
  const arrowStart = (l.arrowStart === true) || (!l.hasOwnProperty('arrowStart') && l.type==='arrow' && false);
  const arrowEnd = (l.arrowEnd === true) || arrow || (l.type==='arrow');
  // for deformed curve, tangents
  if (arrowStart){
    let ang;
    if (ctrl){ ang = Math.atan2(ctrl.y - a.y, ctrl.x - a.x); }
    else { ang = Math.atan2(b.y - a.y, b.x - a.x); }
    drawArrowhead(a.x, a.y, ang + Math.PI, color);
  }
  if (arrowEnd){
    let ang;
    if (ctrl){ ang = Math.atan2(b.y - ctrl.y, b.x - ctrl.x); }
    else { ang = Math.atan2(b.y - a.y, b.x - a.x); }
    drawArrowhead(b.x, b.y, ang, color);
  }
  // draw control point handle if deformed
  if (ctrl){
    ctx.beginPath();
    ctx.arc(ctrl.x, ctrl.y, 8, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,215,0,0.9)';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }
}

function drawItem(it){
  const c = normToCanvas(it.x, it.y);
  const sc = it.scale || 1;
  const rot = it.rotation || 0;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  const col = it.color || null;
  if (it.type==='goal'){
    ctx.strokeStyle= col || '#fff'; ctx.lineWidth=2;
    ctx.strokeRect(-24,-12,48,24);
    // net
    ctx.beginPath();
    for (let i=-20;i<=20;i+=8){ ctx.moveTo(i,-12); ctx.lineTo(i,12); }
    for (let j=-8;j<=8;j+=8){ ctx.moveTo(-24,j); ctx.lineTo(24,j); }
    ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.stroke();
  } else if (it.type==='cone'){
    ctx.fillStyle= col || '#ff8c00';
    ctx.beginPath();
    ctx.moveTo(0,-12); ctx.lineTo(10,8); ctx.lineTo(-10,8); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle='#fff'; ctx.stroke();
  } else if (it.type==='marker'){
    ctx.fillStyle= col || '#ffff00';
    ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#333'; ctx.stroke();
  } else if (it.type==='ladder'){
    ctx.strokeStyle= col || '#fff'; ctx.lineWidth=2;
    ctx.strokeRect(-20,-6,40,12);
    for (let i=-16;i<=16;i+=8){
      ctx.beginPath(); ctx.moveTo(i,-6); ctx.lineTo(i,6); ctx.stroke();
    }
  } else if (it.type==='pole'){
    ctx.strokeStyle= col || '#00b4d8'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(0,18); ctx.stroke();
    ctx.fillStyle='#555';
    ctx.fillRect(-6,14,12,4);
  } else if (it.type==='hurdle'){
    ctx.strokeStyle= col || '#e63946'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-18,0); ctx.lineTo(18,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-18,-8); ctx.lineTo(-18,8); ctx.moveTo(18,-8); ctx.lineTo(18,8); ctx.stroke();
  } else if (it.type==='ball'){
    ctx.fillStyle= col || '#fff';
    ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#333'; ctx.stroke();
    ctx.fillStyle='#333';
    ctx.beginPath(); ctx.arc(0,0,2,0,Math.PI*2); ctx.fill();
  } else if (it.type==='hoop'){
    ctx.strokeStyle = col || '#ff8c00';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.stroke();
  }
  if (state.selectedItem === it){
    ctx.strokeStyle = 'rgba(255,215,0,0.9)';
    ctx.lineWidth = 2 / sc;
    ctx.setLineDash([4,4]);
    ctx.beginPath();
    ctx.arc(0,0,26,0,Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
function drawFrame(f){
  if (!f) return;
  const sd = state.selectedDrawing;
  // strokes
  (f.strokes||[]).forEach(s=>{
    const isSel = sd && sd.type==='stroke' && sd.obj === s;
    drawStroke(s, false);
    if (isSel){
      const pts = Array.isArray(s) ? s : (s && s.points);
      if (pts && pts.length){
        const c = normToCanvas(pts[0].x, pts[0].y);
        ctx.save();
        ctx.strokeStyle='rgba(255,215,0,0.9)';
        ctx.lineWidth=2;
        ctx.setLineDash([4,4]);
        ctx.beginPath();
        ctx.arc(c.x,c.y,16,0,Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  });
  // lines
  (f.lines||[]).forEach(l=>{
    const isSel = sd && sd.type==='line' && sd.obj === l;
    drawLine(l,false,false);
    if (isSel){
      const mx = (l.x1+l.x2)/2, my = (l.y1+l.y2)/2;
      const c = normToCanvas(mx, my);
      ctx.save();
      ctx.strokeStyle='rgba(255,215,0,0.9)';
      ctx.lineWidth=2;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      ctx.arc(c.x,c.y,16,0,Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  });
  // arrows
  (f.arrows||[]).forEach(a=>{
    const isSel = sd && sd.type==='arrow' && sd.obj === a;
    drawLine(a,true,false);
    if (isSel){
      const mx = (a.x1+a.x2)/2, my = (a.y1+a.y2)/2;
      const c = normToCanvas(mx, my);
      ctx.save();
      ctx.strokeStyle='rgba(255,215,0,0.9)';
      ctx.lineWidth=2;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      ctx.arc(c.x,c.y,16,0,Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  });
  // balls
  (f.balls||[]).forEach(b=>{
    const c = normToCanvas(b.x,b.y);
    ctx.beginPath();
    ctx.arc(c.x,c.y,8,0,Math.PI*2);
    ctx.fillStyle='#fff';
    ctx.fill();
    ctx.strokeStyle='#333';
    ctx.stroke();
  });
  // items (materiales)
  (f.items||[]).forEach(it=>drawItem(it));
  // ball path
  if (state.showBallPath && f!==null){
    // draw path across frames of board? handled separately
  }
  // players
  (f.players||[]).forEach(p=>drawPlayer(p));
}

function drawBallPath(){
  if (!state.showBallPath) return;
  const b = getBoard();
  if (!b || b.frames.length<2) return;
  // draw path of ball across all frames
  ctx.beginPath();
  let started=false;
  b.frames.forEach(f=>{
    if (f.balls && f.balls[0]){
      const c = normToCanvas(f.balls[0].x, f.balls[0].y);
      if (!started){ ctx.moveTo(c.x,c.y); started=true; }
      else ctx.lineTo(c.x,c.y);
    }
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4,4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function getRenderFrame(){
  const b = getBoard();
  if (!b) return null;
  if (state.playing && b.frames.length>=2){
    const a = b.frames[playI];
    const bb = b.frames[Math.min(playI+1, b.frames.length-1)];
    return interpolateFrames(a, bb, playT);
  }
  return b.frames[state.currentFrame];
}

function interpolateFrames(a,b,t){
  const players=[];
  const keys=new Set();
  (a.players||[]).forEach(p=>keys.add(p.team+':'+p.pid));
  (b.players||[]).forEach(p=>keys.add(p.team+':'+p.pid));
  keys.forEach(k=>{
    const [team,pid]=k.split(':');
    const pa=(a.players||[]).find(p=>p.team===team && p.pid===pid);
    const pb=(b.players||[]).find(p=>p.team===team && p.pid===pid);
    if (pa && pb){
      players.push({team,pid,x:pa.x+(pb.x-pa.x)*t, y:pa.y+(pb.y-pa.y)*t});
    } else if (pa){
      players.push({team,pid,x:pa.x,y:pa.y});
    } else if (pb){
      players.push({team,pid,x:pb.x,y:pb.y});
    }
  });
  const balls=[];
  const maxB=Math.max((a.balls||[]).length,(b.balls||[]).length);
  for (let i=0;i<maxB;i++){
    const ba=(a.balls||[])[i]; const bb=(b.balls||[])[i];
    if (ba && bb) balls.push({x:ba.x+(bb.x-ba.x)*t, y:ba.y+(bb.y-ba.y)*t});
    else if (ba) balls.push({x:ba.x,y:ba.y});
    else if (bb) balls.push({x:bb.x,y:bb.y});
  }
  return { players, balls, strokes:a.strokes, lines:a.lines, arrows:a.arrows, items:a.items };
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!state.transparentBg){
    ctx.fillStyle='#0d1b2a';
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  const pr = pitchRect();
  if (state.pitchImgLoaded && state.pitchImg){
    if (state.pitchImgRotate){
      ctx.save();
      ctx.translate(pr.x + pr.w/2, pr.y + pr.h/2);
      ctx.rotate(Math.PI/2);
      ctx.drawImage(state.pitchImg, -pr.h/2, -pr.w/2, pr.h, pr.w);
      ctx.restore();
    } else {
      ctx.drawImage(state.pitchImg, pr.x, pr.y, pr.w, pr.h);
    }
  } else if (state.pitchType === 'campo'){
    SPORTS[state.sport].drawPitch(ctx, pr);
  } else if (state.pitchType === 'medio'){
    drawHalfPitch(ctx, pr);
  }
  // nada: sin campo
  const f = getRenderFrame();
  if (f){
    drawBallPath();
    drawFrame(f);
  }
  // in-progress drawing preview
  if (state.drawing){
    if (state.drawing.type==='stroke'){
      drawStroke(state.drawing.points);
    } else if (state.drawing.type==='line' || state.drawing.type==='arrow'){
      const a = normToCanvas(state.drawing.x1,state.drawing.y1);
      const b = normToCanvas(state.drawing.x2,state.drawing.y2);
      if (Math.hypot(b.x-a.x,b.y-a.y) > 5) drawLine({x1:state.drawing.x1,y1:state.drawing.y1,x2:state.drawing.x2,y2:state.drawing.y2,color:state.arrowColor,size:state.penSize,dashed:false}, state.drawing.type==='arrow');
    }
  }
}

// ---------- Play loop ----------
function playLoop(now){
  if (!state.playing) return;
  const b = getBoard();
  if (!b || b.frames.length<2){ stopPlay(); return; }
  if (playStart===null) playStart=now;
  const elapsed = (now-playStart)/1000 * state.speed;
  const frameDur = 1.0;
  const n = b.frames.length;
  const total = (n-1)*frameDur;
  let p = elapsed % (total>0? total : 1);
  if (total<=0) p=0;
  playI = Math.min(Math.floor(p/frameDur), n-2);
  playT = (p/frameDur) - playI;
  if (playI < 0) playI=0;
  state.currentFrame = playI;
  updateFrameUI();
  draw();
  playRaf = requestAnimationFrame(playLoop);
}
function startPlay(){
  const b=getBoard();
  if (!b || b.frames.length<2) return;
  state.playing=true;
  playStart=null;
  playI=state.currentFrame;
  // adjust playStart so starts at current frame
  // We'll just start from current frame index by offsetting elapsed
  playStart = performance.now() - (state.currentFrame*1000/state.speed);
  requestAnimationFrame(playLoop);
  document.getElementById('btnPlay').textContent='Pause';
}
function stopPlay(){
  state.playing=false;
  if (playRaf) cancelAnimationFrame(playRaf);
  playRaf=null;
  document.getElementById('btnPlay').textContent='Play';
  draw();
}

// ---------- Hit testing ----------
function findPlayerAt(cx,cy){
  const f = currentFrameObj();
  if (!f) return null;
  const players = [...(f.players||[])].reverse();
  for (const p of players){
    const c = normToCanvas(p.x,p.y);
    const d = Math.hypot(c.x-cx, c.y-cy);
    if (d <= 16) return p;
  }
  return null;
}
function findItemAt(cx,cy){
  const f = currentFrameObj();
  if (!f) return null;
  const items = [...(f.items||[])].reverse();
  for (const it of items){
    const c = normToCanvas(it.x,it.y);
    if (Math.hypot(c.x-cx, c.y-cy) <= 18) return it;
  }
  return null;
}

function findStrokeAt(cx,cy){
  const f=currentFrameObj();
  if (!f) return null;
  // check arrows/lines
  const items = [...(f.arrows||[]), ...(f.lines||[])].map((it,idx)=>({it,idx,kind: (f.arrows.includes(it)?'arrow':'line')}));
  // simpler: iterate
  const all = [];
  (f.lines||[]).forEach((l,i)=>all.push({type:'line',index:i,obj:l}));
  (f.arrows||[]).forEach((a,i)=>all.push({type:'arrow',index:i,obj:a}));
  (f.strokes||[]).forEach((s,i)=>all.push({type:'stroke',index:i,obj:s}));
  for (let i=all.length-1;i>=0;i--){
    const e=all[i];
    if (e.type==='stroke'){
      const pts = Array.isArray(e.obj) ? e.obj : (e.obj && e.obj.points);
      const sz = (e.obj && e.obj.size) || state.penSize;
      for (const pt of (pts||[])){
        const c=normToCanvas(pt.x,pt.y);
        if (Math.hypot(c.x-cx,c.y-cy) <= Math.max(sz+4, 8)) return e;
      }
    } else {
      const l=e.obj;
      if (l.deformed && typeof l.cx === 'number' && typeof l.cy === 'number'){
        const a=normToCanvas(l.x1,l.y1), b=normToCanvas(l.x2,l.y2), c=normToCanvas(l.cx,l.cy);
        let best=Infinity;
        for (let i=0;i<=20;i++){
          const t=i/20;
          const x=(1-t)*(1-t)*a.x+2*(1-t)*t*c.x+t*t*b.x;
          const y=(1-t)*(1-t)*a.y+2*(1-t)*t*c.y+t*t*b.y;
          const d=Math.hypot(cx-x,cy-y);
          if (d<best) best=d;
        }
        if (best <= 10) return e;
        const cp=normToCanvas(l.cx,l.cy);
        if (Math.hypot(cx-cp.x,cy-cp.y) <= 10) return e;
      } else {
        const a=normToCanvas(l.x1,l.y1), b=normToCanvas(l.x2,l.y2);
        const dx=b.x-a.x, dy=b.y-a.y;
        const t = ((cx-a.x)*dx+(cy-a.y)*dy)/(dx*dx+dy*dy);
        const cl = Math.max(0,Math.min(1,t));
        const px=a.x+cl*dx, py=a.y+cl*dy;
        if (Math.hypot(cx-px,cy-py) <= 8) return e;
      }
    }
  }
  return null;
}

// ---------- Mouse interaction ----------
let isDown=false;
canvas.addEventListener('mousedown', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  if (state.playing) return;
  const f = currentFrameObj();
  if (!f) return;

  // drag control point of deformed line
  if (state.selectedDrawing && (state.selectedDrawing.type==='line' || state.selectedDrawing.type==='arrow') && state.selectedDrawing.obj && state.selectedDrawing.obj.deformed){
    const o = state.selectedDrawing.obj;
    const cp = normToCanvas(o.cx, o.cy);
    if (Math.hypot(cp.x-cx, cp.y-cy) <= 8){
      state.dragging = { control: o };
      isDown = true;
      draw();
      return;
    }
  }

  // placement of material
  if (state.placeItem){
    const norm = canvasToNorm(cx,cy);
    if (norm.x>=0 && norm.x<=1 && norm.y>=0 && norm.y<=1){
      f.items.push({type:state.placeItem, x:norm.x, y:norm.y, scale:1});
      state.placeItem = null;
      document.querySelectorAll('.mat').forEach(b=>b.classList.remove('active'));
      draw();
    }
    return;
  }
  // Select drawing element (stroke/line/arrow) on click
  const strokeHit = findStrokeAt(cx,cy);
  if (strokeHit){
    state.selectedDrawing = strokeHit;
    state.selectedItem = null;
    draw();
    // store for menu on mouseup
    state.dragging = null;
    state._strokeClicked = strokeHit;
    return;
  }
  // Drag material regardless of active tool
  const itHit = findItemAt(cx,cy);
  if (itHit){
    state.selectedItem = itHit;
    state.dragging = {item:itHit};
    state.dragMoved = false;
    state.dragStart = {x:cx, y:cy};
    isDown=true;
    const mcb = document.getElementById('matColorBtn');
    if (mcb) mcb.style.background = itHit.color || '#ffffff';
    const mr = document.getElementById('matRot');
    if (mr) mr.value = Math.round(((itHit.rotation||0)*180/Math.PI+360)%360);
    draw();
    return;
  }
  if (!strokeHit && !findItemAt(cx,cy)) state.selectedDrawing = null;
  if (state.tool==='select'){
    const it = findItemAt(cx,cy);
    if (it){
      state.selectedItem = it;
      state.dragging = {item:it};
      state.dragMoved = false;
      state.dragStart = {x:cx, y:cy};
      isDown=true;
      const mcb = document.getElementById('matColorBtn');
      if (mcb) mcb.style.background = it.color || '#ffffff';
      const mr = document.getElementById('matRot');
      if (mr) mr.value = Math.round(((it.rotation||0)*180/Math.PI+360)%360);
      draw();
      return;
    }
    const p = findPlayerAt(cx,cy);
    if (p){
      state.selectedItem = null;
      state.dragging = {player:p};
      isDown=true;
      draw();
      return;
    }
    state.selectedItem = null;
    state.selectedDrawing = null;
    draw();
    return;
  }
  if (state.tool==='fasthome' || state.tool==='fastaway'){
    const team = state.tool==='fasthome'?'home':'away';
    const roster = team==='home'?state.home.players:state.away.players;
    if (roster.length===0){
      roster.push({id:uid(), name:'Jugador', num: roster.length+1});
      renderRoster(team);
    }
    const idx = state.fastCounter[team];
    const pl = roster[idx % roster.length];
    const norm = canvasToNorm(cx,cy);
    if (norm.x>=0 && norm.x<=1 && norm.y>=0 && norm.y<=1){
      f.players.push({team, pid:pl.id, x:norm.x, y:norm.y});
      state.fastCounter[team]++;
      draw();
    }
    return;
  }
  if (state.tool==='pen'){
    const norm = canvasToNorm(cx,cy);
    state.drawing = {type:'stroke', points:[norm]};
    isDown=true;
    return;
  }
  if (state.tool==='line' || state.tool==='arrow'){
    const norm = canvasToNorm(cx,cy);
    state.drawing = {type: state.tool, x1:norm.x,y1:norm.y,x2:norm.x,y2:norm.y};
    isDown=true;
    return;
  }
  if (state.tool==='eraser'){
    const hit = findStrokeAt(cx,cy);
    if (hit){
      if (hit.type==='stroke') f.strokes.splice(hit.index,1);
      else if (hit.type==='line') f.lines.splice(hit.index,1);
      else if (hit.type==='arrow') f.arrows.splice(hit.index,1);
      draw();
    }
    // also remove player on right click? no
    return;
  }
  if (state.tool==='clearink'){
    f.strokes=[]; f.lines=[]; f.arrows=[];
    draw();
    return;
  }
});

canvas.addEventListener('mousemove', (e)=>{
  if (state.playing) return;
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const f = currentFrameObj();
  if (!f) return;
  if (state.dragging){
    if (state.dragStart){
      const dx = cx - state.dragStart.x;
      const dy = cy - state.dragStart.y;
      if (Math.hypot(dx,dy) > 3) state.dragMoved = true;
    } else {
      state.dragMoved = true;
    }
    const norm = canvasToNorm(cx,cy);
    if (state.dragging.control){
      state.dragging.control.cx = norm.x;
      state.dragging.control.cy = norm.y;
    } else if (state.dragging.player){
      state.dragging.player.x = norm.x;
      state.dragging.player.y = norm.y;
    } else if (state.dragging.item){
      state.dragging.item.x = norm.x;
      state.dragging.item.y = norm.y;
    }
    draw();
    return;
  }
  if (state.drawing){
    const norm = canvasToNorm(cx,cy);
    if (state.drawing.type==='stroke'){
      // only add if inside pitch
      if (norm.x>=0 && norm.x<=1 && norm.y>=0 && norm.y<=1) state.drawing.points.push(norm);
    } else {
      state.drawing.x2 = Math.max(0,Math.min(1,norm.x));
      state.drawing.y2 = Math.max(0,Math.min(1,norm.y));
    }
    draw();
  }
});

canvas.addEventListener('mouseup', (e)=>{
  if (state.playing) return;
  const f = currentFrameObj();
  if (!f) return;
  if (state.dragging){
    const wasItem = !!state.dragging.item;
    const wasMoved = state.dragMoved;
    const draggedItem = state.dragging.item;
    if (state.dragging.player){
      const p = state.dragging.player;
      if (p.x<0 || p.x>1 || p.y<0 || p.y>1){
        const idx = f.players.indexOf(p);
        if (idx>=0) f.players.splice(idx,1);
      } else {
        p.x = Math.max(0,Math.min(1,p.x));
        p.y = Math.max(0,Math.min(1,p.y));
      }
    } else if (state.dragging.item){
      const it = state.dragging.item;
      if (it.x<0 || it.x>1 || it.y<0 || it.y>1){
        const idx = f.items.indexOf(it);
        if (idx>=0) f.items.splice(idx,1);
      } else {
        it.x = Math.max(0,Math.min(1,it.x));
        it.y = Math.max(0,Math.min(1,it.y));
      }
    }
    state.dragging=null;
    if (wasItem && !wasMoved && draggedItem){
      showCtxMenu(e.clientX, e.clientY, draggedItem, f);
    }
    draw();
    return;
  }
  if (state._strokeClicked){
    const sc = state._strokeClicked;
    state._strokeClicked = null;
    showDrawingCtxMenu(e.clientX, e.clientY, sc, f);
    draw();
    return;
  }
  if (state.drawing){
    if (state.drawing.type==='stroke'){
      if (state.drawing.points && state.drawing.points.length >= 2) f.strokes.push({ points: state.drawing.points, color: state.penColor, size: state.penSize });
    } else if (state.drawing.type==='line'){
      const a = normToCanvas(state.drawing.x1,state.drawing.y1);
      const b = normToCanvas(state.drawing.x2,state.drawing.y2);
      const d = Math.hypot(b.x-a.x, b.y-a.y);
      if (d > 5) f.lines.push({x1:state.drawing.x1,y1:state.drawing.y1,x2:state.drawing.x2,y2:state.drawing.y2,color:state.arrowColor,size:state.penSize,dashed:false});
    } else if (state.drawing.type==='arrow'){
      const a = normToCanvas(state.drawing.x1,state.drawing.y1);
      const b = normToCanvas(state.drawing.x2,state.drawing.y2);
      const d = Math.hypot(b.x-a.x, b.y-a.y);
      if (d > 5) f.arrows.push({x1:state.drawing.x1,y1:state.drawing.y1,x2:state.drawing.x2,y2:state.drawing.y2,color:state.arrowColor,size:state.penSize,dashed:false});
    }
    state.drawing=null;
    draw();
  }
});

canvas.addEventListener('wheel', (e)=>{
  if (state.playing) return;
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const it = findItemAt(cx,cy) || state.selectedItem;
  if (!it) return;
  e.preventDefault();
  if (e.shiftKey){
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    it.rotation = (it.rotation||0) + delta;
    const rotEl = document.getElementById('matRot');
    if (rotEl) rotEl.value = Math.round(((it.rotation||0)*180/Math.PI+360)%360);
  } else {
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    it.scale = Math.max(0.3, Math.min(4, (it.scale||1)*delta));
  }
  state.selectedItem = it;
  draw();
}, {passive:false});

canvas.addEventListener('contextmenu', (e)=>{
  e.preventDefault();
  if (state.playing) return;
  const rect=canvas.getBoundingClientRect();
  const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
  const f=currentFrameObj();
  const it = findItemAt(cx,cy);
  if (it && f){
    state.selectedItem = it;
    const mcb = document.getElementById('matColorBtn');
    if (mcb) mcb.style.background = it.color || '#ffffff';
    showCtxMenu(e.clientX, e.clientY, it, f);
    return;
  }
  const p = findPlayerAt(cx,cy);
  if (p && f){
    const idx=f.players.indexOf(p);
    if (idx>=0) f.players.splice(idx,1);
    draw();
    return;
  }
  if (f && state.copiedItem){
    showCanvasCtxMenu(e.clientX, e.clientY, cx, cy);
  }
});

window.addEventListener('keydown', (e)=>{
  if (state.playing) return;
  if (e.key === 'Delete' || e.key === 'Backspace'){
    const f = currentFrameObj();
    if (f && state.selectedItem){
      const idx = f.items.indexOf(state.selectedItem);
      if (idx>=0) f.items.splice(idx,1);
      state.selectedItem = null;
      draw();
      e.preventDefault();
    }
  }
});
function showCtxMenu(x, y, it, f){
  const old = document.getElementById('ctxMenu');
  if (old) old.remove();
  const menu = document.createElement('div');
  menu.id = 'ctxMenu';
  menu.className = 'ctxmenu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const btnCopy = document.createElement('button');
  btnCopy.textContent = 'Copiar';
  btnCopy.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    state.copiedItem = { type: it.type, scale: it.scale||1, rotation: it.rotation||0, color: it.color || null };
    menu.remove();
  });
  menu.appendChild(btnCopy);

  const btnColor = document.createElement('button');
  btnColor.textContent = 'Cambiar color';
  btnColor.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    menu.remove();
    const pal = document.createElement('div');
    pal.className = 'ctxmenu';
    pal.style.left = (ev.clientX) + 'px';
    pal.style.top = (ev.clientY) + 'px';
    COLORS10.forEach(col=>{
      const sw = document.createElement('button');
      sw.textContent = '';
      sw.style.background = col;
      sw.style.width = '24px';
      sw.style.height = '24px';
      sw.style.border = '1px solid #888';
      sw.style.cursor = 'pointer';
      sw.addEventListener('click', (e2)=>{
        e2.stopPropagation();
        it.color = col;
        if (state.selectedItem === it) {
          const mcb = document.getElementById('matColorBtn');
          if (mcb) mcb.style.background = col;
        }
        draw();
        pal.remove();
      });
      pal.appendChild(sw);
    });
    document.body.appendChild(pal);
    const closePal = (e2)=>{
      if (!pal.contains(e2.target)){ pal.remove(); document.removeEventListener('click', closePal); }
    };
    setTimeout(()=>document.addEventListener('click', closePal),0);
  });
  menu.appendChild(btnColor);

  const btnPlus = document.createElement('button');
  btnPlus.textContent = '+ Agrandar';
  btnPlus.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    it.scale = Math.min(4, (it.scale||1) + 0.1);
    if (state.selectedItem === it) {
      const mr = document.getElementById('matRot');
      if (mr) mr.value = Math.round(((it.rotation||0)*180/Math.PI+360)%360);
    }
    draw();
  });
  menu.appendChild(btnPlus);

  const btnMinus = document.createElement('button');
  btnMinus.textContent = '- Reducir';
  btnMinus.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    it.scale = Math.max(0.3, (it.scale||1) - 0.1);
    if (state.selectedItem === it) {
      const mr = document.getElementById('matRot');
      if (mr) mr.value = Math.round(((it.rotation||0)*180/Math.PI+360)%360);
    }
    draw();
  });
  menu.appendChild(btnMinus);

  const btnDelete = document.createElement('button');
  btnDelete.textContent = 'Borrar';
  btnDelete.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    const idx = f.items.indexOf(it);
    if (idx>=0) f.items.splice(idx,1);
    if (state.selectedItem === it) state.selectedItem = null;
    menu.remove();
    draw();
  });
  menu.appendChild(btnDelete);

  document.body.appendChild(menu);

  const closeHandler = (ev)=>{
    if (!menu.contains(ev.target)){
      menu.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(()=>document.addEventListener('click', closeHandler), 0);
}

function showCanvasCtxMenu(x, y, cx, cy){
  const old = document.getElementById('ctxMenu');
  if (old) old.remove();
  const menu = document.createElement('div');
  menu.id = 'ctxMenu';
  menu.className = 'ctxmenu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  if (state.copiedItem){
    const btnPaste = document.createElement('button');
    btnPaste.textContent = 'Pegar material';
    btnPaste.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const f = currentFrameObj();
      if (f && state.copiedItem){
        const norm = canvasToNorm(cx, cy);
        if (norm.x>=0 && norm.x<=1 && norm.y>=0 && norm.y<=1){
          f.items.push({ type: state.copiedItem.type, x: norm.x, y: norm.y, scale: state.copiedItem.scale||1, rotation: state.copiedItem.rotation||0, color: state.copiedItem.color });
          draw();
        }
      }
      menu.remove();
    });
    menu.appendChild(btnPaste);
  }

  if (state.copiedDrawing){
    const btnPasteD = document.createElement('button');
    btnPasteD.textContent = 'Pegar dibujo';
    btnPasteD.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const f = currentFrameObj();
      if (f && state.copiedDrawing){
        const d = state.copiedDrawing;
        const norm = canvasToNorm(cx, cy);
        // offset from original first point to click
        if (d.type === 'stroke'){
          const pts = d.points || [];
          let ox = 0, oy = 0;
          if (pts.length){ ox = norm.x - pts[0].x; oy = norm.y - pts[0].y; }
          const newPts = pts.map(p=>({x: p.x + ox, y: p.y + oy}));
          f.strokes.push({ points: newPts, color: d.color, size: d.size });
        } else if (d.type === 'line' || d.type === 'arrow'){
          const arr = (d.type === 'line') ? f.lines : f.arrows;
          // offset based on first endpoint
          const ox = norm.x - d.x1;
          const oy = norm.y - d.y1;
          arr.push({ x1: d.x1 + ox, y1: d.y1 + oy, x2: d.x2 + ox, y2: d.y2 + oy, color: d.color, size: d.size, dashed: d.dashed });
        }
        draw();
      }
      menu.remove();
    });
    menu.appendChild(btnPasteD);
  }

  document.body.appendChild(menu);

  const closeHandler = (ev)=>{
    if (!menu.contains(ev.target)){
      menu.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(()=>document.addEventListener('click', closeHandler), 0);
}
function showDrawingCtxMenu(x, y, hit, f){
  const old = document.getElementById('ctxMenu');
  if (old) old.remove();
  const menu = document.createElement('div');
  menu.id = 'ctxMenu';
  menu.className = 'ctxmenu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const btnColor = document.createElement('button');
  btnColor.textContent = 'Cambiar color';
  btnColor.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    menu.remove();
    state.selectedDrawing = hit;
    const pal = document.createElement('div');
    pal.className = 'ctxmenu';
    pal.style.left = (ev.clientX) + 'px';
    pal.style.top = (ev.clientY) + 'px';
    COLORS10.forEach(col=>{
      const sw = document.createElement('button');
      sw.textContent = '';
      sw.style.background = col;
      sw.style.width = '24px';
      sw.style.height = '24px';
      sw.style.border = '1px solid #888';
      sw.style.cursor = 'pointer';
      sw.addEventListener('click', (e2)=>{
        e2.stopPropagation();
        if (hit.obj) hit.obj.color = col;
        draw();
        pal.remove();
      });
      pal.appendChild(sw);
    });
    document.body.appendChild(pal);
    const closePal = (e2)=>{
      if (!pal.contains(e2.target)){ pal.remove(); document.removeEventListener('click', closePal); }
    };
    setTimeout(()=>document.addEventListener('click', closePal),0);
  });
  menu.appendChild(btnColor);

  const btnCopy = document.createElement('button');
  btnCopy.textContent = 'Copiar';
  btnCopy.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    menu.remove();
    if (hit.type === 'stroke'){
      const pts = Array.isArray(hit.obj) ? hit.obj : (hit.obj && hit.obj.points);
      state.copiedDrawing = { type: 'stroke', points: (pts||[]).map(p=>({...p})), color: (hit.obj && hit.obj.color) || state.penColor, size: (hit.obj && hit.obj.size) || state.penSize };
    } else if (hit.type === 'line'){
      state.copiedDrawing = { type: 'line', x1: hit.obj.x1, y1: hit.obj.y1, x2: hit.obj.x2, y2: hit.obj.y2, color: hit.obj.color || state.arrowColor, size: hit.obj.size || 2, dashed: hit.obj.dashed };
    } else if (hit.type === 'arrow'){
      state.copiedDrawing = { type: 'arrow', x1: hit.obj.x1, y1: hit.obj.y1, x2: hit.obj.x2, y2: hit.obj.y2, color: hit.obj.color || state.arrowColor, size: hit.obj.size || 2, dashed: hit.obj.dashed };
    }
  });
  menu.appendChild(btnCopy);

  const btnThicker = document.createElement('button');
  btnThicker.textContent = 'Aumentar grosor';
  btnThicker.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    menu.remove();
    if (hit.obj){ hit.obj.size = (hit.obj.size || (hit.type==='stroke'?state.penSize:2)) + 1; }
    state.selectedDrawing = hit;
    draw();
  });
  menu.appendChild(btnThicker);

  const btnThinner = document.createElement('button');
  btnThinner.textContent = 'Disminuir grosor';
  btnThinner.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    menu.remove();
    if (hit.obj){ hit.obj.size = Math.max(1, (hit.obj.size || (hit.type==='stroke'?state.penSize:2)) - 1); }
    state.selectedDrawing = hit;
    draw();
  });
  menu.appendChild(btnThinner);

  if (hit.type === 'line' || hit.type === 'arrow'){
    const btnArrowStart = document.createElement('button');
    btnArrowStart.textContent = 'Flecha en origen';
    btnArrowStart.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      menu.remove();
      if (hit.obj) hit.obj.arrowStart = !hit.obj.arrowStart;
      state.selectedDrawing = hit;
      draw();
    });
    menu.appendChild(btnArrowStart);

    const btnArrowEnd = document.createElement('button');
    btnArrowEnd.textContent = 'Flecha en final';
    btnArrowEnd.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      menu.remove();
      if (hit.obj) hit.obj.arrowEnd = !hit.obj.arrowEnd;
      state.selectedDrawing = hit;
      draw();
    });
    menu.appendChild(btnArrowEnd);

    const btnDashed = document.createElement('button');
    btnDashed.textContent = 'Discontinua';
    btnDashed.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      menu.remove();
      if (hit.obj) hit.obj.dashed = !hit.obj.dashed;
      state.selectedDrawing = hit;
      draw();
    });
    menu.appendChild(btnDashed);

    const btnDeform = document.createElement('button');
    btnDeform.textContent = 'Deformar';
    btnDeform.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      menu.remove();
      if (hit.obj){
        if (hit.obj.deformed){
          hit.obj.deformed = false;
        } else {
          hit.obj.deformed = true;
          hit.obj.cx = (hit.obj.x1 + hit.obj.x2)/2;
          hit.obj.cy = (hit.obj.y1 + hit.obj.y2)/2 - 0.1;
        }
      }
      state.selectedDrawing = hit;
      draw();
    });
    menu.appendChild(btnDeform);
  }

  const btnDelete = document.createElement('button');
  btnDelete.textContent = 'Borrar';
  btnDelete.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    if (hit.type === 'stroke'){
      if (Array.isArray(f.strokes)) f.strokes.splice(hit.index,1);
    } else if (hit.type === 'line'){
      f.lines.splice(hit.index,1);
    } else if (hit.type === 'arrow'){
      f.arrows.splice(hit.index,1);
    }
    state.selectedDrawing = null;
    menu.remove();
    draw();
  });
  menu.appendChild(btnDelete);

  document.body.appendChild(menu);

  const closeHandler = (ev)=>{
    if (!menu.contains(ev.target)){
      menu.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(()=>document.addEventListener('click', closeHandler), 0);
}

state.sport = 'soccer';
function populateSports(){ /* solo fútbol */ }
populateSports();

document.querySelectorAll('.tool').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tool').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.tool=btn.dataset.tool;
    state.placeItem=null;
    document.querySelectorAll('.mat').forEach(b=>b.classList.remove('active'));
  });
});

const penColorEl = document.getElementById('penColor'); if (penColorEl) penColorEl.addEventListener('input', e=>state.penColor=e.target.value);
const penSizeEl = document.getElementById('penSize'); if (penSizeEl) penSizeEl.addEventListener('input', e=>state.penSize=+e.target.value);
const arrowColorEl = document.getElementById('arrowColor'); if (arrowColorEl) arrowColorEl.addEventListener('input', e=>state.arrowColor=e.target.value);

document.querySelectorAll('.mat').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.mat').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.placeItem = btn.dataset.mat;
    // deselect tools
    document.querySelectorAll('.tool').forEach(b=>b.classList.remove('active'));
    state.tool='select';
  });
});

const optNamesEl = document.getElementById('optNames');
if (optNamesEl) optNamesEl.addEventListener('change', e=>{state.showNames=e.target.checked; draw();});
const optBallPathEl = document.getElementById('optBallPath');
if (optBallPathEl) optBallPathEl.addEventListener('change', e=>{state.showBallPath=e.target.checked; draw();});
function loadPitchImage(type){
  const src = PITCH_IMAGES[type || state.pitchType];
  if (!src) { state.pitchImg=null; state.pitchImage=null; state.backgroundImage=null; state.bgImage=null; state.boardImage=null; state.image=null; state.pitchImgRotate=false; state.pitchImgLoaded=false; state.pitchImgAspect=null; draw(); return; }
  const img = new Image();
  img.onload = ()=>{
    state.pitchImg = img;
    state.pitchImage = img;
    state.backgroundImage = img;
    state.bgImage = img;
    state.boardImage = img;
    state.image = img;
    state.pitchImgRotate = (type === 'campo');
    state.pitchImgLoaded = true;
    state.pitchImgAspect = state.pitchImgRotate ? (img.naturalHeight / img.naturalWidth) : (img.naturalWidth / img.naturalHeight);
    draw();
  };
  img.onerror = ()=>{ state.pitchImg=null; state.pitchImage=null; state.backgroundImage=null; state.bgImage=null; state.boardImage=null; state.image=null; state.pitchImgRotate=false; state.pitchImgLoaded=false; state.pitchImgAspect=null; draw(); };
  state.pitchImgLoaded = false;
  img.src = src;
  state.pitchImg = img;
  state.pitchImage = img;
  state.backgroundImage = img;
  state.bgImage = img;
  state.boardImage = img;
  state.image = img;
}
const pitchSelectEl = document.getElementById('pitchSelect');
if (pitchSelectEl){
  pitchSelectEl.value = state.pitchType;
  pitchSelectEl.addEventListener('change', e=>{
    state.pitchType = e.target.value;
    const b = getBoard();
    if (b && Array.isArray(b.frames)){
      b.frames.forEach(fr=>{
        if (Array.isArray(fr.balls)){
          fr.balls = fr.balls.filter(ba => !(Math.abs((ba.x||0)-0.5) < 0.02 && Math.abs((ba.y||0)-0.5) < 0.02));
        }
      });
    }
    loadPitchImage(state.pitchType);
  });
}
loadPitchImage(state.pitchType);

const btnClearAll = document.getElementById('btnClearAll');
if (btnClearAll) btnClearAll.addEventListener('click', ()=>{
  const b = getBoard();
  if (b && Array.isArray(b.frames)){
    b.frames.forEach(fr=>{
      fr.players = [];
      fr.balls = [];
      fr.items = [];
      fr.strokes = [];
      fr.lines = [];
      fr.arrows = [];
    });
    state.currentFrame = 0;
    renderFrames();
    draw();
  }
});

// ---------- Task counter / name ----------
function renderTaskUI(){
  const c = document.getElementById('taskCounter');
  if (c && document.activeElement !== c) c.value = state.taskCounter;
  const inp = document.getElementById('taskName');
  if (inp && document.activeElement !== inp) inp.value = state.taskName || '';
}
const btnTaskPrev = document.getElementById('btnTaskPrev');
const btnTaskNext = document.getElementById('btnTaskNext');
if (btnTaskPrev) btnTaskPrev.addEventListener('click', ()=>{ if (state.taskCounter>1) state.taskCounter--; renderTaskUI(); });
if (btnTaskNext) btnTaskNext.addEventListener('click', ()=>{ state.taskCounter++; renderTaskUI(); });
const taskCounterInput = document.getElementById('taskCounter');
if (taskCounterInput) taskCounterInput.addEventListener('input', e=>{ const v = parseInt(e.target.value,10); if (!isNaN(v) && v>=1) state.taskCounter = v; });
const taskNameInput = document.getElementById('taskName');
if (taskNameInput) taskNameInput.addEventListener('input', e=>{ state.taskName = e.target.value; });
renderTaskUI();

const COLORS10 = ['#e63946','#ff8c00','#ffff00','#00b4d8','#1d3557','#ffffff','#000000','#2d6a4f','#9d4edd','#ff69b4'];
const matColorBtn = document.getElementById('matColorBtn');
const matColorPalette = document.getElementById('matColorPalette');
if (matColorPalette){
  matColorPalette.innerHTML = '';
  COLORS10.forEach(col=>{
    const sw = document.createElement('div');
    sw.className = 'colorswatch';
    sw.style.background = col;
    sw.addEventListener('click', ()=>{
      if (state.selectedItem){
        state.selectedItem.color = col;
        if (matColorBtn) matColorBtn.style.background = col;
        draw();
      } else if (state.selectedDrawing){
        const sd = state.selectedDrawing;
        if (sd.obj && !Array.isArray(sd.obj)){
          sd.obj.color = col;
        } else if (sd.type === 'stroke' && Array.isArray(sd.obj)){
          // convert legacy stroke array to object? leave as is
        }
        draw();
      }
      matColorPalette.classList.add('hidden');
    });
    matColorPalette.appendChild(sw);
  });
}
if (matColorBtn){
  matColorBtn.style.background = '#ffffff';
  matColorBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    if (matColorPalette) matColorPalette.classList.toggle('hidden');
  });
}
document.addEventListener('click', (e)=>{
  if (matColorPalette && !matColorPalette.contains(e.target) && e.target !== matColorBtn){
    matColorPalette.classList.add('hidden');
  }
});
const matRotEl = document.getElementById('matRot');
if (matRotEl) matRotEl.addEventListener('input', e=>{
  if (state.selectedItem){ state.selectedItem.rotation = (+e.target.value)*Math.PI/180; draw(); }
});

const homeNameEl = document.getElementById('homeName');
if (homeNameEl) homeNameEl.addEventListener('input', e=>state.home.name=e.target.value);
const homeColorEl = document.getElementById('homeColor');
if (homeColorEl) homeColorEl.addEventListener('input', e=>state.home.color=e.target.value);
const awayNameEl = document.getElementById('awayName');
if (awayNameEl) awayNameEl.addEventListener('input', e=>state.away.name=e.target.value);
const awayColorEl = document.getElementById('awayColor');
if (awayColorEl) awayColorEl.addEventListener('input', e=>state.away.color=e.target.value);

function renderRoster(teamKey){
  const container = teamKey==='home'?document.getElementById('homeRoster'):document.getElementById('awayRoster');
  const team = teamKey==='home'?state.home:state.away;
  container.innerHTML='';
  team.players.forEach((pl,idx)=>{
    const div=document.createElement('div');
    div.className='playeritem';
    div.innerHTML=`<span class="swatch" style="background:${team.color}"></span><span>${pl.num} ${pl.name}</span><button data-idx="${idx}">✕</button>`;
    div.querySelector('button').addEventListener('click', ()=>{
      team.players.splice(idx,1);
      renderRoster(teamKey);
    });
    container.appendChild(div);
  });
}
const addHomeBtn = document.getElementById('addHomePlayer');
if (addHomeBtn) addHomeBtn.addEventListener('click', ()=>{
  const name = prompt('Nombre jugador:','Jugador');
  const num = prompt('Número:',''+(state.home.players.length+1));
  state.home.players.push({id:uid(), name:name||'Jugador', num: num||''});
  renderRoster('home');
});
const addAwayBtn = document.getElementById('addAwayPlayer');
if (addAwayBtn) addAwayBtn.addEventListener('click', ()=>{
  const name = prompt('Nombre jugador:','Jugador');
  const num = prompt('Número:',''+(state.away.players.length+1));
  state.away.players.push({id:uid(), name:name||'Jugador', num: num||''});
  renderRoster('away');
});

if (document.getElementById('homeRoster')) renderRoster('home');
if (document.getElementById('awayRoster')) renderRoster('away');

// ---------- Boards ----------
function newBoard(type){
  const b = { id:uid(), name: type==='formation'?'Formación':'Animación', type, frames:[{players:[],balls:[],items:[],strokes:[],lines:[],arrows:[]}] };
  state.boards.push(b);
  state.activeBoardId=b.id;
  state.currentFrame=0;
  renderBoards();
  renderFrames();
  draw();
}
const btnNewFormation = document.getElementById('btnNewFormation');
if (btnNewFormation) btnNewFormation.addEventListener('click', ()=>newBoard('formation'));
const btnNewAnimation = document.getElementById('btnNewAnimation');
if (btnNewAnimation) btnNewAnimation.addEventListener('click', ()=>newBoard('animation'));

function renderBoards(){
  const c=document.getElementById('boardsList');
  if (!c) return;
  c.innerHTML='';
  state.boards.forEach(b=>{
    const div=document.createElement('div');
    div.className='boarditem'+(b.id===state.activeBoardId?' active':'');
    div.innerHTML=`<span>${b.name} (${b.type})</span><button data-id="${b.id}">✕</button>`;
    div.addEventListener('click', (e)=>{
      if (e.target.tagName==='BUTTON') return;
      state.activeBoardId=b.id;
      state.currentFrame=0;
      stopPlay();
      renderBoards();
      renderFrames();
      draw();
    });
    div.querySelector('button').addEventListener('click', (e)=>{
      e.stopPropagation();
      state.boards = state.boards.filter(x=>x.id!==b.id);
      if (state.activeBoardId===b.id) state.activeBoardId = state.boards.length?state.boards[0].id:null;
      state.currentFrame=0;
      renderBoards();
      renderFrames();
      draw();
    });
    c.appendChild(div);
  });
}

function renderFrames(){
  const c=document.getElementById('framesList');
  const info=document.getElementById('frameInfo');
  const b=getBoard();
  if (!b) { if (info) info.textContent='Sin tablero'; return; }
  if (c){
    c.innerHTML='';
    b.frames.forEach((f,i)=>{
      const chip=document.createElement('div');
      chip.className='framechip'+(i===state.currentFrame?' active':'');
      chip.textContent='Frame '+(i+1);
      chip.addEventListener('click', ()=>{
        if (state.playing) stopPlay();
        state.currentFrame=i;
        renderFrames();
        draw();
      });
      c.appendChild(chip);
    });
  }
  if (info) info.textContent=`Frame ${state.currentFrame+1}/${b.frames.length}`;
}

const wire = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
wire('btnPrevFrame', ()=>{ const b=getBoard(); if(!b) return; if (state.currentFrame>0) state.currentFrame--; renderFrames(); draw(); });
wire('btnNextFrame', ()=>{ const b=getBoard(); if(!b) return; if (state.currentFrame < b.frames.length-1) state.currentFrame++; renderFrames(); draw(); });
wire('btnAddFrame', ()=>{ const b=getBoard(); if(!b) return; const cur = b.frames[state.currentFrame]; const nf = { players: (cur.players||[]).map(p=>({...p})), balls:(cur.balls||[]).map(x=>({...x})), items:(cur.items||[]).map(x=>({...x})), strokes:[], lines:[], arrows:[] }; b.frames.splice(state.currentFrame+1,0,nf); state.currentFrame++; renderFrames(); draw(); });
wire('btnDupFrame', ()=>{ const b=getBoard(); if(!b) return; const cur = b.frames[state.currentFrame]; const nf = JSON.parse(JSON.stringify(cur)); b.frames.splice(state.currentFrame+1,0,nf); state.currentFrame++; renderFrames(); draw(); });
wire('btnDelFrame', ()=>{ const b=getBoard(); if(!b || b.frames.length<=1) return; b.frames.splice(state.currentFrame,1); if (state.currentFrame>=b.frames.length) state.currentFrame=b.frames.length-1; renderFrames(); draw(); });
const btnPlayEl = document.getElementById('btnPlay');
if (btnPlayEl) btnPlayEl.addEventListener('click', ()=>{ if (state.playing) stopPlay(); else startPlay(); });
const speedEl = document.getElementById('speed');
if (speedEl) speedEl.addEventListener('input', (e)=>{ state.speed=+e.target.value; const sv=document.getElementById('speedVal'); if (sv) sv.textContent=state.speed+'x'; });

// ---------- New/Open/Save ----------
document.getElementById('btnNewProject').addEventListener('click', ()=>{
  if (confirm('¿Nuevo proyecto? Se perderán cambios no guardados.')){ currentFileHandle = null;
    state.boards=[]; state.activeBoardId=null; state.currentFrame=0;
    state.fastCounter={home:0,away:0};
    state.taskName=''; state.taskCounter=1;
    const notesEl=document.getElementById('notes'); if (notesEl) notesEl.value='';
    renderTaskUI();
    newBoard('formation');
    initRosters();
    const hn=document.getElementById('homeName'); if (hn) hn.value=state.home.name;
    const an=document.getElementById('awayName'); if (an) an.value=state.away.name;
    if (document.getElementById('homeRoster')) renderRoster('home');
    if (document.getElementById('awayRoster')) renderRoster('away');
    renderBoards(); renderFrames(); draw();
  }
});
document.getElementById('btnOpenProject').addEventListener('click', async ()=>{
  if (window.showOpenFilePicker){
    try {
      const [handle] = await window.showOpenFilePicker({ types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
      currentFileHandle = handle;
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      currentFileHandle._origNum = data.taskCounter;
      openProjectData(data);
      return;
    } catch(e){
      if (e && e.name === 'AbortError') return;
      // fallback to input
    }
  }
  document.getElementById('fileOpen').click();
});
function openProjectData(data){
  try {
    state.sport='soccer';
    state.home=data.home; state.away=data.away;
    state.boards=data.boards||[];
    state.boards.forEach(b=>{ if (b && Array.isArray(b.frames)) b.frames.forEach(fr=>{ if (Array.isArray(fr.balls)) fr.balls = fr.balls.filter(ba=>!(Math.abs((ba.x||0)-0.5)<0.02 && Math.abs((ba.y||0)-0.5)<0.02)); }); });
    if (data.pitchType){ state.pitchType=data.pitchType; if (pitchSelectEl) pitchSelectEl.value=state.pitchType; loadPitchImage(state.pitchType); }
    if (typeof data.taskCounter === 'number') state.taskCounter = data.taskCounter;
    if (typeof data.taskName === 'string') state.taskName = data.taskName;
    if (typeof data.notes === 'string'){ const n=document.getElementById('notes'); if (n) n.value = data.notes; }
    renderTaskUI();
    if (data.activeBoardId && state.boards.some(b=>b.id===data.activeBoardId)) state.activeBoardId = data.activeBoardId; else state.activeBoardId = state.boards.length ? state.boards[0].id : null;
    state.currentFrame=0;
    const hn2=document.getElementById('homeName'); if (hn2) hn2.value=state.home.name;
    const hc2=document.getElementById('homeColor'); if (hc2) hc2.value=state.home.color;
    const an2=document.getElementById('awayName'); if (an2) an2.value=state.away.name;
    const ac2=document.getElementById('awayColor'); if (ac2) ac2.value=state.away.color;
    if (document.getElementById('homeRoster')) renderRoster('home');
    if (document.getElementById('awayRoster')) renderRoster('away');
    renderBoards(); renderFrames(); draw();
  } catch(err){ console.error(err); }
}
window.openProjectData = openProjectData;

document.getElementById('fileOpen').addEventListener('change', (e)=>{
  currentFileHandle = null;
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try {
      const data=JSON.parse(reader.result);
      openProjectData(data);
    } catch(err){ alert('Error al abrir: '+err.message); }
  };
  reader.readAsText(file);
  e.target.value='';
});

// Support rendering task images from other pages (e.g. sesion presentation)
window.addEventListener('message', (e)=>{
  const d = e.data || {};
  if (d.type === 'loadTask'){
    try { state.transparentBg = true; openProjectData(d.data); } catch(err){}
    const delay = 1500;
    setTimeout(()=>{
      try { draw(); } catch(err){}
      try {
        const url = canvas.toDataURL('image/png');
        e.source.postMessage({ type:'taskImage', id:d.id, url, notes: (document.getElementById('notes')?.value || ''), taskCounter: state.taskCounter, taskName: state.taskName }, '*');
      } catch(err){}
    }, delay);
  }
});
document.getElementById('btnSaveProject').addEventListener('click', async ()=>{
  const name = (state.taskName || '').trim();
  if (!name){ alert('No se puede guardar sin nombre de tarea.'); return; }
  const safe = name.replace(/[<>:"/\\|?*]/g,'_');
  const notesVal = (document.getElementById('notes')?.value || '');
  const data={ sport:state.sport, pitchType:state.pitchType, taskCounter:state.taskCounter, taskName:state.taskName, notes: notesVal, activeBoardId: state.activeBoardId, home:state.home, away:state.away, boards:state.boards };

  // Check for duplicate task number among saved tasks
  const registry = JSON.parse(localStorage.getItem('savedTaskNumbers') || '[]');
  const originalNum = currentFileHandle ? currentFileHandle._origNum : null;
  const others = registry.filter(n => n !== originalNum);
  if (others.includes(state.taskCounter)){
    alert('NUMERO DE TAREA REPETIDO');
    return;
  }

  // If we have a handle from a previous open/save, overwrite it
  if (currentFileHandle){
    try {
      const writable = await currentFileHandle.createWritable();
      await writable.write(JSON.stringify(data,null,2));
      await writable.close();
      // update registry
      const idx = registry.indexOf(originalNum);
      if (idx >= 0) registry.splice(idx, 1);
      if (!registry.includes(state.taskCounter)) registry.push(state.taskCounter);
      localStorage.setItem('savedTaskNumbers', JSON.stringify(registry));
      currentFileHandle._origNum = state.taskCounter;
      alert('Guardado (sobrescrito).');
      return;
    } catch(e){ /* fall through */ }
  }

  // Otherwise ask where to save and remember handle for future overwrites
  if (window.showSaveFilePicker){
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: safe + '.json', types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
      currentFileHandle = handle;
      currentFileHandle._origNum = state.taskCounter;
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data,null,2));
      await writable.close();
      const reg = JSON.parse(localStorage.getItem('savedTaskNumbers') || '[]');
      if (!reg.includes(state.taskCounter)) reg.push(state.taskCounter);
      localStorage.setItem('savedTaskNumbers', JSON.stringify(reg));
      alert('Guardado.');
      return;
    } catch(e){
      if (e && e.name === 'AbortError') return;
      // fall through to download
    }
  }

  // Fallback: download
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=safe+'.json'; a.click();
  URL.revokeObjectURL(url);
  const reg = JSON.parse(localStorage.getItem('savedTaskNumbers') || '[]');
  if (!reg.includes(state.taskCounter)) reg.push(state.taskCounter);
  localStorage.setItem('savedTaskNumbers', JSON.stringify(reg));
});

document.getElementById('btnExportImage').addEventListener('click', ()=>{
  const tmp=document.createElement('canvas');
  tmp.width=canvas.width; tmp.height=canvas.height;
  const tctx=tmp.getContext('2d');
  tctx.drawImage(canvas,0,0);
  tctx.fillStyle='#ffffff';
  tctx.textAlign='left';
  tctx.textBaseline='top';
  let y=16;
  tctx.font='bold 16px Arial';
  tctx.fillText('TAREA ' + state.taskCounter + ' ' + (state.taskName || ''), 16, y); y+=22;
  const notes=(document.getElementById('notes')?.value || '').trim();
  tctx.font='12px Arial';
  notes.split('\n').slice(0,5).forEach(line=>{
    tctx.fillText(line, 16, y); y+=16;
  });
  const safeName = (state.taskName || 'tablero').replace(/[<>:"/\\|?*]/g,'_');
  const url=tmp.toDataURL('image/png');
  const a=document.createElement('a'); a.href=url; a.download=safeName+'.png'; a.click();
});

document.getElementById('btnExportVideo')?.addEventListener('click', async ()=>{
  const b=getBoard();
  if (!b || b.frames.length<2){ alert('Se necesita una animación con al menos 2 frames.'); return; }
  // record playback once
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {mimeType:'video/webm'});
  const chunks=[];
  recorder.ondataavailable=e=>{ if(e.data.size) chunks.push(e.data); };
  recorder.onstop=()=>{
    const blob=new Blob(chunks,{type:'video/webm'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='animacion.webm'; a.click();
    URL.revokeObjectURL(url);
  };
  // start from first frame
  stopPlay();
  state.currentFrame=0;
  renderFrames();
  recorder.start();
  startPlay();
  const totalDur = (b.frames.length)*1000/state.speed + 500;
  setTimeout(()=>{ stopPlay(); recorder.stop(); }, totalDur);
});

document.getElementById('btnPresentation').addEventListener('click', ()=>{
  const el=document.getElementById('canvasWrap');
  if (el.requestFullscreen) el.requestFullscreen();
});

// ---------- 3D ----------
document.getElementById('btn3D')?.addEventListener('click', open3D);
document.getElementById('close3d')?.addEventListener('click', ()=>document.getElementById('modal3d')?.classList.add('hidden'));

let threeScene=null, threeRenderer=null, threeCamera=null, controls=null;
function open3D(){
  const modal=document.getElementById('modal3d');
  modal.classList.remove('hidden');
  const container=document.getElementById('threeContainer');
  // clear
  container.innerHTML='';
  const w=container.clientWidth, h=container.clientHeight;
  threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(0x0d1b2a);
  threeCamera = new THREE.PerspectiveCamera(60, w/h, 0.1, 1000);
  threeCamera.position.set(0, 80, 60);
  threeRenderer = new THREE.WebGLRenderer({antialias:true});
  threeRenderer.setSize(w,h);
  container.appendChild(threeRenderer.domElement);
  controls = new THREE.OrbitControls(threeCamera, threeRenderer.domElement);

  // lights
  const amb = new THREE.AmbientLight(0xffffff,0.6);
  threeScene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff,0.8);
  dir.position.set(50,100,50);
  threeScene.add(dir);

  // pitch plane
  const pr = pitchRect();
  const aspect = (state.pitchImgLoaded && state.pitchImgAspect) ? state.pitchImgAspect : SPORTS[state.sport].aspect;
  const pw = 60, ph = pw/aspect;
  const planeGeo = new THREE.PlaneGeometry(pw, ph);
  const planeMat = new THREE.MeshLambertMaterial({color:0x2d6a4f});
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.rotation.x = -Math.PI/2;
  threeScene.add(plane);
  // lines (edges)
  const edges = new THREE.EdgesGeometry(planeGeo);
  const lineMat = new THREE.LineBasicMaterial({color:0xffffff});
  const lineSeg = new THREE.LineSegments(edges, lineMat);
  lineSeg.rotation.x = -Math.PI/2;
  threeScene.add(lineSeg);

  // players
  const f = getRenderFrame() || currentFrameObj();
  if (f){
    (f.players||[]).forEach(p=>{
      const team = p.team==='home'?state.home:state.away;
      const geo = new THREE.CylinderGeometry(1.5,1.5,3,16);
      const mat = new THREE.MeshLambertMaterial({color: new THREE.Color(team.color)});
      const mesh = new THREE.Mesh(geo, mat);
      const x = (p.x-0.5)*pw;
      const z = (p.y-0.5)*ph;
      mesh.position.set(x, 1.5, z);
      threeScene.add(mesh);
      // number sprite
      const canvas2 = document.createElement('canvas');
      canvas2.width=64; canvas2.height=64;
      const c2=canvas2.getContext('2d');
      c2.fillStyle='#fff';
      c2.font='bold 40px Arial';
      c2.textAlign='center'; c2.textBaseline='middle';
      const pl = team.players.find(x=>x.id===p.pid);
      c2.fillText(pl?pl.num:'',32,32);
      const tex = new THREE.CanvasTexture(canvas2);
      const spriteMat = new THREE.SpriteMaterial({map:tex});
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(x, 4, z);
      sprite.scale.set(4,4,4);
      threeScene.add(sprite);
    });
    // ball
    (f.balls||[]).forEach(b=>{
      const geo = new THREE.SphereGeometry(1,16,16);
      const mat = new THREE.MeshLambertMaterial({color:0xffffff});
      const mesh = new THREE.Mesh(geo,mat);
      const x=(b.x-0.5)*pw, z=(b.y-0.5)*ph;
      mesh.position.set(x,1,z);
      threeScene.add(mesh);
    });
  }

  function animate3d(){
    if (modal.classList.contains('hidden')) return;
    requestAnimationFrame(animate3d);
    controls.update();
    threeRenderer.render(threeScene, threeCamera);
  }
  animate3d();

  // handle resize
  const ro = new ResizeObserver(()=>{
    const w=container.clientWidth, h=container.clientHeight;
    threeCamera.aspect=w/h;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(w,h);
  });
  ro.observe(container);
}

// ---------- Notes ----------
document.getElementById('notes').addEventListener('input', ()=>{});

// ---------- Video analysis ----------
const videoModal = document.getElementById('modalVideo');
const videoEl = document.getElementById('videoEl');
const videoOverlay = document.getElementById('videoOverlay');
const voctx = videoOverlay.getContext('2d');
let vTool = 'pen';
let vDrawing = null;
const bookmarks = [];

document.getElementById('btnVideo')?.addEventListener('click', ()=>{
  videoModal.classList.remove('hidden');
  resizeOverlay();
});
document.getElementById('closeVideo')?.addEventListener('click', ()=>videoModal.classList.add('hidden'));
document.getElementById('loadVideo').addEventListener('click', ()=>document.getElementById('fileVideo').click());
document.getElementById('fileVideo').addEventListener('change', (e)=>{
  const f=e.target.files[0]; if(!f) return;
  const url=URL.createObjectURL(f);
  videoEl.src=url;
  // clear overlay
  resizeOverlay();
  voctx.clearRect(0,0,videoOverlay.width,videoOverlay.height);
  e.target.value='';
});
function resizeOverlay(){
  videoOverlay.width = videoOverlay.clientWidth || 640;
  videoOverlay.height = videoOverlay.clientHeight || 360;
}
const voResize = new ResizeObserver(resizeOverlay);
voResize.observe(videoOverlay.parentElement);
document.querySelectorAll('.vtool').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.vtool').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    vTool=btn.dataset.vtool;
    if (vTool==='eraser'){ voctx.clearRect(0,0,videoOverlay.width,videoOverlay.height); }
  });
});
document.getElementById('vColor').addEventListener('input', ()=>{});
document.getElementById('vSize').addEventListener('input', ()=>{});

videoOverlay.addEventListener('mousedown', (e)=>{
  if (vTool!=='pen') return;
  const rect=videoOverlay.getBoundingClientRect();
  const x=e.clientX-rect.left, y=e.clientY-rect.top;
  vDrawing={points:[{x,y}], color:document.getElementById('vColor').value, size:+document.getElementById('vSize').value};
});
videoOverlay.addEventListener('mousemove', (e)=>{
  if (!vDrawing) return;
  const rect=videoOverlay.getBoundingClientRect();
  const x=e.clientX-rect.left, y=e.clientY-rect.top;
  vDrawing.points.push({x,y});
  // draw segment
  const pts=vDrawing.points;
  const a=pts[pts.length-2], b=pts[pts.length-1];
  voctx.beginPath();
  voctx.moveTo(a.x,a.y);
  voctx.lineTo(b.x,b.y);
  voctx.strokeStyle=vDrawing.color;
  voctx.lineWidth=vDrawing.size;
  voctx.lineCap='round';
  voctx.stroke();
});
videoOverlay.addEventListener('mouseup', ()=>{ vDrawing=null; });

document.getElementById('addBookmark').addEventListener('click', ()=>{
  const t = videoEl.currentTime || 0;
  const comment = document.getElementById('bookmarkComment').value || '';
  bookmarks.push({time:t, comment});
  renderBookmarks();
});
function renderBookmarks(){
  const c=document.getElementById('bookmarks');
  c.innerHTML='';
  bookmarks.forEach((bk,i)=>{
    const div=document.createElement('div');
    div.className='boarditem';
    const m=Math.floor(bk.time/60), s=Math.floor(bk.time%60);
    div.innerHTML=`<span>${m}:${String(s).padStart(2,'0')} ${bk.comment}</span><button>✕</button>`;
    div.addEventListener('click', (e)=>{ if(e.target.tagName==='BUTTON') return; videoEl.currentTime=bk.time; });
    div.querySelector('button').addEventListener('click', (e)=>{ e.stopPropagation(); bookmarks.splice(i,1); renderBookmarks(); });
    c.appendChild(div);
  });
}

// ---------- Init ----------
// create default board
newBoard('formation');
// place default formation? leave empty
resizeCanvas();

// ensure first render
setTimeout(()=>{ resizeCanvas(); }, 50);
