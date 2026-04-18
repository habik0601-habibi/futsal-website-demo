/* =============================================
   OWNER DASHBOARD JS - dashboard.js
   Supabase-connected version
   ============================================= */

// ---- SUPABASE CONFIG ----
// Note: SUPA_URL, SUPA_KEY, and sbFetch are now loaded globally from script.js!

// ---- CONSTANTS ----
const COURTS = ['Chak Shehzad A', 'Chak Shehzad B', 'Ayub Park A'];
// TIME_SLOTS is natively inherited from script.js to avoid fatal SyntaxError
const WEEK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ---- STATE ----
let _now = new Date();
let calDate = new Date(_now.getFullYear(), _now.getMonth(), 1);
let weekDate = new Date();
let dayDate  = new Date();
let currentView = 'monthly';

let allBookings = [];
let allCustomers = [];
let allExpenses = [];
let allRefunds = [];
let allBlocks = [];
let allPricingRules = [];
let allReviews = [];

// ---- SIDEBAR NAV ----
document.querySelectorAll('.db-nav-link[data-section]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sec = link.dataset.section;
    document.querySelectorAll('.db-nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.db-section').forEach(s => s.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('sec-' + sec).classList.add('active');
    document.getElementById('dbSidebar').classList.remove('open');
  });
});

document.getElementById('hambBtn').addEventListener('click', () => {
  document.getElementById('dbSidebar').classList.toggle('open');
});

// ---- LOAD ALL DATA FROM SUPABASE ----
async function loadAll() {
  showLoading(true);
  try {
    const fetchPromises = Promise.all([
      sbFetch('bookings', { params: 'order=created_at.desc' }),
      sbFetch('customers', { params: 'order=spend.desc' }),
      sbFetch('expenses', { params: 'order=created_at.desc' }),
      sbFetch('refunds', { params: 'order=created_at.desc' }),
      sbFetch('blocked_periods', { params: 'order=from_date.asc' }),
      sbFetch('pricing_rules', { params: 'order=created_at.asc' }),
      sbFetch('reviews', { params: 'order=created_at.desc' }),
    ]);

    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
    );

    const [bk, cu, ex, re, bl, pr, rv] = await Promise.race([fetchPromises, timeoutPromise]);

    allBookings     = bk  || [];
    allCustomers    = cu  || [];
    allExpenses     = ex  || [];
    allRefunds      = re  || [];
    allBlocks       = bl  || [];
    allPricingRules = pr  || [];
    allReviews      = rv  || [];

    showErrorBanner(false);
  } catch (err) {
    console.error("Dashboard Load Error:", err);
    showErrorBanner(true, err.message === 'TIMEOUT' ? "Failed to load bookings. Please refresh." : "Error connecting to database. " + err.message);
    
    // Fallback to empty so UI still renders, allowing navigation
    allBookings = []; allCustomers = []; allExpenses = []; 
    allRefunds = []; allBlocks = []; allPricingRules = []; allReviews = [];
  } finally {
    showLoading(false);
    renderMonthly();
    renderBookingsTable(allBookings);
    renderCourts();
    renderCustomers(allCustomers);
    renderFinancials();
    renderAnalytics();
    renderComms();
  }
}

function showErrorBanner(show, msg = "") {
  let banner = document.getElementById('dbErrorBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'dbErrorBanner';
    banner.style.cssText = 'background: rgba(255, 85, 85, 0.1); color: #ff5555; padding: 15px 20px; border: 1px solid rgba(255, 85, 85, 0.3); border-radius: 8px; margin: 2rem; font-weight: bold; text-align: center;';
    const main = document.getElementById('dbMain');
    if (main) main.prepend(banner);
  }
  banner.style.display = show ? 'block' : 'none';
  banner.textContent = msg;
}

function showLoading(on) {
  let el = document.getElementById('dbLoader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'dbLoader';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),transparent);z-index:9999;transition:opacity 0.3s;';
    document.body.appendChild(el);
  }
  el.style.opacity = on ? '1' : '0';
}

