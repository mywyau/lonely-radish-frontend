import { assertProductionConfiguration } from '~/server/utils/productionReadiness'

export default defineNitroPlugin(() => {
  assertProductionConfiguration()
})
