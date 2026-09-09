package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/main/noc-app/pkg/plugin/auth"
)

// Make sure App implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. Plugin should not implement all these interfaces - only those which are
// required for a particular task.
var (
	_ backend.CallResourceHandler   = (*App)(nil)
	_ instancemgmt.InstanceDisposer = (*App)(nil)
	_ backend.CheckHealthHandler    = (*App)(nil)
)

// App is an example app plugin with a backend which can respond to data queries.
type App struct {
	backend.CallResourceHandler
	settings      backend.AppInstanceSettings
	documentStore DocumentStore
}

// NewApp creates a new example *App instance.
func NewApp(ctx context.Context, settings backend.AppInstanceSettings) (instancemgmt.Instance, error) {
	var storageSettings struct {
		DocumentStorage  string `json:"documentStorage"`
		DocumentS3Bucket string `json:"documentS3Bucket"`
		DocumentS3Prefix string `json:"documentS3Prefix"`
		DocumentS3Region string `json:"documentS3Region"`
	}
	if err := json.Unmarshal(settings.JSONData, &storageSettings); err != nil {
		return nil, fmt.Errorf("parse plugin settings: %w", err)
	}

	var documentStore DocumentStore
	switch storageSettings.DocumentStorage {
	case "", "local":
		dataPath := os.Getenv("GF_PATHS_DATA")
		if dataPath == "" {
			dataPath = os.TempDir()
		}
		docsDir := filepath.Join(dataPath, "plugins", "main-noc-app", "docs")
		if err := os.MkdirAll(docsDir, 0o750); err != nil {
			return nil, err
		}
		documentStore = localDocumentStore{root: docsDir}
	case "s3":
		authProvider, err := auth.NewAWSClientProvider(ctx, backend.DataSourceInstanceSettings{
			JSONData: settings.JSONData,
			DecryptedSecureJSONData: settings.DecryptedSecureJSONData,
		})
		if err != nil {
			return nil, fmt.Errorf("load AWS auth settings: %w", err)
		}
		region := storageSettings.DocumentS3Region
		if region == "" {
			region = os.Getenv("AWS_REGION")
		}
		awsConfig, err := authProvider.GetAWSConfig(ctx, region)
		if err != nil {
			return nil, fmt.Errorf("load AWS configuration: %w", err)
		}
		store, err := newS3DocumentStore(storageSettings.DocumentS3Bucket, storageSettings.DocumentS3Prefix, awsConfig)
		if err != nil {
			return nil, err
		}
		documentStore = store
	default:
		return nil, fmt.Errorf("unsupported document storage: %s", storageSettings.DocumentStorage)
	}

	app := App{documentStore: documentStore}
	app.settings = settings
	// Use a httpadapter (provided by the SDK) for resource calls. This allows us
	// to use a *http.ServeMux for resource calls, so we can map multiple routes
	// to CallResource without having to implement extra logic.
	mux := http.NewServeMux()
	app.registerRoutes(mux)
	app.CallResourceHandler = httpadapter.New(mux)

	return &app, nil
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created.
func (a *App) Dispose() {
	// cleanup
}

// CheckHealth handles health checks sent from Grafana to the plugin.
func (a *App) CheckHealth(_ context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "ok",
	}, nil
}
