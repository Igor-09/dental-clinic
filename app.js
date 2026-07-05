// ========== ФУНКЦИЯ ЗАПУСКА ПРИЛОЖЕНИЯ ==========
function initApp(user) {
    
    console.log('🚀 Запуск приложения для:', user.name);
    
    if (typeof firebase === 'undefined') {
        document.getElementById('syncText').textContent = 'Ошибка: Firebase не загружен';
        return;
    }
    if (typeof db === 'undefined') {
        document.getElementById('syncText').textContent = 'Ошибка: база данных не подключена';
        return;
    }
    
    var currentUserId = user.id;
    var viewAllUsers = false;
    var currentStartDate = new Date();
    var events = {};
    var editingEvent = null;
    var selectedCell = null;
    
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
    var headerSubtitle = document.getElementById('headerSubtitle');
    
    var userColors = {
        'user1': '#607D8B',
        'user2': '#FF9800'
    };
    
    var userNames = {
        'user1': { name: 'Димидов Д.П.', spec: 'Хирург-имплантолог' },
        'user2': { name: 'Казарьянц Э.А.', spec: 'Ортопед' }
    };
    
    var timeSlots = [];
    for (var h = 9; h <= 20; h++) {
        timeSlots.push(String(h).padStart(2, '0') + ':00');
        if (h < 20) {
            timeSlots.push(String(h).padStart(2, '0') + ':30');
        }
    }
    
    var CELL_HEIGHT = 50;
    
    userSelect.value = currentUserId;
    
    function setStatus(status, text) {
        if (syncDot) syncDot.className = 'sync-dot ' + status;
        if (syncText) syncText.textContent = text;
    }
    
    db.ref('.info/connected').on('value', function(snap) {
        setStatus(snap.val() === true ? 'online' : 'offline', snap.val() === true ? 'Подключено' : 'Нет подключения');
    });
    
    function loadEvents(callback) {
        setStatus('syncing', 'Загрузка...');
        db.ref('events').once('value').then(function(snapshot) {
            callback(snapshot.val() || {});
            setStatus('online', 'Готово');
        }).catch(function() {
            callback({});
        });
    }
    
    function formatDate(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }
    
    function getWeekDates(startDate) {
        var dates = [];
        var current = new Date(startDate);
        var dayOfWeek = current.getDay();
        var diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        var monday = new Date(current.setDate(diff));
        for (var i = 0; i < 7; i++) {
            var date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(date);
        }
        return dates;
    }
    
    function isToday(date) {
        var today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }
    
    function getDayName(date) {
        return ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][date.getDay()];
    }
    
    function getMonthName(date) {
        return ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][date.getMonth()];
    }
    
    function getEventTypeLabel(type) {
        var labels = {
            'consultation': 'Консультация',
            'implantation': 'Имплантация',
            'removal': 'Удаление',
            'examination': 'Осмотр',
            'delivery': 'Сдача',
            'scanning': 'Сканирование',
            'fitting': 'Примерка',
            'other': 'Прочее'
        };
        return labels[type] || type;
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Удаляем старые обработчики перед добавлением новых
    function removeEventListeners() {
        var oldSave = document.getElementById('saveEventBtn');
        var oldDelete = document.getElementById('deleteEventBtn');
        var oldCancel = document.getElementById('cancelEventBtn');
        var oldClose = document.querySelector('.close-btn');
        
        if (oldSave) {
            var newSave = oldSave.cloneNode(true);
            oldSave.parentNode.replaceChild(newSave, oldSave);
        }
        if (oldDelete) {
            var newDelete = oldDelete.cloneNode(true);
            oldDelete.parentNode.replaceChild(newDelete, oldDelete);
        }
        if (oldCancel) {
            var newCancel = oldCancel.cloneNode(true);
            oldCancel.parentNode.replaceChild(newCancel, oldCancel);
        }
        if (oldClose) {
            var newClose = oldClose.cloneNode(true);
            oldClose.parentNode.replaceChild(newClose, oldClose);
        }
    }
    
    function renderSchedule() {
        loadEvents(function(loadedEvents) {
            events = loadedEvents;
            var weekDates = getWeekDates(currentStartDate);
            dateRangeDisplay.textContent = 
                weekDates[0].getDate() + ' ' + getMonthName(weekDates[0]) + 
                ' - ' + weekDates[6].getDate() + ' ' + getMonthName(weekDates[6]);
            datePicker.value = formatDate(currentStartDate);
            
            var html = '';
            
            html += '<div class="date-headers">';
            html += '<div class="time-header-cell">Время</div>';
            for (var i = 0; i < 7; i++) {
                var d = weekDates[i];
                html += '<div class="date-header-cell' + (isToday(d) ? ' today' : '') + '" data-date="' + formatDate(d) + '">';
                html += '<div class="date-day-name">' + getDayName(d) + '</div>';
                html += '<div class="date-day-number">' + d.getDate() + '</div>';
                html += '<div class="date-month">' + getMonthName(d) + '</div>';
                html += '</div>';
            }
            html += '</div>';
            
            var mergedEvents = {};
            for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
                var dateKey = formatDate(weekDates[dayIdx]);
                mergedEvents[dateKey] = [];
                var shownGroups = {};
                
                for (var t = 0; t < timeSlots.length; t++) {
                    var timeKey = timeSlots[t];
                    var eventKey = dateKey + '_' + timeKey;
                    var cellData = events[eventKey] || {};
                    
                    for (var key in cellData) {
                        if (cellData.hasOwnProperty(key)) {
                            var ev = cellData[key];
                            ev._id = key;
                            ev._eventKey = eventKey;
                            
                            if (ev.groupId) {
                                if (shownGroups[ev.groupId]) continue;
                                shownGroups[ev.groupId] = true;
                                
                                var startIdx = timeSlots.indexOf(ev.startTime);
                                var endIdx = timeSlots.indexOf(ev.endTime);
                                if (startIdx >= 0 && endIdx >= startIdx) {
                                    mergedEvents[dateKey].push({
                                        event: ev,
                                        top: startIdx * CELL_HEIGHT,
                                        height: (endIdx - startIdx + 1) * CELL_HEIGHT
                                    });
                                }
                            }
                        }
                    }
                }
            }
            
            for (var t = 0; t < timeSlots.length; t++) {
                var timeKey = timeSlots[t];
                html += '<div class="schedule-row">';
                html += '<div class="time-cell">' + timeKey + '</div>';
                
                for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
                    var dateKey = formatDate(weekDates[dayIdx]);
                    var eventKey = dateKey + '_' + timeKey;
                    var todayCol = isToday(weekDates[dayIdx]) ? ' today-column' : '';
                    
                    html += '<div class="schedule-cell' + todayCol + '" data-date="' + dateKey + '" data-time="' + timeKey + '" data-event-key="' + eventKey + '">';
                    html += '</div>';
                }
                html += '</div>';
            }
            
            scheduleTable.innerHTML = html;
            
            for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
                var dateKey = formatDate(weekDates[dayIdx]);
                var colMerged = mergedEvents[dateKey] || [];
                
                var columnCells = document.querySelectorAll('.schedule-cell[data-date="' + dateKey + '"]');
                
                if (columnCells.length > 0) {
                    var firstCell = columnCells[0];
                    
                    colMerged.forEach(function(merged) {
                        if (!viewAllUsers && merged.event.user !== currentUserId) return;
                        
                        var overlay = document.createElement('div');
                        overlay.className = 'merged-event-overlay';
                        overlay.style.cssText = 
                            'background:' + (merged.event.color || '#607D8B') + ';' +
                            'top:' + merged.top + 'px;' +
                            'height:' + merged.height + 'px;';
                        
                        overlay.innerHTML = 
                            '<div style="font-weight:700;margin-bottom:2px;">' + escapeHtml(merged.event.title) + '</div>' +
                            (merged.event.patient ? '<div style="font-size:10px;opacity:0.9;">' + escapeHtml(merged.event.patient) + '</div>' : '') +
                            (merged.event.type ? '<div style="font-size:10px;opacity:0.8;">' + getEventTypeLabel(merged.event.type) + '</div>' : '') +
                            '<div style="font-size:10px;opacity:0.8;">⏱ ' + merged.event.startTime + ' — ' + merged.event.endTime + '</div>';
                        
                        overlay.addEventListener('click', function(e) {
                            e.stopPropagation();
                            // Используем сохранённый eventKey
                            var ek = merged.event._eventKey;
                            openEditModal(ek, merged.event._id, merged.event);
                        });
                        
                        firstCell.style.position = 'relative';
                        firstCell.appendChild(overlay);
                    });
                }
            }
            
            addClickHandlers();
        });
    }
    
    function addClickHandlers() {
        document.querySelectorAll('.schedule-cell').forEach(function(cell) {
            cell.addEventListener('click', function(e) {
                if (e.target.closest('.merged-event-overlay')) return;
                
                var date = this.dataset.date;
                var time = this.dataset.time;
                var eventKey = this.dataset.eventKey;
                
                selectedCell = { date: date, time: time, eventKey: eventKey };
                openNewModal();
            });
        });
        
        document.querySelectorAll('.date-header-cell').forEach(function(hdr) {
            hdr.addEventListener('click', function() {
                currentStartDate = new Date(this.dataset.date + 'T00:00:00');
                renderSchedule();
            });
        });
    }
    
    function addTimeSelects() {
        // Удаляем старые поля, если есть
        var oldContainer = document.querySelector('.time-range-select');
        if (oldContainer) {
            oldContainer.parentElement.remove();
        }
        
        var formGroups = document.querySelectorAll('.modal-content .form-group');
        var phoneGroup = null;
        
        formGroups.forEach(function(group) {
            if (group.querySelector('#eventPhone')) {
                phoneGroup = group;
            }
        });
        
        if (phoneGroup) {
            var timeContainer = document.createElement('div');
            timeContainer.className = 'form-group';
            timeContainer.innerHTML = `
                <label>Время начала и конца:</label>
                <div class="time-range-select">
                    <select id="eventStartTime" class="time-select"></select>
                    <span class="time-separator">—</span>
                    <select id="eventEndTime" class="time-select"></select>
                </div>
            `;
            
            phoneGroup.parentNode.insertBefore(timeContainer, phoneGroup.nextSibling);
            
            var startSelect = document.getElementById('eventStartTime');
            var endSelect = document.getElementById('eventEndTime');
            
            timeSlots.forEach(function(t) {
                var opt1 = document.createElement('option');
                opt1.value = t;
                opt1.textContent = t;
                startSelect.appendChild(opt1);
                
                var opt2 = document.createElement('option');
                opt2.value = t;
                opt2.textContent = t;
                endSelect.appendChild(opt2);
            });
        }
    }
    
    function openNewModal() {
        removeEventListeners();
        addTimeSelects();
        
        editingEvent = { 
            isNew: true,
            date: selectedCell.date
        };
        
        eventName.value = '';
        eventPatient.value = '';
        eventPhone.value = '';
        eventType.value = 'consultation';
        eventColor.value = userColors[currentUserId] || '#607D8B';
        eventComment.value = '';
        
        var startSelect = document.getElementById('eventStartTime');
        var endSelect = document.getElementById('eventEndTime');
        
        if (startSelect) startSelect.value = selectedCell.time;
        if (endSelect) {
            var currentIndex = timeSlots.indexOf(selectedCell.time);
            var nextIndex = Math.min(currentIndex + 1, timeSlots.length - 1);
            endSelect.value = timeSlots[nextIndex];
        }
        
        modalTitle.textContent = 'Новая запись - ' + selectedCell.date;
        deleteEventBtn.style.display = 'none';
        eventModal.style.display = 'block';
        
        // Добавляем обработчики
        document.getElementById('saveEventBtn').addEventListener('click', saveEvent);
        document.getElementById('cancelEventBtn').addEventListener('click', closeModal);
        document.querySelector('.close-btn').addEventListener('click', closeModal);
        
        eventName.focus();
    }
    
    function openEditModal(ek, evId, evData) {
        removeEventListeners();
        addTimeSelects();
        
        editingEvent = { 
            eventKey: ek, 
            eventId: evId, 
            event: evData, 
            isNew: false 
        };
        
        eventName.value = evData.title || '';
        eventPatient.value = evData.patient || '';
        eventPhone.value = evData.phone || '';
        eventType.value = evData.type || 'consultation';
        eventColor.value = evData.color || '#607D8B';
        eventComment.value = evData.comment || '';
        
        var startSelect = document.getElementById('eventStartTime');
        var endSelect = document.getElementById('eventEndTime');
        
        if (startSelect && evData.startTime) startSelect.value = evData.startTime;
        if (endSelect && evData.endTime) endSelect.value = evData.endTime;
        
        modalTitle.textContent = 'Редактировать запись';
        deleteEventBtn.style.display = 'inline-block';
        eventModal.style.display = 'block';
        
        // Добавляем обработчики
        document.getElementById('saveEventBtn').addEventListener('click', saveEvent);
        document.getElementById('deleteEventBtn').addEventListener('click', deleteEvent);
        document.getElementById('cancelEventBtn').addEventListener('click', closeModal);
        document.querySelector('.close-btn').addEventListener('click', closeModal);
    }
    
    function closeModal() {
        eventModal.style.display = 'none';
        editingEvent = null;
        selectedCell = null;
    }
    
    function getCellsInRange(date, startTime, endTime) {
        var startIndex = timeSlots.indexOf(startTime);
        var endIndex = timeSlots.indexOf(endTime);
        
        if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
            return [{ date: date, time: startTime }];
        }
        
        var cells = [];
        for (var i = startIndex; i <= endIndex; i++) {
            cells.push({ date: date, time: timeSlots[i] });
        }
        return cells;
    }
    
    function saveEvent() {
        var title = eventName.value.trim();
        if (!title) { alert('Введите название'); eventName.focus(); return; }
        
        console.log('💾 Сохранение...', editingEvent);
        
        var startSelect = document.getElementById('eventStartTime');
        var endSelect = document.getElementById('eventEndTime');
        
        var startTime = startSelect ? startSelect.value : selectedCell.time;
        var endTime = endSelect ? endSelect.value : startTime;
        var date = editingEvent.date || (editingEvent.event ? editingEvent.event.startTime ? editingEvent.eventKey.split('_')[0] : selectedCell.date : selectedCell.date);
        
        // Если редактируем — получаем дату из eventKey
        if (!editingEvent.isNew && editingEvent.eventKey) {
            date = editingEvent.eventKey.split('_')[0];
        }
        
        var cells = getCellsInRange(date, startTime, endTime);
        
        setStatus('syncing', 'Сохранение...');
        
        var groupId = editingEvent.isNew ? Date.now().toString() : (editingEvent.event.groupId || Date.now().toString());
        var promises = [];
        
        if (editingEvent.isNew) {
            // Новое событие
            cells.forEach(function(cell, index) {
                var eventKey = cell.date + '_' + cell.time;
                var eventId = groupId + '_' + index;
                
                var data = {
                    title: title,
                    patient: eventPatient.value.trim(),
                    phone: eventPhone.value.trim(),
                    type: eventType.value,
                    color: eventColor.value,
                    comment: eventComment.value.trim(),
                    user: currentUserId,
                    groupId: groupId,
                    spanCount: cells.length,
                    startTime: startTime,
                    endTime: endTime,
                    createdAt: new Date().toISOString()
                };
                
                promises.push(db.ref('events/' + eventKey + '/' + eventId).set(data));
            });
        } else {
            // Редактирование — удаляем старые и создаём новые
            var oldGroupId = editingEvent.event.groupId;
            
            if (oldGroupId) {
                // Удаляем все старые ячейки группы
                for (var key in events) {
                    if (events.hasOwnProperty(key)) {
                        for (var evId in events[key]) {
                            if (events[key].hasOwnProperty(evId) && events[key][evId].groupId === oldGroupId) {
                                promises.push(db.ref('events/' + key + '/' + evId).remove());
                            }
                        }
                    }
                }
            } else {
                // Удаляем одиночное событие
                promises.push(db.ref('events/' + editingEvent.eventKey + '/' + editingEvent.eventId).remove());
            }
            
            // Создаём новые ячейки
            cells.forEach(function(cell, index) {
                var eventKey = cell.date + '_' + cell.time;
                var eventId = groupId + '_' + index;
                
                var data = {
                    title: title,
                    patient: eventPatient.value.trim(),
                    phone: eventPhone.value.trim(),
                    type: eventType.value,
                    color: eventColor.value,
                    comment: eventComment.value.trim(),
                    user: editingEvent.event.user,
                    groupId: groupId,
                    spanCount: cells.length,
                    startTime: startTime,
                    endTime: endTime,
                    createdAt: editingEvent.event.createdAt || new Date().toISOString()
                };
                
                promises.push(db.ref('events/' + eventKey + '/' + eventId).set(data));
            });
        }
        
        Promise.all(promises).then(function() {
            console.log('✅ Сохранено!');
            setStatus('online', 'Сохранено!');
            closeModal();
            renderSchedule();
        }).catch(function(e) { 
            console.error('Ошибка:', e);
            alert('Ошибка: ' + e.message); 
        });
    }
    
    function deleteEvent() {
        if (!editingEvent || editingEvent.isNew) { closeModal(); return; }
        if (!confirm('Удалить запись?')) return;
        
        setStatus('syncing', 'Удаление...');
        
        var groupId = editingEvent.event.groupId;
        
        if (groupId) {
            var promises = [];
            for (var key in events) {
                if (events.hasOwnProperty(key)) {
                    for (var evId in events[key]) {
                        if (events[key].hasOwnProperty(evId) && events[key][evId].groupId === groupId) {
                            promises.push(db.ref('events/' + key + '/' + evId).remove());
                        }
                    }
                }
            }
            Promise.all(promises).then(function() {
                setStatus('online', 'Удалено');
                closeModal();
                renderSchedule();
            });
        } else {
            db.ref('events/' + editingEvent.eventKey + '/' + editingEvent.eventId).remove().then(function() {
                setStatus('online', 'Удалено');
                closeModal();
                renderSchedule();
            });
        }
    }
    
    // Навигация
    document.getElementById('prevDay').addEventListener('click', function() { currentStartDate.setDate(currentStartDate.getDate() - 1); renderSchedule(); });
    document.getElementById('nextDay').addEventListener('click', function() { currentStartDate.setDate(currentStartDate.getDate() + 1); renderSchedule(); });
    document.getElementById('prevWeek').addEventListener('click', function() { currentStartDate.setDate(currentStartDate.getDate() - 7); renderSchedule(); });
    document.getElementById('nextWeek').addEventListener('click', function() { currentStartDate.setDate(currentStartDate.getDate() + 7); renderSchedule(); });
    document.getElementById('todayBtn').addEventListener('click', function() { currentStartDate = new Date(); renderSchedule(); });
    document.getElementById('syncBtn').addEventListener('click', function() { renderSchedule(); });
    
    datePicker.addEventListener('change', function() {
        if (this.value) { currentStartDate = new Date(this.value + 'T00:00:00'); renderSchedule(); }
    });
    
    userSelect.addEventListener('change', function() {
        currentUserId = this.value;
        var u = userNames[currentUserId];
        currentUserName.textContent = '👤 ' + u.name + ' (' + u.spec + ')';
        headerSubtitle.textContent = 'График работы - ' + u.spec;
        renderSchedule();
    });
    
    document.getElementById('viewAllBtn').addEventListener('click', function() {
        viewAllUsers = !viewAllUsers;
        this.textContent = viewAllUsers ? '👤 Только я' : '👁 Все специалисты';
        renderSchedule();
    });
    
    eventModal.addEventListener('click', function(e) { if (e.target === eventModal) closeModal(); });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && eventModal.style.display === 'block') closeModal();
    });
    
    // ЗАПУСК
    setStatus('online', 'Готово');
    renderSchedule();
}
