// ── STATE ────────────────────────────────────────────────
const S = { projects: [], file: null, data: null, dirty: false };

// ── API ──────────────────────────────────────────────────
const api = {
  list:   ()           => fetch('/api/projects').then(r => r.json()),
  load:   file         => fetch('/api/project?file=' + encodeURIComponent(file)).then(r => r.json()),
  save:   (file, data) => fetch('/api/project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file, data }),
  }).then(r => r.json()),
  del:    file         => fetch('/api/project?file=' + encodeURIComponent(file), { method: 'DELETE' }).then(r => r.json()),
};

// ── HELPERS ──────────────────────────────────────────────
const $ = id => document.getElementById(id);

function el(tag, props = {}) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if      (k === 'cls')  e.className   = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML   = v;
    else                   e.setAttribute(k, v);
  }
  return e;
}

function autosize(ta) {
  const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  ta.addEventListener('input', fit);
  requestAnimationFrame(fit);
}

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── DIRTY INDICATOR ──────────────────────────────────────
function setDirty(v) {
  S.dirty = v;
  const btn = $('btn-save'), dot = $('dirty-dot');
  if (v) {
    dot.classList.remove('hidden');
    btn.classList.add('dirty');
    btn.classList.remove('ok');
    btn.textContent = 'Save';
  } else {
    dot.classList.add('hidden');
    btn.classList.remove('dirty');
  }
}

// ── SIDEBAR ──────────────────────────────────────────────
async function refreshSidebar() {
  const res = await api.list();
  S.projects = res.projects || [];
  renderSidebar();
}

function renderSidebar() {
  const list = $('project-list');
  list.innerHTML = '';
  S.projects.forEach(p => {
    const item = el('li', { cls: 'proj' + (p.file === S.file ? ' active' : '') });
    item.dataset.file = p.file;

    const labels = el('div', { cls: 'proj-labels' });
    labels.append(
      Object.assign(el('div', { cls: 'proj-title' }), { textContent: p.title || p.file }),
      Object.assign(el('div', { cls: 'proj-tag' }), { textContent: p.featured ? 'featured' : 'archive only' })
    );

    const del = el('button', { cls: 'proj-del', text: '×', title: 'Delete project' });
    del.dataset.file = p.file;

    item.append(labels, del);
    list.appendChild(item);
  });
}

// ── LOAD / SELECT PROJECT ────────────────────────────────
async function openProject(file) {
  if (S.dirty && !confirm('You have unsaved changes. Discard them?')) return;
  const res = await api.load(file);
  if (res.error) { alert('Could not open project:\n' + res.error); return; }
  S.file = res.file;
  S.data = res.data;
  setDirty(false);
  $('file-name').textContent = res.file;
  $('btn-save').disabled = false;
  renderSidebar();
  renderEditor();
}

// ── FIELD CONFIG ─────────────────────────────────────────
const TITLE_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
const WIDTHS = ['full', 'large', 'medium', 'small'];
const ALIGNS = ['left', 'center', 'right'];
const VALIGNS = ['top', 'bottom'];
const SPACER_SIZES = ['sm', 'md', 'lg', 'block'];
const FITS = ['contain', 'cover'];
const ROW_CHILD_TYPES = ['image', 'text'];

const FIELDS = [
  { key: 'id',           label: 'ID',           type: 'text' },
  { key: 'featured',     label: 'Featured',     type: 'checkbox', checkboxLabel: 'shows on the home list' },
  { key: 'titlePrefix',  label: 'Title Prefix', type: 'titlePrefix' },
  { key: 'title',        label: 'Title',        type: 'text' },
  { key: 'titleFont',    label: 'Title Font',   type: 'text' },
  { key: 'titleItalic',  label: 'Title Italic', type: 'checkbox', checkboxLabel: 'italic' },
  { key: 'titleWeight',  label: 'Title Weight', type: 'weight-select' },
  { key: 'titleColor',   label: 'Title Color',  type: 'color' },
  { key: 'titleSize',    label: 'Title Size',   type: 'text' },
  { key: 'detail',       label: 'Detail [ ]',   type: 'text-nullable' },
  { key: 'archiveBlurb', label: 'Archive Blurb',type: 'textarea' },
  { key: 'tags',         label: 'Tags',         type: 'chips' },
  { key: 'previewImage', label: 'Preview Image',type: 'text-nullable' },
  { key: 'detailLayout', label: 'Detail Layout',type: 'blocks' },
];

