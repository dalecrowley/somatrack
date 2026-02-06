import { NextResponse } from 'next/server';
import { boxService } from '@/lib/box/service';

export async function POST(request: Request) {
    try {
        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
        }

        const sharedLink = await boxService.getSharedLink(fileId);

        return NextResponse.json({ sharedLink });
    } catch (error) {
        console.error('Error finalizing Box file:', error);
        return NextResponse.json({ error: 'Failed to finalize file' }, { status: 500 });
    }
}
