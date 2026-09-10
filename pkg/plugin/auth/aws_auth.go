package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/grafana/grafana-aws-sdk/pkg/awsauth"
	"github.com/grafana/grafana-aws-sdk/pkg/awsds"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/proxy"
)

// PluginSettings wraps standard Grafana AWS datasource settings along with any plugin-specific fields.
type PluginSettings struct {
	awsds.AWSDatasourceSettings

	// SecureSocksProxyEnabled indicates whether secure socks proxy is configured for this datasource instance.
	SecureSocksProxyEnabled bool `json:"enableSecureSocksProxy"`

	// CustomSetting is an example placeholder for any custom setting your plugin receives from JSONData.
	CustomSetting string `json:"customSetting,omitempty"`

	// GrafanaSettings are server-level AWS auth configurations loaded from the request context.
	GrafanaSettings awsds.AuthSettings `json:"-"`
}

// LoadPluginSettings parses and loads backend.DataSourceInstanceSettings into PluginSettings.
func LoadPluginSettings(ctx context.Context, config backend.DataSourceInstanceSettings) (PluginSettings, error) {
	instance := PluginSettings{}

	// 1. Unmarshal JSONData into struct if present
	if len(config.JSONData) > 1 {
		if err := json.Unmarshal(config.JSONData, &instance); err != nil {
			return PluginSettings{}, fmt.Errorf("could not unmarshal datasource settings json: %w", err)
		}
	}

	// 2. Load standard AWS settings (credentials from DecryptedSecureJSONData, auth type, assume role, external ID, etc.)
	if err := instance.Load(config); err != nil {
		return PluginSettings{}, err
	}

	// 3. Read server-level AWS auth configuration from request context
	authSettings, _ := awsds.ReadAuthSettingsFromContext(ctx)
	if authSettings != nil {
		instance.GrafanaSettings = *authSettings
	}

	return instance, nil
}

// AWSClientProvider manages creating authenticated AWS SDK v2 configurations and clients for Grafana datasources.
type AWSClientProvider struct {
	Settings          PluginSettings
	ProxyOpts         *proxy.Options
	AWSConfigProvider awsauth.ConfigProvider
}

// NewAWSClientProvider creates a new AWS client provider configured from datasource instance settings.
func NewAWSClientProvider(ctx context.Context, settings backend.DataSourceInstanceSettings) (*AWSClientProvider, error) {
	pluginSettings, err := LoadPluginSettings(ctx, settings)
	if err != nil {
		return nil, fmt.Errorf("error loading plugin settings: %w", err)
	}

	opts, err := settings.HTTPClientOptions(ctx)
	if err != nil {
		return nil, fmt.Errorf("error reading HTTP client options: %w", err)
	}

	return &AWSClientProvider{
		Settings:          pluginSettings,
		ProxyOpts:         opts.ProxyOptions,
		AWSConfigProvider: awsauth.NewConfigProvider(),
	}, nil
}

// GetAWSConfig builds an authenticated aws.Config for the given region using the Grafana AWS SDK.
func (p *AWSClientProvider) GetAWSConfig(ctx context.Context, region string) (aws.Config, error) {
	// Fall back to default configured region if empty or "default"
	if region == "" || region == "default" {
		if len(p.Settings.Region) == 0 {
			return aws.Config{}, errors.New("missing region in datasource settings")
		}
		region = p.Settings.Region
	}

	authSettings := awsauth.Settings{
		CredentialsProfile:         p.Settings.Profile,
		LegacyAuthType:             p.Settings.AuthType,
		AssumeRoleARN:              p.Settings.AssumeRoleARN,
		ExternalID:                 p.Settings.ExternalID,
		GrafanaExternalID:          p.Settings.GrafanaExternalID,
		UsePerDatasourceExternalID: p.Settings.UsePerDatasourceExternalID,
		Endpoint:                   p.Settings.Endpoint,
		Region:                     region,
		AccessKey:                  p.Settings.AccessKey,
		SecretKey:                  p.Settings.SecretKey,
		SessionToken:               p.Settings.SessionToken,
		HTTPClient:                 &http.Client{},
	}

	// Handle Secure Socks Proxy if enabled
	if p.Settings.GrafanaSettings.SecureSocksDSProxyEnabled && p.Settings.SecureSocksProxyEnabled {
		authSettings.ProxyOptions = p.ProxyOpts
	}

	// Handle per-datasource HTTP proxy settings
	// Only set when a proxy is actually configured; a non-nil value with an empty ProxyType
	// installs a dialer that breaks the AWS credential chain.
	if p.Settings.ProxyType != "" {
		authSettings.PerDatasourceProxySettings = &awsauth.PerDatasourceProxySettings{
			ProxyType:     awsauth.ProxyType(p.Settings.ProxyType),
			ProxyUrl:      p.Settings.ProxyUrl,
			ProxyUsername: p.Settings.ProxyUsername,
			ProxyPassword: p.Settings.ProxyPassword,
		}
	}

	// Diagnostic: records which credential source the SDK actually selected.
	// Presence only - the container credentials URI is a secret-bearing path.
	logger := backend.Logger.FromContext(ctx)
	logger.Info("resolving AWS credentials",
		"authType", string(authSettings.GetAuthType()),
		"region", region,
		"hasContainerRelativeURI", os.Getenv("AWS_CONTAINER_CREDENTIALS_RELATIVE_URI") != "",
		"hasContainerFullURI", os.Getenv("AWS_CONTAINER_CREDENTIALS_FULL_URI") != "",
		"hasWebIdentityToken", os.Getenv("AWS_WEB_IDENTITY_TOKEN_FILE") != "",
		"imdsDisabled", os.Getenv("AWS_EC2_METADATA_DISABLED"),
		"hasStaticKeys", p.Settings.AccessKey != "",
	)

	cfg, err := p.AWSConfigProvider.GetConfig(ctx, authSettings)
	if err != nil {
		return aws.Config{}, err
	}

	if creds, credErr := cfg.Credentials.Retrieve(ctx); credErr != nil {
		logger.Error("AWS credential retrieval failed", "error", credErr)
	} else {
		logger.Info("AWS credentials resolved", "source", creds.Source)
	}

	return cfg, nil
}
