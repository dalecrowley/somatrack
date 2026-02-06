import { NextResponse } from 'next/server';
import { boxService } from '@/lib/box/service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectId, ticketId, projectName: providedName } = body;
        console.log('API Folder Request:', body);

        if (!projectId || !ticketId) {
            return NextResponse.json({ error: 'projectId and ticketId are required' }, { status: 400 });
        }

        // Use provided project name or fallback to ID
        const projectName = providedName || projectId;

        // 1. Get or create project folder
        const projectFolderId = await boxService.getOrCreateProjectFolder(projectName);

        // 2. Get or create ticket folder within project folder
        const ticketFolderId = await boxService.getOrCreateProjectFolder(`Ticket_${ticketId.slice(0, 8)}`, projectFolderId);

        return NextResponse.json({ folderId: ticketFolderId });
    } catch (error: any) {
        console.error('Error managing Box folders:', error);
        return NextResponse.json({ error: 'Failed to manage Box folders', details: error.message }, { status: 500 });
    }
}
