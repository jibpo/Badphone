let players = [], history = [], idx = -1;
let sc1 = 0, sc2 = 0;
let deuceDecided = false, isDeuceActive = false;
let groupToDelete = null;
let lastScorer = 0; // 0 = ไม่มี, 1 = แดง, 2 = น้ำเงิน
let gameEnded = false; // เพิ่มตัวแปรนี้
let fixedEightMatches = []; // เก็บตารางแข่งล่วงหน้ากรณีมี 8 คนพอดี
let playerQueue = [];      // คิวล็อกลำดับคนนั่งรอจริง

window.onload = loadGroups;

function switchPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    if (el) el.classList.add('active');
}

// --- ระบบจัดการกลุ่ม ---
function saveGroup() {
    const name = document.getElementById('gName').value.trim();
    const list = document.getElementById('pList').value.trim();
    if(!name || !list) return;
    const g = JSON.parse(localStorage.getItem('bad_v7_groups') || '{}');
    g[name] = list;
    localStorage.setItem('bad_v7_groups', JSON.stringify(g));
    document.getElementById('gName').value = '';
    loadGroups();
}

function loadGroups() {
    const g = JSON.parse(localStorage.getItem('bad_v7_groups') || '{}');
    const tagsDiv = document.getElementById('tags');
    if (!tagsDiv) return;
    tagsDiv.innerHTML = Object.keys(g).map(k => `
        <div class="tag" onclick="fillPlayerList('${k}', this)">${k}
            <div class="btn-del-tag" onclick="event.stopPropagation(); deleteGroup('${k}')">✕</div>
        </div>
    `).join('');
}

function fillPlayerList(key, el) {
    const g = JSON.parse(localStorage.getItem('bad_v7_groups') || '{}');
    document.getElementById('pList').value = g[key];

    // เปลี่ยนสี Tag นิ่งๆ ทันที ไม่กระพริบ ไม่เลื่อน
    document.querySelectorAll('.tag').forEach(t => t.classList.remove('active-tag'));
    if (el) {
        el.classList.add('active-tag');
    }
}

function deleteGroup(key) {
    groupToDelete = key;
    document.getElementById('confirmMsg').innerText = `ต้องการลบก๊วน "${key}"?`;
    document.getElementById('confirmModal').style.display = 'flex';
    document.getElementById('btnConfirmDelete').onclick = () => {
        const g = JSON.parse(localStorage.getItem('bad_v7_groups') || '{}');
        delete g[groupToDelete];
        localStorage.setItem('bad_v7_groups', JSON.stringify(g));
        loadGroups();
        closeConfirm();
    };
}

function closeConfirm() { document.getElementById('confirmModal').style.display = 'none'; }

// --- ระบบสุ่มรอบจับคู่ ---
function startRandom() {
    const names = document.getElementById('pList').value.trim().split('\n').filter(x => x.trim()); //
    if(names.length < 4) return alert("ใส่ชื่ออย่างน้อย 4 คน"); //
    
    players = names.map(x => ({ name: x.trim(), played: 0 })); //
    history = [];  //
    idx = -1; //
    fixedEightMatches = []; 
    
    // ตั้งต้นคิวผู้เล่น (สุ่มลำดับแรกเข้าตอนเริ่มก๊วนครั้งแรกเพื่อความสนุกและยุติธรรม)
    let initialShuffled = [...players].sort(() => Math.random() - 0.5);
    playerQueue = initialShuffled.map(p => p.name);
    
    // หากมี 8 คนพอดี จะใช้สูตรล็อกเซตสลับฟันปลาพบกันหมด 6 แมตช์ตามที่คุณต้องการ
    if (players.length === 8) {
        generateFixedEightPattern();
    }
    
    next();  //
    switchPage('pageMatch', document.querySelectorAll('.nav-item')[1]); //
    document.getElementById('noMatch').style.display = 'none'; //
    document.getElementById('matchDisplay').style.display = 'block'; //
}

