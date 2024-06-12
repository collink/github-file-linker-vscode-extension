import * as vscode from 'vscode';
import simpleGit, { RemoteWithRefs, SimpleGit } from 'simple-git';
import * as path from 'path';
import { get } from 'http';

const editor = vscode.window.activeTextEditor;

enum ErrorType {
    NoFileOpen,
    FileNotInRepository,
    FileNotInGitHubRepository,
}

const getErrorMessage = (errorType: ErrorType) => {
    switch (errorType) {
        case ErrorType.NoFileOpen:
        case ErrorType.FileNotInRepository:
        case ErrorType.FileNotInGitHubRepository:
            return 'Open a file in a GitHub repository';
    }
};

const showError = (errorType: ErrorType) => {
    const errorMessage = getErrorMessage(errorType);

    if (!errorMessage) {
        return;
    }

    vscode.window.showErrorMessage(errorMessage);
};

const getRepoRootPath = async (filePath: string) => {
    const fileParentDirectory = path.dirname(filePath);

    const repoRoot = await simpleGit(fileParentDirectory).revparse(['--show-toplevel']);

    return repoRoot;
};

const getGitHubRemote = async (git: SimpleGit) => {
    const remotes = await git.getRemotes(true);

    const githubRemotes = remotes.filter((remote) => remote.refs.push.includes('github.com'));

    if (!githubRemotes?.length) {
        throw new Error('No GitHub remotes found');
    }

    let remote = githubRemotes.find((remote) => remote.name === 'origin');
    if (!remote) {
        remote = githubRemotes[0];
    }

    return remote;
};

const getGithubBaseUrl = (remote: RemoteWithRefs) => {
    const baseUrl = remote.refs.push.replace(/^git@github\.com:(.*)\.git$/, 'https://github.com/$1');

    return baseUrl;
};

const getFilePathRelativeToRepoRoot = (filePath: string, repoRoot: string) => {
    const filePathRelativeToRepo = path.relative(repoRoot, filePath);

    return filePathRelativeToRepo;
};

const getBranches = async (git: SimpleGit) => {
    const defaultBranchNames = ['master', 'main'];

    const currentBranchName = (await git.branchLocal()).current;
    const branches = (await git.branch()).all || [];

    branches.sort((a, b) => {
        const aIsDefaultBranch = defaultBranchNames.includes(a);
        const bIsDefaultBranch = defaultBranchNames.includes(b);

        if (a === currentBranchName) {
            return -1;
        }

        if (b === currentBranchName) {
            return 1;
        }

        if (aIsDefaultBranch && !bIsDefaultBranch) {
            return -1;
        }

        if (!aIsDefaultBranch && bIsDefaultBranch) {
            return 1;
        }

        return a.localeCompare(b);
    });

    return branches;
};

const buildUrl = (baseUrl: string, branch: string, filePath: string, selection: vscode.Selection) => {
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

const copyUrlToClipboard = async (url: string) => {
    await vscode.env.clipboard.writeText(url);
};

export const activate = (context: vscode.ExtensionContext) => {
    const disposable = vscode.commands.registerCommand('github-file-linker.getLinkToFile', async () => {
        const filePath = editor?.document?.fileName;

        if (!filePath) {
            showError(ErrorType.NoFileOpen);
            return;
        }

        const fileParentDirectory = path.dirname(filePath);

        let repoRoot: string;
        try {
            repoRoot = await getRepoRootPath(fileParentDirectory);
        } catch (error) {
            showError(ErrorType.FileNotInRepository);
            return;
        }

        const git = simpleGit(repoRoot);

        let remote: RemoteWithRefs;

        try {
            remote = await getGitHubRemote(git);
        } catch (error) {
            showError(ErrorType.FileNotInGitHubRepository);
            return;
        }

        const relativeFilePath = getFilePathRelativeToRepoRoot(filePath, repoRoot);
        const ghBaseUrl = getGithubBaseUrl(remote);

        const branches = await getBranches(git);

        const selectedBranch = await vscode.window.showQuickPick(branches);

        if (!selectedBranch) {
            return;
        }

        const selection = editor.selection;

        const url = buildUrl(ghBaseUrl, selectedBranch, relativeFilePath, selection);

        try {
            await copyUrlToClipboard(url);

            vscode.window.showInformationMessage('Copied GitHub URL for current file to clipboard');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to copy GitHub URL for current file to clipboard');
        }
    });

    context.subscriptions.push(disposable);
};

// This method is called when your extension is deactivated
export const deactivate = () => {};
