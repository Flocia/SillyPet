(function () {
    'use strict';

    const EXT_NAME = '[SillyPet]';
    const STORAGE_KEY = 'st_sillypet_v22';
    const CARE_KEY = `${STORAGE_KEY}_care`;
    const VERSION = '3.4.0';

    const PETS = {
        ghost: { id: 'ghost', name: '白色幽灵', color: '#ffffff', shadow: '#d9d4dc', eye: '#2b2338', blush: '#f3b6c8' },
    };

    const FOODS = [
        { id: 'carrot', name: '胡萝卜', icon: '🥕', desc: '清甜脆脆', gain: [9, 18] },
        { id: 'fish', name: '小鱼', icon: '🐟', desc: '香喷喷', gain: [11, 20] },
        { id: 'meat', name: '肉肉', icon: '🍖', desc: '大口吃肉', gain: [13, 23] },
        { id: 'milk', name: '牛奶', icon: '🥛', desc: '软绵绵', gain: [8, 15] },
        { id: 'cake', name: '小蛋糕', icon: '🍰', desc: '偶尔的奖励', gain: [10, 17] },
        { id: 'berry', name: '莓莓', icon: '🫐', desc: '酸甜小果子', gain: [7, 16] },
    ];

    const TOOLS = [
        { id: 'soap', name: '肥皂', icon: '🧼', desc: '起泡丰富', gain: [13, 23] },
        { id: 'shower', name: '沐浴露', icon: '🫧', desc: '香香滑滑', gain: [16, 28] },
    ];

    const PLAY_ACTIONS = [
        { id: 'pat', name: '摸摸头', icon: '🖐', desc: '点一下，轻轻摸摸', mood: [6, 13], clean: [0, 1], fullness: [0, 0] },
        { id: 'bounce', name: '弹跳', icon: '↕', desc: '点击团子就开始上下弹跳', mood: [7, 14], clean: [-1, 0], fullness: [-1, 0] },
        { id: 'catch', name: '顶球', icon: '●', desc: '把球拖出去让它接住', mood: [10, 20], clean: [-2, 0], fullness: [-1, 0] },
    ];

    const ACTION_LINES = {
        feed: {
            ghost: ['呜啵啵！', '小幽灵吃饱啦。', '飘起来一点点～'],
            cat: ['喵呜…再来一点。', '小黑团满足地舔舔嘴。', '尾巴开心地晃了晃。'],
            dog: ['汪！开心开吃！', '小狗团子摇起尾巴。', '吃完还想蹭蹭你。'],
        },
        bath: ['水花噗噜噗噜！', '香喷喷的泡泡包住它。', '洗完澡变得软乎乎。'],
        play: {
            pat: ['呼噜呼噜……好舒服。', '耳朵软乎乎地抖了一下。', '团子往你的手心蹭了蹭。'],
            ball: ['接到啦！', '团子一路滚过去追球。', '皮球咕噜噜地跑起来！'],
            bounce: ['跳得高高的！', '团子一蹦一蹦好开心～', '弹回来啦！再跳一次！'],
            catch: ['接到啦！', '团子顶住球啦！', '球球稳稳地落进怀里。'],
        },
    };

    let state = loadState();
    let ticker = null;
    let initialized = false;
    let keydownBound = false;

    function defaults() {
        return { petId: 'ghost', name: '小白兔', mood: 80, clean: 85, fullness: 74, bornAt: Date.now(), lastTick: Date.now(), lastAction: '刚刚见面', lastActionType: 'idle' };
    }
    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const merged = { ...defaults(), ...(raw ? JSON.parse(raw) : {}) };
            if (!merged.bornAt) merged.bornAt = Date.now();
            merged.petId = 'ghost';
            if (!merged.name || merged.name === '小黑团' || merged.name === '小团子') merged.name = '小幽灵';
            return merged;
        } catch (error) {
            console.warn(`${EXT_NAME} state load failed`, error);
            return defaults();
        }
    }
    function saveState() { state.lastTick = Date.now(); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} }
    function clamp(value) { return Math.max(0, Math.min(100, Math.round(value * 10) / 10)); }
    function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function needsFood() { return state.fullness < 35; }
    function needsBath() { return state.clean < 35; }
    function needsComfort() { return state.mood < 35; }
    function petMoodBand() { return state.mood < 35 ? 'bad' : state.mood < 65 ? 'mid' : 'good'; }

    function applyDecay() {
        const now = Date.now();
        const elapsedMin = Math.max(0, (now - (state.lastTick || now)) / 60000);
        if (elapsedMin <= 0.02) return false;
        state.fullness = clamp(state.fullness - elapsedMin * 1.65);
        state.clean = clamp(state.clean - elapsedMin * 1.1);
        state.mood = clamp(state.mood - elapsedMin * 0.7);
        state.lastTick = now;
        saveState();
        return true;
    }

    function petFace() {
        if (needsFood()) return { eyes: '◉ ◉', mouth: '︵', label: '咕噜…肚子空空的' };
        if (needsBath()) return { eyes: '◉ ◉', mouth: '﹏', label: '想洗澡了…有点脏' };
        if (needsComfort()) return { eyes: '◕ ◕', mouth: '︶', label: '呜…有一点难过' };
        if (state.mood > 82) return { eyes: '★ ★', mouth: 'ᴗ', label: '今天心情闪闪发光' };
        if (state.mood > 52) return { eyes: '● ●', mouth: 'ᴗ', label: '安安静静陪着你' };
        return { eyes: '● ●', mouth: '﹏', label: '有点无聊了' };
    }

    // Reference-style pixel mascots: hand-authored 12px box-shadow sprites.
    function petSvgHtml(pet) {
        return `<div class="pixel-sprite-wrap pixel-ghost-ref" role="img" aria-label="${escapeHtml(pet.name)}"><div class="pixel-ghost" aria-hidden="true"><i class="ghost-eye ge1"></i><i class="ghost-eye ge2"></i><i class="ghost-mouth"></i><i class="ghost-cheek gc1"></i><i class="ghost-cheek gc2"></i></div></div>`;
    }

    function petArtHtml() {
        const pet = PETS[state.petId] || PETS.ghost;
        const classes = ['pet-avatar', `pet-${pet.id}`, `mood-${petMoodBand()}`, needsFood() ? 'state-hungry' : '', needsBath() ? 'state-dirty' : '', needsComfort() ? 'state-sad' : ''].filter(Boolean).join(' ');
        return `<div class="${classes}">
            ${petSvgHtml(pet)}
            <div class="pixel-pet-glow"></div>
            <div class="pixel-dirty-grid"><i></i><i></i><i></i></div>
            <div class="tear-drop t1"></div><div class="tear-drop t2"></div>
            <div class="heart-pop">♥</div><div class="hunger-pop">zzz…</div>
        </div>`;
    }

    function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch])); }
    function statBar(name, icon, value, key) {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        const tone = v < 35 ? 'low' : v < 65 ? 'mid' : 'good';
        return `<div class="stat-row stat-${key}"><div class="stat-label"><span class="stat-icon">${icon}</span><span>${name}</span><strong>${Math.round(v)}</strong></div><div class="stat-track"><div class="stat-fill ${tone}" style="width:${v}%"></div><div class="stat-gloss"></div></div></div>`;
    }
    function actionCard(item, type) { return `<button class="action-card action-${type}" data-action="${type}" data-id="${item.id}"><span class="action-icon">${item.icon}</span><span class="action-name">${escapeHtml(item.name)}</span><span class="action-desc">${escapeHtml(item.desc)}</span></button>`; }

    function buildPanel() {
        let host = document.getElementById('st-pixel-pet-root');
        if (!host) {
            host = document.createElement('div');
            host.id = 'st-pixel-pet-root';
            host.innerHTML = `<div id="st-pixel-pet-panel" class="pixel-pet-panel" aria-hidden="true" role="dialog" aria-label="SillyPet 拓麻歌子电子宠物机">
                <div class="pet-backdrop-close" data-action="close"></div>
                <div class="pet-window" role="document">
                    <div class="device-top-screw screw-left"></div><div class="device-top-screw screw-right"></div>
                    <div class="device-titlebar">
                        <div class="brand-mark"><span class="brand-dot"></span><span class="brand-main">SILLY PET</span><span class="brand-mini">DIGITAL PAL</span></div>
                        <div class="device-mini-status"><span class="led-dot"></span><span class="battery">BAT ▰▰▰</span><button class="pet-mini-btn" data-action="reset" aria-label="重置">↻</button><button class="pet-mini-btn" data-action="close" aria-label="关闭">×</button></div>
                    </div>

                    <section class="lcd-housing">
                        <div class="lcd-screen">
                            <div class="lcd-scanlines"></div>
                            <div class="lcd-header"><span id="lcd-day">DAY 01</span><span id="lcd-clock">00:00</span></div>
                            <div class="lcd-status-icons"><span class="lcd-icon" id="lcd-mood-icon">♥</span><span class="lcd-icon" id="lcd-clean-icon">✦</span><span class="lcd-icon" id="lcd-food-icon">◒</span><span class="lcd-mode" id="lcd-mode">IDLE</span></div>
                            <div class="screen-stage">
                                <div class="pixel-cloud cloud-a"></div><div class="pixel-cloud cloud-b"></div>
                                <div class="grass-line"></div>
                                <div class="play-fx-layer" aria-hidden="true"><div class="fx-hand">✋</div><div class="fx-ball" role="button" aria-label="拖动皮球">●</div><div class="fx-dust d1"></div><div class="fx-dust d2"></div><div class="fx-note">♪</div><div class="fx-catch-text">把球丢给团子！</div><div class="bath-fx soap-fx"><span class="soap-bar">▰</span><i></i><i></i><i></i></div><div class="bath-fx shower-fx"><span class="shower-head">╭─</span><span class="water-drop d1">•</span><span class="water-drop d2">•</span><span class="water-drop d3">•</span><span class="water-drop d4">•</span></div></div>
                                <div class="pet-art-wrap">${petArtHtml()}</div>
                            </div>
                            <div class="lcd-footer"><span class="lcd-pet-name" id="pet-name-label">${escapeHtml(state.name)}</span><span class="lcd-message" id="pet-status-text">${escapeHtml(petFace().label)}</span></div>
                        </div>
                    </section>

                    <div class="info-strip">
                        <button class="pet-info-pill" data-action="rename"><span class="pill-icon">♥</span><span><b id="info-name">${escapeHtml(state.name)}</b><small>名字</small></span><span class="pill-edit">✎</span></button>
                        <div class="pet-info-pill pet-switcher"><span class="switch-title">伙伴</span><div class="pet-choice-row">
                            <button type="button" class="pet-choice active" data-action="select-pet" data-id="ghost"><span class="pet-choice-dot ghost-dot"></span><span>白色幽灵</span></button>
                        </div></div>
                        <div class="pet-info-pill stats-pill"><div class="mini-stat"><span>♥</span><strong id="mini-mood">${Math.round(state.mood)}</strong></div><div class="mini-stat"><span>✦</span><strong id="mini-clean">${Math.round(state.clean)}</strong></div><div class="mini-stat"><span>◒</span><strong id="mini-fullness">${Math.round(state.fullness)}</strong></div></div>
                    </div>

                    <div class="button-panel-title"><span>CARE MENU</span><span>按下按钮和它一起生活</span></div>
                    <div class="pet-tabs" role="tablist">
                        <button class="pet-tab active" data-tab="feed"><span class="hardware-letter">A</span><span class="tab-icon">◉</span><strong>喂食</strong><small>FOOD</small></button>
                        <button class="pet-tab" data-tab="bath"><span class="hardware-letter">B</span><span class="tab-icon">≈</span><strong>洗澡</strong><small>BATH</small></button>
                        <button class="pet-tab" data-tab="play"><span class="hardware-letter">C</span><span class="tab-icon">♡</span><strong>玩耍</strong><small>PLAY</small></button>
                    </div>

                    <div class="menu-tray">
                        <div class="tab-content active" id="tab-feed"><div class="menu-hint"><b>FEED</b> 选择一份小食物</div><div class="action-grid">${FOODS.map(x=>actionCard(x,'feed')).join('')}</div></div>
                        <div class="tab-content" id="tab-bath"><div class="menu-hint"><b>BATH</b> 让团子重新香香的</div><div class="action-grid two">${TOOLS.map(x=>actionCard(x,'bath')).join('')}</div></div>
                        <div class="tab-content" id="tab-play"><div class="menu-hint"><b>PLAY</b> 选择一个互动</div><div class="action-grid three">${PLAY_ACTIONS.map(x=>actionCard(x,'play')).join('')}</div></div>
                    </div>

                    <div class="reaction-strip"><span class="reaction-dot"></span><span id="pet-reaction">${escapeHtml(state.lastAction || '刚刚见面')}</span><span class="care-count">CARE <b id="care-count">${getCareCount()}</b></span></div>
                    <div class="hardware-buttons" aria-hidden="true"><span></span><span class="center"></span><span></span></div>
                    <div class="pet-footer"><span>LOCAL SAVE</span><span>v${VERSION}</span><span>MADE FOR SILLYTAVERN</span></div>
                </div></div>`;
            document.body.appendChild(host);
            bindEvents(host);
        }
        ensureLauncher();
        updatePanel();
        updateClock();
        ensureClockTicker();
    }

    function ensureLauncher() {
        let fab = document.getElementById('st-pixel-pet-fab');
        if (fab) return fab;
        fab = document.createElement('button'); fab.id='st-pixel-pet-fab'; fab.type='button'; fab.className='pixel-pet-fab'; fab.setAttribute('aria-label','打开电子宠物'); fab.setAttribute('aria-expanded','false'); fab.title='打开电子宠物';
        fab.innerHTML='<span class="paw-pad"></span><span class="paw-toe t1"></span><span class="paw-toe t2"></span><span class="paw-toe t3"></span><span class="paw-toe t4"></span>';
        Object.assign(fab.style,{position:'fixed',right:'16px',bottom:'16px',left:'auto',top:'auto',width:'58px',height:'58px',display:'block',visibility:'visible',opacity:'1',pointerEvents:'auto',zIndex:'2147483647',margin:'0',padding:'0',border:'0'});
        document.body.appendChild(fab);
        // Robust launcher input: click + pointerup fallback for Android WebView/touch.
        let lastOpenAt=0;
        const openFromLauncher=(event)=>{
            event.preventDefault();
            event.stopPropagation();
            const now=Date.now();
            if(now-lastOpenAt<180)return;
            lastOpenAt=now;
            togglePanel();
        };
        fab.addEventListener('click',openFromLauncher,{passive:false});
        fab.addEventListener('pointerup',openFromLauncher,{passive:false});
        fab.addEventListener('touchend',openFromLauncher,{passive:false});
        let drag=null;
        fab.addEventListener('pointerdown',event=>{ if(event.button!==undefined&&event.button!==0)return; const r=fab.getBoundingClientRect(); drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:r.left,originY:r.top,moved:false}; fab.setPointerCapture?.(event.pointerId); });
        fab.addEventListener('pointermove',event=>{ if(!drag||event.pointerId!==drag.pointerId)return; const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY; if(!drag.moved&&Math.hypot(dx,dy)<6)return; drag.moved=true; const w=58,h=58; fab.style.left=`${Math.min(Math.max(8,drag.originX+dx),Math.max(8,innerWidth-w-8))}px`; fab.style.top=`${Math.min(Math.max(8,drag.originY+dy),Math.max(8,innerHeight-h-8))}px`; fab.style.right='auto'; fab.style.bottom='auto'; event.preventDefault(); });
        const endDrag=event=>{ if(!drag||event.pointerId!==drag.pointerId)return; const moved=drag.moved; drag=null; if(moved){try{localStorage.setItem('st_sillypet_launcher_pos',JSON.stringify({x:fab.getBoundingClientRect().left,y:fab.getBoundingClientRect().top}));}catch(_){} event.preventDefault();} };
        fab.addEventListener('pointerup',endDrag); fab.addEventListener('pointercancel',()=>{drag=null;});
        try{const saved=JSON.parse(localStorage.getItem('st_sillypet_launcher_pos')||'null'); if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){fab.style.left=`${Math.min(Math.max(8,saved.x),Math.max(8,innerWidth-66))}px`;fab.style.top=`${Math.min(Math.max(8,saved.y),Math.max(8,innerHeight-66))}px`;fab.style.right='auto';fab.style.bottom='auto';}}catch(_){ }
        return fab;
    }

    function bindEvents(host){
        host.addEventListener('click',event=>{
            const button=event.target.closest('[data-action],[data-tab]');
            if(!button)return;
            if(button.dataset.tab)switchTab(button.dataset.tab);
            const action=button.dataset.action;
            if(!action)return;
            if(action==='close')togglePanel(false);
            else if(action==='rename')renamePet();
            else if(action==='select-pet')selectPet(button.dataset.id);
            else if(action==='feed')doFeed(button.dataset.id);
            else if(action==='bath')doBath(button.dataset.id);
            else if(action==='play')doPlay(button.dataset.id);
            else if(action==='reset')resetPet();
        });
        const artWrap=host.querySelector('.pet-art-wrap');
        artWrap?.addEventListener('click',event=>{
            if(host.classList.contains('pet-bounce-ready')){
                event.preventDefault();
                doPetBounce();
            }
        });
        setupCatchBall(host);
        if(!keydownBound){document.addEventListener('keydown',event=>{if(event.key==='Escape')togglePanel(false);});keydownBound=true;}
    }
    function togglePanel(force){const panel=document.getElementById('st-pixel-pet-panel'),fab=document.getElementById('st-pixel-pet-fab');if(!panel||!fab)return;const currentOpen=panel.getAttribute('aria-hidden')==='false';const open=force===undefined?!currentOpen:Boolean(force); if(!open) stopCatchGame(); panel.setAttribute('aria-hidden',String(!open));fab.classList.toggle('is-open',open);fab.setAttribute('aria-expanded',String(open));document.documentElement.classList.toggle('st-sillypet-open',open);}
    function switchTab(tab){document.querySelectorAll('#st-pixel-pet-root .pet-tab').forEach(item=>item.classList.toggle('active',item.dataset.tab===tab));document.querySelectorAll('#st-pixel-pet-root .tab-content').forEach(item=>item.classList.toggle('active',item.id===`tab-${tab}`));}
    function ensureFresh(){applyDecay();}
    function selectPet(id){if(!PETS[id])return;ensureFresh();state.petId=id;state.mood=clamp(state.mood+rand(2,6));state.lastAction=`遇见了 ${PETS[id].name}！`;state.lastActionType='pet';saveState();recordCare();updatePanel(true);playFx('select');}
    function doFeed(id){ensureFresh();const food=FOODS.find(x=>x.id===id);if(!food)return;const amount=rand(food.gain[0],food.gain[1]),moodGain=rand(4,9);state.fullness=clamp(state.fullness+amount);state.mood=clamp(state.mood+moodGain);state.lastAction=`${PETS.ghost.name} ${pick(ACTION_LINES.feed[state.petId])} 饱肚 +${amount} / 心情 +${moodGain}`;state.lastActionType='feed';saveState();recordCare();updatePanel(true);playFx('feed');}
    function doBath(id){ensureFresh();const tool=TOOLS.find(x=>x.id===id);if(!tool)return;const amount=rand(tool.gain[0],tool.gain[1]),moodGain=rand(5,11);state.clean=clamp(state.clean+amount);state.mood=clamp(state.mood+moodGain);state.lastAction=`${PETS.ghost.name} ${pick(ACTION_LINES.bath)} 清洁 +${amount} / 心情 +${moodGain}`;state.lastActionType='bath';saveState();recordCare();updatePanel(true);playBathFx(id);}
    function playBathFx(toolId){
        const root=document.getElementById('st-pixel-pet-root');
        const art=root?.querySelector('.pet-avatar');
        if(!root||!art)return;
        root.classList.remove('fx-bath-soap','fx-bath-shower','fx-bath');
        void root.offsetWidth;
        root.classList.add(toolId==='soap'?'fx-bath-soap':'fx-bath-shower');
        art.classList.remove('react','react-positive');
        void art.offsetWidth;
        art.classList.add('react-positive');
        setTimeout(()=>root.classList.remove(toolId==='soap'?'fx-bath-soap':'fx-bath-shower'),1400);
    }

    function doPetBounce(){
        const host=document.getElementById('st-pixel-pet-root');
        if(!host || !host.classList.contains('pet-bounce-ready'))return;
        ensureFresh();
        const moodGain=rand(7,14);
        state.mood=clamp(state.mood+moodGain);
        state.clean=clamp(state.clean-rand(0,1));
        state.fullness=clamp(state.fullness-rand(0,1));
        state.lastAction=`${PETS.ghost.name} ${pick(ACTION_LINES.play.bounce)} 心情 +${moodGain}`;
        state.lastActionType='bounce';
        saveState();recordCare();
        host.classList.remove('pet-bounce-ready');
        playFx('bounce');
        updatePanel(false);
    }

    function startCatchGame(){
        const host=document.getElementById('st-pixel-pet-root');
        const ball=host?.querySelector('.fx-ball');
        if(!host||!ball)return;
        host.classList.remove('fx-bounce','fx-catch');
        host.classList.add('catch-mode');
        ball.style.left='14%';
        ball.style.top='62%';
        ball.style.transform='translate(-50%,-50%) scale(1)';
        ball.style.transition='none';
        ball.style.opacity='1';
        const text=host.querySelector('.fx-catch-text');
        if(text)text.textContent='按住皮球拖动，松开就会顺着方向扔出去！';
    }

    function setupCatchBall(host){
        const ball=host.querySelector('.fx-ball');
        const stage=host.querySelector('.screen-stage');
        if(!ball||!stage)return;
        let drag=null;
        ball.addEventListener('pointerdown',event=>{
            if(!host.classList.contains('catch-mode'))return;
            event.preventDefault();
            ball.setPointerCapture?.(event.pointerId);
            const rect=stage.getBoundingClientRect();
            const x=event.clientX-rect.left; const y=event.clientY-rect.top;
            drag={pointerId:event.pointerId,startX:x,startY:y,lastX:x,lastY:y,lastTime:performance.now(),vx:0,vy:0};
            ball.classList.add('is-held');
        });
        ball.addEventListener('pointermove',event=>{
            if(!drag||event.pointerId!==drag.pointerId)return;
            const rect=stage.getBoundingClientRect();
            const x=Math.max(18,Math.min(rect.width-18,event.clientX-rect.left));
            const y=Math.max(18,Math.min(rect.height-18,event.clientY-rect.top));
            const now=performance.now(); const dt=Math.max(16,now-drag.lastTime);
            const instantVx=(x-drag.lastX)/dt; const instantVy=(y-drag.lastY)/dt;
            drag.vx=drag.vx*0.55+instantVx*0.45; drag.vy=drag.vy*0.55+instantVy*0.45;
            drag.lastX=x; drag.lastY=y; drag.lastTime=now;
            ball.style.left=`${x}px`;
            ball.style.top=`${y}px`;
        });
        const release=event=>{
            if(!drag||event.pointerId!==drag.pointerId)return;
            event.preventDefault();
            const d=drag; drag=null; ball.classList.remove('is-held');
            const rect=stage.getBoundingClientRect();
            const x=d.lastX, y=d.lastY;
            let vx=d.vx*1000, vy=d.vy*1000;
            const speed=Math.hypot(vx,vy);
            if(speed<90){ vx=120; vy=-70; }
            const len=Math.hypot(vx,vy)||1;
            const nx=vx/len, ny=vy/len;
            const pet=document.querySelector('.pet-avatar');
            let caught=false;
            if(pet){
                const pr=pet.getBoundingClientRect();
                const pcx=pr.left+pr.width/2-rect.left; const pcy=pr.top+pr.height*0.55-rect.top;
                const tx=pcx-x, ty=pcy-y;
                const proj=tx*nx+ty*ny;
                const closestX=x+Math.max(0,proj)*nx, closestY=y+Math.max(0,proj)*ny;
                const dist=Math.hypot(pcx-closestX,pcy-closestY);
                const reach=Math.min(180,Math.max(120, pet.clientWidth*.62));
                caught=proj>30 && proj<Math.max(rect.width,rect.height)*1.4 && dist<reach;
                if(caught){
                    const targetX=pcx, targetY=Math.max(26,pcy-8);
                    throwBall(ball,x,y,targetX,targetY,360,()=>finishCatchGame(host,ball));
                    const text=host.querySelector('.fx-catch-text'); if(text)text.textContent='接球！';
                    return;
                }
            }
            const distToEdge=Math.max(rect.width,rect.height)*1.1;
            const endX=Math.max(-70,Math.min(rect.width+70,x+nx*distToEdge));
            const endY=Math.max(-70,Math.min(rect.height+70,y+ny*distToEdge));
            const text=host.querySelector('.fx-catch-text'); if(text)text.textContent='再接近一点试试！';
            throwBall(ball,x,y,endX,endY,420,()=>{
                ball.style.opacity='0';
                setTimeout(()=>{ if(host.classList.contains('catch-mode'))startCatchGame(); },180);
            });
        };
        ball.addEventListener('pointerup',release);
        ball.addEventListener('pointercancel',()=>{ if(drag){drag=null; ball.classList.remove('is-held'); startCatchGame();} });
    }

    function throwBall(ball,x0,y0,x1,y1,duration,onDone){
        const start=performance.now();
        ball.style.transition='none';
        ball.style.opacity='1';
        const arc=Math.min(70,Math.max(18,Math.hypot(x1-x0,y1-y0)*0.12));
        function frame(now){
            const t=Math.min(1,(now-start)/duration);
            const e=1-Math.pow(1-t,3);
            const x=x0+(x1-x0)*e;
            const baseY=y0+(y1-y0)*e;
            const y=baseY-Math.sin(Math.PI*e)*arc;
            const scale=1+Math.sin(Math.PI*e)*0.12;
            ball.style.left=`${x}px`; ball.style.top=`${y}px`;
            ball.style.transform=`translate(-50%,-50%) scale(${scale}) rotate(${e*360}deg)`;
            if(t<1)requestAnimationFrame(frame); else if(onDone)onDone();
        }
        requestAnimationFrame(frame);
    }

    function finishCatchGame(host,ball){
        ensureFresh();
        const moodGain=rand(10,20);
        state.mood=clamp(state.mood+moodGain);
        state.clean=clamp(state.clean-rand(0,2));
        state.fullness=clamp(state.fullness-rand(0,1));
        state.lastAction=`${PETS.ghost.name} ${pick(ACTION_LINES.play.catch)} 心情 +${moodGain}`;
        state.lastActionType='catch';
        saveState();recordCare();
        host.classList.add('fx-catch');
        const art=host.querySelector('.pet-avatar');
        if(art){art.classList.remove('react-positive');void art.offsetWidth;art.classList.add('react-positive');}
        const reaction=host.querySelector('#pet-reaction');
        const status=host.querySelector('#pet-status-text');
        if(reaction)reaction.textContent=state.lastAction;
        if(status)status.textContent='球球接住啦！';
        updateStatsOnly(host);
        setTimeout(()=>{
            host.classList.remove('catch-mode','fx-catch');
            ball.style.opacity='0';
        },700);
    }

    function stopCatchGame(){
        const host=document.getElementById('st-pixel-pet-root');
        if(!host)return;
        host.classList.remove('catch-mode','fx-catch','pet-bounce-ready','fx-bounce','fx-bath-soap','fx-bath-shower');
        const ball=host.querySelector('.fx-ball');
        if(ball){ball.style.opacity='0';ball.classList.remove('is-held');}
    }

    function doPlay(id){
        ensureFresh();
        const host=document.getElementById('st-pixel-pet-root');
        const action=PLAY_ACTIONS.find(x=>x.id===id);
        if(!action||!host)return;
        stopCatchGame();
        if(id==='pat'){
            const moodGain=rand(6,13);
            state.mood=clamp(state.mood+moodGain);
            state.lastAction=`${PETS.ghost.name} 被轻轻摸摸头啦～ 心情 +${moodGain}`;
            state.lastActionType='pat';
            saveState();recordCare();updatePanel(true);playFx('pat');
            return;
        }
        if(id==='bounce'){
            host.classList.add('pet-bounce-ready');
            const reaction=host.querySelector('#pet-reaction');
            const status=host.querySelector('#pet-status-text');
            if(reaction)reaction.textContent='现在点击团子，它会开心地上下弹跳！';
            if(status)status.textContent='点团子开始弹跳';
            return;
        }
        if(id==='catch'){
            startCatchGame();
            const reaction=host.querySelector('#pet-reaction');
            const status=host.querySelector('#pet-status-text');
            if(reaction)reaction.textContent='按住皮球拖动，松开顺着方向扔给团子！';
            if(status)status.textContent='准备接球';
        }
    }

    function resetPet(){if(!window.confirm('要把宠物恢复成全新的初始状态吗？'))return;state=defaults();localStorage.removeItem(CARE_KEY);saveState();updatePanel(true);}
    function renamePet(){const name=window.prompt('给你的宠物取个名字：',state.name||'小团子');if(name&&name.trim()){state.name=name.trim().slice(0,12);state.lastAction=`它的名字改成了「${state.name}」`;saveState();updatePanel(true);}}
    function getCareCount(){const value=Number(localStorage.getItem(CARE_KEY)||0);return Number.isFinite(value)?value:0;}
    function recordCare(){try{localStorage.setItem(CARE_KEY,String(getCareCount()+1));}catch(_) {}}
    function updatePanel(withAnim=false){const panel=document.getElementById('st-pixel-pet-panel');if(!panel)return;ensureFresh();const artWrap=panel.querySelector('.pet-art-wrap');if(artWrap)artWrap.innerHTML=petArtHtml();const nameLabel=panel.querySelector('#pet-name-label'),statusText=panel.querySelector('#pet-status-text'),reaction=panel.querySelector('#pet-reaction'),careCount=panel.querySelector('#care-count'),infoName=panel.querySelector('#info-name'),infoSpecies=panel.querySelector('#info-species');if(nameLabel)nameLabel.textContent=state.name;if(infoName)infoName.textContent=state.name;if(infoSpecies)infoSpecies.textContent=PETS[state.petId]?.name||PETS.ghost.name;if(statusText)statusText.textContent=petFace().label;if(reaction)reaction.textContent=state.lastAction||'刚刚见面';if(careCount)careCount.textContent=getCareCount();const dot=panel.querySelector('#pet-status-dot');if(dot)dot.classList.toggle('alert',needsFood()||needsBath()||needsComfort());const stats=panel.querySelector('.stats-card .stats-list');if(stats)stats.innerHTML=`${statBar('心情','♡',state.mood,'mood')}${statBar('清洁','✦',state.clean,'clean')}${statBar('饱肚','◒',state.fullness,'fullness')}`;panel.querySelectorAll('.pet-choice').forEach(btn=>btn.classList.toggle('active',btn.dataset.id===state.petId));if(withAnim){const art=panel.querySelector('.pet-avatar');if(art){art.classList.remove('react','react-positive');void art.offsetWidth;art.classList.add('react-positive');}}}
    function playFx(type){const root=document.getElementById('st-pixel-pet-root'),art=root?.querySelector('.pet-avatar');if(!root||!art)return;root.classList.remove('fx-pat','fx-ball','fx-rope','fx-bounce','fx-roll','fx-catch','fx-feed','fx-bath','fx-select','fx-bath-soap','fx-bath-shower');void root.offsetWidth;root.classList.add(`fx-${type}`);art.classList.remove('react','react-positive');void art.offsetWidth;art.classList.add(type==='bounce'?'react':'react-positive');setTimeout(()=>root.classList.remove(`fx-${type}`),type==='bounce'?1500:900);}
    let clockTimer = null;
    function getAgeDays(){ return Math.max(1, Math.floor((Date.now() - (state.bornAt || Date.now())) / 86400000) + 1); }
    function updateClock(){
        const panel=document.getElementById('st-pixel-pet-panel');
        if(!panel) return;
        const now=new Date();
        const hh=String(now.getHours()).padStart(2,'0'); const mm=String(now.getMinutes()).padStart(2,'0');
        const clock=panel.querySelector('#lcd-clock'); if(clock) clock.textContent=`${hh}:${mm}`;
        const day=panel.querySelector('#lcd-day'); if(day) day.textContent=`DAY ${String(getAgeDays()).padStart(2,'0')}`;
        const mode=panel.querySelector('#lcd-mode'); if(mode) mode.textContent=(state.lastActionType||'idle').toUpperCase();
        const miMood=panel.querySelector('#mini-mood'); if(miMood) miMood.textContent=Math.round(state.mood);
        const miClean=panel.querySelector('#mini-clean'); if(miClean) miClean.textContent=Math.round(state.clean);
        const miFull=panel.querySelector('#mini-fullness'); if(miFull) miFull.textContent=Math.round(state.fullness);
        const moodIcon=panel.querySelector('#lcd-mood-icon'); if(moodIcon) moodIcon.textContent=state.mood<35?'♡':'♥';
        const cleanIcon=panel.querySelector('#lcd-clean-icon'); if(cleanIcon) cleanIcon.textContent=state.clean<35?'!' :'✦';
        const foodIcon=panel.querySelector('#lcd-food-icon'); if(foodIcon) foodIcon.textContent=state.fullness<35?'!' :'◒';
    }
    function ensureClockTicker(){ if(clockTimer) clearInterval(clockTimer); clockTimer=setInterval(updateClock,1000); }
    function startTicker(){if(ticker)clearInterval(ticker);ticker=setInterval(()=>{if(applyDecay())updatePanel(false);},30000);}
    function stopTicker(){if(ticker){clearInterval(ticker);ticker=null;}}
    function ensureHost(){if(!document.body)return false;buildPanel();ensureLauncher();return !!document.getElementById('st-pixel-pet-fab');}
    function initInternal(){if(!document.body){setTimeout(initInternal,100);return;}try{ensureHost();applyDecay();startTicker();if(!initialized){initialized=true;console.info(`${EXT_NAME} v${VERSION} initialized`);}}catch(error){console.error(`${EXT_NAME} initialization failed`,error);setTimeout(initInternal,500);}}

    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initInternal,{once:true});else initInternal();
    if(window.jQuery)window.jQuery(initInternal);
    window.addEventListener('pagehide',()=>{saveState();stopTicker();if(clockTimer){clearInterval(clockTimer);clockTimer=null;}});
    if(typeof MutationObserver!=='undefined'){let observeTimer=null;const observeBody=()=>{if(!document.body)return;const observer=new MutationObserver(()=>{if(observeTimer)return;observeTimer=setTimeout(()=>{observeTimer=null;if(!document.getElementById('st-pixel-pet-fab')||!document.getElementById('st-pixel-pet-root'))initInternal();},80);});observer.observe(document.body,{childList:true});};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeBody,{once:true});else observeBody();}
    window.SillyPet=Object.freeze({version:VERSION,init:initInternal,open:()=>togglePanel(true),close:()=>togglePanel(false)});
})();
