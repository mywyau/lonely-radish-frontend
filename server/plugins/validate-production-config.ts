import { assertProductionConfiguration } from '~/server/utils/productionReadiness'
import { assertDeploymentSafety } from '~/server/utils/deploymentSafety'

export default defineNitroPlugin(() => {
  assertProductionConfiguration()
  assertDeploymentSafety()
})
