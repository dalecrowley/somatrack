import { NextResponse } from 'next/server';
import { BoxService } from '@/lib/box/service';

// In Next.js App Router, we export named functions for each HTTP method.

export async function GET() {
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
