import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
  normFormatWithRels as createNormWidget1WithRels,
  storeFormat as createStoreWidget1,
} from './widget_1'
import {
  jsonFormat as createJsonWidget2,
  normFormat as createNormWidget2,
  normFormatWithRels as createNormWidget2WithRels,
  storeFormat as createStoreWidget2,
} from './widget_2'
import {
  jsonFormat as createJsonWidget3,
  normFormat as createNormWidget3,
  normFormatWithRels as createNormWidget3WithRels,
  storeFormat as createStoreWidget3,
} from './widget_3'

export function jsonFormat() {
  return {
    data: [createJsonWidget1(), createJsonWidget2(), createJsonWidget3()],
  }
}

export function normFormat() {
  const norm_widget_1 = createNormWidget1()
  const norm_widget_2 = createNormWidget2()
  const norm_widget_3 = createNormWidget3()

  return {
    [norm_widget_1['_jv']['id']]: norm_widget_1,
    [norm_widget_2['_jv']['id']]: norm_widget_2,
    [norm_widget_3['_jv']['id']]: norm_widget_3,
  }
}

export function normFormatWithRels() {
  const norm_widget_1_rels = createNormWidget1WithRels()
  const norm_widget_2_rels = createNormWidget2WithRels()
  const norm_widget_3_rels = createNormWidget3WithRels()

  norm_widget_1_rels._jv.rels.widgets = norm_widget_2_rels;
  norm_widget_2_rels._jv.rels.widgets = {
    [norm_widget_1_rels['_jv']['id']]: norm_widget_1_rels,
    [norm_widget_3_rels['_jv']['id']]: norm_widget_3_rels
  }
  norm_widget_3_rels._jv.rels.widgets = norm_widget_1_rels;

  return {
    [norm_widget_1_rels['_jv']['id']]: norm_widget_1_rels,
    [norm_widget_2_rels['_jv']['id']]: norm_widget_2_rels,
    [norm_widget_3_rels['_jv']['id']]: norm_widget_3_rels,
  }
}

export function storeFormat() {
  return {
    widget: {
      ...createStoreWidget1()['widget'],
      ...createStoreWidget2()['widget'],
      ...createStoreWidget3()['widget'],
    },
  }
}