// ── EDITOR ───────────────────────────────────────────────
function renderEditor() {
  const content = $('editor-content'), empty = $('no-project');
  if (!S.data) {
    content.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  content.classList.remove('hidden');
  empty.classList.add('hidden');
  $('editor').scrollTop = 0;

  const tbody = $('fields-body');
  tbody.innerHTML = '';

  FIELDS.forEach(f => {
    const tr = el('tr', { cls: 'frow' });
    const tdL = el('td', { cls: 'fl' });
    tdL.appendChild(el('span', { text: f.label }));

    const tdV = el('td', { cls: 'fv' });
    const val = S.data[f.key];

    switch (f.type) {
      case 'text':          tdV.appendChild(makeText(f.key, val ?? ''));               break;
      case 'text-nullable':  tdV.appendChild(makeNullableText(f.key, val));             break;
      case 'textarea':       tdV.appendChild(makeTa(f.key, val ?? ''));                 break;
      case 'checkbox':       tdV.appendChild(makeCheckbox(f.key, !!val, f.checkboxLabel)); break;
      case 'select':          tdV.appendChild(makeSelect(f.key, val, f.options));        break;
      case 'weight-select':  tdV.appendChild(makeSelect(f.key, String(val || 400), TITLE_WEIGHTS, v => S.data[f.key] = parseInt(v, 10))); break;
      case 'color':           tdV.appendChild(makeColor(f.key, val));                    break;
      case 'chips':          tdV.appendChild(makeChips(f.key, val ?? []));               break;
      case 'titlePrefix':    tdV.appendChild(makeTitlePrefix());                        break;
      case 'blocks':         tdV.appendChild(makeBlocks());                             break;
    }

    tr.append(tdL, tdV);
    tbody.appendChild(tr);
  });
}

// ── WIDGET: TEXT INPUT ───────────────────────────────────
function makeText(key, val, onChange) {
  const inp = el('input', { type: 'text', cls: 'f-text' });
  inp.value = val;
  inp.addEventListener('input', () => {
    if (onChange) onChange(inp.value);
    else { S.data[key] = inp.value; if (key === 'title') renderSidebar(); }
    setDirty(true);
  });
  return inp;
}

// Empty string <-> null, for fields like `detail`/`previewImage` that are
// either a real value or explicitly null (not just an empty string).
function makeNullableText(key, val) {
  const inp = el('input', { type: 'text', cls: 'f-text' });
  inp.value = val ?? '';
  inp.addEventListener('input', () => {
    S.data[key] = inp.value === '' ? null : inp.value;
    setDirty(true);
  });
  return inp;
}

// ── WIDGET: TEXTAREA ─────────────────────────────────────
function makeTa(key, val, onChange) {
  const ta = el('textarea', { cls: 'f-ta' });
  ta.value = val;
  ta.addEventListener('input', () => {
    if (onChange) onChange(ta.value);
    else S.data[key] = ta.value;
    setDirty(true);
  });
  autosize(ta);
  return ta;
}

// ── WIDGET: CHECKBOX ─────────────────────────────────────
function makeCheckbox(key, val, label) {
  const wrap = el('label', { cls: 'f-checkbox' });
  const inp = el('input', { type: 'checkbox' });
  inp.checked = val;
  inp.addEventListener('change', () => {
    S.data[key] = inp.checked;
    if (key === 'featured') renderSidebar();
    setDirty(true);
  });
  wrap.append(inp, el('span', { text: label || '' }));
  return wrap;
}

// ── WIDGET: COLOR ─────────────────────────────────────────
function makeColor(key, val) {
  const inp = el('input', { type: 'color' });
  inp.value = val || '#000000';
  inp.addEventListener('input', () => {
    S.data[key] = inp.value;
    setDirty(true);
  });
  return inp;
}

// ── WIDGET: SELECT ───────────────────────────────────────
function makeSelect(key, val, options, onChange) {
  const sel = el('select', { cls: 'f-select' });
  options.forEach(opt => {
    const o = el('option', { value: opt, text: opt });
    if (opt === val) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    if (onChange) onChange(sel.value);
    else S.data[key] = sel.value;
    setDirty(true);
  });
  return sel;
}

// ── WIDGET: CHIPS ─────────────────────────────────────────
function makeChips(key, initial) {
  if (!S.data[key]) S.data[key] = [];

  const wrap = el('div', { cls: 'chips' });

  function rebuild() {
    wrap.innerHTML = '';
    const arr = S.data[key];

    arr.forEach((v, i) => {
      const chip = el('span', { cls: 'chip', text: v });
      const x    = el('button', { cls: 'chip-x', text: '×', title: 'Remove' });
      x.addEventListener('click', () => { arr.splice(i, 1); setDirty(true); rebuild(); });
      chip.appendChild(x);
      wrap.appendChild(chip);
    });

    const inp = el('input', { cls: 'chip-add', type: 'text', placeholder: '+ add' });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && inp.value.trim()) {
        arr.push(inp.value.trim()); setDirty(true); rebuild();
        setTimeout(() => wrap.querySelector('.chip-add')?.focus(), 0);
      }
      if (e.key === 'Backspace' && !inp.value && arr.length) {
        arr.pop(); setDirty(true); rebuild();
      }
    });
    inp.addEventListener('blur', () => {
      if (inp.value.trim()) { arr.push(inp.value.trim()); setDirty(true); rebuild(); }
    });
    wrap.appendChild(inp);
  }

  rebuild();
  return wrap;
}

