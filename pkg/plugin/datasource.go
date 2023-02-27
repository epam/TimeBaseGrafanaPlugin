package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"io"
	"net/http"
	"strconv"
	"time"
)

var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

func NewDatasource(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	switch getAuthType(settings) {
	case ApiKey:
		return createDatasourceWithApiKey(settings)
	case Token:
		return createDatasourceWithToken(settings)
	default:
		return createDatasourceWithToken(settings)
	}
}

type Datasource struct {
	settings        backend.DataSourceInstanceSettings
	httpClient      *http.Client
	auth            auth
	token           tokenResp
	updateTokenTime time.Time
}

func createDatasourceWithToken(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	token, err := getToken(settings)
	if err != nil {
		return nil, fmt.Errorf("getToken err: %w", err)
	}
	cl, err := createNewTokenHttpclient(settings, token)
	if err != nil {
		return nil, fmt.Errorf("create new httpclient err: %w", err)
	}
	return &Datasource{
		settings:        settings,
		auth:            Token,
		token:           token,
		updateTokenTime: time.Now(),
		httpClient:      cl,
	}, nil
}

func createDatasourceWithApiKey(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	cl, err := createNewBasicHttpclient(settings)
	if err != nil {
		return nil, fmt.Errorf("create new httpclient err: %w", err)
	}
	return &Datasource{
		settings:        settings,
		auth:            ApiKey,
		token:           tokenResp{},
		updateTokenTime: time.Now(),
		httpClient:      cl,
	}, nil
}

func (d *Datasource) Dispose() {
	d.httpClient.CloseIdleConnections()
}

func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	response, err := d.createQueryDataResponse()
	if err != nil {
		return response, err
	}
	for _, q := range req.Queries {
		res, err := d.query(ctx, req.PluginContext, q)
		if err != nil {
			log.DefaultLogger.Error("failed to execute  query: ", "q.RefID", q.RefID, "err", err.Error())
			res = backend.ErrDataResponse(backend.StatusBadRequest, err.Error())
		}
		response.Responses[q.RefID] = res
	}
	return response, nil
}

func (d *Datasource) createQueryDataResponse() (*backend.QueryDataResponse, error) {
	if d.auth == Token {
		err := d.updateTokenAndClient()
		if err != nil {
			return nil, err
		}
	}
	return backend.NewQueryDataResponse(), nil
}

func (d *Datasource) query(ctx context.Context, pCtx backend.PluginContext, query backend.DataQuery) (backend.DataResponse, error) {

	var qm queryModel

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.DataResponse{}, fmt.Errorf("cant Unmarshal %#v", query.JSON)
	}

	if qm.Raw {
		var qr = QueryRequest{Query: qm.RawQuery}
		log.DefaultLogger.Info("Alert query ", "QUERY", qm.RawQuery)

		queryBody, err := json.Marshal(qr)
		if err != nil {
			return backend.DataResponse{}, err
		}
		querySchema, err := d.describeQuery(ctx, queryBody)
		if err != nil {
			return backend.DataResponse{}, err
		}

		meta, err := analyzeSchema(querySchema)
		if err != nil {
			return backend.DataResponse{}, fmt.Errorf("invalid query scheme: %w", err)
		}

		if meta.Type == StringToValue {
			log.DefaultLogger.Info("StringToValue query")
			return d.doLabelValueQuery(ctx, queryBody, meta, query.TimeRange.From)
		}
		log.DefaultLogger.Info("TimeSeries query")
		return d.doTimeSeriesQuery(ctx, queryBody, meta, query.TimeRange.From)
	} else {
		return backend.DataResponse{}, fmt.Errorf("%v: query is not raw", query.RefID)
	}
}

