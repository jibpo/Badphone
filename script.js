let players = [], history = [], idx = -1;
let sc1 = 0, sc2 = 0;
let deuceDecided = false;
let isDeuceActive = false;
let currentDeleteKey = null;

window.onload = loadGroups;

// --- 1. ระบบจัดการหน้าจอ (สลับหน้าไปมา) ---
function switchPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    if (el) el.classList.add('active');
}

// --- 2. ระบบจัดการกลุ่ม/ก๊วน (เหมือนเดิมทุกอย่าง) ---
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
    currentDeleteKey = key;
    const modal = document.getElementById('deleteModal');
    document.getElementById('deleteTargetName').innerText = key;
    if (modal) modal.style.display = 'flex';
}

function executeDelete() {
    const g = JSON.parse(localStorage.getItem('bad_v7_groups') || '{}');
    delete g[currentDeleteKey];
    localStorage.setItem('bad_v7_groups', JSON.stringify(g));
    loadGroups();
    document.getElementById('deleteModal').style.display = 'none';
}

// --- 3. ระบบสุ่มคู่ (รักษาระบบเดิมไว้ครบ) ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function startRandom() {
    const names = document.getElementById('pList').value.trim().split('\n').filter(x => x.trim());
    if(names.length < 4) return alert("ใส่ชื่ออย่างน้อย 4 คน");
    players = names.map(x => ({ name: x.trim(), played: 0 }));
    history = []; idx = -1;
    next();
    switchPage('pageMatch', document.querySelectorAll('.nav-item')[1]);
    document.getElementById('noMatch').style.display = 'none';
    document.getElementById('matchDisplay').style.display = 'block';
}

function next() {
    if(idx < history.length - 1) { idx++; render(); } 
    else {
        let sorted = [...players].sort((a,b) => a.played - b.played);
        let pool = sorted.slice(0, Math.min(players.length, 8));
        shuffleArray(pool);
        const sel = pool.slice(0,4);
        sel.forEach(s => {
            const p = players.find(player => player.name === s.name);
            if(p) p.played++;
        });
        history.push({ r: history.length + 1, p: [sel[0].name, sel[1].name, sel[2].name, sel[3].name] });
        idx = history.length - 1; render();
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

// --- 4. ระบบสกอร์บอร์ด (แก้ไขจุดที่มีปัญหา) ---
function openScore() { 
    const m = history[idx];
    if(m) {
        document.getElementById('pNameRed').innerText = `${m.p[0]} & ${m.p[1]}`;
        document.getElementById('pNameBlue').innerText = `${m.p[2]} & ${m.p[3]}`;
    }
    document.getElementById('scoreOverlay').style.display = 'flex'; 
    sc1 = 0; sc2 = 0; deuceDecided = false; isDeuceActive = false;
    document.getElementById('deuceStatus').innerText = ""; 
    upScore(); 
}

function closeScore() { document.getElementById('scoreOverlay').style.display = 'none'; }

function addPoint(t) { 
    if(t === 1) sc1++; else sc2++; 
    if (sc1 === 20 && sc2 === 20 && !deuceDecided) {
        document.getElementById('deuceChoiceModal').style.display = 'block';
    }
    checkWinner();
    upScore(); 
}

function removePoint(t) {
    if (t === 1) { if (sc1 > 0) sc1--; } else { if (sc2 > 0) sc2--; }
    checkWinner();
    upScore();
}

// แก้ไขจุดที่ถาม: กด End Game แล้วต้องไปหน้าผู้ชนะทันที
function setDeuceMode(active) {
    isDeuceActive = active;
    deuceDecided = true;
    document.getElementById('deuceChoiceModal').style.display = 'none';
    
    // ถ้าเลือก End Game (active=false) ให้ตัดสินและโชว์หน้า Winner ทันที
    if (!active) {
        checkWinner();
    }
    upScore();
}

function checkWinner() {
    const status = document.getElementById('deuceStatus');
    if (deuceDecided) {
        if (isDeuceActive) {
            if (sc1 === 30 || (sc1 >= 21 && sc1 - sc2 >= 2)) showWinner("RED TEAM", "#FF3B30");
            else if (sc2 === 30 || (sc2 >= 21 && sc2 - sc1 >= 2)) showWinner("BLUE TEAM", "#007AFF");
            else if (sc1 >= 20 && sc2 >= 20) status.innerText = (sc1 === sc2) ? "DEUCE" : "ADVANTAGE";
        } else {
            // โหมด End Game
            if (sc1 >= 21) showWinner("RED TEAM", "#FF3B30");
            else if (sc2 >= 21) showWinner("BLUE TEAM", "#007AFF");
        }
    } else {
        if (sc1 === 21) showWinner("RED TEAM", "#FF3B30");
        else if (sc2 === 21) showWinner("BLUE TEAM", "#007AFF");
    }
}

function showWinner(name, color) {
    document.getElementById('winnerText').innerText = name;
    document.getElementById('winnerCard').style.backgroundColor = color;
    document.getElementById('winnerModal').style.display = "flex";
}

// ปุ่มกลับหน้าหลักในหน้า Winner
function closeWinnerModal() {
    document.getElementById('winnerModal').style.display = "none";
    closeScore();
    // กลับหน้าสุ่มคู่ (ปุ่มที่ 2 ในเมนู)
    const navMatch = document.querySelectorAll('.nav-item')[1];
    switchPage('pageMatch', navMatch);
}

function upScore() { 
    document.getElementById('s1').innerText = sc1; 
    document.getElementById('s2').innerText = sc2; 
}

function updateHist() {
    const list = document.getElementById('histList');
    if(!list) return;
    let h = '<p style="font-weight:800; font-size:24px;">👤 STATS</p><div class="stats-grid">';
    players.sort((a,b) => b.played - a.played).forEach(p => {
        h += `<div class="stat-card"><span>${p.name}</span><span class="stat-count">${p.played}</span></div>`;
    });
    list.innerHTML = h + '</div>';
}