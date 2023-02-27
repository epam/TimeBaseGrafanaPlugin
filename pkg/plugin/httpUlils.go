package plugin

import (
	"bytes"
	"context"
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"net/http"
)

func doRequest(client *http.Client, req *http.Request) (*http.Response, error) {
	response, err := client.Do(req)
	if response.StatusCode != 200 {
		log.DefaultLogger.Error("Invalid response status code", "URL", req.URL, "code", response.StatusCode)
		return nil, fmt.Errorf("%v invalid response status code: %v", req.URL, response.StatusCode)
	}
	return response, err
}

func (d *Datasource) createAndDoRequest(ctx context.Context, method, url string, queryBody []byte) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(queryBody))
	if err != nil {
		return nil, fmt.Errorf("new request with context: %w", err)
	}
	if d.auth == ApiKey {
		payload := getPayload(req, string(queryBody))
		signature := getSignature(d.settings, payload)
		req.Header.Add("X-Deltix-ApiKey", getApiKey(d.settings))
		req.Header.Add("X-Deltix-Signature", signature)
	}
	resp, err := doRequest(d.httpClient, req)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func createNewTokenHttpclient(settings backend.DataSourceInstanceSettings, token tokenResp) (*http.Client, error) {
	opts, err := settings.HTTPClientOptions()
	if err != nil {
		return nil, fmt.Errorf("http client options: %w", err)
	}
	opts.Headers["Authorization"] = token.TokenType + " " + token.AccessToken
	opts.Headers["Content-Type"] = "application/json"
	opts.Headers["Accept"] = "application/json"
	cl, err := httpclient.New(opts)
	if err != nil {
		return nil, fmt.Errorf("httpclient new: %w", err)
	}
	return cl, nil
}

func createNewBasicHttpclient(settings backend.DataSourceInstanceSettings) (*http.Client, error) {
	opts, err := settings.HTTPClientOptions()
	if err != nil {
		return nil, fmt.Errorf("http client options: %w", err)
	}
	opts.Headers["Content-Type"] = "application/json"
	opts.Headers["Accept"] = "application/json"
	cl, err := httpclient.New(opts)
	if err != nil {
		return nil, fmt.Errorf("httpclient new: %w", err)
	}
	return cl, nil
}
