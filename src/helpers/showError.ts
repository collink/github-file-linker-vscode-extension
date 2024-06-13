import * as vscode from 'vscode';

import { getErrorMessage } from './getErrorMessage';

import { ErrorType } from '../entities/errorType';

export const showError = (errorType: ErrorType) => {
    const errorMessage = getErrorMessage(errorType);

    if (!errorMessage) {
        return;
    }

    vscode.window.showErrorMessage(errorMessage);
};
