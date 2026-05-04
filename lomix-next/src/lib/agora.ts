import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-token';

const APP_ID = () => process.env.AGORA_APP_ID!;
const APP_CERT = () => process.env.AGORA_APP_CERTIFICATE!;

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
