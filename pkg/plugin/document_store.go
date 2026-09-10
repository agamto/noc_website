package plugin

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"
)

type DocumentStore interface {
	ListFolders(context.Context) ([]string, error)
	CreateFolder(context.Context, string) error
	ListDocuments(context.Context, string) ([]string, error)
	Get(context.Context, string) (string, error)
	Put(context.Context, string, string) error
	Delete(context.Context, string) error
	Move(context.Context, string, string) error
}

type localDocumentStore struct {
	root string
}

func (store localDocumentStore) ListFolders(_ context.Context) ([]string, error) {
	folders := make([]string, 0)
	err := filepath.WalkDir(store.root, func(filePath string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() && filePath != store.root {
			relative, relErr := filepath.Rel(store.root, filePath)
			if relErr != nil {
				return relErr
			}
			folders = append(folders, filepath.ToSlash(relative))
		}
		return nil
	})
	return folders, err
}

func (store localDocumentStore) CreateFolder(_ context.Context, folder string) error {
	folderPath, err := safeFolderPath(store.root, folder)
	if err != nil {
		return err
	}
	return os.MkdirAll(folderPath, 0o750)
}

func (store localDocumentStore) ListDocuments(_ context.Context, folder string) ([]string, error) {
	folderPath, err := safeFolderPath(store.root, folder)
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(folderPath)
	if errors.Is(err, os.ErrNotExist) {
		return []string{}, nil
	}
	if err != nil {
		return nil, err
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".md") {
			names = append(names, entry.Name())
		}
	}
	return names, nil
}

func (store localDocumentStore) Get(_ context.Context, name string) (string, error) {
	filePath, err := safeDocumentPath(store.root, name)
	if err != nil {
		return "", err
	}
	content, err := os.ReadFile(filePath)
	return string(content), err
}

func (store localDocumentStore) Put(_ context.Context, name, content string) error {
	filePath, err := safeDocumentPath(store.root, name)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(filePath), 0o750); err != nil {
		return err
	}
	return os.WriteFile(filePath, []byte(content), 0o640)
}

func (store localDocumentStore) Delete(_ context.Context, name string) error {
	filePath, err := safeDocumentPath(store.root, name)
	if err != nil {
		return err
	}
	return os.Remove(filePath)
}

func (store localDocumentStore) Move(_ context.Context, name, folder string) error {
	source, err := safeDocumentPath(store.root, name)
	if err != nil {
		return err
	}
	destinationFolder, err := safeFolderPath(store.root, folder)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(destinationFolder, 0o750); err != nil {
		return err
	}
	return os.Rename(source, filepath.Join(destinationFolder, filepath.Base(name)))
}

type s3DocumentStore struct {
	client *s3.Client
	bucket string
	prefix string
}

func newS3DocumentStore(bucket, prefix string, config aws.Config) (*s3DocumentStore, error) {
	if bucket == "" {
		return nil, fmt.Errorf("S3 document storage requires a bucket")
	}
	if _, err := safeS3Prefix(prefix); err != nil {
		return nil, err
	}
	return &s3DocumentStore{client: s3.NewFromConfig(config), bucket: bucket, prefix: strings.Trim(prefix, "/")}, nil
}

func (store *s3DocumentStore) key(name string) string {
	if store.prefix == "" {
		return name
	}
	return store.prefix + "/" + name
}

func (store *s3DocumentStore) ListFolders(ctx context.Context) ([]string, error) {
	folders := map[string]struct{}{}
	pages := s3.NewListObjectsV2Paginator(store.client, &s3.ListObjectsV2Input{Bucket: aws.String(store.bucket), Prefix: aws.String(store.key(""))})
	for pages.HasMorePages() {
		page, err := pages.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		for _, object := range page.Contents {
			key := strings.TrimPrefix(aws.ToString(object.Key), store.key(""))
			if directory := path.Dir(key); directory != "." {
				parts := strings.Split(directory, "/")
				for index := range parts {
					folders[strings.Join(parts[:index+1], "/")] = struct{}{}
				}
			}
		}
	}
	return sortedKeys(folders), nil
}

