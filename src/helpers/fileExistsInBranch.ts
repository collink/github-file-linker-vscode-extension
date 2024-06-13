import { SimpleGit } from 'simple-git';

export const fileExistsInBranch = async (git: SimpleGit, filePath: string, branch: string) => {
    try {
        await git.catFile(['-e', `${branch}:${filePath}`]);
        return true;
    } catch (error) {
        return false;
    }
};
