import { BoxService } from '../lib/box/service';

async function testConnection() {
    console.log('🚀 Testing Box Connection...');
    console.log('Client ID:', process.env.BOX_CLIENT_ID ? '✅ Present' : '❌ Missing');

    try {
        const boxService = BoxService.getInstance();
        console.log('⏳ Requesting Access Token...');
        const token = await boxService.getAccessToken();
        console.log('✅ Success! Access Token retrieved.');

        console.log('⏳ Testing Folder Creation/Search (SomaTrack_Test_Folder)...');
        const folderId = await boxService.getOrCreateProjectFolder('SomaTrack_Test_Folder');
        console.log('✅ Success! Folder ID:', folderId);

    } catch (error: any) {
        console.error('❌ Connection Failed:');
        if (error.response?.body) {
            console.error(JSON.stringify(error.response.body, null, 2));
        } else {
            console.error(error.message || error);
            if (error.stack) console.error(error.stack);
        }
        process.exit(1);
    }
}

testConnection();
