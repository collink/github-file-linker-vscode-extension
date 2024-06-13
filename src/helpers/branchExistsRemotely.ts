export const branchExistsRemotely = async (selectedBranchName: string, remoteBranchNames: string[]) =>
    remoteBranchNames.includes(selectedBranchName);
