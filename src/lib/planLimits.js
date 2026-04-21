export const PLAN_LIMITS = {
  free: {
    maxEmployees: 10,
    maxProjects: 1
  },
  basico: {
    maxEmployees: 30,
    maxProjects: 1
  },
  pro: {
    maxEmployees: 150,
    maxProjects: 5
  },
  enterprise: {
    maxEmployees: Infinity,
    maxProjects: Infinity
  }
};

/**
 * Gets the limit for a specific plan and resource type
 * @param {string} plan - The plan name (suscripcion_plan)
 * @param {string} resource - 'maxEmployees' or 'maxProjects'
 * @returns {number}
 */
export const getLimit = (plan, resource) => {
  const p = plan?.toLowerCase() || 'free';
  const tier = PLAN_LIMITS[p] || PLAN_LIMITS.free;
  return tier[resource] || 0;
};
