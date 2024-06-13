import * as vscode from 'vscode';
import simpleGit, { RemoteWithRefs, SimpleGit } from 'simple-git';
import * as path from 'path';

const editor = vscode.window.activeTextEditor;

enum ErrorType {
    BranchDoesntExistRemotely,
    FileNotInGitHubRepository,
    FileNotInRepository,
    FileNotInSelectedBranch,
    NoFileOpen,
}

const getErrorMessage = (errorType: ErrorType) => {
    switch (errorType) {
        case ErrorType.NoFileOpen:
        case ErrorType.FileNotInRepository:
        case ErrorType.FileNotInGitHubRepository:
            return 'This file must be in a GitHub repository and have been pushed upstream';

        case ErrorType.FileNotInSelectedBranch:
            return 'This file does not exist in the branch you selected';

        case ErrorType.BranchDoesntExistRemotely:
            return 'The branch you selected does not exist in remote repository';

        default:
            return null;
    }
};

const showError = (errorType: ErrorType) => {
    const errorMessage = getErrorMessage(errorType);

    if (!errorMessage) {
        return;
    }

    vscode.window.showErrorMessage(errorMessage);
};

const getRepoRootPath = async (fileParentDirectory: string) => {
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
        const remoteChoices = githubRemotes.map((remote) => `${remote.name} (${remote.refs.push})`);

        const remoteName = await vscode.window.showQuickPick(remoteChoices, {
            title: 'Select the remote to use for the GitHub URL',
        });

        if (!remoteName) {
            return null;
        }

        remote = githubRemotes.find((remote) => remote.name === remoteName);
    }

    return remote || null;
};

const getGithubBaseUrl = (remote: RemoteWithRefs) => {
    const baseUrl = remote.refs.push.replace(/^git@github\.com:(.*)\.git$/, 'https://github.com/$1');

    return baseUrl;
};

const getFilePathRelativeToRepoRoot = (filePath: string, repoRoot: string) => {
    const filePathRelativeToRepo = path.relative(repoRoot, filePath);

    return filePathRelativeToRepo;
};

const getRemoteBranchNames = async (git: SimpleGit, remote: RemoteWithRefs) => {
    const remoteName = remote.name;
    const remoteBranches = (await git.branch(['-r'])).all?.map((branch) => branch.replace(`${remoteName}/`, '')) || [];

    return remoteBranches;
};

const getBranchNames = async (git: SimpleGit, remoteBranchNames: string[]) => {
    const defaultBranchNames = ['master', 'main'];

    const currentBranchName = (await git.branchLocal()).current;

    const branches = [...remoteBranchNames];

    if (!branches.includes(currentBranchName)) {
        branches.unshift(currentBranchName);
    }

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

const branchExistsRemotely = async (selectedBranchName: string, remoteBranchNames: string[]) =>
    remoteBranchNames.includes(selectedBranchName);

const fileExistsInBranch = async (git: SimpleGit, filePath: string, branch: string) => {
    try {
        await git.catFile(['-e', `${branch}:${filePath}`]);
        return true;
    } catch (error) {
        return false;
    }
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

        let remote: RemoteWithRefs | null;

        try {
            remote = await getGitHubRemote(git);

            if (!remote) {
                return;
            }
        } catch (error) {
            showError(ErrorType.FileNotInGitHubRepository);
            return;
        }

        const relativeFilePath = getFilePathRelativeToRepoRoot(filePath, repoRoot);
        const ghBaseUrl = getGithubBaseUrl(remote);

        const remoteBranchNames = await getRemoteBranchNames(git, remote);
        const branchNames = await getBranchNames(git, remoteBranchNames);

        const selectedBranch = await vscode.window.showQuickPick(branchNames, { title: 'Select the branch to link to' });

        if (!selectedBranch) {
            return;
        }

        if (!(await fileExistsInBranch(git, relativeFilePath, selectedBranch))) {
            showError(ErrorType.FileNotInSelectedBranch);
            return;
        }

        if (!(await branchExistsRemotely(selectedBranch, remoteBranchNames))) {
            showError(ErrorType.BranchDoesntExistRemotely);
            return;
        }

        const selection = editor.selection;

        const url = buildUrl(ghBaseUrl, selectedBranch, relativeFilePath, selection);

        await copyUrlToClipboard(url);
        vscode.window.showInformationMessage('Copied GitHub URL for current file to clipboard');
    });

    context.subscriptions.push(disposable);
};

// This method is called when your extension is deactivated
export const deactivate = () => {};
