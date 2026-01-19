import 'dotenv/config';
import { setCookie } from 'hono/cookie';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const login = async (c) => {
    const { username, password } = await c.req.json();
    const user = await db.query.users.findFirst({ where: eq(users.username, username) });

    if (!user) return c.json({ success: false, message: 'Username or Password false' }, 401);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return c.json({ success: false, message: 'Username or Password false' }, 401)

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });
    setCookie(c, 'token', token, { httpOnly: true, sameSite: 'lax', maxAge: 86400 });

    return c.json({ success: true, message: 'Login success' })
}

export default login