func (store *s3DocumentStore) CreateFolder(ctx context.Context, folder string) error {
	if _, err := safeS3RelativePath(folder, false); err != nil {
		return err
	}
	_, err := store.client.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(store.bucket), Key: aws.String(store.key(folder + "/.main-noc-folder")), Body: bytes.NewReader(nil)})
	return err
}

func (store *s3DocumentStore) ListDocuments(ctx context.Context, folder string) ([]string, error) {
	if folder != "" {
		if _, err := safeS3RelativePath(folder, false); err != nil {
			return nil, err
		}
		folder += "/"
	}
	prefix := store.key(folder)
	pages := s3.NewListObjectsV2Paginator(store.client, &s3.ListObjectsV2Input{Bucket: aws.String(store.bucket), Prefix: aws.String(prefix), Delimiter: aws.String("/")})
	names := make([]string, 0)
	for pages.HasMorePages() {
		page, err := pages.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		for _, object := range page.Contents {
			name := strings.TrimPrefix(aws.ToString(object.Key), prefix)
			if strings.HasSuffix(name, ".md") {
				names = append(names, name)
			}
		}
	}
	sort.Strings(names)
	return names, nil
}

func (store *s3DocumentStore) Get(ctx context.Context, name string) (string, error) {
	if _, err := safeS3RelativePath(name, true); err != nil {
		return "", err
	}
	result, err := store.client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(store.bucket), Key: aws.String(store.key(name))})
	if err != nil {
		if isS3NotFound(err) {
			return "", os.ErrNotExist
		}
		return "", err
	}
	defer result.Body.Close()
	content, err := io.ReadAll(result.Body)
	return string(content), err
}

func (store *s3DocumentStore) Put(ctx context.Context, name, content string) error {
	if _, err := safeS3RelativePath(name, true); err != nil {
		return err
	}
	_, err := store.client.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(store.bucket), Key: aws.String(store.key(name)), Body: strings.NewReader(content), ContentType: aws.String("text/markdown; charset=utf-8")})
	return err
}

func (store *s3DocumentStore) Delete(ctx context.Context, name string) error {
	if _, err := safeS3RelativePath(name, true); err != nil {
		return err
	}
	_, err := store.client.HeadObject(ctx, &s3.HeadObjectInput{Bucket: aws.String(store.bucket), Key: aws.String(store.key(name))})
	if isS3NotFound(err) {
		return os.ErrNotExist
	}
	if err != nil {
		return err
	}
	_, err = store.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(store.bucket), Key: aws.String(store.key(name))})
	return err
}

func (store *s3DocumentStore) Move(ctx context.Context, name, folder string) error {
	if _, err := safeS3RelativePath(name, true); err != nil {
		return err
	}
	if _, err := safeS3RelativePath(folder, false); err != nil {
		return err
	}
	destination := path.Join(folder, path.Base(name))
	_, err := store.client.CopyObject(ctx, &s3.CopyObjectInput{Bucket: aws.String(store.bucket), Key: aws.String(store.key(destination)), CopySource: aws.String(url.PathEscape(store.bucket + "/" + store.key(name)))})
	if err != nil {
		return err
	}
	return store.Delete(ctx, name)
}

func safeS3Prefix(prefix string) (string, error) {
	return safeS3RelativePath(strings.Trim(prefix, "/"), false)
}

func safeS3RelativePath(value string, document bool) (string, error) {
	if value == "" && !document {
		return "", nil
	}
	if strings.Contains(value, "\\") || strings.ContainsRune(value, 0) || path.IsAbs(value) || path.Clean(value) != value || value == "." || value == ".." || (document && !strings.HasSuffix(value, ".md")) {
		return "", fmt.Errorf("invalid document storage path")
	}
	return value, nil
}

func sortedKeys(values map[string]struct{}) []string {
	keys := make([]string, 0, len(values))
	for value := range values {
		keys = append(keys, value)
	}
	sort.Strings(keys)
	return keys
}

func isS3NotFound(err error) bool {
	var apiError smithy.APIError
	return errors.As(err, &apiError) && (apiError.ErrorCode() == "NoSuchKey" || apiError.ErrorCode() == "NotFound" || apiError.ErrorCode() == "404")
}
