(function () {
    'use strict';

    const EXT_NAME = '[SillyPet]';
    const STORAGE_KEY = 'st_sillypet_v22';
    const CARE_KEY = `${STORAGE_KEY}_care`;
    const VERSION = '2.9.0';

    const PETS = {
        bunny: { id: 'bunny', name: '白兔团子', color: '#f7f7fb', shadow: '#c9cad5', eye: '#413b4d', blush: '#f0a4ad' },
        cat: { id: 'cat', name: '黑猫团子', color: '#2b2a31', shadow: '#16161b', eye: '#ffd66e', blush: '#a86169' },
        dog: { id: 'dog', name: '灰狗团子', color: '#9197a2', shadow: '#646b78', eye: '#27313a', blush: '#cc9398' },
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
        { id: 'roll', name: '打滚', icon: '↻', desc: '点团子就开始翻滚', mood: [7, 14], clean: [-2, 0], fullness: [-1, 0] },
        { id: 'catch', name: '顶球', icon: '●', desc: '把球拖出去让它接住', mood: [10, 20], clean: [-2, 0], fullness: [-1, 0] },
    ];

    const ACTION_LINES = {
        feed: {
            bunny: ['咔嚓咔嚓！', '兔兔抱着食物不撒手。', '耳朵立起来啦！'],
            cat: ['喵呜…再来一点。', '小黑团满足地舔舔嘴。', '尾巴开心地晃了晃。'],
            dog: ['汪！开心开吃！', '小狗团子摇起尾巴。', '吃完还想蹭蹭你。'],
        },
        bath: ['水花噗噜噗噜！', '香喷喷的泡泡包住它。', '洗完澡变得软乎乎。'],
        play: {
            pat: ['呼噜呼噜……好舒服。', '耳朵软乎乎地抖了一下。', '团子往你的手心蹭了蹭。'],
            ball: ['接到啦！', '团子一路滚过去追球。', '皮球咕噜噜地跑起来！'],
            roll: ['咕噜咕噜！团子滚起来啦！', '圆滚滚地翻了一圈～', '停下来时还在摇摇晃晃。'],
            catch: ['接到啦！', '团子顶住球啦！', '球球稳稳地落进怀里。'],
        },
    };

    let state = loadState();
    let ticker = null;
    let initialized = false;
    let keydownBound = false;

    function defaults() {
        return { petId: 'bunny', name: '小团子', mood: 80, clean: 85, fullness: 74, bornAt: Date.now(), lastTick: Date.now(), lastAction: '刚刚见面', lastActionType: 'idle' };
    }
    function loadState() {
        try { const raw = localStorage.getItem(STORAGE_KEY); const merged = { ...defaults(), ...(raw ? JSON.parse(raw) : {}) }; if (!merged.bornAt) merged.bornAt = Date.now(); return merged; }
        catch (error) { console.warn(`${EXT_NAME} state load failed`, error); return defaults(); }
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

    // Cute pixel creature artwork inspired by the user's reference image:
    // oversized sparkling eyes, compact lower body, bold pixel outline, tiny facial features.
    function petSvgHtml(pet) {
        const common = `shape-rendering="crispEdges" viewBox="0 0 160 190" role="img" aria-label="${escapeHtml(pet.name)}"`;
        const ink = '#2b2640';
        const white = '#fffaf8';
        if (pet.id === 'bunny') {
            return `<svg class="pet-sprite pet-sprite-bunny" ${common}>
                <g>
                    <!-- ears -->
                    <polygon fill="${ink}" points="38,46 30,42 28,18 35,8 45,10 51,30 48,45"/>
                    <polygon fill="#f7d8df" points="36,39 34,19 38,13 42,15 46,37 44,41"/>
                    <polygon fill="${ink}" points="77,44 80,27 88,9 98,8 104,18 101,43 94,50"/>
                    <polygon fill="#f7d8df" points="84,39 89,18 95,13 99,18 97,39 92,45"/>
                    <!-- body / big head silhouette -->
                    <polygon fill="${ink}" points="40,58 55,49 80,47 101,53 116,67 123,88 120,110 110,125 95,134 63,133 46,126 34,114 29,94 31,75"/>
                    <polygon fill="${white}" points="45,62 58,55 81,53 98,58 109,69 115,88 112,106 103,118 90,125 66,124 51,118 42,107 37,91 39,76"/>
                    <!-- tiny body -->
                    <polygon fill="${ink}" points="55,123 72,128 91,124 101,132 96,155 88,167 71,171 57,167 48,156 45,137"/>
                    <polygon fill="#efeef4" points="60,128 72,132 86,129 93,135 89,151 82,160 71,164 60,160 54,152 52,139"/>
                    <!-- eyes -->
                    <rect x="47" y="80" width="24" height="25" fill="#352f4b"/>
                    <rect x="88" y="80" width="24" height="25" fill="#352f4b"/>
                    <rect x="51" y="82" width="9" height="9" fill="#fff"/>
                    <rect x="92" y="82" width="9" height="9" fill="#fff"/>
                    <rect x="59" y="95" width="4" height="5" fill="#c3d7ff"/>
                    <rect x="100" y="95" width="4" height="5" fill="#c3d7ff"/>
                    <!-- cheeks -->
                    <rect x="40" y="102" width="15" height="7" fill="#efa3b3"/>
                    <rect x="105" y="102" width="15" height="7" fill="#efa3b3"/>
                    <!-- mouth -->
                    <rect x="76" y="104" width="7" height="5" fill="#4b3949"/>
                    <rect x="69" y="109" width="21" height="5" fill="#4b3949"/>
                    <rect x="76" y="114" width="7" height="3" fill="#4b3949"/>
                    <!-- tiny tail -->
                    <rect x="113" y="120" width="10" height="10" fill="#f7f7fb"/>
                    <rect x="120" y="116" width="11" height="10" fill="#f7f7fb"/>
                    <rect x="126" y="120" width="7" height="7" fill="${ink}"/>
                </g>
            </svg>`;
        }
        if (pet.id === 'cat') {
            return `<svg class="pet-sprite pet-sprite-cat" ${common}>
                <g>
                    <!-- cat ears -->
                    <polygon fill="${ink}" points="35,52 31,27 40,13 58,28 64,50"/>
                    <polygon fill="#47404f" points="40,42 38,27 41,21 53,31 55,43"/>
                    <polygon fill="${ink}" points="95,49 102,28 119,13 128,27 124,53"/>
                    <polygon fill="#47404f" points="104,42 109,31 119,20 122,27 119,43"/>
                    <!-- head -->
                    <polygon fill="${ink}" points="43,58 59,50 91,49 108,57 121,72 125,93 120,112 109,125 94,133 64,133 49,126 38,113 33,94 36,74"/>
                    <polygon fill="#3d3a44" points="48,62 61,56 90,55 104,62 114,73 118,91 114,106 104,117 91,124 66,124 54,119 45,108 40,93 43,76"/>
                    <!-- tiny body -->
                    <polygon fill="${ink}" points="56,124 71,129 89,125 99,134 94,156 86,168 70,171 55,167 47,156 45,137"/>
                    <polygon fill="#49464f" points="61,128 71,133 85,130 91,136 87,151 80,160 70,164 59,160 53,152 52,139"/>
                    <!-- eyes -->
                    <rect x="47" y="80" width="24" height="25" fill="#f1d56c"/>
                    <rect x="88" y="80" width="24" height="25" fill="#f1d56c"/>
                    <rect x="51" y="82" width="9" height="9" fill="#fffef5"/>
                    <rect x="92" y="82" width="9" height="9" fill="#fffef5"/>
                    <rect x="59" y="91" width="4" height="10" fill="#2a2330"/>
                    <rect x="100" y="91" width="4" height="10" fill="#2a2330"/>
                    <!-- cheeks + mouth -->
                    <rect x="40" y="102" width="15" height="7" fill="#a6616b"/>
                    <rect x="105" y="102" width="15" height="7" fill="#a6616b"/>
                    <rect x="76" y="104" width="7" height="5" fill="#e9b4bd"/>
                    <rect x="69" y="109" width="21" height="5" fill="#e9b4bd"/>
                    <rect x="76" y="114" width="7" height="3" fill="#e9b4bd"/>
                    <!-- tail -->
                    <polygon fill="${ink}" points="110,121 124,116 134,121 138,132 131,141 121,140 118,132"/>
                    <polygon fill="#3d3a44" points="117,124 125,121 131,124 133,131 128,136 122,135 121,130"/>
                </g>
            </svg>`;
        }
        return `<svg class="pet-sprite pet-sprite-dog" ${common}>
            <g>
                <!-- floppy ears -->
                <polygon fill="${ink}" points="37,57 26,69 24,94 30,112 42,118 49,108 50,83 47,65"/>
                <polygon fill="#747b86" points="37,64 31,74 30,93 34,105 41,109 43,101 43,81 41,69"/>
                <polygon fill="${ink}" points="112,57 123,68 127,91 122,111 111,119 104,108 104,84 107,65"/>
                <polygon fill="#747b86" points="114,64 120,73 121,91 118,104 112,109 110,101 110,81 111,68"/>
                <!-- head -->
                <polygon fill="${ink}" points="43,59 58,50 90,49 107,56 119,71 124,92 120,111 108,125 93,133 63,132 48,126 37,113 33,94 36,74"/>
                <polygon fill="#9ba0a8" points="48,63 60,56 89,55 103,61 112,73 117,91 113,107 103,118 90,124 65,123 53,118 45,108 40,93 43,77"/>
                <!-- tiny body -->
                <polygon fill="${ink}" points="56,123 72,128 89,124 99,133 94,155 86,168 70,171 55,167 47,156 45,137"/>
                <polygon fill="#858b95" points="61,128 71,133 85,130 91,136 87,151 80,160 70,164 59,160 53,152 52,139"/>
                <!-- muzzle patch -->
                <rect x="67" y="96" width="20" height="21" fill="#d4d3d0"/>
                <rect x="74" y="96" width="12" height="10" fill="#2f343e"/>
                <rect x="70" y="107" width="20" height="5" fill="#2f343e"/>
                <!-- eyes -->
                <rect x="48" y="78" width="20" height="22" fill="#2f343e"/>
                <rect x="91" y="78" width="20" height="22" fill="#2f343e"/>
                <rect x="52" y="80" width="8" height="8" fill="#fff"/>
                <rect x="95" y="80" width="8" height="8" fill="#fff"/>
                <!-- cheeks -->
                <rect x="40" y="100" width="14" height="7" fill="#d4939d"/>
                <rect x="106" y="100" width="14" height="7" fill="#d4939d"/>
                <!-- tail -->
                <polygon fill="${ink}" points="108,123 122,119 131,123 134,132 128,140 119,140 115,134"/>
                <polygon fill="#8e949e" points="115,125 122,123 127,126 129,131 125,135 120,135 118,131"/>
            </g>
        </svg>`;
    }

    function petArtHtml() {
        const pet = PETS[state.petId] || PETS.bunny;
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
                                <div class="play-fx-layer" aria-hidden="true"><div class="fx-hand">✋</div><div class="fx-ball" role="button" aria-label="拖动皮球">●</div><div class="fx-dust d1"></div><div class="fx-dust d2"></div><div class="fx-note">♪</div><div class="fx-catch-text">把球丢给团子！</div></div>
                                <div class="pet-art-wrap">${petArtHtml()}</div>
                            </div>
                            <div class="lcd-footer"><span class="lcd-pet-name" id="pet-name-label">${escapeHtml(state.name)}</span><span class="lcd-message" id="pet-status-text">${escapeHtml(petFace().label)}</span></div>
                        </div>
                    </section>

                    <div class="info-strip">
                        <button class="pet-info-pill" data-action="rename"><span class="pill-icon">♥</span><span><b id="info-name">${escapeHtml(state.name)}</b><small>名字</small></span><span class="pill-edit">✎</span></button>
                        <div class="pet-info-pill pet-switcher"><span class="switch-title">伙伴</span><div class="pet-choice-row">
                            <button type="button" class="pet-choice" data-action="select-pet" data-id="bunny"><span class="pet-choice-dot bunny-dot"></span><span>兔</span></button>
                            <button type="button" class="pet-choice" data-action="select-pet" data-id="cat"><span class="pet-choice-dot cat-dot"></span><span>猫</span></button>
                            <button type="button" class="pet-choice" data-action="select-pet" data-id="dog"><span class="pet-choice-dot dog-dot"></span><span>狗</span></button>
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
        document.body.appendChild(fab); fab.addEventListener('click',()=>togglePanel());
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
            if(host.classList.contains('pet-roll-ready')){
                event.preventDefault();
                doPetRoll();
            }
        });
        setupCatchBall(host);
        if(!keydownBound){document.addEventListener('keydown',event=>{if(event.key==='Escape')togglePanel(false);});keydownBound=true;}
    }
    function togglePanel(force){const panel=document.getElementById('st-pixel-pet-panel'),fab=document.getElementById('st-pixel-pet-fab');if(!panel||!fab)return;const currentOpen=panel.getAttribute('aria-hidden')==='false';const open=force===undefined?!currentOpen:Boolean(force); if(!open) stopCatchGame(); panel.setAttribute('aria-hidden',String(!open));fab.classList.toggle('is-open',open);fab.setAttribute('aria-expanded',String(open));document.documentElement.classList.toggle('st-sillypet-open',open);}
    function switchTab(tab){document.querySelectorAll('#st-pixel-pet-root .pet-tab').forEach(item=>item.classList.toggle('active',item.dataset.tab===tab));document.querySelectorAll('#st-pixel-pet-root .tab-content').forEach(item=>item.classList.toggle('active',item.id===`tab-${tab}`));}
    function ensureFresh(){applyDecay();}
    function selectPet(id){if(!PETS[id])return;ensureFresh();state.petId=id;state.mood=clamp(state.mood+rand(2,6));state.lastAction=`遇见了 ${PETS[id].name}！`;state.lastActionType='pet';saveState();recordCare();updatePanel(true);playFx('select');}
    function doFeed(id){ensureFresh();const food=FOODS.find(x=>x.id===id);if(!food)return;const amount=rand(food.gain[0],food.gain[1]),moodGain=rand(4,9);state.fullness=clamp(state.fullness+amount);state.mood=clamp(state.mood+moodGain);state.lastAction=`${PETS[state.petId].name} ${pick(ACTION_LINES.feed[state.petId])} 饱肚 +${amount} / 心情 +${moodGain}`;state.lastActionType='feed';saveState();recordCare();updatePanel(true);playFx('feed');}
    function doBath(id){ensureFresh();const tool=TOOLS.find(x=>x.id===id);if(!tool)return;const amount=rand(tool.gain[0],tool.gain[1]),moodGain=rand(5,11);state.clean=clamp(state.clean+amount);state.mood=clamp(state.mood+moodGain);state.lastAction=`${PETS[state.petId].name} ${pick(ACTION_LINES.bath)} 清洁 +${amount} / 心情 +${moodGain}`;state.lastActionType='bath';saveState();recordCare();updatePanel(true);playFx('bath');}
    function doPetRoll(){
        const host=document.getElementById('st-pixel-pet-root');
        if(!host || !host.classList.contains('pet-roll-ready'))return;
        ensureFresh();
        const moodGain=rand(7,14);
        state.mood=clamp(state.mood+moodGain);
        state.clean=clamp(state.clean-rand(0,2));
        state.fullness=clamp(state.fullness-rand(0,1));
        state.lastAction=`${PETS[state.petId].name} ${pick(ACTION_LINES.play.roll)} 心情 +${moodGain}`;
        state.lastActionType='roll';
        saveState();recordCare();
        host.classList.remove('pet-roll-ready');
        playFx('roll');
        updatePanel(false);
    }

    function startCatchGame(){
        const host=document.getElementById('st-pixel-pet-root');
        const ball=host?.querySelector('.fx-ball');
        if(!host||!ball)return;
        host.classList.remove('fx-roll','fx-catch');
        host.classList.add('catch-mode');
        ball.style.left='14%';
        ball.style.top='62%';
        ball.style.transform='translate(-50%,-50%) scale(1)';
        ball.style.transition='none';
        ball.style.opacity='1';
        const text=host.querySelector('.fx-catch-text');
        if(text)text.textContent='拖住球，朝团子丢过去！';
    }

    function setupCatchBall(host){
        const ball=host.querySelector('.fx-ball');
        const stage=host.querySelector('.pet-stage');
        if(!ball||!stage)return;
        let drag=null;
        ball.addEventListener('pointerdown',event=>{
            if(!host.classList.contains('catch-mode'))return;
            event.preventDefault();
            ball.setPointerCapture?.(event.pointerId);
            drag={pointerId:event.pointerId};
        });
        ball.addEventListener('pointermove',event=>{
            if(!drag||event.pointerId!==drag.pointerId)return;
            const rect=stage.getBoundingClientRect();
            const x=Math.max(16,Math.min(rect.width-16,event.clientX-rect.left));
            const y=Math.max(18,Math.min(rect.height-18,event.clientY-rect.top));
            ball.style.left=`${x}px`;
            ball.style.top=`${y}px`;
        });
        ball.addEventListener('pointerup',event=>{
            if(!drag||event.pointerId!==drag.pointerId)return;
            drag=null;
            const rect=stage.getBoundingClientRect();
            const x=event.clientX-rect.left, y=event.clientY-rect.top;
            const ok=x>rect.width*0.44 && x<rect.width*0.92 && y>rect.height*0.18 && y<rect.height*0.82;
            if(!ok){
                ball.animate([{transform:'translate(-50%,-50%) scale(1)'},{transform:'translate(-50%,-50%) scale(.78)'},{transform:'translate(-50%,-50%) scale(1)'}],{duration:280,iterations:1});
                return;
            }
            host.classList.add('fx-catch');
            ball.style.transition='left .55s steps(7,end), top .55s steps(7,end), transform .55s steps(7,end)';
            ball.style.left='52%';
            ball.style.top='46%';
            ball.style.transform='translate(-50%,-50%) scale(.78)';
            const text=host.querySelector('.fx-catch-text');
            if(text)text.textContent='接住啦！';
            setTimeout(()=>finishCatchGame(host,ball),560);
        });
        ball.addEventListener('pointercancel',()=>{drag=null;});
    }

    function finishCatchGame(host,ball){
        ensureFresh();
        const moodGain=rand(10,20);
        state.mood=clamp(state.mood+moodGain);
        state.clean=clamp(state.clean-rand(0,2));
        state.fullness=clamp(state.fullness-rand(0,1));
        state.lastAction=`${PETS[state.petId].name} ${pick(ACTION_LINES.play.catch)} 心情 +${moodGain}`;
        state.lastActionType='catch';
        saveState();recordCare();
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
        },650);
    }

    function stopCatchGame(){
        const host=document.getElementById('st-pixel-pet-root');
        if(!host)return;
        host.classList.remove('catch-mode','fx-catch','pet-roll-ready');
        const ball=host.querySelector('.fx-ball');
        if(ball)ball.style.opacity='0';
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
            state.lastAction=`${PETS[state.petId].name} 被轻轻摸摸头啦～ 心情 +${moodGain}`;
            state.lastActionType='pat';
            saveState();recordCare();updatePanel(true);playFx('pat');
            return;
        }
        if(id==='roll'){
            host.classList.add('pet-roll-ready');
            const reaction=host.querySelector('#pet-reaction');
            const status=host.querySelector('#pet-status-text');
            if(reaction)reaction.textContent='现在点一下团子，它就会开始打滚！';
            if(status)status.textContent='点团子开始打滚';
            return;
        }
        if(id==='catch'){
            startCatchGame();
            const reaction=host.querySelector('#pet-reaction');
            const status=host.querySelector('#pet-status-text');
            if(reaction)reaction.textContent='把球拖出去，丢给团子接住！';
            if(status)status.textContent='准备接球';
        }
    }

    function resetPet(){if(!window.confirm('要把宠物恢复成全新的初始状态吗？'))return;state=defaults();localStorage.removeItem(CARE_KEY);saveState();updatePanel(true);}
    function renamePet(){const name=window.prompt('给你的宠物取个名字：',state.name||'小团子');if(name&&name.trim()){state.name=name.trim().slice(0,12);state.lastAction=`它的名字改成了「${state.name}」`;saveState();updatePanel(true);}}
    function getCareCount(){const value=Number(localStorage.getItem(CARE_KEY)||0);return Number.isFinite(value)?value:0;}
    function recordCare(){try{localStorage.setItem(CARE_KEY,String(getCareCount()+1));}catch(_) {}}
    function updatePanel(withAnim=false){const panel=document.getElementById('st-pixel-pet-panel');if(!panel)return;ensureFresh();const artWrap=panel.querySelector('.pet-art-wrap');if(artWrap)artWrap.innerHTML=petArtHtml();const nameLabel=panel.querySelector('#pet-name-label'),statusText=panel.querySelector('#pet-status-text'),reaction=panel.querySelector('#pet-reaction'),careCount=panel.querySelector('#care-count'),infoName=panel.querySelector('#info-name'),infoSpecies=panel.querySelector('#info-species');if(nameLabel)nameLabel.textContent=state.name;if(infoName)infoName.textContent=state.name;if(infoSpecies)infoSpecies.textContent=PETS[state.petId]?.name||PETS.bunny.name;if(statusText)statusText.textContent=petFace().label;if(reaction)reaction.textContent=state.lastAction||'刚刚见面';if(careCount)careCount.textContent=getCareCount();const dot=panel.querySelector('#pet-status-dot');if(dot)dot.classList.toggle('alert',needsFood()||needsBath()||needsComfort());const stats=panel.querySelector('.stats-card .stats-list');if(stats)stats.innerHTML=`${statBar('心情','♡',state.mood,'mood')}${statBar('清洁','✦',state.clean,'clean')}${statBar('饱肚','◒',state.fullness,'fullness')}`;panel.querySelectorAll('.pet-choice').forEach(btn=>btn.classList.toggle('active',btn.dataset.id===state.petId));if(withAnim){const art=panel.querySelector('.pet-avatar');if(art){art.classList.remove('react','react-positive');void art.offsetWidth;art.classList.add('react-positive');}}}
    function playFx(type){const root=document.getElementById('st-pixel-pet-root'),art=root?.querySelector('.pet-avatar');if(!root||!art)return;root.classList.remove('fx-pat','fx-ball','fx-rope','fx-roll','fx-catch','fx-feed','fx-bath','fx-select');void root.offsetWidth;root.classList.add(`fx-${type}`);art.classList.remove('react','react-positive');void art.offsetWidth;art.classList.add(type==='ball'||type==='roll'?'react':'react-positive');setTimeout(()=>root.classList.remove(`fx-${type}`),type==='roll'?1000:900);}
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
