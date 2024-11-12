package plugin

import "time"

type messageValues struct {
	Timestamp []time.Time         `json:"timestamp"`
	Keys      []string            `json:"keys"`
	Value     map[string][]string `json:"values"`
}
type extractTime struct {
	Timestamp time.Time `json:"timestamp"`
}

type schema struct {
	Types []typeDef `json:"types"`
	All   []typeDef `json:"all"`
}

type schemaType int64

const (
	TimeSeries schemaType = iota
	StringToValue
)

type auth int64

const (
	Token auth = iota
	ApiKey
)

type metaSchema struct {
	Type      schemaType `json:"type"`
	ValueKeys []string   `json:"floatKeys"`
	LabelKeys []string   `json:"stringKeys"`
}

type typeDef struct {
	Name       string      `json:"name"`
	Title      interface{} `json:"title"`
	Fields     []field     `json:"fields"`
	Parent     string      `json:"parent"`
	IsAbstract bool        `json:"isAbstract"`
	IsEnum     bool        `json:"isEnum"`
}

type field struct {
	Name        string   `json:"name"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Type        dataType `json:"type"`
	Value       string   `json:"value"`
	IsStatic    bool     `json:"static"`
	Hide        bool     `json:"hide"`
}

type dataType struct {
	Encoding    string    `json:"encoding"`
	Nullable    bool      `json:"nullable"`
	Name        string    `json:"name"`
	Types       []string  `json:"types"`
	ElementType *dataType `json:"elementType"`
}

type QueryRequest struct {
	Query string `json:"query"`
}

type queryModel struct {
	RefId      string `json:"refId"`
	Hide       bool   `json:"hide"`
	Raw        bool   `json:"raw"`
	RawQuery   string `json:"rawQuery"`
	MaxRecords int    `json:"maxRecords"`
}
