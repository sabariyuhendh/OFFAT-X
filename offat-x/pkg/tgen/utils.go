package tgen

import (
	"encoding/json"
	"fmt"
	"path"
	"strings"

	"github.com/offat-x/offat-x/pkg/parser"
	"github.com/rs/zerolog/log"
)

// httpParamToRequest converts a DocHttpParams into a concrete request tuple.
func httpParamToRequest(
	baseURL string,
	docParam *parser.DocHttpParams,
	defaultQueryParams map[string]string,
	defaultHeaders map[string]string,
	contentType string,
) (url string, headers map[string]string, queryMap map[string]string, body []byte, pathWithParams string, err error) {
	// --- Build URL with path params ---
	urlPath := docParam.Path
	for _, p := range docParam.PathParams {
		if p.Value != nil {
			placeholder := fmt.Sprintf("{%s}", p.Name)
			urlPath = strings.ReplaceAll(urlPath, placeholder, fmt.Sprintf("%v", p.Value))
		}
	}
	pathWithParams = urlPath
	url = strings.ReplaceAll(path.Join(baseURL, urlPath), ":/", "://")

	// --- Build query params ---
	queryMap = make(map[string]string)
	for k, v := range defaultQueryParams {
		queryMap[k] = v
	}
	for _, p := range docParam.QueryParams {
		if p.Value != nil {
			queryMap[p.Name] = fmt.Sprintf("%v", p.Value)
		}
	}

	// --- Build headers ---
	headers = make(map[string]string)
	for k, v := range defaultHeaders {
		headers[k] = v
	}
	for _, p := range docParam.HeaderParams {
		if p.Value != nil {
			headers[p.Name] = fmt.Sprintf("%v", p.Value)
		}
	}
	for _, p := range docParam.CookieParams {
		if p.Value != nil {
			existing := headers["Cookie"]
			if existing != "" {
				headers["Cookie"] = existing + "; " + p.Name + "=" + fmt.Sprintf("%v", p.Value)
			} else {
				headers["Cookie"] = p.Name + "=" + fmt.Sprintf("%v", p.Value)
			}
		}
	}

	// --- Build body ---
	if len(docParam.BodyParams) > 0 {
		bodyMap := make(map[string]interface{})
		for _, p := range docParam.BodyParams {
			if p.Value != nil {
				bodyMap[p.Name] = p.Value
			}
		}
		if len(bodyMap) > 0 {
			body, err = json.Marshal(bodyMap)
			if err != nil {
				log.Error().Err(err).Msg("failed to marshal body params")
				return
			}
			if _, ok := headers["Content-Type"]; !ok {
				headers["Content-Type"] = contentType
			}
		}
	}

	return
}
