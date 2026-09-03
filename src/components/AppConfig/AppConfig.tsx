import React, { ChangeEvent, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { css } from '@emotion/css';
import { AppPluginMeta, GrafanaTheme2, PluginConfigPageProps, PluginMeta } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { Button, Field, FieldSet, Input, SecretInput, useStyles2 } from '@grafana/ui';
import {testIds} from '../testIds'
type AppPluginSettings = {
  apiUrl?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  isPasswordSet?: boolean;
  dbname?: string;
};
type DBState = {
  host: string;
  port: number;
  user: string;
  password: string;
  isPasswordSet: boolean;
  dbname: string;
}
export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta<AppPluginSettings>> {}

const AppConfig = ({ plugin }: AppConfigProps) => {
  const s = useStyles2(getStyles);
  const { enabled, pinned, jsonData, secureJsonFields } = plugin.meta;
  const [DBstate, setDBState] = useState<DBState>({
    host: jsonData?.host || '',
    port: jsonData?.port || 5432,
    user: jsonData?.user || '',
    password: '',
    isPasswordSet: Boolean(secureJsonFields?.password),
    dbname: jsonData?.dbname || '',
  });
  const isDBSubmitDisabled = Boolean(!DBstate.host || !DBstate.user || (!DBstate.password && !DBstate.isPasswordSet) || !DBstate.port);

  const onResetDBPassword= () =>
    setDBState({
      ...DBstate,
      password: '',
      isPasswordSet: false,
    });
  const onDBChange = (event: ChangeEvent<HTMLInputElement>) => {
  setDBState({...DBstate, [event.target.name]: event.target.value.trim()});
  };

  const onSubmit = () => {
    if (isDBSubmitDisabled) {
      return;
    }
    const secureJsonData: Record<string, string> = {};
    if (DBstate.password) {secureJsonData.password = DBstate.password; }
    updatePluginAndReload(plugin.meta.id, {
      enabled,
      pinned,
      jsonData: {
        host: DBstate.host,
        port: DBstate.port,
        user: DBstate.user,
        dbname: DBstate.dbname,
      },
      // This cannot be queried later by the frontend.
      // We don't want to override it in case it was set previously and left untouched now.
      secureJsonData: Object.keys(secureJsonData).length ? secureJsonData : undefined,
    });
  };

  return (
    <form onSubmit={onSubmit}>
      <FieldSet label="DB Settings">
        <Field label="host" description="" className={s.marginTop}>
          <Input
            width={60}
            name="host"
            data-testid={testIds.appConfig.host}
            id="dbhost"
            value={DBstate.host}
            placeholder={`E.g.: mydbinstance.123456789012.us-east-1.rds.amazonaws.com`}
            onChange={onDBChange}
          />
        </Field>
        <Field label="port" description="" className={s.marginTop}>
          <Input
            width={60}
            name="port"
            data-testid={testIds.appConfig.port}
            id="dbport"
            value={DBstate.port}
            placeholder={`E.g.: 5432`}
            onChange={onDBChange}
          />
        </Field>
        <Field label="dbname" description="" className={s.marginTop}>
          <Input
            width={60}
            name="dbname"
            id="dbname"
            data-testid={testIds.appConfig.dbname}
            value={DBstate.dbname}
            placeholder={`E.g.: grafanadb`}
            onChange={onDBChange}
          />
        </Field>
        <Field label="user" description="" className={s.marginTop}>
          <Input
            width={60}
            name="user"
            id="user"
            data-testid={testIds.appConfig.user}
            value={DBstate.user}
            placeholder={`E.g.: grafanauser`}
            onChange={onDBChange}
          />
        </Field>
        <Field label="password" description="A secret key for authenticating to our custom API">
          <SecretInput
            width={60}
            id="password"
            name="password"
            data-testid={testIds.appConfig.password}
            value={DBstate.password}
            isConfigured={DBstate.isPasswordSet}
            placeholder={'your db password'}
            onChange={onDBChange}
            onReset={onResetDBPassword}
          />
        </Field>
        <div className={s.marginTop}>
          <Button title="Save DB settings" type="submit" data-testid="save-db-settings" disabled={isDBSubmitDisabled}>
            Save DB settings
          </Button>
        </div>
      </FieldSet>
    </form>
  );
};

export default AppConfig;

const getStyles = (theme: GrafanaTheme2) => ({
  colorWeak: css`
    color: ${theme.colors.text.secondary};
  `,
  marginTop: css`
    margin-top: ${theme.spacing(3)};
  `,
});

const updatePluginAndReload = async (pluginId: string, data: Partial<PluginMeta<AppPluginSettings>>) => {
  try {
    await updatePlugin(pluginId, data);

    // Reloading the page as the changes made here wouldn't be propagated to the actual plugin otherwise.
    // This is not ideal, however unfortunately currently there is no supported way for updating the plugin state.
    window.location.reload();
  } catch (e) {
    console.error('Error while updating the plugin', e);
  }
};

const updatePlugin = async (pluginId: string, data: Partial<PluginMeta>) => {
  console.log(data);
  const response = await getBackendSrv().fetch({
    url: `/api/plugins/${pluginId}/settings`,
    method: 'POST',
    data,
  });

  return lastValueFrom(response);
};