function generateFixedEightPattern() {
    let shuffled = [...players].sort(() => Math.random() - 0.5);
    let setA = shuffled.slice(0, 4).map(p => p.name);
    let setB = shuffled.slice(4, 8).map(p => p.name);
    
    fixedEightMatches = [
        [setA[0], setA[1], setA[2], setA[3]], // แมตช์ 1: เซต A เล่น (เซต B พักพร้อมกัน 4 คน)
        [setB[0], setB[1], setB[2], setB[3]], // แมตช์ 2: เซต B เล่น (เซต A พักพร้อมกัน 4 คน)
        [setA[0], setA[2], setA[1], setA[3]], // แมตช์ 3: เซต A สลับคู่ขาแบบที่ 2
        [setB[0], setB[2], setB[1], setB[3]], // แมตช์ 4: เซต B สลับคู่ขาแบบที่ 2
        [setA[0], setA[3], setA[1], setA[2]], // แมตช์ 5: เซต A สลับคู่ขาแบบที่ 3
        [setB[0], setB[3], setB[1], setB[2]]  // แมตช์ 6: เซต B สลับคู่ขาแบบที่ 3
    ];
}

function next() {
    if(idx < history.length - 1) { 
        idx++; 
        render(); 
    } else {
        let sel = [];

        // CASE 1: คนครบ 8 คนพอดี และยังแข่งอยู่ใน 6 แมตช์แรก (ใช้ตารางล็อกสลับเซต)
        if (players.length === 8 && history.length < fixedEightMatches.length) {
            sel = fixedEightMatches[history.length];
            
            sel.forEach(name => {
                let p = players.find(player => player.name === name);
                if (p) p.played++;
            });
        } 
        // CASE 2: กรณีคนไม่ครบ 8 คน (หรือเล่นรอบทั่วไปยาวๆ)
        else {
            // 1. ค้นหาหาคนที่เพิ่งเล่นติดต่อกันมาแล้ว 2 เกมล่าสุด เพื่อบังคับให้ไปพักท้ายแถวชั่วคราว
            let consecutivePlayers = [];
            if (history.length >= 2) {
                let lastMatch = history[history.length - 1].p;
                let prevMatch = history[history.length - 2].p;
                players.forEach(pl => {
                    if (lastMatch.includes(pl.name) && prevMatch.includes(pl.name)) {
                        consecutivePlayers.push(pl.name);
                    }
                });
            }

            // จัดระเบียบลำดับคิว: เอาคนเล่น 2 นัดติด ย้ายไปต่อท้ายแถวสุดแบบเคร่งครัด (ถ้าคนในก๊วนมีมากกว่า 4 คน)
            let finalQueue = [...playerQueue];
            if (players.length > 4 && consecutivePlayers.length > 0) {
                // ดึงคนเหนื่อยออกจากคิวชั่วคราว แล้วเอาไปแปะไว้ท้ายสุดของแถวรอ
                finalQueue = finalQueue.filter(p => !consecutivePlayers.includes(p));
                finalQueue.push(...consecutivePlayers);
                playerQueue = [...finalQueue]; // อัปเดตคิวหลักให้ถูกต้องตามนี้ด้วย
            }

            // 2. ดึง 4 คนแรกที่อยู่ "หัวคิว" ณ วินาทีนั้นออกมาเล่นทันที (ห้ามเปลี่ยนคน ห้ามดึงคนลำดับ 5,6,7 มาแทน)
            let chosenFour = playerQueue.slice(0, 4);
            
            // 3. เอาเฉพาะ 4 คนนี้ มาสุ่มไขว้ฝั่งหาคู่ขาที่ไม่ซ้ำกับแมตช์ที่แล้ว
            let bestLayout = [...chosenFour]; // ค่าตั้งต้น
            if (history.length > 0) {
                let lastMatch = history[history.length - 1].p; // [ทีมA_1, ทีมA_2, ทีมB_1, ทีมB_2]
                
                // วนลูปหาการจัดวางตำแหน่งฝั่งใน 4 คนเดิม เพื่อไม่ให้คู่ขาซ้ำแมตช์ที่แล้วเป๊ะๆ
                for (let i = 0; i < 20; i++) {
                    let testLayout = [...chosenFour].sort(() => Math.random() - 0.5);
                    
                    let isSamePair1 = (lastMatch[0] === testLayout[0] && lastMatch[1] === testLayout[1]) || (lastMatch[0] === testLayout[1] && lastMatch[1] === testLayout[0]);
                    let isSamePair2 = (lastMatch[2] === testLayout[2] && lastMatch[3] === testLayout[3]) || (lastMatch[2] === testLayout[3] && lastMatch[3] === testLayout[2]);
                    
                    if (!isSamePair1 && !isSamePair2) {
                        bestLayout = testLayout;
                        break; 
                    }
                }
            }
            
            sel = bestLayout;

            // 4. จัดคิวสำหรับแมตช์ถัดไป: ดึง 4 คนที่ได้เล่นรอบนี้ออกจากหัวคิว แล้วส่งไปต่อ "ท้ายแถวสุด" ของจริง
            playerQueue = playerQueue.filter(p => !sel.includes(p));
            playerQueue.push(...sel);
            
            // อัปเดตสถิติจำนวนครั้งที่เล่นสะสม
            sel.forEach(name => {
                let p = players.find(player => player.name === name);
                if (p) p.played++;
            });
        }

        // บันทึกประวัติและแสดงผลหน้าจอ (ฟังก์ชันเดิมทั้งหมดอยู่ครบ)
        history.push({ 
            r: history.length + 1, 
            p: sel 
        });
        
        idx = history.length - 1; 
        render();
        updateHist(); 
    }
}

