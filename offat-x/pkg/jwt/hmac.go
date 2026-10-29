package jwt

import (
	"crypto/hmac"
	"crypto/sha256"
)

// hmacSign signs the input string with the given key using HMAC-SHA256.
func hmacSign(input string, key []byte) ([]byte, error) {
	mac := hmac.New(sha256.New, key)
	_, err := mac.Write([]byte(input))
	if err != nil {
		return nil, err
	}
	return mac.Sum(nil), nil
}
