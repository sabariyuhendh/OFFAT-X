package parser

import (
	"context"
	"errors"
	"io"
	"net/http"
	"os"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/rs/zerolog/log"
)

// ApiDoc is implemented by all supported specification formats.
type ApiDoc interface {
	SetDoc(doc interface{}) error
	SetBaseUrl(baseUrl string) error
	GetBaseUrl() *string
	SetDocHttpParams() error
	GetDocHttpParams() []*DocHttpParams
	FuzzDocHttpParams()
}

// Parser wraps the OpenAPI loader and holds the parsed document.
type Parser struct {
	loader *openapi3.Loader
	Doc    ApiDoc
}

// NewParser creates a Parser with the given OAS validation flags.
func NewParser(
	allowExternalRefs bool,
	disableExamplesValidation bool,
	disableSchemaDefaultsValidation bool,
	disableSchemaPatternValidation bool,
) *Parser {
	loader := openapi3.NewLoader()
	loader.IsExternalRefsAllowed = allowExternalRefs

	return &Parser{loader: loader, Doc: &OpenApi{}}
}

// Parse reads an OAS3 file or URL and populates the Doc field.
func (p *Parser) Parse(path string, isURL bool) error {
	var doc *openapi3.T
	var err error

	if isURL {
		resp, err := http.Get(path) //nolint:gosec,noctx
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		data, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}
		doc, err = p.loader.LoadFromData(data)
		if err != nil {
			return err
		}
	} else {
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		doc, err = p.loader.LoadFromData(data)
		if err != nil {
			return err
		}
	}

	if doc == nil {
		return errors.New("parsed document is nil")
	}

	// Validate the loaded document
	if err = doc.Validate(context.Background()); err != nil {
		log.Warn().Err(err).Msg("OAS document validation warnings (proceeding anyway)")
	}

	return p.Doc.SetDoc(doc)
}

// FuzzDocHttpParams fuzzes all parsed HTTP params.
func (p *Parser) FuzzDocHttpParams() {
	p.Doc.FuzzDocHttpParams()
}