// ── WIDGET: TITLE PREFIX ─────────────────────────────────
// Either null, or { text, style: 'italic' | 'plain' }.
function makeTitlePrefix() {
  const wrap = el('div', { cls: 'title-prefix' });

  function rebuild() {
    wrap.innerHTML = '';
    const val = S.data.titlePrefix;

    const toggle = el('label', { cls: 'f-checkbox' });
    const cb = el('input', { type: 'checkbox' });
    cb.checked = val != null;
    cb.addEventListener('change', () => {
      S.data.titlePrefix = cb.checked ? { text: '', style: 'italic' } : null;
      setDirty(true);
      rebuild();
    });
    toggle.append(cb, el('span', { text: 'has a prefix (e.g. "(Affective)" or "Leo Kaminski")' }));
    wrap.appendChild(toggle);

    if (val != null) {
      const row = el('div', { cls: 'sc-field' });
      const textInp = makeText(null, val.text || '', v => { S.data.titlePrefix.text = v; });
      textInp.style.flex = '1';
      const styleSel = makeSelect(null, val.style || 'italic', ['italic', 'plain'], v => { S.data.titlePrefix.style = v; });
      row.append(
        el('span', { cls: 'sc-lbl', text: 'Text' }), textInp,
        el('span', { cls: 'sc-lbl', text: 'Style' }), styleSel
      );
      wrap.appendChild(row);
    }
  }

  rebuild();
  return wrap;
}

