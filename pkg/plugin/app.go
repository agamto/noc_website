package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/main/noc-app/pkg/plugin/auth"
)

// defaultGrafanaDataPath is the EFS-backed Grafana data directory used when GF_PATHS_DATA is absent.
const defaultGrafanaDataPath = "/var/lib/grafana"

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
		// GF_PATHS_DATA is not forwarded to plugin processes, and os.TempDir() is ephemeral
		// on Fargate, so fall back to the EFS-backed Grafana data directory.
		dataPath := os.Getenv("GF_PATHS_DATA")
		if dataPath == "" {
			dataPath = defaultGrafanaDataPath
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

// healthCheckProbe is written and removed to verify write access. It must end in .md to
// satisfy safeDocumentPath, so it is deleted immediately after the write succeeds.
const healthCheckProbe = ".grafana-health-check.md"

// CheckHealth handles health checks sent from Grafana to the plugin.
// It exercises the configured storage end to end: listing proves read access, and the
// probe write proves the credentials can actually create and remove documents.
func (a *App) CheckHealth(ctx context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	if a.documentStore == nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: "Document storage is not configured",
		}, nil
	}

	// Bound the check so a credential or network stall fails fast instead of hanging the UI.
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	if _, err := a.documentStore.ListDocuments(ctx, ""); err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("Cannot read from document storage: %s", err),
		}, nil
	}

	if err := a.documentStore.Put(ctx, healthCheckProbe, ""); err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("Cannot write to document storage: %s", err),
		}, nil
	}

	if err := a.documentStore.Delete(ctx, healthCheckProbe); err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("Cannot delete from document storage: %s", err),
		}, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Document storage is readable and writable",
	}, nil
}
