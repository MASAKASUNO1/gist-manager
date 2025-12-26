import * as vscode from 'vscode';
import { GistService, Gist } from './gistService';

let gistService: GistService;

export function activate(context: vscode.ExtensionContext) {
    gistService = new GistService();

    context.subscriptions.push(
        vscode.commands.registerCommand('gist-manager.list', listAndOpenGist),
        vscode.commands.registerCommand('gist-manager.create', createGist),
        vscode.commands.registerCommand('gist-manager.update', updateGist),
        vscode.commands.registerCommand('gist-manager.delete', deleteGist)
    );
}

async function listAndOpenGist(): Promise<void> {
    try {
        const gists = await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loading Gists...' },
            () => gistService.listGists()
        );

        if (gists.length === 0) {
            vscode.window.showInformationMessage('No Gists found.');
            return;
        }

        const items = gists.map(gist => ({
            label: gist.description || Object.keys(gist.files)[0] || 'Untitled',
            description: `${Object.keys(gist.files).length} file(s) - ${gist.public ? 'Public' : 'Secret'}`,
            detail: Object.keys(gist.files).join(', '),
            gist
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a Gist to open',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selected) {
            return;
        }

        await openGist(selected.gist);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to list Gists: ${error}`);
    }
}

async function openGist(gist: Gist): Promise<void> {
    const fileNames = Object.keys(gist.files);

    if (fileNames.length === 1) {
        await openGistFile(gist, fileNames[0]);
        return;
    }

    const selected = await vscode.window.showQuickPick(fileNames, {
        placeHolder: 'Select a file to open'
    });

    if (selected) {
        await openGistFile(gist, selected);
    }
}

async function openGistFile(gist: Gist, fileName: string): Promise<void> {
    const file = gist.files[fileName];
    const content = file.content;

    const doc = await vscode.workspace.openTextDocument({
        content,
        language: getLanguageId(fileName)
    });

    const editor = await vscode.window.showTextDocument(doc);

    // Store gist metadata for update command
    const metadata = {
        gistId: gist.id,
        fileName,
        description: gist.description || ''
    };
    (editor.document as any).__gistMetadata = metadata;
}

function getLanguageId(fileName: string): string | undefined {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap: { [key: string]: string } = {
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'php': 'php',
        'sh': 'shellscript',
        'bash': 'shellscript',
        'zsh': 'shellscript',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'less': 'less',
        'md': 'markdown',
        'sql': 'sql',
        'swift': 'swift',
        'kt': 'kotlin',
        'vue': 'vue',
        'jsx': 'javascriptreact',
        'tsx': 'typescriptreact'
    };
    return ext ? langMap[ext] : undefined;
}

async function createGist(): Promise<void> {
    try {
        const editor = vscode.window.activeTextEditor;
        let content = '';
        let defaultFileName = 'untitled.txt';

        if (editor) {
            content = editor.document.getText(editor.selection.isEmpty ? undefined : editor.selection);
            const docFileName = editor.document.fileName;
            if (docFileName && !docFileName.startsWith('Untitled')) {
                defaultFileName = docFileName.split('/').pop() || docFileName.split('\\').pop() || defaultFileName;
            }
        }

        const fileName = await vscode.window.showInputBox({
            prompt: 'Enter file name',
            value: defaultFileName,
            validateInput: (value) => value.trim() ? null : 'File name is required'
        });

        if (!fileName) {
            return;
        }

        const description = await vscode.window.showInputBox({
            prompt: 'Enter Gist description (optional)',
            placeHolder: 'Description'
        });

        if (description === undefined) {
            return;
        }

        const visibility = await vscode.window.showQuickPick(
            [
                { label: 'Secret', description: 'Only visible to you and those you share the URL with', value: false },
                { label: 'Public', description: 'Visible to everyone', value: true }
            ],
            { placeHolder: 'Select visibility' }
        );

        if (!visibility) {
            return;
        }

        if (!content) {
            content = await vscode.window.showInputBox({
                prompt: 'Enter Gist content',
                placeHolder: 'Content'
            }) || '';
        }

        if (!content.trim()) {
            vscode.window.showErrorMessage('Content cannot be empty');
            return;
        }

        const gist = await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Creating Gist...' },
            () => gistService.createGist(
                description || '',
                { [fileName]: { content } },
                visibility.value
            )
        );

        const action = await vscode.window.showInformationMessage(
            `Gist created successfully!`,
            'Open in Browser',
            'Copy URL'
        );

        if (action === 'Open in Browser') {
            vscode.env.openExternal(vscode.Uri.parse(gist.html_url));
        } else if (action === 'Copy URL') {
            await vscode.env.clipboard.writeText(gist.html_url);
            vscode.window.showInformationMessage('URL copied to clipboard');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create Gist: ${error}`);
    }
}

async function updateGist(): Promise<void> {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor. Open a Gist file first.');
            return;
        }

        const metadata = (editor.document as any).__gistMetadata;

        if (metadata) {
            // Update the currently open Gist
            const content = editor.document.getText();
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Updating Gist...' },
                () => gistService.updateGist(
                    metadata.gistId,
                    metadata.description,
                    { [metadata.fileName]: { content } }
                )
            );
            vscode.window.showInformationMessage('Gist updated successfully!');
        } else {
            // Select a Gist to update
            const gists = await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loading Gists...' },
                () => gistService.listGists()
            );

            if (gists.length === 0) {
                vscode.window.showInformationMessage('No Gists found.');
                return;
            }

            const items = gists.map(gist => ({
                label: gist.description || Object.keys(gist.files)[0] || 'Untitled',
                description: Object.keys(gist.files).join(', '),
                gist
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a Gist to update'
            });

            if (!selected) {
                return;
            }

            const fileNames = Object.keys(selected.gist.files);
            const fileName = fileNames.length === 1
                ? fileNames[0]
                : await vscode.window.showQuickPick(fileNames, {
                    placeHolder: 'Select a file to update'
                });

            if (!fileName) {
                return;
            }

            const content = editor.document.getText(
                editor.selection.isEmpty ? undefined : editor.selection
            );

            if (!content.trim()) {
                vscode.window.showErrorMessage('Content cannot be empty');
                return;
            }

            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Updating Gist...' },
                () => gistService.updateGist(
                    selected.gist.id,
                    selected.gist.description || '',
                    { [fileName]: { content } }
                )
            );

            vscode.window.showInformationMessage('Gist updated successfully!');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to update Gist: ${error}`);
    }
}

async function deleteGist(): Promise<void> {
    try {
        const gists = await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loading Gists...' },
            () => gistService.listGists()
        );

        if (gists.length === 0) {
            vscode.window.showInformationMessage('No Gists found.');
            return;
        }

        const items = gists.map(gist => ({
            label: gist.description || Object.keys(gist.files)[0] || 'Untitled',
            description: `${Object.keys(gist.files).length} file(s) - ${gist.public ? 'Public' : 'Secret'}`,
            detail: Object.keys(gist.files).join(', '),
            gist
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a Gist to delete'
        });

        if (!selected) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete "${selected.label}"?`,
            { modal: true },
            'Delete'
        );

        if (confirm !== 'Delete') {
            return;
        }

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Deleting Gist...' },
            () => gistService.deleteGist(selected.gist.id)
        );

        vscode.window.showInformationMessage('Gist deleted successfully!');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete Gist: ${error}`);
    }
}

export function deactivate() {}
