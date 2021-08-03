import { DataSourcePlugin } from '@grafana/data';
import { TimeBaseDataSource } from './DataSource';
import { ConfigEditor } from './ConfigEditor';
import { QueryEditor } from './QueryEditor';
import { TimeBaseQuery, MyDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<TimeBaseDataSource, TimeBaseQuery, MyDataSourceOptions>(TimeBaseDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
