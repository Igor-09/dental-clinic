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
    
    // Временные слоты
    var timeSlots = [];
    for (var h = 9; h <= 20; h++) {
        timeSlots.push(String(h).padStart(2, '0') + ':00');
        if (h < 20) {
            timeSlots.push(String(h).padStart(2, '0') + ':30');
        }
    }
    
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
            
            for (var t = 0; t < timeSlots.length; t++) {
                var timeKey = timeSlots[t];
                html += '<div class="schedule-row">';
                html += '<div class="time-cell">' + timeKey + '</div>';
                
                for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
                    var dateKey = formatDate(weekDates[dayIdx]);
                    var eventKey = dateKey + '_' + timeKey;
                    var todayCol = isToday(weekDates[dayIdx]) ? ' today-column' : '';
                    
                    html += '<div class="schedule-cell' + todayCol + '" data-date="' + dateKey + '" data-time="' + timeKey + '" data-event-key="' + eventKey + '">';
                    
                    var cellData = events[eventKey] || {};
                    var cellEvents = [];
                    var shownGroupIds = [];
                    
                    for (var key in cellData) {
                        if (cellData.hasOwnProperty(key)) {
                            var ev = cellData[key];
                            ev._id = key;
                            
                            if (ev.groupId && shownGroupIds.indexOf(ev.groupId) >= 0) {
                                continue;
                            }
                            if (ev.groupId) {
                                shownGroupIds.push(ev.groupId);
                            }
                            
                            cellEvents.push(ev);
                        }
                    }
                    
                    if (!viewAllUsers) {
                        cellEvents = cellEvents.filter(function(ev) { return ev.user === currentUserId; });
                    }
                    
                    for (var e = 0; e < cellEvents.length; e++) {
                        var ev = cellEvents[e];
                        var chipStyle = 'background:' + (ev.color || '#607D8B') + ';';
                        
                        if (ev.spanCount && ev.spanCount > 1) {
                            chipStyle += 'min-height:' + (ev.spanCount * 28) + 'px;';
                        }
                        
                        html += '<div class="event-chip" style="' + chipStyle + '" data-event-id="' + (ev._id || '') + '" data-group-id="' + (ev.groupId || '') + '">';
                        html += '<div class="event-chip-title">' + escapeHtml(ev.title) + '</div>';
                        if (ev.patient) html += '<div class="event-chip-patient">' + escapeHtml(ev.patient) + '</div>';
                        if (ev.type) html += '<div class="event-chip-time">' + getEventTypeLabel(ev.type) + '</div>';
                        if (ev.spanCount && ev.spanCount > 1) {
                            html += '<div class="event-chip-time">⏱ ' + ev.startTime + ' — ' + ev.endTime + '</div>';
                        }
                        html += '</div>';
                    }
                    
                    html += '</div>';
                }
                html += '</div>';
            }
            scheduleTable.innerHTML = html;
            addClickHandlers();
        });
    }
    
    function addClickHandlers() {
        document.querySelectorAll('.schedule-cell').forEach(function(cell) {
            cell.addEventListener('click', function(e) {
                if (e.target.closest('.event-chip')) return;
                
                var date = this.dataset.date;
                var time = this.dataset.time;
                var eventKey = this.dataset.eventKey;
                
                selectedCell = { date: date, time: time, eventKey: eventKey };
                openNewModal();
            });
        });
        
        document.querySelectorAll('.event-chip').forEach(function(chip) {
            chip.addEventListener('click', function(e) {
                e.stopPropagation();
                var cell = this.closest('.schedule-cell');
                var ek = cell.dataset.eventKey;
                var evId = this.dataset.eventId;
                
                if (events[ek] && events[ek][evId]) {
                    openEditModal(ek, evId, events[ek][evId]);
                }
            });
        });
        
        document.querySelectorAll('.date-header-cell').forEach(function(hdr) {
            hdr.addEventListener('click', function() {
                currentStartDate = new Date(this.dataset.date + 'T00:00:00');
                renderSchedule();
            });
        });
    }
    
    // Добавляем поля выбора времени в модальное окно
    function addTimeSelects() {
        // Проверяем, есть ли уже поля
        if (document.getElementById('eventStartTime')) return;
        
        var formGroups = document.querySelectorAll('.modal-content .form-group');
        var phoneGroup = null;
        
        formGroups.forEach(function(group) {
            if (group.querySelector('#eventPhone')) {
                phoneGroup = group;
            }
        });
        
        if (phoneGroup) {
            // Создаём контейнер для выбора времени
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
            
            // Заполняем списки времени
            var startSelect = document.getElementById('eventStartTime');
            var endSelect = document.getElementById('eventEndTime');
            
            timeSlots.forEach(function(t) {
                startSelect.innerHTML += '<option value="' + t + '">' + t + '</option>';
                endSelect.innerHTML += '<option value="' + t + '">' + t + '</option>';
            });
        }
    }
    
    function openNewModal() {
        addTimeSelects();
        
        editingEvent = { 
            eventKey: selectedCell.eventKey, 
            isNew: true,
            date: selectedCell.date
        };
        
        eventName.value = '';
        eventPatient.value = '';
        eventPhone.value = '';
        eventType.value = 'consultation';
        eventColor.value = userColors[currentUserId] || '#607D8B';
        eventComment.value = '';
        
        // Устанавливаем время
        var startSelect = document.getElementById('eventStartTime');
        var endSelect = document.getElementById('eventEndTime');
        
        if (startSelect) startSelect.value = selectedCell.time;
        if (endSelect) {
            // По умолчанию конец = начало + 30 минут
            var currentIndex = timeSlots.indexOf(selectedCell.time);
            var nextIndex = Math.min(currentIndex + 1, timeSlots.length - 1);
            endSelect.value = timeSlots[nextIndex];
        }
        
        modalTitle.textContent = 'Новая запись - ' + selectedCell.date;
        deleteEventBtn.style.display = 'none';
        eventModal.style.display = 'block';
        eventName.focus();
    }
    
    function openEditModal(ek, evId, evData) {
        addTimeSelects();
        
        editingEvent = { eventKey: ek, eventId: evId, event: evData, isNew: false };
        eventName.value = evData.title || '';
        eventPatient.value = evData.patient || '';
        eventPhone.value = evData.phone || '';
        eventType.value = evData.type || 'consultation';
        eventColor.value = evData.color || '#607D8B';
        eventComment.value = evData.comment || '';
        
        // Устанавливаем время для редактирования
        var startSelect = document.getElementById('eventStartTime');
        var endSelect = document.getElementById('eventEndTime');
        
        if (startSelect && evData.startTime) startSelect.value = evData.startTime;
        if (endSelect && evData.endTime) endSelect.value = evData.endTime;
        
        modalTitle.textContent = 'Редактировать запись';
        deleteEventBtn.style.display = 'inline-block';
        eventModal.style.display = 'block';
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
        
        var startTime = document.getElementById('eventStartTime') ? document.getElementById('eventStartTime').value : selectedCell.time;
        var endTime = document.getElementById('eventEndTime') ? document.getElementById('eventEndTime').value : startTime;
        var date = editingEvent.date || selectedCell.date;
        
        var cells = getCellsInRange(date, startTime, endTime);
        
        setStatus('syncing', 'Сохранение...');
        
        var groupId = Date.now().toString();
        var promises = [];
        
        if (editingEvent.isNew) {
            // Сохраняем во все ячейки диапазона
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
            // Обновление существующего
            var data = {
                title: title,
                patient: eventPatient.value.trim(),
                phone: eventPhone.value.trim(),
                type: eventType.value,
                color: eventColor.value,
                comment: eventComment.value.trim(),
                user: editingEvent.event.user,
                groupId: editingEvent.event.groupId || null,
                spanCount: editingEvent.event.spanCount || 1,
                startTime: startTime,
                endTime: endTime,
                createdAt: editingEvent.event.createdAt || new Date().toISOString()
            };
            
            promises.push(db.ref('events/' + editingEvent.eventKey + '/' + editingEvent.eventId).set(data));
        }
        
        Promise.all(promises).then(function() {
            setStatus('online', 'Сохранено!');
            closeModal();
            renderSchedule();
        }).catch(function(e) { 
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
    
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.getElementById('cancelEventBtn').addEventListener('click', closeModal);
    document.getElementById('saveEventBtn').addEventListener('click', saveEvent);
    document.getElementById('deleteEventBtn').addEventListener('click', deleteEvent);
    eventModal.addEventListener('click', function(e) { if (e.target === eventModal) closeModal(); });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && eventModal.style.display === 'block') closeModal();
    });
    
    // ЗАПУСК
    setStatus('online', 'Готово');
    renderSchedule();
}
