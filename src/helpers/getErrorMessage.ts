import { ErrorType } from '../entities/errorType';

export const getErrorMessage = (errorType: ErrorType) => {
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