// ---- CALENDAR ----
function renderMonthly() {
  document.getElementById('calMonthLabel').textContent = `${MONTHS[calDate.getMonth()]} ${calDate.getFullYear()}`;
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  const first = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay() || 7;
  const days  = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate();
  const today = new Date();
  const monthStr = `${calDate.getFullYear()}-${String(calDate.getMonth()+1).padStart(2,'0')}`;

  // Count bookings per day this month
  const bookedMap = {};
  allBookings.forEach(b => {
    if (b.booking_date && b.booking_date.startsWith(monthStr) && b.status !== 'cancelled') {
      const d = parseInt(b.booking_date.split('-')[2]);
      bookedMap[d] = (bookedMap[d] || 0) + 1;
    }
  });

  // Blocked days
  const blockedSet = new Set();
  allBlocks.forEach(bl => {
    const from = new Date(bl.from_date), to = new Date(bl.to_date);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate()+1)) {
      if (d.getFullYear() === calDate.getFullYear() && d.getMonth() === calDate.getMonth()) {
        blockedSet.add(d.getDate());
      }
    }
  });

  for (let i = 1; i < first; i++) grid.innerHTML += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= days; d++) {
    let cls = 'open';
    if (blockedSet.has(d)) cls = 'blocked';
    else if ((bookedMap[d] || 0) >= 6) cls = 'booked';
    else if ((bookedMap[d] || 0) >= 1) cls = 'partial';

    const isToday = (calDate.getFullYear() === today.getFullYear() && calDate.getMonth() === today.getMonth() && d === today.getDate());
    grid.innerHTML += `<div class="cal-cell ${cls}${isToday?' today-ring':''}" onclick="openDayDetail(${d})" title="${bookedMap[d]||0} bookings">${d}</div>`;
  }
}

window.changeCalMonth = (dir) => { calDate.setMonth(calDate.getMonth() + dir); renderMonthly(); };

// ---- WEEKLY VIEW ----
function renderWeekly() {
  const start = new Date(weekDate);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const labels = [];
  for (let d = 0; d < 7; d++) {
    const dd = new Date(start); dd.setDate(dd.getDate() + d);
    labels.push(WEEK_DAYS[d] + ' ' + dd.getDate());
  }
  document.getElementById('weekLabel').textContent = labels[0] + ' – ' + labels[6];
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '<div class="week-header-cell"></div>' + labels.map(l => `<div class="week-header-cell">${l}</div>`).join('');
  TIME_SLOTS.forEach(t => {
    grid.innerHTML += `<div class="week-time-label">${t}</div>`;
    for (let d = 0; d < 7; d++) {
      const dd = new Date(start); dd.setDate(dd.getDate() + d);
      const dateStr = dd.toISOString().split('T')[0];
      const match = allBookings.find(b => b.booking_date === dateStr && b.time_slot === t && b.status !== 'cancelled');
      const isBlocked = allBlocks.some(bl => dateStr >= bl.from_date && dateStr <= bl.to_date);
      const cls = isBlocked ? 'blocked-slot' : (match ? 'booked-slot' : '');
      const txt = isBlocked ? '🔒 Blocked' : (match ? `⚽ ${match.buyer_name}` : '');
      grid.innerHTML += `<div class="week-slot ${cls}">${txt}</div>`;
    }
  });
}

window.changeWeek = (dir) => { weekDate.setDate(weekDate.getDate() + dir * 7); renderWeekly(); };

// ---- DAILY VIEW ----
function renderDaily() {
  document.getElementById('dayLabel').textContent = `${WEEK_DAYS[(dayDate.getDay()+6)%7]} ${dayDate.getDate()} ${MONTHS_SHORT[dayDate.getMonth()]} ${dayDate.getFullYear()}`;
  const dateStr = dayDate.toISOString().split('T')[0];
  const grid = document.getElementById('dailyGrid');
  grid.innerHTML = `<div class="daily-slot" style="background:rgba(0,255,136,0.05);border-color:rgba(0,255,136,0.15);font-weight:700;font-size:0.78rem;color:#94a3b8;">
    <span>TIME</span><span>CHAK SHEHZAD A</span><span>CHAK SHEHZAD B</span><span>AYUB PARK A</span>
  </div>`;
  const isBlocked = allBlocks.some(bl => dateStr >= bl.from_date && dateStr <= bl.to_date);
  TIME_SLOTS.forEach(t => {
    const courts = COURTS.map(cn => {
      if (isBlocked) return `<span style="color:#ff5555;">🔒 Blocked</span>`;
      const bk = allBookings.find(b => b.booking_date === dateStr && b.time_slot === t && b.court_name === cn && b.status !== 'cancelled');
      if (bk) return `<span><strong style="color:var(--accent);">Booked</strong><br><small style="color:#94a3b8;">${bk.buyer_name}</small></span>`;
      return `<span style="color:#94a3b8;">— Open —</span>`;
    });
    grid.innerHTML += `<div class="daily-slot"><span class="slot-time">${t}</span>${courts.join('')}</div>`;
  });
}

