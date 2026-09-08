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
  documentStorage?: 'local' | 's3';
  documentS3Bucket?: string;
  documentS3Prefix?: string;
  documentS3Region?: string;
};
type DBState = {
  host: string;
  port: number;
  user: string;
  password: string;
  isPasswordSet: boolean;
  dbname: string;
}
type DocumentStorageState = {
  documentStorage: 'local' | 's3';
  documentS3Bucket: string;
  documentS3Prefix: string;
  documentS3Region: string;
};
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
  const [storageState, setStorageState] = useState<DocumentStorageState>({
    documentStorage: jsonData?.documentStorage === 's3' ? 's3' : 'local',
    documentS3Bucket: jsonData?.documentS3Bucket || '',
    documentS3Prefix: jsonData?.documentS3Prefix || '',
    documentS3Region: jsonData?.documentS3Region || '',
  });
  const isStorageSubmitDisabled = storageState.documentStorage === 's3' && !storageState.documentS3Bucket;

  const onResetDBPassword= () =>
    setDBState({
      ...DBstate,
      password: '',
      isPasswordSet: false,
    });
  const onDBChange = (event: ChangeEvent<HTMLInputElement>) => {
  setDBState({...DBstate, [event.target.name]: event.target.value.trim()});
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        documentStorage: jsonData?.documentStorage,
        documentS3Bucket: jsonData?.documentS3Bucket,
        documentS3Prefix: jsonData?.documentS3Prefix,
        documentS3Region: jsonData?.documentS3Region,
      },
      // This cannot be queried later by the frontend.
      // We don't want to override it in case it was set previously and left untouched now.
      secureJsonData: Object.keys(secureJsonData).length ? secureJsonData : undefined,
    });
  };
  const onStorageSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isStorageSubmitDisabled) {
      return;
    }
    updatePluginAndReload(plugin.meta.id, {
      enabled,
      pinned,
      jsonData: {
        ...jsonData,
        documentStorage: storageState.documentStorage,
        documentS3Bucket: storageState.documentS3Bucket,
        documentS3Prefix: storageState.documentS3Prefix,
        documentS3Region: storageState.documentS3Region,
      },
    });
  };

  return (
    <>
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
      <form onSubmit={onStorageSubmit}>
      <FieldSet label="Document storage" className={s.marginTop}>
          <Field label="Storage type">
            <div data-testid="document-storage-type">
              <label>
                <input
                  type="radio"
                  name="documentStorage"
                  value="local"
                  checked={storageState.documentStorage === 'local'}
                  onChange={() => setStorageState((previous) => ({ ...previous, documentStorage: 'local' }))}
                />
                Local filesystem
              </label>
              <label>
                <input
                  type="radio"
                  name="documentStorage"
                  value="s3"
                  checked={storageState.documentStorage === 's3'}
                  onChange={() => setStorageState((previous) => ({ ...previous, documentStorage: 's3' }))}
                />
                Amazon S3
              </label>
            </div>
        </Field>
        {storageState.documentStorage === 's3' && (
          <>
            <Field label="S3 bucket" description="Uses the ECS task role; do not enter AWS access keys." className={s.marginTop}>
              <Input
                value={storageState.documentS3Bucket}
                data-testid="document-s3-bucket"
                id="document-s3-bucket"
                name="documentS3Bucket"
                placeholder="noc-public-cloud-documents"
                onChange={(event) => {
                  const documentS3Bucket = event.currentTarget.value.trim();
                  setStorageState((previous) => ({ ...previous, documentS3Bucket }));
                }}
              />
            </Field>
            <Field label="S3 prefix" description="Optional folder prefix inside the bucket." className={s.marginTop}>
              <Input
                value={storageState.documentS3Prefix}
                data-testid="document-s3-prefix"
                id="document-s3-prefix"
                name="documentS3Prefix"
                placeholder="production/grafana-documents"
                onChange={(event) => {
                  const documentS3Prefix = event.currentTarget.value.trim();
                  setStorageState((previous) => ({ ...previous, documentS3Prefix }));
                }}
              />
            </Field>
            <Field label="AWS region" description="Optional; defaults to the ECS AWS_REGION environment variable." className={s.marginTop}>
              <Input
                value={storageState.documentS3Region}
                data-testid="document-s3-region"
                id="document-s3-region"
                name="documentS3Region"
                placeholder="il-central-1"
                onChange={(event) => {
                  const documentS3Region = event.currentTarget.value.trim();
                  setStorageState((previous) => ({ ...previous, documentS3Region }));
                }}
              />
            </Field>
          </>
        )}
        <div className={s.marginTop}>
          <Button title="Save document storage" type="submit" data-testid="save-document-storage" disabled={isStorageSubmitDisabled}>
            Save document storage
          </Button>
        </div>
      </FieldSet>
      </form>
    </>
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
