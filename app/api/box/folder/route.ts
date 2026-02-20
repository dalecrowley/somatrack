import { NextResponse } from 'next/server';
import { boxService } from '@/lib/box/service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileName, mimeType, projectId, projectName, clientName } = body;
        console.log('API Box Folder Request:', { fileName, mimeType, projectId, projectName, clientName });

        // 1. Determine the root parent for project folders
        // We use BOX_DEFAULT_FOLDER_ID as the "SomaTrack" root on Box
        const somaTrackRootId = process.env.BOX_DEFAULT_FOLDER_ID || '0';

        // 2. Resolve or Create the Client-level folder
        const clientFolderName = (clientName || 'Other').trim();
        const clientFolderId = await boxService.getOrCreateSubfolder(somaTrackRootId, clientFolderName);

        // 3. Resolve or Create the Project-level folder under the Client
        const projectFolderName = (projectName || 'Other').trim();
        const projectFolderId = await boxService.getOrCreateSubfolder(clientFolderId, projectFolderName);

        // 4. Determine category based on file type
        let category = 'other';
        const ext = fileName?.split('.').pop()?.toLowerCase();
        const mainType = mimeType?.split('/')[0];

        if (['wav', 'mp3', 'ogg', 'aif', 'aiff'].includes(ext) || mainType === 'audio') {
            category = 'audio';
        } else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext) || mainType === 'video') {
            category = 'video';
        } else if (['jpg', 'jpeg', 'bmp', 'png', 'gif', 'svg'].includes(ext) || mainType === 'image') {
            category = 'images';
        } else if (
            ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'ppt', 'pptx'].includes(ext) ||
            mimeType === 'application/pdf' ||
            mimeType?.includes('msword') ||
            mimeType?.includes('officedocument')
        ) {
            category = 'documents';
        }

        // 5. Resolve or Create the Category subfolder within the Project folder
        console.log(`⏳ Resolving category folder: ${category} in ${projectFolderId}`);
        const targetFolderId = await boxService.getOrCreateSubfolder(projectFolderId, category);

        console.log(`✅ SUCCESS: Routed "${fileName}" to client "${clientFolderName}" -> project "${projectFolderName}" -> category "${category}" (${targetFolderId})`);

        return NextResponse.json({
            folderId: targetFolderId,
            clientFolderId,
            projectFolderId,
            category
        });
    } catch (error: any) {
        console.error('❌ FATAL ERROR in Box folder routing:');
        console.error('Message:', error.message);
        console.error('Status:', error.status || error.statusCode);
        if (error.response?.body) {
            console.error('Response Body:', JSON.stringify(error.response.body, null, 2));
        }
        console.error('Stack:', error.stack);

        return NextResponse.json({
            error: 'Failed to route Box folders',
            details: error.message,
            code: error.status || error.statusCode || 500
        }, { status: 500 });
    }
}
