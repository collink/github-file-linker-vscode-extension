import simpleGit from 'simple-git';

export const getRepoRootPath = async (fileParentDirectory: string) => {
    const repoRoot = await simpleGit(fileParentDirectory).revparse(['--show-toplevel']);

    return repoRoot;
};