window.changeDay = (dir) => { dayDate.setDate(dayDate.getDate() + dir); renderDaily(); };

window.switchView = (view) => {
  currentView = view;
  ['monthly','weekly','daily'].forEach(v => {
    document.getElementById('view' + v.charAt(0).toUpperCase() + v.slice(1)).style.display = v === view ? 'block' : 'none';
    document.getElementById('btn' + v.charAt(0).toUpperCase() + v.slice(1)).classList.toggle('active', v === view);
  });
  if (view === 'weekly') renderWeekly();
  if (view === 'daily') renderDaily();
};

// ---- DAY DETAIL MODAL ----
window.openDayDetail = (day) => {
  const monthStr = `${calDate.getFullYear()}-${String(calDate.getMonth()+1).padStart(2,'0')}`;
  const dateStr  = `${monthStr}-${String(day).padStart(2,'0')}`;
  document.getElementById('dayDetailTitle').textContent = `Slots — ${day} ${MONTHS_SHORT[calDate.getMonth()]}`;
  const body = document.getElementById('dayDetailBody');
  const dayBks = allBookings.filter(b => b.booking_date === dateStr);
  const isBlocked = allBlocks.some(bl => dateStr >= bl.from_date && dateStr <= bl.to_date);
  body.innerHTML = '';
  TIME_SLOTS.forEach(t => {
    const bk = dayBks.find(b => b.time_slot === t && b.status !== 'cancelled');
    let label;
    if (isBlocked) label = `<span class="db-badge cancelled">Blocked</span>`;
    else if (bk) label = `<span class="db-badge confirmed">Booked — ${bk.buyer_name}</span>`;
    else label = `<span class="db-badge" style="background:rgba(255,255,255,0.06);color:#94a3b8;">Open</span>`;
    body.innerHTML += `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="font-weight:700;">${t}</span>${label}
      ${!bk && !isBlocked ? `<button class="db-btn-sm" onclick="prefillDate('${dateStr}','${t}')">+ Book</button>` : ''}
    </div>`;
  });
  openModal('dayDetailModal');
};

window.prefillDate = (date, time) => {
  closeAllModals();
  document.getElementById('bkDate').value = date;
  document.getElementById('bkTime').value = time;
  openModal('bookingModal');
};

// ---- BOOKINGS TABLE ----
function renderBookingsTable(list) {
  if (!list || list.length === 0) {
      document.getElementById('bookingsTbody').innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px; color: var(--text-secondary);">No bookings found.</td></tr>';
      return;
  }
  document.getElementById('bookingsTbody').innerHTML = list.map(b => `
    <tr>
      <td>${b.booking_id || b.id.substring(0,8)}</td>
      <td>${b.buyer_name}</td>
      <td>${b.court_name}</td>
      <td>${b.booking_date}</td>
      <td>${b.time_slot}</td>
      <td>Rs. ${(b.price||0).toLocaleString()}</td>
      <td><span class="db-badge ${b.status}">${b.status}</span></td>
      <td>
        <button class="db-action-btn" onclick="editBooking('${b.id}')">Edit</button>
        <button class="db-action-btn danger" onclick="cancelBooking('${b.id}','${b.buyer_name}',${b.price}, this)">Cancel</button>
      </td>
    </tr>`).join('');
}

window.filterBookings = (q) => {
  renderBookingsTable(allBookings.filter(b =>
    (b.buyer_name||'').toLowerCase().includes(q.toLowerCase()) ||
    (b.court_name||'').toLowerCase().includes(q.toLowerCase())
  ));
};

window.editBooking = (id) => {
  const b = allBookings.find(x => x.id === id); if (!b) return;
  document.getElementById('bkName').value  = b.buyer_name || '';
  document.getElementById('bkPhone').value = b.phone || '';
  document.getElementById('bkDate').value  = b.booking_date || '';
  document.getElementById('bkTime').value  = b.time_slot || '';
  openModal('bookingModal');
};

