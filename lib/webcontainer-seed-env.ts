/**
 * Files and snippets seeded into WebContainer so npm/npx work reliably.
 * ERR_INVALID_PROTOCOL (https vs http) usually comes from proxy env vars or npm proxy config.
 */

const SHELL_INIT = `umask 022
mkdir -p "$HOME/.npm/_logs" "$HOME/.npm-cache" "$HOME/tmp" 2>/dev/null || true
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY FTP_PROXY SOCKS_PROXY
unset NPM_CONFIG_PROXY NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY
unset npm_config_proxy npm_config_https_proxy npm_config_http_proxy
export NPM_CONFIG_REGISTRY="https://registry.npmjs.org/"
`;

/**
 * Do not set proxy= or https-proxy= to empty strings — npm treats that as invalid
 * ("Must be full url with http://"). Omit proxy keys entirely; rely on shell unsets for env.
 *
 * Use absolute cache path; npm does not expand ${HOME} in .npmrc.
 */
export const WEBCONTAINER_NPMRC = `registry=https://registry.npmjs.org/
cache=/workspace/home/user/.npm-cache
maxsockets=1
fetch-retries=5
`;

/** Login shells (`bash -l`): run before npm so child processes inherit a clean environment. */
export const WEBCONTAINER_USER_PROFILE = `# nl2shell — WebContainer npm/network hygiene
${SHELL_INIT}
`;

/** Interactive non-login shells. */
export const WEBCONTAINER_USER_BASHRC = `# nl2shell — WebContainer npm/network hygiene
${SHELL_INIT}
`;
