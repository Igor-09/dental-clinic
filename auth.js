// ========== СИСТЕМА АВТОРИЗАЦИИ ==========

// Общий пароль для входа
var APP_PASSWORD = 'implant2025';

// Специалисты
var USERS = {
    'user1': {
        id: 'user1',
        name: 'Димидов Д.П.',
        specialty: 'Хирург-имплантолог',
        color: '#607D8B'
    },
    'user2': {
        id: 'user2',
        name: 'Казарьянц Э.А.',
        specialty: 'Ортопед',
        color: '#FF9800'
    }
};

// Текущий пользователь
var currentUser = null;

// Проверка авторизации
function checkAuth() {
    var saved = localStorage.getItem('dentalClinicAuth');
    if (saved) {
        try {
            var authData = JSON.parse(saved);
            if (authData.timestamp && (Date.now() - authData.timestamp < 30 * 24 * 60 * 60 * 1000)) {
                if (USERS[authData.userId]) {
                    currentUser = USERS[authData.userId];
                    return true;
                }
            }
        } catch(e) {}
    }
    return false;
}

// Вход в систему
function login(password) {
    if (password !== APP_PASSWORD) {
        return { success: false, error: 'Неверный пароль' };
    }
    return { success: true };
}

// Установка пользователя после входа
function setUser(userId) {
    var user = USERS[userId];
    if (!user) return false;
    
    var authData = {
        userId: userId,
        timestamp: Date.now()
    };
    localStorage.setItem('dentalClinicAuth', JSON.stringify(authData));
    currentUser = user;
    return true;
}

// Выход
function logout() {
    localStorage.removeItem('dentalClinicAuth');
    currentUser = null;
}

// Показать экран входа
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
}

// Показать приложение
function showAppScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    
    if (currentUser) {
        document.getElementById('currentUserName').textContent = 
            '👤 ' + currentUser.name + ' (' + currentUser.specialty + ')';
        document.getElementById('headerSubtitle').textContent = 
            'График работы - ' + currentUser.specialty;
    }
}

// При загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    
    // Кнопка входа
    document.getElementById('loginBtn').addEventListener('click', function() {
        var password = document.getElementById('loginPassword').value;
        
        if (!password) {
            showError('Введите пароль');
            return;
        }
        
        var result = login(password);
        
        if (result.success) {
            document.getElementById('loginError').style.display = 'none';
            setUser('user1');
            showAppScreen();
            
            if (typeof initApp === 'function') {
                initApp(currentUser);
            }
        } else {
            showError(result.error);
        }
    });
    
    function showError(msg) {
        var errorEl = document.getElementById('loginError');
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }
    
    // Вход по Enter
    document.getElementById('loginPassword').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginBtn').click();
        }
    });
    
    // Кнопка выхода
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            logout();
            showLoginScreen();
        }
    });
    
    // Проверяем авторизацию при загрузке
    if (checkAuth()) {
        showAppScreen();
        if (typeof initApp === 'function') {
            initApp(currentUser);
        }
    } else {
        showLoginScreen();
    }
});
