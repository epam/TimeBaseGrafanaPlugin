import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import ReplaceInFileWebpackPlugin from 'replace-in-file-webpack-plugin';
import grafanaConfig from './.config/webpack/webpack.config';
import { DIST_DIR } from './.config/webpack/constants';
import { getPackageJson } from './.config/webpack/utils';

/**
 * Extends the Grafana scaffolded webpack config.
 * Externalizing jsx-runtime is required for Grafana 13 (React 19):
 * bundling React 18's react/jsx-runtime causes:
 * TypeError: Cannot read properties of undefined (reading 'ReactCurrentOwner')
 *
 * SystemJS provides these modules starting from Grafana 11.6.11 / 12.0.10 / …
 * Older versions (e.g. 11.3) fail silently: ConfigEditor does not render,
 * UI shows "Type: undefined".
 *
 * @see https://grafana.com/developers/plugin-tools/migration-guides/update-from-grafana-versions/migrate-12_x-to-13_x
 */
const config = async (env: unknown): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    externals: ['react/jsx-runtime', 'react/jsx-dev-runtime'],
    plugins: [
      // Base config only rewrites top-level dist/plugin.json
      new ReplaceInFileWebpackPlugin([
        {
          dir: DIST_DIR,
          files: ['utils/plugin.json'],
          rules: [
            {
              search: /%VERSION%/g,
              replace: getPackageJson().version,
            },
            {
              search: /%TODAY%/g,
              replace: new Date().toISOString().substring(0, 10),
            },
          ],
        },
      ]),
    ],
  });
};

export default config;
