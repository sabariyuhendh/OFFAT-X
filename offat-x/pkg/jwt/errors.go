package jwt

import "errors"

var (
	ErrInvalidTokenFormat = errors.New("invalid JWT format: expected 3 dot-separated parts")
	ErrBase64Decode       = errors.New("failed to base64-decode JWT part")
	ErrJSONDecode         = errors.New("failed to JSON-decode JWT part")
	ErrNoToken            = errors.New("no JWT token provided")
)