window.cancelBooking = async (id, name, price, btn) => {
  if (!confirm(`Cancel this booking for ${name} and log a refund of Rs. ${price.toLocaleString()}?`)) return;
  if(btn) { btn.innerText = '...'; btn.disabled = true; }
  await sbFetch(`bookings?id=eq.${id}`, { method:'PATCH', body:{ status:'cancelled' } });
  await sbFetch('refunds', { method:'POST', body:{ booking_id: id, customer: name, amount: Number(price), reason:'Cancelled by Admin', date: new Date().toISOString().split('T')[0] } });
  await loadAll();
};

window.saveBooking = async (btn) => {
  if (btn) { btn.innerText = 'Saving...'; btn.disabled = true; }
  const name  = document.getElementById('bkName').value || 'Walk-in';
  const phone = document.getElementById('bkPhone').value;
  const court = document.getElementById('bkCourt').value;
  const date  = document.getElementById('bkDate').value;
  const time  = document.getElementById('bkTime').value;
  const dur   = document.getElementById('bkDuration').value;
  const pay   = document.getElementById('bkPayment').value;
  if (!date || !time) { alert('Please fill date and time.'); if(btn) { btn.innerText='Save Booking'; btn.disabled=false; } return; }
  await sbFetch('bookings', { method:'POST', body:{
    buyer_name: name, buyer_email: `walkin@futsalconnect.com`,
    phone, court_name: court, booking_date: date, time_slot: time,
    duration: String(dur), price: 5000, status:'confirmed', payment: pay,
    booking_id: 'BK' + Date.now()
  }});
  closeAllModals();
  await loadAll();
  if (btn) { btn.innerText = 'Save Booking'; btn.disabled = false; }
};

// ---- COURTS ----
function renderCourts() {
  document.getElementById('courtsStatus').innerHTML = [
    { name:'Chak Shehzad A', status:'available', next:'18:00' },
    { name:'Chak Shehzad B', status:'maintenance', next:'Tomorrow' },
    { name:'Ayub Park A', status:'occupied', next:'20:00' },
  ].map(c => `
    <div class="court-status-row">
      <div><div class="court-name">${c.name}</div><div class="court-meta">Next slot: ${c.next}</div></div>
      <div class="court-indicator ${c.status}"></div>
    </div>`).join('');

  document.getElementById('pricingRules').innerHTML = allPricingRules.map(r => `
    <div class="price-rule">
      <div><div class="price-rule-name">${r.name}</div><div style="font-size:0.78rem;color:#94a3b8;">${r.description||''}</div></div>
      <div class="price-rule-val">${r.price}</div>
    </div>`).join('') || '<p style="color:#94a3b8;font-size:0.85rem;">No pricing rules.</p>';

  document.getElementById('blockedPeriods').innerHTML = allBlocks.map(b => `
    <div class="log-entry">
      <div><div class="log-cat">${b.court}</div><div class="log-desc">${b.reason||''} · ${b.from_date} → ${b.to_date}</div></div>
      <button class="db-action-btn danger" onclick="removeBlock('${b.id}')">Remove</button>
    </div>`).join('') || '<p style="color:#94a3b8;font-size:0.85rem;">No blocked periods.</p>';
}

window.addPriceRule = async () => {
  const name  = prompt('Rule name (e.g. Holiday Special)'); if (!name) return;
  const price = prompt('Price (e.g. Rs. 7,000 / 90 min)'); if (!price) return;
  await sbFetch('pricing_rules', { method:'POST', body:{ name, description:'Custom', price } });
  await loadAll();
};

window.removeBlock = async (id) => {
  await sbFetch(`blocked_periods?id=eq.${id}`, { method:'DELETE' });
  await loadAll();
};

window.openBlockModal = () => openModal('blockModal');

window.saveBlock = async () => {
  await sbFetch('blocked_periods', { method:'POST', body:{
    court: document.getElementById('blkCourt').value,
    from_date: document.getElementById('blkFrom').value,
    to_date: document.getElementById('blkTo').value,
    reason: document.getElementById('blkReason').value,
  }});
  closeAllModals();
  await loadAll();
};

