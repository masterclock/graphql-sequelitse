import * as chai from 'chai';
import * as graphql from 'graphql';
import * as Sequelize from 'sequelize';
import { simplifyAST } from '../../src/simplifyAST';

const expect = chai.expect;
const parser = graphql.parse;

const parse = (query: any) => {
  return parser(query).definitions[0];
};

describe('simplifyAST', () => {
  it('should simplify a basic nested structure', () => {
    expect(simplifyAST(parse(`
      {
        users {
          name
          projects {
            name
          }
        }
      }
    `))).to.deep.equal({
        args: {},
        fields: {
          users: {
            args: {},
            fields: {
              name: {
                args: {},
                fields: {},
              },
              projects: {
                args: {},
                fields: {
                  name: {
                    args: {},
                    fields: {},
                  },
                },
              },
            },
          },
        },
      });
  });

  it('should simplify a basic structure with args', () => {
    expect(simplifyAST(parse(`
      {
        user(id: 1) {
          name
        }
      }
    `))).to.deep.equal({
        args: {},
        fields: {
          user: {
            args: {
              id: "1",
            },
            fields: {
              name: {
                args: {},
                fields: {},
              },
            },
          },
        },
      });
  });

  it('should simplify a basic structure with array args', () => {
    expect(simplifyAST(parse(`
      {
        luke: human(id: ["1000", "1003"]) {
          name
        }
      }
    `))).to.deep.equal({
        args: {},
        fields: {
          luke: {
            key: "human",
            args: {
              id: ["1000", "1003"],
            },
            fields: {
              name: {
                args: {},
                fields: {},
              },
            },
          },
        },
      });
  });

  it('should simplify a basic structure with object args', () => {
    expect(simplifyAST(parse(`
      {
        luke: human(contact: { phone: "91264646" }) {
          name
        }
      }
    `))).to.deep.equal({
        args: {},
        fields: {
          luke: {
            key: "human",
            args: {
              contact: { phone: "91264646" },
            },
            fields: {
              name: {
                args: {},
                fields: {},
              },
            },
          },
        },
      });
  });

  it('should simplify a basic structure with nested array args', () => {
    expect(simplifyAST(parse(`
      {
        user(units: ["1", "2", ["3", ["4"], [["5"], "6"], "7"]]) {
          name
        }
      }
    `))).to.deep.equal({
        args: {},
        fields: {
          user: {
            args: {
              units: ["1", "2", ["3", ["4"], [["5"], "6"], "7"]],
            },
            fields: {
              name: {
                args: {},
                fields: {},
              },
            },
          },
        },
      });
  });

  it('should simplify a basic structure with variable args', () => {
    expect(simplifyAST(parse(`
      {
        user(id: $id) {
          name
        }
      }
    `), {
        variableValues: {
          id: "1",
        },
      })).to.deep.equal({
        args: {},
        fields: {
          user: {
            args: {
              id: "1",
            },
            fields: {
              name: {
                args: {},
                fields: {},
              },
            },
          },
        },
      });
  });

  it('should simplify a basic structure with an inline fragment', () => {
    expect(simplifyAST(parse(`
      {
        user {
          ... on User {
            name
          }
        }
      }
    `))).to.deep.equal({
        args: {},
        fields: {
          user: {
            args: {},
            fields: {
              name: {
                args: {},
                fields: {},
              },
            },
          },
        },
      });
  });

  it('should expose a $parent', () => {
    const ast = simplifyAST(parse(`
      {
        users {
          name
          projects(first: 1) {
            nodes {
              name
            }
          }
        }
      }
    `));

    // tslint:disable-next-line:no-unused-expression
    expect(ast.fields.users.fields.projects.fields.nodes.$parent).to.be.ok;
    expect(ast.fields.users.fields.projects.fields.nodes.$parent.args).to.deep.equal({
      first: '1',
    });
  });

  it('should simplify a nested structure at the lowest level', () => {
    expect(simplifyAST(parse(`
      {
        users {
          name
          projects {
            node {
              name
            }
            node {
              id
            }
          }
        }
      }
    `))).to.deep.equal({
        args: {},
        fields: {
          users: {
            args: {},
            fields: {
              name: {
                args: {},
                fields: {},
              },
              projects: {
                args: {},
                fields: {
                  node: {
                    args: {},
                    fields: {
                      name: {
                        args: {},
                        fields: {},
                      },
                      id: {
                        args: {},
                        fields: {},
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
  });

  it('should simplify a nested structure duplicated at a high level', () => {
    expect(simplifyAST(parse(`
      {
        users {
          name
          projects {
            node {
              name
            }
          }
          projects {
            node {
              id
            }
          }
        }
      }
    `))).to.deep.equal({
        args: {},
        fields: {
          users: {
            args: {},
            fields: {
              name: {
                args: {},
                fields: {},
              },
              projects: {
                args: {},
                fields: {
                  node: {
                    args: {},
                    fields: {
                      name: {
                        args: {},
                        fields: {},
                      },
                      id: {
                        args: {},
                        fields: {},
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
  });

  it('should simplify a structure with aliases', () => {
    expect(simplifyAST(parse(`
      {
        luke: human(id: "1000") {
          name
        }
        leia: human(id: "1003") {
          firstName: name
        }
      }
    `))).to.deep.equal({
        args: {},
        fields: {
          luke: {
            key: "human",
            args: {
              id: "1000",
            },
            fields: {
              name: {
                args: {},
                fields: {},
              },
            },
          },
          leia: {
            key: "human",
            args: {
              id: "1003",
            },
            fields: {
              firstName: {
                key: "name",
                args: {},
                fields: {},
              },
            },
          },
        },
      });
  });
});
