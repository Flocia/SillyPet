(function () {
    'use strict';

    const EXT_ID = 'sillypet';
    const EXT_NAME = '[SillyPet]';
    const STORAGE_KEY = 'st_sillypet_v11';
    const CARE_KEY = `${STORAGE_KEY}_care`;
    const VERSION = '1.3.0';

    const PETS = {
        bunny: { id: 'bunny', name: '白兔子', subtitle: '软乎乎 · 喜欢胡萝卜', color: '#f8f8fb', shadow: '#cfcfd9', eye: '#463b53', blush: '#f3a4ad' },
        cat: { id: 'cat', name: '黑猫', subtitle: '傲娇 · 喜欢鱼鱼', color: '#282830', shadow: '#15151b', eye: '#ffd66e', blush: '#9a5960' },
        dog: { id: 'dog', name: '灰色小狗', subtitle: '黏人 · 喜欢肉肉', color: '#8f949f', shadow: '#646a76', eye: '#27303a', blush: '#c98e94' },
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

    const OUTFITS = [
        { id: 'sailor', name: '水手服', icon: '⚓', desc: '元气航海风', cls: 'outfit-sailor' },
        { id: 'wizard', name: '魔法师', icon: '🪄', desc: '星星与月亮', cls: 'outfit-wizard' },
        { id: 'hoodie', name: '软萌卫衣', icon: '🧸', desc: '暖暖慵懒风', cls: 'outfit-hoodie' },
        { id: 'rain', name: '透明雨衣', icon: '☔', desc: '雨天也要可爱', cls: 'outfit-rain' },
        { id: 'yukata', name: '夏日浴衣', icon: '🌸', desc: '烟火祭典风', cls: 'outfit-yukata' },
        { id: 'royal', name: '小小王冠', icon: '👑', desc: '今天也很尊贵', cls: 'outfit-royal' },
    ];

    const ACTION_LINES = {
        feed: {
            bunny: ['咔嚓咔嚓！', '兔兔抱着食物不撒手。', '耳朵竖起来啦！'],
            cat: ['喵呜…再来一点。', '尾巴轻轻摇了摇。', '小黑猫满意地舔舔嘴。'],
            dog: ['汪！开心开吃！', '小狗摇起了尾巴。', '吃完还想蹭蹭你的手。'],
        },
        bath: ['水花噗噜噗噜！', '香喷喷的泡泡包住了它。', '洗完澡毛毛蓬松起来了。'],
        dress: ['换好啦！', '它在镜子前转了一圈。', '今天也要漂漂亮亮。'],
    };

    let state = loadState();
    let ticker = null;
    let initialized = false;
    let keydownBound = false;

    function defaults() {
        return {
            petId: 'bunny',
            name: '小团子',
            mood: 78,
            clean: 84,
            fullness: 73,
            outfitId: null,
            lastTick: Date.now(),
            lastAction: '刚刚见面',
            lastActionType: 'idle',
        };
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return { ...defaults(), ...parsed };
        } catch (error) {
            console.warn(`${EXT_NAME} failed to load state`, error);
            return defaults();
        }
    }

    function saveState() {
        state.lastTick = Date.now();
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn(`${EXT_NAME} failed to save state`, error);
        }
    }

    function clamp(value) {
        return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
    }

    function rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

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

    function petMoodBand() {
        if (state.mood < 35) return 'bad';
        if (state.mood < 65) return 'mid';
        return 'good';
    }

    function needsFood() { return state.fullness < 35; }
    function needsBath() { return state.clean < 35; }
    function needsComfort() { return state.mood < 35; }

    function petFace() {
        if (needsFood()) return { eyes: '• •', mouth: '︵', label: '咕噜…肚子空空的' };
        if (needsBath()) return { eyes: '• •', mouth: '﹏', label: '想洗澡了…有点脏' };
        if (needsComfort()) return { eyes: 'ಥ ಥ', mouth: '︶', label: '呜…有一点难过' };
        if (state.mood > 78) return { eyes: '◕ ◕', mouth: 'ᴗ', label: '今天的心情闪闪发光' };
        if (state.mood > 52) return { eyes: '•ᴗ•', mouth: 'ᴗ', label: '安安静静陪着你' };
        return { eyes: '• •', mouth: '﹏', label: '有点无聊了' };
    }

    function petArtHtml() {
        const pet = PETS[state.petId] || PETS.bunny;
        const outfit = OUTFITS.find(item => item.id === state.outfitId);
        const face = petFace();
        const classes = [
            'pet-avatar', `pet-${pet.id}`, `mood-${petMoodBand()}`,
            needsFood() ? 'state-hungry' : '',
            needsBath() ? 'state-dirty' : '',
            needsComfort() ? 'state-sad' : '',
            outfit?.cls || '',
        ].filter(Boolean).join(' ');

        return `<div class="${classes}" style="--pet-main:${pet.color};--pet-shadow:${pet.shadow};--pet-eye:${pet.eye};--pet-blush:${pet.blush};">
            <div class="pixel-spark s1"></div><div class="pixel-spark s2"></div><div class="pixel-spark s3"></div>
            <div class="pet-shadow"></div><div class="tail"></div><div class="body"></div>
            <div class="leg l1"></div><div class="leg l2"></div><div class="leg l3"></div><div class="leg l4"></div>
            <div class="ear e1"></div><div class="ear e2"></div>
            <div class="head"><div class="shine"></div><div class="face-eyes">${face.eyes}</div><div class="face-mouth">${face.mouth}</div><div class="blush b1"></div><div class="blush b2"></div></div>
            <div class="outfit-layer"></div><div class="accessory-layer"></div>
            <div class="dirty-bubbles"><i></i><i></i><i></i></div>
            <div class="tear-drop t1"></div><div class="tear-drop t2"></div>
            <div class="heart-pop">♥</div><div class="hunger-pop">zzz…</div>
        </div>`;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
    }

    function statBar(name, icon, value, key) {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        const tone = v < 35 ? 'low' : (v < 65 ? 'mid' : 'good');
        return `<div class="stat-row stat-${key}">
            <div class="stat-label"><span class="stat-icon">${icon}</span><span>${name}</span><strong>${Math.round(v)}</strong></div>
            <div class="stat-track"><div class="stat-fill ${tone}" style="width:${v}%"></div><div class="stat-gloss"></div></div>
        </div>`;
    }

    function actionCard(item, type) {
        return `<button class="action-card" data-action="${type}" data-id="${item.id}" title="${escapeHtml(item.desc)}">
            <span class="action-icon">${item.icon}</span><span class="action-name">${escapeHtml(item.name)}</span><span class="action-desc">${escapeHtml(item.desc)}</span>
        </button>`;
    }

    function buildPanel() {
        let host = document.getElementById('st-pixel-pet-root');
        if (!host) {
            host = document.createElement('div');
            host.id = 'st-pixel-pet-root';
            host.setAttribute('data-sillypet-root', '1');
            host.innerHTML = `
                <div id="st-pixel-pet-panel" class="pixel-pet-panel" aria-hidden="true" role="dialog" aria-label="电子宠物小屋">
                    <div class="pet-backdrop-close" data-action="close"></div>
                    <div class="pet-window" role="document">
                        <div class="pet-topbar">
                            <div><div class="eyebrow">PIXEL PET HOUSE · v${VERSION}</div><div class="pet-title">电子宠物小屋 <span>✦</span></div></div>
                            <div class="pet-top-actions"><button class="pet-mini-btn" data-action="reset" title="重置宠物" aria-label="重置宠物">↺</button><button class="pet-mini-btn" data-action="close" title="关闭" aria-label="关闭">×</button></div>
                        </div>
                        <div class="pet-main-grid">
                            <section class="pet-stage">
                                <div class="stage-grid"></div><div class="cloud c1"></div><div class="cloud c2"></div>
                                <div class="stage-caption"><span id="pet-status-dot"></span><span id="pet-status-text">${escapeHtml(petFace().label)}</span></div>
                                <div class="pet-art-wrap">${petArtHtml()}</div>
                                <div class="name-plate"><span class="name-dot"></span><span id="pet-name-label">${escapeHtml(state.name)}</span><button class="rename-btn" data-action="rename" aria-label="修改名字">✎</button></div>
                            </section>
                            <aside class="pet-side">
                                <div class="pet-selector-block"><div class="section-title">选择宠物 <span>SELECT</span></div>
                                    <div class="pet-selector">${Object.values(PETS).map(p => `<button class="pet-choice ${state.petId===p.id?'active':''}" data-action="select-pet" data-id="${p.id}"><span class="mini-pet mini-${p.id}"></span><span>${p.name}</span></button>`).join('')}</div>
                                </div>
                                <div class="stats-card"><div class="section-title">状态 <span>STATUS</span></div><div class="stats-list">${statBar('心情','♡',state.mood,'mood')}${statBar('清洁','✦',state.clean,'clean')}${statBar('饱肚','◒',state.fullness,'fullness')}</div></div>
                                <div class="reaction-card"><div class="reaction-badge">NOW</div><div id="pet-reaction">${escapeHtml(state.lastAction || '刚刚见面')}</div><small>状态会随着时间慢慢变化</small></div>
                            </aside>
                        </div>
                        <div class="pet-tabs" role="tablist">
                            <button class="pet-tab active" data-tab="feed" role="tab"><span>🍽</span>喂食</button>
                            <button class="pet-tab" data-tab="bath" role="tab"><span>🫧</span>洗澡</button>
                            <button class="pet-tab" data-tab="dress" role="tab"><span>✦</span>换装</button>
                        </div>
                        <div class="tab-content active" id="tab-feed" role="tabpanel"><div class="action-grid">${FOODS.map(x => actionCard(x,'feed')).join('')}</div><div class="tip-line">饿了会出现肚子咕噜和摇晃动画，记得及时补充能量。</div></div>
                        <div class="tab-content" id="tab-bath" role="tabpanel"><div class="action-grid two">${TOOLS.map(x => actionCard(x,'bath')).join('')}</div><div class="tip-line">变脏时宠物会出现小污点和嫌弃表情。</div></div>
                        <div class="tab-content" id="tab-dress" role="tabpanel"><div class="action-grid three">${OUTFITS.map(x => actionCard(x,'dress')).join('')}</div><div class="tip-line">换装会提升心情，每套服装都有独立的小配饰。</div></div>
                        <div class="pet-footer"><span>♡ 今日照顾次数：<b id="care-count">${getCareCount()}</b></span><span>Auto-save · Local</span></div>
                    </div>
                </div>`;
            document.body.appendChild(host);
            bindEvents(host);
        }
        ensureLauncher();
        updatePanel();
    }

    function ensureLauncher() {
        let fab = document.getElementById('st-pixel-pet-fab');
        if (fab) {
            fab.style.setProperty('display', 'flex', 'important');
            fab.style.setProperty('visibility', 'visible', 'important');
            fab.style.setProperty('opacity', '1', 'important');
            fab.style.setProperty('pointer-events', 'auto', 'important');
            return fab;
        }
        fab = document.createElement('button');
        fab.id = 'st-pixel-pet-fab';
        fab.type = 'button';
        fab.className = 'pixel-pet-fab';
        fab.setAttribute('aria-label', '打开电子宠物');
        fab.setAttribute('aria-expanded', 'false');
        fab.title = '打开电子宠物';
        fab.innerHTML = '<span class="paw-pad"></span><span class="paw-toe t1"></span><span class="paw-toe t2"></span><span class="paw-toe t3"></span><span class="paw-toe t4"></span>';
        // Critical inline fallback: the button remains visible even if a theme/plugin overrides CSS.
        fab.style.cssText += ';position:fixed!important;right:18px!important;bottom:18px!important;left:auto!important;top:auto!important;width:58px!important;height:58px!important;display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:2147483647!important;margin:0!important;padding:0!important;';
        document.body.appendChild(fab);
        fab.addEventListener('click', () => togglePanel());
        return fab;
    }

    function bindEvents(host) {
        host.addEventListener('click', event => {
            const button = event.target.closest('[data-action], [data-tab]');
            if (!button) return;
            if (button.dataset.tab) switchTab(button.dataset.tab);
            const action = button.dataset.action;
            if (!action) return;
            if (action === 'close') togglePanel(false);
            else if (action === 'rename') renamePet();
            else if (action === 'select-pet') selectPet(button.dataset.id);
            else if (action === 'feed') doFeed(button.dataset.id);
            else if (action === 'bath') doBath(button.dataset.id);
            else if (action === 'dress') doDress(button.dataset.id);
            else if (action === 'reset') resetPet();
        });


        if (!keydownBound) {
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') togglePanel(false);
            });
            keydownBound = true;
        }
    }

    function togglePanel(force) {
        const panel = document.getElementById('st-pixel-pet-panel');
        const fab = document.getElementById('st-pixel-pet-fab');
        if (!panel || !fab) return;
        const currentOpen = panel.getAttribute('aria-hidden') === 'false';
        const open = force === undefined ? !currentOpen : Boolean(force);
        panel.setAttribute('aria-hidden', String(!open));
        fab.classList.toggle('is-open', open);
        fab.setAttribute('aria-expanded', String(open));
        document.documentElement.classList.toggle('st-sillypet-open', open);
    }

    function switchTab(tab) {
        document.querySelectorAll('#st-pixel-pet-root .pet-tab').forEach(item => item.classList.toggle('active', item.dataset.tab === tab));
        document.querySelectorAll('#st-pixel-pet-root .tab-content').forEach(item => item.classList.toggle('active', item.id === `tab-${tab}`));
    }

    function ensureFresh() { applyDecay(); }

    function selectPet(id) {
        if (!PETS[id]) return;
        ensureFresh();
        state.petId = id;
        state.mood = clamp(state.mood + rand(2, 6));
        state.lastAction = `遇见了 ${PETS[id].name}！`;
        state.lastActionType = 'pet';
        saveState();
        recordCare();
        updatePanel(true);
    }

    function doFeed(id) {
        ensureFresh();
        const food = FOODS.find(item => item.id === id);
        if (!food) return;
        const amount = rand(food.gain[0], food.gain[1]);
        const moodGain = rand(4, 9);
        state.fullness = clamp(state.fullness + amount);
        state.mood = clamp(state.mood + moodGain);
        state.lastAction = `${PETS[state.petId].name} ${pick(ACTION_LINES.feed[state.petId])} 饱肚 +${amount} / 心情 +${moodGain}`;
        state.lastActionType = 'feed';
        saveState(); recordCare(); updatePanel(true); renderActionBurst(true);
    }

    function doBath(id) {
        ensureFresh();
        const tool = TOOLS.find(item => item.id === id);
        if (!tool) return;
        const amount = rand(tool.gain[0], tool.gain[1]);
        const moodGain = rand(5, 11);
        state.clean = clamp(state.clean + amount);
        state.mood = clamp(state.mood + moodGain);
        state.lastAction = `${PETS[state.petId].name} ${pick(ACTION_LINES.bath)} 清洁 +${amount} / 心情 +${moodGain}`;
        state.lastActionType = 'bath';
        saveState(); recordCare(); updatePanel(true); renderActionBurst(true);
    }

    function doDress(id) {
        ensureFresh();
        const outfit = OUTFITS.find(item => item.id === id);
        if (!outfit) return;
        const moodGain = rand(8, 18);
        const cleanGain = rand(0, 4);
        state.outfitId = outfit.id;
        state.mood = clamp(state.mood + moodGain);
        state.clean = clamp(state.clean + cleanGain);
        state.lastAction = `换上${outfit.name}！${pick(ACTION_LINES.dress)} 心情 +${moodGain}${cleanGain ? ` / 清洁 +${cleanGain}` : ''}`;
        state.lastActionType = 'dress';
        saveState(); recordCare(); updatePanel(true); renderActionBurst(true);
    }

    function resetPet() {
        const approved = window.confirm('要把宠物恢复成全新的初始状态吗？');
        if (!approved) return;
        state = defaults();
        localStorage.removeItem(CARE_KEY);
        saveState();
        updatePanel(true);
    }

    function renamePet() {
        const name = window.prompt('给你的宠物取个名字：', state.name || '小团子');
        if (name && name.trim()) {
            state.name = name.trim().slice(0, 12);
            state.lastAction = `它的名字改成了「${state.name}」`;
            saveState();
            updatePanel(true);
        }
    }

    function getCareCount() {
        const value = Number(localStorage.getItem(CARE_KEY) || 0);
        return Number.isFinite(value) ? value : 0;
    }

    function recordCare() {
        const next = getCareCount() + 1;
        try { localStorage.setItem(CARE_KEY, String(next)); } catch (_) { /* ignore */ }
    }

    function updatePanel(withAnim = false) {
        const panel = document.getElementById('st-pixel-pet-panel');
        if (!panel) return;
        ensureFresh();
        const artWrap = panel.querySelector('.pet-art-wrap');
        if (artWrap) artWrap.innerHTML = petArtHtml();
        const nameLabel = panel.querySelector('#pet-name-label');
        const statusText = panel.querySelector('#pet-status-text');
        const reaction = panel.querySelector('#pet-reaction');
        const careCount = panel.querySelector('#care-count');
        if (nameLabel) nameLabel.textContent = state.name;
        if (statusText) statusText.textContent = petFace().label;
        if (reaction) reaction.textContent = state.lastAction || '刚刚见面';
        if (careCount) careCount.textContent = getCareCount();

        const dot = panel.querySelector('#pet-status-dot');
        if (dot) dot.classList.toggle('alert', needsFood() || needsBath() || needsComfort());
        const stats = panel.querySelector('.stats-card .stats-list');
        if (stats) stats.innerHTML = `${statBar('心情','♡',state.mood,'mood')}${statBar('清洁','✦',state.clean,'clean')}${statBar('饱肚','◒',state.fullness,'fullness')}`;
        panel.querySelectorAll('.pet-choice').forEach(btn => btn.classList.toggle('active', btn.dataset.id === state.petId));

        if (withAnim) {
            const art = panel.querySelector('.pet-avatar');
            if (art) {
                art.classList.remove('react');
                void art.offsetWidth;
                art.classList.add('react');
            }
        }
    }

    function renderActionBurst(positive) {
        const art = document.querySelector('#st-pixel-pet-root .pet-art-wrap .pet-avatar');
        if (!art) return;
        art.classList.add(positive ? 'react-positive' : 'react');
        window.setTimeout(() => art.classList.remove('react-positive', 'react'), 800);
    }

    function startTicker() {
        if (ticker) window.clearInterval(ticker);
        ticker = window.setInterval(() => {
            const changed = applyDecay();
            if (changed) updatePanel(false);
        }, 30000);
    }

    function stopTicker() {
        if (ticker) {
            window.clearInterval(ticker);
            ticker = null;
        }
    }

    function ensureHost() {
        if (!document.body) return false;
        buildPanel();
        ensureLauncher();
        return !!document.getElementById('st-pixel-pet-fab');
    }

    function initInternal() {
        if (!document.body) {
            window.setTimeout(initInternal, 100);
            return;
        }
        try {
            ensureHost();
            applyDecay();
            startTicker();
            if (!initialized) {
                initialized = true;
                console.info(`${EXT_NAME} v${VERSION} initialized`);
            }
        } catch (error) {
            console.error(`${EXT_NAME} initialization failed`, error);
            window.setTimeout(initInternal, 500);
        }
    }

    // Match the reference project's proven third-party pattern: plain JS manifest,
    // self-initialization after DOM readiness, and a body-level fixed launcher.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initInternal, { once: true });
    } else {
        initInternal();
    }
    if (window.jQuery) window.jQuery(initInternal);

    window.addEventListener('pagehide', () => {
        saveState();
        stopTicker();
    });

    if (typeof MutationObserver !== 'undefined') {
        let observeTimer = null;
        const observeBody = () => {
            if (!document.body) return;
            const observer = new MutationObserver(() => {
                if (observeTimer) return;
                observeTimer = window.setTimeout(() => {
                    observeTimer = null;
                    if (!document.getElementById('st-pixel-pet-fab') || !document.getElementById('st-pixel-pet-root')) initInternal();
                }, 50);
            });
            observer.observe(document.body, { childList: true });
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeBody, { once: true });
        else observeBody();
    }

    window.SillyPet = Object.freeze({ version: VERSION, init: initInternal, open: () => togglePanel(true), close: () => togglePanel(false) });
    scheduleInit();
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', watchBody, { once: true });
    } else {
        watchBody();
    }
})();
