import { GraphQLInt, GraphQLScalarType, GraphQLString } from 'graphql';
import { JSONType } from './types/jsonType';

export const defaultListArgs = (model?: any) => {
  return {
    limit: {
      type: GraphQLInt,
    },
    order: {
      type: GraphQLString,
    },
    where: {
      type: JSONType,
      description: 'A JSON object conforming the the shape specified in ' +
        'http://docs.sequelizejs.com/en/latest/docs/querying/',
    },
    offset: {
      type: GraphQLInt,
    },
  };
};
