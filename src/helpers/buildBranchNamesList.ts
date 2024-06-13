import { SimpleGit } from 'simple-git';

export const buildBranchNamesList = async (git: SimpleGit, remoteBranchNames: string[]) => {
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
