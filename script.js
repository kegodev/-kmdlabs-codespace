/* ---------------- file type helpers ---------------- */
const EXT_MAP = {
  html:{color:'var(--c-html)',lang:'html',runnable:true},
  htm:{color:'var(--c-html)',lang:'html',runnable:true},
  css:{color:'var(--c-css)',lang:'css',runnable:true},
  js:{color:'var(--c-js)',lang:'javascript',runnable:true},
  mjs:{color:'var(--c-js)',lang:'javascript',runnable:true},
  jsx:{color:'var(--c-js)',lang:'javascript',runnable:false},
  ts:{color:'var(--c-ts)',lang:'typescript',runnable:false},
  tsx:{color:'var(--c-ts)',lang:'typescript',runnable:false},
  json:{color:'var(--c-json)',lang:'json',runnable:false},
  md:{color:'var(--c-md)',lang:'markdown',runnable:false},
  markdown:{color:'var(--c-md)',lang:'markdown',runnable:false},
  php:{color:'var(--c-php)',lang:'php',runnable:false},
  py:{color:'var(--c-py)',lang:'python',runnable:false},
  txt:{color:'var(--c-other)',lang:'text',runnable:false},
  xml:{color:'var(--c-other)',lang:'xml',runnable:false},
  yml:{color:'var(--c-other)',lang:'yaml',runnable:false},
  yaml:{color:'var(--c-other)',lang:'yaml',runnable:false},
  svg:{color:'var(--c-img)',lang:'image',runnable:false,binary:true},
  png:{color:'var(--c-img)',lang:'image',runnable:false,binary:true},
  jpg:{color:'var(--c-img)',lang:'image',runnable:false,binary:true},
  jpeg:{color:'var(--c-img)',lang:'image',runnable:false,binary:true},
  gif:{color:'var(--c-img)',lang:'image',runnable:false,binary:true},
  webp:{color:'var(--c-img)',lang:'image',runnable:false,binary:true}
};

function basename(path){
  const parts = path.split('/');
  return parts[parts.length-1];
}

function dirOf(path){
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}

function extOf(path){
  const b = basename(path);
  const parts = b.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function typeInfo(path){
  return EXT_MAP[extOf(path)] || {color:'var(--c-other)',lang:'text',runnable:false};
}

/* ---------------- virtual file system ---------------- */
let files = {};             // path -> { content, binary }
let activeFile = null;
let collapsedFolders = new Set();

const defaults = {
  'index.html': `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <h1>Build with KM Digital Labs</h1>
    <p>Write HTML, CSS and JavaScript. Your live result appears in the preview panel.</p>
    <button id="btn">Click me</button>
  </div>
  <script src="script.js"><\/script>
</body>
</html>`,
  'style.css': `:root{
  --paper:#f5f2e9;
  --paper-alt:#eeeae0;
  --charcoal:#171916;
  --ink:#10110f;
  --orange:#f36a2d;
  --orange-deep:#b84216;
  --green:#2f5d45;
  --green-soft:#cdd9c8;
}
*{box-sizing:border-box;}
body{
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  font-family:Arial,sans-serif;
  background:
    radial-gradient(circle at 80% 15%,rgba(243,106,45,.13),transparent 24%),
    var(--charcoal);
}
.card{
  width:min(520px,100%);
  background:var(--paper);
  border:1px solid var(--orange);
  border-radius:20px;
  padding:34px;
  color:var(--ink);
  text-align:center;
  box-shadow:0 24px 70px rgba(0,0,0,.34);
}
.card::before{
  content:'KM DIGITAL LABS · CODESPACE';
  display:inline-block;
  margin-bottom:18px;
  padding:7px 11px;
  border-radius:999px;
  background:var(--green-soft);
  color:var(--green);
  font-size:11px;
  font-weight:700;
  letter-spacing:.08em;
}
h1{color:var(--orange-deep);margin:0 0 9px;}
p{color:#6d7169;line-height:1.6;}
button{
  margin-top:16px;
  background:var(--orange);
  border:1px solid var(--orange);
  color:var(--ink);
  padding:10px 20px;
  border-radius:11px;
  cursor:pointer;
  font-size:14px;
  font-weight:700;
  transition:.18s ease;
}
button:hover{background:#df5920;transform:translateY(-2px);}`,
  'script.js': `let count = 0;
document.getElementById('btn').addEventListener('click', () => {
  count++;
  console.log('clicked', count, 'times');
});
console.log('script loaded');`
};

function loadDefaults(){
  files = {};
  Object.keys(defaults).forEach(name => { files[name] = {content: defaults[name], binary:false}; });
  activeFile = 'index.html';
  collapsedFolders = new Set();
}

const STORAGE_KEY = 'kmdlabs-codespace-workspace-v3';
const saveStatus = document.getElementById('saveStatus');
const cursorStatus = document.getElementById('cursorStatus');
let saveTimer = null;

function setSaveStatus(text, state){
  saveStatus.textContent = text;
  saveStatus.className = state || '';
}

function saveWorkspace(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({files, activeFile, collapsedFolders:[...collapsedFolders]}));
    setSaveStatus('saved locally', 'saved');
  }catch(error){
    setSaveStatus('storage full — download files', 'error');
    console.warn('Workspace could not be saved locally:', error);
  }
}

