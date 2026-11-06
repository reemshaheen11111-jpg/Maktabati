async function exportBackup() {
    try {
        const books = await dbGetAllBooks();
        
        if (books.length === 0) {
            alert('لا توجد بيانات لتصديرها حالياً.');
            return;
        }

        const dataStr = JSON.stringify(books, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = url;
        
        const dateStr = new Date().toISOString().slice(0, 10);
        downloadAnchor.download = `maktabati_backup_${dateStr}.json`;
        
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        alert('حدث خطأ أثناء تصدير النسخة الاحتياطية.');
        console.error(error);
    }
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const importedBooks = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedBooks)) {
                alert('ملف النسخة الاحتياطية غير صالح.');
                return;
            }

            if (confirm(`سيتم استيراد ${importedBooks.length} كتاباً. هل أنتِ متأكدة؟`)) {
                for (const book of importedBooks) {
                    delete book.id; 
                    await dbAddBook(book);
                }
                alert('تم استيراد النسخة الاحتياطية بنجاح!');
                loadDashboard();
            }
        } catch (error) {
            alert('فشل في قراءة ملف JSON.');
            console.error(error);
        }
    };

    reader.readAsText(file);
}