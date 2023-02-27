import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings, InlineSwitch, LegacyForms } from '@grafana/ui';
import React, {ChangeEvent, Fragment, PureComponent} from 'react';

import { MyDataSourceOptions } from './types';
import { DataSourceSettings } from '@grafana/data/types/datasource';

const { FormField, SecretFormField } = LegacyForms;

export class ConfigEditor extends PureComponent<DataSourcePluginOptionsEditorProps<MyDataSourceOptions>> {
  constructor(props: DataSourcePluginOptionsEditorProps<MyDataSourceOptions>) {
    super(props);
    if (props.options.jsonData != null && props.options.jsonData.timebaseUrl != null) {
      this.onTimebaseUrlChange(props.options.jsonData.timebaseUrl);
    }
  }
  onChangeUrl = (event: ChangeEvent<HTMLInputElement>) => {
    this.props.onOptionsChange({
      ...this.props.options,
      url: event.target.value,
      jsonData: {
        ...this.props.options.jsonData,
        timebaseUrl: event.target.value,
      },
    });
  };

  onTimebaseUrlChange = (timebaseUrl: string) => {
    this.props.onOptionsChange({
      ...this.props.options,
      jsonData: {
        ...this.props.options.jsonData,
        timebaseUrl,
      },
    });
  };

  onTimebaseUserChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.props.onOptionsChange({
      ...this.props.options,
      jsonData: {
        ...this.props.options.jsonData,
        timebaseUser: event.target.value,
      },
    });
  };

  onTimebaseApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.props.onOptionsChange({
      ...this.props.options,
      jsonData: {
        ...this.props.options.jsonData,
        timebaseApiKey: event.target.value,
      },
    });
  };

  onTimebasePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.props.onOptionsChange({
      ...this.props.options,
      secureJsonData: {
        ...this.props.options.secureJsonData,
        timebasePassword: event.target.value,
      },
    });
  };

  onTimebaseApiSecretChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.props.onOptionsChange({
      ...this.props.options,
      secureJsonData: {
        ...this.props.options.secureJsonData,
        timebaseApiSecret: event.target.value,
      },
    });
  };

  onReset = (config: any) => {};

  onOptionsChange = (options: DataSourceSettings<MyDataSourceOptions>) => {
    this.props.onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        timebaseUrl: options.url,
      },
    });
  };

  onApiKeyEnableChange = (event: any) => {
    const {onOptionsChange, options} = this.props;
    const jsonData = {
      ...options.jsonData,
      apiKeyEnable: event.target.checked,
    };
    onOptionsChange({...options, jsonData});
  }

  render() {
    const { options } = this.props;
    return (
      <div className="gf-form-group">
        <DataSourceHttpSettings
          showAccessOptions={false}
          dataSourceConfig={options}
          defaultUrl="http://localhost:8099"
          onChange={this.onOptionsChange}
        />
        <div className="gf-form">
          <div className="gf-form-group">
            <h3 className="page-heading">TimeBase Web Admin credentials</h3>
            <div className="gf-form-group">
              <div className="gf-form">
                <FormField
                  label="User"
                  width={30}
                  value={this.props.options.jsonData.timebaseUser}
                  onChange={this.onTimebaseUserChange}
                  type="string"
                  placeholder="username"
                />
              </div>
              <div className="gf-form">
                <SecretFormField
                  label="Password"
                  width={30}
                  onChange={this.onTimebasePasswordChange}
                  onReset={this.onReset}
                  isConfigured={false}
                  placeholder="password"
                />
              </div>
            </div>
            <h3 className="page-heading">Enable API KEYS for alerts</h3>
            <div className="gf-form-group">
              <div className="gf-form">
                <InlineSwitch
                  disabled={false}
                  value={options.jsonData.apiKeyEnable}
                  onChange={this.onApiKeyEnableChange}/>
              </div>
              {options.jsonData.apiKeyEnable &&
                <Fragment>
                  <div className="gf-form">
                    <FormField
                      label="API-KEY"
                      width={64}
                      value={this.props.options.jsonData.timebaseApiKey}
                      onChange={this.onTimebaseApiKeyChange}
                      type="string"
                      placeholder="timebase api key"
                    />
                  </div>
                  <div className="gf-form">
                    <SecretFormField
                      label="API-SECRET"
                      width={64}
                      onChange={this.onTimebaseApiSecretChange}
                      onReset={this.onReset}
                      isConfigured={false}
                      placeholder="timebase api secret"
                    />
                  </div>
                </Fragment>
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}
