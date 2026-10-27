// Ritmo — registro de hábitos (Diseño 1a: tabla clásica, hábitos en filas y días en columnas).

const STORE_KEY = 'ritmo:v1';
const VIEW_KEY = 'ritmo:view';
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const ICON = {
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>',
  upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>',
};

// — fechas (siempre a medianoche local) —
const pad = n => String(n).padStart(2, '0');
const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = d => addDays(d, -((d.getDay() + 6) % 7));
const dowLetter = d => DOW[(d.getDay() + 6) % 7];
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const getToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// — persistencia —
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY));
    if (data && Array.isArray(data.habits)) return data;
  } catch { /* datos corruptos o almacenamiento bloqueado: se empieza de cero */ }
  return { habits: [] };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state.data)); } catch { /* sin almacenamiento */ }
}
function loadView() {
  try { return localStorage.getItem(VIEW_KEY) === 'month' ? 'month' : 'week'; } catch { return 'week'; }
}

const state = { data: load(), view: loadView(), today: getToday(), anchor: getToday(), dialog: null, notice: null };
const mobileQuery = matchMedia('(max-width: 760px)');
const root = document.getElementById('app');

// — modelo —
function periodDays(view, anchor) {
  if (view === 'week') {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  const n = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => new Date(anchor.getFullYear(), anchor.getMonth(), i + 1));
}
function monthDays(anchor) { return periodDays('month', anchor); }

// Primer día que cuenta para un hábito: su creación o el primer día marcado, lo que sea antes.
function habitStart(h) {
  return Object.keys(h.done).reduce((min, k) => (k < min ? k : min), h.created);
}

function cellState(h, d) {
  const k = toKey(d);
  if (d > state.today) return 'future';
  if (h.done[k]) return 'done';
  if (k < habitStart(h)) return 'before';
  if (d.getTime() === state.today.getTime()) return 'today';
  return 'missed';
}

// Días cumplidos y días transcurridos (desde el inicio del hábito hasta hoy) dentro de un periodo.
function tally(h, days) {
  const start = habitStart(h);
  let done = 0, elapsed = 0;
  for (const d of days) {
    if (d > state.today || toKey(d) < start) continue;
    elapsed++;
    if (h.done[toKey(d)]) done++;
  }
  return { done, elapsed };
}
const pct = ({ done, elapsed }) => (elapsed ? Math.round(done / elapsed * 100) + '%' : '–');
const frac = ({ done, elapsed }) => `${done} de ${elapsed} ${elapsed === 1 ? 'día' : 'días'}`;
function sumTally(days) {
  return state.data.habits.reduce((acc, h) => {
    const t = tally(h, days);
    return { done: acc.done + t.done, elapsed: acc.elapsed + t.elapsed };
  }, { done: 0, elapsed: 0 });
}

