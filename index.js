import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { setCookie, getCookie } from 'hono/cookie';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db/index.js';
import { users, transactions } from './db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { serveStatic } from '@hono/node-server/serve-static';

const app = new Hono();
const SECRET = process.env.JWT_SECRET;

app.use('/*', serveStatic({ root: './public'}));

app.post('/api/register', async (c) => {
    try {
        const { username, password } = await c.req.json();
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await db.insert(users)
            .values({ username, password: hashedPassword })
            .returning({ id: users.id, username: users.username })
        return c.json({ success: true, data: newUser[0] }, 201);
    } catch (error) {
        return c.json({ success: false, message: 'Failed Register', error: error }, 401)
    }
})

app.post('/api/login', async (c) => {
    const { username, password } = await c.req.json();
    const user = await db.query.users.findFirst({ where: eq(users.username, username) });

    if (!user) return c.json({ success: false, message: 'Username or Password false' }, 401);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return c.json({ success: false, message: 'Username or Password false' }, 401)

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '1d' });
    setCookie(c, 'token', token, { httpOnly: true, sameSite: 'lax', maxAge: 86400 });

    return c.json({ success: true, message: 'Login success' })
})

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