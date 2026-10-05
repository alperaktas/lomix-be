const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

/**
 * Hikaye önizlemesi: yüklenen thumbnail varsa o, yoksa medya resimse kendisi.
 * Video için thumbnail yüklenmediyse null döner (çağıran avatara düşer).
 */
export function storyThumbnail(story: { mediaUrl: string; thumbnailUrl: string | null }): string | null {
    if (story.thumbnailUrl) return story.thumbnailUrl;
    const path = story.mediaUrl.split('?')[0];
    const ext = (path.split('.').pop() || '').toLowerCase();
    return IMAGE_EXTS.includes(ext) ? story.mediaUrl : null;
}
