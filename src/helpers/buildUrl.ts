import vscode from 'vscode';

export const buildUrl = (baseUrl: string, branch: string, filePath: string, selection: vscode.Selection) => {
    let url = `${baseUrl}/blob/${branch}/${filePath}`;

    if (selection) {
        const startLine = selection.start.line + 1;
        const endLine = selection.end.line + 1;

        if (startLine === endLine) {
            url += `#L${startLine}`;
        } else {
            url += `#L${startLine}-L${endLine}`;
        }
    }

    return url;
};
