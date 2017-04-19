import * as bluebird from 'bluebird';
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
import * as Sequelize from 'sequelize';
import * as sinon from 'sinon';
import { resolverFactory } from '../../src/resolver';
import { beforeRemoveAllTables, sequelize } from '../support/helper';

// tslint:disable-next-line:only-arrow-functions
describe('resolver', function() {
  beforeRemoveAllTables();

  /**
   * Setup the a) testing db schema and b) the according GraphQL types
   *
   * The schema consists of a User that has Tasks.
   * A Task belongs to a Project, which can have Labels.
   */
  before(function() {
    this.sandbox = sinon.sandbox.create();

    (sequelize as any).modelManager.models = [];
    sequelize.models = {};

    // tslint:disable-next-line:variable-name
    const User: any = sequelize.define('user', {
      name: Sequelize.STRING,
      myVirtual: {
        type: Sequelize.VIRTUAL,
        get: () => {
          return 'lol';
        },
      },
    });
    this.User = User;

    // tslint:disable-next-line:variable-name
    const Task: any = sequelize.define('task', {
      title: Sequelize.STRING,
      createdAt: {
        type: Sequelize.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW,
      },
      taskVirtual: {
        type: Sequelize.VIRTUAL,
        get: () => {
          return 'tasktask';
        },
      },
    }, {
        timestamps: false,
    });
    this.Task = Task;

    // tslint:disable-next-line:variable-name
    const Project: any = sequelize.define('project', {
      name: Sequelize.STRING,
    }, {
        timestamps: false,
    });
    this.Project = Project;

    // tslint:disable-next-line:variable-name
    const Label = sequelize.define('label', {
      name: Sequelize.STRING,
    }, {
        timestamps: false,
    });
    this.Label = Label;

    User.Tasks = User.hasMany(Task, { as: 'tasks', foreignKey: 'userId' });
    Task.User = Task.belongsTo(User, { as: 'user', foreignKey: 'userId' });

    Task.Project = Task.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });
    Project.Labels = Project.hasMany(Label, { as: 'labels' });

    // tslint:disable-next-line:variable-name
    const labelType = new GraphQLObjectType({
      name: 'Label',
      fields: {
        id: {
          type: new GraphQLNonNull(GraphQLInt),
        },
        name: {
          type: GraphQLString,
        },
      },
    });
    this.labelType = labelType;

    const projectType = new GraphQLObjectType({
      name: 'Project',
      fields: {
        id: {
          type: new GraphQLNonNull(GraphQLInt),
        },
        name: {
          type: GraphQLString,
        },
        labels: {
          type: new GraphQLList(labelType),
          resolve: resolverFactory(Project.Labels),
        },
      },
    });
    this.ProjectType = projectType;

    const taskType = new GraphQLObjectType({
      name: 'Task',
      description: 'A task',
      fields: {
        id: {
          type: new GraphQLNonNull(GraphQLInt),
        },
        title: {
          type: GraphQLString,
        },
        taskVirtual: {
          type: GraphQLString,
        },
        project: {
          type: projectType,
          resolve: resolverFactory(Task.Project),
        },
      },
    });
    this.taskType = taskType;

    const userType = new GraphQLObjectType({
      name: 'User',
      description: 'A user',
      fields: {
        id: {
          type: new GraphQLNonNull(GraphQLInt),
        },
        name: {
          type: GraphQLString,
        },
        myVirtual: {
          type: GraphQLString,
        },
        tasks: {
          type: new GraphQLList(taskType),
          args: {
            limit: {
              type: GraphQLInt,
            },
            offset: {
              type: GraphQLInt,
            },
            order: {
              type: GraphQLString,
            },
            first: {
              type: GraphQLInt,
            },
          },
          resolve: resolverFactory(User.Tasks, {
            before: (options: any, args: any) => {
              if (args.first) {
                options.order = options.order || [];
                options.order.push(['created_at', 'ASC']);

                if (args.first !== 0) {
                  options.limit = args.first;
                }
              }

              return options;
            },
          }),
        },
        tasksByIds: {
          type: new GraphQLList(taskType),
          args: {
            ids: {
              type: new GraphQLList(GraphQLInt),
            },
          },
          resolve: resolverFactory(User.Tasks, {
            before: (options: any, args: any) => {
              options.where = options.where || {};
              options.where.id = { $in: args.ids };
              return options;
            },
          }),
        },
      },
    });
    this.userType = userType;

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
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
        },
      }),
    });
    this.schema = schema;
  });

  /**
   * Now fill the testing DB with fixture values
   * We'll have projectA & projectB with two random labels each,
   * and two users each with some tasks that belong to those projects.
   */
  before(function() {
    let taskId = 0;
    let projectId = 0;

    const Project = this.Project;
    const User = this.User;
    const schema = this.schema;

    return sequelize.sync({ force: true }).then(() => {
      return bluebird.join(
        Project.create({
          id: ++projectId,
          name: 'b' + Math.random().toString(),
          labels: [
            { name: Math.random().toString() },
            { name: Math.random().toString() },
          ],
        }, {
            include: [
              Project.Labels,
            ],
        }),
        Project.create({
          id: ++projectId,
          name: 'a' + Math.random().toString(),
          labels: [
            { name: Math.random().toString() },
            { name: Math.random().toString() },
          ],
        }, {
            include: [
              Project.Labels,
            ],
        }),
      ).spread((projectA: any, projectB: any) => {
        this.projectA = projectA;
        this.projectB = projectB;
      }).then(() => {
        return bluebird.join(
          User.create({
            id: 1,
            name: 'b' + Math.random().toString(),
            tasks: [
              {
                id: ++taskId,
                title: Math.random().toString(),
                createdAt: new Date(Date.UTC(2014, 5, 11)),
                projectId: this.projectA.id,
              },
              {
                id: ++taskId,
                title: Math.random().toString(),
                createdAt: new Date(Date.UTC(2014, 5, 16)),
                projectId: this.projectB.id,
              },
              {
                id: ++taskId,
                title: Math.random().toString(),
                createdAt: new Date(Date.UTC(2014, 5, 20)),
                projectId: this.projectA.id,
              },
            ],
          }, {
              include: [User.Tasks],
            }),
          User.create({
            id: 2,
            name: 'a' + Math.random().toString(),
            tasks: [
              {
                id: ++taskId,
                title: Math.random().toString(),
                projectId: this.projectB.id,
              },
              {
                id: ++taskId,
                title: Math.random().toString(),
                projectId: this.projectB.id,
              },
            ],
          }, {
              include: [User.Tasks],
            }),
        ).spread((userA: any, userB: any) => {
          this.userA = userA;
          this.userB = userB;
          this.users = [userA, userB];
        });
      });
    });
  });

  afterEach(function() {
    this.sandbox.restore();
  });

  it('should resolve a plain result with a single model', function() {
    const schema = this.schema;
    const user = this.userB;

    return graphql(schema, `
      {
        user(id: ${user.id}) {
          name
          myVirtual
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data).to.deep.equal({
          user: {
            name: user.name,
            myVirtual: 'lol',
          },
        });
      });
  });

  it('should resolve a plain result with an aliased field', function() {
    const schema = this.schema;
    const user = this.userB;

    return graphql(schema, `
      {
        user(id: ${user.id}) {
          name
          magic: myVirtual
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data).to.deep.equal({
          user: {
            name: user.name,
            magic: 'lol',
          },
        });
      });
  });

  it('should resolve a plain result with a single model and aliases', function() {
    const schema = this.schema;
    const userA = this.userA;
    const userB = this.userB;

    return graphql(schema, `
      {
        userA: user(id: ${userA.id}) {
          name
          myVirtual
        }
        userB: user(id: ${userB.id}) {
          name
          myVirtual
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data).to.deep.equal({
          userA: {
            name: userA.name,
            myVirtual: 'lol',
          },
          userB: {
            name: userB.name,
            myVirtual: 'lol',
          },
        });
      });
  });

  it('should resolve a array result with a model and aliased includes', function() {
    const schema = this.schema;
    return graphql(schema, `
      {
        users {
          name

          first: tasks(limit: 1) {
            title
          }

          rest: tasks(offset: 1, limit: 99) {
            title
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        result.data.users.forEach((user: any) => {
          // tslint:disable-next-line:no-unused-expression
          expect(user.first).to.be.ok;
          // tslint:disable-next-line:no-unused-expression
          expect(user.rest).to.be.ok;
        });
      });
  });

  it('should resolve a array result with a model and aliased includes and __typename', function() {
    const schema = this.schema;
    return graphql(schema, `
      {
        users {
          name

          first: tasks(limit: 1) {
            title
            __typename
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        result.data.users.forEach((user: any) => {
          expect(user.first[0].__typename).to.equal('Task');
        });
      });
  });

  it('should resolve an array result with a single model', function() {
    const schema = this.schema;
    const users = this.users;

    return graphql(schema, `
      {
        users {
          name
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users).to.have.length.above(0);

        const usersNames = users.map((user: any) => ({ name: user.name }));
        // As the GraphQL query doesn't specify an ordering,
        // the order of the two lists can not be asserted.
        (expect(result.data.users).to.deep as any).have.members(usersNames);
      });
  });

  it('should allow amending the find for a array result with a single model', function() {
    const user = this.userA;
    const userType = this.userType;
    const User = this.User;

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
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
            resolve: resolverFactory(User, {
              before: (options: any, args: any, { name }: any) => {
                options.where = options.where || {};
                options.where.name = name;
                return options;
              },
            }),
          },
        },
      }),
    });

    return graphql(schema, `
      {
        users {
          name
        }
      }
    `, null, {
        name: user.name,
      }).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users).to.have.length(1);
        expect(result.data.users[0].name).to.equal(user.name);
      });
  });

  it('should allow parsing the find for a array result with a single model', function() {
    const users = this.users;
    const userType = this.userType;
    const User = this.User;

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
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
            resolve: resolverFactory(User, {
              after: (result: any) => {
                return result.map(() => {
                  return {
                    name: '11!!',
                  };
                });
              },
            }),
          },
        },
      }),
    });

    return graphql(schema, `
      {
        users {
          name
        }
      }
    `).then((result: any) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users).to.have.length(users.length);
        result.data.users.forEach((user: any) => {
          expect(user.name).to.equal('11!!');
        });
      });
  });

  it('should work with a resolver through a proxy', function() {
    const users = this.users;
    const User = this.User;
    const spy = sinon.spy();

    const taskType = new GraphQLObjectType({
      name: 'Task',
      description: 'A task',
      fields: {
        id: {
          type: new GraphQLNonNull(GraphQLInt),
        },
        title: {
          type: GraphQLString,
        },
      },
    });

    const userType = new GraphQLObjectType({
      name: 'User',
      description: 'A user',
      fields: {
        id: {
          type: new GraphQLNonNull(GraphQLInt),
        },
        name: {
          type: GraphQLString,
        },
        tasks: {
          type: new GraphQLList(taskType),
          resolve: ((() => {
            const $resolver = resolverFactory(User.Tasks);

            const $proxy: any = (...args: any[]) => {
              return $resolver.apply(null, args);
            };

            $proxy.$proxy = $resolver;
            return $proxy;
          })()),
        },
      },
    });

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
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
        },
      }),
    });

    return graphql(schema, `
      {
        users {
          name,
          tasks {
            title
          }
        }
      }
    `, null, {
        logging: spy,
      }).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users).to.have.length(users.length);
        result.data.users.forEach((user: any) => {
          expect(user.tasks).to.have.length.above(0);
        });

        // tslint:disable-next-line:no-unused-expression
        (expect(spy).to.have.been as any).calledTwice;
      });
  });

  it('should work with a passthrough resolver and a duplicated query', function() {
    const users = this.users;
    const User = this.User;
    const spy = sinon.spy();

    const taskType = new GraphQLObjectType({
      name: 'Task',
      description: 'A task',
      fields: {
        id: {
          type: new GraphQLNonNull(GraphQLInt),
        },
        title: {
          type: GraphQLString,
        },
      },
    });

    const userType = new GraphQLObjectType({
      name: 'User',
      description: 'A user',
      fields: {
        id: {
          type: new GraphQLNonNull(GraphQLInt),
        },
        name: {
          type: GraphQLString,
        },
        tasks: {
          type: new GraphQLObjectType({
            name: 'Tasks',
            fields: {
              nodes: {
                type: new GraphQLList(taskType),
                resolve: resolverFactory(User.Tasks),
              },
            },
          }),
          resolve: (() => {
            const $resolver: any = (source: any) => {
              return source;
            };

            $resolver.$passthrough = true;

            return $resolver;
          })(),
        },
      },
    });

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
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
        },
      }),
    });

    return graphql(schema, `
      {
        users {
          name,
          tasks {
            nodes {
              title
            }
            nodes {
              id
            }
          }
        }
      }
    `, null, {
        logging: spy,
      }).then((result: any) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users).to.have.length(users.length);
        result.data.users.forEach((user: any) => {
          expect(user.tasks.nodes).to.have.length.above(0);
          user.tasks.nodes.forEach((task: any) => {
            // tslint:disable-next-line:no-unused-expression
            expect(task.title).to.be.ok;
            // tslint:disable-next-line:no-unused-expression
            expect(task.id).to.be.ok;
          });
        });

        // tslint:disable-next-line:no-unused-expression
        (expect(spy).to.have.been as any).calledTwice;
      });
  });

  // tslint:disable-next-line:only-arrow-functions
  it('should resolve an array result with a single model and limit', function() {
    const schema = this.schema;
    return graphql(schema, `
      {
        users(limit: 1) {
          name
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users).to.have.length(1);
      });
  });

  it('should resolve a plain result with a single hasMany association', function() {
    const schema = this.schema;
    const user = this.userB;

    return graphql(schema, `
      {
        user(id: ${user.id}) {
          name
          tasks {
            title
            taskVirtual
          }
        }
      }
    `, null, {
        yolo: 'swag',
      }).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.user.name).to.equal(user.name);

        expect(result.data.user.tasks).to.have.length.above(0);
        // As the order of user.tasks is nondeterministic, we only assert on equal members
        // of both the user's tasks and the tasks the graphql query responded with.
        const userTasks = user.tasks.map((task: any) => ({ title: task.title, taskVirtual: 'tasktask' }));
        (expect(result.data.user.tasks).to.deep as any).have.members(userTasks);
      });

  });

  it('should resolve a plain result with a single limited hasMany association', function() {
    const schema = this.schema;
    const user = this.userB;

    return graphql(schema, `
      {
        user(id: ${user.id}) {
          name
          tasks(limit: 1) {
            title
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.user.tasks).to.have.length(1);
      });
  });

  it('should resolve a array result with a single hasMany association', function() {
    const schema = this.schema;
    const users = this.users;

    return graphql(schema, `
      {
        users(order: "id") {
          name
          tasks(order: "id") {
            title
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users.length).to.equal(users.length);
        result.data.users.forEach((user: any) => {
          expect(user.tasks).length.to.be.above(0);
        });

        expect(result.data).to.deep.equal({
          users: users.map((user: any) => {
            return {
              name: user.name,
              tasks: user.tasks.map((task: any) => ({ title: task.title })),
            };
          }),
        });
      });
  });

  it('should resolve a array result with a single limited hasMany association', function() {
    const schema = this.schema;
    const users = this.users;

    return graphql(schema, `
      {
        users {
          name
          tasks(limit: 1) {
            title
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users.length).to.equal(users.length);
        result.data.users.forEach((user: any) => {
          expect(user.tasks).length.to.be('1');
        });
      });
  });

  it('should resolve a array result with a single limited hasMany association with a nested belongsTo relation',
    function() {
      const schema = this.schema;
      const users = this.users;
      const sqlSpy = sinon.spy();

      return graphql(schema, `
      {
        users {
          tasks(limit: 2) {
            title
            project {
              name
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

          expect(result.data.users.length).to.equal(users.length);
          result.data.users.forEach((user: any) => {
            expect(user.tasks).length.to.be('2');
            user.tasks.forEach((task: any) => {
              // tslint:disable-next-line:no-unused-expression
              expect(task.project.name).to.be.ok;
            });
          });

          expect(sqlSpy.callCount).to.equal(3);
        });
    });

  it('should resolve a array result with a single hasMany association with a nested belongsTo relation', function() {
    const schema = this.schema;
    const users = this.users;
    const sqlSpy = sinon.spy();

    return graphql(schema, `
      {
        users {
          tasks {
            title
            project {
              name
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

        expect(result.data.users.length).to.equal(users.length);
        result.data.users.forEach((user: any) => {
          expect(user.tasks).length.to.be.above(0);
          user.tasks.forEach((task: any) => {
            // tslint:disable-next-line:no-unused-expression
            expect(task.project.name).to.be.ok;
          });
        });

        expect(sqlSpy.callCount).to.equal(3);
      });
  });

  it('should resolve a array result with a single hasMany association' +
    'with a nested belongsTo relation with a nested hasMany relation', function() {
      const schema = this.schema;
      const users = this.users;
      const sqlSpy = sinon.spy();

      return graphql(schema, `
      {
        users {
          tasks {
            title
            project {
              name
              labels {
                name
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

          expect(result.data.users.length).to.equal(users.length);
          result.data.users.forEach((user: any) => {
            expect(user.tasks).length.to.be.above(0);
            user.tasks.forEach((task: any) => {
              // tslint:disable-next-line:no-unused-expression
              expect(task.project.name).to.be.ok;

              expect(task.project.labels).length.to.be.above(0);
              task.project.labels.forEach((label: any) => {
                // tslint:disable-next-line:no-unused-expression
                expect(label.name).to.be.ok;
              });
            });
          });

          expect(sqlSpy.callCount).to.equal(4);
        });
    });

  it('should resolve a array result with a single limited hasMany association with a before filter', function() {
    const schema = this.schema;
    const users = this.users;

    return graphql(schema, `
      {
        users {
          tasks(first: 2) {
            title
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users.length).to.equal(users.length);
        result.data.users.forEach((user: any) => {
          expect(user.tasks).length.to.be('2');
        });
      });
  });

  it('should not call association getter if user manually included', function() {
    const Task = this.Task;
    const User = this.User;
    const userType = this.userType;
    this.sandbox.spy(Task, 'findAll');
    this.sandbox.spy(User, 'findAll');

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
          users: {
            type: new GraphQLList(userType),
            resolve: resolverFactory(User, {
              before: (options: any) => {
                options.include = [User.Tasks];
                options.order = [
                  ['id'],
                  [{ model: Task, as: 'tasks' }, 'id', 'ASC'],
                ];
                return options;
              },
            }),
          },
        },
      }),
    });

    return graphql(schema, `
      {
        users {
          tasks {
            title
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(Task.findAll.callCount).to.equal(0);
        expect(User.findAll.callCount).to.equal(1);
        expect(User.findAll.getCall(0).args[0].include).to.have.length(1);
        expect(User.findAll.getCall(0).args[0].include[0].name).to.equal(User.Tasks.name);

        result.data.users.forEach((user: any) => {
          expect(user.tasks).length.to.be.above(0);
        });

        expect(result.data).to.deep.equal({
          users: this.users.map((user: any) => {
            return {
              tasks: user.tasks.map((task: any) => ({ title: task.title })),
            };
          }),
        });
      });
  });

  it('should allow async before and after', function() {
    const userType = this.userType;
    const User = this.User;
    const users = this.users;

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
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
            resolve: resolverFactory(User, {
              before: (options: any) => {
                return Promise.resolve(options);
              },
              after: async (result: any) => {
                await bluebird.delay(100);
                return result.map(() => {
                  return {
                    name: 'Delayed!',
                  };
                });
              },
            }),
          },
        },
      }),
    });

    return graphql(schema, `
      {
        users {
          name
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.users).to.have.length(users.length);
        result.data.users.forEach((user: any) => {
          expect(user.name).to.equal('Delayed!');
        });
      });
  });

  it('should resolve args from array to before', function() {
    const schema = this.schema;
    const user = this.userB;

    return graphql(schema, `
      {
        user(id: ${user.get('id')}) {
          tasksByIds(ids: [${user.tasks[0].get('id')}]) {
            id
          }
        }
      }
    `).then((result) => {
        if (result.errors) {
          throw new Error(result.errors[0].stack);
        }

        expect(result.data.user.tasksByIds.length).to.equal(1);
      });
  });
});