function scheduleSave(){
  setSaveStatus('saving…', 'saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveWorkspace, 260);
}

function restoreWorkspace(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const saved = JSON.parse(raw);
    if(!saved || !saved.files || typeof saved.files !== 'object') return false;
    files = saved.files;
    activeFile = saved.activeFile && files[saved.activeFile] ? saved.activeFile : Object.keys(files)[0] || null;
    collapsedFolders = new Set(Array.isArray(saved.collapsedFolders) ? saved.collapsedFolders : []);
    return true;
  }catch(error){
    return false;
  }
}

if(!restoreWorkspace()) loadDefaults();

/* ---------------- sidebar tree rendering ---------------- */
const fileList = document.getElementById('fileList');
const folderIconSVG = '<svg class="folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>';
const deleteButtonHTML = '<button type="button" class="row-action del" title="Delete" aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg></button>';
const renameButtonHTML = '<button type="button" class="row-action rename" title="Rename" aria-label="Rename"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5z"/></svg></button>';

function escapeHTML(value){
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function normalizeUserPath(value){
  return String(value || '').trim().replace(/\\/g,'/').replace(/^\/+|\/+$/g,'').replace(/\/{2,}/g,'/');
}

function buildTree(paths){
  const root = {folders:{}, files:[]};
  paths.forEach(p => {
    const parts = p.split('/');
    let node = root;
    parts.forEach((part, i) => {
      if(i === parts.length - 1){
        node.files.push({name: part, path: p});
      } else {
        if(!node.folders[part]) node.folders[part] = {folders:{}, files:[]};
        node = node.folders[part];
      }
    });
  });
  return root;
}

function renderFileList(){
  fileList.innerHTML = '';
  const tree = buildTree(Object.keys(files));
  renderTreeLevel(tree, fileList, 0, '');
}

function renderTreeLevel(node, container, depth, prefix){
  Object.keys(node.folders).sort().forEach(folderName => {
    const fullPath = prefix ? prefix + '/' + folderName : folderName;
    const expanded = !collapsedFolders.has(fullPath);
    const row = document.createElement('div');
    row.className = 'file-row folder-row' + (expanded ? ' expanded' : '');
    row.style.paddingLeft = (8 + depth*14) + 'px';
    row.innerHTML = '<span class="chev">&#9656;</span>' + folderIconSVG + '<span class="fname">'+escapeHTML(folderName)+'</span><span class="row-actions">' + deleteButtonHTML + '</span>';
    row.addEventListener('click', e => {
      if(e.target.closest('.row-action')) return;
      if(collapsedFolders.has(fullPath)) collapsedFolders.delete(fullPath);
      else collapsedFolders.add(fullPath);
      renderFileList();
      scheduleSave();
    });
    row.querySelector('.del').addEventListener('click', e => {
      e.stopPropagation();
      if(!confirm('Delete folder "'+folderName+'" and everything inside it?')) return;
      Object.keys(files).forEach(path => { if(path.startsWith(fullPath+'/')) delete files[path]; });
      if(activeFile && activeFile.startsWith(fullPath+'/')) activeFile = Object.keys(files)[0] || null;
      renderFileList();
      renderEditor();
      scheduleRun();
      scheduleSave();
    });
    container.appendChild(row);
    if(expanded) renderTreeLevel(node.folders[folderName], container, depth+1, fullPath);
  });

  node.files.sort((a,b) => a.name.localeCompare(b.name)).forEach(file => {
    const info = typeInfo(file.path);
    const row = document.createElement('div');
    row.className = 'file-row' + (file.path === activeFile ? ' active' : '');
    row.style.paddingLeft = (8 + depth*14 + 16) + 'px';
    row.title = file.path;
    row.innerHTML = '<span class="sq" style="background:'+info.color+'"></span><span class="fname">'+escapeHTML(file.name)+'</span><span class="row-actions">' + renameButtonHTML + deleteButtonHTML + '</span>';
    row.addEventListener('click', e => {
      if(e.target.closest('.row-action')) return;
      activeFile = file.path;
      renderFileList();
      renderEditor();
      scheduleSave();
      if(isMobileLayout()) setMobileView('editor');
    });
    row.querySelector('.rename').addEventListener('click', e => {
      e.stopPropagation();
      const requested = prompt('Rename file or move it to a folder:', file.path);
      const newPath = normalizeUserPath(requested);
      if(!newPath || newPath === file.path) return;
      if(files[newPath]){ alert('A file with that path already exists.'); return; }
      files[newPath] = files[file.path];
      delete files[file.path];
      if(activeFile === file.path) activeFile = newPath;
      renderFileList();
      renderEditor();
      scheduleRun();
      scheduleSave();
    });
    row.querySelector('.del').addEventListener('click', e => {
      e.stopPropagation();
      if(!confirm('Delete '+file.path+'?')) return;
      delete files[file.path];
      if(activeFile === file.path) activeFile = Object.keys(files)[0] || null;
      renderFileList();
      renderEditor();
      scheduleRun();
      scheduleSave();
    });
    container.appendChild(row);
  });
}

/* ---------------- editor rendering ---------------- */
const editorWrap = document.getElementById('editorWrap');
const editorTopline = document.getElementById('editorTopline');
let currentTextarea = null;

function renderEditor(){
  editorWrap.innerHTML = '';
  if(!activeFile){
    editorTopline.textContent = '';
    editorWrap.innerHTML = '<div class="editor-empty">no file open — create or upload one</div>';
    return;
  }
  const info = typeInfo(activeFile);
  editorTopline.innerHTML = '<span class="sq" style="background:'+info.color+'"></span> '+escapeHTML(activeFile)+' <span style="color:var(--text-faint)">&middot; '+info.lang+'</span>';

  if(info.binary){
    const wrap = document.createElement('div');
    wrap.className = 'binary-note';
    if(info.lang === 'image'){
      wrap.innerHTML = '<img src="'+files[activeFile].content+'" alt="'+activeFile+'"><span>binary file — preview only</span>';
    } else {
      wrap.textContent = 'binary file — no text preview';
    }
    editorWrap.appendChild(wrap);
    return;
  }

  const editingPath = activeFile;
  const ln = document.createElement('div');
  ln.className = 'line-numbers';
  const ta = document.createElement('textarea');
  ta.spellcheck = false;
  ta.autocapitalize = 'off';
  ta.autocomplete = 'off';
  ta.autocorrect = 'off';
  ta.setAttribute('aria-label', 'Code editor for ' + editingPath);
  ta.value = files[editingPath].content;
  currentTextarea = ta;

  function updateLn(){
    const lines = ta.value.split('\n').length;
    let out = '';
    for(let i=1;i<=lines;i++) out += i + '\n';
    ln.textContent = out.trim();
  }
  function updateCursor(){
    const before = ta.value.slice(0, ta.selectionStart);
    const line = before.split('\n').length;
    const col = before.length - before.lastIndexOf('\n');
    cursorStatus.textContent = 'Ln ' + line + ', Col ' + col;
  }
  updateLn();
  updateCursor();

  ta.addEventListener('input', () => {
    if(!files[editingPath]) return;
    files[editingPath].content = ta.value;
    updateLn();
    updateCursor();
    scheduleRun();
    scheduleSave();
  });
  ta.addEventListener('scroll', () => { ln.scrollTop = ta.scrollTop; });
  ['click','keyup','select'].forEach(eventName => ta.addEventListener(eventName, updateCursor));
  ta.addEventListener('keydown', e => {
    if(e.key === 'Tab'){
      e.preventDefault();
      const start = ta.selectionStart, end = ta.selectionEnd;
      ta.setRangeText('  ', start, end, 'end');
      if(files[editingPath]) files[editingPath].content = ta.value;
      updateLn();
      updateCursor();
      scheduleRun();
      scheduleSave();
    }
  });

  editorWrap.appendChild(ln);
  editorWrap.appendChild(ta);
}

/* ---------------- new file ---------------- */
document.getElementById('newFileBtn').addEventListener('click', () => {
  const name = normalizeUserPath(prompt('New file name (use / for folders, e.g. css/about.css)'));
  if(!name) return;
  if(files[name]){ alert('A file with that path already exists.'); return; }
  files[name] = {content:'', binary:false};
  activeFile = name;
  renderFileList();
  renderEditor();
  scheduleRun();
  scheduleSave();
  if(isMobileLayout()) setMobileView('editor');
  setTimeout(() => currentTextarea && currentTextarea.focus(), 0);
});

/* ---------------- ingesting files (click upload, folder upload, drag & drop) ---------------- */
function ingestEntries(entries){
  if(!entries.length) return;
  let remaining = entries.length;
  let lastPath = null;
  entries.forEach(({file, path}) => {
    const info = typeInfo(path);
    const reader = new FileReader();
    reader.onload = () => {
      files[path] = {content: reader.result, binary: !!info.binary};
      remaining--;
      lastPath = path;
      if(remaining === 0){
        activeFile = lastPath;
        renderFileList();
        renderEditor();
        scheduleRun();
        scheduleSave();
        if(isMobileLayout()) setMobileView('editor');
      }
    };
    if(info.binary) reader.readAsDataURL(file);
    else reader.readAsText(file);
  });
}

function filesToEntries(fileListObj){
  return Array.from(fileListObj).map(f => ({
    file: f,
    path: (f.webkitRelativePath && f.webkitRelativePath.length) ? f.webkitRelativePath : f.name
  }));
}

const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
document.getElementById('uploadBtn').addEventListener('click', () => fileInput.click());
document.getElementById('uploadFolderBtn').addEventListener('click', () => folderInput.click());
fileInput.addEventListener('change', () => { ingestEntries(filesToEntries(fileInput.files)); fileInput.value=''; });
folderInput.addEventListener('change', () => { ingestEntries(filesToEntries(folderInput.files)); folderInput.value=''; });

/* drag & drop, including whole folders */
function traverseEntry(entry, prefix, out){
  return new Promise(resolve => {
    if(entry.isFile){
      entry.file(file => {
        out.push({file, path: prefix ? prefix+'/'+entry.name : entry.name});
        resolve();
      }, () => resolve());
    } else if(entry.isDirectory){
      const reader = entry.createReader();
      const readAll = () => {
        reader.readEntries(async entries => {
          if(!entries.length){ resolve(); return; }
          const newPrefix = prefix ? prefix+'/'+entry.name : entry.name;
          await Promise.all(entries.map(e2 => traverseEntry(e2, newPrefix, out)));
          readAll();
        }, () => resolve());
      };
      readAll();
    } else {
      resolve();
    }
  });
}

const sidebar = document.getElementById('sidebar');
['dragenter','dragover'].forEach(ev => sidebar.addEventListener(ev, e => {
  e.preventDefault();
  sidebar.classList.add('dragover');
}));
['dragleave'].forEach(ev => sidebar.addEventListener(ev, e => {
  e.preventDefault();
  sidebar.classList.remove('dragover');
}));
sidebar.addEventListener('drop', e => {
  e.preventDefault();
  sidebar.classList.remove('dragover');
  const dt = e.dataTransfer;
  if(dt.items && dt.items.length && dt.items[0].webkitGetAsEntry){
    const rootEntries = [];
    for(let i=0;i<dt.items.length;i++){
      const entry = dt.items[i].webkitGetAsEntry && dt.items[i].webkitGetAsEntry();
      if(entry) rootEntries.push(entry);
    }
    if(rootEntries.length){
      const collected = [];
      Promise.all(rootEntries.map(en => traverseEntry(en, '', collected))).then(() => {
        ingestEntries(collected);
      });
      return;
    }
  }
  if(dt.files && dt.files.length) ingestEntries(filesToEntries(dt.files));
});

/* ---------------- auto-run toggle ---------------- */
let autoRun = true;
const autoToggle = document.getElementById('autoToggle');
autoToggle.addEventListener('click', () => {
  autoRun = !autoRun;
  autoToggle.classList.toggle('on', autoRun);
});

let debounceTimer;
function scheduleRun(){
  if(!autoRun || !previewOpen) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(compile, 500);
}

/* ---------------- responsive workspace views ---------------- */
const previewPane = document.getElementById('previewPane');
const mobileMedia = window.matchMedia('(max-width: 820px)');
let previewOpen = false;

function isMobileLayout(){
  return mobileMedia.matches;
}

function setMobileView(view){
  document.body.dataset.mobileView = view;
  document.querySelectorAll('.mobile-dock [data-mobile-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.mobileView === view);
  });
}

