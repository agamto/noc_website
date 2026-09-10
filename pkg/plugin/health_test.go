package plugin

import "testing"

// The probe is written through the same validation as user documents, so a name that
// fails validation makes CheckHealth report a write failure on healthy storage.
func TestHealthCheckProbeIsAcceptedByBothStores(t *testing.T) {
	if _, err := safeDocumentPath("/var/lib/grafana/docs", healthCheckProbe); err != nil {
		t.Errorf("local store rejected health check probe %q: %v", healthCheckProbe, err)
	}
	if _, err := safeS3RelativePath(healthCheckProbe, true); err != nil {
		t.Errorf("s3 store rejected health check probe %q: %v", healthCheckProbe, err)
	}
}
