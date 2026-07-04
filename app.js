// Ждём загрузку страницы
document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🚀 Старт приложения...');
    
    // Проверяем Firebase
    if (typeof firebase === 'undefined') {
        document.getElementById('syncText').textContent = 'Ошибка: Firebase не загружен';
        document.getElementById('syncDot').className = 'sync-dot offline';
        console.error('Firebase не загружен');
        return;
    }
    
    console.log('✅ Firebase загружен');
    
    // Проверяем базу данных
    if (typeof db === 'undefined') {
        document.getElementById('syncText').textContent = 'Ошибка: база данных не подключена';
        document.getElementById('syncDot').className = 'sync-dot offline';
        console.error('db не определена');
        return;
    }
    
    console.log('✅ База данных подключена');
    
    // Переменные
    var currentUser = 'user1';
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
    
    var userColors = {
        'user1': '#607D8B',
        'user2': '#FF9800'
    };
    
    // Функция обновления статуса
    function setStatus(status, text) {
        if (syncDot) syncDot.className = 'sync-dot ' + status;
        if (syncText) syncText.textContent = text;
        console.log('📡', status, '-', text);
    }
    
    // Проверка подключения к базе
    db.ref('.info/connected').on('value', function(snap) {
        if (snap.val() === true) {
            setStatus('online', 'Подключено к базе данных');
        } else {
            setStatus('offline', 'Нет подключения');
        }
    });
    
    // Загрузка событий
    function loadEvents(callback) {
        setStatus('syncing', 'Загрузка данных...');
        
        db.ref('events').once('value').then(function(snapshot) {
            var data = snapshot.val() || {};
            console.log('📥 Данные загружены');
            setStatus('online', 'Данные загружены');
            callback(data);
        }).catch(function(error) {
            console.error('Ошибка загрузки:', error);
            setStatus('offline', 'Ошибка загрузки');
            callback({});
        });
    }
    
    // Вспомогательные функции
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
        var days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        return days[date.getDay()];
    }
    
    function getMonthName(date) {
        var months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        return months[date.getMonth()];
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
    
    // Отрисовка расписания
    function renderSchedule() {
        console.log('🔄 Начинаем отрисовку...');
        
        loadEvents(function(loadedEvents) {
            events = loadedEvents;
            
            var weekDates = getWeekDates(currentStartDate);
            
            // Обновляем заголовок
            var startStr = weekDates[0].getDate() + ' ' + getMonthName(weekDates[0]);
            var endStr = weekDates[6].getDate() + ' ' + getMonthName(weekDates[6]);
            if (dateRangeDisplay) dateRangeDisplay.textContent = startStr + ' - ' + endStr;
            if (datePicker) datePicker.value = formatDate(currentStartDate);
            
            var html = '';
            
            // Заголовки дат
            html += '<div class="date-headers">';
            html += '<div class="time-header-cell">Время</div>';
            
            for (var i = 0; i < 7; i++) {
                var d = weekDates[i];
                var cls = isToday(d) ? ' today' : '';
                html += '<div class="date-header-cell' + cls + '" data-date="' + formatDate(d) + '">';
                html += '<div class="date-day-name">' + getDayName(d) + '</div>';
                html += '<div class="date-day-number">' + d.getDate() + '</div>';
                html += '<div class="date-month">' + getMonthName(d) + '</div>';
                html += '</div>';
            }
            html += '</div>';
            
            // Временные слоты
            for (var h = 8; h <= 21; h++) {
                html += '<div class="schedule-row">';
                html += '<div class="time-cell">' + String(h).padStart(2, '0') + ':00</div>';
                
                for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
                    var dateKey = formatDate(weekDates[dayIdx]);
                    var timeKey = String(h).padStart(2, '0') + ':00';
                    var eventKey = dateKey + '_' + timeKey;
                    var todayCol = isToday(weekDates[dayIdx]) ? ' today-column' : '';
                    
                    html += '<div class="schedule-cell' + todayCol + '" data-date="' + dateKey + '" data-time="' + timeKey + '" data-event-key="' + eventKey + '">';
                    
                    // Получаем события для ячейки
                    var cellData = events[eventKey] || {};
                    var cellEvents = [];
                    
                    // Преобразуем объект в массив
                    for (var key in cellData) {
                        if (cellData.hasOwnProperty(key)) {
                            var ev = cellData[key];
                            ev._id = key;
                            cellEvents.push(ev);
                        }
                    }
                    
                    // Фильтруем
                    if (!viewAllUsers && currentUser !== 'all') {
                        cellEvents = cellEvents.filter(function(ev) {
                            return ev.user === currentUser;
                        });
                    }
                    
                    // Отображаем
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
            
            if (scheduleTable) scheduleTable.innerHTML = html;
            
            console.log('✅ Расписание отрисовано');
            
            // Добавляем обработчики кликов
            addClickHandlers();
        });
    }
    
    function addClickHandlers() {
        // Клик по ячейке
        var cells = document.querySelectorAll('.schedule-cell');
        cells.forEach(function(cell) {
            cell.addEventListener('click', function(e) {
                if (e.target.closest('.event-chip')) return;
                selectedCell = {
                    date: this.dataset.date,
                    time: this.dataset.time,
                    eventKey: this.dataset.eventKey
                };
                openNewModal();
            });
        });
        
        // Клик по событию
        var chips = document.querySelectorAll('.event-chip');
        chips.forEach(function(chip) {
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
        
        // Клик по заголовку даты
        var headers = document.querySelectorAll('.date-header-cell');
        headers.forEach(function(hdr) {
            hdr.addEventListener('click', function() {
                currentStartDate = new Date(this.dataset.date + 'T00:00:00');
                renderSchedule();
            });
        });
    }
    
    function openNewModal() {
        editingEvent = { eventKey: selectedCell.eventKey, isNew: true };
        if (eventName) eventName.value = '';
        if (eventPatient) eventPatient.value = '';
        if (eventPhone) eventPhone.value = '';
        if (eventType) eventType.value = 'consultation';
        if (eventColor) eventColor.value = viewAllUsers ? '#607D8B' : userColors[currentUser];
        if (eventComment) eventComment.value = '';
        if (modalTitle) modalTitle.textContent = 'Новая запись - ' + selectedCell.date + ' ' + selectedCell.time;
        if (deleteEventBtn) deleteEventBtn.style.display = 'none';
        if (eventModal) eventModal.style.display = 'block';
        if (eventName) eventName.focus();
    }
    
    function openEditModal(ek, evId, evData) {
        editingEvent = { eventKey: ek, eventId: evId, event: evData, isNew: false };
        if (eventName) eventName.value = evData.title || '';
        if (eventPatient) eventPatient.value = evData.patient || '';
        if (eventPhone) eventPhone.value = evData.phone || '';
        if (eventType) eventType.value = evData.type || 'consultation';
        if (eventColor) eventColor.value = evData.color || '#607D8B';
        if (eventComment) eventComment.value = evData.comment || '';
        if (modalTitle) modalTitle.textContent = 'Редактировать запись';
        if (deleteEventBtn) deleteEventBtn.style.display = 'inline-block';
        if (eventModal) eventModal.style.display = 'block';
    }
    
    function closeModal() {
        if (eventModal) eventModal.style.display = 'none';
        editingEvent = null;
        selectedCell = null;
    }
    
    function makeId() {
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }
    
    function saveEvent() {
        var title = eventName ? eventName.value.trim() : '';
        if (!title) {
            alert('Введите название');
            if (eventName) eventName.focus();
            return;
        }
        
        var data = {
            title: title,
            patient: eventPatient ? eventPatient.value.trim() : '',
            phone: eventPhone ? eventPhone.value.trim() : '',
            type: eventType ? eventType.value : 'consultation',
            color: eventColor ? eventColor.value : '#607D8B',
            comment: eventComment ? eventComment.value.trim() : '',
            user: editingEvent.isNew ? currentUser : editingEvent.event.user,
            createdAt: new Date().toISOString()
        };
        
        setStatus('syncing', 'Сохранение...');
        
        var refPath;
        if (editingEvent.isNew) {
            var newId = makeId();
            refPath = 'events/' + editingEvent.eventKey + '/' + newId;
        } else {
            refPath = 'events/' + editingEvent.eventKey + '/' + editingEvent.eventId;
        }
        
        db.ref(refPath).set(data).then(function() {
            console.log('✅ Сохранено');
            setStatus('online', 'Сохранено!');
            closeModal();
            renderSchedule();
        }).catch(function(error) {
            console.error('Ошибка:', error);
            setStatus('offline', 'Ошибка сохранения');
            alert('Ошибка: ' + error.message);
        });
    }
    
    function deleteEvent() {
        if (!editingEvent || editingEvent.isNew) {
            closeModal();
            return;
        }
        
        if (!confirm('Удалить запись "' + editingEvent.event.title + '"?')) return;
        
        setStatus('syncing', 'Удаление...');
        
        var refPath = 'events/' + editingEvent.eventKey + '/' + editingEvent.eventId;
        
        db.ref(refPath).remove().then(function() {
            console.log('✅ Удалено');
            setStatus('online', 'Удалено');
            closeModal();
            renderSchedule();
        }).catch(function(error) {
            console.error('Ошибка:', error);
            setStatus('offline', 'Ошибка удаления');
        });
    }
    
    // Кнопки навигации
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
    
    if (datePicker) {
        datePicker.addEventListener('change', function() {
            if (this.value) {
                currentStartDate = new Date(this.value + 'T00:00:00');
                renderSchedule();
            }
        });
    }
    
    if (userSelect) {
        userSelect.addEventListener('change', function() {
            currentUser = this.value;
            viewAllUsers = false;
            document.getElementById('viewAllBtn').textContent = '👁 Все специалисты';
            renderSchedule();
        });
    }
    
    document.getElementById('viewAllBtn').addEventListener('click', function() {
        viewAllUsers = !viewAllUsers;
        this.textContent = viewAllUsers ? '👤 Один специалист' : '👁 Все специалисты';
        currentUser = viewAllUsers ? 'all' : userSelect.value;
        renderSchedule();
    });
    
    // Модальное окно
    var closeBtn = document.querySelector('.close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    
    document.getElementById('cancelEventBtn').addEventListener('click', closeModal);
    document.getElementById('saveEventBtn').addEventListener('click', saveEvent);
    document.getElementById('deleteEventBtn').addEventListener('click', deleteEvent);
    
    if (eventModal) {
        eventModal.addEventListener('click', function(e) {
            if (e.target === eventModal) closeModal();
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && eventModal && eventModal.style.display === 'block') {
            closeModal();
        }
    });
    
    // ЗАПУСК
    console.log('🦷 Запуск календаря...');
    setStatus('syncing', 'Загрузка...');
    renderSchedule();
});
