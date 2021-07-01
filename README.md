# EPAM TimeBase Datasource plugin

This plugin provides ability to visualize data from TimeBase database by EPAM. More about TimeBase [here](https://kb.stage.shiftmarketsdev.com/).

## What functionality provides this plugin?
TimeBase grafana plugin provides wide range of instruments for time-series processing in analyzing. Wide variety of functions 
include functions from financial analysis domain, statistics, etc. 

[Link to plugin distribution](https://deltix-installers.s3.eu-west-3.amazonaws.com/grafana/epam-timebase-datasource-1.0.5.zip)

## Working with SSO on TimeBase WebAdmin

To work with webadmin, where SSO is enabled, Grafana should be connected to the same SSO
provider. After that switch "Forward OAuth Identity" should be used to log in to webadmin.

---
**IMPORTANT NOTICE**

Plugin works with TimeBase Web Admin versions __>=0.4.14__ or __>=0.5.4__ and Grafana versions __>=7.5.8 and <8.0.0__.

Other versions are rather incompatible or partially incompatible.

---