// ---- CUSTOMERS ----
function renderCustomers(list) {
  if (!list || list.length === 0) {
      document.getElementById('customersTbody').innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-secondary);">No customers found.</td></tr>';
      return;
  }
  document.getElementById('customersTbody').innerHTML = list.map(c => {
    const tags = (c.tags||[]).map(t => {
      const cls = t==='VIP' ? 'vip' : t==='Frequent' ? 'confirmed' : 'noshow';
      return `<span class="db-badge ${cls}">${t}</span>`;
    }).join(' ');
    return `<tr>
      <td>${c.name}</td><td>${c.contact||'—'}</td><td>${c.bookings||0}</td>
      <td>Rs. ${(c.spend||0).toLocaleString()}</td>
      <td>${(c.noshows||0) > 1 ? `<span class="db-badge noshow">${c.noshows}</span>` : (c.noshows||0)}</td>
      <td>${tags||'—'}</td>
      <td>
        <button class="db-action-btn" onclick="tagCustomer('${c.id}','${c.name}','VIP')">Tag VIP</button>
        <button class="db-action-btn danger" onclick="tagCustomer('${c.id}','${c.name}','Restricted')">Restrict</button>
      </td>
    </tr>`;
  }).join('');
}

window.filterCustomers = (q) => renderCustomers(allCustomers.filter(c => (c.name||'').toLowerCase().includes(q.toLowerCase())));

window.tagCustomer = async (id, name, tag) => {
  if (!confirm(`Apply tag "${tag}" to ${name}?`)) return;
  const c = allCustomers.find(x => x.id === id); if (!c) return;
  const tags = [...new Set([...(c.tags||[]).filter(t => t !== 'No-Show Risk'), tag])];
  await sbFetch(`customers?id=eq.${id}`, { method:'PATCH', body:{ tags } });
  await loadAll();
};