function openPreview(){
  previewOpen = true;
  previewPane.classList.remove('closed');
  if(isMobileLayout()) setMobileView('preview');
  compile();
}

function closePreview(){
  if(isMobileLayout()){
    setMobileView('editor');
    return;
  }
  previewOpen = false;
  previewPane.classList.add('closed');
}

document.querySelectorAll('.mobile-dock [data-mobile-view]').forEach(button => {
  button.addEventListener('click', () => {
    const view = button.dataset.mobileView;
    if(view === 'preview') openPreview();
    else setMobileView(view);
  });
});

mobileMedia.addEventListener?.('change', event => {
  if(event.matches){
    setMobileView(document.body.dataset.mobileView || 'editor');
  }else{
    document.body.removeAttribute('data-mobile-view');
  }
});
if(isMobileLayout()) setMobileView('editor');

document.getElementById('openCompilerBtn').addEventListener('click', openPreview);
document.getElementById('closeCompilerBtn').addEventListener('click', closePreview);
document.getElementById('runBtn').addEventListener('click', () => {
  if(isMobileLayout()) openPreview();
  else if(!previewOpen) openPreview();
  else compile();
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if(!confirm('Reset the workspace back to the starter files? This clears uploads.')) return;
  loadDefaults();
  renderFileList();
  renderEditor();
  saveWorkspace();
  if(previewOpen) compile();
  if(isMobileLayout()) setMobileView('editor');
});

