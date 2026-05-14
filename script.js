let players = [], history = [], idx = -1;
let sc1 = 0, sc2 = 0;
let deuceDecided = false, isDeuceActive = false;
let groupToDelete = null;
let lastScorer = 0; // 0 = ไม่มี, 1 = แดง, 2 = น้ำเงิน

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
    const names = document.getElementById('pList').value.trim().split('\n').filter(x => x.trim());
    if(names.length < 4) return alert("ใส่ชื่ออย่างน้อย 4 คน");
    
    players = names.map(x => ({ name: x.trim(), played: 0 }));
    history = []; 
    idx = -1;
    
    next(); 
    switchPage('pageMatch', document.querySelectorAll('.nav-item')[1]);
    document.getElementById('noMatch').style.display = 'none';
    document.getElementById('matchDisplay').style.display = 'block';
}

function next() {
    if(idx < history.length - 1) { 
        idx++; 
        render(); 
    } else {
        let sorted = [...players].sort((a,b) => (a.played - b.played) || (Math.random() - 0.5));
        let sel = sorted.slice(0, 4).sort(() => Math.random() - 0.5);
        
        sel.forEach(s => {
            let p = players.find(player => player.name === s.name);
            if (p) p.played++;
        });

        history.push({ 
            r: history.length + 1, 
            p: sel.map(s => s.name) 
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
    upScore();
}

function closeScore() { document.getElementById('scoreOverlay').style.display = 'none'; }

function addPoint(t) {
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(20); // สั่น 1 ครั้งเมื่อได้แต้ม
    }
    
    if(t === 1) sc1++; else sc2++;

    if(sc1 === 20 && sc2 === 20 && !deuceDecided) {
        document.getElementById('deuceChoiceModal').style.display = 'block';
    }
    checkWinner();
    upScore();
}

function removePoint(t) {
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([15, 10, 15]); // สั่นสองจังหวะเมื่อลดแต้ม
    }
    
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