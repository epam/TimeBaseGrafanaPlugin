# EPAM TimeBase Datasource plugin for Grafana

This plugin provides ability to visualize data from TimeBase database by EPAM. More about TimeBase [here](https://kb.timebase.info/).

## What functionality provides this plugin?
TimeBase grafana plugin provides wide range of instruments for time-series processing in analyzing. Wide variety of functions
include functions from financial analysis domain, statistics, etc.

[Link to plugin distribution](https://github.com/epam/TimeBaseGrafanaPlugin/releases/download/1.0.7/epam-timebase-datasource.zip)

## Working with SSO on TimeBase WebAdmin

To work with webadmin, where SSO is enabled, Grafana should be connected to the same SSO
provider. After that switch "Forward OAuth Identity" should be used to log in to webadmin.

---
**IMPORTANT NOTICE**

Plugin works with TimeBase Web Admin versions __>=0.5.5__, TimeBase server versions __>=5.5.6__ and Grafana versions __>=7.5.8__.

Other versions are rather incompatible or partially incompatible.

---

## Installation

### Using `grafana-cli`

1. Run command `grafana-cli --pluginUrl https://github.com/epam/TimeBaseGrafanaPlugin/releases/download/1.0.7/epam-timebase-datasource.zip plugins install epam-timebase-datasource`
1. Restart Grafana server.

### Using environment variable

1. Set environment variable `GF_INSTALL_PLUGINS=https://github.com/epam/TimeBaseGrafanaPlugin/releases/download/1.0.7/epam-timebase-datasource.zip;epam-timebase-datasource` and `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=epam-timebase-datasource`.
2. Restart grafana server.
