package utils

import (
	"encoding/json"
	"errors"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

const (
	JSON = "application/json"
	YAML = "application/yaml"
)

// InferContentTypeByPath returns the content type based on file extension.
func InferContentTypeByPath(path string) (string, error) {
	lower := strings.ToLower(path)
	switch {
	case strings.HasSuffix(lower, ".json"):
		return JSON, nil
	case strings.HasSuffix(lower, ".yaml"), strings.HasSuffix(lower, ".yml"):
		return YAML, nil
	default:
		return "", errors.New("unsupported file extension: " + path)
	}
}

// LoadJsonYamlFromFile loads JSON or YAML file content into the provided interface.
func LoadJsonYamlFromFile(path string, v interface{}, contentType string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	switch contentType {
	case JSON:
		return json.Unmarshal(data, v)
	case YAML:
		return yaml.Unmarshal(data, v)
	default:
		return errors.New("unsupported content type: " + contentType)
	}
}
