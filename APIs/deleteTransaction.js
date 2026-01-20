import { db } from '../db/index.js';
import { and, eq } from 'drizzle-orm'; // Tambahkan ini di file API utama kamu
import { transactions } from '../db/schema.js';

const deleteTransaction = async (c) => {
    // Di sini, 'authMiddleware' sudah memastikan user ada
    const user = c.get('user'); 
    const id = parseInt(c.req.param('id'));

    // Gunakan delete() Drizzle
    const deletedTransaction = await db.delete(transactions)
        .where(
            and(
                eq(transactions.id, id),
                eq(transactions.userId, user.id) // 🔑 HANYA HAPUS JIKA MILIKNYA
            )
        )
        .returning({ id: transactions.id }); // Minta ID yang dihapus

    // Jika tidak ada baris yang dihapus (ID salah atau milik orang lain)
    if (deletedTransaction.length === 0) {
        return c.json({ success: false, message: 'Transaction not found or unauthorized' }, 404);
    }

    return c.json({ success: true, message: 'Transaction deleted successfully' });
}

export default deleteTransaction