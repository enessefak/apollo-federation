const express = require("express");
const bodyParser = require("body-parser");
const { ApolloServer } = require("apollo-server-express");

const app = express();

app.use(bodyParser.json());

const gateway = require("./gateway");

const server = new ApolloServer({
  gateway, // Apollo Graph Manager (previously known as Apollo Engine)
  // When enabled and an `ENGINE_API_KEY` is set in the environment,
  // provides metrics, schema management and trace reporting.
  engine: true,

  // Subscriptions are unsupported but planned for a future Gateway version.
  subscriptions: false
});

server.applyMiddleware({ app });

app.get("/oc-apps", function(req, res) {
  const ocApps = require("../services/apps/apps.json");
  res.json(ocApps);
});

app.listen({ port: process.env.PORT || 3000 });
