import { NextRequest, NextResponse } from 'next/server';
import { boxService } from '@/lib/box/service';
import { Readable } from 'stream';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ fileId: string }> }
) {
    try {
        const { fileId } = await context.params;

        if (!fileId) {
            return new Response('Missing fileId', { status: 400 });
        }

        const result = await boxService.getFileThumbnail(fileId);

        if (!result) {
            return new Response(JSON.stringify({
                error: 'Thumbnail not found or not ready',
                fileId
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (result.type === 'redirect') {
            return NextResponse.redirect(result.url);
        }

        const stream = result;

        // Convert Node.js Readable to Web ReadableStream for Next.js response
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

        return new Response(webStream, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error: any) {
        console.error('Thumbnail API error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