/* ---------------- console capture ---------------- */
const consoleBody = document.getElementById('consoleBody');
document.getElementById('clearConsole').addEventListener('click', () => {
  consoleBody.innerHTML = '<div class="console-empty">// output will appear here</div>';
});

function logToPanel(type, args){
  const empty = consoleBody.querySelector('.console-empty');
  if(empty) empty.remove();
  const line = document.createElement('div');
  line.className = 'console-line ' + type;
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = type === 'error' ? 'err' : type === 'warn' ? 'warn' : 'log';
  const msg = document.createElement('span');
  msg.textContent = args.map(a => {
    try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
    catch(e){ return String(a); }
  }).join(' ');
  line.appendChild(tag);
  line.appendChild(msg);
  consoleBody.appendChild(line);
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

window.addEventListener('message', e => {
  if(e.data && e.data.__kegodev_console){
    logToPanel(e.data.level, e.data.args);
  }
});

const consolePanel = document.getElementById('consolePanel');
document.getElementById('toggleConsoleBtn').addEventListener('click', () => {
  consolePanel.classList.toggle('collapsed');
});

const previewStage = document.getElementById('previewStage');
document.querySelectorAll('[data-preview-size]').forEach(button => {
  button.addEventListener('click', () => {
    const size = button.dataset.previewSize;
    previewStage.classList.remove('device-desktop','device-tablet','device-mobile');
    if(size !== 'desktop') previewStage.classList.add('device-' + size);
    document.querySelectorAll('[data-preview-size]').forEach(item => item.classList.toggle('active', item === button));
  });
});

function activeFileBlob(){
  if(!activeFile || !files[activeFile]) return null;
  const file = files[activeFile];
  if(file.binary && String(file.content).startsWith('data:')){
    const parts = file.content.split(',');
    const meta = parts[0];
    const bytes = meta.includes(';base64') ? atob(parts[1]) : decodeURIComponent(parts[1]);
    const array = new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++) array[i] = bytes.charCodeAt(i);
    return new Blob([array], {type:(meta.match(/^data:([^;,]+)/)||[])[1] || 'application/octet-stream'});
  }
  return new Blob([file.content], {type:'text/plain;charset=utf-8'});
}

