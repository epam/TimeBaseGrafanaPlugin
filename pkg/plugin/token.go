package plugin

import (
	"encoding/json"
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type tokenResp struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	Jti          string `json:"jti"`
}

func (d *Datasource) updateTokenAndClient() error {
	if time.Now().Add(-time.Second * time.Duration(d.token.ExpiresIn/2)).After(d.updateTokenTime) {
		token, err := updateToken(d.token, d.settings.URL+"oauth/token")
		if err != nil {
			token, err := getToken(d.settings)
			if err != nil {
				return err
			}
			d.httpClient.CloseIdleConnections()
			client, err := createNewTokenHttpclient(d.settings, token)
			if err != nil {
				return err
			}
			d.httpClient = client
			d.token = token
			d.updateTokenTime = time.Now()
		} else {
			d.httpClient.CloseIdleConnections()
			client, err := createNewTokenHttpclient(d.settings, token)
			if err != nil {
				return err
			}
			d.httpClient = client
			d.token = token
			d.updateTokenTime = time.Now()
		}
		log.DefaultLogger.Info("Update token for:", "datasource", d.settings.Name)
	}
	return nil
}

func updateToken(oldToken tokenResp, tokenUrl string) (tokenResp, error) {
	var token tokenResp
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", oldToken.RefreshToken)
	encodedData := data.Encode()
	client := &http.Client{
		Timeout: time.Second * 10,
	}
	req, err := http.NewRequest(http.MethodPost, tokenUrl, strings.NewReader(encodedData))
	if err != nil {
		return token, fmt.Errorf("create token request: %s", err.Error())
	}
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Add("Content-Length", strconv.Itoa(len(data.Encode())))
	req.Header.Add("Authorization", "Basic d2ViOnNlY3JldA==")
	response, err := doRequest(client, req)
	if err != nil {
		return token, err
	}
	if err := json.NewDecoder(response.Body).Decode(&token); err != nil {
		return token, fmt.Errorf("decode token: %s", err.Error())
	}
	defer response.Body.Close()
	client.CloseIdleConnections()
	return token, nil
}

func getToken(settings backend.DataSourceInstanceSettings) (tokenResp, error) {
	password := getPassword(settings)
	username := getUsername(settings)
	client := &http.Client{
		Timeout: time.Second * 10,
	}
	var token tokenResp
	data := url.Values{}
	data.Set("grant_type", "password")
	data.Set("scope", "trust")
	data.Set("password", password)
	data.Set("username", username)
	encodedData := data.Encode()
	req, err := http.NewRequest(http.MethodPost, settings.URL+"oauth/token", strings.NewReader(encodedData))
	if err != nil {
		return token, fmt.Errorf("create token request: %s", err.Error())
	}
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Add("Content-Length", strconv.Itoa(len(data.Encode())))
	req.Header.Add("Authorization", "Basic d2ViOnNlY3JldA==")
	response, err := doRequest(client, req)
	if err != nil {
		return token, err
	}
	if err := json.NewDecoder(response.Body).Decode(&token); err != nil {
		return token, fmt.Errorf("decode token: %s", err.Error())
	}
	defer response.Body.Close()
	defer client.CloseIdleConnections()
	return token, nil
}
