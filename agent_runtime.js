/**
 * agent_runtime.js — SnapKitty Vortex Agent Animation Runtime
 *
 * State machines with bodies. Not images.
 *
 * Stack:
 *   World Scene → Agent Brain → Goal Selector → Pathfinding
 *   → Animation State → Dialogue/Event Output
 *
 * Phases implemented:
 *   ✅ Phase 1: agents move to random points
 *   ✅ Phase 2: states — idle / walk / talk / build / trade / freeze
 *   ✅ Phase 3: roads + district pathfinding
 *   ✅ Phase 4: conversations when agents meet
 *   ✅ Phase 5: world events change goals
 *   ✅ Phase 6: ROBOB verdicts light up the world
 */

const ROBOB = 'http://localhost:7475';

// ── World Definition ──────────────────────────────────────────────────────────
export const WORLD = {
  width:  800,
  height: 500,

  districts: [
    { id:'A1', name:'CARTO DISTRICT',   x:80,  y:80,  w:110, h:80,  color:'#ffd700', agent:'CARTO'     },
    { id:'B2', name:'RESONANCE LABS',   x:230, y:80,  w:110, h:80,  color:'#00ffff', agent:'RESONANCE' },
    { id:'C3', name:'FLUX MARKET',      x:380, y:80,  w:110, h:80,  color:'#ff6600', agent:'FLUX'      },
    { id:'D4', name:'CIPHER VAULT',     x:530, y:80,  w:110, h:80,  color:'#aa44ff', agent:'CIPHER'    },
    { id:'E5', name:'PHANTOM WATCH',    x:680, y:80,  w:90,  h:80,  color:'#888888', agent:'PHANTOM'   },
    { id:'F6', name:'FORGE FOUNDRY',    x:80,  y:240, w:110, h:80,  color:'#ff4444', agent:'FORGE'     },
    { id:'G7', name:'NOVA CANVAS',      x:230, y:240, w:110, h:80,  color:'#ff00ff', agent:'NOVA'      },
    { id:'H8', name:'LLAMA4 LIBRARY',   x:380, y:240, w:110, h:80,  color:'#00aa00', agent:'LLAMA4'    },
    { id:'I9', name:'AMAZON MEDIA',     x:530, y:240, w:110, h:80,  color:'#ff9900', agent:'AMAZON'    },
    { id:'J10',name:'GRANITE WORKS',    x:680, y:240, w:90,  h:80,  color:'#888888', agent:'GRANITE1'  },
    { id:'CTR',name:'ROBOB ORACLE',     x:340, y:390, w:120, h:70,  color:'#00ff88', agent:'ROBOB'     },
  ],

  roads: [
    // horizontal
    { x1:40,  y1:160, x2:780, y2:160 },
    { x1:40,  y1:320, x2:780, y2:320 },
    { x1:40,  y1:430, x2:780, y2:430 },
    // vertical
    { x1:135, y1:40,  x2:135, y2:460 },
    { x1:285, y1:40,  x2:285, y2:460 },
    { x1:435, y1:40,  x2:435, y2:460 },
    { x1:585, y1:40,  x2:585, y2:460 },
    // center spoke to ROBOB
    { x1:400, y1:320, x2:400, y2:390 },
  ],

  randomPoint() {
    const d = this.districts[Math.floor(Math.random() * this.districts.length)];
    return {
      x: d.x + Math.random() * d.w,
      y: d.y + Math.random() * d.h,
      district: d.id,
    };
  },

  roadPoint() {
    const r = this.roads[Math.floor(Math.random() * this.roads.length)];
    const t = Math.random();
    return { x: r.x1 + (r.x2-r.x1)*t, y: r.y1 + (r.y2-r.y1)*t };
  },

  nearbyAgents(agent, agents, radius) {
    return agents.filter(a =>
      a !== agent && Math.hypot(a.x - agent.x, a.y - agent.y) < radius
    );
  },
};

