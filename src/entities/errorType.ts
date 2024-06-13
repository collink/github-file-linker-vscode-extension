export const ErrorType = {
    BranchDoesntExistRemotely: 'BranchDoesntExistRemotely',
    FileNotInGitHubRepository: 'FileNotInGitHubRepository',
    FileNotInRepository: 'FileNotInRepository',
    FileNotInSelectedBranch: 'FileNotInSelectedBranch',
    NoFileOpen: 'NoFileOpen',
} as const;

export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];
