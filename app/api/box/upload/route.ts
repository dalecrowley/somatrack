import { NextRequest, NextResponse } from 'next/server';
import { boxService } from '@/lib/box/service';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const folderId = formData.get('folderId') as string;

        if (!file || !folderId) {
            return NextResponse.json({ error: 'Missing file or folderId' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const boxFile = await boxService.uploadFile(buffer, file.name, folderId);

        return NextResponse.json({
            id: boxFile.id,
            name: boxFile.name
        });
    } catch (error: any) {
        console.error('API Upload error:', error);
        return NextResponse.json({
            error: 'Upload failed',
            details: error.message
        }, { status: 500 });
    }
}
