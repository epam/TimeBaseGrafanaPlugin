package plugin

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"errors"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"net/http"
	"strings"
	"time"
)

type datasourceProperty struct {
	TimebaseUrl    string `json:"timebaseUrl"`
	TimebaseUser   string `json:"timebaseUser"`
	TimebaseApiKey string `json:"timebaseApiKey"`
	ApiKeyEnable   bool   `json:"apiKeyEnable"`
}

func getPassword(settings backend.DataSourceInstanceSettings) string {
	return settings.DecryptedSecureJSONData["timebasePassword"]
}

func getApiSecret(settings backend.DataSourceInstanceSettings) string {
	return settings.DecryptedSecureJSONData["timebaseApiSecret"]
}

func getUsername(settings backend.DataSourceInstanceSettings) string {
	prop, _ := unmarshalDatasourceProperty(settings)
	return prop.TimebaseUser
}

func getApiKey(settings backend.DataSourceInstanceSettings) string {
	prop, _ := unmarshalDatasourceProperty(settings)

	return prop.TimebaseApiKey
}

func getAuthType(settings backend.DataSourceInstanceSettings) auth {
	prop, _ := unmarshalDatasourceProperty(settings)
	if prop.ApiKeyEnable {
		return ApiKey
	}
	return Token
}

func unmarshalDatasourceProperty(settings backend.DataSourceInstanceSettings) (datasourceProperty, error) {
	var prop datasourceProperty
	err := json.Unmarshal(settings.JSONData, &prop)
	if err != nil {
		log.DefaultLogger.Error("Can't unmarshal datasource property", "datasource", settings.Name)
	}
	return prop, nil
}

func getPayload(req *http.Request, body string) string {
	result := strings.ToUpper(req.Method) + strings.ToLower(req.URL.Path)
	queryParams := req.URL.RawQuery
	if len(queryParams) != 0 {
		keyValues := strings.Split(queryParams, "&")
		pairs := make([]string, len(keyValues))
		for i, v := range keyValues {
			keyValue := strings.Split(v, "=")
			newKeyValue := strings.ToLower(keyValue[0]) + "=" + keyValue[1]
			pairs[i] = newKeyValue
		}
		params := strings.Join(pairs, "&")
		result += params
	}
	result += body
	return result
}

func getSignature(settings backend.DataSourceInstanceSettings, payload string) string {
	sig := hmac.New(sha512.New384, []byte(getApiSecret(settings)))
	sig.Write([]byte(payload))
	sum := sig.Sum(nil)
	encodeString := base64.StdEncoding.EncodeToString(sum)
	return encodeString
}

func getMessages(respBody []byte, timesLen int) ([]map[string]interface{}, error) {
	var allMessages []map[string]interface{}
	err := json.Unmarshal(respBody, &allMessages)
	if err != nil {
		return nil, err
	}
	if len(allMessages) == 1000 {
		log.DefaultLogger.Warn("Query returns too many values")
	}
	var messages = make([]map[string]interface{}, 0)
	startIndex := len(allMessages) - timesLen
	for i := range allMessages {
		if i >= startIndex {
			messages = append(messages, allMessages[i])
		}
	}
	return messages, nil
}

func getTimestamp(timeObjects []byte, from time.Time) ([]time.Time, error) {
	var warpTime []extractTime
	err := json.Unmarshal(timeObjects, &warpTime)
	if err != nil {
		return nil, err
	}
	var times = make([]time.Time, 0)
	for _, t := range warpTime {
		if t.Timestamp.After(from) {
			times = append(times, t.Timestamp)
		}
	}
	return times, nil
}

func analyzeSchema(querySchema schema) (metaSchema, error) {
	var valueKeys = make([]string, 0)
	for _, t := range querySchema.Types {
		if t.Name == "deltix.qsrv.hf.tickdb.lang.pub.messages.QueryStatusMessage" {
			continue
		}
		for _, f := range t.Fields {
			name := f.Type.Name
			if isValueType(name) {
				valueKeys = append(valueKeys, f.Name)
			}
		}
	}
	var labelKeys = make([]string, 0)
	for _, t := range querySchema.Types {
		if t.Name == "deltix.qsrv.hf.tickdb.lang.pub.messages.QueryStatusMessage" {
			continue
		}
		for _, f := range t.Fields {
			name := f.Type.Name
			if name == "VARCHAR" {
				labelKeys = append(labelKeys, f.Name)
			}
		}
	}
	meta := metaSchema{ValueKeys: valueKeys, LabelKeys: labelKeys}
	if len(valueKeys) == 0 {
		return meta, errors.New("query does not contain data values")
	} else if len(valueKeys) == 1 && len(labelKeys) >= 1 {
		meta.Type = StringToValue
	} else {
		meta.Type = TimeSeries
	}
	return meta, nil
}

func isValueType(name string) bool {
	return name == "FLOAT" || name == "INTEGER" || name == "BOOLEAN"
}

func contains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}