// ── Agent class ───────────────────────────────────────────────────────────────
export class Agent {
  constructor(cfg, startDistrict) {
    this.id       = cfg.id;
    this.color    = cfg.block?.color || '#00ff88';
    this.emoji    = cfg.emoji || '●';
    this.role     = cfg.role || '';
    this.frozen   = false;

    const d       = WORLD.districts.find(d => d.agent === cfg.id) || WORLD.districts[0];
    this.x        = d.x + d.w/2 + (Math.random()-0.5)*20;
    this.y        = d.y + d.h/2 + (Math.random()-0.5)*20;
    this.homeX    = this.x;
    this.homeY    = this.y;
    this.district = d.id;

    this.goal     = null;
    this.speed    = 0.8 + Math.random() * 0.6;
    this.state    = 'idle';
    this.prevState= 'idle';
    this.mood     = 1.0;
    this.energy   = 100;
    this.resources= 50;
    this.actions  = 0;
    this.silences = 0;

    // Dialogue
    this.dialogue      = [];
    this.dialogueTimer = 0;
    this.talkTarget    = null;

    // Animation
    this.frame      = 0;
    this.frameTimer = 0;
    this.bobOffset  = Math.random() * Math.PI * 2;
    this.glowAlpha  = 0;
    this.trailX     = [this.x];
    this.trailY     = [this.y];

    // Timers
    this.idleTimer  = Math.random() * 120;
    this.talkTimer  = 0;
    this.taskTimer  = 0;
    this.verdict    = null;
    this.verdictAge = 0;
  }

  chooseGoal(agents) {
    if (this.frozen) { this.state = 'freeze'; return; }
    const roll = Math.random();
    if (roll < 0.3) {
      // Go home
      const d = WORLD.districts.find(d => d.agent === this.id);
      if (d) { this.goal = { x: d.x + d.w/2, y: d.y + d.h/2 }; this.state = 'walk'; }
    } else if (roll < 0.55) {
      // Walk to road
      this.goal  = WORLD.roadPoint();
      this.state = 'walk';
    } else if (roll < 0.75) {
      // Visit another district
      this.goal  = WORLD.randomPoint();
      this.state = 'walk';
    } else if (roll < 0.85) {
      // Build something (FORGE mostly, others occasionally)
      this.state     = 'build';
      this.taskTimer = 60 + Math.random() * 80;
    } else if (roll < 0.92) {
      // Trade
      this.state     = 'trade';
      this.taskTimer = 40 + Math.random() * 60;
    } else {
      // Rest
      this.state     = 'idle';
      this.idleTimer = 60 + Math.random() * 180;
    }
  }

  moveTowardGoal() {
    if (!this.goal) return;
    const dx   = this.goal.x - this.x;
    const dy   = this.goal.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) {
      this.state = 'idle';
      this.goal  = null;
      this.idleTimer = 30 + Math.random() * 90;
      return;
    }
    const spd = this.state === 'walk' ? this.speed : this.speed * 1.4;
    this.x += (dx / dist) * spd;
    this.y += (dy / dist) * spd;