// ---- FINANCIALS ----
function renderFinancials() {
  const rev = allBookings.filter(b => b.status === 'confirmed').reduce((a,b) => a + (b.price||0), 0);
  const exp = allExpenses.reduce((a,e) => a + (e.amount||0), 0);
  const ref = allRefunds.reduce((a,r) => a + (r.amount||0), 0);
  const net = rev - exp - ref;

  document.getElementById('finKpis').innerHTML = [
    { label:'Total Revenue', val:`Rs. ${rev.toLocaleString()}`, icon:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
    { label:'Total Expenses', val:`Rs. ${exp.toLocaleString()}`, icon:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' },
    { label:'Refunds Issued', val:`Rs. ${ref.toLocaleString()}`, icon:'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.99"/>' },
    { label:'Net Profit', val:`Rs. ${net.toLocaleString()}`, icon:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' },
  ].map(k => `<div class="db-kpi"><div class="db-kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${k.icon}</svg></div><div><div class="db-kpi-lbl">${k.label}</div><div class="db-kpi-val">${k.val}</div></div></div>`).join('');

  document.getElementById('expenseLog').innerHTML = allExpenses.map(e => `
    <div class="log-entry">
      <div><div class="log-cat">${e.cat}</div><div class="log-desc">${e.description||''} · ${e.date}</div></div>
      <div class="log-amt expense">- Rs. ${(e.amount||0).toLocaleString()}</div>
    </div>`).join('') || '<p style="color:#94a3b8;font-size:0.85rem;">No expenses.</p>';

  document.getElementById('refundLog').innerHTML = allRefunds.map(r => `
    <div class="log-entry">
      <div><div class="log-cat">${r.customer}</div><div class="log-desc">${r.reason||''} · ${r.date}</div></div>
      <div class="log-amt refund">- Rs. ${(r.amount||0).toLocaleString()}</div>
    </div>`).join('') || '<p style="color:#94a3b8;font-size:0.85rem;">No refunds.</p>';
}

window.switchFinPeriod = (p, btn) => {
  document.querySelectorAll('[onclick*="switchFinPeriod"]').forEach(b => b.classList.remove('active-tab'));
  btn.classList.add('active-tab');
};

window.openExpenseModal = () => openModal('expenseModal');

window.saveExpense = async (btn) => {
  if (btn) { btn.innerText = 'Saving...'; btn.disabled = true; }
  const amt = parseInt(document.getElementById('expAmt').value) || 0;
  if (!amt) { alert('Please enter an amount.'); if (btn) { btn.innerText = 'Save Expense'; btn.disabled = false; } return; }
  await sbFetch('expenses', { method:'POST', body:{
    cat: document.getElementById('expCat').value,
    description: document.getElementById('expDesc').value,
    amount: amt,
    date: new Date().toISOString().split('T')[0],
  }});
  closeAllModals();
  await loadAll();
  if (btn) { btn.innerText = 'Save Expense'; btn.disabled = false; }
};

// ---- ANALYTICS ----
function renderAnalytics() {
  const confirmed = allBookings.filter(b => b.status === 'confirmed').length;
  const cancelled = allBookings.filter(b => b.status === 'cancelled').length;
  const total     = allBookings.length;
  const cancelRate = total ? Math.round((cancelled / total) * 100) : 0;
  const vips       = allCustomers.filter(c => (c.tags||[]).includes('VIP')).length;
  const repeatPct  = allCustomers.length ? Math.round((vips / allCustomers.length) * 100) : 0;
  const rev        = allBookings.filter(b => b.status === 'confirmed').reduce((a,b) => a + (Number(b.price)||0), 0);
  const dailyAvg   = Math.round(rev / 30);

  document.getElementById('analyticsKpis').innerHTML = [
    { label:'Confirmed Bookings', val: confirmed, icon:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' },
    { label:'Cancellation Rate', val: `${cancelRate}%`, icon:'<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
    { label:'VIP Customers', val: `${vips}`, icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' },
    { label:'Avg Revenue/Day', val:`Rs. ${dailyAvg.toLocaleString()}`, icon:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
  ].map(k => `<div class="db-kpi"><div class="db-kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${k.icon}</svg></div><div><div class="db-kpi-lbl">${k.label}</div><div class="db-kpi-val">${k.val}</div></div></div>`).join('');

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const vals = [72,65,80,55,90,95,88];
  document.getElementById('occChart').innerHTML = days.map((d,i) => `
    <div class="occ-bar-wrap">
      <div class="occ-bar" style="height:${vals[i]}%;" title="${vals[i]}%"></div>
      <div class="occ-label">${d}</div>
    </div>`).join('');

  const hm = document.getElementById('heatmap');
  hm.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';
  grid.innerHTML = '<div class="hm-header"></div>' + WEEK_DAYS.map(d => `<div class="hm-header">${d}</div>`).join('');
  TIME_SLOTS.forEach(t => {
    grid.innerHTML += `<div class="hm-time">${t}</div>`;
    WEEK_DAYS.forEach(() => {
      const intensity = Math.random();
      grid.innerHTML += `<div class="hm-cell" style="background:rgba(0,255,136,${(0.1+intensity*0.9).toFixed(2)});" title="${Math.round(intensity*100)}% busy"></div>`;
    });
  });
  hm.appendChild(grid);
}

// ---- COMMS ----
function renderComms() {
  document.getElementById('reminderSettings').innerHTML = [
    { label:'24hr Booking Reminder', on:true },
    { label:'2hr Session Reminder', on:true },
    { label:'Post-Session Review Request', on:true },
    { label:'Cancellation Confirmation', on:false },
    { label:'Weekly Digest to Owner', on:true },
  ].map((r,i) => `
    <div class="reminder-row">
      <span>${r.label}</span>
      <button class="reminder-toggle ${r.on?'on':''}" id="toggle${i}" onclick="this.classList.toggle('on')"></button>
    </div>`).join('');

  document.getElementById('reviewInbox').innerHTML = allReviews.map(r => `
    <div class="review-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="review-name">${r.customer_name||'Anonymous'}</div>
        <div class="review-stars">${'★'.repeat(r.stars||0)}${'☆'.repeat(5-(r.stars||0))}</div>
      </div>
      <div class="review-text">${r.review_text||''}</div>
    </div>`).join('') || '<p style="color:#94a3b8;font-size:0.85rem;">No reviews yet.</p>';
}

// ---- MODALS ----
window.openModal = (id) => {
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById(id).classList.add('active');
};
window.openBookingModal = () => openModal('bookingModal');
window.closeAllModals = () => {
  document.getElementById('modalOverlay').classList.remove('active');
  document.querySelectorAll('.db-modal').forEach(m => m.classList.remove('active'));
};

// ---- INIT ----
loadAll();
