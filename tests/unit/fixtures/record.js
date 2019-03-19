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
  const normWidget1Rels = createNormWidget1WithRels()
  const normWidget2Rels = createNormWidget2WithRels()
  const normWidget3Rels = createNormWidget3WithRels()

  normWidget1Rels.widgets = normWidget2Rels
  normWidget2Rels.widgets = {
    [normWidget1Rels['_jv']['id']]: normWidget1Rels,
    [normWidget3Rels['_jv']['id']]: normWidget3Rels,
  }
  normWidget3Rels.widgets = normWidget1Rels

  return {
    [normWidget1Rels['_jv']['id']]: normWidget1Rels,
    [normWidget2Rels['_jv']['id']]: normWidget2Rels,
    [normWidget3Rels['_jv']['id']]: normWidget3Rels,
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
