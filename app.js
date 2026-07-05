// ========== ФУНКЦИЯ ЗАПУСКА ПРИЛОЖЕНИЯ ==========
// Вызывается из auth.js после успешного входа

function initApp(user) {
    
    console.log('🚀 Запуск приложения для:', user.name);
    
    // Проверки
    if (typeof firebase === 'undefined') {
        document.getElementById('syncText').textContent = 'Ошибка: Firebase не загружен';
        return;
    }
    if (typeof db === 'undefined') {
        document.getElementById('syncText').textContent = 'Ошибка: база данных не подключена';
        return;
    }
    
    // Переменные
    var currentUserId = user.id;
    var viewAllUsers = false;
    var currentStartDate = new Date();
    var events = {};
    var editingEvent = null;
    var selectedCell = null;
    
    // DOM элементы
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
            
            // Генерируем временные слоты с 09:00 до 20:00 с шагом 30 минут
var timeSlots = [];
for (var h = 9; h <= 20; h++) {
    timeSlots.push(String(h).padStart(2, '0') + ':00');
    if (h < 20) {
        timeSlots.push(String(h).padStart(2, '0') + ':30');
    }
}

// Отрисовываем строки для каждого временного слота
for (var t = 0; t < timeSlots.length; t++) {
    var timeKey = timeSlots[t];
    html += '<div class="schedule-row">';
    html += '<div class="time-cell">' + timeKey + '</div>';
                for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
                    var dateKey = formatDate(weekDates[dayIdx]);
                    var timeKey = String(h).padStart(2, '0') + ':00';
                    var eventKey = dateKey + '_' + timeKey;
                    html += '<div class="schedule-cell' + (isToday(weekDates[dayIdx]) ? ' today-column' : '') + '" data-date="' + dateKey + '" data-time="' + timeKey + '" data-event-key="' + eventKey + '">';
                    
                    var cellData = events[eventKey] || {};
                    var cellEvents = [];
                    for (var key in cellData) {
                        if (cellData.hasOwnProperty(key)) {
                            var ev = cellData[key];
                            ev._id = key;
                            cellEvents.push(ev);
                        }
                    }
                    if (!viewAllUsers) {
                        cellEvents = cellEvents.filter(function(ev) { return ev.user === currentUserId; });
                    }
                    for (var e = 0; e < cellEvents.length; e++) {
                        var ev = cellEvents[e];
                        html += '<div class="event-chip" style="background:' + (ev.color || '#607D8B') + '" data-event-id="' + (ev._id || '') + '">';
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
            addClickHandlers();
        });
    }
    
    function addClickHandlers() {
        document.querySelectorAll('.schedule-cell').forEach(function(cell) {
            cell.addEventListener('click', function(e) {
                if (e.target.closest('.event-chip')) return;
                selectedCell = { date: this.dataset.date, time: this.dataset.time, eventKey: this.dataset.eventKey };
                openNewModal();
            });
        });
        document.querySelectorAll('.event-chip').forEach(function(chip) {
            chip.addEventListener('click', function(e) {
                e.stopPropagation();
                var cell = this.closest('.schedule-cell');
                var ek = cell.dataset.eventKey;
                var evId = this.dataset.eventId;
                if (events[ek] && events[ek][evId]) openEditModal(ek, evId, events[ek][evId]);
            });
        });
        document.querySelectorAll('.date-header-cell').forEach(function(hdr) {
            hdr.addEventListener('click', function() {
                currentStartDate = new Date(this.dataset.date + 'T00:00:00');
                renderSchedule();
            });
        });
    }
    
    function openNewModal() {
        editingEvent = { eventKey: selectedCell.eventKey, isNew: true };
        eventName.value = '';
        eventPatient.value = '';
        eventPhone.value = '';
        eventType.value = 'consultation';
        eventColor.value = userColors[currentUserId] || '#607D8B';
        eventComment.value = '';
        modalTitle.textContent = 'Новая запись - ' + selectedCell.date + ' ' + selectedCell.time;
        deleteEventBtn.style.display = 'none';
        eventModal.style.display = 'block';
        eventName.focus();
    }
    
    function openEditModal(ek, evId, evData) {
        editingEvent = { eventKey: ek, eventId: evId, event: evData, isNew: false };
        eventName.value = evData.title || '';
        eventPatient.value = evData.patient || '';
        eventPhone.value = evData.phone || '';
        eventType.value = evData.type || 'consultation';
        eventColor.value = evData.color || '#607D8B';
        eventComment.value = evData.comment || '';
        modalTitle.textContent = 'Редактировать запись';
        deleteEventBtn.style.display = 'inline-block';
        eventModal.style.display = 'block';
    }
    
    function closeModal() {
        eventModal.style.display = 'none';
        editingEvent = null;
        selectedCell = null;
    }
    
    function saveEvent() {
        var title = eventName.value.trim();
        if (!title) { alert('Введите название'); eventName.focus(); return; }
        var data = {
            title: title,
            patient: eventPatient.value.trim(),
            phone: eventPhone.value.trim(),
            type: eventType.value,
            color: eventColor.value,
            comment: eventComment.value.trim(),
            user: currentUserId,
            createdAt: new Date().toISOString()
        };
        setStatus('syncing', 'Сохранение...');
        var refPath = editingEvent.isNew ? 
            'events/' + editingEvent.eventKey + '/' + Date.now() :
            'events/' + editingEvent.eventKey + '/' + editingEvent.eventId;
        db.ref(refPath).set(data).then(function() {
            setStatus('online', 'Сохранено!');
            closeModal();
            renderSchedule();
        }).catch(function(e) { alert('Ошибка: ' + e.message); });
    }
    
    function deleteEvent() {
        if (!editingEvent || editingEvent.isNew) { closeModal(); return; }
        if (!confirm('Удалить запись?')) return;
        setStatus('syncing', 'Удаление...');
        db.ref('events/' + editingEvent.eventKey + '/' + editingEvent.eventId).remove().then(function() {
            setStatus('online', 'Удалено');
            closeModal();
            renderSchedule();
        });
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
    
    // ЗАПУСК
    setStatus('online', 'Готово');
    renderSchedule();
}
