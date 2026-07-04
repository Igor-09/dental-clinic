// ========== КОНФИГУРАЦИЯ FIREBASE ==========
// Project ID: dental-clinic-schedule-d5333
// Тип базы: Realtime Database

const firebaseConfig = {
    apiKey: "AIzaSyCKvVY8gNq8T1mFyZxGdR3wB6jH5sL9pM2",
    authDomain: "dental-clinic-schedule-d5333.firebaseapp.com",
    databaseURL: "https://dental-clinic-schedule-d5333-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "dental-clinic-schedule-d5333",
    storageBucket: "dental-clinic-schedule-d5333.appspot.com",
    messagingSenderId: "197348652215",
    appId: "1:197348652215:web:d5333dentalclinic"
};

// Инициализация Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase инициализирован');
    console.log('База данных:', firebaseConfig.databaseURL);
} catch (error) {
    console.error('❌ Ошибка Firebase:', error);
}

// Подключение к Realtime Database
const db = firebase.database();

// Проверка подключения
db.ref('.info/connected').on('value', function(snap) {
    if (snap.val() === true) {
        console.log('✅ Подключено к Realtime Database!');
    } else {
        console.log('⏳ Отключено от базы данных');
    }
});

console.log('🦷 Конфигурация готова');
