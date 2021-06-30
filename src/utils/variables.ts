import { getTemplateSrv } from '@grafana/runtime';

import { TimeBaseQuery } from '../types';

export const getVariables = () => {
  return getTemplateSrv().getVariables();
};

export const getReplacedValue = (value: any, scopedVars: { [key: string]: any }) => {
  return getTemplateSrv().replace(value?.toString(), scopedVars, 'csv');
};
export const usedInQuery = (variable: string, query: TimeBaseQuery) => {
  const name = '${' + variable + '}';
  if (query.selectedStream === name || query.selectedSymbol === name || query.selectedGroups?.includes(name)) {
    return true;
  }
  const usedFilters = query.filters.filter((filter) => filter.field === name || filter.values?.includes(name));

  if (usedFilters.length !== 0) {
    return true;
  }
  if (query.selectedInterval?.label === name) {
    return true;
  }
  const usedSelects = query.selects.filter(
    (select) =>
      select.selectedAggregations.some((a) => a.parameters.some((p) => p.isConstant && p.value === name)) ||
      select.selectedFunction?.parameters.some((p) => p.isConstant && p.value === name)
  );

  return usedSelects.length !== 0;
};
