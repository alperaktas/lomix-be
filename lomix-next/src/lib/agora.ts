import { RtcTokenBuilder, RtcRole } from 'agora-token';

export function generateAgoraToken(channelName: string, uid: number): string {
    const appId = process.env.AGORA_APP_ID!;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE!;
    const expireTs = Math.floor(Date.now() / 1000) + 86400; // 24 saat

    return RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        RtcRole.PUBLISHER,
        expireTs,
        expireTs
    );
}