// ── WIDGET: DETAIL LAYOUT BLOCKS ─────────────────────────
function defaultBlock(type) {
  if (type === 'image') return { type: 'image', src: null, width: 'full', align: 'left', fit: 'contain', caption: null };
  if (type === 'imageGrid') return { type: 'imageGrid', columns: 2, images: [{ src: null }, { src: null }] };
  if (type === 'text') return { type: 'text', content: '', width: 'full', align: 'left' };
  if (type === 'row') return {
    type: 'row',
    blocks: [
      { type: 'image', src: null, width: 'medium', align: 'left', fit: 'contain', caption: null },
      { type: 'text', content: '', width: 'medium', align: 'right' },
    ],
  };
  return { type: 'spacer', size: 'md' };
}

function makeBlocks() {
  if (!S.data.detailLayout) S.data.detailLayout = [];

  const wrap = el('div', { cls: 'sections' });
  let dragSrc = null;

  function rebuild() {
    wrap.innerHTML = '';
    const arr = S.data.detailLayout;

    arr.forEach((block, i) => {
      const card = el('div', { cls: 'sc-card' });
      card.draggable = true;

      card.addEventListener('dragstart', e => {
        dragSrc = i;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => card.classList.add('dragging'), 0);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        wrap.querySelectorAll('.sc-card').forEach(c => c.classList.remove('drag-over'));
        dragSrc = null;
      });
      card.addEventListener('dragover', e => {
        e.preventDefault();
        wrap.querySelectorAll('.sc-card').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
      });
      card.addEventListener('drop', e => {
        e.preventDefault();
        card.classList.remove('drag-over');
        if (dragSrc !== null && dragSrc !== i) {
          const [moved] = arr.splice(dragSrc, 1);
          arr.splice(i, 0, moved);
          dragSrc = null;
          setDirty(true);
          rebuild();
        }
      });

      // — Header —
      const head = el('div', { cls: 'sc-head' });
      head.appendChild(el('span', { cls: 'sc-handle', text: '⠿', title: 'Drag to reorder' }));

      const typeEl = el('select', { cls: 'sc-type' });
      ['image', 'imageGrid', 'text', 'spacer', 'row'].forEach(t => {
        const opt = el('option', { value: t, text: t });
        if (t === block.type) opt.selected = true;
        typeEl.appendChild(opt);
      });
      typeEl.addEventListener('change', () => {
        arr[i] = defaultBlock(typeEl.value);
        setDirty(true);
        rebuild();
      });
      head.appendChild(typeEl);

      const btns = el('div', { cls: 'sc-btns' });
      const up  = el('button', { cls: 'sc-btn', text: '↑', title: 'Move up' });
      const dn  = el('button', { cls: 'sc-btn', text: '↓', title: 'Move down' });
      const del = el('button', { cls: 'sc-btn del', text: '×', title: 'Remove block' });

      if (i === 0)              up.disabled = true;
      if (i === arr.length - 1) dn.disabled = true;

      up.addEventListener('click',  () => { [arr[i-1], arr[i]]   = [arr[i], arr[i-1]];   setDirty(true); rebuild(); });
      dn.addEventListener('click',  () => { [arr[i],   arr[i+1]] = [arr[i+1], arr[i]];   setDirty(true); rebuild(); });
      del.addEventListener('click', () => { arr.splice(i, 1);                             setDirty(true); rebuild(); });

      btns.append(up, dn, del);
      head.append(btns);
      card.appendChild(head);

      // — Body —
      const body = el('div', { cls: 'sc-body' });
      body.appendChild(renderBlockBody(block));
      card.appendChild(body);

      wrap.appendChild(card);
    });

    const addRow = el('div', { cls: 'add-sec-row' });
    ['image', 'imageGrid', 'text', 'spacer', 'row'].forEach(type => {
      const btn = el('button', { cls: 'btn-add-sec', text: '+ ' + type });
      btn.addEventListener('click', () => {
        arr.push(defaultBlock(type));
        setDirty(true);
        rebuild();
      });
      addRow.appendChild(btn);
    });
    wrap.appendChild(addRow);
  }

  function fieldRow(label, inputEl) {
    const row = el('div', { cls: 'sc-field' });
    inputEl.style.flex = '1';
    row.append(el('span', { cls: 'sc-lbl', text: label }), inputEl);
    return row;
  }

  function renderBlockBody(block) {
    const body = el('div', { cls: 'sc-body-inner' });

    if (block.type === 'image') {
      body.append(
        fieldRow('Src', makeNullableTextStandalone(block.src, v => block.src = v)),
        fieldRow('Width', makeSelect(null, block.width, WIDTHS, v => block.width = v)),
        fieldRow('Align', makeSelect(null, block.align, ALIGNS, v => block.align = v)),
        fieldRow('Valign', makeSelect(null, block.valign || 'top', VALIGNS, v => block.valign = v)),
        fieldRow('Fit', makeSelect(null, block.fit || 'contain', FITS, v => block.fit = v)),
        fieldRow('Caption', makeNullableTextStandalone(block.caption, v => block.caption = v)),
      );
    } else if (block.type === 'text') {
      body.append(
        fieldRow('Content', makeTa(null, block.content || '', v => block.content = v)),
        fieldRow('Width', makeSelect(null, block.width, WIDTHS, v => block.width = v)),
        fieldRow('Align', makeSelect(null, block.align, ALIGNS, v => block.align = v)),
        fieldRow('Valign', makeSelect(null, block.valign || 'top', VALIGNS, v => block.valign = v)),
      );
    } else if (block.type === 'spacer') {
      body.append(
        fieldRow('Size', makeSelect(null, block.size, SPACER_SIZES, v => block.size = v)),
      );
    } else if (block.type === 'imageGrid') {
      body.append(fieldRow('Columns', makeSelect(null, String(block.columns), ['2', '3'], v => block.columns = parseInt(v, 10))));

      const imagesWrap = el('div', { cls: 'image-grid-cells' });
      function rebuildImages() {
        imagesWrap.innerHTML = '';
        block.images.forEach((img, j) => {
          const cell = el('div', { cls: 'image-grid-cell' });
          cell.appendChild(makeNullableTextStandalone(img.src, v => { img.src = v; }));
          const fitSel = makeSelect(null, img.fit || 'contain', FITS, v => { img.fit = v; });
          fitSel.style.flex = '0 0 auto';
          cell.appendChild(fitSel);
          const rm = el('button', { cls: 'sc-btn del', text: '×', title: 'Remove image' });
          rm.addEventListener('click', () => { block.images.splice(j, 1); setDirty(true); rebuildImages(); });
          cell.appendChild(rm);
          imagesWrap.appendChild(cell);
        });
        const add = el('button', { cls: 'btn-add-sec', text: '+ image' });
        add.addEventListener('click', () => { block.images.push({ src: null }); setDirty(true); rebuildImages(); });
        imagesWrap.appendChild(add);
      }
      rebuildImages();
      body.append(fieldRow('Images', imagesWrap));
    } else if (block.type === 'row') {
      if (!block.blocks) block.blocks = [];
      const rowWrap = el('div', { cls: 'row-children' });

      function rebuildRow() {
        rowWrap.innerHTML = '';
        block.blocks.forEach((child, j) => {
          const childCard = el('div', { cls: 'row-child-card' });

          const childHead = el('div', { cls: 'sc-head' });
          const childType = el('select', { cls: 'sc-type' });
          ROW_CHILD_TYPES.forEach(t => {
            const opt = el('option', { value: t, text: t });
            if (t === child.type) opt.selected = true;
            childType.appendChild(opt);
          });
          childType.addEventListener('change', () => {
            block.blocks[j] = defaultBlock(childType.value);
            setDirty(true);
            rebuildRow();
          });
          childHead.appendChild(childType);

          const rm = el('button', { cls: 'sc-btn del', text: '×', title: 'Remove from row' });
          rm.addEventListener('click', () => { block.blocks.splice(j, 1); setDirty(true); rebuildRow(); });
          childHead.appendChild(rm);
          childCard.appendChild(childHead);

          const childBody = el('div', { cls: 'sc-body-inner' });
          childBody.appendChild(renderBlockBody(child));
          childCard.appendChild(childBody);

          rowWrap.appendChild(childCard);
        });

        const add = el('button', { cls: 'btn-add-sec', text: '+ add to row' });
        add.addEventListener('click', () => {
          const img = defaultBlock('image');
          img.width = 'medium';
          block.blocks.push(img);
          setDirty(true);
          rebuildRow();
        });
        rowWrap.appendChild(add);
      }
      rebuildRow();
      body.append(fieldRow('Row items', rowWrap));
    }

    return body;
  }

  // Same as makeNullableText but operates on an arbitrary value/callback
  // instead of a top-level S.data key (used inside block sub-forms).
  function makeNullableTextStandalone(val, onChange) {
    const inp = el('input', { type: 'text', cls: 'f-text' });
    inp.value = val ?? '';
    inp.addEventListener('input', () => {
      onChange(inp.value === '' ? null : inp.value);
      setDirty(true);
    });
    return inp;
  }

  rebuild();
  return wrap;
}

