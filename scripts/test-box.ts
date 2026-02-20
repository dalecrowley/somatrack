
import { BoxClient, BoxCcgAuth, CcgConfig, BoxJwtAuth, JwtConfig } from 'box-node-sdk';
import fs from 'fs';
import path from 'path';

function loadEnv() {
    const envPath = path.resolve('.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env: any = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            env[match[1]] = value.trim();
        }
    });
    return env;
}

async function getOrCreateSubfolder(client: any, parentFolderId: string, folderName: string): Promise<string> {
    try {
        console.log(`   - Checking for folder "${folderName}" in parent ${parentFolderId}...`);
        const items = await client.folders.getFolderItems(parentFolderId, {
            queryParams: { fields: ['name', 'id'], limit: 1000 },
        });

        const existingFolder = items.entries?.find((item: any) => item.name === folderName && item.type === 'folder');
        if (existingFolder) {
            console.log(`     ✅ Found existing: ${existingFolder.id}`);
            return existingFolder.id;
        }

        console.log(`     ➕ Not found. Creating folder "${folderName}"...`);
        const newFolder = await client.folders.createFolder({
            name: folderName,
            parent: { id: parentFolderId },
        });
        console.log(`     ✅ Created: ${newFolder.id}`);
        return newFolder.id;
    } catch (error: any) {
        console.log(`     ❌ Error: ${error.message}`);
        if (error.response?.body) {
            console.log('       Detail:', JSON.stringify(error.response.body));
        }
        throw error;
    }
}

async function testHierarchy() {
    const env = loadEnv();
    console.log('--- Box Hierarchy Diagnostic ---');

    let auth;
    if (env.BOX_PRIVATE_KEY) {
        const jwtConfig = new JwtConfig({
            clientId: env.BOX_CLIENT_ID!,
            clientSecret: env.BOX_CLIENT_SECRET!,
            jwtKeyId: env.BOX_PUBLIC_KEY_ID!,
            privateKey: env.BOX_PRIVATE_KEY.replace(/\\n/g, '\n'),
            privateKeyPassphrase: env.BOX_PASSPHRASE!,
            enterpriseId: env.BOX_ENTERPRISE_ID!,
        });
        auth = new BoxJwtAuth({ config: jwtConfig });
    } else {
        const ccgConfig = new CcgConfig({
            clientId: env.BOX_CLIENT_ID!,
            clientSecret: env.BOX_CLIENT_SECRET!,
            enterpriseId: env.BOX_ENTERPRISE_ID!,
        });
        auth = new BoxCcgAuth({ config: ccgConfig });
    }

    const client = new BoxClient({ auth });

    const somaTrackRootId = env.BOX_DEFAULT_FOLDER_ID || '0';
    const testClient = "DiagnosticTestClient";
    const testProject = "DiagnosticTestProject";
    const testCategory = "audio";

    try {
        console.log(`\n1. Resolving Client folder: "${testClient}" in Root (${somaTrackRootId})`);
        const clientFolderId = await getOrCreateSubfolder(client, somaTrackRootId, testClient);

        console.log(`\n2. Resolving Project folder: "${testProject}" in Client (${clientFolderId})`);
        const projectFolderId = await getOrCreateSubfolder(client, clientFolderId, testProject);

        console.log(`\n3. Resolving Category folder: "${testCategory}" in Project (${projectFolderId})`);
        const categoryFolderId = await getOrCreateSubfolder(client, projectFolderId, testCategory);

        console.log(`\n✨ Successfully resolved full hierarchy! Target Folder ID: ${categoryFolderId}`);
    } catch (error) {
        console.log(`\n💀 Hierarchy Resolution Failed.`);
    }
}

testHierarchy();
