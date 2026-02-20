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
     * Upload a file to a specific Box folder.
     */
    public async uploadFile(buffer: Buffer, fileName: string, folderId: string): Promise<any> {
        const { generateByteStreamFromBuffer } = require('box-node-sdk/lib/internal/utilsNode');

        try {
            // 1. Check if file exists in the folder to support versioning
            // Skip the listing check when folderId is '0' (root) — service accounts
            // cannot list the root folder and logos are always uploaded fresh anyway.
            let existingFile: any = null;
            if (folderId !== '0') {
                const items = await this.client.folders.getFolderItems(folderId, {
                    queryParams: { fields: ['name', 'id'], limit: 1000 }
                });
                existingFile = items.entries?.find((item: any) => item.type === 'file' && item.name === fileName);
            }

            if (existingFile) {
                console.log(`ℹ️ File ${fileName} already exists (ID: ${existingFile.id}). Uploading new version...`);
                const stream = generateByteStreamFromBuffer(buffer);
                const version = await this.client.uploads.uploadFileVersion(existingFile.id, {
                    attributes: { name: fileName },
                    file: stream,
                    fileFileName: fileName
                });
                return version.entries?.[0];
            }

            // 2. Upload as a new file if it doesn't exist
            const stream = generateByteStreamFromBuffer(buffer);
            const boxFile = await this.client.uploads.uploadFile({
                attributes: {
                    name: fileName,
                    parent: { id: folderId }
                },
                file: stream,
                fileFileName: fileName
            });

            return boxFile.entries?.[0];
        } catch (error: any) {
            const errorCode = error.response?.body?.code || error.code;
            const isReserved = errorCode === 'name_temporarily_reserved';
            const isCollision = errorCode === 'item_name_in_use' || error.status === 409 || error.statusCode === 409 || error.response?.status === 409;

            if (isReserved) {
                console.log(`⏳ Name temporarily reserved for ${fileName}, waiting 3s to retry...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                return this.uploadFile(buffer, fileName, folderId);
            }

            if (isCollision) {
                console.log(`ℹ️ Collision detected for ${fileName}, searching for file ID to version...`);

                // Try to find the file ID directly by listing items in folder
                const items = await this.client.folders.getFolderItems(folderId, {
                    queryParams: { fields: ['name', 'id'], limit: 1000 }
                });

                const file = items.entries?.find((item: any) => item.type === 'file' && item.name === fileName);

                if (file) {
                    console.log(`✅ Found existing file ${fileName} (ID: ${file.id}). Uploading version...`);
                    const stream = generateByteStreamFromBuffer(buffer);
                    const version = await this.client.uploads.uploadFileVersion(file.id, {
                        attributes: { name: fileName },
                        file: stream,
                        fileFileName: fileName
                    });
                    return version.entries?.[0];
                }

                // If still not found, wait and retry the whole process once
                console.log(`⚠️ File not found in listing, waiting 2s and retrying check...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.uploadFile(buffer, fileName, folderId);
            }

            console.error(`Error uploading file ${fileName} to folder ${folderId}:`, error);
            throw error;
        }
    }

    /**
     * Create a folder for a project if it doesn't exist.
     */
    public async getOrCreateProjectFolder(projectName: string, parentFolderId?: string): Promise<string> {
        return this.getOrCreateSubfolder(parentFolderId || process.env.BOX_ROOT_FOLDER_ID || '0', projectName);
    }

    /**
     * Sanitize a string for use as a Box folder name.
     * Box illegal characters: \ / : * ? " < > |
     */
    private sanitizeName(name: string): string {
        return name.replace(/[\\\/:*?"<>|]/g, '-').trim();
    }

    /**
     * Ensure a subfolder exists within a parent folder.
     */
    public async getOrCreateSubfolder(parentFolderId: string, folderName: string): Promise<string> {
        const sanitizedName = this.sanitizeName(folderName);
        if (!sanitizedName) {
            throw new Error(`Invalid folder name: "${folderName}" (sanitized to empty string)`);
        }

        try {
            // Check if folder already exists
            const items = await this.client.folders.getFolderItems(parentFolderId, {
                queryParams: { fields: ['name', 'id'], limit: 1000 },
            });

            const existingFolder = items.entries?.find((item: any) =>
                item.name.toLowerCase() === sanitizedName.toLowerCase() && item.type === 'folder'
            );
            if (existingFolder) return existingFolder.id;

            // Create new folder
            const newFolder = await this.client.folders.createFolder({
                name: sanitizedName,
                parent: { id: parentFolderId },
            });
            return newFolder.id;
        } catch (error: any) {
            console.error(`Error in getOrCreateSubfolder for "${sanitizedName}" in ${parentFolderId}:`, error);
            throw error;
        }
    }

    /**
     * Get a file's raw content stream.
     */
    public async downloadFile(fileId: string, range?: string): Promise<any> {
        try {
            return await this.client.downloads.downloadFile(fileId, {
                headers: { range }
            });
        } catch (error: any) {
            console.error(`Error downloading file ${fileId}:`, error);
            throw error;
        }
    }

    /**
     * Get a thumbnail for a file.
     */
    public async getFileThumbnail(fileId: string): Promise<any> {
        const maxRetries = 5;
        let delay = 1000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const stream = await this.client.files.getFileThumbnailById(fileId, 'png', {
                    queryParams: {
                        maxHeight: 256,
                        maxWidth: 256
                    }
                });

                if (stream) return stream;
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error: any) {
                if (error.status === 202 || error.status === 400 || error.message?.includes('202') || error.message?.includes('400')) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error(`❌ Box SDK error getting thumbnail for ${fileId}:`, error);
                    break;
                }
            }
            delay += 1000;
        }

        try {
            const url = await this.client.files.getFileThumbnailUrl(fileId, 'png', {
                queryParams: { maxHeight: 256, maxWidth: 256 }
            });
            if (url) return { type: 'redirect', url };
        } catch (e) {
            // Silently fail fallback
        }

        return null;
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