func (d *Datasource) doLabelValueQuery(ctx context.Context, queryBody []byte, meta metaSchema, from time.Time) (backend.DataResponse, error) {

	respBody, err := d.doQueryRequest(ctx, queryBody)
	if err != nil {
		return backend.DataResponse{}, err
	}
	times, err := getTimestamp(respBody, from)
	if err != nil {
		return backend.DataResponse{}, err
	}

	messages, err := getMessages(respBody, len(times))
	if err != nil {
		return backend.DataResponse{}, err
	}

	labels := make(map[string][]string)
	for _, key := range meta.LabelKeys {
		labels[key] = make([]string, len(messages))
	}
	values := make([]float64, len(messages))
	for i, m := range messages {
		for key, value := range m {
			if key == meta.ValueKeys[0] {
				values[i], _ = strconv.ParseFloat(fmt.Sprint(value), 64)
			} else if contains(meta.LabelKeys, key) {
				labels[key][i] = value.(string)
			}
		}
	}

	var response backend.DataResponse
	frame := data.NewFrame("values")
	frame.Fields = append(frame.Fields,
		data.NewField("values", nil, values),
	)
	for k, v := range labels {
		label := make([]string, len(v))
		for i, p := range v {
			label[i] = p
		}
		frame.Fields = append(frame.Fields,
			data.NewField(k, nil, label),
		)
	}
	response.Frames = append(response.Frames, frame)
	return response, nil
}

func (d *Datasource) doTimeSeriesQuery(ctx context.Context, queryBody []byte, meta metaSchema, from time.Time) (backend.DataResponse, error) {

	respBody, err := d.doQueryRequest(ctx, queryBody)
	if err != nil {
		return backend.DataResponse{}, err
	}
	times, err := getTimestamp(respBody, from)
	if err != nil {
		return backend.DataResponse{}, err
	}

	messages, err := getMessages(respBody, len(times))
	if err != nil {
		return backend.DataResponse{}, err
	}
	var respValues messageValues
	respValues.Value = make(map[string][]string)
	respValues.Timestamp = times
	respValues.Keys = meta.ValueKeys

	for _, z := range respValues.Keys {
		respValues.Value[z] = make([]string, len(messages))
	}

	for i, m := range messages {
		for key, value := range m {
			if contains(respValues.Keys, key) {
				respValues.Value[key][i] = fmt.Sprint(value)
			}
		}
	}

	var response backend.DataResponse
	frame := data.NewFrame("Data")
	frame.Fields = append(frame.Fields,
		data.NewField("time", nil, respValues.Timestamp),
	)
	for k, v := range respValues.Value {
		values := make([]float64, len(v))
		for i, p := range v {
			values[i], _ = strconv.ParseFloat(p, 64)
		}
		frame.Fields = append(frame.Fields,
			data.NewField(k, data.Labels{"Name": k}, values),
		)
	}
	response.Frames = append(response.Frames, frame)
	return response, nil
}

func (d *Datasource) describeQuery(ctx context.Context, queryBody []byte) (schema, error) {
	var querySchema schema
	describeResp, err := d.createAndDoRequest(ctx, http.MethodPost, d.settings.URL+"api/v0/describe", queryBody)
	if err != nil {
		return querySchema, err
	}
	respSchema, err := io.ReadAll(describeResp.Body)
	if err != nil {
		return querySchema, err
	}
	err = json.Unmarshal(respSchema, &querySchema)

	if err != nil {
		return querySchema, err
	}

	defer func() {
		if err := describeResp.Body.Close(); err != nil {
			log.DefaultLogger.Error("describe: failed to close response body", "err", err)
		}
	}()
	return querySchema, err
}

func (d *Datasource) doQueryRequest(ctx context.Context, queryBody []byte) ([]byte, error) {
	resp, err := d.createAndDoRequest(ctx, http.MethodPost, d.settings.URL+"api/v0/query", queryBody)
	if err != nil {
		return nil, err
	}
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body context: %w", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			log.DefaultLogger.Error("doQueryRequest: failed to close response body", "err", err)
		}
	}()
	return respBody, nil
}

func (d *Datasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	log.DefaultLogger.Info("CheckHealth")
	if d.auth == Token {
		err := d.updateTokenAndClient()
		if err != nil {
			return newHealthCheckErrorf("request error"), err
		}
	}
	resp, err := d.createAndDoRequest(ctx, http.MethodGet, d.settings.URL, nil)
	if err != nil {
		return newHealthCheckErrorf("request error"), nil
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			log.DefaultLogger.Error("check health: failed to close response body", "err", err.Error())
		}
	}()
	if resp.StatusCode != http.StatusOK {
		return newHealthCheckErrorf("got response code %d", resp.StatusCode), nil
	}
	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}

func newHealthCheckErrorf(format string, args ...interface{}) *backend.CheckHealthResult {
	return &backend.CheckHealthResult{Status: backend.HealthStatusError, Message: fmt.Sprintf(format, args...)}
}
