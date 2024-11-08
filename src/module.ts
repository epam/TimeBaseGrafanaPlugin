import { DataSourcePlugin } from '@grafana/data';
import { TimeBaseQuery, MyDataSourceOptions } from './types';
import { TimeBaseDataSource } from 'datasource';
import { ConfigEditor } from 'components/ConfigEditor';
import { QueryEditor } from 'components/QueryEditor';

export const plugin = new DataSourcePlugin<TimeBaseDataSource, TimeBaseQuery, MyDataSourceOptions>(TimeBaseDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
