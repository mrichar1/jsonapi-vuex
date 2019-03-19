import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
  normFormatWithRels as createNormWidget1WithRels,
  storeFormat as createStoreWidget1,
} from './widget1'
import {
  jsonFormat as createJsonWidget2,
  normFormat as createNormWidget2,
  normFormatWithRels as createNormWidget2WithRels,
  storeFormat as createStoreWidget2,
} from './widget2'
import {
  jsonFormat as createJsonWidget3,
  normFormat as createNormWidget3,
  normFormatWithRels as createNormWidget3WithRels,
  storeFormat as createStoreWidget3,
} from './widget3'

export function jsonFormat() {
  return {
    data: [createJsonWidget1(), createJsonWidget2(), createJsonWidget3()],
  }
}

export function normFormat() {
  const normWidget1 = createNormWidget1()
  const normWidget2 = createNormWidget2()
  const normWidget3 = createNormWidget3()

  return {
    [normWidget1['_jv']['id']]: normWidget1,
    [normWidget2['_jv']['id']]: normWidget2,
    [normWidget3['_jv']['id']]: normWidget3,
  }
}

export function normFormatWithRels() {
  const normWidget1_rels = createNormWidget1WithRels()
  const normWidget2_rels = createNormWidget2WithRels()
  const normWidget3_rels = createNormWidget3WithRels()

  normWidget1_rels.widgets = normWidget2_rels
  normWidget2_rels.widgets = {
    [normWidget1_rels['_jv']['id']]: normWidget1_rels,
    [normWidget3_rels['_jv']['id']]: normWidget3_rels,
  }
  normWidget3_rels.widgets = normWidget1_rels

  return {
    [normWidget1_rels['_jv']['id']]: normWidget1_rels,
    [normWidget2_rels['_jv']['id']]: normWidget2_rels,
    [normWidget3_rels['_jv']['id']]: normWidget3_rels,
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
