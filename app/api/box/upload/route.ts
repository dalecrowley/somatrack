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
        // Log full error details for debugging
        console.error('API Upload error:', {
            message: error.message,
            status: error.status || error.statusCode,
            code: error.response?.body?.code || error.code,
            details: error.response?.body?.message,
            body: error.response?.body,
        });

        // Try to extract more details from Box error if available
        const details = error.response?.body?.message || error.message;
        const code = error.response?.body?.code || error.code;

        return NextResponse.json({
            error: 'Upload failed',
            details: details,
            code: code
        }, { status: error.status || error.statusCode || 500 });
    }
}
