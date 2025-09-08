'use strict';
(function () {
    window.addEventListener('DOMContentLoaded', () => {
        // ---------- helpers -----------------------------------------------------
        const $ = (sel) => document.querySelector(sel);

        const statusEl = $('#status');
        const say = (msg, type = 'info') => {
            if (!statusEl) return console.log(`[status:${type}]`, msg);
            statusEl.className = type;
            statusEl.textContent = msg;
        };
        if (statusEl) statusEl.style.pointerEvents = 'none';

        if (!window.ol) { console.error('OpenLayers failed to load'); say('OpenLayers failed to load', 'error'); return; }

        // ---------- OL shortcuts & globals -------------------------------------
        const { Map, View } = ol;
        const { OSM, Vector: VectorSource } = ol.source;
        const { Tile: TileLayer, Vector: VectorLayer } = ol.layer;
        const { fromLonLat } = ol.proj;
        const { Style, Circle, Stroke, Fill } = ol.style;
        const { WKT } = ol.format;

        const wktFmt = new WKT();

        // Prefer your site origin; fallback to localhost dev port
        const API = location.origin.startsWith('http')
            ? `${location.origin}/api/geom-ef`
            : 'https://localhost:7243/api/geom-ef';

        // ---------- map & layers -----------------------------------------------
        const vectorSource = new VectorSource();

        const stylePoint = new Style({
            image: new Circle({ radius: 6, fill: new Fill({ color: '#2563eb' }), stroke: new Stroke({ color: '#fff', width: 2 }) })
        });
        const styleLine = new Style({ stroke: new Stroke({ color: '#2563eb', width: 3 }) });
        const stylePoly = new Style({ fill: new Fill({ color: 'rgba(37,99,235,0.15)' }), stroke: new Stroke({ color: '#2563eb', width: 2 }) });

        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: (feature) => {
                const t = feature.getGeometry().getType();
                if (t.startsWith('Point')) return stylePoint;
                if (t.includes('Line')) return styleLine;
                return stylePoly; // Polygon / MultiPolygon
            },
        });

        const map = new Map({
            target: 'map',
            layers: [new TileLayer({ source: new OSM() }), vectorLayer],
            view: new View({ center: fromLonLat([32.85, 39.93]), zoom: 12 })
        });

        // ---------- selection / info panel -------------------------------------
        let selected = null;

        const info = $('#info');
        // ensure hidden & click-through on load
        if (info) {
            info.classList.add('hidden');
            info.removeAttribute('aria-hidden');
            info.style.display = '';
            info.style.pointerEvents = '';
        }

        const infoTitle = $('#infoTitle');
        const infoName = $('#infoName');
        const infoId = $('#infoId');
        const infoType = $('#infoType');
        const infoWktEl = $('#infoWkt');
        const closeInfoBtn = $('#closeInfo');
        const infoImages = $('#infoImages');

        const selPoint = new Style({ image: new Circle({ radius: 8, fill: new Fill({ color: '#10b981' }), stroke: new Stroke({ color: '#fff', width: 2 }) }) });
        const selLine = new Style({ stroke: new Stroke({ color: '#10b981', width: 4 }) });
        const selPoly = new Style({ fill: new Fill({ color: 'rgba(16,185,129,0.25)' }), stroke: new Stroke({ color: '#10b981', width: 3 }) });

        // delegated delete button on thumbnails
        infoImages?.addEventListener('click', async (e) => {
            const btn = e.target.closest('.del');
            if (!btn || !selected) return;

            const wrap = btn.closest('.thumb');
            const id = selected.get('id');
            if (id == null) { say('Feature has no ID', 'error'); return; }

            const idxAttr = wrap?.dataset?.index;
            const urlAttr = wrap?.dataset?.url;

            // Prefer index (avoids any string normalization issues)
            let qs = '';
            if (idxAttr != null && idxAttr !== '') {
                qs = `index=${encodeURIComponent(idxAttr)}`;
            } else {
                const url = decodeURIComponent(urlAttr || '');
                if (!url) { say('Invalid image reference', 'error'); return; }
                qs = `url=${encodeURIComponent(url)}`;
            }

            if (!confirm('Delete this image?')) return;

            try {
                const r = await fetch(`${API}/${encodeURIComponent(id)}/images?${qs}`, { method: 'DELETE' });
                if (!r.ok) throw new Error(await r.text());
                const updated = await r.json(); // { id, name, wkt/WKT, images/Images }
                selected.set('images', (updated.images ?? updated.Images) || []);
                showInfoForFeature(selected);
                say('Image removed ✔', 'success');
            } catch (err) {
                console.error('Delete image failed', err);
                say(`Delete image failed: ${err.message || 'error'}`, 'error');
            }
        });

        function showInfoForFeature(f) {
            if (!f) return;
            if (selected && selected !== f) selected.setStyle(null);
            selected = f;

            const t = f.getGeometry().getType();
            f.setStyle(t.startsWith('Point') ? selPoint : t.includes('Line') ? selLine : selPoly);

            const g4326 = f.getGeometry().clone().transform('EPSG:3857', 'EPSG:4326');
            if (infoTitle) infoTitle.textContent = f.get('name') || 'Feature';
            if (infoName) infoName.textContent = f.get('name') || '(unnamed)';
            if (infoId) infoId.textContent = (f.get('id') ?? '—');
            if (infoType) infoType.innerHTML = `<span class="chip">${t}</span>`;
            if (infoWktEl) infoWktEl.textContent = wktFmt.writeGeometry(g4326);

            // images
            if (infoImages) {
                const imgs = f.get('images');
                if (imgs && imgs.length) {
                    infoImages.innerHTML = imgs.map((u, i) =>
                        `<div class="thumb" data-index="${i}" data-url="${encodeURIComponent(u)}">
              <img src="${u}" alt="Feature image">
              <button class="del" title="Remove">×</button>
            </div>`
                    ).join('');
                } else {
                    infoImages.textContent = '—';
                }
            }

            // fully reveal the overlay
            if (info) {
                info.classList.remove('hidden');
                info.removeAttribute('aria-hidden');
                info.style.display = '';
                info.style.pointerEvents = '';
            }
        }

        function closeInfoPanel() {
            if (selected) { selected.setStyle(null); selected = null; }
            if (info) {
                info.classList.add('hidden');
                info.removeAttribute('aria-hidden');
                info.style.display = '';
                info.style.pointerEvents = '';
            }
        }

        if (closeInfoBtn) closeInfoBtn.addEventListener('click', closeInfoPanel);

        // Select feature on click, unless drawing/editing is active
        map.on('singleclick', (evt) => {
            if (draw || editingActive) return;
            const hit = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
            if (hit) showInfoForFeature(hit); else closeInfoPanel();
        });

        map.on('pointermove', (e) => {
            const hit = map.hasFeatureAtPixel(map.getEventPixel(e.originalEvent));
            map.getTargetElement().style.cursor = hit ? 'pointer' : 'default';
        });

        // ---------- load features ----------------------------------------------
        async function loadFeatures() {
            try {
                const res = await fetch(API);
                if (!res.ok) throw new Error(await res.text());
                const arr = await res.json(); // [{ id/Id, name/Name, wkt/WKT, images/Images }]

                vectorSource.clear();

                arr.forEach((row) => {
                    const wkt = row.wkt ?? row.WKT;
                    const id = row.id ?? row.Id;
                    const name = row.name ?? row.Name;
                    const imgs = row.images ?? row.Images;

                    if (!wkt) return; // skip bad rows safely

                    const g = wktFmt.readGeometry(wkt).transform('EPSG:4326', 'EPSG:3857');
                    const feat = new ol.Feature({ geometry: g });
                    feat.set('id', id);
                    feat.set('name', name);
                    if (imgs) feat.set('images', imgs);
                    vectorSource.addFeature(feat);
                });

                say(`Loaded ${arr.length} feature(s).`, 'success');
            } catch (e) {
                console.warn('Load failed:', e.message);
                say('Map ready');
            }
        }
        loadFeatures();

        // -----------------------------------------------------------------------
        // NAVBAR: Point / Line / Polygon / Refresh / Fit / Search
        // -----------------------------------------------------------------------
        const btnPoint = $('#modePoint');
        const btnLine = $('#modeLine');
        const btnPoly = $('#modePoly');
        const btnRefresh = $('#refreshBtn');
        const btnFit = $('#fitBtn');
        const searchForm = $('#searchForm');
        const searchInput = $('#searchInput');
        const clearBtn = $('#clearBtn');

        let draw = null;       // active Draw interaction
        let activeMode = null; // 'point' | 'line' | 'poly' | null

        function updateModeButtons(next) {
            [btnPoint, btnLine, btnPoly].forEach(b => b?.classList.remove('active'));
            if (next === 'point') btnPoint?.classList.add('active');
            if (next === 'line') btnLine?.classList.add('active');
            if (next === 'poly') btnPoly?.classList.add('active');
        }

        function stopDrawInteraction() {
            if (draw) { map.removeInteraction(draw); draw = null; }
            map.getTargetElement().classList.remove('crosshair');
            activeMode = null;
            updateModeButtons(null);
        }

        async function promptName(initial = '') {
            const modal = $('#nameModal');
            const input = $('#nameInput');
            const ok = $('#saveName');
            const cancel = $('#cancelName');
            if (!(modal && input && ok && cancel)) return Promise.resolve(prompt('Name?', initial || '') || null);
            return new Promise((resolve) => {
                modal.classList.remove('hidden');
                input.value = initial || '';
                setTimeout(() => input.focus(), 0);
                const done = (v) => { cleanup(); modal.classList.add('hidden'); resolve(v); };
                const onSave = () => { const v = input.value.trim(); if (!v) return; done(v); };
                const onCancel = () => done(null);
                const onKey = (e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); };
                function cleanup() { ok.removeEventListener('click', onSave); cancel.removeEventListener('click', onCancel); input.removeEventListener('keydown', onKey); }
                ok.addEventListener('click', onSave); cancel.addEventListener('click', onCancel); input.addEventListener('keydown', onKey);
            });
        }

        function startDrawInteraction(kind) {
            // cancel geometry edit if any
            if (editingActive) stopGeometryEdit({ save: false });
            stopDrawInteraction();

            let type;
            if (kind === 'point') type = 'Point';
            else if (kind === 'line') type = 'LineString';
            else if (kind === 'poly') type = 'Polygon';
            else return;

            draw = new ol.interaction.Draw({
                source: vectorSource,
                type,
                style: kind === 'point' ? stylePoint : kind === 'line' ? styleLine : stylePoly,
            });

            draw.on('drawend', async (evt) => {
                const feat = evt.feature;
                try {
                    const name = await promptName('');
                    if (!name) { vectorSource.removeFeature(feat); say('Cancelled'); return; }

                    const g4326 = feat.getGeometry().clone().transform('EPSG:3857', 'EPSG:4326');
                    const wkt = wktFmt.writeGeometry(g4326);

                    const r = await fetch(API, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, wkt })
                    });
                    if (!r.ok) throw new Error(await r.text());
                    const saved = await r.json();

                    feat.set('id', saved.id ?? saved.Id);
                    feat.set('name', (saved.name ?? saved.Name) ?? name);
                    const imgs = saved.images ?? saved.Images;
                    if (imgs) feat.set('images', imgs);
                    say('Saved ✔', 'success');
                } catch (err) {
                    console.error('Save failed', err);
                    say('Save failed', 'error');
                    vectorSource.removeFeature(feat);
                } finally {
                    stopDrawInteraction();
                }
            });

            map.addInteraction(draw);
            map.getTargetElement().classList.add('crosshair');
            activeMode = kind;
            updateModeButtons(kind);
        }

        btnPoint?.addEventListener('click', (e) => { e.preventDefault(); startDrawInteraction('point'); });
        btnLine?.addEventListener('click', (e) => { e.preventDefault(); startDrawInteraction('line'); });
        btnPoly?.addEventListener('click', (e) => { e.preventDefault(); startDrawInteraction('poly'); });

        btnRefresh?.addEventListener('click', (e) => { e.preventDefault(); stopDrawInteraction(); closeInfoPanel(); loadFeatures(); });

        btnFit?.addEventListener('click', (e) => {
            e.preventDefault();
            try {
                const extent = vectorSource.getExtent();
                if (!extent || !isFinite(extent[0])) { say('No features to fit'); return; }
                map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 18, duration: 350 });
            } catch { /* ignore */ }
        });

        function findFeatureByName(q) {
            if (!q) return null;
            const needle = q.trim().toLowerCase();
            let hit = null;
            vectorSource.forEachFeature(f => {
                if (hit) return;
                const nm = (f.get('name') || '').toString().toLowerCase();
                if (nm.includes(needle)) hit = f;
            });
            return hit;
        }

        searchForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = searchInput?.value || '';
            const f = findFeatureByName(q);
            if (!f) { say('No match'); return; }
            showInfoForFeature(f);
            try {
                const g = f.getGeometry();
                map.getView().fit(g.getExtent(), { padding: [50, 50, 50, 50], maxZoom: 18, duration: 300 });
            } catch { }
            say('Found ✔', 'success');
        });

        clearBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            if (searchInput) searchInput.value = '';
            if (selected) { selected.setStyle(null); selected = null; }
            closeInfoPanel();
            say('Cleared');
        });

        // Cancel drawing with Esc
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && draw) { stopDrawInteraction(); }
        });

        // ---------- Update dropdown & actions + Geometry edit -------------------
        const updateMain = $('#updateMain');
        const updateMenu = $('#updateMenu');
        const updateDD = $('#updateDropdown');
        const menuUpdateName = $('#updateName');
        const menuUpdateGeom = $('#updateGeom');

        const addImageBtn = $('#addImageBtn');
        const imageModal = $('#imageModal');
        const imageInput = $('#imageInput');
        const imageFile = $('#imageFile');
        const saveImage = $('#saveImage');
        const cancelImage = $('#cancelImage');

        function openUpdateMenu() { updateMenu?.classList.remove('hidden'); updateMain?.setAttribute('aria-expanded', 'true'); }
        function closeUpdateMenu() { updateMenu?.classList.add('hidden'); updateMain?.setAttribute('aria-expanded', 'false'); }

        updateMain?.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (updateMenu.classList.contains('hidden')) openUpdateMenu(); else closeUpdateMenu();
        });
        document.addEventListener('click', (e) => { if (updateDD && !updateDD.contains(e.target)) closeUpdateMenu(); });

        // Edit NAME (204-safe)
        menuUpdateName?.addEventListener('click', async (e) => {
            e.preventDefault(); closeUpdateMenu();
            if (!selected) { say('Select a feature first'); return; }

            try {
                const newName = await promptName(selected.get('name') || '');
                if (!newName) return;

                const id = selected.get('id');
                if (id === undefined || id === null) throw new Error('Feature has no ID');

                const g4326 = selected.getGeometry().clone().transform('EPSG:3857', 'EPSG:4326');
                const body = JSON.stringify({ name: newName, wkt: wktFmt.writeGeometry(g4326) });

                const r = await fetch(`${API}/${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body
                });
                if (!r.ok) throw new Error(await r.text());

                if (r.status !== 204) {
                    try {
                        const upd = await r.json();
                        selected.set('name', (upd?.name ?? upd?.Name) ?? newName);
                    } catch {
                        selected.set('name', newName);
                    }
                } else {
                    selected.set('name', newName);
                }

                showInfoForFeature(selected);
                say('Updated ✔', 'success');
            } catch (err) {
                console.error('Update failed', err);
                say('Update failed', 'error');
            }
        });

        // =================== Edit GEOMETRY flow ===================
        let modify = null;
        let originalGeom = null;
        let editingActive = false;

        function startGeometryEdit() {
            if (!selected || editingActive) return;

            // stop drawing if active
            if (draw) stopDrawInteraction();

            originalGeom = selected.getGeometry().clone();
            const features = new ol.Collection([selected]);
            modify = new ol.interaction.Modify({ features });
            map.addInteraction(modify);
            editingActive = true;

            // hide info overlay completely so it can't block clicks
            if (info) { info.classList.add('hidden'); info.style.display = 'none'; info.style.pointerEvents = 'none'; }

            document.body.classList.add('editing');
            const tgt = map.getTargetElement();
            tgt.classList.add('crosshair');
            tgt.style.cursor = 'crosshair';
        }

        function stopGeometryEdit({ save }) {
            if (!editingActive && !modify) return;

            // remove modify interaction (even if our local ref got stale)
            try {
                if (modify) map.removeInteraction(modify);
                map.getInteractions().forEach((i) => {
                    const name = i?.constructor?.name || '';
                    if (name.toLowerCase().includes('modify')) map.removeInteraction(i);
                });
            } catch { }
            modify = null;

            // revert geometry if not saving
            if (!save && selected && originalGeom) {
                selected.setGeometry(originalGeom);
            }

            originalGeom = null;
            editingActive = false;

            // restore cursors / classes
            document.body.classList.remove('editing');
            const tgt = map.getTargetElement();
            tgt.classList.remove('crosshair');
            tgt.style.cursor = 'default';

            // clear selection highlight & info panel
            if (selected) { selected.setStyle(null); selected = null; }
            if (info) { info.classList.add('hidden'); info.style.display = 'none'; info.style.pointerEvents = ''; }

            say('Map ready');
            loadFeatures(); // reload fresh data
        }

        async function saveEditedGeometry() {
            if (!selected) return;
            try {
                const id = selected.get('id');
                if (id === undefined || id === null) throw new Error('Feature has no ID');
                const name = selected.get('name') || '';

                const g4326 = selected.getGeometry().clone().transform('EPSG:3857', 'EPSG:4326');
                const body = JSON.stringify({ name, wkt: wktFmt.writeGeometry(g4326) });

                const r = await fetch(`${API}/${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body
                });
                if (!r.ok) throw new Error(await r.text());

                say('Geometry updated ✔', 'success');
                stopGeometryEdit({ save: true });
            } catch (err) {
                console.error('Update geometry failed', err);
                say('Update failed', 'error');
                stopGeometryEdit({ save: false });
            }
        }

        // open geometry edit from dropdown
        menuUpdateGeom?.addEventListener('click', (e) => {
            e.preventDefault(); closeUpdateMenu();
            if (!selected) { say('Select a feature first'); return; }
            startGeometryEdit();
        });

        // keyboard handling for geometry edit
        window.addEventListener('keydown', (e) => {
            if (!editingActive) return;
            if (e.key === 'Enter') { e.preventDefault(); saveEditedGeometry(); }
            if (e.key === 'Escape') { e.preventDefault(); say('Edit cancelled'); stopGeometryEdit({ save: false }); }
        });

        // ---------- Add Image (modal) -----------------
        function openImageModal() {
            if (!selected) return;
            imageModal.classList.remove('hidden');
            imageInput.value = '';
            setTimeout(() => imageInput.focus(), 0);
        }
        function closeImageModal() { imageModal.classList.add('hidden'); }

        addImageBtn?.addEventListener('click', openImageModal);
        cancelImage?.addEventListener('click', closeImageModal);
        imageModal?.addEventListener('click', (e) => {
            const card = imageModal.querySelector('.modal-card');
            if (card && !card.contains(e.target)) closeImageModal();
        });

        saveImage?.addEventListener('click', async () => {
            if (!selected) return;

            const id = selected.get('id');
            if (id === undefined || id === null) { say('No feature id', 'error'); return; }

            const file = imageFile?.files?.[0];
            try {
                if (file) {
                    // upload file
                    const fd = new FormData();
                    fd.append('file', file);

                    const r = await fetch(`${API}/${encodeURIComponent(id)}/images`, { method: 'POST', body: fd });
                    if (!r.ok) throw new Error(await r.text());

                    const updated = await r.json(); // { id, name, wkt/WKT, images/Images }
                    selected.set('images', (updated.images ?? updated.Images) || []);
                    showInfoForFeature(selected);
                    say('Image uploaded ✔', 'success');
                    closeImageModal();
                    return;
                }

                // fallback: add by URL
                const url = imageInput.value.trim();
                if (!url) { say('Pick a file or paste a URL', 'error'); return; }

                const imgs = (selected.get('images') || []).slice();
                imgs.push(url);

                const g4326 = selected.getGeometry().clone().transform('EPSG:3857', 'EPSG:4326');
                const body = JSON.stringify({ name: selected.get('name') || '', wkt: wktFmt.writeGeometry(g4326), images: imgs });

                const r2 = await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
                if (!r2.ok) throw new Error(await r2.text());

                selected.set('images', imgs);
                showInfoForFeature(selected);
                say('Image added ✔', 'success');
                closeImageModal();
            } catch (err) {
                console.error('Add image failed', err);
                say('Add image failed', 'error');
            } finally {
                if (imageFile) imageFile.value = ''; // clear file input
            }
        });

        // ---------- Delete feature (modal) --------------------------------------
        const deleteModal = $('#deleteModal');
        const deleteHintEl = $('#deleteHint');
        const cancelDelete = $('#cancelDelete');
        const confirmDelete = $('#confirmDelete');
        const deleteBtn = $('#deleteBtn');

        function openDeleteModal() {
            if (!selected) return;
            const nm = selected.get('name') || 'this feature';
            if (deleteHintEl) deleteHintEl.textContent = `Are you sure you want to delete “${nm}”? This action cannot be undone.`;
            deleteModal?.classList.remove('hidden');
            setTimeout(() => confirmDelete?.focus(), 0);
        }
        const closeDeleteModal = () => deleteModal?.classList.add('hidden');

        deleteBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openDeleteModal(); });
        cancelDelete?.addEventListener('click', closeDeleteModal);
        deleteModal?.addEventListener('click', (e) => {
            const card = deleteModal.querySelector('.modal-card');
            if (card && !card.contains(e.target)) closeDeleteModal();
        });
        confirmDelete?.addEventListener('click', performDelete);

        async function performDelete() {
            if (!selected) return closeDeleteModal();
            const orig = confirmDelete.textContent; confirmDelete.disabled = true; confirmDelete.textContent = 'Deleting…';
            try {
                const id = selected.get('id');
                if (id !== undefined && id !== null) {
                    const r = await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
                    if (!r.ok) throw new Error(await r.text());
                }
                vectorSource.removeFeature(selected); selected = null; closeInfoPanel();
                say('Deleted ✔', 'success');
            } catch (err) {
                console.error('Delete failed', err);
                say('Delete failed', 'error');
            } finally {
                confirmDelete.disabled = false; confirmDelete.textContent = orig; closeDeleteModal();
            }
        }

        // ---------- Copy WKT ----------------------------------------------------
        $('#copyWkt')?.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(infoWktEl.textContent); say('WKT copied ✔', 'success'); }
            catch { say('Copy failed', 'error'); }
        });
    });
})();
