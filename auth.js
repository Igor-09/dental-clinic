// ========== АВТОРИЗАЦИЯ ==========

// Пароль для входа
var APP_PASSWORD = 'implant2025';

// Пользователи
var USERS = {
    'user1': { id: 'user1', name: 'Димидов Д.П.', specialty: 'Хирург-имплантолог', color: '#607D8B' },
    'user2': { id: 'user2', name: 'Казарьянц Э.А.', specialty: 'Ортопед', color: '#FF9800' }
};

var currentUser = null;

// Проверка сохранённой сессии
function checkAuth() {
    var saved = localStorage.getItem('dentalClinicAuth');
    if (saved) {
        try {
            var data = JSON.parse(saved);
            if (data.userId && USERS[data.userId]) {
                currentUser = USERS[data.userId];
                return true;
            }
        } catch(e) {}
    }
    return false;
}

// Показать приложение
function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    
    if (currentUser) {
        document.getElementById('currentUserName').textContent = 
            '👤 ' + currentUser.name + ' (' + currentUser.specialty + ')';
    }
    
    // Запускаем приложение
    if (typeof initApp === 'function') {
        initApp(currentUser);
    }
}

// Показать экран входа
function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
}

// Когда страница загрузилась
document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🔐 Auth.js загружен');
    
    // Кнопка Войти
    document.getElementById('loginBtn').addEventListener('click', function() {
        var password = document.getElementById('loginPassword').value;
        
        console.log('Попытка входа с паролем:', password);
        
        if (password === '') {
            document.getElementById('loginError').textContent = 'Введите пароль';
            document.getElementById('loginError').style.display = 'block';
            return;
        }
        
        if (password === APP_PASSWORD) {
            console.log('✅ Пароль верный!');
            document.getElementById('loginError').style.display = 'none';
            
            // Сохраняем сессию
            localStorage.setItem('dentalClinicAuth', JSON.stringify({
                userId: 'user1',
                timestamp: Date.now()
            }));
            
            currentUser = USERS['user1'];
            showApp();
        } else {
            console.log('❌ Пароль неверный');
            document.getElementById('loginError').textContent = 'Неверный пароль';
            document.getElementById('loginError').style.display = 'block';
            document.getElementById('loginPassword').value = '';
        }
    });
    
    // Вход по Enter
    document.getElementById('loginPassword').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginBtn').click();
        }
    });
    
    // Кнопка Выйти
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('dentalClinicAuth');
        currentUser = null;
        showLogin();
    });
    
    // Проверка при загрузке
    if (checkAuth()) {
        console.log('✅ Сессия найдена, автовход');
        showApp();
    } else {
        console.log('🔐 Требуется вход');
        showLogin();
    }
});
