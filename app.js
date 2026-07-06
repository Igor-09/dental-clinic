function initApp(user) {
    
    console.log('Запуск для:', user.name);
    
    if (typeof firebase === 'undefined' || typeof db === 'undefined') {
        document.getElementById('syncText').textContent = 'Ошибка подключения';
        return;
    }
    
    var currentUserId = user.id;
    var viewAllUsers = false;
    var currentStartDate = new Date();
    var events = {};
    var editingEvent = null;
    var selectedCell = null;
    var copiedEvent = null; // Для копирования
    
    var userSelect = document.getElementById('userSelect');
    var datePicker = document.getElementById('datePicker');
    var dateRangeDisplay = document.getElementById('dateRangeDisplay');
    var scheduleTable = document.getElementById('scheduleTable');
    var eventModal = document.getElementById('eventModal');
    var eventName = document.getElementById('eventName');
    var eventPatient = document.getElementById('eventPatient');
    var eventPhone = document.getElementById('eventPhone');
    var eventType = document.getElementById('eventType');
    var eventColor = document.getElementById('eventColor');
    var eventComment = document.getElementById('eventComment');
    var syncDot = document.getElementById('syncDot');
    var syncText = document.getElementById('syncText');
    var modalTitle = document.getElementById('modalTitle');
    var deleteEventBtn = document.getElementById('deleteEventBtn');
    var currentUserName = document.getElementById('currentUserName');
    
    var userColors = { 'user1': '#607D8B', 'user2': '#FF9800' };
    var userNames = {
        'user1': { name: 'Димидов Д.П.', spec: 'Хирург-имплантолог' },
        'user2': { name: 'Казарьянц Э.А.', spec: 'Ортопед' }
    };
    
    var timeSlots = [];
    for (var h = 9; h <= 20; h++) {
        timeSlots.push(String(h).padStart(2, '0') + ':00');
        if (h < 20) timeSlots.push(String(h).padStart(2, '0') + ':30');
    }
    
    userSelect.value = currentUserId;
    
    function setStatus(s, t) { if(syncDot) syncDot.className = 'sync-dot ' + s; if(syncText) syncText.textContent = t; }
    
    db.ref('.info/connected').on('value', function(snap) {
        setStatus(snap.val() === true ? 'online' : 'offline', snap.val() === true ? 'Подключено' : 'Нет подключения');
    });
    
    function loadEvents(cb) {
        setStatus('syncing', 'Загрузка...');
        db.ref('events').once('value').then(function(snap) { cb(snap.val() || {}); setStatus('online', 'Готово'); }).catch(function() { cb({}); });
    }
    
    function formatDate(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
    
    function getWeekDates(sd) {
        var dates = [], c = new Date(sd), dow = c.getDay(), diff = c.getDate() - dow + (dow === 0 ? -6 : 1);
        var mon = new Date(c.setDate(diff));
        for (var i = 0; i < 7; i++) { var nd = new Date(mon); nd.setDate(mon.getDate() + i); dates.push(nd); }
        return dates;
    }
    
    function isToday(d) { var t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); }
    function getDayName(d) { return ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()]; }
    function getMonthName(d) { return ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'][d.getMonth()]; }
    
    function getEventTypeLabel(t) {
        var lb = { consultation:'Консультация', implantation:'Имплантация', removal:'Удаление', examination:'Осмотр', delivery:'Сдача', scanning:'Сканирование', fitting:'Примерка', other:'Прочее' };
        return lb[t] || t;
    }
    
    function esc(t) { if(!t) return ''; var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    
    function getCellHeight() {
        var cell = document.querySelector('.schedule-cell');
        if (cell) return cell.getBoundingClientRect().height;
        return 50;
    }
    
    function renderSchedule() {
        loadEvents(function(le) {
            events = le;
            var wd = getWeekDates(currentStartDate);
            dateRangeDisplay.textContent = wd[0].getDate() + ' ' + getMonthName(wd[0]) + ' - ' + wd[6].getDate() + ' ' + getMonthName(wd[6]);
            datePicker.value = formatDate(currentStartDate);
            
            var html = '';
            html += '<div class="date-headers"><div class="time-header-cell">Время</div>';
            for (var i = 0; i < 7; i++) {
                var d = wd[i];
                html += '<div class="date-header-cell' + (isToday(d)?' today':'') + '" data-date="' + formatDate(d) + '"><div class="date-day-name">' + getDayName(d) + '</div><div class="date-day-number">' + d.getDate() + '</div><div class="date-month">' + getMonthName(d) + '</div></div>';
            }
            html += '</div>';
            
            for (var t = 0; t < timeSlots.length; t++) {
                html += '<div class="schedule-row"><div class="time-cell">' + timeSlots[t] + '</div>';
                for (var di = 0; di < 7; di++) {
                    var dk = formatDate(wd[di]), tc = isToday(wd[di]) ? ' today-column' : '';
                    html += '<div class="schedule-cell' + tc + '" data-date="' + dk + '" data-time="' + timeSlots[t] + '"></div>';
                }
                html += '</div>';
            }
            scheduleTable.innerHTML = html;
            
            setTimeout(function() { placeOverlays(wd); }, 100);
            
            document.querySelectorAll('.schedule-cell').forEach(function(cell) {
                cell.onclick = function(e) {
                    if (e.target.closest('.merged-event-overlay')) return;
                    selectedCell = { date: this.dataset.date, time: this.dataset.time };
                    
                    // Если есть скопированное событие — сразу вставляем
                    if (copiedEvent) {
                        pasteEvent();
                    } else {
                        openNewModal();
                    }
                };
                
                // Правый клик — вставить скопированное
                cell.oncontextmenu = function(e) {
                    e.preventDefault();
                    selectedCell = { date: this.dataset.date, time: this.dataset.time };
                    if (copiedEvent) {
                        pasteEvent();
                    }
                };
            });
            
            document.querySelectorAll('.date-header-cell').forEach(function(h) {
                h.onclick = function() { currentStartDate = new Date(this.dataset.date + 'T00:00:00'); renderSchedule(); };
            });
            
            // Показываем подсказку о скопированном событии
            updateCopyHint();
        });
    }
    
    function updateCopyHint() {
        var old = document.querySelector('.copy-hint');
        if (old) old.remove();
        
        if (copiedEvent) {
            var hint = document.createElement('div');
            hint.className = 'copy-hint';
            hint.innerHTML = '📋 Скопировано: <b>' + esc(copiedEvent.title) + '</b> | Нажмите на ячейку чтобы вставить | <button onclick="window._cancelCopy()" style="cursor:pointer;border:none;background:#f44336;color:white;padding:2px 8px;border-radius:4px;">✕</button>';
            hint.style.cssText = 'text-align:center;padding:6px;background:#fff3e0;border-bottom:1px solid #ffcc02;font-size:12px;flex-shrink:0;';
            var nav = document.querySelector('.date-nav');
            if (nav) nav.parentNode.insertBefore(hint, nav.nextSibling);
        }
    }
    
    window._cancelCopy = function() {
        copiedEvent = null;
        updateCopyHint();
    };
    
    function pasteEvent() {
        if (!copiedEvent || !selectedCell) return;
        
        var startTime = selectedCell.time;
        // Вычисляем конец на основе длительности скопированного события
        var origStartIdx = timeSlots.indexOf(copiedEvent.startTime);
        var origEndIdx = timeSlots.indexOf(copiedEvent.endTime);
        var duration = origEndIdx - origStartIdx;
        var newStartIdx = timeSlots.indexOf(startTime);
        var newEndIdx = Math.min(newStartIdx + duration, timeSlots.length - 1);
        var endTime = timeSlots[newEndIdx];
        
        var date = selectedCell.date;
        var gid = 'g' + Date.now();
        var promises = [];
        
        for (var i = newStartIdx; i <= newEndIdx; i++) {
            var ek = date + '_' + timeSlots[i];
            var eid = gid + '_' + i;
            var data = {
                title: copiedEvent.title,
                patient: copiedEvent.patient,
                phone: copiedEvent.phone,
                type: copiedEvent.type,
                color: copiedEvent.color,
                comment: copiedEvent.comment,
                user: currentUserId,
                groupId: gid,
                spanCount: newEndIdx - newStartIdx + 1,
                startTime: startTime,
                endTime: endTime,
                createdAt: new Date().toISOString()
            };
            promises.push(db.ref('events/' + ek + '/' + eid).set(data));
        }
        
        Promise.all(promises).then(function() {
            setStatus('online', 'Вставлено!');
            selectedCell = null;
            renderSchedule();
        });
    }
    
    function placeOverlays(wd) {
        var CELL_HEIGHT = getCellHeight();
        
        var mergedEvents = {};
        for (var di = 0; di < 7; di++) {
            var dk = formatDate(wd[di]);
            mergedEvents[dk] = [];
            var sg = {};
            for (var t = 0; t < timeSlots.length; t++) {
                var tk = timeSlots[t], ek = dk + '_' + tk, cd = events[ek] || {};
                for (var k in cd) {
                    if (!cd.hasOwnProperty(k)) continue;
                    var ev = cd[k]; ev._id = k; ev._eventKey = ek;
                    if (ev.groupId) { if (sg[ev.groupId]) continue; sg[ev.groupId] = true; }
                    var si = timeSlots.indexOf(ev.startTime), ei = timeSlots.indexOf(ev.endTime);
                    if (si >= 0 && ei >= si) mergedEvents[dk].push({ event: ev, top: si * CELL_HEIGHT, height: (ei - si + 1) * CELL_HEIGHT });
                }
            }
        }
        
        document.querySelectorAll('.merged-event-overlay').forEach(function(el) { el.remove(); });
        
        for (var di = 0; di < 7; di++) {
            var dk = formatDate(wd[di]), col = mergedEvents[dk] || [], cells = document.querySelectorAll('.schedule-cell[data-date="' + dk + '"]');
            if (cells.length > 0) {
                var fc = cells[0];
                fc.style.position = 'relative';
                
                col.forEach(function(me) {
                    if (!viewAllUsers && me.event.user !== currentUserId) return;
                    var ov = document.createElement('div');
                    ov.className = 'merged-event-overlay';
                    ov.style.cssText = 'background:' + (me.event.color||'#607D8B') + ';top:' + me.top + 'px;height:' + me.height + 'px;';
                    ov.innerHTML = '<div style="font-weight:700;">' + esc(me.event.title) + '</div>' + (me.event.patient?'<div style="font-size:10px;">'+esc(me.event.patient)+'</div>':'') + '<div style="font-size:10px;">' + me.event.startTime + ' — ' + me.event.endTime + '</div>';
                    ov.onclick = function(e) { e.stopPropagation(); openEditModal(me.event._eventKey, me.event._id, me.event); };
                    fc.appendChild(ov);
                });
            }
        }
    }
    
    function openNewModal() {
        editingEvent = { isNew: true, date: selectedCell.date, time: selectedCell.time };
        eventName.value = '';
        eventPatient.value = '';
        eventPhone.value = '';
        eventType.value = 'consultation';
        eventColor.value = userColors[currentUserId] || '#607D8B';
        eventComment.value = '';
        
        addTimeSelects(selectedCell.time, null);
        
        modalTitle.textContent = 'Новая запись - ' + selectedCell.date + ' ' + selectedCell.time;
        deleteEventBtn.style.display = 'none';
        document.getElementById('copyEventBtn').style.display = 'none';
        eventModal.style.display = 'block';
        eventName.focus();
    }
    
    function openEditModal(ek, evId, evData) {
        editingEvent = { 
            eventKey: ek, 
            eventId: evId, 
            event: evData, 
            isNew: false,
            date: ek.split('_')[0]
        };
        
        eventName.value = evData.title || '';
        eventPatient.value = evData.patient || '';
        eventPhone.value = evData.phone || '';
        eventType.value = evData.type || 'consultation';
        eventColor.value = evData.color || '#607D8B';
        eventComment.value = evData.comment || '';
        
        addTimeSelects(evData.startTime, evData.endTime);
        
        modalTitle.textContent = 'Редактировать запись';
        deleteEventBtn.style.display = 'inline-block';
        document.getElementById('copyEventBtn').style.display = 'inline-block';
        eventModal.style.display = 'block';
    }
    
    function addTimeSelects(startVal, endVal) {
        var old = document.querySelector('.time-range-select');
        if (old && old.parentElement) old.parentElement.remove();
        
        var pg = document.getElementById('eventPhone');
        if (!pg) return;
        var phoneGroup = pg.closest('.form-group');
        if (!phoneGroup) return;
        
        var tc = document.createElement('div');
        tc.className = 'form-group';
        tc.innerHTML = '<label>Время начала и конца:</label><div class="time-range-select"><select id="eventStartTime" class="time-select"></select><span class="time-separator">—</span><select id="eventEndTime" class="time-select"></select></div>';
        phoneGroup.parentNode.insertBefore(tc, phoneGroup.nextSibling);
        
        var ss = document.getElementById('eventStartTime'), es = document.getElementById('eventEndTime');
        timeSlots.forEach(function(t) {
            var o1 = document.createElement('option'); o1.value = t; o1.textContent = t; ss.appendChild(o1);
            var o2 = document.createElement('option'); o2.value = t; o2.textContent = t; es.appendChild(o2);
        });
        if (startVal) ss.value = startVal;
        if (endVal) es.value = endVal;
        if (startVal && !endVal) {
            var idx = timeSlots.indexOf(startVal);
            if (idx >= 0 && idx < timeSlots.length - 1) es.value = timeSlots[idx + 1];
        }
    }
    
    function closeModal() {
        eventModal.style.display = 'none';
    }
    
    function copyCurrentEvent() {
        if (!editingEvent || editingEvent.isNew) return;
        
        copiedEvent = {
            title: eventName.value.trim(),
            patient: eventPatient.value.trim(),
            phone: eventPhone.value.trim(),
            type: eventType.value,
            color: eventColor.value,
            comment: eventComment.value.trim(),
            startTime: document.getElementById('eventStartTime')?.value || editingEvent.event.startTime,
            endTime: document.getElementById('eventEndTime')?.value || editingEvent.event.endTime
        };
        
        closeModal();
        updateCopyHint();
        setStatus('online', 'Событие скопировано! Нажмите на ячейку для вставки');
    }
    
    function saveEvent() {
        if (!editingEvent) { alert('Ошибка: нет данных'); return; }
        
        var title = eventName.value.trim();
        if (!title) { alert('Введите название'); eventName.focus(); return; }
        
        var ss = document.getElementById('eventStartTime');
        var es = document.getElementById('eventEndTime');
        
        var startTime = ss ? ss.value : (editingEvent.time || editingEvent.event?.startTime || '09:00');
        var endTime = es ? es.value : startTime;
        
        var date;
        if (editingEvent.date) {
            date = editingEvent.date;
        } else if (editingEvent.eventKey) {
            date = editingEvent.eventKey.split('_')[0];
        } else if (selectedCell && selectedCell.date) {
            date = selectedCell.date;
        } else {
            date = formatDate(new Date());
        }
        
        var si = timeSlots.indexOf(startTime);
        var ei = timeSlots.indexOf(endTime);
        if (si < 0 || ei < si) { alert('Ошибка диапазона времени'); return; }
        
        setStatus('syncing', 'Сохранение...');
        
        var gid = editingEvent.isNew ? 'g' + Date.now() : (editingEvent.event?.groupId || 'g' + Date.now());
        var promises = [];
        
        if (!editingEvent.isNew && editingEvent.event?.groupId) {
            for (var k in events) {
                if (!events.hasOwnProperty(k)) continue;
                for (var eid in events[k]) {
                    if (events[k].hasOwnProperty(eid) && events[k][eid].groupId === editingEvent.event.groupId) {
                        promises.push(db.ref('events/' + k + '/' + eid).remove());
                    }
                }
            }
        } else if (!editingEvent.isNew) {
            promises.push(db.ref('events/' + editingEvent.eventKey + '/' + editingEvent.eventId).remove());
        }
        
        for (var i = si; i <= ei; i++) {
            var ek = date + '_' + timeSlots[i];
            var eid = gid + '_' + i;
            var data = {
                title: title,
                patient: eventPatient.value.trim(),
                phone: eventPhone.value.trim(),
                type: eventType.value,
                color: eventColor.value,
                comment: eventComment.value.trim(),
                user: editingEvent.isNew ? currentUserId : (editingEvent.event?.user || currentUserId),
                groupId: gid,
                spanCount: ei - si + 1,
                startTime: startTime,
                endTime: endTime,
                createdAt: editingEvent.event?.createdAt || new Date().toISOString()
            };
            promises.push(db.ref('events/' + ek + '/' + eid).set(data));
        }
        
        Promise.all(promises).then(function() {
            setStatus('online', 'Сохранено!');
            closeModal();
            renderSchedule();
        }).catch(function(e) {
            alert('Ошибка сохранения');
        });
    }
    
    function deleteEvent() {
        if (!editingEvent || editingEvent.isNew) { closeModal(); return; }
        if (!confirm('Удалить запись?')) return;
        
        setStatus('syncing', 'Удаление...');
        var promises = [];
        var gid = editingEvent.event?.groupId;
        
        if (gid) {
            for (var k in events) {
                if (!events.hasOwnProperty(k)) continue;
                for (var eid in events[k]) {
                    if (events[k].hasOwnProperty(eid) && events[k][eid].groupId === gid) {
                        promises.push(db.ref('events/' + k + '/' + eid).remove());
                    }
                }
            }
        } else {
            promises.push(db.ref('events/' + editingEvent.eventKey + '/' + editingEvent.eventId).remove());
        }
        
        Promise.all(promises).then(function() { setStatus('online', 'Удалено'); closeModal(); renderSchedule(); });
    }
    
    // Навигация
    document.getElementById('prevDay').addEventListener('click', function() { currentStartDate.setDate(currentStartDate.getDate() - 1); renderSchedule(); });
    document.getElementById('nextDay').addEventListener('click', function() { currentStartDate.setDate(currentStartDate.getDate() + 1); renderSchedule(); });
    document.getElementById('prevWeek').addEventListener('click', function() { currentStartDate.setDate(currentStartDate.getDate() - 7); renderSchedule(); });
    document.getElementById('nextWeek').addEventListener('click', function() { currentStartDate.setDate(currentStartDate.getDate() + 7); renderSchedule(); });
    document.getElementById('todayBtn').addEventListener('click', function() { currentStartDate = new Date(); renderSchedule(); });
    document.getElementById('syncBtn').addEventListener('click', renderSchedule);
    
    datePicker.addEventListener('change', function() { if (this.value) { currentStartDate = new Date(this.value + 'T00:00:00'); renderSchedule(); } });
    
    userSelect.addEventListener('change', function() {
        currentUserId = this.value;
        currentUserName.textContent = '👤 ' + userNames[currentUserId].name;
        renderSchedule();
    });
    
    document.getElementById('viewAllBtn').addEventListener('click', function() {
        viewAllUsers = !viewAllUsers;
        this.textContent = viewAllUsers ? '👤 Только я' : '👁 Все специалисты';
        renderSchedule();
    });
    
    document.getElementById('saveEventBtn').addEventListener('click', saveEvent);
    document.getElementById('deleteEventBtn').addEventListener('click', deleteEvent);
    document.getElementById('copyEventBtn').addEventListener('click', copyCurrentEvent);
    document.getElementById('cancelEventBtn').addEventListener('click', closeModal);
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    eventModal.addEventListener('click', function(e) { if (e.target === eventModal) closeModal(); });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && eventModal.style.display === 'block') closeModal();
    });
    
    window.addEventListener('resize', function() {
        var wd = getWeekDates(currentStartDate);
        placeOverlays(wd);
    });
    // ========== ИСТОРИЯ СОБЫТИЙ ==========
    
    var allEventsCache = [];
    
    function loadAllEvents() {
        var result = [];
        for (var key in events) {
            if (!events.hasOwnProperty(key)) continue;
            var parts = key.split('_');
            var date = parts[0];
            var time = parts[1] || '';
            
            for (var eid in events[key]) {
                if (!events[key].hasOwnProperty(eid)) continue;
                var ev = events[key][eid];
                
                // Пропускаем дубликаты групп
                if (ev.groupId) {
                    var found = result.find(function(r) { return r.groupId === ev.groupId; });
                    if (found) continue;
                }
                
                result.push({
                    id: eid,
                    eventKey: key,
                    date: date,
                    time: time,
                    startTime: ev.startTime || time,
                    endTime: ev.endTime || time,
                    title: ev.title || '',
                    patient: ev.patient || '',
                    phone: ev.phone || '',
                    type: ev.type || '',
                    color: ev.color || '#607D8B',
                    comment: ev.comment || '',
                    user: ev.user || '',
                    groupId: ev.groupId || null,
                    spanCount: ev.spanCount || 1,
                    createdAt: ev.createdAt || ''
                });
            }
        }
        
        // Сортируем по дате и времени (новые сверху)
        result.sort(function(a, b) {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.startTime.localeCompare(a.startTime);
        });
        
        return result;
    }
    
    function showHistory() {
        allEventsCache = loadAllEvents();
        document.getElementById('historyModal').style.display = 'block';
        renderHistoryList(allEventsCache);
    }
    
    function renderHistoryList(list) {
        var html = '';
        
        if (list.length === 0) {
            html = '<div class="history-empty">📭 Нет сохранённых событий</div>';
        } else {
            list.forEach(function(ev) {
                var userName = ev.user === 'user1' ? 'Димидов Д.П.' : 'Казарьянц Э.А.';
                var typeLabel = getEventTypeLabel(ev.type);
                var timeRange = ev.startTime;
                if (ev.endTime && ev.endTime !== ev.startTime) {
                    timeRange += ' — ' + ev.endTime;
                }
                
                html += '<div class="history-item" onclick="window._goToEvent(\'' + ev.date + '\', \'' + ev.startTime + '\')">';
                html += '<div class="history-color" style="background:' + ev.color + ';"></div>';
                html += '<div class="history-info">';
                html += '<div class="history-title">' + esc(ev.title) + '</div>';
                if (ev.patient) html += '<div class="history-patient">👤 ' + esc(ev.patient) + '</div>';
                html += '<div class="history-details">' + typeLabel + ' | ' + userName + ' | ' + timeRange + '</div>';
                html += '</div>';
                html += '<div class="history-date">' + ev.date + '</div>';
                html += '</div>';
            });
        }
        
        document.getElementById('historyList').innerHTML = html;
    }
    
    window._filterHistory = function() {
        var search = (document.getElementById('historySearch').value || '').toLowerCase();
        var userFilter = document.getElementById('historyUserFilter').value;
        
        var filtered = allEventsCache.filter(function(ev) {
            var matchSearch = true;
            if (search) {
                matchSearch = (ev.title || '').toLowerCase().indexOf(search) >= 0 ||
                             (ev.patient || '').toLowerCase().indexOf(search) >= 0 ||
                             (ev.phone || '').toLowerCase().indexOf(search) >= 0;
            }
            var matchUser = userFilter === 'all' || ev.user === userFilter;
            return matchSearch && matchUser;
        });
        
        renderHistoryList(filtered);
    };
    
    window._goToEvent = function(date, time) {
        document.getElementById('historyModal').style.display = 'none';
        currentStartDate = new Date(date + 'T00:00:00');
        renderSchedule();
    };
    
    // Кнопка истории
    document.getElementById('historyBtn').addEventListener('click', showHistory);
    
    // Закрытие истории по клику вне окна
    document.getElementById('historyModal').addEventListener('click', function(e) {
        if (e.target === document.getElementById('historyModal')) {
            document.getElementById('historyModal').style.display = 'none';
        }
    });
    
    setStatus('online', 'Готово');
    renderSchedule();
}