// — textos —
function todayLabel() {
  const t = state.today;
  return `${capitalize(WEEKDAYS[t.getDay()])}, ${t.getDate()} de ${MONTHS[t.getMonth()]}`;
}
function periodTitle(days) {
  const a = days[0], b = days[days.length - 1];
  if (state.view === 'month') return `${capitalize(MONTHS[a.getMonth()])} ${a.getFullYear()}`;
  const year = b.getFullYear() !== state.today.getFullYear() ? ` ${b.getFullYear()}` : '';
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}${year}`;
  return `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}${year}`;
}
function cellLabel(h, d, s) {
  const what = { done: 'hecho', missed: 'no hecho', today: 'pendiente', future: 'día futuro', before: 'sin registrar' }[s];
  return `${h.name}, ${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}: ${what}`;
}

// — render —
function render() {
  const mobile = mobileQuery.matches;
  const days = periodDays(state.view, state.anchor);
  const weekDays = periodDays('week', state.anchor);
  const month = monthDays(state.anchor);
  const habits = state.data.habits;
  const todayKey = toKey(state.today);
  const isCurrentWeek = weekDays.some(d => toKey(d) === todayKey);

  const stats = {
    today: `${habits.filter(h => h.done[todayKey]).length} de ${habits.length}`,
    week: pct(sumTally(weekDays)),
    month: pct(sumTally(month)),
    weekLabel: mobile ? 'Semana' : isCurrentWeek ? 'Esta semana' : 'Semana',
    monthLabel: capitalize(MONTHS[state.anchor.getMonth()]),
  };

  const seg = `
    <div class="seg" role="radiogroup" aria-label="Vista">
      <label class="seg-opt"><input type="radio" name="view" value="week" ${state.view === 'week' ? 'checked' : ''}>Semana</label>
      <label class="seg-opt"><input type="radio" name="view" value="month" ${state.view === 'month' ? 'checked' : ''}>Mes</label>
    </div>`;
  const pager = mobile
    ? `<div class="pager">
         <button class="btn btn-secondary btn-icon round" data-action="prev" aria-label="Anterior">${ICON.prev}</button>
         <button class="btn btn-secondary btn-icon round" data-action="next" aria-label="Siguiente">${ICON.next}</button>
       </div>`
    : `<div class="pager">
         <button class="btn btn-secondary btn-icon" data-action="prev" aria-label="Anterior">${ICON.prev}</button>
         <button class="btn btn-secondary" data-action="today">Hoy</button>
         <button class="btn btn-secondary btn-icon" data-action="next" aria-label="Siguiente">${ICON.next}</button>
       </div>`;

  const header = `
    <nav class="nav">
      <div class="nav-brand brand"><img class="brand-mark" src="icons/mark.svg" alt="">Ritmo</div>
      ${mobile
        ? `<button class="btn btn-primary btn-icon fab" data-action="new" aria-label="Nuevo hábito">${ICON.plus.replace(/16/g, '20')}</button>`
        : `<button class="btn btn-primary" data-action="new">${ICON.plus}Nuevo hábito</button>`}
    </nav>
    <header class="head">
      <div>
        <div class="kicker"${mobile ? '' : ' role="button" tabindex="0" data-action="today" title="Ir a hoy"'}>${todayLabel()}</div>
        <h1>${periodTitle(days)}</h1>
      </div>
      ${mobile ? '' : `<div class="controls">${seg}${pager}</div>`}
    </header>
    ${mobile ? `<div class="controls">${seg}${pager}</div>` : ''}
    <section class="stats" aria-label="Resumen">
      <div class="stat"><div class="stat-label">Hoy</div><div class="stat-value">${stats.today}</div></div>
      <div class="stat"><div class="stat-label">${stats.weekLabel}</div><div class="stat-value">${stats.week}</div></div>
      <div class="stat is-month"><div class="stat-label">${stats.monthLabel}</div><div class="stat-value">${stats.month}</div></div>
    </section>`;

  const body = !habits.length ? emptyState()
    : mobile ? (state.view === 'week' ? mobileWeek(days) : mobileMonth(days))
    : desktopBoard(days);

  root.className = `app${mobile ? ' is-mobile' : ''}`;
  root.innerHTML = header + body + (habits.length ? heatmapHtml() : '') + backupHtml() + (state.dialog ? dialogHtml() : '');

  if (mobile && state.view === 'month') scrollStripsToToday();
  const hm = root.querySelector('.hm-scroll');
  if (hm) hm.scrollLeft = hm.scrollWidth;
}

// — mapa de calor del último año (estilo contribuciones de GitHub) —
const HM_WEEKS = 53;

// Nivel 0–4 según la fracción de hábitos cumplidos (mismos cortes que el calendario del diseño).
const hmLevel = f => (f === 0 ? 0 : f <= .34 ? 1 : f <= .67 ? 2 : f < 1 ? 3 : 4);

function heatmapHtml() {
  const habits = state.data.habits;
  const starts = habits.map(habitStart);
  const first = startOfWeek(addDays(state.today, -7 * (HM_WEEKS - 1)));
  const todayKey = toKey(state.today);

  let cols = '', months = '', activeDays = 0, fullDays = 0, prevMonth = -1;
  for (let w = 0; w < HM_WEEKS; w++) {
    const monday = addDays(first, 7 * w);
    // Etiqueta de mes en la semana que contiene su día 1 (la primera columna, si no, lleva el de su lunes).
    const firstOfMonth = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).find(d => d.getDate() === 1);
    const labelDay = firstOfMonth || (w === 0 ? monday : null);
    if (labelDay && labelDay.getMonth() !== prevMonth && labelDay <= state.today) {
      months += `<span style="grid-column:${w + 1}">${capitalize(MONTHS_SHORT[labelDay.getMonth()])}</span>`;
      prevMonth = labelDay.getMonth();
    }
    let cells = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      const k = toKey(d);
      if (d > state.today) { cells += '<span class="hm-cell is-future"></span>'; continue; }
      const active = habits.filter((h, j) => k >= starts[j]);
      const done = active.filter(h => h.done[k]).length;
      const lvl = active.length ? hmLevel(done / active.length) : 0;
      if (done) activeDays++;
      if (active.length && done === active.length) fullDays++;
      const tip = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()} · ${active.length ? `${done} de ${active.length} hábitos` : 'sin hábitos'}`;
      cells += `<span class="hm-cell${k === todayKey ? ' is-today' : ''}" data-l="${lvl}" data-action="goto" data-date="${k}" data-tip="${tip}"></span>`;
    }
    cols += `<div class="hm-week">${cells}</div>`;
  }

  const days = DOW.map((l, i) => `<span>${i % 2 === 0 ? l : ''}</span>`).join('');
  const legend = [0, 1, 2, 3, 4].map(l => `<span class="hm-cell" data-l="${l}"></span>`).join('');
  return `
    <section class="board heatmap" aria-labelledby="hm-title">
      <div class="hm-head">
        <div>
          <h2 id="hm-title">Último año</h2>
          <div class="hm-sub">${activeDays} ${activeDays === 1 ? 'día' : 'días'} con algún hábito · ${fullDays} ${fullDays === 1 ? 'día completo' : 'días completos'}</div>
        </div>
        <div class="hm-legend" aria-hidden="true">Menos${legend}Más</div>
      </div>
      <div class="hm-scroll">
        <div class="hm-grid" role="img" aria-label="Mapa de calor del último año: ${activeDays} días con algún hábito cumplido y ${fullDays} días con todos. Pulsa un día para verlo en la tabla.">
          <div class="hm-months" aria-hidden="true">${months}</div>
          <div class="hm-dows" aria-hidden="true">${days}</div>
          <div class="hm-weeks">${cols}</div>
        </div>
      </div>
    </section>`;
}

