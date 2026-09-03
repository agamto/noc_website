import pluginJson from './plugin.json';

export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;

export enum ROUTES {
  Main = 'main',
  Five = 'five',
  CONTACTS = 'contacts',
  DOCS = 'docs',
  DASHBOARDS = 'dashboards'
}
