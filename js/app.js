let currentFilter = 'All';

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    setupEventListeners();
});

function setupEventListeners() {
    const addBookForm = document.getElementById('add-book-form');
    if (addBookForm) {
        addBookForm.addEventListener('submit', handleSaveBook);
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    const openModalBtn = document.getElementById('open-modal-btn');
    if (openModalBtn) {
        openModalBtn.onclick = () => {
            resetModalForAdd();
            document.getElementById('modal-overlay').classList.add('active');
        };
    }

    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.onclick = () => {
            document.getElementById('modal-overlay').classList.remove('active');
        };
    }

    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
            }
        };
    }
}

function resetModalForAdd() {
    const form = document.getElementById('add-book-form');
    if (form) form.reset();
    
    document.getElementById('editing-book-id').value = '';
    document.querySelector('.modal-header h3').textContent = 'إضافة كتاب جديد';
    document.getElementById('modal-submit-btn').textContent = 'حفظ الكتاب في المكتبة';
}

async function loadDashboard() {
    try {
        const books = await dbGetAllBooks();
        updateMetrics(books);
        applyCurrentFilter(books);
    } catch (error) {
        console.error('فشل تحميل بيانات المكتبة:', error);
    }
}

function updateMetrics(books) {
    let allCount = books.length;
    let physicalCount = 0;
    let unreadCount = 0;
    let readingCount = 0;
    let readCount = 0;
    let archivedCount = 0;
    let wishlistCount = 0;

    books.forEach(book => {
        if (book.format === 'Physical' && book.status !== 'Archived' && book.status !== 'Wishlist') {
            physicalCount++;
        }
        if (book.status === 'Unread') unreadCount++;
        if (book.status === 'Currently Reading') readingCount++;
        if (book.status === 'Read') readCount++;
        if (book.status === 'Archived') archivedCount++;
        if (book.status === 'Wishlist') wishlistCount++;
    });

    document.getElementById('all-count').textContent = allCount;
    document.getElementById('physical-count').textContent = physicalCount;
    document.getElementById('unread-count').textContent = unreadCount;
    document.getElementById('reading-count').textContent = readingCount;
    document.getElementById('read-count').textContent = readCount;
    document.getElementById('archived-count').textContent = archivedCount;
    document.getElementById('wishlist-count').textContent = wishlistCount;
}

async function filterByStatus(status, cardElement) {
    currentFilter = status;
    document.querySelectorAll('.metric-card').forEach(card => card.classList.remove('active-filter'));
    if (cardElement) cardElement.classList.add('active-filter');

    const books = await dbGetAllBooks();
    applyCurrentFilter(books);
}

function applyCurrentFilter(books) {
    let filtered = books;

    if (currentFilter === 'PhysicalOwned') {
        filtered = books.filter(b => b.format === 'Physical' && b.status !== 'Archived' && b.status !== 'Wishlist');
    } else if (currentFilter !== 'All') {
        filtered = books.filter(b => b.status === currentFilter);
    }

    renderBookList(filtered);
}

function renderBookList(books) {
    const container = document.getElementById('books-container');
    if (!container) return;

    container.innerHTML = '';

    if (books.length === 0) {
        container.innerHTML = '<p class="no-books">لا توجد كتب تطابق هذا العرض حالياً.</p>';
        return;
    }

    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <div class="book-details">
                <h3>${book.title}</h3>
                <p><strong>المؤلف:</strong> ${book.author}</p>
                <div class="tags-group">
                    <span class="tag tag-format">${book.format === 'Physical' ? '📖 ورقي' : '📄 PDF'}</span>
                    <span class="tag tag-status">${getStatusLabel(book.status)}</span>
                    ${book.rating && book.rating !== 'Unrated' ? `<span class="tag tag-rating">${book.rating === 'Liked' ? '👍 أعجبني' : '👎 لم يعجبني'}</span>` : ''}
                </div>
                ${book.notes ? `<p class="notes-text">💬 ${book.notes}</p>` : ''}
            </div>
            <div class="card-actions">
                <button type="button" class="edit-btn">تعديل</button>
                <button type="button" class="delete-btn">حذف</button>
            </div>
        `;

        card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(book.id));
        card.querySelector('.delete-btn').addEventListener('click', () => deleteBookItem(book.id));

        container.appendChild(card);
    });
}

function getStatusLabel(status) {
    const labels = {
        'Unread': '⏳ غير مقروء',
        'Currently Reading': '📖 أقرأه حالياً',
        'Read': '✅ تمت قراءته',
        'Wishlist': '✨ في الأمنيات',
        'Archived': '📦 مؤرشف'
    };
    return labels[status] || status;
}

async function openEditModal(bookId) {
    try {
        const books = await dbGetAllBooks();
        const book = books.find(b => Number(b.id) === Number(bookId));
        if (!book) return;

        document.getElementById('editing-book-id').value = book.id;
        document.getElementById('book-title').value = book.title || '';
        document.getElementById('book-author').value = book.author || '';
        document.getElementById('book-format').value = book.format || 'Physical';
        document.getElementById('book-status').value = book.status || 'Unread';
        document.getElementById('book-rating').value = book.rating || 'Unrated';
        document.getElementById('book-notes').value = book.notes || '';

        document.querySelector('.modal-header h3').textContent = 'تعديل بيانات الكتاب';
        document.getElementById('modal-submit-btn').textContent = 'حفظ التعديلات';

        document.getElementById('modal-overlay').classList.add('active');
    } catch (error) {
        console.error('خطأ في فتح نافذة التعديل:', error);
    }
}

async function handleSaveBook(event) {
    event.preventDefault();

    const idInput = document.getElementById('editing-book-id').value;
    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const format = document.getElementById('book-format').value;
    const status = document.getElementById('book-status').value;
    const rating = document.getElementById('book-rating').value;
    const notes = document.getElementById('book-notes').value.trim();

    if (!title || !author) {
        alert('يرجى إدخال عنوان الكتاب واسم المؤلف.');
        return;
    }

    try {
        if (idInput) {
            const updatedBook = {
                id: Number(idInput),
                title,
                author,
                format,
                status,
                rating,
                notes
            };
            await dbUpdateBook(updatedBook);
        } else {
            const newBook = { title, author, format, status, rating, notes };
            await dbAddBook(newBook);
        }

        document.getElementById('add-book-form').reset();
        document.getElementById('modal-overlay').classList.remove('active');
        loadDashboard();
    } catch (error) {
        alert('حدث خطأ أثناء حفظ الكتاب.');
        console.error(error);
    }
}

async function deleteBookItem(bookId) {
    if (confirm('هل أنتِ متأكدة من حذف هذا الكتاب؟')) {
        try {
            await dbDeleteBook(bookId);
            loadDashboard();
        } catch (error) {
            alert('فشل في الحذف.');
        }
    }
}

async function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    const allBooks = await dbGetAllBooks();
    
    const filtered = allBooks.filter(book => {
        const matchesQuery = book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query);
        let matchesStatus = true;
        
        if (currentFilter === 'PhysicalOwned') {
            matchesStatus = (book.format === 'Physical' && book.status !== 'Archived' && book.status !== 'Wishlist');
        } else if (currentFilter !== 'All') {
            matchesStatus = (book.status === currentFilter);
        }

        return matchesQuery && matchesStatus;
    });

    renderBookList(filtered);
}