// — copia de seguridad (exportar / importar JSON) —
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function backupHtml() {
  const n = state.notice;
  return `
    <footer class="backup">
      <div class="backup-text">
        <div class="backup-title">Copia de seguridad</div>
        <div class="backup-sub">Tus hábitos solo se guardan en este dispositivo. Exporta un archivo para no perderlos o pasarlos a otro.</div>
      </div>
      <div class="backup-actions">
        <button class="btn btn-secondary" data-action="export"${state.data.habits.length ? '' : ' disabled'}>${ICON.download}Exportar</button>
        <button class="btn btn-secondary" data-action="import">${ICON.upload}Importar</button>
      </div>
      <p class="backup-msg${n && n.error ? ' is-error' : ''}" role="status" aria-live="polite">${n ? esc(n.text) : ''}</p>
    </footer>`;
}

let noticeTimer;
function notify(text, error = false) {
  state.notice = { text, error };
  const el = root.querySelector('.backup-msg');
  if (el) { el.textContent = text; el.classList.toggle('is-error', error); }
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    state.notice = null;
    const msg = root.querySelector('.backup-msg');
    if (msg) msg.textContent = '';
  }, 6000);
}

async function exportData() {
  const json = JSON.stringify({ app: 'ritmo', version: 1, exportedAt: new Date().toISOString(), habits: state.data.habits }, null, 2);
  const name = `ritmo-${toKey(state.today)}.json`;
  const file = new File([json], name, { type: 'application/json' });
  // En móvil, el menú de compartir permite "Guardar en Archivos"; la descarga directa falla en la PWA de iOS.
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Copia de Ritmo' });
      notify('Copia exportada.');
    } catch (err) {
      if (err.name !== 'AbortError') notify('No se pudo compartir el archivo.', true);
    }
    return;
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(`Descargado ${name}.`);
}

