import React, { ChangeEvent, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { css } from '@emotion/css';
import { AppPluginMeta, GrafanaTheme2, PluginConfigPageProps, PluginMeta, SelectableValue } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { Alert, Button, Combobox, ComboboxOption, Field, FieldSet, Input, RadioButtonGroup, SecretInput, useStyles2 } from '@grafana/ui';
import {testIds} from '../testIds'
// Keys mirror what grafana-aws-sdk's awsds.AWSDatasourceSettings unmarshals from jsonData.
type AwsAuthType = 'default' | 'credentials' | 'keys' | 'ec2_iam_role';

const storageTypeOptions: Array<SelectableValue<'local' | 's3'>> = [
  { label: 'Local filesystem', value: 'local' },
  { label: 'Amazon S3', value: 's3' },
];

const awsAuthTypeOptions: Array<ComboboxOption<AwsAuthType>> = [
  { label: 'AWS SDK Default', value: 'default' },
  { label: 'Credentials file', value: 'credentials' },
  { label: 'Access & secret key', value: 'keys' },
  { label: 'EC2 IAM Role', value: 'ec2_iam_role' },
];

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
  authType?: AwsAuthType;
  profile?: string;
  assumeRoleARN?: string;
  externalId?: string;
  endpoint?: string;
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
  authType: AwsAuthType;
  profile: string;
  assumeRoleARN: string;
  externalId: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  isAccessKeySet: boolean;
  isSecretKeySet: boolean;
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
    authType: jsonData?.authType || 'default',
    profile: jsonData?.profile || '',
    assumeRoleARN: jsonData?.assumeRoleARN || '',
    externalId: jsonData?.externalId || '',
    endpoint: jsonData?.endpoint || '',
    accessKey: '',
    secretKey: '',
    isAccessKeySet: Boolean(secureJsonFields?.accessKey),
    isSecretKeySet: Boolean(secureJsonFields?.secretKey),
  });
  const isStorageSubmitDisabled = storageState.documentStorage === 's3' && !storageState.documentS3Bucket;
  const [storageTest, setStorageTest] = useState<{ status: 'idle' | 'testing' | 'ok' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

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
        ...jsonData,
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
  const onStorageSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isStorageSubmitDisabled) {
      return;
    }
    const secureJsonData: Record<string, string> = {};
    if (storageState.authType === 'keys') {
      if (storageState.accessKey) {
        secureJsonData.accessKey = storageState.accessKey;
      }
      if (storageState.secretKey) {
        secureJsonData.secretKey = storageState.secretKey;
      }
    }

    setStorageTest({ status: 'testing', message: 'Saving and testing...' });
    try {
      await updatePlugin(plugin.meta.id, {
        enabled,
        pinned,
        jsonData: {
          ...jsonData,
          documentStorage: storageState.documentStorage,
          documentS3Bucket: storageState.documentS3Bucket,
          documentS3Prefix: storageState.documentS3Prefix,
          documentS3Region: storageState.documentS3Region,
          authType: storageState.authType,
          profile: storageState.authType === 'credentials' ? storageState.profile : '',
          assumeRoleARN: storageState.assumeRoleARN,
          externalId: storageState.externalId,
          endpoint: storageState.endpoint,
        },
        secureJsonData: Object.keys(secureJsonData).length ? secureJsonData : undefined,
      });
      const health = await checkPluginHealth(plugin.meta.id);
      setStorageTest({ status: 'ok', message: health });
    } catch (error) {
      setStorageTest({ status: 'error', message: healthErrorMessage(error) });
    }
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
              <RadioButtonGroup
                options={storageTypeOptions}
                value={storageState.documentStorage}
                onChange={(documentStorage) =>
                  setStorageState((previous) => ({ ...previous, documentStorage: documentStorage ?? 'local' }))
                }
              />
            </div>
        </Field>
        {storageState.documentStorage === 's3' && (
          <>
            <Field label="S3 bucket" description="S3 bucket used for document storage (configure AWS auth below)." className={s.marginTop}>
              <Input
                width={60}
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
                width={60}
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
                width={60}
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
            <Field label="Auth Provider" description="How the plugin obtains AWS credentials." className={s.marginTop}>
              <Combobox
                id="aws-auth-type"
                data-testid="aws-auth-type"
                width={40}
                options={awsAuthTypeOptions}
                value={storageState.authType}
                onChange={(option) =>
                  setStorageState((previous) => ({ ...previous, authType: option.value }))
                }
              />
            </Field>
            {storageState.authType === 'credentials' && (
              <Field label="Credentials Profile Name" description="Profile within the shared credentials file." className={s.marginTop}>
                <Input
                  width={60}
                  value={storageState.profile}
                  data-testid="aws-profile"
                  id="aws-profile"
                  name="profile"
                  placeholder="default"
                  onChange={(event) => {
                    const profile = event.currentTarget.value.trim();
                    setStorageState((previous) => ({ ...previous, profile }));
                  }}
                />
              </Field>
            )}
            {storageState.authType === 'keys' && (
              <>
                <Field label="Access Key ID" className={s.marginTop}>
                  <SecretInput
                    width={60}
                    value={storageState.accessKey}
                    data-testid="aws-access-key"
                    id="aws-access-key"
                    isConfigured={storageState.isAccessKeySet}
                    placeholder="AKIA..."
                    onChange={(event) => {
                      const accessKey = event.currentTarget.value.trim();
                      setStorageState((previous) => ({ ...previous, accessKey }));
                    }}
                    onReset={() =>
                      setStorageState((previous) => ({ ...previous, accessKey: '', isAccessKeySet: false }))
                    }
                  />
                </Field>
                <Field label="Secret Access Key" className={s.marginTop}>
                  <SecretInput
                    width={60}
                    value={storageState.secretKey}
                    data-testid="aws-secret-key"
                    id="aws-secret-key"
                    isConfigured={storageState.isSecretKeySet}
                    placeholder="your secret access key"
                    onChange={(event) => {
                      const secretKey = event.currentTarget.value.trim();
                      setStorageState((previous) => ({ ...previous, secretKey }));
                    }}
                    onReset={() =>
                      setStorageState((previous) => ({ ...previous, secretKey: '', isSecretKeySet: false }))
                    }
                  />
                </Field>
              </>
            )}
            <Field label="Assume Role ARN" description="Optional; ARN of a role to assume." className={s.marginTop}>
              <Input
                width={60}
                value={storageState.assumeRoleARN}
                data-testid="aws-assume-role-arn"
                id="aws-assume-role-arn"
                name="assumeRoleARN"
                placeholder="arn:aws:iam::123456789012:role/noc-documents"
                onChange={(event) => {
                  const assumeRoleARN = event.currentTarget.value.trim();
                  setStorageState((previous) => ({ ...previous, assumeRoleARN }));
                }}
              />
            </Field>
            <Field label="External ID" description="Optional; required by some assume-role trust policies." className={s.marginTop}>
              <Input
                width={60}
                value={storageState.externalId}
                data-testid="aws-external-id"
                id="aws-external-id"
                name="externalId"
                placeholder="external id"
                onChange={(event) => {
                  const externalId = event.currentTarget.value.trim();
                  setStorageState((previous) => ({ ...previous, externalId }));
                }}
              />
            </Field>
            <Field label="Endpoint" description="Optional; override the S3 endpoint URL." className={s.marginTop}>
              <Input
                width={60}
                value={storageState.endpoint}
                data-testid="aws-endpoint"
                id="aws-endpoint"
                name="endpoint"
                placeholder="https://s3.amazonaws.com"
                onChange={(event) => {
                  const endpoint = event.currentTarget.value.trim();
                  setStorageState((previous) => ({ ...previous, endpoint }));
                }}
              />
            </Field>
          </>
        )}
        <div className={s.marginTop}>
          <Button title="Save document storage" type="submit" data-testid="save-document-storage" disabled={isStorageSubmitDisabled || storageTest.status === 'testing'}>
            {storageTest.status === 'testing' ? 'Saving & testing...' : 'Save & test'}
          </Button>
          {storageTest.status !== 'idle' && (
            <div className={s.marginTop} data-testid="storage-test-result">
              <Alert
                severity={storageTest.status === 'error' ? 'error' : storageTest.status === 'ok' ? 'success' : 'info'}
                title={storageTest.message}
              />
            </div>
          )}
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

// Saving settings restarts the plugin backend, so the first health call can land mid-restart.
const checkPluginHealth = async (pluginId: string): Promise<string> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const health = await getBackendSrv().get<{ message?: string }>(`/api/plugins/${pluginId}/health`);
      return health?.message || 'Document storage is reachable';
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
};

const healthErrorMessage = (error: unknown): string => {
  const data = (error as { data?: { message?: string; error?: string } })?.data;
  return data?.message || data?.error || 'Unable to reach document storage';
};
