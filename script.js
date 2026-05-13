let players = [], history = [], idx = -1;
let sc1 = 0, sc2 = 0;
let deuceDecided = false, isDeuceActive = false;
let groupToDelete = null;

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
        <div class="tag" onclick="fillPlayerList('${k}')">${k}
            <div class="btn-del-tag" onclick="event.stopPropagation(); deleteGroup('${k}')">✕</div>
        </div>
    `).join('');
}

function fillPlayerList(key) {
    const g = JSON.parse(localStorage.getItem('bad_v7_groups') || '{}');
    document.getElementById('pList').value = g[key];
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

// --- ระบบสุ่มและนับสถิติ (แบบที่คุณต้องการ) ---
function startRandom() {
    const names = document.getElementById('pList').value.trim().split('\n').filter(x => x.trim());
    if(names.length < 4) return alert("ใส่ชื่ออย่างน้อย 4 คน");
    players = names.map(x => ({ name: x.trim(), played: 0 }));
    history = []; 
    idx = -1;
    next(); // สุ่มคู่แรกและเริ่มนับสถิติทันที
    switchPage('pageMatch', document.querySelectorAll('.nav-item')[1]);
    document.getElementById('noMatch').style.display = 'none';
    document.getElementById('matchDisplay').style.display = 'block';
}

function startRandom() {
    const names = document.getElementById('pList').value.trim().split('\n').filter(x => x.trim());
    if(names.length < 4) return alert("ใส่ชื่ออย่างน้อย 4 คน");
    
    // รีเซ็ตค่าเริ่มต้นใหม่ทั้งหมด
    players = names.map(x => ({ name: x.trim(), played: 0 }));
    history = []; 
    idx = -1;
    
    next(); // เริ่มสุ่มคู่แรก
    
    switchPage('pageMatch', document.querySelectorAll('.nav-item')[1]);
    document.getElementById('noMatch').style.display = 'none';
    document.getElementById('matchDisplay').style.display = 'block';
}

function next() {
    // กรณีที่ 1: ถ้ากดย้อนกลับมา แล้วกด "ถัดไป" เพื่อดูคู่เดิมที่เคยสุ่มไว้แล้ว
    if(idx < history.length - 1) { 
        idx++; 
        render(); 
        // ไม่ต้องสั่งบวกแต้ม played++ เพราะคู่นี้เคยถูกนับไปแล้วตอนสุ่มครั้งแรก
    } 
    // กรณีที่ 2: กด "ถัดไป" เพื่อสุ่มคู่ใหม่จริงๆ (แต้มจะถูกบวกเฉพาะที่นี่)
    else {
        // เลือกคนที่เล่นน้อยสุดมา 4 คน
        let sorted = [...players].sort((a,b) => (a.played - b.played) || (Math.random() - 0.5));
        let sel = sorted.slice(0, 4).sort(() => Math.random() - 0.5);
        
        // บันทึกประวัติ และ "บวกแต้มให้ผู้เล่นใหม่ 4 คนนี้เท่านั้น"
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
        updateHist(); // อัปเดตหน้าสถิติทันที
    }
}

function prev() { if(idx > 0) { idx--; render(); } }

function render() {
    const m = history[idx];
    document.getElementById('roundLabel').innerText = `MATCH ${m.r}`;
    document.getElementById('p1').innerText = m.p[0]; document.getElementById('p2').innerText = m.p[1];
    document.getElementById('p3').innerText = m.p[2]; document.getElementById('p4').innerText = m.p[3];
}

// --- ระบบสกอร์บอร์ดและดิวส์ (ตามที่ปรับล่าสุด) ---
function openScore() {
    const m = history[idx];
    document.getElementById('pNameRed').innerText = m.p[0] + " & " + m.p[1];
    document.getElementById('pNameBlue').innerText = m.p[2] + " & " + m.p[3];
    document.getElementById('scoreOverlay').style.display = 'flex';
    sc1 = 0; sc2 = 0; deuceDecided = false; isDeuceActive = false;
    document.getElementById('deuceStatus').innerText = "";
    document.getElementById('deuceChoiceModal').style.display = 'none';
    document.getElementById('winnerModal').style.display = 'none';
    upScore();
}

function closeScore() { document.getElementById('scoreOverlay').style.display = 'none'; }

function addPoint(t) {
    if(t === 1) sc1++; else sc2++;
    if(sc1 === 20 && sc2 === 20 && !deuceDecided) {
        document.getElementById('deuceChoiceModal').style.display = 'block';
    }
    checkWinner();
    upScore();
}

function removePoint(t) {
    if(t === 1) { if(sc1 > 0) sc1--; } else { if(sc2 > 0) sc2--; }
    checkWinner();
    upScore();
}

function setDeuceMode(active) {
    isDeuceActive = active;
    deuceDecided = true;
    document.getElementById('deuceChoiceModal').style.display = 'none';
    upScore();
}

function forceEndGame() {
    isDeuceActive = false;
    deuceDecided = true;
    document.getElementById('deuceChoiceModal').style.display = 'none';
    upScore(); 
}

function checkWinner() {
    if (deuceDecided && isDeuceActive) {
        if (sc1 === 30 || (sc1 >= 21 && sc1 - sc2 >= 2)) showWinner("RED TEAM");
        else if (sc2 === 30 || (sc2 >= 21 && sc2 - sc1 >= 2)) showWinner("BLUE TEAM");
    } else {
        // ใครถึง 21 ก่อนชนะ (กรณีเลือกไม่ดิวส์ หรือแต้มยังไม่ถึง 20-20)
        if (sc1 === 21) showWinner("RED TEAM");
        else if (sc2 === 21) showWinner("BLUE TEAM");
    }
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
    document.getElementById('s1').innerText = sc1;
    document.getElementById('s2').innerText = sc2;
    const st = document.getElementById('deuceStatus');
    if(deuceDecided && isDeuceActive && sc1 >= 20 && sc2 >= 20) {
        st.innerText = (sc1 === sc2) ? "DEUCE" : "ADVANTAGE";
    } else { st.innerText = ""; }
}

function updateHist() {
    const list = document.getElementById('histList');
    if (!list) return;

    // --- ส่วนที่ 1: ตารางสถิติจำนวนรอบของแต่ละคน ---
    let html = `
        <div style="margin-bottom: 30px;">
            <p style="font-weight:800; font-size:18px; color:#888; text-transform:uppercase; margin-bottom:10px;">👤 Player Stats</p>
            <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
    `;

    // เรียงคนเล่นมากสุดขึ้นก่อน
    [...players].sort((a, b) => b.played - a.played).forEach(p => {
        html += `
            <div class="stat-card" style="background:#fff; border:2px solid #000; border-radius:12px; padding:10px 15px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; font-size:14px;">${p.name}</span>
                <span class="stat-count" style="background:#D7FF5A; padding:2px 10px; border-radius:8px; font-weight:800; font-size:12px; border:1px solid #000;">${p.played}</span>
            </div>
        `;
    });
    html += `</div></div>`;

    // --- ส่วนที่ 2: ประวัติการสุ่ม (Match History) ---
    html += `
        <p style="font-weight:800; font-size:18px; color:#888; text-transform:uppercase; margin-bottom:10px;">📜 Match History</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    // แสดงประวัติการสุ่ม (เอาล่าสุดขึ้นก่อน)
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

// --- ระบบล้างรายชื่อแบบ Custom Modal ---

function showClearModal() {
    const modal = document.getElementById('clearConfirmModal');
    modal.style.display = 'flex';
    // ป้องกันการเลื่อนหน้าจอเบื้องหลัง
    document.body.style.overflow = 'hidden';
}

function hideClearModal() {
    const modal = document.getElementById('clearConfirmModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function executeClear() {
    const pList = document.getElementById('pList');
    if (pList) {
        pList.value = ""; // ล้างข้อมูล
    }
    hideClearModal(); // ปิด Modal
    pList.focus();    // เอาเคอร์เซอร์ไปวางพร้อมพิมพ์ต่อ
}