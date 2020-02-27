const { ApolloGateway } = require("@apollo/gateway");

const gateway = new ApolloGateway({
  // This entire `serviceList` is optional when running in managed federation
  // mode, using Apollo Graph Manager as the source of truth.  In production,
  // using a single source of truth to compose a schema is recommended and
  // prevents composition failures at runtime using schema validation using
  // real usage-based metrics.
  serviceList: [{ name: "oc-apps", url: "http://localhost:4001/graphql" }],

  // Experimental: Enabling this enables the query plan view in Playground.
  __exposeQueryPlanExperimental: false
});

module.exports = gateway;
