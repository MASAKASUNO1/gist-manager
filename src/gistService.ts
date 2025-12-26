import * as vscode from 'vscode';

export interface GistFile {
    filename: string;
    content: string;
    language?: string;
    raw_url?: string;
}

export interface Gist {
    id: string;
    description: string | null;
    public: boolean;
    html_url: string;
    files: { [key: string]: GistFile };
    created_at: string;
    updated_at: string;
}

export class GistService {
    private static readonly API_BASE = 'https://api.github.com';

    async getToken(): Promise<string> {
        const session = await vscode.authentication.getSession('github', ['gist'], { createIfNone: true });
        return session.accessToken;
    }

    private async request<T>(
        method: string,
        path: string,
        body?: object
    ): Promise<T> {
        const token = await this.getToken();
        const response = await fetch(`${GistService.API_BASE}${path}`, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} ${errorText}`);
        }

        if (response.status === 204) {
            return {} as T;
        }

        return response.json() as Promise<T>;
    }

    async listGists(): Promise<Gist[]> {
        return this.request<Gist[]>('GET', '/gists');
    }

    async getGist(gistId: string): Promise<Gist> {
        return this.request<Gist>('GET', `/gists/${gistId}`);
    }

    async createGist(
        description: string,
        files: { [key: string]: { content: string } },
        isPublic: boolean
    ): Promise<Gist> {
        return this.request<Gist>('POST', '/gists', {
            description,
            public: isPublic,
            files
        });
    }

    async updateGist(
        gistId: string,
        description: string,
        files: { [key: string]: { content: string } | null }
    ): Promise<Gist> {
        return this.request<Gist>('PATCH', `/gists/${gistId}`, {
            description,
            files
        });
    }

    async deleteGist(gistId: string): Promise<void> {
        await this.request<void>('DELETE', `/gists/${gistId}`);
    }
}
