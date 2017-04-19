import { GraphQLScalarType } from 'graphql';
export declare const defaultListArgs: (model?: any) => {
    limit: {
        type: GraphQLScalarType;
    };
    order: {
        type: GraphQLScalarType;
    };
    where: {
        type: GraphQLScalarType;
        description: string;
    };
    offset: {
        type: GraphQLScalarType;
    };
};
