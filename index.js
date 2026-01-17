import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { getCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { serveStatic } from '@hono/node-server/serve-static';
import register from './APIs/register.js';
import login from './APIs/login.js';
import logout from './APIs/logout.js';
import addTransaction from './APIs/addTransaction.js';
import readTransaction from './APIs/readTransaction.js';
import filterTransaction from './APIs/filterTransaction.js';

const app = new Hono();
const SECRET = process.env.JWT_SECRET;

app.use('/*', serveStatic({ root: './public'}));

app.post('/api/register', register)

app.post('/api/login', login)

app.post('/api/logout', logout);

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

app.post('/api/transactions', authMiddleware, addTransaction)

app.get('/api/transactions', authMiddleware, readTransaction)

app.get('/api/total', authMiddleware, filterTransaction)



const port = 8000;
console.log(`🚀 Server is running on http://localhost:${port}`);
serve({ fetch: app.fetch, port })