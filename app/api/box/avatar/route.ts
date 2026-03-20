import { NextRequest, NextResponse } from 'next/server';
import { boxService } from '@/lib/box/service';
import { verifySession } from '@/lib/api/auth';

/**
 * POST /api/box/avatar
 *
 * Uploads an avatar image for the authenticated user to Box.
 * Creates (or reuses) a "Avatars" folder under the SomaTrack root,
 * then a sub-folder named after the user's UID so each user's
 * profile picture stays isolated.
 *
 * Returns { sharedLink, fileId } on success.
 * FormData: { file: File, userUid: string }
 */
export async function POST(req: NextRequest) {
    const { user, errorResponse } = await verifySession(req);
    if (errorResponse) return errorResponse;

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const userUid = formData.get('userUid') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const uid = userUid || user!.uid;

        // ── Resolve folder: SomaTrack root → Avatars → <userUid> ──────────────
        const somaTrackRootId = process.env.BOX_DEFAULT_FOLDER_ID || '0';
        const avatarsFolderId = await boxService.getOrCreateSubfolder(somaTrackRootId, 'Avatars');
        const userFolderId = await boxService.getOrCreateSubfolder(avatarsFolderId, uid);

        // ── Upload (Box service handles versioning automatically) ───────────────
        // Use a fixed filename so repeated uploads replace the previous avatar.
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `avatar.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const boxFile = await boxService.uploadFile(buffer, fileName, userFolderId);
        if (!boxFile?.id) {
            throw new Error('Box upload returned no file object');
        }

        // ── Generate shared link ────────────────────────────────────────────────
        const sharedLink = await boxService.getSharedLink(boxFile.id);

        return NextResponse.json({
            fileId: boxFile.id,
            sharedLink,
        });

    } catch (error: any) {
        console.error('Avatar upload error:', {
            message: error.message,
            status: error.status || error.statusCode,
            code: error.response?.body?.code || error.code,
            details: error.response?.body?.message,
        });

        return NextResponse.json(
            {
                error: 'Avatar upload failed',
                details: error.response?.body?.message || error.message,
                code: error.response?.body?.code || error.code,
            },
            { status: error.status || error.statusCode || 500 }
        );
    }
}
