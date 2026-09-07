let petState = JSON.parse(localStorage.getItem("SillyPetSave")) || {
    petType: "rabbit",
    hunger: 80,
    clean: 80,
    mood: 80,
    costume: 0
};

function savePetData() {
    localStorage.setItem("SillyPetSave", JSON.stringify(petState));
}

const costumeList = [
    { name: "日常小围巾", type: "scarf", color: "#94a3b8" },
    { name: "水手领", type: "sailor", color: "#60a5fa" },
    { name: "小蝴蝶结", type: "bow", color: "#f472b6" },
    { name: "运动帽", type: "cap", color: "#fb923c" },
    { name: "小花冠", type: "crown", color: "#ef4444" },
    { name: "睡衣小被角", type: "blanket", color: "#a78bfa" }
];

const foodList = [
    { name: "胡萝卜", hunger: 12, mood: 3 },
    { name: "小鱼干", hunger: 14, mood: 5 },
    { name: "肉骨头", hunger: 16, mood: 4 },
    { name: "面包", hunger: 9, mood: 2 },
    { name: "水果", hunger: 10, mood: 6 },
    { name: "小饼干", hunger: 11, mood: 7 }
];

const bathTools = [
    { name: "肥皂", clean: 15 },
    { name: "沐浴露", clean: 22 }
];

function createFloatingBall() {
    const floatBall = document.createElement("div");
    floatBall.id = "pet-float-ball";
    floatBall.innerHTML = `
        <svg viewBox="0 0 100 100">
            <circle cx="50" cy="55" r="32" fill="#f8a5c2"/>
            <circle cx="28" cy="30" r="14" fill="#f8a5c2"/>
            <circle cx="72" cy="30" r="14" fill="#f8a5c2"/>
            <circle cx="22" cy="60" r="11" fill="#f8a5c2"/>
            <circle cx="78" cy="60" r="11" fill="#f8a5c2"/>
            <ellipse cx="50" cy="60" rx="16" ry="12" fill="#fdd7e4"/>
        </svg>
    `;
    document.body.appendChild(floatBall);

    floatBall.addEventListener("click", () => {
        const panel = document.getElementById("pet-main-panel");
        panel ? panel.classList.toggle("pet-hidden") : createPetPanel();
    });
}

function createPetPanel() {
    const panel = document.createElement("div");
    panel.id = "pet-main-panel";
    panel.className = "pet-main-panel";
    panel.innerHTML = `
        <div class="pet-header">
            <span>🐾 SillyPet</span>
            <button id="pet-close-btn">×</button>
        </div>

        <div class="pet-stat-row">
            <div>🍚 饱肚：<span id="val-hunger">80</span></div>
            <div>🧼 清洁：<span id="val-clean">80</span></div>
            <div>💖 心情：<span id="val-mood">80</span></div>
        </div>

        <div class="pet-canvas-wrap">
            <canvas id="pet-canvas" width="240" height="240"></canvas>
            <div id="pet-status-tip" class="pet-tip"></div>
        </div>

        <div class="pet-tab-bar">
            <button data-tab="pet-select">选宠物</button>
            <button data-tab="feed-tab">喂食</button>
            <button data-tab="bath-tab">洗澡</button>
            <button data-tab="costume-tab">换装</button>
        </div>

        <div class="pet-tab-content" id="pet-select">
            <div class="btn-group">
                <button data-pet="rabbit">🐇 白兔子</button>
                <button data-pet="cat">🐈 黑猫</button>
                <button data-pet="dog">🐕 灰小狗</button>
            </div>
        </div>

        <div class="pet-tab-content pet-hidden" id="feed-tab">
            <div class="btn-group" id="food-list"></div>
        </div>

        <div class="pet-tab-content pet-hidden" id="bath-tab">
            <div class="btn-group" id="bath-list"></div>
        </div>

        <div class="pet-tab-content pet-hidden" id="costume-tab">
            <div class="btn-group" id="costume-list"></div>
        </div>
    `;
    document.body.appendChild(panel);

    document.getElementById("pet-close-btn").onclick = () => {
        panel.classList.add("pet-hidden");
    };

    panel.querySelectorAll(".pet-tab-bar button").forEach(btn => {
        btn.onclick = () => {
            const targetTab = btn.dataset.tab;
            panel.querySelectorAll(".pet-tab-content").forEach(t => t.classList.add("pet-hidden"));
            document.getElementById(targetTab).classList.remove("pet-hidden");
        };
    });

    const foodWrap = document.getElementById("food-list");
    foodList.forEach((food, idx) => {
        const b = document.createElement("button");
        b.innerText = food.name;
        b.onclick = () => feedPet(idx);
        foodWrap.appendChild(b);
    });

    const bathWrap = document.getElementById("bath-list");
    bathTools.forEach((tool, idx) => {
        const b = document.createElement("button");
        b.innerText = tool.name;
        b.onclick = () => bathPet(idx);
        bathWrap.appendChild(b);
    });

    const costWrap = document.getElementById("costume-list");
    costumeList.forEach((c, idx) => {
        const b = document.createElement("button");
        b.innerText = c.name;
        b.onclick = () => changeCostume(idx);
        costWrap.appendChild(b);
    });

    panel.querySelectorAll("[data-pet]").forEach(b => {
        b.onclick = () => {
            petState.petType = b.dataset.pet;
            savePetData();
            drawPet();
        };
    });

    drawPet();
}