// Acepta el formato exportado ({ habits: [...] }) o directamente la lista; descarta lo que no encaje.
function parseBackup(text) {
  const raw = JSON.parse(text);
  const list = Array.isArray(raw) ? raw : raw && raw.habits;
  if (!Array.isArray(list)) throw new Error('formato');
  return list.map(h => {
    if (!h || typeof h.name !== 'string' || !h.name.trim()) throw new Error('hábito');
    const done = {};
    for (const [k, v] of Object.entries(h.done || {})) if (DATE_RE.test(k) && v) done[k] = 1;
    const created = DATE_RE.test(h.created) ? h.created : Object.keys(done).sort()[0] || toKey(state.today);
    return { id: typeof h.id === 'string' && h.id ? h.id : newId(), name: h.name.trim().slice(0, 60), created, done };
  });
}

// Fusiona sin borrar nada: mismos hábitos (por id) suman sus días marcados; los nuevos se añaden.
function mergeHabits(incoming) {
  let added = 0, merged = 0;
  for (const h of incoming) {
    const cur = state.data.habits.find(x => x.id === h.id);
    if (cur) {
      Object.assign(cur.done, h.done);
      if (h.created < cur.created) cur.created = h.created;
      merged++;
    } else {
      state.data.habits.push(h);
      added++;
    }
  }
  return { added, merged };
}

function importData() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
  input.addEventListener('change', async () => {
    const f = input.files[0];
    if (!f) return;
    try {
      const { added, merged } = mergeHabits(parseBackup(await f.text()));
      save();
      render();
      const parts = [];
      if (added) parts.push(`${added} ${added === 1 ? 'hábito nuevo' : 'hábitos nuevos'}`);
      if (merged) parts.push(`${merged} ${merged === 1 ? 'hábito actualizado' : 'hábitos actualizados'}`);
      notify(parts.length ? `Importado: ${parts.join(' y ')}.` : 'El archivo no tenía hábitos.');
    } catch {
      notify('Ese archivo no es una copia de Ritmo válida.', true);
    }
  });
  input.click();
}

const tooltip = document.createElement('div');
tooltip.className = 'hm-tip';
tooltip.setAttribute('role', 'tooltip');
document.body.append(tooltip);

function showTip(cell) {
  tooltip.textContent = cell.dataset.tip;
  tooltip.classList.add('is-on');
  const r = cell.getBoundingClientRect();
  const w = tooltip.offsetWidth;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  tooltip.style.left = `${left + scrollX}px`;
  tooltip.style.top = `${r.top + scrollY - tooltip.offsetHeight - 8}px`;
}
const hideTip = () => tooltip.classList.remove('is-on');
root.addEventListener('pointerover', e => {
  const cell = e.target.closest('.hm-cell[data-tip]');
  cell ? showTip(cell) : hideTip();
});
root.addEventListener('pointerleave', hideTip);
addEventListener('scroll', hideTip, { passive: true });

function cellHtml(h, d) {
  const s = cellState(h, d);
  return `<button class="cell" data-s="${s}" data-action="toggle" data-habit="${h.id}" data-date="${toKey(d)}"
    aria-label="${esc(cellLabel(h, d, s))}" aria-pressed="${s === 'done'}"${s === 'future' ? ' disabled' : ''}>${ICON.check}</button>`;
}
function dayHeadHtml(d) {
  const isToday = d.getTime() === state.today.getTime();
  return `<div class="day${isToday ? ' is-today' : ''}"><span class="day-dow">${dowLetter(d)}</span><span class="day-num">${d.getDate()}</span></div>`;
}
function editBtn(h) {
  return `<button class="btn btn-ghost btn-icon edit" data-action="edit" data-habit="${h.id}" aria-label="Editar ${esc(h.name)}">${ICON.edit}</button>`;
}