// ── EVENT HANDLERS ───────────────────────────────────────
$('project-list').addEventListener('click', async e => {
  const del  = e.target.closest('.proj-del');
  const item = e.target.closest('.proj');

  if (del) {
    const file = del.dataset.file;
    const proj = S.projects.find(p => p.file === file);
    if (!confirm(`Delete "${proj?.title || file}"? This removes the file and its <script> tag from index.html.`)) return;
    const res = await api.del(file);
    if (res.error) { alert('Delete failed:\n' + res.error); return; }
    if (S.file === file) {
      S.file = null; S.data = null;
      $('file-name').textContent = '';
      $('btn-save').disabled = true;
      renderEditor();
    }
    await refreshSidebar();
    return;
  }

  if (item) {
    openProject(item.dataset.file);
  }
});

$('btn-add').addEventListener('click', async () => {
  const title = prompt('Project title?');
  if (!title || !title.trim()) return;
  const id = slugify(title);
  if (!id) { alert('Could not derive a valid id from that title.'); return; }
  const file = id + '.js';
  if (S.projects.some(p => p.file === file)) { alert(`projects/${file} already exists.`); return; }

  // Mirrors js_project.py's default_project() — kept in sync by hand since
  // this is the one piece of default-data duplicated between server and
  // client (the client needs a shape to POST before the file exists).
  const data = {
    id, featured: true, titlePrefix: null, title: title.trim(),
    titleFont: 'Chiron Sung HK', titleItalic: false, titleWeight: 400, titleColor: '#000000', titleSize: '1.6rem',
    detail: 'medium, year', archiveBlurb: 'Add a short teaser for the archive view here.',
    tags: [], previewImage: null,
    detailLayout: [
      { type: 'image', src: null, width: 'full', align: 'left', caption: null },
      { type: 'text', content: '', width: 'full', align: 'left' },
      { type: 'spacer', size: 'lg' },
      { type: 'imageGrid', columns: 2, images: [{ src: null }, { src: null }] },
    ],
  };

  const res = await api.save(file, data);
  if (res.error) { alert('Could not create project:\n' + res.error); return; }
  await refreshSidebar();
  openProject(file);
});

$('btn-save').addEventListener('click', async () => {
  if (!S.file) return;
  const btn = $('btn-save');
  btn.disabled = true;
  const res = await api.save(S.file, S.data);
  btn.disabled = false;
  if (res.error) { alert('Save failed:\n' + res.error); return; }
  setDirty(false);
  btn.classList.add('ok');
  btn.textContent = 'Saved ✓';
  await refreshSidebar();
  setTimeout(() => { btn.classList.remove('ok'); btn.textContent = 'Save'; }, 1800);
});

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (!$('btn-save').disabled) $('btn-save').click(); }
});

// ── INIT ─────────────────────────────────────────────────
refreshSidebar();
