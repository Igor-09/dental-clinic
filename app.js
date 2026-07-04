document.addEventListener('DOMContentLoaded', function() {
    
    // ========== СОСТОЯНИЕ ==========
    var currentUser = 'user1';
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
    var modalTitle = document.getElementById('modalTitle');
    var eventName = document.getElementById('eventName');
    var eventPatient = document.getElementById('eventPatient');
    var eventPhone = document.getElementById('eventPhone');
    var eventType = document.getElementById('eventType');
    var eventColor = document.getElementById('eventColor');
    var eventComment = document.getElementById('eventComment');
    var saveEventBtn = document.getElementById('saveEventBtn');
    var deleteEventBtn = document.getElementById('deleteEventBtn');
    var cancelEventBtn = document.getElementById('cancelEventBtn');
    var syncDot = document.getElementById('syncDot');
    var syncText = document.getElementById('syncText');
    
    var userColors = {
        'user1': '#607D8B',
        'user2': '#FF9800'
    };
    
    // ========== FIREBASE ФУНКЦИИ ==========
    
    function updateSyncStatus(status, text) {
        syncDot.className = 'sync-dot ' + status;
        syncText.textContent = text;
    }
    
    async function loadEventsFromDB() {
        try {
            updateSyncStatus('syncing', 'Загрузка...');
            
            const snapshot = await db.collection('events').orderBy('createdAt').get();
            var eventsObj = {};
            
            snapshot.forEach(function(doc) {
                var data = doc.data();
                if (!eventsObj[data.event_key]) {
                    eventsObj[data.event_key] = [];
                }
                eventsObj[data.event_key].push({
                    id: doc.id,
                    title: data.title,
                    patient: data.patient,
                    phone: data.phone,
                    type: data.type,
                    color: data.color,
                    comment: data.comment,
                    user: data.user,
                    createdAt: data.createdAt
                });
            });
            
            updateSyncStatus('online', 'Готово');
            return eventsObj;
            
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            updateSyncStatus('offline', 'Ошибка. Локальные данные');
            return loadLocalEvents();
        }
    }
    
    async function saveEventToDB(eventKey, eventData) {
        try {
            updateSyncStatus('syncing', 'Сохранение...');
            
            await db.collection('events').add({
                event_key: eventKey,
                title: eventData.title,
                patient: eventData.patient,
                phone: eventData.phone,
                type: eventData.type,
                color: eventData.color,
                comment: eventData.comment,
                user: eventData.user,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            updateSyncStatus('online', 'Сохранено');
            return true;
            
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            updateSyncStatus('offline', 'Ошибка сохранения');
            return false;
        }
    }
    
    async function deleteEventFromDB(eventId) {
        try {
            updateSyncStatus('syncing', 'Удаление...');
            await db.collection('events').doc(eventId).delete();
            updateSyncStatus('online', 'Удалено');
            return true;
        } catch (error) {
            console.error('Ошибка удаления:', error);
            return false;
        }
    }
    
    function saveLocalEvents() {
        localStorage.setItem('dentalClinicEvents', JSON.stringify(events));
    }
    
    function loadLocalEvents() {
        var saved = localStorage.getItem('dentalClinicEvents');
        return saved ? JSON.parse(saved) : {};
    }
    
    // ========== ОСНОВНЫЕ ФУНКЦИИ ==========
    
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
    
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
    
    async function renderSchedule() {
        events = await loadEventsFromDB();
        saveLocalEvents();
        
        var weekDates = getWeekDates(currentStartDate);
        
        dateRangeDisplay.textContent = 
            weekDates[0].getDate() + ' ' + getMonthName(weekDates[0]) + 
            ' - ' + weekDates[6].getDate() + ' ' + getMonthName(weekDates[6]) + ' ' + weekDates[6].getFullYear();
        datePicker.value = formatDate(currentStartDate);
        
        var html = '';
        
        // Заголовки дат
        html += '<div class="date-headers">';
        html += '<div class="time-header-cell">Время</div>';
        
        for (var i = 0; i < 7; i++) {
            var date = weekDates[i];
            var todayClass = isToday(date) ? ' today' : '';
            html += '<div class="date-header-cell' + todayClass + '" data-date="' + formatDate(date) + '">';
            html += '<div class="date-day-name">' + getDayName(date) + '</div>';
            html += '<div class="date-day-number">' + date.getDate() + '</div>';
            html += '<div class="date-month">' + getMonthName(date) + '</div>';
            html += '</div>';
        }
        html += '</div>';
        
        // Временные слоты
        for (var hour = 8; hour <= 21; hour++) {
            html += '<div class="schedule-row">';
            html += '<div class="time-cell">' + String(hour).padStart(2, '0') + ':00</div>';
            
            for (var d = 0; d < 7; d++) {
                var dateKey = formatDate(weekDates[d]);
                var timeKey = String(hour).padStart(2, '0') + ':00';
                var eventKey = dateKey + '_' + timeKey;
                var todayColClass = isToday(weekDates[d]) ? ' today-column' : '';
                
                html += '<div class="schedule-cell' + todayColClass + '" data-date="' + dateKey + '" data-time="' + timeKey + '" data-event-key="' + eventKey + '">';
                
                var cellEvents = events[eventKey] || [];
                
                if (!viewAllUsers && currentUser !== 'all') {
                    cellEvents = cellEvents.filter(function(ev) {
                        return ev.user === currentUser;
                    });
                }
                
                for (var e = 0; e < cellEvents.length; e++) {
                    var ev = cellEvents[e];
                    html += '<div class="event-chip" style="background:' + ev.color + '" data-event-index="' + e + '">';
                    html += '<div class="event-chip-title">' + escapeHtml(ev.title) + '</div>';
                    if (ev.patient) html += '<div class="event-chip-patient">' + escapeHtml(ev.patient) + '</div>';
                    if (ev.type) html += '<div class="event-chip-time">' + getEventTypeLabel(ev.type) + '</div>';
                    html += '</div>';
                }
                
                html += '</div>';
            }
            html += '</div>';
        }
        
        scheduleTable.innerHTML = html;
        
        addCellClickHandlers();
        addEventClickHandlers();
        addDateHeaderClickHandlers();
    }
    
    function addCellClickHandlers() {
        document.querySelectorAll('.schedule-cell').forEach(function(cell) {
            cell.addEventListener('click', function(e) {
                if (e.target.closest('.event-chip')) return;
                selectedCell = {
                    date: this.dataset.date,
                    time: this.dataset.time,
                    eventKey: this.dataset.eventKey
                };
                openNewEventModal();
            });
        });
    }
    
    function addEventClickHandlers() {
        document.querySelectorAll('.event-chip').forEach(function(chip) {
            chip.addEventListener('click', function(e) {
                e.stopPropagation();
                var cell = this.closest('.schedule-cell');
                var eventKey = cell.dataset.eventKey;
                var eventIndex = parseInt(this.dataset.eventIndex);
                var cellEvents = events[eventKey] || [];
                
                if (!viewAllUsers && currentUser !== 'all') {
                    var filtered = cellEvents.filter(function(ev) { return ev.user === currentUser; });
                    openEditModal(eventKey, filtered[eventIndex], cellEvents.indexOf(filtered[eventIndex]));
                } else {
                    openEditModal(eventKey, cellEvents[eventIndex], eventIndex);
                }
            });
        });
    }
    
    function addDateHeaderClickHandlers() {
        document.querySelectorAll('.date-header-cell').forEach(function(header) {
            header.addEventListener('click', function() {
                currentStartDate = new Date(this.dataset.date + 'T00:00:00');
                renderSchedule();
            });
        });
    }
    
    function openNewEventModal() {
        editingEvent = { eventKey: selectedCell.eventKey, isNew: true };
        eventName.value = '';
        eventPatient.value = '';
        eventPhone.value = '';
        eventType.value = 'consultation';
        eventColor.value = viewAllUsers ? '#607D8B' : userColors[currentUser];
        eventComment.value = '';
        modalTitle.textContent = 'Новая запись - ' + selectedCell.date + ' ' + selectedCell.time;
        deleteEventBtn.style.display = 'none';
        eventModal.style.display = 'block';
        eventName.focus();
    }
    
    function openEditModal(eventKey, event, eventIndex) {
        editingEvent = { eventKey: eventKey, event: event, eventIndex: eventIndex, isNew: false };
        eventName.value = event.title || '';
        eventPatient.value = event.patient || '';
        eventPhone.value = event.phone || '';
        eventType.value = event.type || 'consultation';
        eventColor.value = event.color || '#607D8B';
        eventComment.value = event.comment || '';
        modalTitle.textContent = 'Редактировать запись';
        deleteEventBtn.style.display = 'inline-block';
        eventModal.style.display = 'block';
    }
    
    function closeModal() {
        eventModal.style.display = 'none';
        editingEvent = null;
        selectedCell = null;
    }
    
    async function saveEvent() {
        var title = eventName.value.trim();
        if (!title) { alert('Введите название'); eventName.focus(); return; }
        
        var eventData = {
            title: title,
            patient: eventPatient.value.trim(),
            phone: eventPhone.value.trim(),
            type: eventType.value,
            color: eventColor.value,
            comment: eventComment.value.trim(),
            user: editingEvent.isNew ? currentUser : editingEvent.event.user
        };
        
        if (editingEvent.isNew) {
            await saveEventToDB(editingEvent.eventKey, eventData);
        } else {
            await deleteEventFromDB(editingEvent.event.id);
            await saveEventToDB(editingEvent.eventKey, eventData);
        }
        
        closeModal();
        await renderSchedule();
    }
    
    async function deleteEvent() {
        if (editingEvent.isNew) { closeModal(); return; }
        if (confirm('Удалить запись "' + editingEvent.event.title + '"?')) {
            await deleteEventFromDB(editingEvent.event.id);
            closeModal();
            await renderSchedule();
        }
    }
    
    // ========== ОБРАБОТЧИКИ КНОПОК ==========
    
    document.getElementById('prevDay').addEventListener('click', function() {
        currentStartDate.setDate(currentStartDate.getDate() - 1);
        renderSchedule();
    });
    
    document.getElementById('nextDay').addEventListener('click', function() {
        currentStartDate.setDate(currentStartDate.getDate() + 1);
        renderSchedule();
    });
    
    document.getElementById('prevWeek').addEventListener('click', function() {
        currentStartDate.setDate(currentStartDate.getDate() - 7);
        renderSchedule();
    });
    
    document.getElementById('nextWeek').addEventListener('click', function() {
        currentStartDate.setDate(currentStartDate.getDate() + 7);
        renderSchedule();
    });
    
    document.getElementById('todayBtn').addEventListener('click', function() {
        currentStartDate = new Date();
        renderSchedule();
    });
    
    document.getElementById('syncBtn').addEventListener('click', function() {
        renderSchedule();
    });
    
    datePicker.addEventListener('change', function() {
        if (this.value) {
            currentStartDate = new Date(this.value + 'T00:00:00');
            renderSchedule();
        }
    });
    
    userSelect.addEventListener('change', function() {
        currentUser = this.value;
        viewAllUsers = false;
        document.getElementById('viewAllBtn').textContent = '👁 Все специалисты';
        renderSchedule();
    });
    
    document.getElementById('viewAllBtn').addEventListener('click', function() {
        viewAllUsers = !viewAllUsers;
        this.textContent = viewAllUsers ? '👤 Один специалист' : '👁 Все специалисты';
        currentUser = viewAllUsers ? 'all' : userSelect.value;
        renderSchedule();
    });
    
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    cancelEventBtn.addEventListener('click', closeModal);
    saveEventBtn.addEventListener('click', saveEvent);
    deleteEventBtn.addEventListener('click', deleteEvent);
    
    eventModal.addEventListener('click', function(e) {
        if (e.target === eventModal) closeModal();
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && eventModal.style.display === 'block') closeModal();
        if (e.key === 'Enter' && eventModal.style.display === 'block' && document.activeElement !== eventComment) saveEvent();
    });
    
    // Автосинхронизация каждые 30 секунд
    setInterval(function() { renderSchedule(); }, 30000);
    
    // Запуск
    console.log('🦷 Имплант Клиник - График работы запущен!');
    renderSchedule();
});