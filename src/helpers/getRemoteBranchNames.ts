import { RemoteWithRefs, SimpleGit } from 'simple-git';

export const getRemoteBranchNames = async (git: SimpleGit, remote: RemoteWithRefs) => {
    const remoteName = remote.name;
    const remoteBranches = (await git.branch(['-r'])).all?.map((branch) => branch.replace(`${remoteName}/`, '')) || [];

    return remoteBranches;
};
