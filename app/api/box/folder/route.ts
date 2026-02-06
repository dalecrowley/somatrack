import { NextResponse } from 'next/server';
import { boxService } from '@/lib/box/service';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
    try {
        const { projectId, ticketId } = await request.json();

        if (!projectId || !ticketId) {
            return NextResponse.json({ error: 'projectId and ticketId are required' }, { status: 400 });
        }

        // Fetch project name from Firestore
        const projectDoc = await adminDb.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        const projectData = projectDoc.data();
        const projectName = projectData?.name || projectId;

        // 1. Get or create project folder
        const projectFolderId = await boxService.getOrCreateProjectFolder(projectName);

        // 2. Get or create ticket folder within project folder
        const ticketFolderId = await boxService.getOrCreateProjectFolder(`Ticket_${ticketId.slice(0, 8)}`, projectFolderId);

        return NextResponse.json({ folderId: ticketFolderId });
    } catch (error) {
        console.error('Error managing Box folders:', error);
        return NextResponse.json({ error: 'Failed to manage Box folders' }, { status: 500 });
    }
}