document.getElementById('downloadBtn').addEventListener('click', () => {
  const blob = activeFileBlob();
  if(!blob){ alert('Open a file before downloading.'); return; }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = basename(activeFile);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById('openNewTabBtn').addEventListener('click', () => {
  compile();
  const source = document.getElementById('preview').srcdoc;
  if(!source) return;
  const url = URL.createObjectURL(new Blob([source], {type:'text/html'}));
  const opened = window.open(url, '_blank', 'noopener');
  if(!opened) alert('Allow pop-ups to open the preview in a new tab.');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

document.addEventListener('keydown', event => {
  const command = event.ctrlKey || event.metaKey;
  if(command && event.key === 'Enter'){
    event.preventDefault();
    openPreview();
  }
  if(command && event.key.toLowerCase() === 's'){
    event.preventDefault();
    saveWorkspace();
  }
  if(command && event.key.toLowerCase() === 'n'){
    event.preventDefault();
    document.getElementById('newFileBtn').click();
  }
});

/* ---------------- compiler ---------------- */
const previewNote = document.getElementById('previewNote');

function findEntryHtml(){
  if(files['index.html']) return 'index.html';
  const nested = Object.keys(files).find(p => basename(p) === 'index.html');
  if(nested) return nested;
  return Object.keys(files).find(p => typeInfo(p).lang === 'html') || null;
}

function normalizeParts(parts){
  const stack = [];
  parts.forEach(p => {
    if(p === '' || p === '.') return;
    if(p === '..') stack.pop();
    else stack.push(p);
  });
  return stack.join('/');
}

function resolveRef(entryPath, ref){
  if(!ref) return null;
  if(/^https?:\/\//i.test(ref) || ref.startsWith('//') || ref.startsWith('data:')) return null;
  let cleanRef = ref.split('#')[0].split('?')[0];
  let base = dirOf(entryPath);
  if(cleanRef.startsWith('/')){ base = ''; cleanRef = cleanRef.slice(1); }
  const combined = (base ? base.split('/') : []).concat(cleanRef.split('/'));
  const resolved = normalizeParts(combined);
  if(files[resolved]) return resolved;
  const bn = basename(cleanRef);
  const match = Object.keys(files).find(p => basename(p) === bn);
  return match || null;
}

function filesInEntryProject(entry, language){
  const entryDir = dirOf(entry);
  return Object.keys(files).filter(path => {
    if(path === entry || files[path].binary) return false;
    if(typeInfo(path).lang !== language) return false;

    // When index.html is inside an uploaded folder, only compile files from
    // that folder. A root index.html can use every file in the workspace.
    if(!entryDir) return true;
    return path.startsWith(entryDir + '/');
  });
}

function copyScriptAttributes(from, to){
  Array.from(from.attributes).forEach(attr => {
    const name = attr.name.toLowerCase();
    if(name === 'src' || name === 'integrity' || name === 'crossorigin') return;
    // defer has no effect on an inline classic script. Local scripts are
    // placed at the end of <body>, which gives the intended deferred timing.
    if(name === 'defer') return;
    to.setAttribute(attr.name, attr.value);
  });
}

function inlineCssAssets(cssText, cssPath){
  return String(cssText).replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/g, (full, quote, reference) => {
    const ref = reference.trim();
    if(!ref || ref.startsWith('data:') || ref.startsWith('#') || /^https?:/i.test(ref) || ref.startsWith('//')) return full;
    const match = resolveRef(cssPath, ref);
    if(!match || !files[match] || !files[match].binary) return full;
    return 'url("' + files[match].content + '")';
  });
}

function compile(){
  const entry = findEntryHtml();
  const preview = document.getElementById('preview');

  if(!entry){
    previewNote.textContent = 'No HTML file to preview. Add or upload an .html file to get started.';
    previewNote.classList.add('show');
    preview.srcdoc = '';
    return;
  }

  const nonRunnable = Object.keys(files).filter(p => {
    const t = typeInfo(p);
    return !t.runnable && !t.binary && t.lang !== 'html';
  });
  if(nonRunnable.length){
    previewNote.textContent = 'Preview runs HTML/CSS/JS only — ' + nonRunnable.join(', ') + ' ' + (nonRunnable.length>1?'are':'is') + ' shown in the editor but not executed.';
    previewNote.classList.add('show');
  } else {
    previewNote.classList.remove('show');
  }

  const html = files[entry].content;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const includedCss = new Set();
  const includedJs = new Set();
  const localScripts = [];

  // Convert linked local stylesheets into inline CSS so they work in srcdoc.
  doc.querySelectorAll('link[rel~="stylesheet"][href]').forEach(link => {
    const match = resolveRef(entry, link.getAttribute('href'));
    if(!match || typeInfo(match).lang !== 'css') return;

    const style = doc.createElement('style');
    style.setAttribute('data-kegodev-source', match);
    style.textContent = inlineCssAssets(files[match].content, match);
    link.replaceWith(style);
    includedCss.add(match);
  });

  // Collect linked local scripts and execute them at the end of body. This
  // prevents scripts placed in <head> from running before their HTML exists.
  doc.querySelectorAll('script[src]').forEach(script => {
    const match = resolveRef(entry, script.getAttribute('src'));
    const lang = match ? typeInfo(match).lang : '';
    if(!match || lang !== 'javascript') return;

    const inline = doc.createElement('script');
    copyScriptAttributes(script, inline);
    if(extOf(match) === 'mjs' && !inline.getAttribute('type')) inline.type = 'module';
    inline.setAttribute('data-kegodev-source', match);
    inline.textContent = files[match].content;
    localScripts.push(inline);
    includedJs.add(match);
    script.remove();
  });

  // Automatically include standalone CSS files. Users therefore do not have
  // to manually add <link rel="stylesheet"> while learning or prototyping.
  filesInEntryProject(entry, 'css').forEach(path => {
    if(includedCss.has(path)) return;
    const style = doc.createElement('style');
    style.setAttribute('data-kegodev-source', path);
    style.textContent = inlineCssAssets(files[path].content, path);
    doc.head.appendChild(style);
    includedCss.add(path);
  });

  // Preserve uploaded assets used by HTML elements and CSS backgrounds.
  doc.querySelectorAll('img[src],source[src],video[src],audio[src],input[type="image"][src]').forEach(element => {
    const match = resolveRef(entry, element.getAttribute('src'));
    if(match && files[match].binary) element.setAttribute('src', files[match].content);
  });
  doc.querySelectorAll('video[poster]').forEach(video => {
    const match = resolveRef(entry, video.getAttribute('poster'));
    if(match && files[match].binary) video.setAttribute('poster', files[match].content);
  });
  doc.querySelectorAll('img[srcset],source[srcset]').forEach(element => {
    const rewritten = element.getAttribute('srcset').split(',').map(candidate => {
      const parts = candidate.trim().split(/\s+/);
      const match = resolveRef(entry, parts[0]);
      if(match && files[match].binary) parts[0] = files[match].content;
      return parts.join(' ');
    }).join(', ');
    element.setAttribute('srcset', rewritten);
  });

  const consoleShim = "(function(){var send=function(level){return function(){var args=Array.prototype.slice.call(arguments);parent.postMessage({__kegodev_console:true,level:level,args:args},'*');};};console.log=send('log');console.warn=send('warn');console.error=send('error');window.addEventListener('error',function(e){parent.postMessage({__kegodev_console:true,level:'error',args:[e.message+(e.filename?' ('+e.filename+':'+e.lineno+')':'')]},'*');});window.addEventListener('unhandledrejection',function(e){parent.postMessage({__kegodev_console:true,level:'error',args:['Unhandled promise rejection:',e.reason]},'*');});})();";
  const shimTag = doc.createElement('script');
  shimTag.textContent = consoleShim;
  doc.head.insertBefore(shimTag, doc.head.firstChild);

  // Add scripts referenced by HTML first, preserving their document order.
  localScripts.forEach(script => doc.body.appendChild(script));

  // Automatically include any remaining standalone JavaScript files.
  filesInEntryProject(entry, 'javascript').forEach(path => {
    if(includedJs.has(path)) return;
    const script = doc.createElement('script');
    if(extOf(path) === 'mjs') script.type = 'module';
    script.setAttribute('data-kegodev-source', path);
    script.textContent = files[path].content;
    doc.body.appendChild(script);
    includedJs.add(path);
  });

  preview.srcdoc = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

renderFileList();
renderEditor();