function prev() { if(idx > 0) { idx--; render(); } }

function render() {
    const m = history[idx];
    document.getElementById('roundLabel').innerText = `MATCH ${m.r}`;
    document.getElementById('p1').innerText = m.p[0]; document.getElementById('p2').innerText = m.p[1];
    document.getElementById('p3').innerText = m.p[2]; document.getElementById('p4').innerText = m.p[3];
}

// --- ระบบสกอร์บอร์ด ---
function openScore() {
    const m = history[idx];
    document.getElementById('pNameRed').innerText = m.p[0] + " & " + m.p[1];
    document.getElementById('pNameBlue').innerText = m.p[2] + " & " + m.p[3];
    document.getElementById('scoreOverlay').style.display = 'flex';
    sc1 = 0; sc2 = 0; deuceDecided = false; isDeuceActive = false; lastScorer = 0;
    document.getElementById('deuceStatus').innerText = "";
    document.getElementById('deuceChoiceModal').style.display = 'none';
    document.getElementById('winnerModal').style.display = 'none';
    gameEnded = false;
    upScore();
}

function closeScore() { document.getElementById('scoreOverlay').style.display = 'none'; }

function addPoint(t) {
    if (gameEnded) return;
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
    if(t === 1) sc1++; else sc2++;

    if(sc1 === 20 && sc2 === 20 && !deuceDecided) {
        document.getElementById('deuceChoiceModal').style.display = 'block';
    }
    checkWinner();
    upScore();
}

function removePoint(t) {
    if (gameEnded) return;
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
    if(t === 1) { if(sc1 > 0) sc1--; } else { if(sc2 > 0) sc2--; }
    checkWinner();
    upScore();
}

function checkWinner() {
    if (deuceDecided && isDeuceActive) {
        if (sc1 === 30 || (sc1 >= 21 && sc1 - sc2 >= 2)) showWinner("RED TEAM");
        else if (sc2 === 30 || (sc2 >= 21 && sc2 - sc1 >= 2)) showWinner("BLUE TEAM");
    } else {
        if (sc1 === 21) showWinner("RED TEAM");
        else if (sc2 === 21) showWinner("BLUE TEAM");
    }
}

