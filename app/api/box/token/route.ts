import { NextResponse } from 'next/server';
import { BoxService } from '@/lib/box/service';
import { verifySession } from '@/lib/api/auth';

export async function GET(request: Request) {
    const { errorResponse } = await verifySession(request);
    if (errorResponse) return errorResponse;

    try {
        const boxService = BoxService.getInstance();
        const token = await boxService.getAccessToken();

        // This would ideally be a downscoped token limited to specific folders/actions
        return NextResponse.json({ accessToken: token });
    } catch (error) {
        console.error('Error generating Box token:', error);
        return NextResponse.json({ error: 'Failed to generate Box token' }, { status: 500 });
    }
}
