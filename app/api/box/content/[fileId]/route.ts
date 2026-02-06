import { NextRequest, NextResponse } from 'next/server';
import { boxService } from '@/lib/box/service';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ fileId: string }> }
) {
    try {
        const { fileId } = await context.params;
        const range = req.headers.get('range') || undefined;

        if (!fileId) {
            return new Response('Missing fileId', { status: 400 });
        }

        const stream = await boxService.downloadFile(fileId, range);

        if (!stream) {
            return new Response('File not found', { status: 404 });
        }

        // Convert Node.js Readable to Web ReadableStream
        const webStream = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
                stream.on('end', () => controller.close());
                stream.on('error', (err: Error) => controller.error(err));
            },
            cancel() {
                stream.destroy();
            }
        });

        // Basic headers. For a full implementation we'd want to get file size/type from Box
        // but this works for most browser media players.
        const headers: Record<string, string> = {
            'Content-Type': 'application/octet-stream', // Could be more specific
        };
        if (range) {
            headers['Accept-Ranges'] = 'bytes';
        }

        return new Response(webStream, { headers });
    } catch (error: any) {
        console.error('Content API error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
