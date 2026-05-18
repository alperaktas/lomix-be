import { RtcTokenBuilder, RtcRole, RtmTokenBuilder, ChatTokenBuilder } from 'agora-token';

const APP_ID = () => process.env.AGORA_APP_ID!;
const APP_CERT = () => process.env.AGORA_APP_CERTIFICATE!;
const CUSTOMER_KEY = () => process.env.AGORA_CUSTOMER_KEY!;
const CUSTOMER_SECRET = () => process.env.AGORA_CUSTOMER_SECRET!;

export function generateAgoraToken(channelName: string, uid: number): string {
    const expireTs = Math.floor(Date.now() / 1000) + 86400;
    return RtcTokenBuilder.buildTokenWithUid(
        APP_ID(), APP_CERT(), channelName, uid, RtcRole.PUBLISHER, expireTs, expireTs
    );
}

export function generateRtmToken(userId: string): string {
    const expireTs = Math.floor(Date.now() / 1000) + 86400;
    return RtmTokenBuilder.buildToken(APP_ID(), APP_CERT(), userId, expireTs);
}

export function generateChatToken(userId: string): string {
    const expireTs = Math.floor(Date.now() / 1000) + 86400;
    return ChatTokenBuilder.buildUserToken(APP_ID(), APP_CERT(), userId, expireTs);
}

function generateChatAppToken(): string {
    const expireTs = Math.floor(Date.now() / 1000) + 3600;
    return ChatTokenBuilder.buildAppToken(APP_ID(), APP_CERT(), expireTs);
}

export async function registerAgoraChatUser(userId: string): Promise<void> {
    const appKey = process.env.AGORA_CHAT_APP_KEY!;
    const [orgName, appName] = appKey.split('#');
    const appToken = generateChatAppToken();

    const res = await fetch(`https://a71.chat.agora.io/${orgName}/${appName}/users`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${appToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: userId, password: `lomix_${userId}` }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const desc: string = err?.error_description || '';
        // Zaten kayıtlı → sessizce geç
        if (res.status === 409 || desc.includes('unique') || desc.includes('exists')) return;
        throw new Error(`Agora Chat kayıt hatası: ${desc || res.status}`);
    }
}

export async function sendAdminSignalEvent(channelName: string, event: Record<string, unknown>): Promise<void> {
    const credentials = Buffer.from(`${CUSTOMER_KEY()}:${CUSTOMER_SECRET()}`).toString('base64');
    await fetch(`https://api.agora.io/v1/apps/${APP_ID()}/channels/${channelName}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload: JSON.stringify(event) }),
    });
}
