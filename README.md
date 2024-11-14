# TimeBase Datasource Plugin for Grafana

TimeBase Grafana plugin allows visualizing [TimeBase](https://kb.timebase.info/) streams data in [Grafana](https://grafana.com/).

[Link to plugin distribution](https://github.com/epam/TimeBaseGrafanaPlugin/releases/download/1.0.13/epam-timebase-datasource.zip)

[Link to QQL (TimeBase Query language) tutorial](https://kb.timebase.info/community/development/qql/QQL%205.5/qql-tut-intro)

## Functionality

This plugin provides a wide range of instruments for time-series data analysis and processing, including functions from financial analysis domain, statistics, etc.

## Prerequisites

TimeBase plugin uses [TimeBase Web Admin](https://webadmin.timebase.info/api/v0/docs/index.html) REST API - the required component.


---
**IMPORTANT NOTICE**

Supported TimeBase versions: `[5.5.6, 5.7.*]`
Supported TimeBase Web Admin versions: `[0.5.5, 1.2.*]`
Supported Grafana versions: `[10.2+, 11+]`

Other versions are rather incompatible or partially incompatible.

---

## How To Build

To build the plugin `NodeJS` >= 20 and `Yarn` >= 1.22 are required.

## Installation

### Using environment variable

> Preferred with Docker/Kubernetes.

1. Set environment variable `GF_INSTALL_PLUGINS=https://github.com/epam/TimeBaseGrafanaPlugin/releases/download/1.0.13/epam-timebase-datasource.zip;epam-timebase-datasource` and `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=epam-timebase-datasource`.
2. Restart grafana server.

### Using `grafana-cli`

1. Run command `grafana-cli --pluginUrl https://github.com/epam/TimeBaseGrafanaPlugin/releases/download/1.0.13/epam-timebase-datasource.zip plugins install epam-timebase-datasource`
2. Restart Grafana server.

## Working with SSO on TimeBase WebAdmin

To work with TimeBase WebAdmin, where SSO is enabled, Grafana should be connected to the same SSO
provider. After that switch "Forward OAuth Identity" should be used to log in to TimeBase WebAdmin.

## How To Use Plugin

Following sections describe TimeBase plugin functionality. See [Grafana Docs](https://grafana.com/docs/grafana/latest/) for more in depth information about all the features and tools offered by Grafana.

### Adding Data Source

> Refer to [Grafana Docs](https://grafana.com/docs/grafana/latest/) for more in depth information about all the supported features and tools.

Grafana plugin uses TimeBase as a data source. You can use more than one TimeBase instance as Grafana plugin data source. 

1. In the **Configuration** menu select **Data Source**.<br>
![](/src/img/data_source.png)<br>
2. Click **Add Data Source** and find your TimeBase Plugin.
3. Configure plugin settings
   + Name - Plugin name
   + URL - TimeBase Web Admin URL
   + User - TimeBase Web Admin user Username
   + Password - TimeBase Web Admin user Password
4. Click **Test** to check the connection with TimeBase. You will see a confirmation message in case the connection is successful.<br>
![](/src/img/grafana_plugin_settings.png)<br>
5. Set toggle to **Default** to make the current selection a default data source.

### Dashboards

#### Standard Dashboards

> You can [import](https://grafana.com/docs/grafana/latest/dashboards/export-import/#import-dashboard) standard [Dashboards](https://github.com/epam/TimeBaseGrafanaPlugin/tree/main/dashboards) from the public repository. 

![](/src/img/dashboard1.png)

**TimeBase Overview** - displays all the available streams (count, names, stream schemas, description), [QQL](https://kb.timebase.info/docs/development/qql/QQL%205.5/qql-tut-functions#internal-functions) stateful and stateless functions, stream classes [messages](https://kb.timebase.info/community/overview/messages) and fields. 

![](/src/img/dashboard2.png)

**Market Data** - visualization of streams with the available market data. 

#### Create Dashboard

> Refer to [Grafana Docs](https://grafana.com/docs/grafana/latest/) for more in depth information about all the supported features and tools.

1. Go to **Create** menu and click **Dashboard**.
2. Click **Add new panel** to create a dashboard.<br>
![](/src/img/create_panel.png)

### Queries

The Plugin allows running TimeBase QQL queries in **visual editor** and **raw query** modes. Click **Edit** icon to switch between two modes.

> Refer to [Grafana Docs](https://grafana.com/docs/grafana/latest/) for more in depth information about all the supported features and tools.


#### Visual Editor

In this mode you can use built-in UI elements to create and run QQL queries to the selected data source and visualize them on the dashboard.

1. In **Query** tab select TimeBase plugin in the drop down list. Each custom plugin has own set of parameters. <br>
![](/src/img/grafana_plugin_1.png)<br>
2. You may create just one or a combination of several queries. Click **+ Query** to add another query.<br>
![](/src/img/grafana_plugin_2.png)

#### Raw Query

![](/src/img/raw.png)

In this mode you switch from the UI to the raw QQL query format. Refer to [QQL Tutorial](https://kb.timebase.info/community/development/qql/QQL%205.5/qql-tut-intro) to learn more about the TimeBase query language called QQL. 

#### Parameters

![](/src/img/grafana_plugin_3.png)

TimeBase plugin offers the following categories of parameters you can use to make data queries: 

* [Stream](#stream)
* [Symbol](#symbol)
* [Select](#select)
* [Group By](#group-by)
* [View](#view)

#### Stream

Time-series data is stored in [streams](https://kb.timebase.info/community/overview/streams). Each TimeBase instance can be seen as a collection of streams. Here you can select a specific stream to visualize data that it stores. 

* Select a stream you wish to place a query to. 
* Use **WHERE**/**AND** clauses to extract data that meets specific conditions. 

> Available streams are determined by the TimeBase Web Admin back end.


#### Symbol

Time-series data is recorded in streams in a form of [Messages](https://kb.timebase.info/community/overview/messages). Each message has a `timestamp` (time and date of a message) and `symbol` (specific identifier of a data source like sensor id, trading instrument name etc) that serve for data indexing. You can select a specific symbol to sort stream data by, for example display all readings for a specific IoT sensor (sensor id is a symbol value in this case).

* Use drop down list of symbols to select a specific symbol for your query or select **All()** to display data for all the available symbols.

> Available symbols are determined by the TimeBase Web Admin back end.
 

#### Select

In this section you can **select** specific message fields to filter your query, perform different data aggregations and  computations using available fields and functions.

**Field**

TimeBase messages may be of different types (classes). Each message class has a specific set of attributes (fields). In Grafana UI it is visualized as `class:field` in the **Fields** section. Imagine a water meter, meter id is a symbol, meter reading is a field. Another example of a field may be a trading instrument price and quantity (trading instrument name is a symbol, price and quantity are fields).  

* Select at least one **Field** from the drop down list of available fields. Available fields are determined by message types (classes) in your stream. The selected data is displayed on the dashboard and is changed as you add more fields and perform any additional manipulations with data.<br> 
![](/src/img/grafana_plugin_4.png)<br>
* On the dashboard, you can select between fields you wish to display.


**Functions**

You can perform various manipulations with your data set using mathematical, financial and/or statistical functions. Hover over each function to see details. You can use combinations of functions.

![](/src/img/functions.png)

![](/src/img/functions2.png)

> Available functions are determined by the TimeBase Web Admin back end.
 
**Aggregations**

Use a set of available aggregations and aliases to manipulate with the selected data. You can use a combination of aggregations. 

> Aggregations cannot be applied to aggregation functions (e.g. bars functions).
 
![](/src/img/aggregations.png)

> Available aggregations are determined by the TimeBase Web Admin back end.
 

#### Group By

Use this section to set time intervals and to make additional groupings of the selected data. For example, in case you have selected **All()** symbols from your stream, you can use group by **symbol** to view data for each symbol in the stream. Use a predefined time range options or manually input time range (e.g. 45s) to sort data in time. 

![](/src/img/groupings.png)

**Option**

This option is enabled in case you select at least one specific field to Group By your data set. In this case, the selected field(s) serves as a key. You can arrange data with this key either placed in table column or row. 

![](/src/img/group_option.png)

#### View

Grafana supports **DATAFRAME** and **TIMESERIES** visualization formats. Select the format that your plugin supports.   

**Additional Information**

* [Grafana Getting Started Documentation](https://grafana.com/docs/grafana/latest/)
* [Grafana Plugin Installation Guide](https://grafana.com/docs/grafana/latest/plugins/installation/#installing-plugins-manually)
* [Grafana Plugin CLI Commands](https://grafana.com/docs/grafana/latest/administration/cli/#plugins-commands)
* [TimeBase Web Admin Installation](https://kb.timebase.info/community/development/tools/Web%20Admin/admin_config_ce)
* [TimeBase Deployment Options](https://kb.timebase.info/community/deployment/docker)
