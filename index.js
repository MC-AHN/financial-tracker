import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { setCookie, getCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { db } from './db/index.js';
import { transactions } from './db/schema.js';
import { desc, sql } from 'drizzle-orm';
import { serveStatic } from '@hono/node-server/serve-static';
import register from './APIs/register.js';
import login from './APIs/login.js';

const app = new Hono();
const SECRET = process.env.JWT_SECRET;

app.use('/*', serveStatic({ root: './public'}));

app.post('/api/register', register)

app.post('/api/login', login)

app.post('/api/logout', (c) => {
    setCookie(c, 'token', '', { maxAge: -1 });
    return c.json({ success: true, message: 'Logout success' });
});

app.get('/api/me', (c) => {
    const token = getCookie(c, 'token');
    if (!token) return c.json({ success: false, message: 'Unauthorized' }, 401);
    try {
        const user = jwt.verify(token, SECRET);
        return c.json({ success: true, data: user })
    } catch (error) { return c.json({ success: false, message: 'Invalid Token', error: error }, 401) }
})

const authMiddleware = async (c, next) => {
    const token = getCookie(c, 'token');
    if (!token) return c.json({ success: false, message: 'Unauthorized' }, 401);
    try {
        const user = jwt.verify(token, SECRET);
        c.set('user', user);
        await next()
    } catch (error) {
        console.error('Error', error)
        return c.json({ success: false, message: 'Invalid Token', error: error }, 401)
    }
}

app.post('/api/transactions', authMiddleware, async (c) => {
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
})

app.get('/api/transactions', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const { year, month } = c.req.query()

        if (!year || !month) return c.json({ success: false, message: 'Year and Month required!' }, 400);

        const startOfMonth = `${year}-${month.padStart(2, '0')}-01 00:00:00`;
        const endOfMonth =   sql`'${sql.raw(startOfMonth)}'::timestamp + interval '1 Month'`;

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
})

app.get('/api/total', authMiddleware, async (c) => {
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
})



const port = 8000;
console.log(`🚀 Server is running on http://localhost:${port}`);
serve({ fetch: app.fetch, port })