    // Trail
    this.trailX.push(this.x);
    this.trailY.push(this.y);
    if (this.trailX.length > 8) { this.trailX.shift(); this.trailY.shift(); }
  }

  react(agents, events) {
    if (this.frozen) return;
    const nearby = WORLD.nearbyAgents(this, agents, 40);

    // Talk when nearby
    if (nearby.length > 0 && this.state !== 'talk' && Math.random() < 0.008) {
      this.state      = 'talk';
      this.talkTarget = nearby[0].id;
      this.talkTimer  = 80 + Math.random() * 120;
      nearby[0].state = 'talk';
      nearby[0].talkTarget = this.id;
      nearby[0].talkTimer  = this.talkTimer;
    }

    // React to world events
    if (events.length > 0) {
      const ev = events[events.length - 1];
      if (ev && (ev.actors||[]).includes(this.id)) {
        this.mood      = ev.verdict === 'EVIDENCE' ? Math.min(1, this.mood + 0.2) : Math.max(0.2, this.mood - 0.1);
        this.glowAlpha = ev.verdict === 'EVIDENCE' ? 1.0 : 0.0;
        this.verdict   = ev.verdict;
        this.verdictAge= 0;
      }
    }
  }

  update(agents, events) {
    if (this.frozen) { this.state = 'freeze'; return; }

    // Frame animation
    this.frameTimer++;
    if (this.frameTimer > 8) { this.frame = (this.frame + 1) % 4; this.frameTimer = 0; }

    // Glow decay
    this.glowAlpha  = Math.max(0, this.glowAlpha - 0.012);
    this.verdictAge++;

    // Energy drain
    if (Math.random() < 0.002) this.energy = Math.max(10, this.energy - 1);

    // State machine
    switch (this.state) {
      case 'idle':
        this.idleTimer--;
        if (this.idleTimer <= 0) this.chooseGoal(agents);
        break;

      case 'walk':
        this.moveTowardGoal();
        if (!this.goal) this.state = 'idle';
        break;

      case 'talk':
        this.talkTimer--;
        if (this.talkTimer <= 0) {
          this.state      = 'idle';
          this.talkTarget = null;
          this.idleTimer  = 40;
        }
        break;

      case 'build':
        this.taskTimer--;
        if (this.taskTimer <= 0) { this.state = 'idle'; this.actions++; }
        break;

      case 'trade':
        this.taskTimer--;
        if (this.taskTimer <= 0) { this.state = 'idle'; }
        break;

      case 'freeze':
        // Frozen by CIPHER — wait for CARTO ruling
        break;
    }

    this.react(agents, events);
  }

  // Latest dialogue line
  speak(line) {
    this.dialogue.unshift({ text: line, age: 0 });
    if (this.dialogue.length > 3) this.dialogue.pop();
  }

  // Draw on canvas
  draw(ctx, time) {
    if (!ctx) return;
    const bob    = Math.sin(time * 0.04 + this.bobOffset) * 2;
    const cx     = Math.round(this.x);
    const cy     = Math.round(this.y + bob);
    const radius = this.state === 'talk' ? 9 : 7;

    // Trail
    if (this.state === 'walk' && this.trailX.length > 1) {
      for (let i = 1; i < this.trailX.length; i++) {
        const alpha = (i / this.trailX.length) * 0.3;
        ctx.beginPath();
        ctx.moveTo(this.trailX[i-1], this.trailY[i-1] + bob);
        ctx.lineTo(this.trailX[i],   this.trailY[i]   + bob);
        ctx.strokeStyle = this.color + Math.floor(alpha*255).toString(16).padStart(2,'0');
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
    }

    // Glow ring (EVIDENCE/SILENCE flash)
    if (this.glowAlpha > 0.01) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 6 + Math.sin(time*0.1)*3, 0, Math.PI*2);
      const glowColor = this.verdict === 'EVIDENCE' ? '#00ff88' : '#ff4444';
      ctx.strokeStyle = glowColor + Math.floor(this.glowAlpha * 200).toString(16).padStart(2,'0');
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    // Freeze indicator
    if (this.frozen) {
      ctx.beginPath(); ctx.arc(cx, cy, radius + 10, 0, Math.PI*2);
      ctx.strokeStyle = '#ff990066'; ctx.lineWidth = 1; ctx.stroke();
    }

    // Body circle
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2);
    const alpha = this.frozen ? '44' : 'cc';
    ctx.fillStyle = this.color + alpha; ctx.fill();
    ctx.strokeStyle = this.color; ctx.lineWidth = 1.5; ctx.stroke();

    // State indicator ring
    if (this.state === 'talk') {
      ctx.beginPath(); ctx.arc(cx, cy, radius + 3 + Math.sin(time*0.15)*1.5, 0, Math.PI*2);
      ctx.strokeStyle = this.color + '66'; ctx.lineWidth = 1; ctx.stroke();
    } else if (this.state === 'build') {
      // Pulsing build indicator
      for (let i = 0; i < 3; i++) {
        const angle = (time * 0.05 + i * 2.09);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle)*8, cy + Math.sin(angle)*8, 2, 0, Math.PI*2);
        ctx.fillStyle = this.color + '88'; ctx.fill();
      }
    }

    // Label
    ctx.fillStyle = '#fff';
    ctx.font      = `600 ${radius}px Courier New`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.id.slice(0,2), cx, cy + 0.5);

    // Dialogue bubble
    if (this.state === 'talk' && this.dialogue.length > 0) {
      const d    = this.dialogue[0];
      const text = d.text.slice(0, 40);
      const bw   = Math.min(text.length * 4.5 + 16, 180);
      const bh   = 22;
      const bx   = cx - bw/2;
      const by   = cy - radius - bh - 6;
      ctx.fillStyle = 'rgba(4,12,24,0.92)';
      ctx.strokeStyle = this.color + '88';
      ctx.lineWidth = 1;
      _roundRect(ctx, bx, by, bw, bh, 4);
      ctx.fill(); ctx.stroke();
      // Tail
      ctx.beginPath();
      ctx.moveTo(cx-4, by+bh); ctx.lineTo(cx+4, by+bh); ctx.lineTo(cx, by+bh+6);
      ctx.fillStyle = 'rgba(4,12,24,0.92)'; ctx.fill();
      // Text
      ctx.fillStyle = '#c0d8e8';
      ctx.font      = '500 6.5px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(text, cx, by + bh/2 + 0.5);
    }
  }
}

