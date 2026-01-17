import 'dotenv/config';
import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';


const addTransaction = async (c) => {
    try {
        const user = c.get('user');
        const { nominal, transactionDate, status, description } = await c.req.json()
        const newTransaction = await db.insert(transactions).values({
            userId: user.id,
            nominal: nominal.toString(),
            transactionDate: transactionDate,
            status: status,
            description: description
        }).returning()
        return c.json({ success: true, data: newTransaction[0] }, 201);
    } catch (error) { return c.json({ success: false, message: 'Failed add transactions' }, 401) }
}

export default addTransaction