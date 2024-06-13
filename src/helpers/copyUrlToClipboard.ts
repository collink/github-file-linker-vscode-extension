import vscode from 'vscode';

export const copyUrlToClipboard = async (url: string) => {
    await vscode.env.clipboard.writeText(url);
};
