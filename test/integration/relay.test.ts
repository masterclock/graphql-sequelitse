import * as bluebird from 'bluebird';
import * as chai from 'chai';
import { expect } from 'chai';
import {
  graphql,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { connectionArgs, connectionDefinitions, fromGlobalId, globalIdField, toGlobalId } from 'graphql-relay';
import * as Sequelize from 'sequelize';
import * as sinon from 'sinon';
import { sequelizeNodeInterface } from '../../src/relay';
import { resolverFactory } from '../../src/resolver';
import { beforeRemoveAllTables, sequelize } from '../support/helper';

const generateTask = (id: any) => {
  return {
    id: id,
    name: Math.random().toString(),
  };
};

const generateCustom = (id: any) => {
  const func = () => {
    return {
      id,
      value: `custom type ${id}`,
    };
  };
  return Promise.resolve(func);
};

// tslint:disable-next-line:only-arrow-functions
describe('relay', function() {
  beforeRemoveAllTables();

  // var User
  //   , Task
  //   , userType
  //   , taskType
  //   , nodeInterface
  //   , Project
  //   , projectType
  //   , viewerType
  //   , nodeField
  //   , schema;

  // tslint:disable-next-line:only-arrow-functions
  before(function() {
    (sequelize as any).modelManager.models = [];
    sequelize.models = {};
    // tslint:disable-next-line:variable-name
    const User: any = sequelize.define('User', {
      name: {
        type: Sequelize.STRING,
      },
    }, {
        timestamps: false,
      });

    // tslint:disable-next-line:variable-name
    const Task: any = sequelize.define('Task', {
      name: {
        type: Sequelize.STRING,
      },
    }, {
        timestamps: false,
      });

    // tslint:disable-next-line:variable-name
    const Project: any = sequelize.define('Project', {
      name: {
        type: Sequelize.STRING,
      },
    }, {
        timestamps: false,
      });

    User.Tasks = User.hasMany(Task, { as: 'taskItems' }); // Specifically different from connection type name
    Project.Users = Project.hasMany(User, { as: 'users' });

    const node = sequelizeNodeInterface(sequelize);
    const nodeInterface = node.nodeInterface;
    const nodeField = node.nodeField;
    const nodeTypeMapper = node.nodeTypeMapper;

    const taskType = new GraphQLObjectType({
      name: 'Task',
      fields: {
        id: globalIdField('Task'),
        name: {
          type: GraphQLString,
        },
      },
      interfaces: [nodeInterface],
    });

    const taskConnection = connectionDefinitions({ name: 'Task', nodeType: taskType });

    const userType = new GraphQLObjectType({
      name: 'User',
      fields: {
        id: globalIdField('User'),
        name: {
          type: GraphQLString,
        },
        tasks: {
          type: taskConnection.connectionType,
          args: connectionArgs,
          resolve: resolverFactory(User.Tasks),
        },
      },
      interfaces: [nodeInterface],
    });

    const userConnection = connectionDefinitions({ name: 'User', nodeType: userType });

    const projectType = new GraphQLObjectType({
      name: 'Project',
      fields: {
        id: globalIdField('User'),
        name: {
          type: GraphQLString,
        },
        users: {
          type: userConnection.connectionType,
          args: connectionArgs,
          resolve: resolverFactory(Project.Users),
        },
      },
    });

    const viewerType = new GraphQLObjectType({
      name: 'Viewer',
      description: 'root viewer for queries',
      fields: () => ({
        id: globalIdField('Viewer'),
        name: {
          type: GraphQLString,
          resolve: () => 'Viewer!',
        },
        allProjects: {
          type: new GraphQLList(projectType),
          resolve: resolverFactory(Project),
        },
      }),
      interfaces: [nodeInterface],
    });

    const customType = new GraphQLObjectType({
      name: 'Custom',
      description: 'Custom type to test custom idFetcher',
      fields: {
        id: globalIdField('Custom'),
        value: {
          type: GraphQLString,
        },
      },
      interfaces: [nodeInterface],
    });

    nodeTypeMapper.mapTypes({
      [User.name]: { type: userType },
      [Project.name]: { type: projectType },
      [Task.name]: { type: taskType },
      Viewer: { type: viewerType },
      [customType.name]: {
        type: customType,
        resolve(globalId: string) {
          const { id } = fromGlobalId(globalId);
          return generateCustom(id);
        },
      },
    });

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
          viewer: {
            type: viewerType,
            resolve: () => ({
              name: 'Viewer!',
              id: 1,
            }),
          },
          user: {
            type: userType,
            args: {
              id: {
                type: new GraphQLNonNull(GraphQLInt),
              },
            },
            resolve: resolverFactory(User),
          },
          users: {
            type: new GraphQLList(userType),
            args: {
              limit: {
                type: GraphQLInt,
              },
              order: {
                type: GraphQLString,
              },
            },
            resolve: resolverFactory(User),
          },
          project: {
            type: projectType,
            args: {
              id: {
                type: new GraphQLNonNull(GraphQLInt),
              },
            },
            resolve: resolverFactory(Project),
          },
          custom: {
            type: customType,
            args: {
              id: {
                type: new GraphQLNonNull(GraphQLInt),
              },
            },
            resolve: generateCustom,
          },
          node: nodeField,
        },
      }),
    });

  });

  before(function() {
    const Project = this.Project;
    const User = this.User;

    let userId = 1;
    let projectId = 1;
    let taskId = 1;

    return sequelize.sync({ force: true }).then(() => {
      return bluebird.join(
        Project.create({
          id: projectId++,
          name: 'project-' + Math.random().toString(),
        }),
        User.create({
          id: userId++,
          name: 'a' + Math.random().toString(),
          [User.Tasks.as]: [generateTask(taskId++), generateTask(taskId++), generateTask(taskId++)],
        }, {
            include: [User.Tasks],
          }),
        User.create({
          id: userId++,
          name: 'b' + Math.random().toString(),
          [User.Tasks.as]: [generateTask(taskId++), generateTask(taskId++)],
        }, {
            include: [User.Tasks],
          }),
      ).spread((project, userA, userB) => {
        this.project = project;
        this.userA = userA;
        this.userB = userB;
        this.users = [userA, userB];
      });
    });
  });

  before(function() {
    return this.project.setUsers([this.userA.id, this.userB.id]);
  });

  // tslint:disable-next-line:only-arrow-functions
  it('should support unassociated GraphQL types', function() {
    const schema = this.schema;
    const globalId = toGlobalId('Viewer', undefined);
    return graphql(schema, `
      {
        node(id: "${globalId}") {
          id
        }
      }
    `).then((result) => {
        expect(result.data.node.id).to.equal(globalId);
      });

  });

  it('should return userA when running a node query', function() {
    const schema = this.schema;
    const user = this.userA;
    const globalId = toGlobalId('User', user.id);

    return graphql(schema, `
      {
        node(id: "${globalId}") {
          id
          ... on User {
            name
          }
        }
      }
    `).then((result) => {
        expect(result.data.node.id).to.equal(globalId);
        expect(result.data.node.name).to.equal(user.name);
      });
  });

  // tslint:disable-next-line:only-arrow-functions
  describe('node queries', function() {
    // tslint:disable-next-line:only-arrow-functions
    it('should allow returning a custom entity', function() {
      const schema = this.schema;
      generateCustom(1).then((custom: any) => {
        const globalId = toGlobalId('Custom', custom.id);

        return graphql(schema, `
          {
            node(id: "${globalId}") {
              id
              ... on Custom {
                value
              }
            }
          }
        `).then((result) => {
            expect(result.data.node.id).to.equal(globalId);
            expect(result.data.node.value).to.equal(custom.value);
          });
      });
    });

    // tslint:disable-next-line:only-arrow-functions
    it('should merge nested queries from multiple fragments', function() {
      const schema = this.schema;
      const globalId = toGlobalId('Viewer', undefined);
      return graphql(schema, `
        {
          node(id: "${globalId}") {
            id
            ... F0
            ... F1
          }
        }
        fragment F0 on Viewer {
          allProjects {
            id
          }
        }
        fragment F1 on Viewer {
          allProjects {
            id
            name
          }
        }
      `).then((result) => {
          if (result.errors) {
            throw result.errors[0];
          }

          // tslint:disable-next-line:no-unused-expression
          expect(result.data.node.allProjects[0].id).to.not.be.null;
          // tslint:disable-next-line:no-unused-expression
          expect(result.data.node.allProjects[0].name).to.not.be.null;
        });
    });
  });

  it('should support first queries on connections', function() {
    const schema = this.schema;
    const user = this.userB;

    return graphql(schema, `
      {
        user(id: ${user.id}) {
          name
          tasks(first: 1) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data).to.deep.equal({
          user: {
            name: user.name,
            tasks: {
              edges: [
                {
                  node: {
                    name: user.taskItems[0].name,
                  },
                },
              ],
            },
          },
        });
      });
  });

  it('should support last queries on connections', function() {
    const schema = this.schema;
    const user = this.userB;
    const User = this.User;

    return graphql(schema, `
      {
        user(id: ${user.id}) {
          name
          tasks(last: 1) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data).to.deep.equal({
          user: {
            name: user.name,
            tasks: {
              edges: [
                {
                  node: {
                    name: user[User.Tasks.as][user[User.Tasks.as].length - 1].name,
                  },
                },
              ],
            },
          },
        });
      });
  });

  // these two tests are not determenistic on postgres currently
  it('should support after queries on connections', function() {
    const schema = this.schema;
    const user = this.userA;

    return graphql(schema, `
      {
        user(id: ${user.id}) {
          name
          tasks(first: 1) {
            pageInfo {
              hasNextPage,
              startCursor
            },
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `)
      .then((result) => {
        return graphql(schema, `
        {
          user(id: ${user.id}) {
            name
            tasks(first: 1, after: "${result.data.user.tasks.pageInfo.startCursor}") {
              edges {
                node {
                  name
                }
              }
            }
          }
        }
      `);
      })
      .then((result) => {
        expect(result.data.user.tasks.edges[0].node.name).to.equal(user.taskItems[1].name);
      });
  });

  it('should resolve a plain result with a single connection', function() {
    const schema = this.schema;
    const user = this.userB;

    return graphql(schema, `
      {
        user(id: ${user.id}) {
          name
          tasks {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data).to.deep.equal({
          user: {
            name: user.name,
            tasks: {
              edges: [
                {
                  node: {
                    name: user.taskItems[0].name,
                  },
                },
                {
                  node: {
                    name: user.taskItems[1].name,
                  },
                },
              ],
            },
          },
        });
      });
  });

  it('should resolve an array of objects containing connections', function() {
    const schema = this.schema;
    const users = this.users;

    return graphql(schema, `
      {
        users {
          name
          tasks {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users.length).to.equal(users.length);
        result.data.users.forEach((user: any) => {
          expect(user.tasks.edges).to.have.length.above(0);
        });

      });
  });

  it('should resolve nested connections', function() {
    const schema = this.schema;
    const sqlSpy = sinon.spy();

    return graphql(schema, `
      {
        project(id: 1) {
          users {
            edges {
              node {
                name
                tasks {
                  edges {
                    node {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `, null, {
        logging: sqlSpy,
      }).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.project.users.edges).to.have.length(2);
        const [nodeA, nodeB] = result.data.project.users.edges;
        const userA = nodeA.node;
        const userB = nodeB.node;

        expect(userA).to.have.property('tasks');
        expect(userA.tasks.edges).to.have.length.above(0);
        // tslint:disable-next-line:no-unused-expression
        expect(userA.tasks.edges[0].node.name).to.be.ok;

        expect(userB).to.have.property('tasks');
        expect(userB.tasks.edges).to.have.length.above(0);
        // tslint:disable-next-line:no-unused-expression
        expect(userB.tasks.edges[0].node.name).to.be.ok;

        // tslint:disable-next-line:no-unused-expression
        (expect(sqlSpy).to.have.been as any).calledThrice;
      });
  });

  it('should support fragments', function() {
    const schema = this.schema;
    return graphql(schema, `
      {
        project(id: 1) {
          ...getNames
        }
      }
      fragment getNames on Project {
        name
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }
      });
  });

  it('should support inline fragments', function() {
    const schema = this.schema;
    return graphql(schema, `
      {
        project(id: 1) {
          ... on Project {
            name
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }
      });
  });

  it('should not support fragments on the wrong type', function() {
    const schema = this.schema;
    return graphql(schema, `
      {
        project(id: 1) {
          ...getNames
        }
      }
      fragment getNames on User {
        name
      }
    `).then((result) => {
        expect(result.errors).to.exist.and.have.length(1);
      });
  });
});
