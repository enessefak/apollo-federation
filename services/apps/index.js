const { ApolloServer, UserInputError, gql } = require("apollo-server");
const { buildFederatedSchema } = require("@apollo/federation");
const fetch = require("node-fetch");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const adapter = new FileSync(path.join(__dirname, "apps.json"));
const db = low(adapter);

const fetchComponent = async url => {
  const response = await fetch(url);
  const data = await response.json();
  return data;
};

const makeComponent = async (baseUrl, name) => {
  const url = `${baseUrl}${name}/~info`;
  const info = await fetchComponent(url);

  return {
    name: info.name,
    allVersions: info.allVersions,
    version: info.version
  };
};

const root = async options => ({
  registry: async () => {
    const response = await fetch(options.baseUrl);
    const data = await response.json();

    return {
      href: data.href,
      ocVersion: data.ocVersion,
      type: data.type,
      dependencies: options.dependencies
    };
  },
  components: async () => {
    const response = await fetch(options.baseUrl);
    const data = await response.json();

    return data.components.reduce(async (accumP, component) => {
      const name = component.replace(options.baseUrl, "");
      const accum = await accumP;
      const componentInfo = await makeComponent(options.baseUrl, name);
      const info = { ...accum, [name]: componentInfo };
      const currentInfo = db.get(name).value();
      if (!currentInfo)
        db.set(name, {
          ...componentInfo,
          publishedVersion: componentInfo.version
        }).write();
      else db.update(name, _ => ({ ..._, ...componentInfo })).write();
      return info;
    }, Promise.resolve({}));
  }
});

const getComponents = async () => {
  try {
    const config = {
      baseUrl:
        process.env.NODE_ENV === "production"
          ? "https://fibabanka-apps.herokuapp.com/"
          : "http://localhost:3030/"
    };

    const response = await root(config);
    // const registry = await response.registry();
    await response.components();
  } catch (ex) {
    console.error(ex);
  }
};

const getDbData = () => {
  const data = db.getState();
  return Object.values(data);
};

getComponents();

const typeDefs = gql`
  type App {
    name: String
    version: String
    allVersions: [String]
    publishedVersion: String
  }

  extend type Query {
    apps: [App]
  }

  extend type Mutation {
    changeVersion(name: String, version: String): App
    refreshApp: [App]
  }
`;

const resolvers = {
  Query: {
    apps: () => getDbData()
  },
  Mutation: {
    refreshApp: async (_, params, context) => {
      await getComponents();
      return getDbData();
    },
    changeVersion(_, { name, version }, context) {
      const findApp = db.get(name).value();
      if (!findApp) {
        throw new UserInputError("NotExist app name", {
          invalidArgs: [name, version],
          avaliableApps: Object.keys(db.getState())
        });
      }

      const isAvaliableVersion = findApp.allVersions.includes(version);

      if (!isAvaliableVersion)
        throw new UserInputError("Version not found", {
          invalidArgs: [name, version],
          avaliableVersions: findApp.allVersions
        });

      if (version === findApp.publishedVersion) return findApp;

      const updateDbData = db
        .update(name, _ => ({ ..._, publishedVersion: version }))
        .write();

      return updateDbData[name];
    }
  }
};

const server = new ApolloServer({
  schema: buildFederatedSchema([
    {
      typeDefs,
      resolvers
    }
  ])
});

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
