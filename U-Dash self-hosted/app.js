document.addEventListener('DOMContentLoaded', () => {
    // --- CLOCK & SEARCH ---
    const clockEl = document.getElementById('clock');
    setInterval(() => {
        clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    }, 1000);

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (!query) return;
            if (query.match(/^(http:\/\/|https:\/\/|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i)) {
                window.location.href = query.startsWith('http') ? query : 'http://' + query;
            } else {
                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            }
        }
    });

    // --- STATE VARIABLES ---
    let db = { pages: [], folders: [], links: [], widgets: [] };
    let activePageId = null;
    let syncConfig = { enabled: false, url: '' };

    // --- INITIALIZATION ---
    async function init() {
        const savedConfig = localStorage.getItem('udash_sync_config');
        if (savedConfig) {
            syncConfig = JSON.parse(savedConfig);
        }

        let localDb = JSON.parse(localStorage.getItem('udash_db'));

        if (syncConfig.enabled && syncConfig.url) {
            try {
                const res = await fetch(`${syncConfig.url.replace(/\/$/, '')}/api/sync`);
                if (res.ok) {
                    const remoteDb = await res.json();
                    if (remoteDb && remoteDb.pages) {
                        db = remoteDb;
                        localStorage.setItem('udash_db', JSON.stringify(db));
                    }
                }
            } catch (err) {
                if (localDb) db = localDb;
            }
        } else if (localDb) {
            db = localDb;
        }

        if (!db.pages || db.pages.length === 0) {
            const defaultPageId = generateId('p');
            db.pages = [{ id: defaultPageId, name: "Home" }];
            saveData();
        }

        activePageId = db.pages.length > 0 ? db.pages[0].id : null;
        renderUI();
    }

    // --- CORE FUNCTIONS ---
    function generateId(prefix) { return prefix + '_' + Math.random().toString(36).substr(2, 9); }

    async function saveData(callback) {
        localStorage.setItem('udash_db', JSON.stringify(db));

        if (syncConfig.enabled && syncConfig.url) {
            try {
                await fetch(`${syncConfig.url.replace(/\/$/, '')}/api/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(db)
                });
            } catch (err) {
                console.error("Failed to push data to Master Server.", err);
            }
        }

        if (callback) callback();
    }

    // --- UI RENDERING ---
    function renderUI() {
        renderTabs();
        renderWorkspace();
    }

    function renderTabs() {
        const tabsContainer = document.getElementById('tabs-container');
        tabsContainer.textContent = '';
        db.pages.forEach(page => {
            const tab = document.createElement('div');
            tab.className = `page-tab ${page.id === activePageId ? 'active' : ''}`;
            const titleSpan = document.createElement('span');
            titleSpan.textContent = page.name;
            titleSpan.onclick = () => { activePageId = page.id; renderWorkspace(); renderTabs(); };
            const editBtn = document.createElement('span');
            editBtn.className = 'tab-edit';
            editBtn.textContent = '✏️';
            editBtn.onclick = (e) => { e.stopPropagation(); openModal('editPage', page.id); };
            tab.appendChild(titleSpan);
            tab.appendChild(editBtn);
            tabsContainer.appendChild(tab);
        });
    }

    function renderWorkspace() {
        const wrapper = document.getElementById('folders-wrapper');
        wrapper.textContent = '';
        if (!activePageId) return;

        db.folders.filter(f => f.pageId === activePageId).forEach(folder => {
            const block = document.createElement('div');
            block.className = 'folder-block';
            const header = document.createElement('div');
            header.className = 'folder-header';
            const folderTitle = document.createElement('div');
            folderTitle.className = 'folder-title';
            folderTitle.textContent = `📁 ${folder.name}`;
            const folderActions = document.createElement('div');
            folderActions.className = 'folder-actions';

            const btnAdd = document.createElement('button'); btnAdd.textContent = '➕ Add Link'; btnAdd.onclick = () => openModal('addLink', folder.id);
            const btnEdit = document.createElement('button'); btnEdit.textContent = '✏️'; btnEdit.onclick = () => openModal('editFolder', folder.id);
            const btnDel = document.createElement('button'); btnDel.className = 'delete-folder'; btnDel.textContent = '×'; btnDel.onclick = () => handleDelete('folder', folder.id);

            folderActions.appendChild(btnAdd); folderActions.appendChild(btnEdit); folderActions.appendChild(btnDel);
            header.appendChild(folderTitle); header.appendChild(folderActions);
            block.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'grid';

            const folderLinks = db.links.filter(l => l.folderId === folder.id);
            if (folderLinks.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.color = '#565f89'; emptyMsg.style.fontSize = '0.9rem'; emptyMsg.textContent = 'Folder is empty.';
                grid.appendChild(emptyMsg);
            }

            folderLinks.forEach(link => {
                const card = document.createElement('a'); card.href = link.url; card.className = 'link-card'; card.target = '_blank';
                const controls = document.createElement('div'); controls.className = 'link-controls';
                const editCtrl = document.createElement('div'); editCtrl.className = 'link-ctrl-btn'; editCtrl.textContent = '✏️'; editCtrl.onclick = (e) => { e.preventDefault(); openModal('editLink', link.id); };
                const delCtrl = document.createElement('div'); delCtrl.className = 'link-ctrl-btn del'; delCtrl.textContent = '×'; delCtrl.onclick = (e) => { e.preventDefault(); handleDelete('link', link.id); };
                controls.appendChild(editCtrl); controls.appendChild(delCtrl);

                const iconDiv = document.createElement('div'); iconDiv.className = 'initial-icon'; iconDiv.textContent = link.title ? link.title.charAt(0).toUpperCase() : 'L';
                const titleSpan = document.createElement('span');
                titleSpan.style.cssText = 'font-size: 0.9rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; width: 100%; text-align: center;';
                titleSpan.textContent = link.title;

                card.appendChild(controls); card.appendChild(iconDiv); card.appendChild(titleSpan);
                grid.appendChild(card);
            });
            block.appendChild(grid); wrapper.appendChild(block);
        });

        db.widgets.filter(w => w.pageId === activePageId).forEach(widget => {
            const block = document.createElement('div');
            block.className = 'folder-block';
            const header = document.createElement('div');
            header.className = 'folder-header';
            const widgetTitle = document.createElement('div');
            widgetTitle.className = 'folder-title';
            widgetTitle.textContent = `📰 ${widget.name}`;
            const widgetActions = document.createElement('div');
            widgetActions.className = 'folder-actions';

            const btnEdit = document.createElement('button'); btnEdit.textContent = '✏️'; btnEdit.onclick = () => openModal('editWidget', widget.id);
            const btnDel = document.createElement('button'); btnDel.className = 'delete-folder'; btnDel.textContent = '×'; btnDel.onclick = () => handleDelete('widget', widget.id);

            widgetActions.appendChild(btnEdit); widgetActions.appendChild(btnDel);
            header.appendChild(widgetTitle); header.appendChild(widgetActions);
            block.appendChild(header);

            const rssContainer = document.createElement('div');
            rssContainer.className = 'rss-container';
            const fetchMsg = document.createElement('div'); fetchMsg.style.color = '#888'; fetchMsg.textContent = 'Fetching feed...';
            rssContainer.appendChild(fetchMsg);
            block.appendChild(rssContainer); wrapper.appendChild(block);
            fetchRSS(widget.url, rssContainer);
        });
    }

    async function fetchRSS(url, container) {
        try {
            const res = await fetch(url);
            const text = await res.text();
            const xml = new window.DOMParser().parseFromString(text, "text/xml");
            const items = Array.from(xml.querySelectorAll("item, entry")).slice(0, 6);
            container.textContent = '';
            if (items.length === 0) {
                const emptyMsg = document.createElement('div'); emptyMsg.style.color = 'var(--down-color)'; emptyMsg.textContent = 'No items found.'; container.appendChild(emptyMsg); return;
            }
            items.forEach(item => {
                const titleEl = item.querySelector("title");
                const linkEl = item.querySelector("link");
                const linkUrl = linkEl ? (linkEl.textContent.trim() || linkEl.getAttribute('href')) : '';
                const a = document.createElement('a'); a.href = linkUrl; a.target = '_blank'; a.className = 'rss-item'; a.textContent = "▪ " + (titleEl ? titleEl.textContent : 'Untitled');
                container.appendChild(a);
            });
        } catch (e) {
            container.textContent = '';
            const errorMsg = document.createElement('div'); errorMsg.style.color = 'var(--down-color)'; errorMsg.textContent = 'Failed to load feed.'; container.appendChild(errorMsg);
        }
    }

    // --- MODAL LOGIC ---
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalFields = document.getElementById('modal-fields');
    let currentAction = null; let currentTargetId = null;

    document.getElementById('modal-cancel').onclick = () => modal.classList.remove('active');
    document.getElementById('btn-add-page').onclick = () => openModal('addPage');
    document.getElementById('global-add-folder').onclick = () => openModal('addFolder');
    document.getElementById('global-add-rss').onclick = () => openModal('addWidget');

    function createInput(type, id, placeholder, value = '') {
        const input = document.createElement('input'); input.type = type; input.id = id; input.placeholder = placeholder; input.value = value; return input;
    }

    function openModal(action, targetId = null) {
        currentAction = action; currentTargetId = targetId; modalFields.textContent = ''; modal.classList.add('active');
        if (action === 'addPage') { modalTitle.textContent = "Create New Page"; modalFields.appendChild(createInput('text', 'modal-input-name', 'Page Name (e.g., Homelab)')); }
        else if (action === 'editPage') {
            modalTitle.textContent = "Edit Page";
            modalFields.appendChild(createInput('text', 'modal-input-name', '', db.pages.find(p => p.id === targetId).name));
            const delBtn = document.createElement('button'); delBtn.className = 'btn btn-cancel'; delBtn.style.cssText = 'color: var(--down-color); border-color: var(--down-color);'; delBtn.textContent = 'Delete Entire Page';
            delBtn.onclick = () => { handleDelete('page', targetId); modal.classList.remove('active'); }; modalFields.appendChild(delBtn);
        }
        else if (action === 'addFolder') { modalTitle.textContent = "Create New Folder"; modalFields.appendChild(createInput('text', 'modal-input-name', 'Folder Name')); }
        else if (action === 'editFolder') { modalTitle.textContent = "Edit Folder"; modalFields.appendChild(createInput('text', 'modal-input-name', '', db.folders.find(f => f.id === targetId).name)); }
        else if (action === 'addWidget') { modalTitle.textContent = "Add RSS Widget"; modalFields.appendChild(createInput('text', 'modal-input-name', 'Feed Name')); modalFields.appendChild(createInput('url', 'modal-input-url', 'RSS URL')); }
        else if (action === 'editWidget') {
            modalTitle.textContent = "Edit RSS Widget";
            const widget = db.widgets.find(w => w.id === targetId);
            modalFields.appendChild(createInput('text', 'modal-input-name', '', widget.name)); modalFields.appendChild(createInput('url', 'modal-input-url', '', widget.url));
        }
        else if (action === 'addLink') { modalTitle.textContent = "Add Bookmark"; modalFields.appendChild(createInput('text', 'modal-input-title', 'Title')); modalFields.appendChild(createInput('url', 'modal-input-url', 'URL')); }
        else if (action === 'editLink') {
            modalTitle.textContent = "Edit Bookmark";
            const link = db.links.find(l => l.id === targetId);
            modalFields.appendChild(createInput('text', 'modal-input-title', '', link.title)); modalFields.appendChild(createInput('url', 'modal-input-url', '', link.url));
        }
        setTimeout(() => { const first = modalFields.querySelector('input'); if(first) first.focus(); }, 100);
    }

    document.getElementById('modal-save').onclick = () => {
        const nameEl = document.getElementById('modal-input-name'); const name = nameEl ? nameEl.value.trim() : '';
        const titleEl = document.getElementById('modal-input-title'); const title = titleEl ? titleEl.value.trim() : '';
        const urlEl = document.getElementById('modal-input-url'); let url = urlEl ? urlEl.value.trim() : '';
        if (url && !url.startsWith('http')) url = 'https://' + url;

            if (['addPage', 'editPage', 'addFolder', 'editFolder'].includes(currentAction) && !name) return;
            if (['addWidget', 'editWidget'].includes(currentAction) && (!name || !url)) return;
            if (['addLink', 'editLink'].includes(currentAction) && (!title || !url)) return;

            if (currentAction === 'addPage') { const newId = generateId('p'); db.pages.push({ id: newId, name }); activePageId = newId; }
            else if (currentAction === 'editPage') db.pages.find(p => p.id === currentTargetId).name = name;
            else if (currentAction === 'addFolder') db.folders.push({ id: generateId('f'), pageId: activePageId, name });
            else if (currentAction === 'editFolder') db.folders.find(f => f.id === currentTargetId).name = name;
            else if (currentAction === 'addWidget') db.widgets.push({ id: generateId('w'), pageId: activePageId, type: 'rss', name, url });
            else if (currentAction === 'editWidget') { const w = db.widgets.find(w => w.id === currentTargetId); w.name = name; w.url = url; }
            else if (currentAction === 'addLink') db.links.push({ id: generateId('l'), folderId: currentTargetId, title, url });
            else if (currentAction === 'editLink') { const l = db.links.find(l => l.id === currentTargetId); l.title = title; l.url = url; }

            saveData(() => { modal.classList.remove('active'); renderUI(); });
    };

    function handleDelete(type, targetId) {
        if (confirm("Are you sure you want to delete this?")) {
            if (type === 'page') {
                db.pages = db.pages.filter(p => p.id !== targetId);
                const foldersToRemove = db.folders.filter(f => f.pageId === targetId).map(f => f.id);
                db.folders = db.folders.filter(f => f.pageId !== targetId);
                db.links = db.links.filter(l => !foldersToRemove.includes(l.folderId));
                db.widgets = db.widgets.filter(w => w.pageId !== targetId);
                activePageId = db.pages.length > 0 ? db.pages[0].id : null;
            } else if (type === 'folder') {
                db.folders = db.folders.filter(f => f.id !== targetId);
                db.links = db.links.filter(l => l.folderId !== targetId);
            } else if (type === 'widget') db.widgets = db.widgets.filter(w => w.id !== targetId);
            else if (type === 'link') db.links = db.links.filter(l => l.id !== targetId);
            saveData(() => renderUI());
        }
    }

    // --- SETTINGS & SYNC MODAL LOGIC ---
    const settingsModal = document.getElementById('settings-modal');
    const syncToggle = document.getElementById('sync-toggle');
    const syncUrlContainer = document.getElementById('sync-url-container');
    const syncUrlInput = document.getElementById('sync-url');
    const syncStatus = document.getElementById('sync-status');

    document.getElementById('btn-settings').onclick = () => {
        syncToggle.checked = syncConfig.enabled;
        syncUrlInput.value = syncConfig.url;
        syncUrlContainer.style.display = syncConfig.enabled ? 'flex' : 'none';
        syncStatus.style.display = 'none';
        settingsModal.classList.add('active');
    };

    document.getElementById('settings-close').onclick = () => settingsModal.classList.remove('active');

    syncToggle.addEventListener('change', (e) => {
        syncUrlContainer.style.display = e.target.checked ? 'flex' : 'none';
    });

    document.getElementById('btn-save-sync').onclick = () => {
        syncConfig.enabled = syncToggle.checked;
        syncConfig.url = syncUrlInput.value.trim();
        localStorage.setItem('udash_sync_config', JSON.stringify(syncConfig));

        syncStatus.textContent = "Settings saved! Refreshing...";
        syncStatus.style.display = 'block';
        setTimeout(() => window.location.reload(), 800);
    };

    document.getElementById('btn-force-sync').onclick = async () => {
        if (!syncUrlInput.value) return;
        syncStatus.style.display = 'block';
        syncStatus.textContent = "Pulling...";
        try {
            const res = await fetch(`${syncUrlInput.value.trim().replace(/\/$/, '')}/api/sync`);
            if (res.ok) {
                const remoteDb = await res.json();
                db = remoteDb;
                localStorage.setItem('udash_db', JSON.stringify(db));
                syncStatus.textContent = "Sync successful!";
                syncStatus.style.color = "var(--accent)";
                renderUI();
            } else throw new Error("Bad response");
        } catch (e) {
            syncStatus.textContent = "Failed to reach server.";
            syncStatus.style.color = "var(--down-color)";
        }
    };

    document.getElementById('btn-export-json').onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
        const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "udash_backup_" + new Date().toISOString().slice(0,10) + ".json");
        document.body.appendChild(dlAnchorElem); dlAnchorElem.click(); dlAnchorElem.remove();
    };

    const importFileInput = document.getElementById('import-json-file');
    document.getElementById('btn-import-json').onclick = () => importFileInput.click();
    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const backup = JSON.parse(evt.target.result);
                if (backup && Array.isArray(backup.pages)) {
                    if (confirm("WARNING: Overwrite current dashboard?")) {
                        db = backup;
                        saveData(() => {
                            activePageId = db.pages.length > 0 ? db.pages[0].id : null;
                            renderUI(); settingsModal.classList.remove('active'); alert("Backup restored!");
                        });
                    }
                }
            } catch (err) { alert("Invalid backup file."); }
            importFileInput.value = '';
        };
        reader.readAsText(file);
    });

    init();
});
