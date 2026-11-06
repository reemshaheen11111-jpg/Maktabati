const DB_NAME = 'MaktabatiDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // تفعيل الترقيم التلقائي الصحيح للـ id
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject('خطأ في فتح قاعدة البيانات: ' + event.target.error);
    });
}

async function dbAddBook(bookData) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // التأكد تماماً من عدم إرسال id فارغ أو نصي عند الإضافة الجديدة ليتولى الـ autoIncrement المهمة
        delete bookData.id;

        const request = store.add(bookData);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject('فشل في حفظ الكتاب: ' + event.target.error);
    });
}

async function dbUpdateBook(bookData) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // التأكد من أن الـ id رقم صحيح عند التعديل
        bookData.id = Number(bookData.id);

        const request = store.put(bookData);
        request.onsuccess = () => resolve(bookData.id);
        request.onerror = (event) => reject('فشل في تحديث الكتاب: ' + event.target.error);
    });
}

async function dbGetAllBooks() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject('فشل في استرجاع الكتب: ' + event.target.error);
    });
}

async function dbDeleteBook(bookId) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(Number(bookId));

        request.onsuccess = () => resolve(true);
        request.onerror = (event) => reject('فشل في حذف الكتاب: ' + event.target.error);
    });
}