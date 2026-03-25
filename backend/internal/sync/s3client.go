package sync

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/NebulaVzx/ZenNote/backend/internal/models"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Client wraps the AWS S3 client with ZenNote-specific operations
type S3Client struct {
	client *s3.Client
	bucket string
	prefix string
}

// NewS3Client creates a new S3 client from sync configuration
func NewS3Client(cfg *models.SyncConfig) (*S3Client, error) {
	var resolver aws.EndpointResolverWithOptionsFunc
	if cfg.Endpoint != "" {
		resolver = func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:               cfg.Endpoint,
				HostnameImmutable: true,
				Source:            aws.EndpointSourceCustom,
			}, nil
		}
	}

	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(cfg.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, "")),
		config.WithEndpointResolverWithOptions(resolver),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if cfg.Endpoint != "" {
			o.UsePathStyle = true
		}
	})

	return &S3Client{
		client: client,
		bucket: cfg.Bucket,
		prefix: cfg.Prefix,
	}, nil
}

// key builds the remote object key with optional prefix
func (s *S3Client) key(name string) string {
	if s.prefix == "" {
		return name
	}
	return s.prefix + "/" + name
}

// Upload puts a file to S3
func (s *S3Client) Upload(ctx context.Context, name string, body io.Reader, size int64) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(s.bucket),
		Key:           aws.String(s.key(name)),
		Body:          body,
		ContentLength: aws.Int64(size),
	})
	return err
}

// Download retrieves a file from S3
func (s *S3Client) Download(ctx context.Context, name string) (io.ReadCloser, int64, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s.key(name)),
	})
	if err != nil {
		return nil, 0, err
	}
	return out.Body, aws.ToInt64(out.ContentLength), nil
}

// ListObjects returns a map of object keys to their metadata
func (s *S3Client) ListObjects(ctx context.Context, prefix string) (map[string]RemoteFileInfo, error) {
	p := s.key(prefix)
	if prefix == "" {
		p = s.key("")
	}
	if p != "" && !endsWithSlash(p) {
		p += "/"
	}

	paginator := s3.NewListObjectsV2Paginator(s.client, &s3.ListObjectsV2Input{
		Bucket: aws.String(s.bucket),
		Prefix: aws.String(p),
	})

	result := make(map[string]RemoteFileInfo)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		for _, obj := range page.Contents {
			key := aws.ToString(obj.Key)
			result[key] = RemoteFileInfo{
				Key:          key,
				ETag:         aws.ToString(obj.ETag),
				LastModified: aws.ToTime(obj.LastModified),
				Size:         aws.ToInt64(obj.Size),
			}
		}
	}
	return result, nil
}

// DeleteObject removes an object from S3
func (s *S3Client) DeleteObject(ctx context.Context, name string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s.key(name)),
	})
	return err
}

// TestConnection verifies that the bucket is accessible
func (s *S3Client) TestConnection(ctx context.Context) error {
	_, err := s.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(s.bucket),
	})
	return err
}

// RemoteFileInfo holds metadata about a remote S3 object
type RemoteFileInfo struct {
	Key          string
	ETag         string
	LastModified time.Time
	Size         int64
}

func endsWithSlash(s string) bool {
	return len(s) > 0 && s[len(s)-1] == '/'
}
