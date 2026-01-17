import 'dotenv/config';
import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';
import { desc, sql } from 'drizzle-orm';

const filterTransaction = async (c) => {
    try {
        const user = c.get('user');
        const { year1, year2, month1, month2 } = c.req.query()

        if (!year1 || !year2 || !month1 || !month2) return c.json({ success: false, message: 'Year and Month required!' }, 400);

        const startOfMonth = `${year1}-${month1.padStart(2, '0')}-01 00:00:00`;

        const end = `${year2}-${month2.padStart(2, '0')}-01 00:00:00`;
        const endOfMonth = sql`${end}::timestamp + interval '1 Month'`;

        const userTransactions = await db.  query.transactions.findMany({
            where: (t, { eq, and, gte, lt }) => and(
                eq(t.userId, user.id),
                gte(t.transactionDate, startOfMonth),
                lt(t.transactionDate, endOfMonth)
            ),
            orderBy: desc(transactions.transactionDate),
        })

        const totalIncome = userTransactions.filter(t => t.status === 'income').reduce((sum, t) => sum + parseFloat(t.nominal), 0)
        const totalOutcome = userTransactions.filter(t => t.status === 'outcome').reduce((sum, t) => sum + parseFloat(t.nominal), 0)
        const balance = totalIncome - totalOutcome;

        return c.json({
            success: true,
            data: userTransactions,
            summary: { totalIncome, totalOutcome, balance }
        })
    } catch (error) { 
        console.error('Error', error); 
        return c.json({ success: false, message: 'Failed get transactions', error: error }) 
    }
}

export default filterTransaction