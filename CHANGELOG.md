# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-28

### Added
- Support for Grafana 13 (React 19): externalize `react/jsx-runtime` and `react/jsx-dev-runtime` in the webpack build

### Changed
- Minimum Grafana dependency updated to:
  `>=11.6.11 <12 || >=12.0.10 <12.1 || >=12.1.7 <12.2 || >=12.2.5`
- Dropped support for Grafana `10.x` and Grafana `11.0–11.6.10` (host must provide `react/jsx-runtime` via SystemJS)

## [1.0.1] - 2021-06-22

### Added
- Support for variable queries.
- Support for annotations.
- SSO support.
- Raw queries support.

### Changed
- Grafana version 7.0 -> 7.5.8
- Plugin id changed from `deltix-timebase-datasource-plugin` to `deltix-timebase-datasource`

## [1.0.2] - 2021-06-24

### Changed
- Fixed LICENSE.
- Plugin id changed from `deltix-timebase-datasource` to `epam-timebase-datasource`.

## [1.0.6] - 2021-08-03

### Added
- Support for Grafana 8
- Version checks on plugin config page
- Signing plugin for certain environments

### Changed
- Query variables stabilized
- Plugin uses standard timebase web-admin API

## [1.0.12] - 2024-11-08

### Added
- Support for Grafana 11
