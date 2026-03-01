import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli'
);

export async function getCurrentUserId(request: Request): Promise<number | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        if (payload && typeof payload.id === 'number') {
            return payload.id;
        }
        return null;
    } catch (err) {
        return null;
    }
}
