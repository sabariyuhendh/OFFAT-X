package utils

import "os"

// WriteFile writes data to a file at the given path, creating or truncating it.
func WriteFile(path string, data []byte) error {
	return os.WriteFile(path, data, 0o644)
}
