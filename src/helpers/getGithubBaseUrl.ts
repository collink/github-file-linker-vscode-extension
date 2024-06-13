import { RemoteWithRefs } from 'simple-git';

export const getGithubBaseUrl = (remote: RemoteWithRefs) => {
    const baseUrl = remote.refs.push.replace(/^git@github\.com:(.*)\.git$/, 'https://github.com/$1');

    return baseUrl;
};
