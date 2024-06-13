import * as path from 'path';
import simpleGit, { RemoteWithRefs } from 'simple-git';
import * as vscode from 'vscode';

import { ErrorType } from './entities/errorType';
import { branchExistsRemotely } from './helpers/branchExistsRemotely';
import { buildBranchNamesList } from './helpers/buildBranchNamesList';
import { buildUrl } from './helpers/buildUrl';
import { copyUrlToClipboard } from './helpers/copyUrlToClipboard';
import { fileExistsInBranch } from './helpers/fileExistsInBranch';
import { getFilePathRelativeToRepoRoot } from './helpers/getFilePathRelativeToRepoRoot';
import { getGithubBaseUrl } from './helpers/getGithubBaseUrl';
import { getGitHubRemote } from './helpers/getGitHubRemote';
import { getRemoteBranchNames } from './helpers/getRemoteBranchNames';
import { getRepoRootPath } from './helpers/getRepoRootPath';
import { showError } from './helpers/showError';

const editor = vscode.window.activeTextEditor;

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
        const branchNames = await buildBranchNamesList(git, remoteBranchNames);

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