function setDeuceMode(active) {
    isDeuceActive = active;
    deuceDecided = true;
    document.getElementById('deuceChoiceModal').style.display = 'none';
    upScore();
}

// แตะคะแนนลดได้เมื่อถอยจากแต้มดิวส์
function forceEndGame() {
    isDeuceActive = false;
    deuceDecided = true;
    document.getElementById('deuceChoiceModal').style.display = 'none';
    upScore(); 
}

function showWinner(name) {
    gameEnded = true;
    document.getElementById('winnerText').innerText = name;
    document.getElementById('winnerModal').style.display = 'block';
}

function closeWinnerModal() {
    document.getElementById('winnerModal').style.display = 'none';
    closeScore();
}

function upScore() {
    const s1El = document.getElementById('s1');
    const s2El = document.getElementById('s2');
    const shut1 = document.getElementById('shuttle1');
    const shut2 = document.getElementById('shuttle2');

    if (parseInt(s1El.innerText) < sc1) {
        s1El.classList.remove('bounce');
        void s1El.offsetWidth;
        s1El.classList.add('bounce');
        lastScorer = 1;
    }
    if (parseInt(s2El.innerText) < sc2) {
        s2El.classList.remove('bounce');
        void s2El.offsetWidth;
        s2El.classList.add('bounce');
        lastScorer = 2;
    }

    // กำหนดลูกแบดขวาตัวเลขตามฝั่งส่ง
    if (shut1 && shut2) {
        shut1.style.visibility = (lastScorer === 1) ? 'visible' : 'hidden';
        shut2.style.visibility = (lastScorer === 2) ? 'visible' : 'hidden';
    }

    s1El.innerText = sc1;
    s2El.innerText = sc2;
    
    const st = document.getElementById('deuceStatus');
    if(deuceDecided && isDeuceActive && sc1 >= 20 && sc2 >= 20) {
        st.innerText = (sc1 === sc2) ? "DEUCE" : "ADVANTAGE";
    } else { st.innerText = ""; }
}

function updateHist() {
    const list = document.getElementById('histList');
    if (!list) return;

    let html = `
        <div style="margin-bottom: 30px;">
            <p style="font-weight:800; font-size:18px; color:#888; text-transform:uppercase; margin-bottom:10px;">👤 Player Stats</p>
            <div class="stats-grid">
    `;

    [...players].sort((a, b) => b.played - a.played).forEach(p => {
        html += `
            <div class="stat-card">
                <span style="font-weight:700; font-size:14px;">${p.name}</span>
                <span class="stat-count">${p.played}</span>
            </div>
        `;
    });
    html += `</div></div>`;

    html += `
        <p style="font-weight:800; font-size:18px; color:#888; text-transform:uppercase; margin-bottom:10px;">📜 Match History</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    if (history.length === 0) {
        html += `<div class="card" style="text-align:center; color:#888; padding:20px;">ยังไม่มีประวัติการแข่ง</div>`;
    } else {
        [...history].reverse().forEach(m => {
            html += `
                <div class="card" style="padding:15px; margin-top:0; border-width:2px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-weight:800; font-size:14px; background:#000; color:#fff; padding:2px 10px; border-radius:6px;">MATCH ${m.r}</span>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:center; gap:10px;">
                        <div style="flex:1; text-align:center; font-weight:700; font-size:13px;">
                            ${m.p[0]} + ${m.p[1]}
                        </div>
                        <div style="background:#D7FF5A; border:1px solid #000; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900;">VS</div>
                        <div style="flex:1; text-align:center; font-weight:700; font-size:13px;">
                            ${m.p[2]} + ${m.p[3]}
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    list.innerHTML = html;
}

function showClearModal() {
    document.getElementById('clearConfirmModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideClearModal() {
    document.getElementById('clearConfirmModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function executeClear() {
    const pList = document.getElementById('pList');
    if (pList) pList.value = "";
    hideClearModal();
    pList.focus();
}