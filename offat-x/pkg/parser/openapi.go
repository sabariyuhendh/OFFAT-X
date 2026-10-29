package parser

import (
	"errors"
	"strings"
	"sync"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/offat-x/offat-x/pkg/utils"
	"github.com/rs/zerolog/log"
	"github.com/valyala/fasthttp"
)

const (
	ParameterInBody   = "body"
	ParameterInCookie = openapi3.ParameterInCookie
	ParameterInPath   = openapi3.ParameterInPath
	ParameterInHeader = openapi3.ParameterInHeader
	ParameterInQuery  = openapi3.ParameterInQuery
)

// OpenApi holds a parsed OpenAPI v3 document.
type OpenApi struct {
	doc           *openapi3.T
	BaseUrl       *string
	DocHttpParams []*DocHttpParams
}

func (o *OpenApi) SetDoc(doc interface{}) error {
	if doc == nil {
		return errors.New("doc ptr cannot be nil")
	}
	t, ok := doc.(*openapi3.T)
	if !ok {
		return errors.New("invalid type, SetDoc expects *openapi3.T")
	}
	o.doc = t
	return nil
}

func (o *OpenApi) AssignParamsToSlices(params openapi3.Parameters, httpPathParams, cookieParams, headerParams, queryParams, bodyParams *[]Param) {
	for _, param := range params {
		if param.Value == nil || param.Value.Schema == nil || param.Value.Schema.Value == nil {
			continue
		}
		requestParam := Param{
			In:       param.Value.In,
			Name:     param.Value.Name,
			Required: param.Value.Required,
			Type:     param.Value.Schema.Value.Type.Slice(),
		}
		switch param.Value.In {
		case ParameterInPath:
			*httpPathParams = append(*httpPathParams, requestParam)
		case ParameterInCookie:
			*cookieParams = append(*cookieParams, requestParam)
		case ParameterInHeader:
			*headerParams = append(*headerParams, requestParam)
		case ParameterInQuery:
			*queryParams = append(*queryParams, requestParam)
		case ParameterInBody:
			*bodyParams = append(*bodyParams, requestParam)
		}
	}
}

func (o *OpenApi) HttpOperationToDocHttpParams(httpMethod, path string, op *openapi3.Operation, pathParams []Param) []*DocHttpParams {
	var queryParams, bodyParams, httpPathParams, cookieParams, headerParams, responseParams []Param

	if op.Parameters != nil {
		o.AssignParamsToSlices(op.Parameters, &httpPathParams, &cookieParams, &headerParams, &queryParams, &bodyParams)
	}

	if op.RequestBody != nil {
		for contentType, value := range op.RequestBody.Value.Content {
			if value.Schema == nil || value.Schema.Value == nil {
				continue
			}
			for paramName, paramData := range value.Schema.Value.Properties {
				if paramData.Value == nil {
					continue
				}
				bodyParams = append(bodyParams, Param{
					Name:        paramName,
					In:          ParameterInBody,
					Required:    true,
					Type:        paramData.Value.Type.Slice(),
					ContentType: contentType,
				})
			}
		}
	}

	var securitySchemes []map[string][]string
	if op.Security != nil {
		for _, secReq := range *op.Security {
			scheme := make(map[string][]string)
			for k, v := range secReq {
				scheme[k] = v
			}
			securitySchemes = append(securitySchemes, scheme)
		}
	}

	if op.Responses != nil {
		for _, responseData := range op.Responses.Map() {
			if responseData.Value == nil {
				continue
			}
			for contentType, value := range responseData.Value.Content {
				if value.Schema == nil || value.Schema.Value == nil {
					continue
				}
				for paramName, paramData := range value.Schema.Value.Properties {
					if paramData.Value == nil {
						continue
					}
					responseParams = append(responseParams, Param{
						Name:        paramName,
						In:          ParameterInBody,
						Required:    utils.SearchStringInSlice(paramData.Value.Required, paramName),
						Type:        paramData.Value.Type.Slice(),
						ContentType: contentType,
					})
				}
			}
		}
	}

	url := ""
	if o.BaseUrl != nil {
		url = *o.BaseUrl + path
	}

	return []*DocHttpParams{{
		Url:            url,
		HttpMethod:     httpMethod,
		Path:           path,
		Security:       securitySchemes,
		BodyParams:     bodyParams,
		CookieParams:   cookieParams,
		HeaderParams:   headerParams,
		PathParams:     append(pathParams, httpPathParams...),
		QueryParams:    queryParams,
		ResponseParams: responseParams,
	}}
}

