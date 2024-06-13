import { SimpleGit } from 'simple-git';
import vscode from 'vscode';

export const getGitHubRemote = async (git: SimpleGit) => {
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
