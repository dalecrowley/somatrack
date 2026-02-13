import { NextResponse } from 'next/server';
import { boxService } from '@/lib/box/service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileName, mimeType } = body;
        console.log('API Global Folder Request:', { fileName, mimeType });

        // 1. Determine target folder ID based on file type
        let targetFolderId = process.env.BOX_DEFAULT_FOLDER_ID || '0';
        const ext = fileName?.split('.').pop()?.toLowerCase();
        const mainType = mimeType?.split('/')[0];

        // Audio: wav, mp3, ogg (BOX_AUDIO_FOLDER_ID)
        if (['wav', 'mp3', 'ogg'].includes(ext) || mainType === 'audio') {
            targetFolderId = process.env.BOX_AUDIO_FOLDER_ID || targetFolderId;
        }
        // Video: mp4, mov (BOX_VIDEO_FOLDER_ID)
        else if (['mp4', 'mov'].includes(ext) || mainType === 'video') {
            targetFolderId = process.env.BOX_VIDEO_FOLDER_ID || targetFolderId;
        }
        // Images: jpg, bmp, png (BOX_IMAGE_FOLDER_ID)
        else if (['jpg', 'jpeg', 'bmp', 'png', 'gif'].includes(ext) || mainType === 'image') {
            targetFolderId = process.env.BOX_IMAGE_FOLDER_ID || targetFolderId;
        }
        // Documents: pdf, doc, xls, etc. (BOX_DOCUMENT_FOLDER_ID)
        else if (
            ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(ext) ||
            mimeType === 'application/pdf' ||
            mimeType?.includes('msword') ||
            mimeType?.includes('officedocument')
        ) {
            targetFolderId = process.env.BOX_DOCUMENT_FOLDER_ID || targetFolderId;
        }

        console.log(`📂 Routing file "${fileName}" (${mimeType}) to folder: ${targetFolderId}`);
        return NextResponse.json({ folderId: targetFolderId });
    } catch (error: any) {
        console.error('Error routing Box folders:', error);
        return NextResponse.json({ error: 'Failed to route Box folders', details: error.message }, { status: 500 });
    }
}
