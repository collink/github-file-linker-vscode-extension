import path from 'path';

export const getFilePathRelativeToRepoRoot = (filePath: string, repoRoot: string) => {
    const filePathRelativeToRepo = path.relative(repoRoot, filePath);

    return filePathRelativeToRepo;
};
