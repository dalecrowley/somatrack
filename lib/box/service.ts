import { BoxClient, BoxCcgAuth, CcgConfig, BoxJwtAuth, JwtConfig } from 'box-node-sdk';

export class BoxService {
    private static instance: BoxService;
    private client: BoxClient;
    private auth: BoxCcgAuth | BoxJwtAuth;

    private constructor() {
        if (process.env.BOX_PRIVATE_KEY) {
            // Use JWT Authentication
            const jwtConfig = new JwtConfig({
                clientId: process.env.BOX_CLIENT_ID!,
                clientSecret: process.env.BOX_CLIENT_SECRET!,
                jwtKeyId: process.env.BOX_PUBLIC_KEY_ID!,
                privateKey: process.env.BOX_PRIVATE_KEY.replace(/\\n/g, '\n'),
                privateKeyPassphrase: process.env.BOX_PASSPHRASE!,
                enterpriseId: process.env.BOX_ENTERPRISE_ID!,
            });
            this.auth = new BoxJwtAuth({ config: jwtConfig });
        } else {
            // Use Client Credentials Grant (CCG)
            const ccgConfig = new CcgConfig({
                clientId: process.env.BOX_CLIENT_ID!,
                clientSecret: process.env.BOX_CLIENT_SECRET!,
                enterpriseId: process.env.BOX_ENTERPRISE_ID!,
            });
            this.auth = new BoxCcgAuth({ config: ccgConfig });
        }

        this.client = new BoxClient({ auth: this.auth });
    }

    public static getInstance(): BoxService {
        if (!BoxService.instance) {
            BoxService.instance = new BoxService();
        }
        return BoxService.instance;
    }

    /**
     * Generate an access token for the frontend.
     */
    public async getAccessToken(): Promise<string> {
        const token = await this.auth.retrieveToken();
        if (!token.accessToken) throw new Error('Failed to retrieve access token');
        return token.accessToken;
    }

    /**
     * Create a folder for a project if it doesn't exist.
     */
    public async getOrCreateProjectFolder(projectName: string, parentFolderId: string = '0'): Promise<string> {
        try {
            // Check if folder already exists
            const items = await this.client.folders.getFolderItems(parentFolderId, {
                queryParams: { fields: ['name', 'id'] },
            });

            const existingFolder = items.entries?.find((item: any) => item.name === projectName && item.type === 'folder');
            if (existingFolder) return existingFolder.id;

            // Create new folder
            const newFolder = await this.client.folders.createFolder({
                name: projectName,
                parent: { id: parentFolderId },
            });
            return newFolder.id;
        } catch (error: any) {
            console.error(`Error in getOrCreateProjectFolder for ${projectName}:`, error);
            throw error;
        }
    }

    /**
     * Generate a shared link for a file to show in the UI.
     */
    public async getSharedLink(fileId: string): Promise<string> {
        try {
            const file = await this.client.sharedLinksFiles.addShareLinkToFile(
                fileId,
                { sharedLink: { access: 'open' } },
                { fields: 'shared_link' }
            );
            return file.sharedLink?.url || '';
        } catch (error) {
            console.error(`Error generating shared link for file ${fileId}:`, error);
            throw error;
        }
    }
}

export const boxService = BoxService.getInstance();