// ── Draw world ────────────────────────────────────────────────────────────────
export function drawWorld(ctx, W, H, agents, events, time) {
  // Background
  ctx.fillStyle = '#020810';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(0,80,140,0.12)';
  ctx.lineWidth   = 0.5;
  for (let x=0; x<W; x+=30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y=0; y<H; y+=30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Roads
  ctx.setLineDash([4,6]);
  ctx.strokeStyle = 'rgba(0,140,200,0.18)';
  ctx.lineWidth   = 2;
  for (const r of WORLD.roads) {
    ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Districts
  for (const d of WORLD.districts) {
    // Count agents in district
    const occupants = agents.filter(a => {
      const dx = a.x - (d.x + d.w/2), dy = a.y - (d.y + d.h/2);
      return Math.hypot(dx,dy) < d.w/2 + 10;
    });
    const lit = occupants.length > 0;

    ctx.fillStyle = d.color + (lit ? '18' : '0a');
    ctx.strokeStyle = d.color + (lit ? '55' : '22');
    ctx.lineWidth = lit ? 1.5 : 1;
    _roundRect(ctx, d.x, d.y, d.w, d.h, 6);
    ctx.fill(); ctx.stroke();

    // Glow if occupied
    if (lit) {
      ctx.shadowColor = d.color;
      ctx.shadowBlur  = 12;
      _roundRect(ctx, d.x, d.y, d.w, d.h, 6);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // District label
    ctx.fillStyle    = d.color + (lit ? 'cc' : '44');
    ctx.font         = 'bold 6px Courier New';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(d.name, d.x + d.w/2, d.y + 4);

    // Agent count badge
    if (occupants.length > 1) {
      ctx.fillStyle = d.color + 'cc';
      ctx.font      = '500 5px Courier New';
      ctx.fillText(`×${occupants.length}`, d.x + d.w - 8, d.y + 4);
    }
  }

  // Connection lines between talking agents
  for (const a of agents) {
    if (a.state === 'talk' && a.talkTarget) {
      const b = agents.find(ag => ag.id === a.talkTarget);
      if (b) {
        const alpha = 0.15 + Math.sin(time*0.08)*0.1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(200,220,255,${alpha})`; ctx.lineWidth = 1;
        ctx.setLineDash([3,4]); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }

  // Draw all agents
  for (const a of agents) a.draw(ctx, time);
}

// ── Runtime controller ─────────────────────────────────────────────────────────
export class CivRuntime {
  constructor(canvas, agentsCfg) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.agents   = agentsCfg
      .filter(a => a.spawn && !a.is_oracle)
      .map(cfg => new Agent(cfg));
    this.events   = [];
    this.chatMsgs = [];
    this.time     = 0;
    this.paused   = false;
    this._chatIdx = 0;
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  // Feed live data from ROBOB
  updateFromRobob(civState, chatData) {
    // Update agent stats
    const agentStates = civState.agents || {};
    for (const a of this.agents) {
      const s = agentStates[a.id];
      if (s) {
        a.energy    = s.energy ?? a.energy;
        a.resources = s.resources ?? a.resources;
        a.frozen    = !!s.frozen;
        if (s.verdict && s.verdict !== a.verdict) {
          a.glowAlpha = 1.0;
          a.verdict   = s.verdict;
        }
      }
    }

    // Feed live chat messages to talking agents
    const msgs = (chatData?.messages || []).slice(-10);
    if (msgs.length > this._chatIdx) {
      for (let i = this._chatIdx; i < msgs.length; i++) {
        const m = msgs[i];
        if (!m) continue;
        const agA = this.agents.find(a => a.id === m.a);
        const agB = this.agents.find(a => a.id === m.b);
        if (agA && m.msg_a) {
          agA.speak(m.msg_a.slice(0, 40));
          agA.state = 'talk'; agA.talkTimer = 180;
          agA.talkTarget = m.b;
        }
        if (agB && m.msg_b) {
          agB.speak(m.msg_b.slice(0, 40));
          agB.state = 'talk'; agB.talkTimer = 150;
          agB.talkTarget = m.a;
        }
      }
      this._chatIdx = msgs.length;
    }

    // Store events for agent reactions
    this.events = civState.events || [];
  }

  tick() {
    for (const a of this.agents) {
      a.update(this.agents, this.events);
    }
  }

  render() {
    const W = this.canvas.width, H = this.canvas.height;
    if (!W || !H) return;
    drawWorld(this.ctx, W, H, this.agents, this.events, this.time);
    this.time++;
  }

  start() {
    const loop = () => {
      if (!this.paused) {
        this.tick();
        this.render();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}