function desktopBoard(days) {
  const week = state.view === 'week';
  const head = `
    <div class="row is-head">
      <div class="col-label">Hábito</div>
      ${days.map(dayHeadHtml).join('')}
      <div class="col-label end">${week ? 'Semana' : 'Mes'}</div>
    </div>`;
  const rows = state.data.habits.map(h => {
    const t = tally(h, days);
    return `
      <div class="row">
        <div class="habit"><span class="habit-name">${esc(h.name)}</span>${editBtn(h)}</div>
        ${days.map(d => cellHtml(h, d)).join('')}
        <div class="score"><div class="score-pct">${pct(t)}</div>${week ? `<div class="score-frac">${frac(t)}</div>` : ''}</div>
      </div>`;
  }).join('');
  return `
    <section class="board ${week ? 'is-week' : 'is-month'}" style="--days:${days.length}">
      <div class="board-scroll">${head}${rows}</div>
    </section>`;
}

function mobileWeek(days) {
  const cards = state.data.habits.map(h => `
    <article class="m-card">
      <div class="m-card-head"><span class="habit-name">${esc(h.name)}</span><span class="score-pct">${pct(tally(h, days))}</span>${editBtn(h)}</div>
      <div class="m-cells">${days.map(d => cellHtml(h, d)).join('')}</div>
    </article>`).join('');
  return `<div class="m-days">${days.map(dayHeadHtml).join('')}</div><div class="m-list">${cards}</div>`;
}

function mobileMonth(days) {
  const todayKey = toKey(state.today);
  const cards = state.data.habits.map(h => `
    <article class="m-card is-month">
      <div class="m-card-head"><span class="habit-name">${esc(h.name)}</span><span class="score-pct">${pct(tally(h, days))}</span>${editBtn(h)}</div>
      <div class="m-strip">
        ${days.map(d => `<div class="m-strip-day${toKey(d) === todayKey ? ' is-today' : ''}"><span class="m-strip-num">${d.getDate()}</span>${cellHtml(h, d)}</div>`).join('')}
      </div>
    </article>`).join('');
  return `<div class="m-list">${cards}</div>`;
}

function scrollStripsToToday() {
  for (const strip of root.querySelectorAll('.m-strip')) {
    const target = strip.querySelector('.is-today');
    if (target) strip.scrollLeft = target.offsetLeft - strip.clientWidth / 2 + target.offsetWidth / 2;
  }
}

function emptyState() {
  return `
    <section class="board empty">
      <div class="empty-tagline">Pequeños pasos, cada día.</div>
      <h2>Empieza tu primer hábito</h2>
      <p>Añade algo que quieras hacer cada día y márcalo aquí cuando lo cumplas.</p>
      <button class="btn btn-primary" data-action="new">${ICON.plus}Nuevo hábito</button>
    </section>`;
}

function dialogHtml() {
  const { id, name, armed } = state.dialog;
  return `
    <div class="dialog-backdrop" data-action="close-backdrop">
      <form class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" data-form="habit">
        <div class="dialog-title" id="dlg-title">${id ? 'Editar hábito' : 'Nuevo hábito'}</div>
        <div class="field">
          <label for="habit-name">Nombre</label>
          <input class="input" id="habit-name" name="name" maxlength="60" required autocomplete="off"
            placeholder="Ej. Leer 20 minutos" value="${esc(name)}">
        </div>
        <div class="dialog-actions">
          ${id ? `<button type="button" class="btn btn-danger spacer${armed ? ' is-armed' : ''}" data-action="delete">${armed ? '¿Seguro? Pulsa otra vez' : 'Eliminar'}</button>` : ''}
          <button type="button" class="btn btn-secondary" data-action="close">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    </div>`;
}