function drawPet() {
    const canvas = document.getElementById("pet-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 240, 240);

    const isHungry = petState.hunger < 25;
    const isDirty = petState.clean < 25;
    const isSad = petState.mood < 25;

    const tipDom = document.getElementById("pet-status-tip");
    if (tipDom) {
        if (isHungry) tipDom.innerText = "😫 肚子饿啦";
        else if (isDirty) tipDom.innerText = "🤢 身上脏脏";
        else if (isSad) tipDom.innerText = "😔 心情不好";
        else tipDom.innerText = "😊 状态不错";
    }

    ctx.save();
    ctx.translate(120, 125);

    drawRoundPet(ctx, petState.petType, isHungry, isDirty, isSad);
    drawClothes(ctx, petState.costume);

    ctx.restore();

    const hDom = document.getElementById("val-hunger");
    const cDom = document.getElementById("val-clean");
    const mDom = document.getElementById("val-mood");

    if (hDom) hDom.innerText = Math.round(petState.hunger);
    if (cDom) cDom.innerText = Math.round(petState.clean);
    if (mDom) mDom.innerText = Math.round(petState.mood);
}

function drawRoundPet(ctx, type, hungry, dirty, sad) {
    const faceColor = type === "cat" ? "#1a1a1a" : type === "dog" ? "#888888" : "#ffffff";
    const cheekColor = type === "cat" ? "#ffdd00" : "#ffc8dd";

    ctx.fillStyle = faceColor;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = faceColor;
    if (type === "rabbit") {
        ctx.beginPath();
        ctx.ellipse(-18, -42, 8, 18, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(18, -42, 8, 18, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffc8dd";
        ctx.beginPath();
        ctx.ellipse(-18, -42, 5, 14, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(18, -42, 5, 14, 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    if (type === "cat") {
        ctx.beginPath();
        ctx.moveTo(-24, -30);
        ctx.lineTo(-14, -50);
        ctx.lineTo(-4, -30);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(24, -30);
        ctx.lineTo(14, -50);
        ctx.lineTo(4, -30);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ffdd00";
        ctx.beginPath();
        ctx.moveTo(-22, -32);
        ctx.lineTo(-16, -45);
        ctx.lineTo(-8, -32);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(22, -32);
        ctx.lineTo(16, -45);
        ctx.lineTo(8, -32);
        ctx.closePath();
        ctx.fill();
    }

    if (type === "dog") {
        ctx.beginPath();
        ctx.ellipse(-28, -18, 12, 16, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(28, -18, 12, 16, 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = sad ? "#666666" : "#000000";
    ctx.beginPath();
    ctx.arc(-12, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, -8, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-10, -10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(14, -10, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = cheekColor;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(-28, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = type === "cat" ? "#ffdd00" : "#ff9999";
    ctx.beginPath();
    ctx.arc(0, 8, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = type === "cat" ? "#ffdd00" : "#ff9999";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (sad) {
        ctx.arc(0, 18, 5, Math.PI, 0);
    } else {
        ctx.arc(0, 14, 5, 0, Math.PI);
    }
    ctx.stroke();

    if (hungry || dirty) {
        ctx.fillStyle = hungry ? "#ff4444" : "#888888";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(hungry ? "～" : "×", 0, -48);
    }
}

function drawClothes(ctx, costumeIndex) {
    const c = costumeList[costumeIndex];

    ctx.save();

    if (c.type === "scarf") {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.roundRect(-32, 22, 64, 18, 8);
        ctx.fill();

        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(22, 38, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    if (c.type === "sailor") {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(0, 28, 22, Math.PI, 0, true);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 28, 16, Math.PI * 1.1, Math.PI * 1.9);
        ctx.fill();

        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.moveTo(-6, 42);
        ctx.lineTo(0, 52);
        ctx.lineTo(6, 42);
        ctx.closePath();
        ctx.fill();
    }

    if (c.type === "bow") {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.ellipse(-10, -55, 10, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(10, -55, 10, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, -55, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    if (c.type === "cap") {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(0, -45, 18, Math.PI, 0, true);
        ctx.fill();

        ctx.fillStyle = c.color;
        ctx.fillRect(-22, -43, 44, 5);

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, -52, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    if (c.type === "crown") {
        ctx.fillStyle = c.color;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.arc(i * 10, -52, 7, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "#ffdd00";
        ctx.beginPath();
        ctx.arc(0, -52, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    if (c.type === "blanket") {
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(-30, 25, 60, 22, 10);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-26, 28, 8, 8);
        ctx.fillRect(-10, 28, 8, 8);
        ctx.fillRect(6, 28, 8, 8);
        ctx.fillRect(22, 28, 8, 8);
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

function feedPet(foodIndex) {
    const food = foodList[foodIndex];
    const addHunger = food.hunger + Math.random() * 6;
    const addMood = food.mood + Math.random() * 4;

    petState.hunger = Math.min(100, petState.hunger + addHunger);
    petState.mood = Math.min(100, petState.mood + addMood);

    savePetData();
    drawPet();
}

function bathPet(toolIndex) {
    const tool = bathTools[toolIndex];
    const addClean = tool.clean + Math.random() * 8;

    petState.clean = Math.min(100, petState.clean + addClean);
    savePetData();
    drawPet();
}

function changeCostume(idx) {
    petState.costume = idx;
    petState.mood = Math.min(100, petState.mood + Math.random() * 7);

    savePetData();
    drawPet();
}

function statDecayLoop() {
    petState.hunger = Math.max(0, petState.hunger - 0.22);
    petState.clean = Math.max(0, petState.clean - 0.16);
    petState.mood = Math.max(0, petState.mood - 0.11);

    savePetData();
    drawPet();
}

const waitDomLoad = setInterval(() => {
    if (document.body) {
        clearInterval(waitDomLoad);
        createFloatingBall();
        setInterval(statDecayLoop, 2000);
    }
}, 200);

console.log("🐾 SillyPet 已加载");