func (o *OpenApi) SetBaseUrl(baseUrl string) error {
	if utils.ValidateURL(baseUrl) {
		o.BaseUrl = &baseUrl
		return nil
	}
	for _, server := range o.doc.Servers {
		o.BaseUrl = &server.URL
		if strings.HasPrefix(server.URL, "https://") {
			break
		}
	}
	if o.BaseUrl == nil {
		return errors.New("no valid url found for baseUrl")
	}
	return nil
}

func (o *OpenApi) GetBaseUrl() *string {
	return o.BaseUrl
}

func (o *OpenApi) SetDocHttpParams() error {
	var docHttpParams []*DocHttpParams
	for path, pathItem := range o.doc.Paths.Map() {
		var pathParams []Param
		for _, pp := range pathItem.Parameters {
			pathParams = append(pathParams, Param{
				In:       pp.Value.In,
				Name:     pp.Value.Name,
				Required: pp.Value.Required,
			})
		}

		type methodOp struct {
			method string
			op     *openapi3.Operation
		}
		ops := []methodOp{
			{fasthttp.MethodConnect, pathItem.Connect},
			{fasthttp.MethodDelete, pathItem.Delete},
			{fasthttp.MethodGet, pathItem.Get},
			{fasthttp.MethodPost, pathItem.Post},
			{fasthttp.MethodPatch, pathItem.Patch},
			{fasthttp.MethodPut, pathItem.Put},
			{fasthttp.MethodHead, pathItem.Head},
			{fasthttp.MethodOptions, pathItem.Options},
		}
		for _, mo := range ops {
			if mo.op != nil {
				docHttpParams = append(docHttpParams, o.HttpOperationToDocHttpParams(mo.method, path, mo.op, pathParams)...)
			}
		}
	}
	o.DocHttpParams = docHttpParams
	return nil
}

func (o *OpenApi) GetDocHttpParams() []*DocHttpParams {
	return o.DocHttpParams
}

func (o *OpenApi) FuzzDocHttpParams() {
	var wg sync.WaitGroup
	for _, httpParam := range o.DocHttpParams {
		wg.Add(6)
		for _, ptr := range []*[]Param{
			&httpParam.BodyParams,
			&httpParam.CookieParams,
			&httpParam.HeaderParams,
			&httpParam.PathParams,
			&httpParam.QueryParams,
			&httpParam.ResponseParams,
		} {
			go func(p *[]Param) {
				defer wg.Done()
				FillHttpParams(p)
			}(ptr)
		}
	}
	wg.Wait()
}

// HasSecurityScheme returns true if the operation defines any security requirement.
func (o *OpenApi) HasSecurityScheme(docParam *DocHttpParams) bool {
	return len(docParam.Security) > 0
}

// GetSecuritySchemeNames extracts the names of all security schemes used.
func GetSecuritySchemeNames(docParam *DocHttpParams) []string {
	var names []string
	for _, scheme := range docParam.Security {
		for k := range scheme {
			names = append(names, k)
		}
	}
	return names
}

// HasBearerAuth returns true if the operation uses Bearer/JWT auth.
func HasBearerAuth(docParam *DocHttpParams) bool {
	for _, name := range GetSecuritySchemeNames(docParam) {
		lower := strings.ToLower(name)
		if strings.Contains(lower, "bearer") || strings.Contains(lower, "jwt") || strings.Contains(lower, "auth") {
			return true
		}
	}
	// Also check header params for Authorization
	for _, h := range docParam.HeaderParams {
		if strings.EqualFold(h.Name, "authorization") {
			return true
		}
	}
	return false
}

// LogDocHttpParamsSummary logs a concise summary of parsed endpoints.
func LogDocHttpParamsSummary(params []*DocHttpParams) {
	log.Info().Msgf("Parsed %d API endpoints from specification", len(params))
}