// — acciones —
function openDialog(id) {
  const h = id && state.data.habits.find(x => x.id === id);
  state.dialog = { id: h ? h.id : null, name: h ? h.name : '', armed: false, returnFocus: document.activeElement };
  render();
  const input = root.querySelector('#habit-name');
  input.focus();
  input.select();
}
function closeDialog() {
  const back = state.dialog && state.dialog.returnFocus;
  state.dialog = null;
  render();
  // El botón original se ha re-renderizado: se busca su equivalente por acción y hábito.
  if (back && back.dataset) {
    const sel = back.dataset.habit
      ? `[data-action="${back.dataset.action}"][data-habit="${back.dataset.habit}"]`
      : `[data-action="${back.dataset.action}"]`;
    root.querySelector(sel)?.focus();
  }
}
function newId() {
  return (crypto.randomUUID && crypto.randomUUID()) || `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function shift(dir) {
  const a = state.anchor;
  state.anchor = state.view === 'week'
    ? addDays(a, 7 * dir)
    : new Date(a.getFullYear(), a.getMonth() + dir, 1);
  render();
}

root.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'close-backdrop') { if (e.target === el) closeDialog(); return; }
  if (action === 'goto') {
    const [y, m, d] = el.dataset.date.split('-').map(Number);
    state.anchor = new Date(y, m - 1, d);
    hideTip();
    render();
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  switch (action) {
    case 'toggle': {
      const h = state.data.habits.find(x => x.id === el.dataset.habit);
      const k = el.dataset.date;
      if (!h || k > toKey(state.today)) return;
      if (h.done[k]) delete h.done[k]; else h.done[k] = 1;
      save();
      render();
      root.querySelector(`[data-action="toggle"][data-habit="${h.id}"][data-date="${k}"]`)?.focus({ preventScroll: true });
      break;
    }
    case 'prev': shift(-1); break;
    case 'next': shift(1); break;
    case 'today': state.anchor = state.today; render(); break;
    case 'new': openDialog(null); break;
    case 'export': exportData(); break;
    case 'import': importData(); break;
    case 'edit': openDialog(el.dataset.habit); break;
    case 'close': closeDialog(); break;
    case 'delete': {
      if (!state.dialog.armed) {
        state.dialog.name = root.querySelector('#habit-name').value;
        state.dialog.armed = true;
        render();
        root.querySelector('[data-action="delete"]').focus();
        return;
      }
      state.data.habits = state.data.habits.filter(x => x.id !== state.dialog.id);
      save();
      state.dialog.returnFocus = null;
      closeDialog();
      break;
    }
  }
});

root.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.dialog) closeDialog();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.kicker[data-action]')) {
    e.preventDefault();
    e.target.click();
  }
});

root.addEventListener('change', e => {
  if (e.target.name !== 'view') return;
  state.view = e.target.value;
  try { localStorage.setItem(VIEW_KEY, state.view); } catch { /* sin almacenamiento */ }
  render();
  root.querySelector(`input[name="view"][value="${state.view}"]`)?.focus();
});

root.addEventListener('submit', e => {
  e.preventDefault();
  const name = new FormData(e.target).get('name').trim();
  if (!name) return;
  const { id } = state.dialog;
  if (id) {
    state.data.habits.find(x => x.id === id).name = name;
  } else {
    state.data.habits.push({ id: newId(), name, created: toKey(state.today), done: {} });
  }
  save();
  closeDialog();
});

// Si la app sigue abierta al cambiar de día (o vuelve de segundo plano), se actualiza "hoy".
function refreshToday() {
  const t = getToday();
  if (t.getTime() === state.today.getTime()) return;
  const wasOnToday = state.anchor.getTime() === state.today.getTime();
  state.today = t;
  if (wasOnToday) state.anchor = t;
  render();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshToday(); });
setInterval(refreshToday, 60_000);

// Otra pestaña ha cambiado los datos.
addEventListener('storage', e => {
  if (e.key !== STORE_KEY) return;
  state.data = load();
  if (!state.dialog) render();
});

mobileQuery.addEventListener('change', render);
render();

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
