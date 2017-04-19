import { GraphQLBoolean, GraphQLFloat, GraphQLInt, GraphQLScalarType, GraphQLString } from 'graphql';
import { Kind } from 'graphql/language';

const astToJson = {
  [Kind.INT](ast: any) {
    return GraphQLInt.parseLiteral(ast);
  },
  [Kind.FLOAT](ast: any) {
    return GraphQLFloat.parseLiteral(ast);
  },
  [Kind.BOOLEAN](ast: any) {
    return GraphQLBoolean.parseLiteral(ast);
  },
  [Kind.STRING](ast: any) {
    return GraphQLString.parseLiteral(ast);
  },
  [Kind.ENUM](ast: any) {
    return String(ast.value);
  },
  [Kind.LIST](ast: any) {
    return ast.values.map((astItem: any) => {
      return JSONType.parseLiteral(astItem);
    });
  },
  [Kind.OBJECT](ast: any) {
    const obj: {[key: string]: any} = {};
    ast.fields.forEach((field: any) => {
      obj[field.name.value] = JSONType.parseLiteral(field.value);
    });
    return obj;
  },
};

// tslint:disable:variable-name
export const JSONType = new GraphQLScalarType({
  name: 'SequelizeJSON',
  description: 'The `JSON` scalar type represents raw JSON as values.',
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral: (ast: any) => {
    const parser = astToJson[ast.kind];
    return parser ? parser.call(this, ast) : null;
  },
});
