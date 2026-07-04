document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🚀 Запуск календаря v3.0 (Realtime DB)...');
    
    // Проверка Firebase
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase не загружен!');
        document.getElementById('syncText').textContent = 'Firebase не загружен';
        return;
    }
    
    if (typeof db === 'undefined') {
        console.error('❌ База данных не инициализирована!');
        document.getElementById('syncText').textContent = 'База данных не подключена';
        return;
    }
    
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
    
    // ========== ФУНКЦИИ БАЗЫ ДАННЫХ ==========
    
    function updateSyncStatus(status, text) {
        if (syncDot && syncText) {
            syncDot.className = 'sync-dot ' + status;
            syncText.textContent = text;
        }
        console.log('📡', status, '-', text);
    }
    
    // Слушаем статус подключения
    db.ref('.info/connected').on('value', function(snap) {
        if (snap.val() === true) {
            updateSyncStatus('online', 'Подключено');
            console.log('🟢 База данных подключена');
        } else {
            updateSyncStatus('offline', 'Нет подключения');
            console.log('🔴 База данных отключена');
        }
    });
    
    // Загружаем события из базы данных
    function loadEvents() {
        return new Promise(function(resolve, reject) {
            updateSyncStatus('syncing', 'Загрузка...');
            
            db.ref('events').once('value').then(function(snapshot) {
                var data = snapshot.val() || {};
                console.log('✅ Загружено событий из базы');
                updateSyncStatus('online', 'Готово');
                resolve(data);
            }).catch(function(error) {
                console.error('❌ Ошибка загрузки:', error);
                updateSyncStatus('offline', 'Ошибка загрузки');
                resolve({});
            });
        });
    }
    
    // Сохраняем все события в базу
    function saveAllEvents(eventsData) {
        return db.ref('events').set(eventsData).then(function() {
            console.log('✅ События сохранены в базу');
        }).catch(function(error) {
            console.error('❌ Ошибка сохранения:', error);
        });
    }
    
    // ========== ОТОБРАЖЕНИЕ ==========
    
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
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Генерация уникального ID
    function generateId() {
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async function renderSchedule() {
        console.log('🔄 Обновление расписания...');
        
        // Загружаем данные
        events = await loadEvents();
        
        var weekDates = getWeekDates(currentStartDate);
        dateRangeDisplay.textContent = 
            weekDates[0].getDate() + ' ' + getMonthName(weekDates[0]) + 
            ' - ' + weekDates[6].getDate() + ' ' + getMonthName(weekDates[6]);
        datePicker.value = formatDate(currentStartDate);
        
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
            
            for (var d = 0; d < 7; d++) {
                var dk = formatDate(weekDates[d]);
                var tk = String(h).padStart(2, '0') + ':00';
                var ek = dk + '_' + tk;
                var tc = isToday(weekDates[d]) ? ' today-column' : '';
                
                html += '<div class="schedule-cell' + tc + '" data-date="' + dk + '" data-time="' + tk + '" data-event-key="' + ek + '">';
                
                // Получаем события для этой ячейки
                var cellEvents = [];
                if (events[ek]) {
                    // Конвертируем объект в массив
                    for (var key in events[ek]) {
                        if (events[ek].hasOwnProperty(key)) {
                            var ev = events[ek][key];
                            ev._id = key; // Сохраняем ID
                            cellEvents.push(ev);
                        }
                    }
                }
                
                // Фильтруем по пользователю
                if (!viewAllUsers && currentUser !== 'all') {
                    cellEvents = cellEvents.filter(function(ev) {
                        return ev.user === currentUser;
                    });
                }
                
                // Сортируем по времени создания
                cellEvents.sort(function(a, b) {
                    return (a.createdAt || '').localeCompare(b.createdAt || '');
                });
                
                // Отображаем события
                for (var e = 0; e < cellEvents.length; e++) {
                    var ev = cellEvents[e];
                    html += '<div class="event-chip" style="background:' + (ev.color || '#607D8B') + '" data-event-id="' + (ev._id || '') + '">';
                    html += '<div class="event-chip-title">' + escapeHtml(ev.title || '') + '</div>';
                    if (ev.patient) html += '<div class="event-chip-patient">' + escapeHtml(ev.patient) + '</div>';
                    if (ev.type) html += '<div class="event-chip-time">' + getEventTypeLabel(ev.type) + '</div>';
                    html += '</div>';
                }
                
                html += '</div>';
            }
            html += '</div>';
        }
        
        scheduleTable.innerHTML = html;
        
        // Обработчики кликов по ячейкам
        document.querySelectorAll('.schedule-cell').forEach(function(cell) {
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
        
        // Обработчики кликов по событиям
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
        
        // Обработчики кликов по заголовкам дат
        document.querySelectorAll('.date-header-cell').forEach(function(hdr) {
            hdr.addEventListener('click', function() {
                currentStartDate = new Date(this.dataset.date + 'T00:00:00');
                renderSchedule();
            });
        });
        
        console.log('✅ Расписание обновлено');
    }
    
    function openNewModal() {
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
    
    function openEditModal(eventKey, eventId, eventData) {
        editingEvent = { 
            eventKey: eventKey, 
            eventId: eventId, 
            event: eventData, 
            isNew: false 
        };
        eventName.value = eventData.title || '';
        eventPatient.value = eventData.patient || '';
        eventPhone.value = eventData.phone || '';
        eventType.value = eventData.type || 'consultation';
        eventColor.value = eventData.color || '#607D8B';
        eventComment.value = eventData.comment || '';
        modalTitle.textContent = 'Редактировать запись';
        deleteEventBtn.style.display = 'inline-block';
        eventModal.style.display = 'block';
    }
    
    function closeModal() {
        eventModal.style.display = 'none';
        editingEvent = null;
        selectedCell = null;
    }
    
    async function saveEventData() {
        var title = eventName.value.trim();
        if (!title) { 
            alert('Введите название события'); 
            eventName.focus(); 
            return; 
        }
        
        var eventData = {
            title: title,
            patient: eventPatient.value.trim(),
            phone: eventPhone.value.trim(),
            type: eventType.value,
            color: eventColor.value,
            comment: eventComment.value.trim(),
            user: editingEvent.isNew ? currentUser : editingEvent.event.user,
            createdAt: new Date().toISOString()
        };
        
        try {
            updateSyncStatus('syncing', 'Сохранение...');
            
            if (editingEvent.isNew) {
                // Новое событие
                var newId = generateId();
                var updates = {};
                updates['events/' + editingEvent.eventKey + '/' + newId] = eventData;
                await db.ref().update(updates);
                console.log('✅ Новое событие создано:', newId);
            } else {
                // Обновление существующего
                await db.ref('events/' + editingEvent.eventKey + '/' + editingEvent.eventId).update(eventData);
                console.log('✅ Событие обновлено:', editingEvent.eventId);
            }
            
            updateSyncStatus('online', 'Сохранено!');
            closeModal();
            await renderSchedule();
            
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            updateSyncStatus('offline', 'Ошибка!');
            alert('Не удалось сохранить: ' + error.message);
        }
    }
    
    async function deleteEventData() {
        if (editingEvent.isNew) { 
            closeModal(); 
            return; 
        }
        
        if (!confirm('Удалить запись "' + editingEvent.event.title + '"?')) {
            return;
        }
        
        try {
            updateSyncStatus('syncing', 'Удаление...');
            
            await db.ref('events/' + editingEvent.eventKey + '/' + editingEvent.eventId).remove();
            
            console.log('✅ Событие удалено');
            updateSyncStatus('online', 'Удалено');
            closeModal();
            await renderSchedule();
            
        } catch (error) {
            console.error('❌ Ошибка удаления:', error);
            updateSyncStatus('offline', 'Ошибка!');
            alert('Не удалось удалить: ' + error.message);
        }
    }
    
    // ========== КНОПКИ ==========
    
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
    saveEventBtn.addEventListener('click', saveEventData);
    deleteEventBtn.addEventListener('click', deleteEventData);
    
    eventModal.addEventListener('click', function(e) {
        if (e.target === eventModal) closeModal();
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && eventModal.style.display === 'block') closeModal();
        if (e.key === 'Enter' && eventModal.style.display === 'block' && document.activeElement !== eventComment) saveEventData();
    });
    
    // ========== ЗАПУСК ==========
    console.log('🦷 Календарь Имплант Клиник запущен!');
    updateSyncStatus('syncing', 'Загрузка...');
    renderSchedule();
});
