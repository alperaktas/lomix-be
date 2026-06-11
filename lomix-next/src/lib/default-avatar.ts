const DEFAULT_AVATAR_PATH = '/img/default-avatar.svg';

export function avatarUrl(avatar: string | null | undefined, requestUrl: string): string {
    if (avatar && avatar.trim()) return avatar;
    const origin = new URL(requestUrl).origin;
    return `${origin}${DEFAULT_AVATAR_PATH}`;
}
